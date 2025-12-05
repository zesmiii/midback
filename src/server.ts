import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { createServer } from 'http';
import { execute, subscribe } from 'graphql';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { connectDatabase } from './config/database';
import { typeDefs } from './graphql/typeDefs';
import { resolvers } from './graphql/resolvers';
import { createContext } from './graphql/context';
import { verifyToken } from './utils/auth';
import uploadRoutes from './routes/upload';

dotenv.config();

const PORT = process.env.PORT || 4000;

async function startServer() {
  // Подключаемся к MongoDB
  await connectDatabase();

  // Создаем Express приложение
  const app = express();

  // Middleware
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Роуты для загрузки файлов
  app.use('/api', uploadRoutes);
  
  // Статические файлы для загрузок
  const uploadsPath = path.join(__dirname, '../uploads');
  app.use('/uploads', express.static(uploadsPath));

  // Создаем GraphQL схему
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  // Создаем HTTP сервер для WebSocket (до применения Apollo middleware)
  const httpServer = createServer(app);

  // Создаем Apollo Server
  const apolloServer = new ApolloServer({
    schema,
    context: createContext,
    introspection: true,
    plugins: [
      {
        async serverWillStart() {
          return {
            async drainServer() {
              subscriptionServer.close();
            },
          };
        },
      },
    ],
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app: app as any, path: '/graphql', cors: false });

  // Настраиваем Subscription Server для WebSocket
  const subscriptionServer = SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
      onConnect: async (connectionParams: any, webSocket: any) => {
        // Логируем connectionParams для отладки (без токена)
        console.log('WebSocket connection attempt, connectionParams keys:', Object.keys(connectionParams || {}));
        
        // Извлекаем токен из connectionParams (поддерживаем разные форматы)
        let token: string | null = null;
        
        if (connectionParams) {
          // Формат 1: { authorization: "Bearer <token>" }
          if (connectionParams.authorization) {
            token = typeof connectionParams.authorization === 'string' 
              ? connectionParams.authorization.replace(/^Bearer\s+/i, '')
              : null;
          }
          // Формат 2: { Authorization: "Bearer <token>" }
          else if (connectionParams.Authorization) {
            token = typeof connectionParams.Authorization === 'string'
              ? connectionParams.Authorization.replace(/^Bearer\s+/i, '')
              : null;
          }
          // Формат 3: { token: "<token>" }
          else if (connectionParams.token) {
            token = typeof connectionParams.token === 'string' ? connectionParams.token : null;
          }
        }
        
        if (token) {
          try {
            const payload = verifyToken(token);
            const context = {
              userId: payload.userId,
              userEmail: payload.email,
            };
            console.log(`WebSocket connected: user ${payload.userId}`);
            // Сохраняем контекст в webSocket для использования в onOperation
            webSocket.context = context;
            return context;
          } catch (error) {
            console.error('WebSocket authentication error:', error);
            // Возвращаем пустой контекст, если токен невалидный
            webSocket.context = {};
            return {};
          }
        }
        
        console.log('WebSocket connected without authentication');
        webSocket.context = {};
        return {};
      },
      onDisconnect: () => {
        console.log('WebSocket client disconnected');
      },
      onOperation: async (message: any, params: any, webSocket: any) => {
        // Передаем контекст из onConnect в параметры операции
        if (webSocket.context) {
          params.context = webSocket.context;
        }
        return params;
      },
    },
    {
      server: httpServer,
      path: apolloServer.graphqlPath,
    }
  );

  // Запускаем сервер
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}${apolloServer.graphqlPath}`);
    console.log(`📡 Subscriptions ready at ws://localhost:${PORT}${apolloServer.graphqlPath}`);
    console.log(`📁 Uploads directory: ${uploadsPath}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

