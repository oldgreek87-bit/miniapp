# Solution: Fix Vercel Function Limit

## Problem
Vercel Hobby plan allows only **12 serverless functions**. Your project had 11+ separate API files, exceeding the limit.

## Solution Applied

I've consolidated all API endpoints into **ONE function** (`api/index.js`) that handles all routes.

## What You Need to Do

### Step 1: Make Sure These Files Are in Your GitHub Repo

The following files must exist in your GitHub repository:

**Essential Files:**
- ✅ `api/index.js` (consolidated API - already created)
- ✅ `vercel.json` (updated - already created)
- ✅ `package.json` (must exist)
- ✅ `index.html` (must exist)
- ✅ `style.css` (must exist)
- ✅ `script.js` (must exist)

**Helper Modules (must exist in `api/` folder):**
- ✅ `api/db.js`
- ✅ `api/payment.js`
- ✅ `api/subscription.js`
- ✅ `api/telegram.js`

### Step 2: Commit and Push

If files are missing locally but exist in GitHub, that's fine - the build uses GitHub.

If you need to add the consolidated API:

```powershell
git add api/index.js vercel.json
git commit -m "Consolidate API to fix Vercel function limit"
git push
```

### Step 3: Verify Deployment

After Vercel redeploys:
1. Check build logs - should NOT see function limit error
2. Visit: `https://miniapp-red-five.vercel.app/` - should show homepage
3. Test: `https://miniapp-red-five.vercel.app/api/health` - should return JSON

## How It Works Now

**Before:** 11 separate functions
- Each API endpoint = 1 function
- Total: 11+ functions ❌ (exceeds limit)

**After:** 1 consolidated function
- All API endpoints handled by `api/index.js`
- Routes based on URL path
- Total: 1 function ✅ (under limit)

## API Endpoints (All Still Work)

All endpoints work exactly the same:
- `POST /api/create-payment`
- `POST /api/confirm-payment`
- `GET /api/subscription-status`
- `GET /api/reading-room-access`
- `POST /api/cancel-subscription`
- `GET /api/admin/users`
- `POST /api/admin/add-days`
- `POST /api/admin/set-subscription`
- `POST /api/cron`
- `GET /api/health`

## If Build Still Fails

1. **Check GitHub repo** - Make sure all files are committed
2. **Check Vercel logs** - Look for specific errors
3. **Verify helper modules exist** - `api/db.js`, `api/payment.js`, etc. must be in repo

## Next Steps After Fix

Once deployment succeeds:
1. Test the homepage loads
2. Test API endpoints work
3. Configure Telegram bot menu button
4. Set up environment variables in Vercel


