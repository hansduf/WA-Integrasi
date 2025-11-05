# COMPOSITE Trigger Fix - Parameter Passing

## Problem
Group triggers (COMPOSITE type) were not passing the `interval` parameter to child QUERY triggers, causing errors like:
```
❌ Interval wajib dipilih!
```

Individual triggers worked fine (e.g., "7tm", "7ex", "7agc"), but when grouped under a COMPOSITE trigger (e.g., "unit7"), they all failed.

## Root Cause
In `avevapi/routes/pi_routes.js`, the COMPOSITE trigger handler (lines 423-458) was:
- Calling child triggers using `callAvevApiUrl()` which only works for legacy API-style triggers
- NOT passing the `interval` parameter from trigger configuration to child triggers
- NOT using the proper `dataSourceManager.executeQuery()` path for QUERY type triggers

## Solution
Updated the COMPOSITE trigger handler to:

1. **Check child trigger type**: Distinguish between QUERY (new system) and API (legacy) triggers
2. **Use proper execution path**: For QUERY triggers, use `dataSourceManager.executeQuery()` instead of direct API calls
3. **Pass interval parameter**: Extract `interval` from trigger configuration and pass it to child triggers:
   ```javascript
   await dataSourceManager.executeQuery(triggerBehavior.dataSourceId, {
     query: triggerBehavior.api_url,
     parameters: [],
     units: triggerBehavior.units,
     // ✅ FIX: Pass interval from trigger configuration
     ...(triggerBehavior.interval && { interval: triggerBehavior.interval })
   });
   ```
4. **Maintain backward compatibility**: Still support legacy API triggers using `callAvevApiUrl()`

## Files Modified
- `avevapi/routes/pi_routes.js` (lines 423-493)

## Testing
Test the fix by calling a COMPOSITE group trigger that contains QUERY child triggers:
1. Individual triggers should work: "7tm", "7ex", "7agc" ✅
2. Group trigger should also work: "unit7" ✅ (after fix)

## Related Code Pattern
This fix follows the same pattern used in **Trigger Groups** (lines 259-390 in the same file), which already properly handles QUERY triggers with interval parameters.

---
**Date**: January 2025
**Issue**: Group triggers not passing interval parameter to child triggers
**Status**: ✅ FIXED
