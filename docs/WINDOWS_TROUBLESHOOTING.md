# WhatsApp Bot Troubleshooting Guide - Windows

## ❌ Error: "Failed to launch the browser process"

This error means WhatsApp Web bot cannot start because of browser issues on Windows.

### 🔍 Diagnosis

1. **Check if Chrome is installed**
   ```cmd
   dir "C:\Program Files\Google\Chrome\Application\chrome.exe"
   ```
   
2. **Check if port 8001 is accessible**
   ```cmd
   netstat -ano | find ":8001"
   ```

3. **Check available memory**
   ```cmd
   wmic OS get TotalVisibleMemorySize,FreePhysicalMemory
   ```

### 🛠️ Solutions (Try in Order)

#### Solution 1: Install/Reinstall Chrome
Chrome is REQUIRED for the WhatsApp bot to work.

```
1. Download Google Chrome from: https://www.google.com/chrome
2. Install using default options
3. Restart the bot
```

#### Solution 2: Clear Sessions & Cache
```cmd
cd wa
del /s /q sessions\
del /s /q .wwebjs_auth\
del /s /q .wwebjs_cache\
npm run dev
```

Or use the cleanup script:
```cmd
cleanup-whatsapp.bat
```

#### Solution 3: Run as Administrator
```
1. Open Command Prompt as Administrator
   - Right-click cmd.exe → Run as Administrator
2. Navigate to wa folder: cd wa
3. Start bot: npm run dev
```

#### Solution 4: Free Up System Resources
```
1. Close all unnecessary programs
2. Close other Chrome/Edge windows
3. Restart your computer
4. Try bot again
```

#### Solution 5: Fix Memory Issues
Windows sometimes limits memory for processes. Reset Windows:

```cmd
REM Clear Windows cache
ipconfig /flushdns

REM Restart npm registry connection
npm cache clean --force

REM Reinstall all dependencies
cd wa
del /s /q node_modules\
npm install
npm run dev
```

#### Solution 6: Use Bundled Chromium
If Chrome is problematic, the bot will try to use bundled Chromium:

```cmd
cd wa
npm install --save puppeteer
npm run dev
```

### 🧪 Test Bot Status

Run the diagnostic script:
```cmd
cd wa
TEST_BOT_STATUS.bat
```

This will check:
- ✅ Chrome/Chromium installation
- ✅ Node.js setup
- ✅ npm packages
- ✅ Port 8001 accessibility
- ✅ Backend API connectivity

### 🔧 Manual Testing

1. **Test backend is running:**
   ```cmd
   curl http://localhost:8001/whatsapp/status
   ```

2. **Test bot logs:**
   ```cmd
   cd wa
   type wa-bot-error.log
   ```

3. **Test with verbose logging:**
   ```cmd
   cd wa
   npm run dev -- --verbose
   ```

### 📝 Logs Location

- **Error log:** `wa/wa-bot-error.log`
- **Main log:** `wa/wa-bot.log`
- **Session data:** `wa/sessions/`

### 🆘 Still Having Issues?

1. Check logs for specific errors:
   ```cmd
   type wa\wa-bot-error.log | findstr "Error"
   ```

2. Verify Node.js version (should be 18+):
   ```cmd
   node --version
   npm --version
   ```

3. Check system requirements:
   - **RAM:** Minimum 2GB free
   - **CPU:** Intel/AMD with virtualization support
   - **OS:** Windows 10/11
   - **Disk:** 1GB free space

4. If all else fails, try fresh install:
   ```cmd
   cd wa
   del /s /q node_modules\
   del /s /q sessions\
   del package-lock.json
   npm install
   npm run dev
   ```

### 🚀 Once Bot Starts

After successful start, you should see:
```
✅ WhatsApp Bot AVEVA PI is READY!
✅ Status: CONNECTED & ACTIVE
📱 Scan this QR code to connect:
[QR CODE DISPLAYED]
```

Then:
1. Open frontend at `http://localhost:3000`
2. Go to WhatsApp connection
3. QR code should appear automatically
4. Scan with your phone to authenticate

---

**Still need help?** Check the full documentation in `/docs/README.md`
