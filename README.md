# Bookflix - Telegram Mini App

A subscription-based book club Telegram Mini App with payment integration, subscription management, and automatic channel access control.

## Quick Start

1. **Upload all files to your GitHub repository**
2. **Set environment variables in Vercel Dashboard**
3. **Deploy** - Vercel will auto-deploy from GitHub

## Environment Variables

Set these in Vercel Dashboard → Settings → Environment Variables:

```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHANNEL_ID=your_private_channel_id_here
CHANNEL_INVITE_LINK=https://t.me/your_channel_invite_link
TBANK_TERMINAL_KEY=your_tbank_terminal_key
TBANK_SECRET_KEY=your_tbank_secret_key
TBANK_API_URL=https://api.tbank.ru
WEBAPP_URL=https://your-app.vercel.app
ADMIN_SECRET_TOKEN=your_secure_random_token_here
CRON_SECRET=your_cron_secret_token_here
```

## Project Structure

```
miniapp/
├── index.html          # Main Mini App
├── style.css           # Styling
├── script.js           # Frontend logic
├── admin.html          # Admin panel
├── admin.js            # Admin logic
├── package.json        # Dependencies
├── vercel.json         # Vercel config
├── api/
│   ├── index.js        # Consolidated API (all endpoints)
│   ├── db.js           # Database helper
│   ├── payment.js      # Payment integration
│   ├── subscription.js # Subscription logic
│   └── telegram.js     # Telegram Bot API
└── .gitignore
```

## Features

- ✅ Purchase Subscription with T-Bank integration
- ✅ My Subscription status page
- ✅ Reading Room access control
- ✅ Admin panel for user management
- ✅ Automatic channel management via cron

## API Endpoints

All endpoints are handled by `api/index.js`:
- `POST /api/create-payment`
- `POST /api/confirm-payment`
- `GET /api/subscription-status`
- `GET /api/reading-room-access`
- `POST /api/cancel-subscription`
- `GET /api/admin/users`
- `POST /api/admin/add-days`
- `POST /api/admin/set-subscription`
- `POST /api/cron` (daily channel management)

## Deployment

The project is configured for Vercel with:
- **1 serverless function** (consolidated API) - stays under the 12 function limit
- **Static files** served from root
- **Cron job** runs daily at midnight UTC

## Important Notes

1. **Database**: Uses SQLite in `/tmp` on Vercel (temporary). For production, migrate to PostgreSQL.
2. **T-Bank Integration**: Currently mock implementation. Replace with real API calls in `api/payment.js`.
3. **Function Limit**: All API endpoints consolidated into one function to stay under Vercel's 12 function limit.

## Setup Telegram Bot

After deployment, configure bot menu button:
```bash
node setup-bot.js YOUR_BOT_TOKEN https://your-app.vercel.app
```

Or use curl:
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setChatMenuButton" \
  -H "Content-Type: application/json" \
  -d '{"menu_button":{"type":"web_app","text":"Open Bookflix","web_app":{"url":"https://your-app.vercel.app"}}}'
```

