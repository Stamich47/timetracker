import {
  calculateTimeEntryRevenue,
  calculateTotalRevenue,
  formatCurrency,
  getEffectiveHourlyRate,
  isTimeEntryBillable,
} from "../src/utils/revenueUtils";
import type { TimeEntry } from "../src/lib/timeEntriesApi";
import type { Project } from "../src/lib/projectsApi";
import type { UserSettings } from "../src/lib/settingsApi";

// Test data
const mockUserSettings: UserSettings = {
  hourly_rate: 50, // Default $50/hr
  currency: "USD",
  tax_rate: 10, // 10% tax
};

const mockProject: Project = {
  id: "project-1",
  name: "Test Project",
  hourly_rate: 75, // Override to $75/hr
  billable: true,
  color: "#3B82F6",
};

const mockNonBillableProject: Project = {
  id: "project-2",
  name: "Non-Billable Project",
  hourly_rate: 60,
  billable: false, // Not billable
  color: "#EF4444",
};

const mockTimeEntry: TimeEntry = {
  id: "entry-1",
  project_id: "project-1",
  description: "Test work",
  start_time: "2025-01-01T09:00:00Z",
  end_time: "2025-01-01T11:00:00Z",
  duration: 7200, // 2 hours
};

const mockNonBillableEntry: TimeEntry = {
  id: "entry-2",
  project_id: "project-2",
  description: "Non-billable work",
  start_time: "2025-01-01T13:00:00Z",
  end_time: "2025-01-01T14:30:00Z",
  duration: 5400, // 1.5 hours
};

const mockNoProjectEntry: TimeEntry = {
  id: "entry-3",
  project_id: undefined,
  description: "No project work",
  start_time: "2025-01-01T15:00:00Z",
  end_time: "2025-01-01T16:00:00Z",
  duration: 3600, // 1 hour
};

// Run tests
console.log("🧪 Testing Revenue Calculations");
console.log("================================");

// Test 1: Billable project with project-level rate
console.log("Test 1: Billable project with project-level rate");
const revenue1 = calculateTimeEntryRevenue(
  mockTimeEntry,
  mockProject,
  mockUserSettings
);
console.log("Expected: $75/hr * 2hr = $150 gross, $135 net (10% tax)");
console.log("Result:", revenue1);
console.log("✅ Hourly rate precedence:", revenue1.hourlyRate === 75);
console.log("✅ Gross revenue:", revenue1.grossRevenue === 150);
console.log("✅ Net revenue:", revenue1.netRevenue === 135);
console.log("✅ Is billable:", revenue1.isBillable === true);
console.log("");

// Test 2: Non-billable project
console.log("Test 2: Non-billable project");
const revenue2 = calculateTimeEntryRevenue(
  mockNonBillableEntry,
  mockNonBillableProject,
  mockUserSettings
);
console.log("Expected: $0 (non-billable)");
console.log("Result:", revenue2);
console.log("✅ Is billable:", revenue2.isBillable === false);
console.log("✅ Revenue:", revenue2.grossRevenue === 0);
console.log("");

// Test 3: No project (uses default rate)
console.log("Test 3: No project (uses default rate)");
const revenue3 = calculateTimeEntryRevenue(
  mockNoProjectEntry,
  undefined,
  mockUserSettings
);
console.log("Expected: $50/hr * 1hr = $50 gross, $45 net (10% tax)");
console.log("Result:", revenue3);
console.log("✅ Hourly rate fallback:", revenue3.hourlyRate === 50);
console.log("✅ Gross revenue:", revenue3.grossRevenue === 50);
console.log("✅ Net revenue:", revenue3.netRevenue === 45);
console.log("✅ Is billable:", revenue3.isBillable === true);
console.log("");

// Test 4: Total revenue calculation
console.log("Test 4: Total revenue calculation");
const projects = [mockProject, mockNonBillableProject];
const timeEntries = [mockTimeEntry, mockNonBillableEntry, mockNoProjectEntry];
const totalRevenue = calculateTotalRevenue(
  timeEntries,
  projects,
  mockUserSettings
);
console.log("Expected: $200 gross ($150 + $50), $180 net, 3 billable hours");
console.log("Result:", totalRevenue);
console.log("✅ Total gross:", totalRevenue.totalGrossRevenue === 200);
console.log("✅ Total net:", totalRevenue.totalNetRevenue === 180);
console.log("✅ Billable hours:", totalRevenue.totalBillableHours === 3);
console.log(
  "✅ Non-billable hours:",
  totalRevenue.totalNonBillableHours === 1.5
);
console.log("✅ Billable entries:", totalRevenue.billableEntries === 2);
console.log("✅ Non-billable entries:", totalRevenue.nonBillableEntries === 1);
console.log("");

// Test 5: Currency formatting
console.log("Test 5: Currency formatting");
console.log("USD:", formatCurrency(1234.56, "USD"));
console.log("EUR:", formatCurrency(1234.56, "EUR"));
console.log("GBP:", formatCurrency(1234.56, "GBP"));
console.log("CAD:", formatCurrency(1234.56, "CAD"));
console.log("");

// Test 6: Helper functions
console.log("Test 6: Helper functions");
console.log(
  "Effective rate (project):",
  getEffectiveHourlyRate(mockProject, mockUserSettings)
);
console.log(
  "Effective rate (no project):",
  getEffectiveHourlyRate(undefined, mockUserSettings)
);
console.log("Is billable (project):", isTimeEntryBillable(mockProject));
console.log(
  "Is billable (non-billable):",
  isTimeEntryBillable(mockNonBillableProject)
);
console.log("Is billable (no project):", isTimeEntryBillable(undefined));

console.log("");
console.log("🎉 All tests completed!");
