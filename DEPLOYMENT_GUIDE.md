# Deployment Guide - Share Your HSA Vault App

This guide will help you make your HSA Vault application accessible to friends for testing.

## Quick Options Overview

1. **ngrok (Easiest - 5 minutes)** - Creates a public URL to your local server
2. **Render.com (Free tier - 15 minutes)** - Deploy to cloud (recommended for testing)
3. **Railway.app (Free tier - 15 minutes)** - Another easy cloud option

---

## Option 1: ngrok (Quick Testing - Your Computer Must Stay On)

### Pros:
- ✅ Setup in 2 minutes
- ✅ No code changes needed
- ✅ Free
- ✅ Works immediately

### Cons:
- ❌ Your computer must stay on
- ❌ URL changes each time (unless you pay)
- ❌ Not suitable for long-term use

### Steps:

1. **Install ngrok:**
   ```bash
   brew install ngrok
   ```

2. **Start your backend:**
   ```bash
   cd /Users/amandacorcoran/Downloads/hsa-vault-backend
   PATH="/opt/homebrew/bin:$PATH" npm run dev
   ```

3. **In a new terminal, create tunnel:**
   ```bash
   ngrok http 3000
   ```

4. **You'll get a URL like:** `https://abc123.ngrok.io`

5. **Update frontend API URL:**
   - Open `hsa-vault-final.html`
   - Find: `const API_BASE_URL = 'http://localhost:3000/api';`
   - Change to: `const API_BASE_URL = 'https://abc123.ngrok.io/api';`
   - Save the file

6. **Host the frontend:**
   ```bash
   cd /Users/amandacorcoran/Downloads
   python3 -m http.server 8080
   ```

7. **Share with friends:**
   - Backend: `https://abc123.ngrok.io`
   - Frontend: Your public IP + `:8080` (or use ngrok for frontend too: `ngrok http 8080`)

---

## Option 2: Render.com (Recommended - Free Cloud Hosting)

### Pros:
- ✅ Free tier available
- ✅ Always online (no need to keep computer on)
- ✅ Custom domain support
- ✅ Automatic HTTPS
- ✅ Easy database setup

### Cons:
- ⚠️ Free tier spins down after inactivity (takes ~30 seconds to wake up)

### Steps:

#### Part A: Deploy Backend

1. **Create account:** Go to [render.com](https://render.com) and sign up

2. **Prepare your code:**
   - Make sure your code is in a Git repository (GitHub, GitLab, etc.)
   - Or use Render's direct deploy from local files

3. **Create new Web Service:**
   - Click "New +" > "Web Service"
   - Connect your repository or upload code
   - Settings:
     - **Name:** `hsa-vault-backend`
     - **Environment:** `Node`
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`
     - **Plan:** Free

4. **Add Environment Variables:**
   Click "Environment" tab and add:
   ```
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=your_postgres_connection_string
   JWT_SECRET=your_secret_key_here
   CORS_ORIGIN=https://your-frontend-url.render.app
   GOOGLE_APPLICATION_CREDENTIALS=/opt/render/project/src/google-cloud-credentials.json
   ```

5. **Set up PostgreSQL:**
   - Click "New +" > "PostgreSQL"
   - Create database
   - Copy the "Internal Database URL"
   - Add it as `DATABASE_URL` in your web service environment variables

6. **Deploy!** Click "Create Web Service"

#### Part B: Deploy Frontend

1. **Create Static Site:**
   - Click "New +" > "Static Site"
   - Connect repository or upload `hsa-vault-final.html`

2. **Settings:**
   - **Name:** `hsa-vault-frontend`
   - **Build Command:** (leave empty)
   - **Publish Directory:** (root)

3. **Update API URL in HTML:**
   - Before deploying, update the API URL in your HTML file:
   ```javascript
   const API_BASE_URL = 'https://your-backend-name.onrender.com/api';
   ```

4. **Deploy!**

#### Part C: Update CORS

In your backend code (`server.js`), update CORS to allow your frontend:
```javascript
const allowedOrigins = [
    process.env.CORS_ORIGIN || 'https://your-frontend-name.onrender.com',
    'https://your-frontend-name.onrender.com'
];
```

---

## Option 3: Railway.app (Alternative Cloud Option)

Similar to Render but with different free tier limits.

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" > "Deploy from GitHub repo"
4. Select your repository
5. Add environment variables (same as Render)
6. Railway auto-detects Node.js and deploys

---

## Required Environment Variables

Make sure these are set in your production environment:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-here

# CORS (your frontend URL)
CORS_ORIGIN=https://your-frontend-url.com

# Google Cloud Vision (if using)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# Optional
NODE_ENV=production
PORT=3000
```

---

## Quick Setup Script

I'll create a script to help you set this up. Would you like me to:
1. Create a deployment-ready version of your code?
2. Set up environment variable templates?
3. Create a simple deployment script?

---

## Security Notes for Production

Before sharing with friends, make sure:
- ✅ Strong JWT_SECRET (use a random generator)
- ✅ Database is secure (use connection strings, not plain passwords)
- ✅ CORS is properly configured
- ✅ Rate limiting is enabled (already done)
- ✅ HTTPS is enabled (Render/Railway do this automatically)

---

## Testing Checklist

After deployment:
- [ ] Backend health check works: `https://your-backend-url/health`
- [ ] Can register a new user
- [ ] Can login
- [ ] Can upload a receipt
- [ ] Receipt images display correctly
- [ ] Dashboard loads statistics

---

## Need Help?

If you run into issues:
1. Check the deployment logs in Render/Railway dashboard
2. Check browser console for errors
3. Verify environment variables are set correctly
4. Make sure database migrations ran: `npm run migrate`

