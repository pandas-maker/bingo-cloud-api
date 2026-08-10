Each file exports a function taking the opened better-sqlite3 `db`
handle (and `params` where needed) and returning the exact same
shape your local /api/... route sends back. Paste your existing
query logic in — this is the same kind of db handle you already
use locally, just opened on the synced copy instead of the live file.
