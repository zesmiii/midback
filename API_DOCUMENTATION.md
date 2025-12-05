# API Документация для Frontend

## Базовый URL

- **GraphQL Endpoint**: `http://localhost:4000/graphql`
- **GraphQL Playground**: `http://localhost:4000/graphql` (в браузере)
- **WebSocket (Subscriptions)**: `ws://localhost:4000/graphql`
- **REST API**: `http://localhost:4000/api`
- **Uploads**: `http://localhost:4000/uploads`

## Аутентификация

Все запросы (кроме `register` и `login`) требуют JWT токен в заголовке:

```
Authorization: Bearer <your_jwt_token>
```

Для WebSocket subscriptions передавайте токен в `connectionParams`:

```javascript
{
  authorization: `Bearer ${token}`
  // или
  token: token
}
```

---

## GraphQL API

### 🔐 Аутентификация

#### 1. Регистрация

**Mutation**: `register`

**Назначение**: Создание нового пользователя

**Входные данные**:
```graphql
mutation {
  register(input: {
    username: String!    # Минимум 3 символа
    email: String!       # Валидный email
    password: String!   # Минимум 6 символов
  }) {
    token: String!       # JWT токен для последующих запросов
    user: User!          # Данные созданного пользователя
  }
}
```

**Пример запроса**:
```graphql
mutation Register {
  register(input: {
    username: "john_doe"
    email: "john@example.com"
    password: "password123"
  }) {
    token
    user {
      id
      username
      email
      createdAt
    }
  }
}
```

**Возвращаемые данные**:
```json
{
  "data": {
    "register": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "507f1f77bcf86cd799439011",
        "username": "john_doe",
        "email": "john@example.com",
        "createdAt": "2024-01-01T12:00:00.000Z",
        "updatedAt": "2024-01-01T12:00:00.000Z"
      }
    }
  }
}
```

**Ошибки**:
- `User with this email already exists` - Email уже используется
- `User with this username already exists` - Username уже используется
- `Password must be at least 6 characters long` - Пароль слишком короткий
- `All fields are required` - Не все поля заполнены

---

#### 2. Вход

**Mutation**: `login`

**Назначение**: Аутентификация существующего пользователя

**Входные данные**:
```graphql
mutation {
  login(input: {
    email: String!       # Email пользователя
    password: String!   # Пароль пользователя
  }) {
    token: String!       # JWT токен
    user: User!          # Данные пользователя
  }
}
```

**Пример запроса**:
```graphql
mutation Login {
  login(input: {
    email: "john@example.com"
    password: "password123"
  }) {
    token
    user {
      id
      username
      email
    }
  }
}
```

**Возвращаемые данные**:
```json
{
  "data": {
    "login": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "507f1f77bcf86cd799439011",
        "username": "john_doe",
        "email": "john@example.com",
        "createdAt": "2024-01-01T12:00:00.000Z",
        "updatedAt": "2024-01-01T12:00:00.000Z"
      }
    }
  }
}
```

**Ошибки**:
- `Invalid email or password` - Неверные учетные данные
- `Email and password are required` - Не все поля заполнены

---

#### 3. Выход

**Mutation**: `logout`

**Назначение**: Выход из системы (инвалидация сессии)

**Входные данные**: Нет (требуется только токен в заголовке)

**Пример запроса**:
```graphql
mutation Logout {
  logout
}
```

**Возвращаемые данные**:
```json
{
  "data": {
    "logout": true
  }
}
```

---

### 👤 Пользователи

#### 4. Получить текущего пользователя

**Query**: `me`

**Назначение**: Получение данных текущего аутентифицированного пользователя

**Входные данные**: Нет (требуется токен в заголовке)

**Пример запроса**:
```graphql
query Me {
  me {
    id
    username
    email
    createdAt
    updatedAt
  }
}
```

**Возвращаемые данные**:
```json
{
  "data": {
    "me": {
      "id": "507f1f77bcf86cd799439011",
      "username": "john_doe",
      "email": "john@example.com",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

**Ошибки**:
- `Authentication required` - Токен не предоставлен или невалидный

---

#### 5. Список пользователей

**Query**: `users`

**Назначение**: Получение списка всех пользователей с возможностью поиска

**Входные данные**:
```graphql
query {
  users(search: String) {  # Опциональный поиск по username или email
    id: ID!
    username: String!
    email: String!
    createdAt: String!
    updatedAt: String!
  }
}
```

**Пример запроса**:
```graphql
# Все пользователи
query AllUsers {
  users {
    id
    username
    email
  }
}

# Поиск пользователей
query SearchUsers {
  users(search: "john") {
    id
    username
    email
  }
}
```

**Возвращаемые данные**:
```json
{
  "data": {
    "users": [
      {
        "id": "507f1f77bcf86cd799439011",
        "username": "john_doe",
        "email": "john@example.com",
        "createdAt": "2024-01-01T12:00:00.000Z",
        "updatedAt": "2024-01-01T12:00:00.000Z"
      },
      {
        "id": "507f1f77bcf86cd799439012",
        "username": "jane_doe",
        "email": "jane@example.com",
        "createdAt": "2024-01-01T12:00:00.000Z",
        "updatedAt": "2024-01-01T12:00:00.000Z"
      }
    ]
  }
}
```

---

#### 6. Получить пользователя по ID

**Query**: `user`

**Назначение**: Получение данных конкретного пользователя

**Входные данные**:
```graphql
query {
  user(id: ID!) {
    id: ID!
    username: String!
    email: String!
    createdAt: String!
    updatedAt: String!
  }
}
```

**Пример запроса**:
```graphql
query GetUser {
  user(id: "507f1f77bcf86cd799439011") {
    id
    username
    email
  }
}
```

**Возвращаемые данные**:
```json
{
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "username": "john_doe",
      "email": "john@example.com",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

**Ошибки**:
- `User not found` - Пользователь не найден

---

### 💬 Чаты

#### 7. Список чатов

**Query**: `chats`

**Назначение**: Получение списка всех чатов текущего пользователя (DM и группы)

**Входные данные**: Нет (требуется токен в заголовке)

**Пример запроса**:
```graphql
query MyChats {
  chats {
    id
    name
    type
    participants {
      id
      username
      email
    }
    createdBy {
      id
      username
    }
    lastMessage {
      id
      content
      imageUrl
      sender {
        id
        username
      }
      createdAt
    }
    createdAt
    updatedAt
  }
}
```

**Возвращаемые данные**:
```json
{
  "data": {
    "chats": [
      {
        "id": "507f1f77bcf86cd799439020",
        "name": null,
        "type": "DM",
        "participants": [
          {
            "id": "507f1f77bcf86cd799439011",
            "username": "john_doe",
            "email": "john@example.com"
          },
          {
            "id": "507f1f77bcf86cd799439012",
            "username": "jane_doe",
            "email": "jane@example.com"
          }
        ],
        "createdBy": {
          "id": "507f1f77bcf86cd799439011",
          "username": "john_doe"
        },
        "lastMessage": {
          "id": "507f1f77bcf86cd799439030",
          "content": "Hello!",
          "imageUrl": null,
          "sender": {
            "id": "507f1f77bcf86cd799439011",
            "username": "john_doe"
          },
          "createdAt": "2024-01-01T13:00:00.000Z"
        },
        "createdAt": "2024-01-01T12:00:00.000Z",
        "updatedAt": "2024-01-01T13:00:00.000Z"
      },
      {
        "id": "507f1f77bcf86cd799439021",
        "name": "Work Team",
        "type": "GROUP",
        "participants": [
          {
            "id": "507f1f77bcf86cd799439011",
            "username": "john_doe",
            "email": "john@example.com"
          },
          {
            "id": "507f1f77bcf86cd799439012",
            "username": "jane_doe",
            "email": "jane@example.com"
          },
          {
            "id": "507f1f77bcf86cd799439013",
            "username": "bob_smith",
            "email": "bob@example.com"
          }
        ],
        "createdBy": {
          "id": "507f1f77bcf86cd799439011",
          "username": "john_doe"
        },
        "lastMessage": null,
        "createdAt": "2024-01-01T12:00:00.000Z",
        "updatedAt": "2024-01-01T12:00:00.000Z"
      }
    ]
  }
}
```

**Примечание**: Чаты отсортированы по `updatedAt` (новые первыми). `lastMessage` может быть `null`, если в чате еще нет сообщений.

---

#### 8. Получить чат по ID

**Query**: `chat`

**Назначение**: Получение данных конкретного чата

**Входные данные**:
```graphql
query {
  chat(id: ID!) {
    id: ID!
    name: String
    type: ChatType!
    participants: [User!]!
    createdBy: User!
    lastMessage: Message
    createdAt: String!
    updatedAt: String!
  }
}
```

**Пример запроса**:
```graphql
query GetChat {
  chat(id: "507f1f77bcf86cd799439020") {
    id
    name
    type
    participants {
      id
      username
    }
    createdBy {
      id
      username
    }
    lastMessage {
      id
      content
      createdAt
    }
  }
}
```

**Возвращаемые данные**: Аналогично `chats`, но один объект

**Ошибки**:
- `Chat not found` - Чат не найден
- `You are not a participant of this chat` - Пользователь не является участником чата

---

#### 9. Создать личный чат (DM)

**Mutation**: `createDM`

**Назначение**: Создание или получение существующего личного чата с другим пользователем

**Входные данные**:
```graphql
mutation {
  createDM(participantId: ID!) {
    id: ID!
    name: String
    type: ChatType!
    participants: [User!]!
    createdBy: User!
    createdAt: String!
    updatedAt: String!
  }
}
```

**Пример запроса**:
```graphql
mutation CreateDM {
  createDM(participantId: "507f1f77bcf86cd799439012") {
    id
    type
    participants {
      id
      username
    }
    createdAt
  }
}
```

**Возвращаемые данные**:
```json
{
  "data": {
    "createDM": {
      "id": "507f1f77bcf86cd799439020",
      "name": null,
      "type": "DM",
      "participants": [
        {
          "id": "507f1f77bcf86cd799439011",
          "username": "john_doe",
          "email": "john@example.com"
        },
        {
          "id": "507f1f77bcf86cd799439012",
          "username": "jane_doe",
          "email": "jane@example.com"
        }
      ],
      "createdBy": {
        "id": "507f1f77bcf86cd799439011",
        "username": "john_doe"
      },
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

**Ошибки**:
- `Cannot create DM with yourself` - Попытка создать DM с самим собой
- `Participant not found` - Пользователь не найден

**Примечание**: Если DM между этими пользователями уже существует, вернется существующий чат.

---

#### 10. Создать групповой чат

**Mutation**: `createGroupChat`

**Назначение**: Создание группового чата с несколькими участниками

**Входные данные**:
```graphql
mutation {
  createGroupChat(input: {
    name: String!           # Название группы
    participantIds: [ID!]! # Массив ID участников (минимум 2, т.к. создатель добавляется автоматически)
  }) {
    id: ID!
    name: String!
    type: ChatType!
    participants: [User!]!
    createdBy: User!
    createdAt: String!
    updatedAt: String!
  }
}
```

**Пример запроса**:
```graphql
mutation CreateGroup {
  createGroupChat(input: {
    name: "Work Team"
    participantIds: [
      "507f1f77bcf86cd799439012",
      "507f1f77bcf86cd799439013"
    ]
  }) {
    id
    name
    type
    participants {
      id
      username
    }
    createdBy {
      id
      username
    }
    createdAt
  }
}
```

**Возвращаемые данные**:
```json
{
  "data": {
    "createGroupChat": {
      "id": "507f1f77bcf86cd799439021",
      "name": "Work Team",
      "type": "GROUP",
      "participants": [
        {
          "id": "507f1f77bcf86cd799439011",
          "username": "john_doe",
          "email": "john@example.com"
        },
        {
          "id": "507f1f77bcf86cd799439012",
          "username": "jane_doe",
          "email": "jane@example.com"
        },
        {
          "id": "507f1f77bcf86cd799439013",
          "username": "bob_smith",
          "email": "bob@example.com"
        }
      ],
      "createdBy": {
        "id": "507f1f77bcf86cd799439011",
        "username": "john_doe"
      },
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

**Ошибки**:
- `Group chat must have at least 3 participants` - В группе должно быть минимум 3 участника (включая создателя)
- `One or more participants not found` - Один или несколько участников не найдены

**Примечание**: Создатель автоматически добавляется в список участников. Дубликаты удаляются автоматически.

---

### 📨 Сообщения

#### 11. Получить сообщения чата

**Query**: `messages`

**Назначение**: Получение истории сообщений чата с пагинацией

**Входные данные**:
```graphql
query {
  messages(
    chatId: ID!           # ID чата
    limit: Int            # Количество сообщений (по умолчанию 50)
    offset: Int           # Смещение для пагинации (по умолчанию 0)
  ) {
    id: ID!
    chat: Chat!
    sender: User!
    content: String
    imageUrl: String
    createdAt: String!
    updatedAt: String!
  }
}
```

**Пример запроса**:
```graphql
query GetMessages {
  messages(
    chatId: "507f1f77bcf86cd799439020"
    limit: 50
    offset: 0
  ) {
    id
    content
    imageUrl
    sender {
      id
      username
    }
    chat {
      id
      type
    }
    createdAt
  }
}
```

**Возвращаемые данные**:
```json
{
  "data": {
    "messages": [
      {
        "id": "507f1f77bcf86cd799439030",
        "content": "Hello!",
        "imageUrl": null,
        "sender": {
          "id": "507f1f77bcf86cd799439011",
          "username": "john_doe"
        },
        "chat": {
          "id": "507f1f77bcf86cd799439020",
          "type": "DM",
          "participants": [
            {
              "id": "507f1f77bcf86cd799439011",
              "username": "john_doe"
            },
            {
              "id": "507f1f77bcf86cd799439012",
              "username": "jane_doe"
            }
          ]
        },
        "createdAt": "2024-01-01T13:00:00.000Z",
        "updatedAt": "2024-01-01T13:00:00.000Z"
      },
      {
        "id": "507f1f77bcf86cd799439031",
        "content": null,
        "imageUrl": "/uploads/image-1234567890.jpg",
        "sender": {
          "id": "507f1f77bcf86cd799439012",
          "username": "jane_doe"
        },
        "chat": {
          "id": "507f1f77bcf86cd799439020",
          "type": "DM"
        },
        "createdAt": "2024-01-01T13:05:00.000Z",
        "updatedAt": "2024-01-01T13:05:00.000Z"
      }
    ]
  }
}
```

**Ошибки**:
- `Chat not found` - Чат не найден
- `You are not a participant of this chat` - Пользователь не является участником чата

**Примечание**: Сообщения возвращаются в хронологическом порядке (старые первыми). Для бесконечной прокрутки используйте `offset`.

---

#### 12. Отправить сообщение

**Mutation**: `sendMessage`

**Назначение**: Отправка текстового сообщения или изображения в чат

**Входные данные**:
```graphql
mutation {
  sendMessage(input: {
    chatId: ID!           # ID чата
    content: String       # Текст сообщения (опционально, если есть imageUrl)
    imageUrl: String      # URL изображения (опционально, если есть content)
  }) {
    id: ID!
    chat: Chat!
    sender: User!
    content: String
    imageUrl: String
    createdAt: String!
    updatedAt: String!
  }
}
```

**Пример запроса (текстовое сообщение)**:
```graphql
mutation SendTextMessage {
  sendMessage(input: {
    chatId: "507f1f77bcf86cd799439020"
    content: "Hello, how are you?"
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
```

**Пример запроса (изображение)**:
```graphql
mutation SendImageMessage {
  sendMessage(input: {
    chatId: "507f1f77bcf86cd799439020"
    imageUrl: "/uploads/image-1234567890.jpg"
  }) {
    id
    imageUrl
    sender {
      id
      username
    }
    createdAt
  }
}
```

**Пример запроса (текст + изображение)**:
```graphql
mutation SendMessageWithImage {
  sendMessage(input: {
    chatId: "507f1f77bcf86cd799439020"
    content: "Check this out!"
    imageUrl: "/uploads/image-1234567890.jpg"
  }) {
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
```

**Возвращаемые данные**:
```json
{
  "data": {
    "sendMessage": {
      "id": "507f1f77bcf86cd799439030",
      "content": "Hello, how are you?",
      "imageUrl": null,
      "sender": {
        "id": "507f1f77bcf86cd799439011",
        "username": "john_doe"
      },
      "chat": {
        "id": "507f1f77bcf86cd799439020",
        "type": "DM",
        "participants": [
          {
            "id": "507f1f77bcf86cd799439011",
            "username": "john_doe"
          },
          {
            "id": "507f1f77bcf86cd799439012",
            "username": "jane_doe"
          }
        ]
      },
      "createdAt": "2024-01-01T13:00:00.000Z",
      "updatedAt": "2024-01-01T13:00:00.000Z"
    }
  }
}
```

**Ошибки**:
- `Message must have content or image` - Сообщение должно содержать либо текст, либо изображение
- `Chat not found` - Чат не найден
- `You are not a participant of this chat` - Пользователь не является участником чата

**Примечание**: После отправки сообщения все подписчики на `messageAdded` для этого чата получат уведомление в реальном времени.

---

### 🔔 Real-Time Subscriptions

#### 13. Подписка на новые сообщения

**Subscription**: `messageAdded`

**Назначение**: Получение новых сообщений в реальном времени через WebSocket

**Входные данные**:
```graphql
subscription {
  messageAdded(chatId: ID!) {
    id: ID!
    chat: Chat!
    sender: User!
    content: String
    imageUrl: String
    createdAt: String!
    updatedAt: String!
  }
}
```

**Пример подписки**:
```graphql
subscription OnMessageAdded {
  messageAdded(chatId: "507f1f77bcf86cd799439020") {
    id
    content
    imageUrl
    sender {
      id
      username
    }
    chat {
      id
      type
    }
    createdAt
  }
}
```

**Возвращаемые данные**: Аналогично `sendMessage`, но приходит автоматически при появлении нового сообщения

**Ошибки**:
- `Chat not found` - Чат не найден
- `You are not a participant of this chat` - Пользователь не является участником чата
- `Authentication required` - Токен не предоставлен или невалидный

**Пример использования с Apollo Client**:
```javascript
import { useSubscription } from '@apollo/client';

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

function ChatMessages({ chatId }) {
  const { data, loading } = useSubscription(MESSAGE_SUBSCRIPTION, {
    variables: { chatId },
    context: {
      headers: {
        authorization: `Bearer ${token}`
      }
    }
  });

  // Обработка новых сообщений
}
```

**WebSocket Connection (для subscriptions-transport-ws)**:
```javascript
import { SubscriptionClient } from 'subscriptions-transport-ws';

const wsClient = new SubscriptionClient('ws://localhost:4000/graphql', {
  reconnect: true,
  connectionParams: {
    authorization: `Bearer ${token}`
    // или
    // token: token
  }
});
```

---

## REST API

### 📤 Загрузка изображений

#### 14. Загрузить изображение

**Endpoint**: `POST /api/image`

**Назначение**: Загрузка изображения для последующей отправки в сообщении

**Аутентификация**: Требуется (Bearer token в заголовке)

**Входные данные**:
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Headers**: 
  ```
  Authorization: Bearer <token>
  ```
- **Body**: 
  - `image` (File) - файл изображения
  - Поддерживаемые форматы: `png`, `jpg`, `jpeg`, `webp`
  - Максимальный размер: `5MB` (настраивается через `MAX_FILE_SIZE`)

**Пример запроса (JavaScript/Fetch)**:
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

const response = await fetch('http://localhost:4000/api/image', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const data = await response.json();
console.log(data.imageUrl); // "/uploads/image-1234567890.jpg"
```

**Пример запроса (Axios)**:
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('image', file);

const response = await axios.post('http://localhost:4000/api/image', formData, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'multipart/form-data'
  }
});

console.log(response.data.imageUrl); // "/uploads/image-1234567890.jpg"
```

**Успешный ответ**:
```json
{
  "imageUrl": "/uploads/image-1234567890.jpg"
}
```

**Ошибки**:
- `401 Unauthorized` - Токен не предоставлен или невалидный
- `400 Bad Request` - `{ "error": "No file uploaded" }` - Файл не загружен
- `400 Bad Request` - `{ "error": "Only .png, .jpg, .jpeg, .webp images are allowed" }` - Неподдерживаемый формат
- `400 Bad Request` - `{ "error": "File size too large" }` - Файл слишком большой

**Примечание**: После успешной загрузки используйте возвращенный `imageUrl` в мутации `sendMessage`.

---

## Типы данных

### User
```typescript
type User {
  id: ID!              # Уникальный идентификатор
  username: String!    # Имя пользователя (уникальное)
  email: String!       # Email (уникальный)
  createdAt: String!   # Дата создания (ISO 8601)
  updatedAt: String!   # Дата обновления (ISO 8601)
}
```

### Chat
```typescript
type Chat {
  id: ID!                    # Уникальный идентификатор
  name: String               # Название (null для DM)
  type: ChatType!            # Тип чата: "DM" или "GROUP"
  participants: [User!]!    # Массив участников
  createdBy: User!           # Создатель чата
  lastMessage: Message       # Последнее сообщение (может быть null)
  createdAt: String!         # Дата создания
  updatedAt: String!         # Дата обновления
}
```

### Message
```typescript
type Message {
  id: ID!              # Уникальный идентификатор
  chat: Chat!          # Чат, к которому относится сообщение
  sender: User!         # Отправитель
  content: String       # Текст сообщения (может быть null, если есть imageUrl)
  imageUrl: String      # URL изображения (может быть null)
  createdAt: String!   # Дата создания
  updatedAt: String!   # Дата обновления
}
```

### AuthPayload
```typescript
type AuthPayload {
  token: String!  # JWT токен для аутентификации
  user: User!     # Данные пользователя
}
```

### ChatType (Enum)
```typescript
enum ChatType {
  DM      # Личный чат (1 на 1)
  GROUP   # Групповой чат
}
```

---

## Примеры полных сценариев

### Сценарий 1: Регистрация и создание DM

```graphql
# 1. Регистрация
mutation Register {
  register(input: {
    username: "alice"
    email: "alice@example.com"
    password: "password123"
  }) {
    token
    user {
      id
      username
    }
  }
}

# 2. Поиск пользователя для DM
query FindUser {
  users(search: "bob") {
    id
    username
  }
}

# 3. Создание DM
mutation CreateDM {
  createDM(participantId: "507f1f77bcf86cd799439012") {
    id
    participants {
      id
      username
    }
  }
}

# 4. Подписка на сообщения
subscription ListenMessages {
  messageAdded(chatId: "507f1f77bcf86cd799439020") {
    id
    content
    sender {
      username
    }
    createdAt
  }
}

# 5. Отправка сообщения
mutation SendMessage {
  sendMessage(input: {
    chatId: "507f1f77bcf86cd799439020"
    content: "Hello!"
  }) {
    id
    content
    createdAt
  }
}
```

### Сценарий 2: Создание группы и отправка изображения

```graphql
# 1. Создание группы
mutation CreateGroup {
  createGroupChat(input: {
    name: "Project Team"
    participantIds: [
      "507f1f77bcf86cd799439012",
      "507f1f77bcf86cd799439013"
    ]
  }) {
    id
    name
    participants {
      id
      username
    }
  }
}

# 2. Загрузка изображения (REST)
# POST /api/image с multipart/form-data

# 3. Отправка сообщения с изображением
mutation SendImage {
  sendMessage(input: {
    chatId: "507f1f77bcf86cd799439021"
    content: "Check this out!"
    imageUrl: "/uploads/image-1234567890.jpg"
  }) {
    id
    content
    imageUrl
    sender {
      username
    }
  }
}
```

---

## Обработка ошибок

Все GraphQL ошибки возвращаются в формате:

```json
{
  "errors": [
    {
      "message": "Error message",
      "extensions": {
        "code": "UNAUTHENTICATED" | "FORBIDDEN" | "BAD_USER_INPUT" | "INTERNAL_SERVER_ERROR"
      }
    }
  ]
}
```

**Коды ошибок**:
- `UNAUTHENTICATED` - Требуется аутентификация
- `FORBIDDEN` - Доступ запрещен
- `BAD_USER_INPUT` - Неверные входные данные
- `INTERNAL_SERVER_ERROR` - Внутренняя ошибка сервера

---

## Примечания

1. **Токены JWT**: Токены действительны 7 дней по умолчанию (настраивается через `JWT_EXPIRES_IN`)

2. **Пагинация сообщений**: Для загрузки старых сообщений используйте `offset`:
   - Первая загрузка: `offset: 0, limit: 50`
   - Следующая страница: `offset: 50, limit: 50`
   - И так далее

3. **Real-time обновления**: Все участники чата автоматически получают новые сообщения через WebSocket subscription

4. **Изображения**: После загрузки изображения через REST API, используйте возвращенный `imageUrl` в мутации `sendMessage`

5. **DM дубликаты**: При создании DM, если чат между этими пользователями уже существует, вернется существующий чат

6. **Групповые чаты**: Минимум 3 участника (создатель + 2 других). Создатель автоматически добавляется в участники

---

## Поддержка

При возникновении проблем проверьте:
- Правильность формата токена в заголовке `Authorization: Bearer <token>`
- Подключение к MongoDB
- Наличие всех обязательных полей в запросах
- Права доступа (участие в чате для отправки сообщений)

