---
name: mabrumi-supabase
description: Use when working with Supabase queries, migrations, RLS policies, or database operations for the Mabrumi CRM. Covers SQL execution, table management, auth, and permissions.
---

# Mabrumi CRM - Supabase Skill

## Project Info

- Supabase project: `urkmbwatmwmdeilvlhsp.supabase.co`
- Dashboard: https://supabase.com/dashboard/project/urkmbwatmwmdeilvlhsp
- Auth users: `corretor@mabrumi.com` / `123456` and `teste@mabrumi.com`

## Tables

| Table | Purpose |
|-------|---------|
| `leads` | Scraped/imported leads with full data |
| `base_leads` | CSV-imported base leads (lighter) |

## Common SQL Operations

### Enable RLS on a table
```sql
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
```

### Grant permissions
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON <table_name> TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON <table_name> TO service_role;
```

### Create RLS policy (allow all for authenticated)
```sql
CREATE POLICY "allow_all" ON <table_name>
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

### Check table exists
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = '<table_name>'
);
```

## Frontend Client

- File: `src/supabase/client.ts`
- Runtime config: reads from `window.__SUPABASE_CONFIG__` (injected by FastAPI)
- Fallback: reads from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` env vars

## Notes

- SQL migrations must be run manually in Supabase Dashboard > SQL Editor
- `base_leads` needs RLS policies + GRANT permissions to work from frontend
