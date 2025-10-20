<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Time Tracker App - Copilot Instructions

This is a React TypeScript time tracking application similar to Clockify, built with:

- React 18 with TypeScript
- Vite for fast development and building
- Tailwind CSS for professional, responsive styling
- Supabase for database storage and real-time features
- Lucide React for consistent iconography
- React Hook Form for efficient form handling
- Date-fns for date/time utilities

## Key Features to Implement:

- Time tracking with start/stop/pause functionality
- Project and client management
- Time entries with descriptions and tags
- Professional dashboard with analytics
- Responsive design for desktop and mobile
- Real-time data synchronization with Supabase
- **Goals system with real-time progress tracking**

## Recent Major Upgrades (October 2025):

### Goals System Implementation ✅

- **Time Goals**: Track billable hours with daily/weekly/monthly/quarterly/yearly/custom periods
- **Project Goals**: Budget time for specific projects with completion percentages
- **Revenue Goals**: Track income targets with currency support
- **Scope-based Filtering**: Goals can target general, client-specific, or project-specific time tracking
- **Real-time Progress Updates**: Goals show live progress when timer is running for matching projects/clients

### Technical Architecture:

- **GoalsContext**: React context managing goal state with efficient real-time updates
- **goalsApi**: Database operations with real progress calculation from time entries
- **goals.ts**: Core goal progress calculation logic with timer state integration
- **Database Integration**: Supabase queries for accurate progress from stored time entries
- **Performance Optimization**: useMemo for live progress calculation without constant API calls

### Key Challenges Solved:

- **Infinite Loop Prevention**: Fixed useEffect dependencies to prevent constant reloading
- **Real-time Progress**: Implemented timer-aware progress calculation without performance impact
- **Database Accuracy**: Goals now show real progress from time entries, not just stored values
- **Scope Matching**: Goals correctly match running timers based on client/project/general scope

## Current TODOs and Future Improvements:

### High Priority:

- **Goal Analytics Dashboard**: Enhanced reporting with goal achievement trends
- **Goal Notifications**: Alerts when goals are approaching/over target
- **Goal Templates**: Pre-built goal configurations for common scenarios
- **Goal History**: Track goal performance over time with historical data

### Medium Priority:

- **Goal Dependencies**: Link goals together (e.g., complete project goal before revenue goal)
- **Goal Sharing**: Team goal visibility and collaboration features
- **Goal Categories**: Group goals by type, priority, or custom categories
- **Goal Reminders**: Scheduled notifications for goal check-ins

### Low Priority:

- **Goal Gamification**: Achievement badges, streaks, and progress rewards
- **Goal Forecasting**: Predictive analytics for goal completion dates
- **Goal Import/Export**: CSV/Excel integration for goal management
- **Goal API**: REST endpoints for external integrations

### Technical Debt:

- **Goal Testing**: Comprehensive unit and integration tests for goal functionality
- **Goal Performance**: Optimize database queries for large goal sets
- **Goal Error Handling**: Robust error recovery and user feedback
- **Goal Accessibility**: Full ARIA support and keyboard navigation

## Coding Standards:

- Use TypeScript for all components and utilities
- Follow React functional components with hooks
- Use Tailwind CSS classes for styling (no custom CSS unless necessary)
- Implement proper error handling and loading states
- Use consistent naming conventions (camelCase for variables, PascalCase for components)
- Create reusable components where appropriate
- Implement proper accessibility (ARIA labels, keyboard navigation)
- **Prioritize performance**: Avoid unnecessary re-renders and API calls
- **Real-time considerations**: Design for live updates without performance degradation

## Database Schema (Supabase):

- Users table for authentication
- Projects table with client information
- Time entries table linked to projects and users
- Tags table for categorizing time entries
- **Goals table**: Comprehensive goal tracking with scope, period, and progress fields
- **Goal progress tracking**: Real-time calculation from time entries with timer integration

Please prioritize clean, maintainable code with good TypeScript types and professional UI/UX design. Focus on performance and real-time capabilities for the goals system.
