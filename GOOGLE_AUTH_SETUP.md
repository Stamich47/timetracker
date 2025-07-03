# Google OAuth Setup for Supabase

To enable Google OAuth authentication in your time tracker app, follow these steps:

## 1. Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth 2.0 Client IDs"
5. Configure the OAuth consent screen if prompted
6. Set the application type to "Web application"
7. Add authorized JavaScript origins:
   - `http://localhost:5173` (for development)
   - `https://your-domain.com` (for production)
8. Add authorized redirect URIs:
   - `https://your-supabase-project-id.supabase.co/auth/v1/callback`
   - Replace `your-supabase-project-id` with your actual Supabase project ID
9. Save and copy the Client ID and Client Secret

## 2. Supabase Configuration

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to Authentication > Providers
3. Find Google and toggle it to "Enabled"
4. Enter your Google OAuth Client ID and Client Secret
5. Add your site URL (e.g., `http://localhost:5173` for development)
6. Save the configuration

## 3. Enable Row Level Security (RLS)

The database schema already has RLS enabled, but make sure the policies are in place. Run this SQL in your Supabase SQL Editor if needed:

```sql
-- Enable RLS for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users to access only their own data
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can view own clients" ON public.clients
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own projects" ON public.projects
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own time entries" ON public.time_entries
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tags" ON public.tags
  FOR ALL USING (auth.uid() = user_id);
```

## 4. Test Authentication

1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:5173`
3. You should see the authentication screen
4. Try signing up with email/password or Google OAuth
5. After successful authentication, you should see the main time tracker interface

## 5. Production Deployment

When deploying to production:

1. Update the Google OAuth authorized origins and redirect URIs
2. Update the Supabase site URL to your production domain
3. Make sure your environment variables are properly set

## Troubleshooting

- **OAuth redirect mismatch**: Ensure the redirect URI in Google Console matches exactly
- **Site URL issues**: Make sure the site URL in Supabase matches your application URL
- **CORS errors**: Verify that your domain is added to the allowed origins in both Google Console and Supabase

The app will automatically create user profiles and filter all data to show only the authenticated user's records.
