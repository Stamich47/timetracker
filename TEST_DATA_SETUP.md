# Test Data Setup Instructions

Due to the foreign key constraint error, we need to properly set up test data. Here's how to fix the issue:

## Problem

The error `23503: insert or update on table "profiles" violates foreign key constraint "profiles_id_fkey"` occurs because:

- The `profiles` table has a foreign key to `auth.users(id)`
- Our fallback logic tries to use profiles that don't have corresponding users in the auth system
- This violates the foreign key constraint

## Solution Options

### Option 1: Run the Test Data Setup Script

1. Open your Supabase SQL Editor
2. Run the `test_data_setup.sql` script
3. This will temporarily remove the foreign key constraint and create proper test data

### Option 2: Simpler Fix - Use a Different Approach

Instead of relying on profiles, we can modify our APIs to use a hardcoded test user ID when no authentication is present.

### Option 3: Completely Disable Foreign Key Constraints for Testing

```sql
-- Temporarily disable foreign key constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
```

## Recommended Approach

I'll implement Option 2 by modifying our APIs to use a hardcoded test user ID instead of trying to fetch from profiles table.
