# Тестирование аутентификации

## Проблемы и решения

### Проблема 1: "User with this email or username already exists"

**Причина:** Пользователь пытается зарегистрироваться с уже существующим email или username.

**Решение:** 
- Улучшена обработка ошибок - теперь показывается конкретное сообщение (email или username)
- Email нормализуется (lowercase) перед проверкой
- Username обрезается (trim) перед проверкой

### Проблема 2: "Invalid email or password" при логине

**Возможные причины:**
1. Email не совпадает (регистр, пробелы)
2. Пароль не совпадает
3. Пользователь не существует

**Решение:**
- Email нормализуется (lowercase, trim) перед поиском
- Добавлена проверка наличия пароля у пользователя
- Улучшена обработка ошибок с логированием

## Как проверить

### 1. Регистрация нового пользователя

```graphql
mutation {
  register(input: {
    username: "testuser"
    email: "test@example.com"
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

**Ожидаемый результат:** Успешная регистрация с токеном

### 2. Попытка регистрации с существующим email

```graphql
mutation {
  register(input: {
    username: "testuser2"
    email: "test@example.com"  # Тот же email
    password: "password123"
  }) {
    token
    user {
      id
    }
  }
}
```

**Ожидаемый результат:** Ошибка "User with this email already exists"

### 3. Попытка регистрации с существующим username

```graphql
mutation {
  register(input: {
    username: "testuser"  # Тот же username
    email: "test2@example.com"
    password: "password123"
  }) {
    token
    user {
      id
    }
  }
}
```

**Ожидаемый результат:** Ошибка "User with this username already exists"

### 4. Логин с правильными данными

```graphql
mutation {
  login(input: {
    email: "test@example.com"
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

**Ожидаемый результат:** Успешный вход с токеном

### 5. Логин с неправильным паролем

```graphql
mutation {
  login(input: {
    email: "test@example.com"
    password: "wrongpassword"
  }) {
    token
    user {
      id
    }
  }
}
```

**Ожидаемый результат:** Ошибка "Invalid email or password"

### 6. Логин с неправильным email

```graphql
mutation {
  login(input: {
    email: "nonexistent@example.com"
    password: "password123"
  }) {
    token
    user {
      id
    }
  }
}
```

**Ожидаемый результат:** Ошибка "Invalid email or password"

### 7. Логин с email в разном регистре

```graphql
mutation {
  login(input: {
    email: "TEST@EXAMPLE.COM"  # Верхний регистр
    password: "password123"
  }) {
    token
    user {
      id
      username
    }
  }
}
```

**Ожидаемый результат:** Успешный вход (email нормализуется)

## Отладка

### Проверка в базе данных

Подключитесь к MongoDB и проверьте пользователей:

```javascript
// В MongoDB shell
use chatdb
db.users.find().pretty()

// Проверьте конкретного пользователя
db.users.findOne({ email: "test@example.com" })
```

### Проверка хеширования пароля

Пароль должен быть захеширован (не виден в открытом виде):

```javascript
// Пароль должен выглядеть примерно так:
// $2a$10$abcdefghijklmnopqrstuvwxyz1234567890...
```

### Логи сервера

При ошибках в консоли сервера должны появляться логи:
- `Registration error:` - ошибки регистрации
- `Login error:` - ошибки входа
- `User password is missing` - если пароль отсутствует

## Частые проблемы

### 1. Пользователь существует, но логин не работает

**Проверьте:**
- Email точно совпадает (включая регистр до нормализации)
- Пароль правильный
- Пароль захеширован в БД

**Решение:**
- Удалите пользователя из БД и зарегистрируйте заново
- Или проверьте пароль вручную

### 2. Ошибка валидации email

**Проверьте формат email:**
- Должен содержать @
- Должен содержать точку после @
- Не должен содержать пробелы

**Примеры правильных email:**
- `test@example.com` ✅
- `user.name@domain.co.uk` ✅

**Примеры неправильных email:**
- `test@example` ❌ (нет домена)
- `test example.com` ❌ (нет @)
- `test@` ❌ (нет домена)

### 3. Ошибка валидации пароля

**Требования:**
- Минимум 6 символов
- Не может быть пустым

## Исправления в коде

1. ✅ Добавлена нормализация email (lowercase, trim)
2. ✅ Добавлена нормализация username (trim)
3. ✅ Улучшена обработка ошибок с конкретными сообщениями
4. ✅ Добавлена валидация входных данных
5. ✅ Добавлено логирование ошибок
6. ✅ Проверка наличия пароля перед сравнением

