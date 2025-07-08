# Billing System - Global vs Project-Level Hourly Rates

## Overview

The time tracker app has a two-tiered billing system that allows for flexible rate management across different projects and clients.

## Current Implementation

### 1. Global Default Hourly Rate (Settings)

**Location**: Settings > Billing section  
**Field**: `hourly_rate` in UserSettings  
**Purpose**: Serves as the fallback rate for all billing calculations

**Features**:

- Set once in user settings
- Applies to all projects by default
- Used when no project-specific rate is set
- Can be overridden at the project level

### 2. Project-Level Hourly Rate (Projects)

**Location**: Project Manager > Add/Edit Project form  
**Field**: `hourly_rate` in Project interface  
**Purpose**: Override the global rate for specific projects

**Features**:

- Set individually for each project
- Takes precedence over global default rate
- Allows custom pricing per client/project
- Defaults to $50 when creating new projects

## Rate Precedence Logic

```
1. Project-level hourly rate (if set)
   ↓ (if not set)
2. Global default hourly rate (user settings)
   ↓ (if not set)
3. System default ($0)
```

## Current Data Structure

### UserSettings Interface

```typescript
interface UserSettings {
  hourly_rate?: number; // Global default rate
  currency?: string; // USD, EUR, GBP, CAD
  tax_rate?: number; // Tax percentage (0-100)
  // ... other settings
}
```

### Project Interface

```typescript
interface Project {
  hourly_rate?: number; // Project-specific rate
  billable?: boolean; // Whether project is billable
  // ... other fields
}
```

## Revenue Calculation Status

### ✅ Currently Available

- Global hourly rate setting with currency selection
- Project-level hourly rate override
- Tax rate configuration
- Billable project flag
- **🎉 NEW: Full revenue calculations in Reports**
- **🎉 NEW: Revenue breakdown by project**
- **🎉 NEW: Gross and net revenue display**
- **🎉 NEW: Revenue statistics cards**

### ❌ Not Yet Implemented

- Time entry revenue display in Time Entries view
- Invoice generation features
- Revenue forecasting

## ✅ IMPLEMENTED FEATURES

### Revenue Calculation Engine (`src/utils/revenueUtils.ts`)

- **Rate Precedence Logic**: Project rate → Global rate → $0
- **Tax Calculations**: Configurable tax rate applied to gross revenue
- **Billable vs Non-Billable**: Respects project billable flag
- **Multi-Currency Support**: USD, EUR, GBP, CAD formatting
- **Project Revenue Breakdown**: Detailed revenue analysis per project

### Enhanced Reports Dashboard (`src/components/Reports.tsx`)

1. **New Revenue Stats Cards**:

   - Gross Revenue (emerald theme)
   - Net Revenue (teal theme)
   - Displays in user's preferred currency

2. **Detailed Revenue Breakdown Section**:

   - Revenue by project with client information
   - Hourly rate display per project
   - Billable hours and entry counts
   - Tax calculations per project
   - Total revenue summary

3. **User Settings Integration**:
   - Loads user's hourly rate, currency, and tax settings
   - Applies settings automatically to all calculations

### Revenue Calculation Logic

```typescript
// Rate precedence (implemented)
const hourlyRate = project?.hourly_rate ?? userSettings.hourly_rate ?? 0;

// Tax calculation (implemented)
const grossRevenue = hours * hourlyRate;
const taxAmount = grossRevenue * (taxRate / 100);
const netRevenue = grossRevenue - taxAmount;

// Billable check (implemented)
const isBillable = project?.billable ?? true;
```

## 🎯 HOW TO USE THE NEW REVENUE FEATURES

### Step 1: Set Up Billing Rates

1. Go to **Settings → Billing**
2. Set your **Default Hourly Rate** (e.g., $50)
3. Choose your **Currency** (USD, EUR, GBP, CAD)
4. Set **Tax Rate** if applicable (e.g., 10%)

### Step 2: Configure Project Rates (Optional)

1. Go to **Projects** or **Project Manager**
2. When creating/editing projects:
   - Set **Hourly Rate** to override global rate
   - Ensure **Billable project** is checked for revenue tracking
   - Non-billable projects will show $0 revenue

### Step 3: View Revenue Analytics

1. Go to **Reports**
2. Select your date range
3. View new metrics:
   - **Gross Revenue**: Total earnings before tax
   - **Net Revenue**: Earnings after tax deduction
   - **Revenue Breakdown**: Detailed per-project analysis

### Example Revenue Flow

```
1. Global Rate: $50/hr, Tax: 10%
2. Project A: $75/hr override, 2 hours logged
3. Project B: Uses global $50/hr, 1.5 hours logged
4. Project C: Non-billable, 1 hour logged

Results:
- Project A: $150 gross, $135 net
- Project B: $75 gross, $67.50 net
- Project C: $0 (non-billable)
- Total: $225 gross, $202.50 net, 3.5 billable hours
```

## Recommended Implementation Plan

### ✅ Phase 1: Basic Revenue Calculations (COMPLETED)

1. ✅ Add revenue calculation utilities
2. ✅ Show revenue totals in Reports dashboard
3. ✅ Implement rate precedence logic
4. ✅ Add revenue breakdown by project

### 🔄 Phase 2: Enhanced Revenue Features (NEXT)

1. Display revenue in Time Entries cards
2. Revenue trends over time charts
3. Invoice generation features
4. Revenue export functionality

### 🔮 Phase 3: Advanced Revenue Analytics (FUTURE)

1. Client profitability analysis
2. Rate comparison analytics
3. Revenue forecasting
4. Advanced billing automations

## Example Revenue Calculation Logic

```typescript
function calculateRevenue(
  timeEntry: TimeEntry,
  project: Project,
  userSettings: UserSettings
): number {
  // Don't calculate revenue for non-billable projects
  if (!project.billable) return 0;

  // Determine hourly rate (project rate takes precedence)
  const hourlyRate = project.hourly_rate ?? userSettings.hourly_rate ?? 0;

  // Calculate hours from duration in seconds
  const hours = timeEntry.duration / 3600;

  // Calculate gross revenue
  const grossRevenue = hours * hourlyRate;

  // Apply tax if configured
  const taxRate = userSettings.tax_rate ?? 0;
  const netRevenue = grossRevenue * (1 - taxRate / 100);

  return netRevenue;
}
```

## UI Integration Points

### Time Entries View

- Add revenue column/badge to time entry cards
- Show "Billable" indicator for billable projects
- Display calculated earnings per entry

### Reports Dashboard

- Add revenue statistics cards
- Revenue breakdown charts
- Billable vs non-billable time comparison

### Project Manager

- Show project rate vs global rate clearly
- Indicate which rate will be used for billing
- Add revenue totals per project

## Benefits of This System

1. **Flexibility**: Different rates for different clients/projects
2. **Simplicity**: Global default for easy setup
3. **Transparency**: Clear indication of which rate applies
4. **Scalability**: Easy to add more complex billing features later

## Next Steps

The foundation is in place for a comprehensive billing system. The next logical step would be to implement the revenue calculations in the Reports component and display earnings throughout the application.
