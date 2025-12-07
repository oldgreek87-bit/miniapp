# How to Access Admin Panel

## Admin Panel URL

The admin panel is located at:
```
https://miniapp-red-five.vercel.app/admin.html
```

Or with token in URL:
```
https://miniapp-red-five.vercel.app/admin.html?token=YOUR_ADMIN_TOKEN
```

## Getting Your Admin Token

1. **Go to Vercel Dashboard**
2. **Select your project** (miniapp)
3. **Go to Settings** → **Environment Variables**
4. **Find `ADMIN_SECRET_TOKEN`**
5. **Copy the value** (this is your admin token)

## First Time Access

When you first visit the admin panel:
- It will **prompt you** to enter the admin token
- Enter the token from Vercel environment variables
- The token will be **saved in browser** for next time

## Using Admin Panel

1. **View all users** - See subscription status
2. **Search users** - By user ID
3. **Add days** - Extend subscription
4. **Set status** - Activate/deactivate subscriptions

## Security Note

The admin token is stored in:
- **Vercel Environment Variables** (secure)
- **Browser localStorage** (for convenience)

To change the token:
1. Generate new token: `openssl rand -hex 32`
2. Update in Vercel Dashboard → Environment Variables
3. Clear browser localStorage or use incognito mode

## Troubleshooting

**Can't access admin panel?**
- Check that `ADMIN_SECRET_TOKEN` is set in Vercel
- Make sure you're using the correct token
- Try clearing browser cache/localStorage

**Admin panel shows "Unauthorized"?**
- Verify token matches `ADMIN_SECRET_TOKEN` in Vercel
- Check browser console (F12) for errors

