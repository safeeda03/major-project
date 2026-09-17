# PoshanAI Testing Setup Guide

## ⚠️ Important: MongoDB Required

The backend server requires MongoDB to be running. The system tried to connect but MongoDB is not currently installed or running on your system.

## 🎯 Current Status

✅ **Completed:**
- Backend dependencies installed successfully
- Frontend dependencies installed successfully  
- Test user creation script created
- Backend server configured

❌ **Required:**
- MongoDB installation and setup

## 🚀 Quick Setup Options

### Option 1: Install MongoDB (Recommended)

#### Windows Installation:
1. Download MongoDB Community Server: https://www.mongodb.com/try/download/community
2. Run the installer with default settings
3. Install MongoDB Compass (GUI tool) - included in installer
4. Start MongoDB service:
   - Windows Search: "Services"
   - Find "MongoDB" service
   - Start the service

#### Verify Installation:
```bash
mongod --version
```

### Option 2: Use MongoDB Atlas (Cloud - Free)

1. Go to: https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create free cluster (takes 2-5 minutes)
4. Get connection string
5. Update `backend/.env`:
   ```
   MONGODB_URI=mongodb+srv://your-connection-string
   ```

### Option 3: Use Docker (If you have Docker)

```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

## 📋 Once MongoDB is Ready

### Step 1: Start MongoDB
```bash
# If installed locally
mongod

# Or start as Windows service
# Services → MongoDB → Start
```

### Step 2: Create Test Users
```bash
cd backend
node test-setup.js
```

This will create test users with these credentials:
- **Worker:** 9876543210 / password123
- **Supervisor:** 9876543211 / password123  
- **Parent:** 9876543212 / password123
- **Admin:** 9876543213 / password123

### Step 3: Start Backend Server
```bash
cd backend
node server.js
```

Expected output:
```
PoshanAI Backend Server running on port 5000
Environment: development
MongoDB connected successfully
```

### Step 4: Start Frontend Server
```bash
cd frontend
npm run dev
```

Expected output:
```
VITE v4.x.x ready in xxx ms
➜ Local: http://localhost:5173/
```

### Step 5: Test the Application
1. Open browser: http://localhost:5173
2. Login with test credentials
3. Explore different dashboards based on role

## Enable AI Chat, OCR, and Voice

OCR works with JPG, PNG, and WebP images up to 10 MB. The Android app requests camera access only when the user chooses to scan, and microphone access only when they choose voice input.

To enable real AI answers, copy `backend/.env.example` to `backend/.env`, add your server-side `OPENAI_API_KEY`, and restart the backend. Do not put that key in the mobile or frontend app. Set `OPENAI_ENABLE_WEB_SEARCH=true` only if you want the provider to search for current information.

The Android debug build requires JDK 17. In PowerShell, set `JAVA_HOME` to your JDK 17 directory before running `mobile/android/gradlew.bat :app:assembleDebug`.

## 🔧 Alternative: Test Without MongoDB

If you want to test the UI without MongoDB, you can:

### Start Frontend Only:
```bash
cd frontend
npm run dev
```

This will show the React UI but API calls will fail until MongoDB is running.

### Test API Structure:
You can examine the API structure and code without running the server.

## 📞 What to Do Next

1. **Install MongoDB** using Option 1, 2, or 3 above
2. **Run the test setup script** once MongoDB is running
3. **Start both servers** and test the full system
4. **Let me know** if you need help with MongoDB installation

## 🎯 Testing Checklist

- [ ] MongoDB installed and running
- [ ] Test users created successfully
- [ ] Backend server running on port 5000
- [ ] Frontend server running on port 5173
- [ ] Can access http://localhost:5173
- [ ] Can login with test credentials
- [ ] Can see appropriate dashboard for role
- [ ] Can navigate between pages

## 💡 Quick MongoDB Setup Commands

After installing MongoDB, these commands will help:

```bash
# Start MongoDB (if not running as service)
mongod

# In another terminal, connect to MongoDB shell
mongo

# In MongoDB shell, verify database
use poshanai
show collections
```

Would you like me to help you with any specific part of the MongoDB setup?
