# Real-Time Сообщения: Полное Объяснение для Frontend

## 📚 Содержание
1. [Что такое Real-Time и как это работает?](#что-такое-real-time)
2. [Архитектура решения](#архитектура)
3. [Как это работает на бэкенде](#бэкенд)
4. [Как подключиться на фронтенде](#фронтенд)
5. [Полный пример использования](#пример)
6. [Часто задаваемые вопросы](#faq)

---

## 🎯 Что такое Real-Time и как это работает? {#что-такое-real-time}

**Real-Time** означает, что данные обновляются мгновенно без необходимости обновлять страницу или делать повторные запросы.

### Обычный подход (без Real-Time):
```
Пользователь A отправляет сообщение
    ↓
Сервер сохраняет в БД
    ↓
Пользователь B должен обновить страницу или сделать запрос
    ↓
Только тогда он увидит новое сообщение
```

### Real-Time подход:
```
Пользователь A отправляет сообщение
    ↓
Сервер сохраняет в БД
    ↓
Сервер автоматически отправляет всем подписчикам
    ↓
Пользователь B видит сообщение МГНОВЕННО
```

---

## 🏗️ Архитектура решения {#архитектура}

Наш Real-Time работает через **GraphQL Subscriptions** + **WebSocket**:

```
┌─────────────┐
│   Frontend   │
│  (React/Vue) │
└──────┬───────┘
       │
       │ WebSocket Connection
       │ (ws://localhost:4000/graphql)
       │
       ▼
┌─────────────────────────────────────┐
│      SubscriptionServer              │
│  (subscriptions-transport-ws)       │
│                                      │
│  • Принимает WebSocket соединения   │
│  • Проверяет аутентификацию         │
│  • Управляет подписками              │
└──────┬───────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│      GraphQL Resolvers              │
│                                      │
│  • sendMessage: сохраняет сообщение │
│  • messageAdded: подписка на новые  │
└──────┬───────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│         PubSub                      │
│  (Event Publisher/Subscriber)        │
│                                      │
│  • Публикует события                │
│  • Уведомляет подписчиков            │
└──────┬───────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│      MongoDB                        │
│  (Хранилище сообщений)              │
└─────────────────────────────────────┘
```

---

## 🔧 Как это работает на бэкенде {#бэкенд}

### Шаг 1: Настройка WebSocket сервера

В файле `src/server.ts`:

```typescript
// 1. Создаем HTTP сервер (нужен для WebSocket)
const httpServer = createServer(app);

// 2. Настраиваем SubscriptionServer для WebSocket
const subscriptionServer = SubscriptionServer.create(
  {
    schema,              // GraphQL схема
    execute,              // Функция выполнения запросов
    subscribe,            // Функция подписок
    
    // Когда клиент подключается через WebSocket
    onConnect: async (connectionParams, webSocket) => {
      // Извлекаем токен из параметров подключения
      const token = connectionParams?.authorization?.replace('Bearer ', '');
      
      if (token) {
        // Проверяем токен и сохраняем информацию о пользователе
        const payload = verifyToken(token);
        webSocket.context = {
          userId: payload.userId,
          userEmail: payload.email,
        };
        return webSocket.context;
      }
      return {};
    },
    
    // Когда клиент отключается
    onDisconnect: () => {
      console.log('WebSocket client disconnected');
    },
    
    // Перед выполнением каждой операции (запроса/подписки)
    onOperation: async (message, params, webSocket) => {
      // Передаем контекст пользователя в resolver
      if (webSocket.context) {
        params.context = webSocket.context;
      }
      return params;
    },
  },
  {
    server: httpServer,           // HTTP сервер
    path: '/graphql',              // Путь для WebSocket
  }
);
```

**Что происходит:**
1. Клиент подключается через WebSocket к `ws://localhost:4000/graphql`
2. Передает токен в `connectionParams`
3. Сервер проверяет токен и сохраняет информацию о пользователе
4. Теперь все запросы через этот WebSocket будут иметь контекст пользователя

---

### Шаг 2: GraphQL Subscription в схеме

В файле `src/graphql/typeDefs.ts`:

```graphql
type Subscription {
  messageAdded(chatId: ID!): Message!
}
```

**Что это значит:**
- Клиент может подписаться на событие `messageAdded`
- Нужно указать `chatId` - для какого чата слушать сообщения
- Когда приходит новое сообщение, клиент получит объект `Message`

---

### Шаг 3: Resolver для подписки

В файле `src/graphql/resolvers.ts`:

```typescript
import { PubSub } from 'graphql-subscriptions';

// Создаем экземпляр PubSub (Publisher/Subscriber)
const pubsub = new PubSub();

export const resolvers = {
  Subscription: {
    messageAdded: {
      // Когда клиент подписывается на messageAdded
      subscribe: async (_: any, args: { chatId: string }, context: Context) => {
        const userId = getUserIdFromContext(context);
        
        // 1. Проверяем, что чат существует
        const chat = await Chat.findById(args.chatId);
        if (!chat) {
          throw new UserInputError('Chat not found');
        }
        
        // 2. Проверяем, что пользователь является участником чата
        if (!chat.participants.some((p: any) => p.toString() === userId)) {
          throw new ForbiddenError('You are not a participant of this chat');
        }

        // 3. Возвращаем asyncIterator для этого чата
        // Ключ уникален для каждого чата: MESSAGE_ADDED_<chatId>
        return pubsub.asyncIterator(`MESSAGE_ADDED_${args.chatId}`);
      },
    },
  },
};
```

**Что происходит:**
1. Клиент отправляет subscription запрос: `subscription { messageAdded(chatId: "123") }`
2. Сервер проверяет права доступа
3. Возвращает `asyncIterator` - это канал, по которому будут приходить события
4. Каждый чат имеет свой уникальный канал: `MESSAGE_ADDED_123`, `MESSAGE_ADDED_456`, и т.д.

---

### Шаг 4: Публикация события при отправке сообщения

В файле `src/graphql/resolvers.ts`:

```typescript
Mutation: {
  sendMessage: async (_: any, args: { input: {...} }, context: Context) => {
    const userId = getUserIdFromContext(context);
    const { chatId, content, imageUrl } = args.input;

    // 1. Проверяем, что чат существует и пользователь - участник
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new UserInputError('Chat not found');
    }
    
    if (!chat.participants.some((p: any) => p.toString() === userId)) {
      throw new ForbiddenError('You are not a participant of this chat');
    }

    // 2. Создаем и сохраняем сообщение в БД
    const message = new Message({
      chat: chatId,
      sender: userId,
      content,
      imageUrl,
    });
    await message.save();

    // 3. Обновляем время последнего обновления чата
    chat.updatedAt = new Date();
    await chat.save();

    // 4. Загружаем полные данные сообщения (с populate)
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', '-password')
      .populate({
        path: 'chat',
        populate: {
          path: 'participants',
          select: '-password',
        },
      });

    // 5. ⚡ ВАЖНО: Публикуем событие для всех подписчиков
    pubsub.publish(`MESSAGE_ADDED_${chatId}`, {
      messageAdded: populatedMessage,
    });

    // 6. Возвращаем сообщение отправителю
    return populatedMessage;
  },
}
```

**Что происходит:**
1. Пользователь отправляет сообщение через mutation `sendMessage`
2. Сообщение сохраняется в MongoDB
3. **Ключевой момент:** `pubsub.publish()` отправляет событие всем, кто подписан на канал `MESSAGE_ADDED_<chatId>`
4. Все подписчики (другие пользователи в этом чате) мгновенно получают новое сообщение

---

## 💻 Как подключиться на фронтенде {#фронтенд}

### Вариант 1: Apollo Client (Рекомендуется)

#### 1. Установка зависимостей

```bash
npm install @apollo/client graphql subscriptions-transport-ws
```

#### 2. Настройка Apollo Client с WebSocket

```typescript
import { ApolloClient, InMemoryCache, split, HttpLink } from '@apollo/client';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { setContext } from '@apollo/client/link/context';

// HTTP ссылка для обычных запросов (queries, mutations)
const httpLink = new HttpLink({
  uri: 'http://localhost:4000/graphql',
});

// WebSocket ссылка для subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:4000/graphql',
    connectionParams: () => {
      // Получаем токен из localStorage или state
      const token = localStorage.getItem('token');
      return {
        authorization: token ? `Bearer ${token}` : '',
      };
    },
    // Автоматическое переподключение при разрыве соединения
    shouldRetry: () => true,
  })
);

// Ссылка для аутентификации (добавляет токен в заголовки)
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Разделяем запросы: subscriptions идут через WebSocket, остальное через HTTP
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,      // Для subscriptions
  authLink.concat(httpLink)  // Для queries и mutations
);

// Создаем Apollo Client
const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

export default client;
```

#### 3. Использование подписки в компоненте

```typescript
import { useSubscription, useMutation, useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

// GraphQL запросы
const GET_MESSAGES = gql`
  query GetMessages($chatId: ID!) {
    messages(chatId: $chatId, limit: 50) {
      id
      content
      imageUrl
      sender {
        id
        username
      }
      createdAt
    }
  }
`;

const SEND_MESSAGE = gql`
  mutation SendMessage($chatId: ID!, $content: String) {
    sendMessage(input: {
      chatId: $chatId
      content: $content
    }) {
      id
      content
      sender {
        id
        username
      }
      createdAt
    }
  }
`;

const MESSAGE_SUBSCRIPTION = gql`
  subscription OnMessageAdded($chatId: ID!) {
    messageAdded(chatId: $chatId) {
      id
      content
      imageUrl
      sender {
        id
        username
      }
      createdAt
    }
  }
`;

function ChatComponent({ chatId }: { chatId: string }) {
  // 1. Загружаем существующие сообщения
  const { data: messagesData, loading } = useQuery(GET_MESSAGES, {
    variables: { chatId },
  });

  // 2. Подписываемся на новые сообщения
  const { data: subscriptionData } = useSubscription(MESSAGE_SUBSCRIPTION, {
    variables: { chatId },
    // Когда приходит новое сообщение, обновляем кэш
    onData: ({ data }) => {
      if (data?.data?.messageAdded) {
        // Обновляем кэш Apollo Client
        client.cache.updateQuery(
          { query: GET_MESSAGES, variables: { chatId } },
          (existingMessages) => {
            return {
              messages: [
                ...(existingMessages?.messages || []),
                data.data.messageAdded,
              ],
            };
          }
        );
      }
    },
  });

  // 3. Мутация для отправки сообщения
  const [sendMessage] = useMutation(SEND_MESSAGE);

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage({
        variables: {
          chatId,
          content,
        },
        // После отправки сообщение автоматически появится через subscription
        // Но можно также обновить кэш вручную
        update: (cache, { data }) => {
          if (data?.sendMessage) {
            cache.updateQuery(
              { query: GET_MESSAGES, variables: { chatId } },
              (existing) => {
                return {
                  messages: [
                    ...(existing?.messages || []),
                    data.sendMessage,
                  ],
                };
              }
            );
          }
        },
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div>
      {/* Список сообщений */}
      <div>
        {messagesData?.messages?.map((message: any) => (
          <div key={message.id}>
            <strong>{message.sender.username}:</strong> {message.content}
          </div>
        ))}
      </div>

      {/* Форма отправки */}
      <form onSubmit={(e) => {
        e.preventDefault();
        const input = e.target.message;
        handleSendMessage(input.value);
        input.value = '';
      }}>
        <input name="message" placeholder="Введите сообщение..." />
        <button type="submit">Отправить</button>
      </form>
    </div>
  );
}
```

---

### Вариант 2: Нативный WebSocket (без Apollo Client)

Если вы не используете Apollo Client, можно подключиться напрямую:

```typescript
import { SubscriptionClient } from 'subscriptions-transport-ws';

// Создаем клиент для подписок
const wsClient = new SubscriptionClient('ws://localhost:4000/graphql', {
  reconnect: true,
  connectionParams: () => {
    const token = localStorage.getItem('token');
    return {
      authorization: `Bearer ${token}`,
    };
  },
});

// Подписка на новые сообщения
const subscription = wsClient.request({
  query: `
    subscription OnMessageAdded($chatId: ID!) {
      messageAdded(chatId: $chatId) {
        id
        content
        sender {
          id
          username
        }
        createdAt
      }
    }
  `,
  variables: { chatId: 'your-chat-id' },
}).subscribe({
  next: (data) => {
    console.log('Новое сообщение:', data.data.messageAdded);
    // Обновляем UI
    addMessageToChat(data.data.messageAdded);
  },
  error: (error) => {
    console.error('Ошибка подписки:', error);
  },
});

// Отправка сообщения через обычный HTTP запрос
async function sendMessage(chatId: string, content: string) {
  const response = await fetch('http://localhost:4000/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify({
      query: `
        mutation SendMessage($chatId: ID!, $content: String!) {
          sendMessage(input: {
            chatId: $chatId
            content: $content
          }) {
            id
            content
            sender {
              id
              username
            }
            createdAt
          }
        }
      `,
      variables: { chatId, content },
    }),
  });

  const result = await response.json();
  return result.data.sendMessage;
}

// Закрытие подписки при размонтировании компонента
// subscription.unsubscribe();
```

---

## 📝 Полный пример использования {#пример}

### Сценарий: Три пользователя общаются в групповом чате

#### Пользователь A (отправляет сообщение):

```typescript
// 1. Пользователь A вводит сообщение и нажимает "Отправить"
const message = "Привет всем!";

// 2. Вызывается mutation sendMessage
await sendMessage({
  variables: {
    chatId: "group-chat-123",
    content: message,
  },
});

// 3. На бэкенде:
//    - Сообщение сохраняется в MongoDB
//    - pubsub.publish() отправляет событие в канал MESSAGE_ADDED_group-chat-123
```

#### Пользователь B и C (получают сообщение):

```typescript
// 1. Пользователи B и C уже подписаны на subscription:
useSubscription(MESSAGE_SUBSCRIPTION, {
  variables: { chatId: "group-chat-123" },
  onData: ({ data }) => {
    // 2. Когда приходит событие от pubsub.publish()
    //    автоматически вызывается этот callback
    const newMessage = data.data.messageAdded;
    
    // 3. Обновляем UI - добавляем сообщение в список
    setMessages(prev => [...prev, newMessage]);
  },
});

// Результат: Пользователи B и C видят сообщение от A МГНОВЕННО
// без обновления страницы!
```

---

## 🔄 Полный цикл работы Real-Time

```
┌─────────────────────────────────────────────────────────────┐
│                    ПОЛНЫЙ ЦИКЛ                              │
└─────────────────────────────────────────────────────────────┘

1. Пользователь A открывает чат
   ↓
   Frontend: useSubscription(MESSAGE_SUBSCRIPTION, { chatId })
   ↓
   WebSocket: Подключение к ws://localhost:4000/graphql
   ↓
   Backend: onConnect() проверяет токен, сохраняет контекст
   ↓
   Backend: messageAdded.subscribe() проверяет права, возвращает asyncIterator
   ↓
   Frontend: Готов принимать события

2. Пользователь A отправляет сообщение
   ↓
   Frontend: sendMessage mutation
   ↓
   Backend: sendMessage resolver
   ↓
   Backend: Сохранение в MongoDB
   ↓
   Backend: pubsub.publish('MESSAGE_ADDED_<chatId>', { messageAdded })
   ↓
   Backend: PubSub отправляет событие всем подписчикам канала

3. Пользователи B и C получают сообщение
   ↓
   Backend: asyncIterator получает событие от PubSub
   ↓
   WebSocket: Отправка данных через WebSocket
   ↓
   Frontend: onData callback в useSubscription
   ↓
   Frontend: Обновление UI (добавление сообщения в список)
   ↓
   Пользователи B и C видят новое сообщение МГНОВЕННО
```

---

## ❓ Часто задаваемые вопросы {#faq}

### Q1: Что если пользователь не подключен к WebSocket?

**A:** Если пользователь не подключен к subscription, он не получит сообщение в реальном времени. Но:
- Сообщение все равно сохраняется в БД
- При следующей загрузке чата (через `query messages`) он увидит все сообщения
- При переподключении к subscription он получит только новые сообщения

### Q2: Что происходит при разрыве соединения?

**A:** 
- WebSocket клиент автоматически пытается переподключиться (если настроено `shouldRetry: true`)
- При переподключении нужно снова подписаться на subscription
- Старые сообщения можно загрузить через обычный query

### Q3: Как обрабатывать несколько чатов одновременно?

**A:** Нужно создать несколько подписок:

```typescript
// Подписка на чат 1
useSubscription(MESSAGE_SUBSCRIPTION, { variables: { chatId: 'chat-1' } });

// Подписка на чат 2
useSubscription(MESSAGE_SUBSCRIPTION, { variables: { chatId: 'chat-2' } });
```

Каждая подписка работает независимо.

### Q4: Как узнать, что пользователь онлайн/оффлайн?

**A:** Текущая реализация не отслеживает онлайн статус. Можно добавить:
- Событие `userConnected` при `onConnect`
- Событие `userDisconnected` при `onDisconnect`
- Хранить список онлайн пользователей в памяти или Redis

### Q5: Можно ли отправлять сообщения через WebSocket?

**A:** Технически можно, но лучше использовать mutation через HTTP:
- Mutations должны быть надежными (HTTP гарантирует доставку)
- Subscriptions только для получения данных в реальном времени
- Это стандартная практика GraphQL

### Q6: Что такое PubSub и как он работает?

**A:** PubSub (Publisher/Subscriber) - это паттерн для событий:
- **Publisher** (отправитель): `pubsub.publish('channel', data)` - отправляет событие
- **Subscriber** (подписчик): `pubsub.asyncIterator('channel')` - получает события
- Каждый канал независим: `MESSAGE_ADDED_chat1` и `MESSAGE_ADDED_chat2` не пересекаются

### Q7: Безопасно ли это?

**A:** Да, безопасность обеспечивается:
- Аутентификация через JWT токен при подключении WebSocket
- Проверка прав доступа в subscription resolver (только участники чата могут подписаться)
- Проверка прав при отправке сообщения (только участники могут отправлять)

---

## 🎓 Ключевые концепции

### 1. WebSocket vs HTTP
- **HTTP**: Запрос → Ответ → Закрытие соединения
- **WebSocket**: Открытое соединение → Двусторонняя связь → Постоянное соединение

### 2. GraphQL Subscriptions
- Это специальный тип операции в GraphQL
- Работает только через WebSocket
- Позволяет получать данные в реальном времени

### 3. PubSub Pattern
- Паттерн "Издатель-Подписчик"
- Один отправитель, много получателей
- События доставляются всем подписчикам канала

### 4. AsyncIterator
- Это поток данных
- GraphQL использует его для subscriptions
- Данные приходят по мере появления

---

## 🚀 Быстрый старт для фронтендера

1. **Установите зависимости:**
   ```bash
   npm install @apollo/client graphql subscriptions-transport-ws
   ```

2. **Настройте Apollo Client** (см. раздел "Как подключиться на фронтенде")

3. **Используйте useSubscription в компоненте:**
   ```typescript
   const { data } = useSubscription(MESSAGE_SUBSCRIPTION, {
     variables: { chatId },
   });
   ```

4. **Готово!** Сообщения будут приходить автоматически.

---

## 📚 Дополнительные ресурсы

- [GraphQL Subscriptions документация](https://www.apollographql.com/docs/react/data/subscriptions/)
- [WebSocket протокол](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [PubSub паттерн](https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern)

---

**Если что-то непонятно - спрашивайте!** 🚀

