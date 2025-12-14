# Настройка системы поддержки

## Что реализовано

✅ Кнопка "Поддержка" в Mini App открывает чат с ботом через deeplink  
✅ Автоматическое приветственное сообщение при первом обращении  
✅ Сохранение всех сообщений в базе данных  
✅ Раздел "Чаты" в админке для просмотра диалогов и ответа пользователям  

## Настройка

### 1. Переменные окружения

Убедитесь, что в Vercel Dashboard настроены следующие переменные:

```
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_BOT_USERNAME=your_bot_username (опционально, будет получен автоматически)
ADMIN_SECRET_TOKEN=your_admin_token
```

### 2. Настройка Webhook для Telegram бота

После деплоя приложения на Vercel, настройте webhook для вашего Telegram бота:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.vercel.app/api/support/webhook"
  }'
```

Или используйте браузер:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://your-app.vercel.app/api/support/webhook
```

### 3. Проверка webhook

Проверить статус webhook:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
```

## Использование

### Для пользователей

1. Нажмите кнопку "Поддержка" в нижнем меню Mini App
2. Откроется чат с ботом в Telegram
3. Напишите сообщение - оно автоматически сохранится
4. При первом обращении получите автоматическое приветствие

### Для администраторов

1. Откройте админку: `https://your-app.vercel.app/admin.html?token=YOUR_ADMIN_TOKEN`
2. Перейдите во вкладку "Чаты"
3. Выберите диалог с пользователем
4. Просмотрите историю сообщений
5. Введите ответ и нажмите "Отправить"

## API Endpoints

- `GET /api/support/bot-username` - получить имя бота для deeplink
- `POST /api/support/webhook` - webhook для получения сообщений от Telegram
- `GET /api/admin/conversations` - список диалогов (требует админ токен)
- `GET /api/admin/conversation?user_id=XXX` - история диалога (требует админ токен)
- `POST /api/admin/send-reply` - отправить ответ пользователю (требует админ токен)

## Структура базы данных

Таблица `messages`:
- `id` - уникальный идентификатор
- `user_id` - ID пользователя Telegram
- `message_text` - текст сообщения
- `is_from_user` - 1 если от пользователя, 0 если от администратора
- `created_at` - дата создания

