# 🗄️ Database Setup Instructions

## Apply the Schema to Supabase

1. **Open Supabase Dashboard** → Go to your project
2. **Navigate to SQL Editor** (left sidebar)
3. **Copy the entire contents** of `supabase_schema.sql`
4. **Paste into the SQL Editor**
5. **Click "RUN"** to execute

This will create:

- ✅ `profiles` table (user settings & preferences)
- ✅ `clients` table (client information)
- ✅ `projects` table (project management)
- ✅ `time_entries` table (time tracking data)
- ✅ `tags` table (categorization)
- ✅ `invoices` table (billing)
- ✅ `goals` table (goal tracking)
- ✅ Row Level Security (RLS) policies
- ✅ Indexes for performance
- ✅ Triggers and functions

## Goals Table Setup

After setting up the main schema, run the goals table creation:

1. **Open Supabase Dashboard** → Go to your project
2. **Navigate to SQL Editor** (left sidebar)
3. **Copy the entire contents** of `goals-table.sql`
4. **Paste into the SQL Editor**
5. **Click "RUN"** to execute

This creates the goals table with proper RLS policies and indexes.

## Quick Test

After running the schema, you can test with this query in the SQL Editor:

```sql
-- Test query to verify setup
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see tables like: `clients`, `goals`, `invoices`, `profiles`, `projects`, `tags`, `time_entries`

## Enable Authentication (Optional)

If you want user authentication:

1. Go to **Authentication** → **Settings**
2. Enable **Email** provider
3. Configure any additional providers (Google, GitHub, etc.)
