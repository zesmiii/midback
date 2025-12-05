import { PubSub } from 'graphql-subscriptions';
import { AuthenticationError, ForbiddenError, UserInputError } from 'apollo-server-express';
import User from '../models/User';
import Chat from '../models/Chat';
import Message from '../models/Message';
import { hashPassword, comparePassword, generateToken, verifyToken, getTokenFromRequest } from '../utils/auth';
import { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';

const pubsub = new PubSub();

export interface Context {
  req?: AuthRequest;
  userId?: string;
  userEmail?: string;
}

const getUserIdFromContext = (context: Context): string => {
  if (!context.userId) {
    throw new AuthenticationError('Authentication required');
  }
  return context.userId;
};

export const resolvers = {
  Query: {
    me: async (_: any, __: any, context: Context) => {
      const userId = getUserIdFromContext(context);
      const user = await User.findById(userId);
      if (!user) {
        throw new AuthenticationError('User not found');
      }
      return user;
    },

    users: async (_: any, args: { search?: string }, context: Context) => {
      getUserIdFromContext(context);
      const query: any = {};
      
      if (args.search) {
        query.$or = [
          { username: { $regex: args.search, $options: 'i' } },
          { email: { $regex: args.search, $options: 'i' } },
        ];
      }
      
      return User.find(query).select('-password');
    },

    user: async (_: any, args: { id: string }, context: Context) => {
      getUserIdFromContext(context);
      const user = await User.findById(args.id).select('-password');
      if (!user) {
        throw new UserInputError('User not found');
      }
      return user;
    },

    chats: async (_: any, __: any, context: Context) => {
      const userId = getUserIdFromContext(context);
      const chats = await Chat.find({
        participants: userId,
      })
        .populate('participants', '-password')
        .populate('createdBy', '-password')
        .sort({ updatedAt: -1 });

      // Получаем последнее сообщение для каждого чата
      const chatsWithLastMessage = await Promise.all(
        chats.map(async (chat) => {
          const lastMessage = await Message.findOne({ chat: chat._id })
            .sort({ createdAt: -1 })
            .populate('sender', '-password')
            .populate('chat');
          
          return {
            ...chat.toObject(),
            lastMessage,
          };
        })
      );

      return chatsWithLastMessage;
    },

    chat: async (_: any, args: { id: string }, context: Context) => {
      const userId = getUserIdFromContext(context);
      const chat = await Chat.findById(args.id)
        .populate('participants', '-password')
        .populate('createdBy', '-password');

      if (!chat) {
        throw new UserInputError('Chat not found');
      }

      // Проверяем, что пользователь является участником чата
      if (!chat.participants.some((p: any) => p._id.toString() === userId)) {
        throw new ForbiddenError('You are not a participant of this chat');
      }

      const lastMessage = await Message.findOne({ chat: chat._id })
        .sort({ createdAt: -1 })
        .populate('sender', '-password')
        .populate('chat');

      return {
        ...chat.toObject(),
        lastMessage,
      };
    },

    messages: async (
      _: any,
      args: { chatId: string; limit?: number; offset?: number },
      context: Context
    ) => {
      const userId = getUserIdFromContext(context);
      const chat = await Chat.findById(args.chatId);

      if (!chat) {
        throw new UserInputError('Chat not found');
      }

      // Проверяем, что пользователь является участником чата
      if (!chat.participants.some((p: any) => p.toString() === userId)) {
        throw new ForbiddenError('You are not a participant of this chat');
      }

      const limit = args.limit || 50;
      const offset = args.offset || 0;

      const messages = await Message.find({ chat: args.chatId })
        .populate('sender', '-password')
        .populate({
          path: 'chat',
          populate: {
            path: 'participants',
            select: '-password',
          },
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);

      return messages.reverse(); // Возвращаем в хронологическом порядке
    },
  },

  Mutation: {
    register: async (_: any, args: { input: { username: string; email: string; password: string } }) => {
      try {
        const { username, email, password } = args.input;

        // Валидация входных данных
        if (!username || !email || !password) {
          throw new UserInputError('All fields are required');
        }

        if (password.length < 6) {
          throw new UserInputError('Password must be at least 6 characters long');
        }

        // Нормализуем email (lowercase)
        const normalizedEmail = email.toLowerCase().trim();
        const normalizedUsername = username.trim();

        // Проверяем, существует ли пользователь
        const existingUser = await User.findOne({
          $or: [
            { email: normalizedEmail },
            { username: normalizedUsername }
          ],
        });

        if (existingUser) {
          if (existingUser.email === normalizedEmail) {
            throw new UserInputError('User with this email already exists');
          }
          if (existingUser.username === normalizedUsername) {
            throw new UserInputError('User with this username already exists');
          }
        }

        // Хешируем пароль
        const hashedPassword = await hashPassword(password);

        // Создаем пользователя
        const user = new User({
          username: normalizedUsername,
          email: normalizedEmail,
          password: hashedPassword,
        });

        await user.save();

        // Генерируем токен
        const token = generateToken({
          userId: user._id.toString(),
          email: user.email,
        });

        return {
          token,
          user: {
            ...user.toObject(),
            password: undefined,
          },
        };
      } catch (error: any) {
        // Если это уже GraphQL ошибка, пробрасываем её дальше
        if (error instanceof UserInputError || error instanceof AuthenticationError) {
          throw error;
        }
        
        // Обработка ошибок MongoDB (duplicate key)
        if (error.code === 11000) {
          const field = Object.keys(error.keyPattern || {})[0];
          if (field === 'email') {
            throw new UserInputError('User with this email already exists');
          }
          if (field === 'username') {
            throw new UserInputError('User with this username already exists');
          }
          throw new UserInputError('User with this information already exists');
        }
        
        // Обработка ошибок валидации Mongoose
        if (error.name === 'ValidationError') {
          const messages = Object.values(error.errors || {}).map((e: any) => e.message);
          throw new UserInputError(messages.join(', ') || 'Validation failed');
        }
        
        // Иначе логируем и выбрасываем общую ошибку
        console.error('Registration error:', error);
        throw new UserInputError(error.message || 'Registration failed');
      }
    },

    login: async (_: any, args: { input: { email: string; password: string } }) => {
      try {
        const { email, password } = args.input;

        // Валидация входных данных
        if (!email || !password) {
          throw new UserInputError('Email and password are required');
        }

        // Нормализуем email (lowercase)
        const normalizedEmail = email.toLowerCase().trim();

        // Находим пользователя
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
          // Используем одинаковое сообщение для безопасности (не раскрываем, существует ли пользователь)
          throw new AuthenticationError('Invalid email or password');
        }

        // Проверяем пароль
        if (!user.password) {
          console.error('User password is missing for user:', user._id);
          throw new AuthenticationError('Invalid email or password');
        }

        const isValidPassword = await comparePassword(password, user.password);
        if (!isValidPassword) {
          throw new AuthenticationError('Invalid email or password');
        }

        // Генерируем токен
        const token = generateToken({
          userId: user._id.toString(),
          email: user.email,
        });

        return {
          token,
          user: {
            ...user.toObject(),
            password: undefined,
          },
        };
      } catch (error: any) {
        // Если это уже GraphQL ошибка, пробрасываем её дальше
        if (error instanceof AuthenticationError || error instanceof UserInputError) {
          throw error;
        }
        // Иначе логируем и выбрасываем общую ошибку
        console.error('Login error:', error);
        throw new AuthenticationError('Login failed. Please try again.');
      }
    },

    logout: async (_: any, __: any, context: Context) => {
      getUserIdFromContext(context);
      // В реальном приложении здесь можно добавить логику инвалидации токена
      return true;
    },

    createGroupChat: async (
      _: any,
      args: { input: { name: string; participantIds: string[] } },
      context: Context
    ) => {
      const userId = getUserIdFromContext(context);
      const { name, participantIds } = args.input;

      // Проверяем, что участников минимум 3 (включая создателя)
      const allParticipants = [...new Set([userId, ...participantIds])];
      if (allParticipants.length < 3) {
        throw new UserInputError('Group chat must have at least 3 participants');
      }

      // Проверяем, что все участники существуют
      const users = await User.find({
        _id: { $in: allParticipants },
      });

      if (users.length !== allParticipants.length) {
        throw new UserInputError('One or more participants not found');
      }

      // Создаем групповой чат
      const chat = new Chat({
        name,
        type: 'GROUP',
        participants: allParticipants,
        createdBy: userId,
      });

      await chat.save();

      return Chat.findById(chat._id)
        .populate('participants', '-password')
        .populate('createdBy', '-password');
    },

    createDM: async (_: any, args: { participantId: string }, context: Context) => {
      const userId = getUserIdFromContext(context);
      const { participantId } = args;

      if (userId === participantId) {
        throw new UserInputError('Cannot create DM with yourself');
      }

      // Проверяем, существует ли пользователь
      const participant = await User.findById(participantId);
      if (!participant) {
        throw new UserInputError('Participant not found');
      }

      // Проверяем, существует ли уже DM между этими пользователями
      const existingDM = await Chat.findOne({
        type: 'DM',
        participants: { $all: [userId, participantId], $size: 2 },
      });

      if (existingDM) {
        return Chat.findById(existingDM._id)
          .populate('participants', '-password')
          .populate('createdBy', '-password');
      }

      // Создаем новый DM
      const chat = new Chat({
        type: 'DM',
        participants: [userId, participantId],
        createdBy: userId,
      });

      await chat.save();

      return Chat.findById(chat._id)
        .populate('participants', '-password')
        .populate('createdBy', '-password');
    },

    sendMessage: async (
      _: any,
      args: { input: { chatId: string; content?: string; imageUrl?: string } },
      context: Context
    ) => {
      const userId = getUserIdFromContext(context);
      const { chatId, content, imageUrl } = args.input;

      if (!content && !imageUrl) {
        throw new UserInputError('Message must have content or image');
      }

      // Проверяем, существует ли чат
      const chat = await Chat.findById(chatId);
      if (!chat) {
        throw new UserInputError('Chat not found');
      }

      // Проверяем, что пользователь является участником чата
      if (!chat.participants.some((p: any) => p.toString() === userId)) {
        throw new ForbiddenError('You are not a participant of this chat');
      }

      // Создаем сообщение
      const message = new Message({
        chat: chatId,
        sender: userId,
        content,
        imageUrl,
      });

      await message.save();

      // Обновляем время последнего обновления чата
      chat.updatedAt = new Date();
      await chat.save();

      // Публикуем событие для подписчиков
      const populatedMessage = await Message.findById(message._id)
        .populate('sender', '-password')
        .populate({
          path: 'chat',
          populate: {
            path: 'participants',
            select: '-password',
          },
        });

      pubsub.publish(`MESSAGE_ADDED_${chatId}`, {
        messageAdded: populatedMessage,
      });

      return populatedMessage;
    },
  },

  Subscription: {
    messageAdded: {
      subscribe: async (_: any, args: { chatId: string }, context: Context) => {
        const userId = getUserIdFromContext(context);
        
        // Проверяем, что пользователь является участником чата
        const chat = await Chat.findById(args.chatId);
        if (!chat) {
          throw new UserInputError('Chat not found');
        }
        
        if (!chat.participants.some((p: any) => p.toString() === userId)) {
          throw new ForbiddenError('You are not a participant of this chat');
        }

        return pubsub.asyncIterator(`MESSAGE_ADDED_${args.chatId}`);
      },
    },
  },
};

