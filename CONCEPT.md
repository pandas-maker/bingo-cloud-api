# BingoOps Cloud Dashboard — System Concept

## What this is
A read-only cloud mirror of a bingo hall's local operations dashboard.
Each hall runs its own local app with its own SQLite database. When the
operator clicks "Sync to Cloud", a copy is uploaded to a shared cloud
service (Render + MongoDB) where a manager can log in and view any
hall's status remotely — even if that hall's local app is currently
offline.

## The core idea: one shared cloud, many isolated databases
Every hall's local db has a unique **Cloud ID** (`agent_id`), generated
once and stored in a `cloud_sync` table inside that hall's own SQLite
file. This ID is the only thing that separates one hall's data from
another's in the cloud — there's one MongoDB, but every stored file is
tagged with the agent_id that uploaded it. Nothing is shared or merged
between halls; it's the same mechanism as a username scoping which
row(s) you have access to in a normal multi-tenant app.

## The full flow, step by step

**1. Local sync (write side)**
- Operator clicks Sync.
- Local app (`sync-cloud.js`) reads its own encrypted SQLite file,
  flushes WAL, reads the raw bytes.
- Reads `agent_id` from its own `cloud_sync` table.
- POSTs the file + `agent_id` to Render's `/api/upload-db`, with a
  shared secret header (`x-sync-secret`) proving it's a legitimate
  local install, not a random request.

**2. Cloud storage (Render + MongoDB)**
- `/api/upload-db` (`routes/upload-db.js`) checks the secret, then
  deletes any previous file for that `agent_id` and stores the new one
  in MongoDB via **GridFS** (SQLite files are too big/binary for a
  normal Mongo document field).
- Every stored file carries `metadata.agent_id` — this is the tag that
  makes lookup-by-hall possible later.
- Render's own filesystem is never used for storage — it's wiped on
  every restart. Mongo is the only persistent layer.

**3. Manager login (read side — this is the part you asked about)**
- Manager opens the Render site, types in a Cloud ID.
- `POST /api/cloud/login` runs `withAgentDb(agentId, ...)`
  (`db-helper.js`), which:
  1. Searches MongoDB's `agent_dbs.files` collection for a document
     where `metadata.agent_id` matches the typed ID. This is the real
     access boundary — it's what makes sure a manager only ever pulls
     *that one hall's* file out of the shared store.
  2. Downloads that one file to a disposable temp path on Render.
  3. Opens it with the same SQLCipher key as the local apps
     (`DB_KEY` env var), and double-checks its internal
     `cloud_sync.agent_id` column matches too, as a consistency check.
  4. Deletes the temp file immediately after.
- If a match exists, login succeeds and the Cloud ID is stored in the
  browser's `sessionStorage` for that visit.

**4. Viewing data**
- Every dashboard call (`/api/cloud/lastrow`, `/fetch_data`,
  `/fetch_back`, `/fetch_content`, `/basedinput`, `/balance`) repeats
  the same `withAgentDb(agentId, ...)` pattern: download that hall's
  file fresh from Mongo, run the query, return JSON, discard the temp
  file. Nothing is cached between requests — every view reflects the
  most recent sync for that specific Cloud ID.
- The actual query logic lives in `api/*.js` (filled in by you) so the
  cloud side runs identical logic to the local endpoints, just against
  the downloaded copy instead of the live file.

## Why this is safe for multiple halls at once
- Isolation happens at lookup time, not at write time — nothing merges.
- `agent_id` is effectively both the "username" and the "database key."
- A manager can only ever see one hall's data per login, and only the
  hall whose Cloud ID they were given.
- The one thing this design *doesn't* protect against: anyone who
  knows a valid Cloud ID can log in as that hall (there's no password
  on top of it). If that matters, add a second secret per agent
  (a PIN alongside the Cloud ID) checked in the `/login` route.

## File map
```
server.js              — Express entrypoint, mounts routes, connects Mongo
mongo.js                — MongoDB connection (singleton)
db-helper.js             — withAgentDb(): download from GridFS → open → query → cleanup
routes/upload-db.js       — receives syncs from local apps, writes to GridFS
routes/cloud-dashboard.js — login + all dashboard read endpoints
api/*.js                  — your real query logic (lastrow, balance, fetch_data, etc.)
public/cloud-login.html   — Cloud ID entry screen
public/cloud-dash.html    — trimmed dashboard (no bonus engine, no verify form)
public/js/cloud-dash.js   — frontend logic, scopes every fetch call by agentId
```
