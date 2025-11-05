# AI Connection: Manual Test Only Implementation

## Date
November 3, 2025

## Overview
Implemented cost control for AI connection by:
1. **Disabling automatic health checks** for `ai-connection` only (every 30s polling removed)
2. **Manual test updates DB status immediately** (no delay)
3. **Frontend shows status freshness** (time since last test)
4. **Other connections (AVEVA PI, databases)** still auto-monitored every 30s

## Problem Statement
- Health check was polling AI endpoint every 30 seconds
- This caused ~2,880 API calls/day to the AI provider
- Each call consumed API credits, even if not being used by users
- Cost was uncontrolled and unnecessary

## Solution
- Only test AI connection when user explicitly clicks "Test Connection"
- Status is immediately updated in database
- Frontend displays when status was last tested (freshness indicator)
- Dashboard shows warning if status is >24h old

---

## Changes Made

### 1. Backend: `avevapi/core/data-source-manager.js`

**Location:** `startHealthCheck()` function, health check loop

**Change:** Skip `ai-connection` from automatic polling

```javascript
// ADDED: Skip ai-connection from health check loop
if (id === 'ai-connection') {
  console.log('⏭️ Skipping ai-connection (manual test only - no auto health checks)');
  continue;
}
```

**Effect:**
- Health check no longer tests AI endpoint every 30s
- Other connections (AVEVA PI, databases) still tested every 30s
- Logs show "Skipping ai-connection" for transparency

---

### 2. Backend: `avevapi/routes/ai.js`

**Location:** `POST /api/ai/test-connection` route (line ~75)

**Change:** Manual test now updates database status immediately

```javascript
// BEFORE:
router.post('/test-connection', async (req, res) => {
  const result = await aiService.testConnection(false);
  // Only returned result, did not update DB
  res.json(result);
});

// AFTER:
router.post('/test-connection', async (req, res) => {
  const result = await aiService.testConnection(false);
  
  // ✅ NEW: Update database with test result
  const connectionStatus = result.success ? 'connected' : 'disconnected';
  db.db.prepare(`
    UPDATE data_sources
    SET connection_status = ?,
        last_tested_at = ?,
        test_status = ?,
        test_error_message = ?,
        updated_at = ?
    WHERE id = ?
  `).run(connectionStatus, now, testStatus, errorMsg, now, 'ai-connection');
  
  // Return result + metadata
  res.json({ 
    ...result, 
    statusUpdated: true,
    lastTestedAt: now,
    connectionStatus: result.success ? 'connected' : 'disconnected'
  });
});
```

**Effect:**
- When user tests connection, status is immediately saved to DB
- Frontend receives `statusUpdated: true` flag
- Dashboard/UI can show real-time status without waiting for health check

---

### 3. Frontend: `frontend/src/app/components/ai/AIConnectionForm.tsx`

**Location:** `handleTestConnection()` function and test result display

**Changes:**
1. Added `getTimeAgo()` helper to format timestamp
2. Updated `handleTestConnection()` to reload config after test (captures `lastTested` from DB)
3. Added status freshness indicator in test result display

```tsx
// ADDED: Helper to show "time ago"
const getTimeAgo = (dateString: string | null): string => {
  if (!dateString) return 'never';
  
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

// MODIFIED: Reload config after test to show latest lastTested
const handleTestConnection = async () => {
  // ... test code ...
  await loadConnectionConfig(); // Now captures DB's lastTested timestamp
};

// ADDED: Display status freshness in test result
{testResult && (
  <div>
    {/* ... test result message ... */}
    {connection.lastTested && (
      <p className="text-xs mt-3 opacity-75">
        Status updated: {getTimeAgo(connection.lastTested)}
      </p>
    )}
  </div>
)}
```

**Effect:**
- User sees "Status updated: just now" or "2h ago"
- Frontend can warn if status is stale (>24h)
- Clear visibility into whether status is fresh or outdated

---

## Data Flow

### Before (with health check polling)
```
User clicks "Test" → test runs → result shown
                            ↓ (NOT saved to DB)
Health check (every 30s) → tests AI → updates DB → status changes

Dashboard sees stale status until health check runs ~90s later
Cost: ~2,880 API calls/day (auto polling)
```

### After (manual test only)
```
User clicks "Test" → test runs → ✅ DB updated immediately → result shown
                             ↓
Dashboard shows current status INSTANTLY
Frontend shows "Status updated: just now"

Cost: 0 API calls/day auto polling (only manual tests)
```

---

## Database Impact

### Table: `data_sources`

Columns updated by manual test:
- `connection_status` → 'connected' or 'disconnected'
- `last_tested_at` → timestamp of test
- `test_status` → 'success' or 'failed'
- `test_error_message` → error details (if failed)
- `updated_at` → current timestamp

**Schema note:** No new columns needed; uses existing fields only.

---

## Frontend Display Changes

### Status Badge (when not testing)
Shows:
- ✅ or ❌ connection status
- "Status updated: {time ago}"
- Warning if >24h old: "⚠️ Status not tested in 24+ hours"

### Test Result Box (after clicking test)
Shows:
- ✅ Success or ❌ Failed message
- "Status updated: just now" (confirmation DB was updated)

---

## Cost Savings

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| **Auto API calls/day** | ~2,880 | 0 | 100% ✅ |
| **Auto API calls/month** | ~86,400 | 0 | 100% ✅ |
| **Manual tests** | +manual | +manual | Same |
| **Cost** | High (waste) | Low (control) | Significant ✅ |

---

## Operational Procedures

### How Admins Interact

1. **Check status:**
   - Go to AI Configuration page
   - See current connection status + when last tested
   - If "⚠️ not tested in 24+ hours", status may be outdated

2. **Test connection:**
   - Click "🧪 Test Connection"
   - Wait 2-5 seconds
   - Result appears + DB is updated

3. **If test fails:**
   - Check error message shown in UI
   - Verify endpoint URL is correct
   - Check AI provider status
   - Once fixed, re-test

### Monitoring Strategy

**Option 1: Manual** (current)
- Admin checks status page regularly
- Tests connection when needed
- Responds to issues manually

**Option 2: Scheduled** (semi-automatic)
- Add cron job to auto-test once/day (minimal cost)
- Operator notified if fails

**Option 3: External** (recommended for production)
- Use external uptime monitoring (UptimeRobot, Datadog)
- Monitors endpoint from outside network
- Low cost, objective measurement

---

## Rollback Plan

If issues arise:
1. Re-enable health check: Comment out the skip logic in `data-source-manager.js`
2. Restart backend service
3. Health check will resume every 30s (WARNING: will consume API credits again)
4. Notify team why reverting

---

## Testing Checklist

- [x] Health check skips `ai-connection` (log shows "Skipping ai-connection")
- [x] Other connections still auto-checked (log shows health check running)
- [x] Manual test updates DB (check `data_sources` table after test)
- [x] Frontend shows status age (displays "updated: Xm ago")
- [x] Failed test shows error message (on both UI and DB)
- [x] Successful test shows success (on both UI and DB)
- [x] Status persists in dashboard (refresh page, status still there)

---

## Documentation Updates

- README.md: Added section on AI connection cost control
- RUNBOOK.md: Added "Manual AI Connection Testing" section
- This file: AI_MANUAL_TEST_IMPLEMENTATION.md

---

## Related Files

- `avevapi/core/data-source-manager.js` - Health check loop
- `avevapi/routes/ai.js` - Manual test endpoint
- `frontend/src/app/components/ai/AIConnectionForm.tsx` - UI display
- `lib/database.js` - Prepared statements for data_sources

---

## Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Auto API calls eliminated | 100% | ✅ |
| Manual test updates DB | Immediate (< 1s) | ✅ |
| Status freshness indicator | Shown in UI | ✅ |
| Other connections unaffected | Still auto-monitored | ✅ |
| Cost reduction | Measurable | ✅ |

---

## Questions & Answers

**Q: What if AI endpoint goes down but no one tests?**
A: Status will show as last known + "⚠️ status may be outdated". Admin will see warning to test or setup external monitoring.

**Q: Can we auto-test periodically to save costs?**
A: Yes! Add cron job to test 1x/day (minimal cost). Or use external uptime monitoring.

**Q: Is this only for AI or all connections?**
A: AI connection ONLY. AVEVA PI, databases, etc. still auto-checked every 30s.

**Q: What if we need emergency auto-monitoring?**
A: Re-enable health check temporarily (see Rollback Plan).

---

End of document.
