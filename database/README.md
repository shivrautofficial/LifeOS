# LifeOS Database & Cloud Storage

LifeOS employs a hybrid architecture:
1. **Client-Side Storage**: Fast local persistence via IndexedDB (Dexie.js) and LocalStorage for zero-latency, private, offline-first operation.
2. **Supabase Cloud Database**: PostgreSQL database with real-time replication and Row Level Security (RLS) for multi-device sync and backups.

---

## 🗄️ Database Tables (Supabase PostgreSQL)

| Table | Purpose | Primary Key |
|---|---|---|
| `tasks` | Actionable items, priorities, tags, due dates | `id (TEXT)` |
| `habits` | Daily & weekly habits, streaks, and check-ins | `id (TEXT)` |
| `goals` | Long-term objectives, categories, milestones, progress | `id (TEXT)` |
| `notes` | Pinned and tagged markdown notes | `id (TEXT)` |
| `user_backups` | Full JSON state snapshots & workspace profile | `id (TEXT)` |

---

## 🚀 Setting Up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase Dashboard.
3. Paste and run the SQL migration script located at:
   ```text
   database/schemas/supabase_schema.sql
   ```
4. Copy your **Project URL** and **Anon Key** from `Project Settings -> API`.
5. Connect in LifeOS:
   - **In UI**: Go to **Settings -> Supabase Cloud Database**, enter your credentials, and click **Test Connection** & **Save Credentials**.
   - **Or in `.env` / Vercel**: Set `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

---

## 🧪 Local IndexedDB & Unit Tests

The offline database uses Dexie.js with JSON Schema validation docs:

```bash
cd database
npm install
npm test
```
All unit tests run in Node.js via `fake-indexeddb`.
