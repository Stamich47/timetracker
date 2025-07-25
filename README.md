# Time Tracker App

A professional time tracking application similar to Clockify, built for independent contractors and freelancers to efficiently track their work hours.

## Features

- ⏱️ **Timer with Start/Stop/Pause functionality**
- 📂 **Project and Client Management**
- 📝 **Time Entries with descriptions and tags**
- 📊 **Professional dashboard with analytics**
- 📱 **Responsive design for desktop and mobile**
- ☁️ **Real-time data synchronization with Supabase**

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for professional, responsive styling
- **Supabase** for database storage and real-time features
- **Lucide React** for consistent iconography
- **React Hook Form** for efficient form handling
- **Date-fns** for date/time utilities

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Supabase account (optional for local development)

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd time-tracker
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. (Optional) Configure Supabase:

   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key to `.env`
   - Set up the database schema (see Database Schema section)

5. Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Database Schema

If you're using Supabase, create the following tables:

### Users Table

```sql
CREATE TABLE users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### Projects Table

```sql
CREATE TABLE projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  client_name text,
  color text not null default '#3B82F6',
  description text,
  user_id uuid references users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### Time Entries Table

```sql
CREATE TABLE time_entries (
  id uuid default gen_random_uuid() primary key,
  description text,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  duration integer, -- in seconds
  project_id uuid references projects(id) on delete set null,
  user_id uuid references users(id) on delete cascade not null,
  tags text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### Tags Table

```sql
CREATE TABLE tags (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  color text not null default '#6B7280',
  user_id uuid references users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/        # React components
│   ├── Header.tsx    # Navigation header
│   ├── Timer.tsx     # Main timer component
│   ├── ProjectManager.tsx  # Project management
│   └── TimeEntries.tsx     # Time entries list
├── contexts/         # React contexts
│   └── TimerContext.tsx    # Global timer state
├── hooks/           # Custom React hooks
│   └── useTimer.ts  # Timer hook
├── lib/             # External service configurations
│   └── supabase.ts  # Supabase client setup
├── types/           # TypeScript type definitions
│   └── index.ts     # Main type definitions
├── utils/           # Utility functions
│   └── timeUtils.ts # Time formatting utilities
└── App.tsx          # Main app component
```

## Usage

1. **Start Tracking**: Click the "Start" button and describe what you're working on
2. **Manage Projects**: Create projects with client names and color coding
3. **View Entries**: See all your time entries organized by date
4. **Export Data**: (Coming soon) Export your time logs for invoicing

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
#   t i m e t r a c k e r  
 