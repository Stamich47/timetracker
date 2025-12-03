# Revenue Goal Enhancement Plan

## Current State 📊

### Revenue Source

- **Only Source**: Tracked hourly rates on time entries (`hourly_rate` field)
- **Calculation**: `hours_tracked × hourly_rate` from billable time entries
- **Storage**:
  - `projects` table has `hourly_rate` field
  - `time_entries` table has `hourly_rate` and `billable` fields

### Current Revenue Goal Calculation (from goalsApi.ts)

```typescript
// Queries billable time entries with hourly rates
const currentAmount = (timeEntries || []).reduce((sum, entry) => {
  if (entry.duration && entry.hourly_rate) {
    const hours = entry.duration / 3600; // Convert to hours
    return sum + hours * entry.hourly_rate;
  }
  return sum;
}, 0);
```

**Current Limitation**: Revenue goal creation form is "bare bones" - only allows:

- Period selection (weekly, monthly, quarterly, yearly, custom)
- Target amount entry
- No scope/filtering capability

---

## Proposed Enhancements 🚀

### 1. **Revenue Goal Scope** (Similar to Time Goals)

Allow users to target revenue from:

- **General**: All billable time entries (current behavior)
- **Client-specific**: All billable hours from projects under a specific client
- **Project-specific**: All billable hours from a specific project

### 2. **Revenue Goal Creation Form Fields**

#### Step 1 - Core Details

- [x] Goal Name
- [x] Period (weekly, monthly, quarterly, yearly, custom)
- [ ] **NEW: Revenue Scope** (general, client, project)
- [ ] **NEW: Conditional Client/Project Selector**
- [ ] **NEW: Target Amount ($)**
- [x] Custom date range (if period is custom)

#### Step 2 - Settings & Review

- [x] Priority (low, medium, high)
- [ ] **NEW: Revenue Breakdown** (show which projects/clients contribute)
- [ ] **NEW: Estimated Current Revenue** (based on current tracking)
- [ ] **NEW: Projected Revenue** (based on current pace)
- [ ] **NEW: Days Remaining**

### 3. **Revenue Calculation Enhancements**

Update `goalsApi.calculateRevenueGoalProgress()` to:

#### Add Scope Filtering (like time goals)

```typescript
if (goal.scope === "project" && goal.scopeId) {
  // Filter by specific project
  query = query.eq("project_id", goal.scopeId);
} else if (goal.scope === "client" && goal.scopeId) {
  // Filter by projects belonging to specific client
  const clientProjects = await getProjectsForClient(goal.scopeId);
  query = query.in(
    "project_id",
    clientProjects.map((p) => p.id)
  );
}
```

### 4. **UI/UX Improvements**

#### Revenue Goal Card Display

Show:

- Current revenue vs target
- **NEW**: Breakdown by project/client (if scoped)
- **NEW**: Daily/hourly pace needed to reach goal
- **NEW**: Projected completion date
- **NEW**: Hourly rate(s) being used

#### Real-time Updates

- Update when time entries are added/modified
- Show live revenue total while timer is running
- Account for time entry hourly rates

---

## Database Changes Required

### Goals Table Schema (Add to revenue goals)

```sql
ALTER TABLE goals
ADD COLUMN scope TEXT CHECK (scope IN ('client', 'project', 'general')) DEFAULT 'general',
ADD COLUMN scope_id UUID;
```

### Time Entries (Already Has)

- `hourly_rate` - ✅ Exists
- `billable` - ✅ Exists
- `project_id` - ✅ Exists

### Projects Table (Already Has)

- `hourly_rate` - ✅ Exists
- `client_id` - ✅ Exists

---

## Implementation Steps

1. **Update Goal Types** (`goals.ts`)

   - Add `scope` and `scopeId` fields to RevenueGoal interface

2. **Update Goal Creation API** (`goalsApi.ts`)

   - Add scope/scopeId to CreateGoalData
   - Update transformToDb() for revenue goals with scope
   - Update transformFromDb() to populate scope fields

3. **Enhance Revenue Progress Calculation** (`goalsApi.ts`)

   - Implement scope-based filtering in calculateRevenueGoalProgress()
   - Add client-based project filtering logic

4. **Update Mobile Wizard** (GoalCreationModal.tsx - Step 1)

   - Add scope selection UI for revenue goals (general, client, project)
   - Add conditional client/project selector dropdown
   - Add revenue amount input field

5. **Update Desktop Form** (GoalCreationModal.tsx - Desktop)

   - Mirror mobile form fields
   - Add estimated current/projected revenue display

6. **Enhance Goal Card Display** (Goals.tsx)
   - Show revenue breakdown for scoped goals
   - Display hourly rate(s) being tracked
   - Show pace/projection info

---

## Data Structure Example

### Time Goal (Already Working)

```typescript
{
  name: "Q4 Billable Hours",
  type: "time",
  scope: "project",
  scopeId: "project-123",
  period: "quarterly",
  targetHours: 200,
  startDate: "2025-10-01",
  endDate: "2025-12-31"
}
```

### Revenue Goal (To Implement)

```typescript
{
  name: "Q4 Revenue from Acme Corp",
  type: "revenue",
  scope: "client",
  scopeId: "client-acme",
  period: "quarterly",
  targetAmount: 50000, // in cents = $500.00
  currency: "USD",
  startDate: "2025-10-01",
  endDate: "2025-12-31",
  currentAmount: 25000, // Calculated from billable entries
  // When calculating progress, will sum all billable time entries
  // from projects under client-acme within Q4 period
}
```

---

## Benefits

✅ **Better Revenue Tracking** - Know exactly what clients/projects contribute to revenue goals
✅ **Flexible Scoping** - Track overall revenue or specific client/project revenue
✅ **Real-time Updates** - See revenue updates as time entries are logged
✅ **Informed Decisions** - Know if you're on pace to hit revenue targets
✅ **Consistent UX** - Revenue goals work like time goals for familiar interface

---

## Timeline

- **Phase 1**: Database schema + backend calculations (1-2 hours)
- **Phase 2**: Form UI + creation flow (2-3 hours)
- **Phase 3**: Display/dashboard enhancements (1-2 hours)
- **Phase 4**: Testing + polish (1-2 hours)
