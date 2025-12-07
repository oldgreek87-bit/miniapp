# Fix: Subscription Purchase Not Working

## Issue
Nothing happens when tapping subscription plan buttons.

## Possible Causes

1. **User ID not available** - App not opened from Telegram
2. **API endpoint not working** - Check browser console
3. **CORS issues** - API not responding
4. **Database initialization** - First request might be slow

## What I Fixed

1. ✅ **Added better error handling** - Shows alerts with details
2. ✅ **Added console logging** - Check browser console (F12) for errors
3. ✅ **Added user ID validation** - Checks if user ID exists
4. ✅ **Added loading state** - Disables buttons during request
5. ✅ **Improved error messages** - More descriptive alerts

## Testing Steps

1. **Open browser console** (F12)
2. **Click a subscription plan** (1 Month, 3 Months, or 1 Year)
3. **Check console** for:
   - "Creating payment: {user_id, days, amount}"
   - "Payment response status: 200"
   - Any error messages

## Common Issues

### Issue: "Unable to get user ID"
**Solution**: Make sure you're opening the app from Telegram bot, not directly in browser.

### Issue: "Failed to create payment" or HTTP 500
**Solution**: 
1. Check Vercel logs for errors
2. Verify database is initializing (first request is slow)
3. Check environment variables are set

### Issue: No response at all
**Solution**:
1. Check browser console (F12) for errors
2. Check Network tab - is the request being sent?
3. Verify API endpoint: `https://miniapp-red-five.vercel.app/api/health` works

## Test API Directly

Test if API is working:
```bash
curl https://miniapp-red-five.vercel.app/api/health
```

Should return:
```json
{"status":"ok","timestamp":"...","service":"Bookflix API"}
```

## Mock Payment Mode

Currently, the payment system is in **mock mode** (for testing). When you click a plan:
1. Creates payment session
2. Shows alert with payment details
3. After 2 seconds, automatically confirms payment (for testing)
4. Shows success screen

**In production**, you need to:
1. Replace mock in `api/payment.js` with real T-Bank API calls
2. Set up T-Bank webhook for payment confirmation
3. Remove the auto-confirmation code

## Next Steps

1. **Test the purchase flow** - Click a plan and check console
2. **Check Vercel logs** if errors occur
3. **Verify environment variables** are set correctly
4. **Replace T-Bank mock** with real API when ready

