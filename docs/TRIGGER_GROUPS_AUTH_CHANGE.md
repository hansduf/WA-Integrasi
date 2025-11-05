# TRIGGER GROUPS — Auth change proposal

This document records the proposed change to make the `/api/trigger-groups` route use `dualAuthMiddleware` (JWT OR API Key) instead of requiring both JWT and API Key.

Date: 2025-10-14
Author: (generated notes)

## Goal
Make `trigger-groups` endpoints accessible either by a valid JWT session (frontend) or by a valid API key (bot), removing the current requirement that both are present.

## Current situation (before)
- `main.js` mounts the route as:
  ```js
  app.use('/api/trigger-groups', authenticateToken, triggerGroupsRoutes);
  ```
  → global JWT applied when mounting.

- `routes/trigger-groups.js` contains a router-level API key guard:
  ```js
  // Apply API key validation to all routes
  router.use(validateApiKey);
  ```

- Effective behavior: requests must pass both `authenticateToken` (JWT) and `validateApiKey` (API Key) → BOTH required (AND).

- Observed via curl: API-Key only → 401; JWT only → 401; Both → 200.

## Proposed change (target)
1. Update mounting in `avevapi/main.js`:
   ```diff
-  app.use('/api/trigger-groups', authenticateToken, triggerGroupsRoutes);
+  app.use('/api/trigger-groups', dualAuthMiddleware, triggerGroupsRoutes);
   ```

2. Update `avevapi/routes/trigger-groups.js`:
   - Remove `router.use(validateApiKey);` (or comment it out).
   - Remove the local `validateApiKey` helper unless still needed for specific routes.

Result: `dualAuthMiddleware` will allow the route to accept either API Key or JWT.

## Files to be updated
- `avevapi/main.js` — change mount line for `trigger-groups`.
- `avevapi/routes/trigger-groups.js` — remove or adjust `router.use(validateApiKey)` and helper `validateApiKey`.
- Optional: `docs/AUTH_ANALYSIS_COMPREHENSIVE.md` — add note that `/api/trigger-groups` now dual-auth.

## Endpoint inventory (trigger-groups)
Routes inside `routes/trigger-groups.js`:
- GET `/api/trigger-groups`
- POST `/api/trigger-groups`
- GET `/api/trigger-groups/:id`
- PUT `/api/trigger-groups/:id`
- DELETE `/api/trigger-groups/:id`
- POST `/api/trigger-groups/:id/execute`

Verify these for correctness in access semantics.

## Risks and mitigations
- Risk: Bot can perform actions previously limited to JWT-holders. Mitigation: Review handlers — if any operation is admin-level, add `requireAdmin` on that handler.
- Risk: Missing internal checks may allow elevated operations. Mitigation: Add explicit permission checks per handler as needed.
- Risk: Unexpected client regressions. Mitigation: run smoke tests + regression tests.

## Testing plan
1. Smoke tests:
   - Login frontend (cookie) and perform GET/POST/PUT/DELETE flows.
   - Use API Key only to call the same endpoints.
   - Verify both succeed for intended operations.
2. Negative tests:
   - Use API Key to call admin-only endpoints (e.g., `/api/users`) — should fail.
3. Monitoring:
   - Enable logs for `req.authSource` to observe how many requests are API-key vs JWT after rollout.

## Rollback steps
- `git revert <commit>` that introduced the changes, restart service, re-run smoke tests.

## Notes
- This change is targeted (low risk) if the operations in `trigger-groups` are considered functional operations allowed to the bot (create triggers, list triggers, execute groups). If any are admin-sensitive, add guard checks.

---

If you want, I can now prepare the exact patch (diff) for these two files and run the smoke tests in the environment. Let me know whether to proceed (apply patch + test) or to adjust the plan first.
