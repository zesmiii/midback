import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  type User {
    id: ID!
    username: String!
    email: String!
    createdAt: String!
    updatedAt: String!
  }

  type Chat {
    id: ID!
    name: String
    type: ChatType!
    participants: [User!]!
    createdBy: User!
    createdAt: String!
    updatedAt: String!
    lastMessage: Message
  }

  type Message {
    id: ID!
    chat: Chat!
    sender: User!
    content: String
    imageUrl: String
    createdAt: String!
    updatedAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  enum ChatType {
    DM
    GROUP
  }

  input RegisterInput {
    username: String!
    email: String!
    password: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input CreateGroupChatInput {
    name: String!
    participantIds: [ID!]!
  }

  input SendMessageInput {
    chatId: ID!
    content: String
    imageUrl: String
  }

  type Query {
    # Аутентификация
    me: User

    # Пользователи
    users(search: String): [User!]!
    user(id: ID!): User

    # Чаты
    chats: [Chat!]!
    chat(id: ID!): Chat

    # Сообщения
    messages(chatId: ID!, limit: Int, offset: Int): [Message!]!
  }

  type Mutation {
    # Аутентификация
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    logout: Boolean!

    # Чаты
    createGroupChat(input: CreateGroupChatInput!): Chat!
    createDM(participantId: ID!): Chat!

    # Сообщения
    sendMessage(input: SendMessageInput!): Message!
  }

  type Subscription {
    messageAdded(chatId: ID!): Message!
  }
`;

