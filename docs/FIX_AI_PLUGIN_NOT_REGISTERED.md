# Fix: AI Connection Shows Disconnected in Table (Plugin Not Registered)

## 📋 Problem
Setelah fix inkonsistensi status, sekarang **kebalikannya**:

```
AI Tab:
Status: Connected ✅        ← Shows connected

Table Koneksi:
1  AI Connection  AI  Disconnected  0   ← Shows disconnected
```

**User Report:**
> "Kenapa di tabel koneksi kok masih disconnect ya? Padahal tab AI sudah connect"

---

## 🔍 Root Cause Analysis

### Database Status Check
```bash
$ node -e "import db from './lib/database.js'; ..."

connection_status: disconnected
test_status: failed
test_error_message: Plugin AI not available  ← KEY ERROR!
config.endpoint: http://127.0.0.1:5000/chat  ← Configured correctly
```

### The Problem
```
Health Check (every 30s)
    ↓
Try to test AI connection
    ↓
pluginLoader.getPlugin('AI')  ← NOT FOUND!
    ↓
Error: "Plugin AI not available"
    ↓
Mark as disconnected ❌
```

### Why Plugin Not Found?

**Plugin Loading Architecture:**

1. **Plugin System (Auto-scan):**
   ```javascript
   // main.js line 35
   await initializePluginSystem();
   
   // Scans: plugins/database/, plugins/aveva-pi/
   // Loads: database, aveva-pi
   // Stores in: pluginLoader.plugins Map
   ```

2. **AI Plugin (Manual init):**
   ```javascript
   // main.js line 78
   await initializeAIPlugin();
   
   // Loads: plugins/ai/
   // Initializes routes and services
   // But NOT registered to pluginLoader! ❌
   ```

**The Issue:**
- AI plugin initialized **separately** from plugin loader
- AI plugin **NOT added** to `pluginLoader.plugins` Map
- Health check calls `pluginLoader.getPlugin('AI')` → **NOT FOUND**
- Result: Health check thinks plugin unavailable → marks as disconnected

---

## ✅ Solution

### Register AI Plugin to Plugin Loader

**File:** `main.js`

**Before (Broken):**
```javascript
async function initializeAIPlugin() {
  try {
    const { AIPlugin } = await import('./plugins/ai/index.js');
    const aiPlugin = new AIPlugin();
    
    await aiPlugin.init(app, {});
    
    console.log('✅ AI Plugin initialized successfully');
    // ❌ Plugin not registered to pluginLoader
  } catch (error) {
    console.error('❌ Failed to initialize AI plugin:', error.message);
  }
}
```

**After (Fixed):**
```javascript
async function initializeAIPlugin() {
  try {
    const { AIPlugin } = await import('./plugins/ai/index.js');
    const aiPlugin = new AIPlugin();
    
    await aiPlugin.init(app, {});
    
    // 🔥 FIX: Register AI plugin to plugin loader for health checks
    // This allows dataSourceManager to find the plugin for testing connections
    pluginLoader.plugins.set('AI', aiPlugin);
    console.log('✅ AI Plugin registered to plugin loader');
    
    console.log('✅ AI Plugin initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize AI plugin:', error.message);
  }
}
```

---

## 📊 Data Flow (Fixed)

### Before Fix:
```
Server Start
    ↓
initializePluginSystem()
    ↓ Loads: database, aveva-pi
    ↓ Stores in: pluginLoader.plugins
    ↓
initializeAIPlugin()
    ↓ Loads: AI plugin
    ↓ Initialize routes
    ❌ NOT registered to pluginLoader
    ↓
Health Check
    ↓
pluginLoader.getPlugin('AI')
    ↓
❌ NOT FOUND!
    ↓
Error: "Plugin AI not available"
    ↓
Status: disconnected
```

### After Fix:
```
Server Start
    ↓
initializePluginSystem()
    ↓ Loads: database, aveva-pi
    ↓ Stores in: pluginLoader.plugins
    ↓
initializeAIPlugin()
    ↓ Loads: AI plugin
    ↓ Initialize routes
    ✅ Register to pluginLoader.plugins.set('AI', aiPlugin)
    ↓
Health Check
    ↓
pluginLoader.getPlugin('AI')
    ↓
✅ FOUND!
    ↓
Test AI connection
    ↓
Status: connected/disconnected (based on actual server status)
```

---

## 🧪 Testing

### Test 1: Check Plugin Registration

**Test Script:** `tests/test-ai-plugin-registration.js`

```bash
cd g:\NExtJS\aveva-pi\avevapi
node tests/test-ai-plugin-registration.js
```

**Expected Output:**
```
🧪 Testing AI Plugin Registration

1️⃣ Checking available plugins...
   Available plugins: database, aveva-pi, AI

2️⃣ Trying to get AI plugin...
   ✅ AI plugin found!
   Plugin name: ai
   Plugin version: 1.0.0

3️⃣ Testing AI plugin testConnection method...
   Test result: { success: true, message: 'Connection successful' }

4️⃣ Checking response handling...
   isHealthy: true
   Message: Connection successful
   ✅ AI connection is healthy

🎉 Test completed!
```

### Test 2: Verify Health Check Works

**Start server and wait 30s:**
```bash
cd g:\NExtJS\aveva-pi\avevapi
node main.js

# Wait 30 seconds for health check cycle
```

**Check database:**
```bash
node -e "import db from './lib/database.js'; const row = db.preparedStatements.getDataSource.get('ai-connection'); console.log('Status:', row.connection_status);"
```

**Expected:**
- If AI server running: `Status: connected`
- If AI server down: `Status: disconnected`
- **NO MORE:** `Plugin AI not available` error

---

## 📁 Files Changed

| File | Change |
|------|--------|
| `main.js` | ✅ Added plugin registration to `initializeAIPlugin()` |
| `tests/test-ai-plugin-registration.js` | 🆕 Test script for verification |
| `docs/FIX_AI_PLUGIN_NOT_REGISTERED.md` | 📄 This documentation |

---

## 🔄 Plugin Registration Flow

### Plugin Loader Map Structure

```javascript
pluginLoader.plugins = Map {
  'database' => DatabasePlugin instance,
  'aveva-pi' => AvevaPIPlugin instance,
  'AI' => AIPlugin instance  ← Added by fix
}
```

### How Health Check Uses It

```javascript
// core/data-source-manager.js (health check)
for (const [id, sourceEntry] of this.sources.entries()) {
  const pluginName = sourceEntry.dataSource.plugin;  // 'AI'
  
  try {
    pluginLoader.getPlugin(pluginName);  // ← Now finds AI plugin!
  } catch (pluginError) {
    // Plugin not found
    sourceEntry.error = `Plugin ${pluginName} not available`;
    await this.updateConnectionStatusInDB(id, 'disconnected', sourceEntry.error);
  }
}
```

---

## ✅ Verification Checklist

- [x] AI plugin registered to `pluginLoader.plugins` Map
- [x] Health check can find AI plugin
- [x] No more "Plugin AI not available" errors
- [x] Status updates correctly based on actual server status
- [x] Test script created for verification
- [x] Documentation created

---

## 🚀 Deployment

### Auto-applies on server restart
```bash
cd g:\NExtJS\aveva-pi\avevapi
node main.js
```

**Console output should show:**
```
🤖 Initializing AI Plugin...
✅ AI Plugin registered to plugin loader  ← NEW LINE!
✅ AI Plugin initialized successfully
```

**After 30 seconds (health check):**
```
💓 Health check service started (30s interval, silent mode, DB sync enabled)
# No more "Plugin AI not available" errors
```

---

## 📝 Summary

### What Was Fixed
- ✅ AI plugin now **registered to plugin loader**
- ✅ Health check can **find and test** AI plugin
- ✅ Status updates **correctly** based on server availability
- ✅ No more **"Plugin not available"** false errors

### Root Cause
AI plugin was initialized separately and not added to `pluginLoader.plugins` Map, causing health check to think it doesn't exist.

### Solution
Added single line to register AI plugin after initialization:
```javascript
pluginLoader.plugins.set('AI', aiPlugin);
```

### Impact
- **Health Check:** Can now properly test AI connections
- **Status Accuracy:** Shows correct connected/disconnected status
- **Table & AI Tab:** Both show consistent status
- **Error Messages:** Relevant errors (server down vs plugin missing)

---

**Fix Date:** October 6, 2025  
**Issue:** Health check reports "Plugin AI not available"  
**Status:** ✅ RESOLVED
