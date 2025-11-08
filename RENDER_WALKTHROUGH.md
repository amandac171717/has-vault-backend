# Render.com Deployment - Step by Step Walkthrough

Follow these steps exactly to deploy your HSA Vault app to Render.com.

---

## Prerequisites

- ✅ Render.com account (we'll create this)
- ✅ GitHub account (free) - OR we can use manual deploy
- ✅ Your code ready to deploy

---

## Step 1: Create Render.com Account

1. Go to **https://render.com**
2. Click **"Get Started for Free"** or **"Sign Up"**
3. Sign up with:
   - **GitHub** (recommended - easiest)
   - OR **Email** (if you prefer)

4. Verify your email if needed

---

## Step 2: Create PostgreSQL Database

**This must be done BEFORE deploying the backend!**

1. In Render dashboard, click **"New +"** (top right)
2. Click **"PostgreSQL"**
3. Fill in:
   - **Name:** `hsa-vault-db`
   - **Database:** `hsavault` (or leave default)
   - **User:** (auto-generated, leave default)
   - **Region:** Choose closest to you (e.g., `Oregon (US West)`)
   - **PostgreSQL Version:** `16` (or latest)
   - **Plan:** **Free** (for testing)
   - **Datadog API Key:** (leave empty)

4. Click **"Create Database"**

5. **IMPORTANT:** Wait for database to be created (takes ~2 minutes)

6. Once created, click on your database

7. Find **"Connections"** section

8. Copy the **"Internal Database URL"** - it looks like:
   ```
   postgresql://user:password@dpg-xxxxx-a/hsavault
   ```
   
   **SAVE THIS - you'll need it in Step 4!**

---

## Step 3: Prepare Your Code for Deployment

### Option A: Using GitHub (Recommended)

1. **Create a GitHub repository:**
   ```bash
   cd /Users/amandacorcoran/Downloads/hsa-vault-backend
   git init
   git add .
   git commit -m "Initial commit - HSA Vault backend"
   ```

2. Go to **github.com** and create a new repository
   - Name: `hsa-vault-backend`
   - Make it **Public** (free tier on Render requires public repos)
   - Don't initialize with README

3. **Push your code:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/hsa-vault-backend.git
   git branch -M main
   git push -u origin main
   ```

### Option B: Manual Deploy (No GitHub needed)

- We'll upload files directly to Render
- Skip to Step 4

---

## Step 4: Deploy Backend to Render

1. In Render dashboard, click **"New +"**
2. Click **"Web Service"**

3. **Connect Repository:**
   - **Option A (GitHub):** Click "Connect account" if not connected, then select your `hsa-vault-backend` repo
   - **Option B (Manual):** Click "Public Git repository" and enter your repo URL
   - **Option C (Manual Deploy):** We'll do this differently - see below

4. **Configure Service:**
   - **Name:** `hsa-vault-backend`
   - **Region:** Same as your database
   - **Branch:** `main` (or `master`)
   - **Root Directory:** (leave empty - it's the root)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** **Free**

5. Click **"Create Web Service"**

6. **While it's building, add Environment Variables:**
   - Click **"Environment"** tab
   - Click **"Add Environment Variable"** for each:

   **Variable 1:**
   - Key: `NODE_ENV`
   - Value: `production`
   - Click **"Save Changes"**

   **Variable 2:**
   - Key: `PORT`
   - Value: `10000`
   - Click **"Save Changes"**

   **Variable 3:**
   - Key: `DATABASE_URL`
   - Value: (paste the Internal Database URL from Step 2)
   - Click **"Save Changes"**

   **Variable 4:**
   - Key: `JWT_SECRET`
   - Value: (generate one - see below)
   - Click **"Save Changes"**

   **Variable 5:**
   - Key: `CORS_ORIGIN`
   - Value: `https://hsa-vault-frontend.onrender.com` (we'll update this later)
   - Click **"Save Changes"**

   **Variable 6 (Optional - if using Google Cloud Vision):**
   - Key: `GOOGLE_APPLICATION_CREDENTIALS`
   - Value: (we'll handle this separately - can skip for now)

7. **Generate JWT Secret:**
   - Open a terminal and run:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - Copy the output (long random string)
   - Use it as `JWT_SECRET` value

8. **Wait for deployment to complete** (takes 3-5 minutes)

9. **Check deployment logs:**
   - Click **"Logs"** tab
   - Look for: `🚀 HSA Vault API server running on port 10000`
   - If you see errors, let me know!

10. **Test the backend:**
    - Your backend URL will be: `https://hsa-vault-backend.onrender.com`
    - Visit: `https://hsa-vault-backend.onrender.com/health`
    - Should see: `{"status":"ok",...}`

---

## Step 5: Run Database Migrations

1. In your backend service, click **"Shell"** tab
2. Wait for shell to connect
3. Run:
   ```bash
   npm run migrate
   ```
4. Should see: `✅ Migration completed successfully`

---

## Step 6: Deploy Frontend

1. **Update the HTML file:**
   - Open `/Users/amandacorcoran/Downloads/hsa-vault-final.html`
   - The API URL should auto-detect, but let's make sure
   - Find the `getApiBaseUrl()` function (around line 1486)
   - It should already handle Render.com URLs
   - If not, we can manually set it

2. **In Render dashboard, click "New +"**
3. Click **"Static Site"**

4. **Configure:**
   - **Name:** `hsa-vault-frontend`
   - **Build Command:** (leave empty)
   - **Publish Directory:** (leave empty - root)
   - **Environment:** `Static`

5. **Upload your HTML file:**
   - **Option A:** Connect to GitHub (if you put HTML in a repo)
   - **Option B:** Manual upload
     - Click "Manual Deploy"
     - Upload `hsa-vault-final.html`
     - Rename it to `index.html` (Render serves index.html by default)

6. Click **"Create Static Site"**

7. **Wait for deployment** (takes 1-2 minutes)

8. **Your frontend URL will be:** `https://hsa-vault-frontend.onrender.com`

---

## Step 7: Update CORS in Backend

1. Go back to your backend service
2. Click **"Environment"** tab
3. Find `CORS_ORIGIN`
4. Update value to: `https://hsa-vault-frontend.onrender.com`
5. Click **"Save Changes"**
6. Render will automatically redeploy

---

## Step 8: Test Everything!

1. **Visit your frontend:** `https://hsa-vault-frontend.onrender.com`

2. **Test:**
   - [ ] Page loads
   - [ ] Can register a new account
   - [ ] Can login
   - [ ] Can upload a receipt
   - [ ] Receipt images display
   - [ ] Dashboard shows statistics

3. **If something doesn't work:**
   - Check browser console (F12) for errors
   - Check backend logs in Render dashboard
   - Check frontend logs in Render dashboard

---

## Step 9: Share with Friends!

Send them: **https://hsa-vault-frontend.onrender.com**

They can:
- Create their own account
- Upload receipts
- Test the app

---

## Troubleshooting

### Backend won't start:
- Check logs for errors
- Make sure `DATABASE_URL` is correct
- Make sure `JWT_SECRET` is set
- Make sure migrations ran

### CORS errors:
- Make sure `CORS_ORIGIN` matches your frontend URL exactly
- Check backend logs for CORS warnings

### Database connection errors:
- Make sure database is running (green status)
- Check `DATABASE_URL` is correct
- Make sure you're using "Internal Database URL" not "External"

### Images don't display:
- Check backend logs for file upload errors
- Make sure `/uploads` route is working
- Check image URLs in browser console

---

## Next Steps

Once everything works:
- ✅ Share the URL with friends
- ✅ Monitor usage in Render dashboard
- ✅ Consider upgrading to paid plan if you get lots of users
- ✅ Set up custom domain (optional)

---

## Need Help?

If you get stuck at any step, let me know what error you're seeing!

