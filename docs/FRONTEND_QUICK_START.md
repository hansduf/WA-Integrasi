# Frontend Quick Start Guide

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

Create `.env.local` file:
```bash
# Copy from example
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 3. Start Backend Server

**Terminal 1 - Backend:**
```bash
cd avevapi
npm start
```

Backend should be running on `http://localhost:3000`

### 4. Start Frontend Server

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Frontend should be running on `http://localhost:3001`

---

## 🧪 Testing Flow

### Step 1: Login

1. Open browser: **http://localhost:3001**
2. You should see the **Login Page**
3. Enter credentials:
   - Username: `admin`
   - Password: `Admin123!`
   - Check "Remember me" (optional)
4. Click **Sign In**

**Expected Result:**
- Redirected to `/dashboard`
- Welcome message with your name
- Three feature cards displayed
- Account info card shows user details

---

### Step 2: Dashboard

**What to Check:**
- [ ] Welcome card displays "Welcome, Administrator"
- [ ] Three feature cards are visible:
  - User Management (blue icon)
  - Security Monitoring (green icon)
  - Audit Logs (purple icon)
- [ ] Account info card shows:
  - Username: admin
  - Full Name: Administrator
  - Last Login: (current time)
  - Account Status: Active
  - Session Expires: (1 hour from now)
- [ ] Logout button in top-right (red)

---

### Step 3: User Management

1. Click **"User Management"** card on dashboard
2. You should see `/dashboard/users` page

**Test Create User:**
1. Click **"Create New User"** button
2. Fill form:
   - Username: `testuser`
   - Password: `Test123!`
   - Full Name: `Test User`
   - Email: `test@example.com` (optional)
3. Click **"Create User"**

**Expected Result:**
- Modal closes
- New user appears in table
- Status shows "Active" (green badge)

**Test Disable User:**
1. Find `testuser` in table
2. Click **"Disable"** button
3. Status changes to "Inactive" (red badge)

**Test Enable User:**
1. Click **"Enable"** button on `testuser`
2. Status changes back to "Active"

**Test Delete User:**
1. Click **"Delete"** button on `testuser`
2. Confirm deletion
3. User status changes to "Inactive" (soft delete)

**Test Self-Modification Prevention:**
1. Try to disable/delete your own account (`admin`)
2. Buttons should be **disabled**

---

### Step 4: Security Monitoring

1. Click back button or navigate to `/dashboard`
2. Click **"Security Monitoring"** card

**Overview Tab:**
- [ ] Security Score displays (0-100)
- [ ] Threat Level badge shows (LOW/MEDIUM/HIGH)
- [ ] Four stat cards show:
  - Failed Logins
  - Active Sessions
  - Locked Accounts
  - Suspicious IPs
- [ ] Activity stats (Last 24 Hours) show:
  - Total Events
  - Successful Logins
  - Failed Logins
  - User Changes

**Active Sessions Tab:**
1. Click **"Active Sessions"** tab
2. You should see at least one session (your current session)
3. Table shows:
   - User: Administrator (@admin)
   - IP Address: ::1 or 127.0.0.1
   - Created: (recent timestamp)
   - Expires: (1 hour from created)

**Test Terminate Session:**
- Don't terminate your own session (you'll be logged out!)
- If you have other sessions, click **"Terminate"** and confirm

**Locked Accounts Tab:**
1. Click **"Locked Accounts"** tab
2. Initially should show "No locked accounts"

**Test Account Lock (create locked account):**
1. Open new incognito window
2. Go to login page
3. Try to login with wrong password 5 times:
   - Username: `admin`
   - Password: `wrongpassword`
4. After 5 attempts, account gets locked
5. Go back to Security Monitoring → Locked Accounts tab
6. Click **"Unlock"** button to unlock

---

### Step 5: Audit Logs

1. Navigate to `/dashboard`
2. Click **"Audit Logs"** card

**Test Filters:**

**Filter by Action:**
1. Click "Action Type" dropdown
2. Select `LOGIN_SUCCESS`
3. Click **"Apply"**
4. Only successful login events are shown

**Filter by Date Range:**
1. Click "Start Date" picker
2. Select today's date, 00:00
3. Click "End Date" picker
4. Select today's date, 23:59
5. Click **"Apply"**
6. Only today's events are shown

**Clear Filters:**
1. Click **"Clear"** button
2. All logs are shown again

**Test Pagination:**
1. If you have more than 50 logs:
2. Click **"Next"** button
3. Page 2 of logs loads
4. Click **"Previous"** button
5. Returns to page 1

**Action Color Codes:**
- Green: LOGIN_SUCCESS, USER_CREATED, ACCOUNT_UNLOCKED
- Red: LOGIN_FAILED, USER_DELETED, ACCOUNT_LOCKED
- Yellow: USER_DISABLED, SESSION_EXPIRED
- Purple: SUSPICIOUS_ACTIVITY
- Blue: Others

---

### Step 6: Logout

1. Click **"Logout"** button (red, top-right on any page)
2. Redirected to `/login` page
3. Try to access `/dashboard` directly
4. Should be redirected back to `/login`

**Expected Result:**
- Logged out successfully
- Session terminated
- Protected routes redirect to login

---

## 🧪 Advanced Testing

### Test Account Locking

**Terminal 3 - Run test script:**
```bash
cd avevapi
node test-auth-flow.js
```

This will:
- Login successfully
- Try wrong password
- Check failed attempts in response

**Manual Lock Test:**
1. Open incognito window
2. Go to login page
3. Enter:
   - Username: `testuser` (create first if not exists)
   - Password: `wrongpassword`
4. Submit 5 times
5. 6th attempt shows: "Account is temporarily locked"
6. Check Security Monitoring → Locked Accounts
7. Unlock the account from UI

---

### Test Session Expiry

**Automatic Test (wait 1 hour):**
1. Login normally
2. Leave browser open for 1 hour
3. Try to navigate to any protected route
4. Should be redirected to login (session expired)

**Manual Test (modify backend config):**
1. Edit `avevapi/config/index.js`
2. Change `session.timeoutMinutes` from 60 to 1
3. Restart backend
4. Login
5. Wait 1 minute
6. Try to navigate
7. Should be logged out

---

### Test Rate Limiting

**Login Rate Limit (10 attempts per hour per IP):**
1. Open incognito window
2. Try to login with wrong password
3. After 10 attempts, you'll see:
   - "Too many login attempts. Please try again later"
4. Wait 1 hour or restart backend to reset

**API Rate Limit (100 requests per 15 minutes):**
- Hard to test manually
- Backend logs will show rate limit if exceeded

---

### Test Multiple Users

1. Login as `admin`
2. Create 3 new users:
   - `user1` / `User123!`
   - `user2` / `User123!`
   - `user3` / `User123!`
3. Logout
4. Login as `user1`
5. Check dashboard (user can see own info)
6. Try to access `/dashboard/users`
7. Should be redirected (not admin)
8. Logout
9. Login as `admin` again
10. Can access all pages

---

## 🐛 Troubleshooting

### Problem: "Network error occurred"

**Solution:**
- Check backend is running on `http://localhost:3000`
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Check browser console for CORS errors

---

### Problem: "Failed to fetch"

**Solution:**
- Backend may not be running
- Check backend terminal for errors
- Restart backend:
  ```bash
  cd avevapi
  npm start
  ```

---

### Problem: Redirected to login immediately after login

**Solution:**
- Backend authentication may have failed
- Check backend logs for errors
- Check cookies in browser DevTools:
  - Press F12 → Application → Cookies
  - Should see `accessToken` cookie
- Clear cookies and try again

---

### Problem: "Cannot read property 'user' of null"

**Solution:**
- AuthContext not properly initialized
- Refresh the page
- Check console for errors
- Verify `AuthProvider` wraps app in `layout.tsx`

---

### Problem: Protected routes not redirecting

**Solution:**
- Check `ProtectedRoute` component is used
- Check `useAuth()` hook is working
- Verify `isAuthenticated` is true/false correctly
- Check browser console for errors

---

## 📊 Test Results Checklist

After completing all tests, verify:

**Authentication:**
- [ ] Login with correct credentials works
- [ ] Login with wrong credentials fails with error
- [ ] Remember me checkbox works
- [ ] Logout works from all pages
- [ ] Auto-redirect to login when not authenticated

**Dashboard:**
- [ ] Welcome message shows correct name
- [ ] Feature cards are clickable
- [ ] Account info displays correctly
- [ ] Session expiry time is shown

**User Management:**
- [ ] User list loads
- [ ] Create new user works
- [ ] Duplicate username shows error
- [ ] Weak password shows error
- [ ] Enable/disable user works
- [ ] Delete user works
- [ ] Self-modification is prevented

**Security Monitoring:**
- [ ] Security score displays
- [ ] Threat level shows correct color
- [ ] Active sessions tab loads
- [ ] Terminate session works
- [ ] Locked accounts tab loads
- [ ] Unlock account works

**Audit Logs:**
- [ ] Logs load with pagination
- [ ] Action filter works
- [ ] Date range filter works
- [ ] Clear filters works
- [ ] Action badges have correct colors
- [ ] Pagination works (next/previous)

**Security Features:**
- [ ] Account locks after 5 failed attempts
- [ ] Locked account shows error on login
- [ ] Admin can unlock accounts
- [ ] Session expires after 1 hour
- [ ] Rate limiting prevents brute force

---

## 📸 Screenshots

**Recommended screenshots to take:**

1. Login page
2. Dashboard with feature cards
3. User Management page with users
4. Create User modal
5. Security Monitoring - Overview tab
6. Security Monitoring - Active Sessions tab
7. Security Monitoring - Locked Accounts tab
8. Audit Logs page with filters
9. Audit Logs with filtered results

---

## 🔍 Inspection Tools

### Browser DevTools

**Check Cookies:**
1. Press F12
2. Go to "Application" tab
3. Expand "Cookies" → `http://localhost:3001`
4. Should see:
   - `accessToken` (httpOnly, 1 hour expiry)
   - `refreshToken` (httpOnly, 7 days expiry if "Remember me")

**Check Network Requests:**
1. Press F12
2. Go to "Network" tab
3. Perform any action (login, create user, etc.)
4. Click on API request
5. Check:
   - Request headers (should include Cookie)
   - Response status (200, 201, 400, 401, 403, etc.)
   - Response body (JSON with success/error)

**Check Console Logs:**
1. Press F12
2. Go to "Console" tab
3. Should see no errors (red messages)
4. May see API logs if you added console.log

---

## 🎯 Success Criteria

Frontend is successfully implemented if:

✅ All 8 pages load without errors  
✅ Authentication flow works end-to-end  
✅ All CRUD operations work (create, read, update, delete users)  
✅ Security monitoring displays real-time data  
✅ Audit logs are filterable and paginated  
✅ Protected routes redirect correctly  
✅ Error messages are user-friendly  
✅ Loading states show during API calls  
✅ UI is responsive on desktop and mobile  
✅ No console errors in browser DevTools  

---

## 📞 Need Help?

**Common Issues:**
- Backend not starting: Check `avevapi/package.json` has all dependencies
- Frontend not starting: Run `npm install` in frontend directory
- API errors: Check backend logs in terminal
- CORS errors: Backend and frontend must be on different ports

**Debug Steps:**
1. Check backend is running: http://localhost:3000
2. Check frontend is running: http://localhost:3001
3. Check browser console for errors
4. Check backend terminal for logs
5. Check network tab in DevTools

---

## 🎉 Next Steps

After frontend testing is complete:

1. **Phase 5 Day 8:** End-to-end testing and security audit
2. Performance testing (load testing, response times)
3. Documentation finalization
4. Production deployment preparation

**Ready to proceed to Phase 5!** 🚀
