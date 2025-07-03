# Supabase Setup Instructions for TimeTracker Pro

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Name**: TimeTracker Pro
   - **Database Password**: Generate a secure password
   - **Region**: Choose closest to your users
5. Click "Create new project"

## 2. Set Up Database Schema

1. Wait for your project to be ready
2. Go to the **SQL Editor** in your Supabase dashboard
3. Copy and paste the entire contents of `supabase_schema.sql` into the editor
4. Click **RUN** to execute the schema

This will create:

- ✅ All necessary tables with proper relationships
- ✅ Row Level Security (RLS) policies
- ✅ Indexes for performance
- ✅ Triggers for automatic timestamps
- ✅ Views for reporting
- ✅ Functions for business logic

## 3. Configure Environment Variables

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy your project URL and anon key
3. Update your `.env` file:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## 4. Enable Authentication (Optional)

If you want to add user authentication:

1. Go to **Authentication** → **Settings**
2. Configure your preferred providers:
   - **Email**: For email/password signup
   - **Google**: For Google OAuth
   - **GitHub**: For GitHub OAuth
3. Set up email templates in **Authentication** → **Templates**

## 5. Database Tables Overview

### Core Tables:

- **`profiles`** - User profiles and preferences
- **`clients`** - Client information
- **`projects`** - Project details with client relationships
- **`time_entries`** - Individual time tracking entries
- **`tags`** - Tags for categorizing time entries

### Relationship Tables:

- **`time_entry_tags`** - Many-to-many relationship between entries and tags

### Future Tables (Optional):

- **`invoices`** - For billing functionality
- **`invoice_line_items`** - Line items for invoices

## 6. Key Features Implemented

### 🔒 Security

- Row Level Security ensures users only see their own data
- Automatic user profile creation on signup
- Secure API endpoints

### ⚡ Performance

- Optimized indexes on frequently queried columns
- Efficient joins for related data
- Views for complex reporting queries

### 🔄 Automation

- Automatic timestamp updates
- Duration calculation for time entries
- Single running timer enforcement
- New user profile creation

### 📊 Reporting

- Pre-built views for project statistics
- Daily time summaries
- Flexible querying with helper functions

## 7. Using the Database

### With Helper Functions:

```typescript
import { dbHelpers } from "./src/lib/supabase";

// Get current user profile
const profile = await dbHelpers.getCurrentProfile();

// Start a timer
await dbHelpers.startTimer(userId, projectId, "Working on homepage");

// Get running timer
const runningTimer = await dbHelpers.getRunningTimer(userId);

// Stop timer
await dbHelpers.stopTimer(userId);

// Get time statistics
const stats = await dbHelpers.getTimeStats(userId, "2025-07-01", "2025-07-31");
```

### Direct Supabase Queries:

```typescript
import { supabase } from "./src/lib/supabase";

// Create a new project
const { data, error } = await supabase.from("projects").insert({
  user_id: userId,
  name: "New Project",
  color: "#3B82F6",
});
```

## 8. Testing the Setup

1. Start your development server: `npm run dev`
2. Open the browser console
3. Test database operations:

```javascript
// In browser console
import { dbHelpers } from "./src/lib/supabase";

// Test connection (should return your user or null)
await dbHelpers.getCurrentProfile();
```

## 9. Migration from Mock Data

To migrate from the current mock data to Supabase:

1. Create a data migration script
2. Export existing time entries and projects
3. Import them using the Supabase client
4. Update components to use Supabase instead of useState

## 10. Production Deployment

Before deploying to production:

1. **Environment Variables**: Set up production environment variables
2. **RLS Policies**: Review and test all Row Level Security policies
3. **Backup Strategy**: Set up automated database backups
4. **Monitoring**: Enable Supabase monitoring and alerts
5. **Performance**: Review query performance and add indexes if needed

## 11. Troubleshooting

### Common Issues:

**Authentication errors**:

- Check environment variables are correct
- Verify RLS policies allow the operation

**Permission denied**:

- Ensure user is authenticated
- Check RLS policies match your user ID

**Schema errors**:

- Verify the SQL schema was executed completely
- Check for any failed migrations in Supabase logs

### Useful SQL Queries:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- View RLS policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Check user profiles
SELECT * FROM public.profiles;
```

## 12. Next Steps

After setting up the database:

1. **Connect Components**: Update React components to use Supabase
2. **Real-time Updates**: Add Supabase realtime subscriptions
3. **Authentication UI**: Create login/signup forms
4. **Data Sync**: Implement offline-first data synchronization
5. **Billing Features**: Add invoice generation and payment tracking
6. **Advanced Reports**: Create detailed analytics and charts
7. **Team Features**: Add collaboration and team management
8. **API Integration**: Connect with external tools (Slack, etc.)

Your TimeTracker Pro is now ready for production-grade time tracking with a robust Supabase backend!
