# AVEVAPI Endpoint Inventory

Generated: 2025-10-24

This document lists the Express endpoints discovered in the `avevapi` backend. Each entry shows HTTP method, route path, file and approximate line number where the route is declared.

Notes:
- Routes are discovered by scanning `app.*` and `router.*` declarations in the `avevapi` folder.
- Middleware shown (if present) is the first middleware argument in the route registration (e.g. `dualAuthMiddleware`, `checkAdminKey`).

---

## Routes registered in `avevapi/main.js`

- GET /whatsapp/qr — `avevapi/main.js` (line ~146)
- GET /whatsapp/status — `avevapi/main.js` (line ~183)
- POST /whatsapp/status/update — `avevapi/main.js` (line ~272)
- GET /api/ai/triggers — `avevapi/main.js` (line ~320)
- POST /whatsapp/connect — `avevapi/main.js` (line ~340)
- POST /whatsapp/disconnect — `avevapi/main.js` (line ~499)
- GET /whatsapp/messages — `avevapi/main.js` (line ~677) (middleware: `dualAuthMiddleware`)
- DELETE /whatsapp/messages — `avevapi/main.js` (line ~774) (middleware: `dualAuthMiddleware`)
- GET /api/wa/spam/config — `avevapi/main.js` (line ~816) (middleware: `dualAuthMiddleware`)
- PUT /api/wa/spam/config — `avevapi/main.js` (line ~866) (middleware: `dualAuthMiddleware`)
- DELETE /whatsapp/contacts/:number — `avevapi/main.js` (line ~967) (middleware: `dualAuthMiddleware`)
- POST /whatsapp/auto-delete — `avevapi/main.js` (line ~1163)
- GET /health — `avevapi/main.js` (line ~1187)

---

## Routes in `avevapi/routes/messages.js`

- GET /api/messages — `avevapi/routes/messages.js` (line ~16)
- POST /api/messages — `avevapi/routes/messages.js` (line ~54)
- POST /api/contacts — `avevapi/routes/messages.js` (line ~124)  (contact upsert)
- GET /api/messages/stats — `avevapi/routes/messages.js` (line ~269)
- GET /api/messages/:id — `avevapi/routes/messages.js` (line ~323)
- POST /api/messages (alternate) — `avevapi/routes/messages.js` (line ~363)
- DELETE /api/messages/:id — `avevapi/routes/messages.js` (line ~424)
- GET /api/contacts — `avevapi/routes/messages.js` (line ~476)
- GET /api/contacts/:id — `avevapi/routes/messages.js` (line ~506)
- POST /api/contacts (duplicate/alternate) — `avevapi/routes/messages.js` (line ~542)
- DELETE /api/contacts/:id — `avevapi/routes/messages.js` (line ~613)
- POST /api/messages/outgoing — `avevapi/routes/messages.js` (line ~653)
- GET /api/messages/outgoing — `avevapi/routes/messages.js` (line ~691)
- PUT /api/messages/outgoing/:id — `avevapi/routes/messages.js` (line ~715)
- DELETE /api/messages/outgoing/:id — `avevapi/routes/messages.js` (line ~757)

---

## Routes in `avevapi/routes/pi_routes.js`

- POST /ask — `avevapi/routes/pi_routes.js` (line ~76)
- POST /triggers — `avevapi/routes/pi_routes.js` (line ~761) (middleware: `dualAuthMiddleware`)
- GET /triggers — `avevapi/routes/pi_routes.js` (line ~836) (middleware: `dualAuthMiddleware`)
- GET /triggers — `avevapi/routes/pi_routes.js` (line ~867) (middleware: `checkAdminKey`)
- GET /triggers/:id — `avevapi/routes/pi_routes.js` (line ~898)
- PUT /triggers/:id — `avevapi/routes/pi_routes.js` (line ~911) (middleware: `dualAuthMiddleware`)
- DELETE /triggers/:id — `avevapi/routes/pi_routes.js` (line ~964) (middleware: `dualAuthMiddleware`)
- DELETE /triggers/:id/permanent — `avevapi/routes/pi_routes.js` (line ~1011) (middleware: `dualAuthMiddleware`)
- POST /triggers/test — `avevapi/routes/pi_routes.js` (line ~1057) (middleware: `checkAdminKey`)

---

## Routes in `avevapi/routes/data-sources.js`

- GET /data-sources — `avevapi/routes/data-sources.js` (line ~397)
- GET /data-sources/:id — `avevapi/routes/data-sources.js` (line ~425)
- POST /data-sources — `avevapi/routes/data-sources.js` (line ~450)
- PUT /data-sources/:id — `avevapi/routes/data-sources.js` (line ~500)
- DELETE /data-sources/:id — `avevapi/routes/data-sources.js` (line ~563)
- DELETE /data-sources/:id/triggers/:triggerName — `avevapi/routes/data-sources.js` (line ~600)
- POST /data-sources/:id/test — `avevapi/routes/data-sources.js` (line ~638)
- GET /plugins — `avevapi/routes/data-sources.js` (line ~696)
- GET /triggers — `avevapi/routes/data-sources.js` (line ~727)
- POST /triggers/execute — `avevapi/routes/data-sources.js` (line ~801)
- POST /data-sources/:id/query — `avevapi/routes/data-sources.js` (line ~832)
- GET /data-sources/:id/tables — `avevapi/routes/data-sources.js` (line ~938)
- GET /data-sources/:id/tags — `avevapi/routes/data-sources.js` (line ~1064)
- GET /data-sources/:id/tables/:table/columns — `avevapi/routes/data-sources.js` (line ~1115)
- POST /data-sources/:id/triggers/:triggerId/execute — `avevapi/routes/data-sources.js` (line ~1232)
- GET /config — `avevapi/routes/data-sources.js` (line ~1280)
- POST /setup/connection — `avevapi/routes/data-sources.js` (line ~1310)
- GET /setup/templates — `avevapi/routes/data-sources.js` (line ~1382)
- POST /test-aveva-url — `avevapi/routes/data-sources.js` (line ~1429)
- GET /dashboard-data — `avevapi/routes/data-sources.js` (line ~1572)
- GET /aveva-pi-presets — `avevapi/routes/data-sources.js` (line ~1686)
- POST /aveva-pi-presets — `avevapi/routes/data-sources.js` (line ~1713)
- PUT /aveva-pi-presets/:id — `avevapi/routes/data-sources.js` (line ~1770)
- DELETE /aveva-pi-presets/:id — `avevapi/routes/data-sources.js` (line ~1837)

---

## Routes in `avevapi/routes/ai.js`

- POST /chat — `avevapi/routes/ai.js` (line ~32)
- POST /test-connection — `avevapi/routes/ai.js` (line ~76)
- GET /connection-status — `avevapi/routes/ai.js` (line ~101)
- GET /connections — `avevapi/routes/ai.js` (line ~144)
- POST /connections — `avevapi/routes/ai.js` (line ~186)
- PUT /connections — `avevapi/routes/ai.js` (line ~240)
- DELETE /connections — `avevapi/routes/ai.js` (line ~279)
- GET /triggers — `avevapi/routes/ai.js` (line ~301)
- POST /triggers — `avevapi/routes/ai.js` (line ~311)
- DELETE /triggers/:id — `avevapi/routes/ai.js` (line ~402)
- PUT /triggers/:id — `avevapi/routes/ai.js` (line ~432)
- PUT /triggers/:id/usage — `avevapi/routes/ai.js` (line ~462)

---

## Routes in `avevapi/routes/triggers.js`

- GET / — `avevapi/routes/triggers.js` (line ~180)
- POST / — `avevapi/routes/triggers.js` (line ~200)
- PUT /:id — `avevapi/routes/triggers.js` (line ~264)
- DELETE /:id — `avevapi/routes/triggers.js` (line ~343)
- GET /:id — `avevapi/routes/triggers.js` (line ~398)
- POST /:name/execute — `avevapi/routes/triggers.js` (line ~426)

---

## Routes in `avevapi/routes/trigger-groups.js`

- GET / — `avevapi/routes/trigger-groups.js` (line ~47)
- POST / — `avevapi/routes/trigger-groups.js` (line ~77)
- GET /:id — `avevapi/routes/trigger-groups.js` (line ~136)
- PUT /:id — `avevapi/routes/trigger-groups.js` (line ~169)
- DELETE /:id — `avevapi/routes/trigger-groups.js` (line ~228)
- POST /:id/execute — `avevapi/routes/trigger-groups.js` (line ~260)

---

## Routes in `avevapi/routes/users.js`

- GET / — `avevapi/routes/users.js` (line ~29)
- GET /stats — `avevapi/routes/users.js` (line ~72)
- GET /:id — `avevapi/routes/users.js` (line ~99)
- POST / — `avevapi/routes/users.js` (line ~141)
- PUT /:id — `avevapi/routes/users.js` (line ~189)
- DELETE /:id — `avevapi/routes/users.js` (line ~256)
- PUT /:id/password — `avevapi/routes/users.js` (line ~291)
- PUT /:id/status — `avevapi/routes/users.js` (line ~366)

---

## Routes in `avevapi/routes/security.js`

- GET /overview — `avevapi/routes/security.js` (line ~28)
- GET /failed-logins — `avevapi/routes/security.js` (line ~55)
- GET /sessions — `avevapi/routes/security.js` (line ~82)
- DELETE /sessions/:sessionId — `avevapi/routes/security.js` (line ~109)
- GET /locked-accounts — `avevapi/routes/security.js` (line ~149)
- POST /unlock/:userId — `avevapi/routes/security.js` (line ~175)
- GET /audit-logs — `avevapi/routes/security.js` (line ~209)
- POST /cleanup-sessions — `avevapi/routes/security.js` (line ~244)

---

## Routes in `avevapi/routes/database.js`

- GET /schemas — `avevapi/routes/database.js` (line ~20)
- POST /test — `avevapi/routes/database.js` (line ~63)
- POST /discover — `avevapi/routes/database.js` (line ~97)
- POST /query — `avevapi/routes/database.js` (line ~131)
- POST /migrate — `avevapi/routes/database.js` (line ~165)
- POST /migrate/single — `avevapi/routes/database.js` (line ~279)
- GET /migration/status — `avevapi/routes/database.js` (line ~378)

---

## Routes in `avevapi/routes/auth.js`

- POST /login — `avevapi/routes/auth.js` (line ~16)
- POST /logout — `avevapi/routes/auth.js` (line ~93)
- GET /me — `avevapi/routes/auth.js` (line ~128)
- GET /check — `avevapi/routes/auth.js` (line ~163)
- GET /validate-session — `avevapi/routes/auth.js` (line ~178)

---

## Notes & next steps

- This scan finds route declarations but does not yet resolve mounted base paths. For example, routers created in `routes/*.js` are usually mounted in `main.js` (e.g. `app.use('/api', routes/messages)`). To produce fully-qualified paths you can cross-reference the router mounting code in `avevapi/main.js`.
- If you want, I can:
  - produce a fully-qualified route list (resolve router base paths),
  - classify endpoints by middleware (auth required / bot-only / admin),
  - export as CSV or generate Swagger/OpenAPI skeleton.
