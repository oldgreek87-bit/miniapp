# Files to Upload to GitHub Repository

## ✅ All Essential Files Created

Upload these files to your GitHub repository:

### Frontend Files
- ✅ `index.html` - Main Mini App interface
- ✅ `style.css` - Styling (black/white minimalistic)
- ✅ `script.js` - Frontend JavaScript logic

### Admin Panel
- ✅ `admin.html` - Admin panel interface
- ✅ `admin.js` - Admin panel JavaScript

### Backend API
- ✅ `api/index.js` - **Consolidated API** (handles all endpoints - only 1 function!)
- ✅ `api/db.js` - Database helper module
- ✅ `api/payment.js` - T-Bank payment integration
- ✅ `api/subscription.js` - Subscription management logic
- ✅ `api/telegram.js` - Telegram Bot API integration

### Configuration
- ✅ `package.json` - Node.js dependencies
- ✅ `vercel.json` - Vercel deployment configuration
- ✅ `.gitignore` - Git ignore rules
- ✅ `README.md` - Project documentation

## File Count

**Total: 12 files** (plus .gitignore)

This structure ensures:
- ✅ Only **1 serverless function** (stays under Vercel's 12 function limit)
- ✅ All static files served correctly
- ✅ All API endpoints work through consolidated handler

## Upload Instructions

1. **Initialize Git** (if not already):
   ```powershell
   git init
   ```

2. **Add all files**:
   ```powershell
   git add .
   ```

3. **Commit**:
   ```powershell
   git commit -m "Initial commit - Bookflix Mini App"
   ```

4. **Push to GitHub**:
   ```powershell
   git remote add origin https://github.com/yourusername/your-repo.git
   git push -u origin main
   ```

5. **Vercel will auto-deploy** from GitHub

## After Upload

1. Set environment variables in Vercel Dashboard
2. Wait for deployment to complete
3. Test: `https://your-app.vercel.app/`
4. Configure Telegram bot menu button

