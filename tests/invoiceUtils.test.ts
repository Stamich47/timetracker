import { describe, it, expect } from "vitest";
import {
  generateInvoiceFromTimeEntries,
  formatInvoiceAsText,
  exportInvoiceAsCSV,
} from "../src/utils/invoiceUtils";
import type { TimeEntry } from "../src/lib/timeEntriesApi";
import type { Project } from "../src/lib/projectsApi";
import type { UserSettings } from "../src/lib/settingsApi";

describe("Invoice Utils", () => {
  const mockTimeEntries: TimeEntry[] = [
    {
      id: "1",
      project_id: "proj1",
      description: "Development work",
      start_time: "2024-01-01T09:00:00Z",
      end_time: "2024-01-01T12:00:00Z",
      duration: 10800, // 3 hours in seconds
      billable: true,
    },
    {
      id: "2",
      project_id: "proj1",
      description: "Testing",
      start_time: "2024-01-01T13:00:00Z",
      end_time: "2024-01-01T15:00:00Z",
      duration: 7200, // 2 hours in seconds
      billable: true,
    },
  ];

  const mockProjects: Project[] = [
    {
      id: "proj1",
      name: "Test Project",
      billable: true,
      hourly_rate: 100,
      color: "#3B82F6",
      client: {
        id: "client1",
        name: "Test Client",
      },
    },
  ];

  const mockUserSettings: UserSettings = {
    currency: "USD",
    hourly_rate: 75,
    tax_rate: 10,
  };

  it("should generate an invoice from time entries", () => {
    const invoice = generateInvoiceFromTimeEntries(
      mockTimeEntries,
      mockProjects,
      mockUserSettings,
      {
        clientName: "Test Client",
        periodStart: "2024-01-01T00:00:00Z",
        periodEnd: "2024-01-01T23:59:59Z",
      }
    );

    expect(invoice).toBeDefined();
    expect(invoice.clientName).toBe("Test Client");
    expect(invoice.lineItems).toHaveLength(2);
    expect(invoice.subtotal).toBe(500); // 5 hours * $100/hour
    expect(invoice.taxAmount).toBe(50); // 10% of $500
    expect(invoice.total).toBe(550);
    expect(invoice.currency).toBe("USD");
  });

  it("should format invoice as text", () => {
    const invoice = generateInvoiceFromTimeEntries(
      mockTimeEntries,
      mockProjects,
      mockUserSettings,
      {
        clientName: "Test Client",
        periodStart: "2024-01-01T00:00:00Z",
        periodEnd: "2024-01-01T23:59:59Z",
      }
    );

    const text = formatInvoiceAsText(invoice);

    expect(text).toContain("INVOICE");
    expect(text).toContain("Test Client");
    expect(text).toContain("Test Project");
    expect(text).toContain("$500.00");
    expect(text).toContain("$550.00");
  });

  it("should export invoice as CSV", () => {
    const invoice = generateInvoiceFromTimeEntries(
      mockTimeEntries,
      mockProjects,
      mockUserSettings,
      {
        clientName: "Test Client",
        periodStart: "2024-01-01T00:00:00Z",
        periodEnd: "2024-01-01T23:59:59Z",
      }
    );

    const csv = exportInvoiceAsCSV(invoice);

    expect(csv).toContain(
      "Date,Project,Description,Duration,Hours,Rate,Amount"
    );
    expect(csv).toContain("Test Project");
    expect(csv).toContain("Development work");
    expect(csv).toContain("Testing");
    expect(csv).toContain("TOTAL:");
  });

  it("should filter out non-billable entries", () => {
    const mixedEntries: TimeEntry[] = [
      ...mockTimeEntries,
      {
        id: "3",
        project_id: "proj2",
        description: "Non-billable work",
        start_time: "2024-01-01T16:00:00Z",
        end_time: "2024-01-01T18:00:00Z",
        duration: 7200, // 2 hours
        billable: false,
      },
    ];

    const nonBillableProjects: Project[] = [
      ...mockProjects,
      {
        id: "proj2",
        name: "Non-billable Project",
        billable: false,
        hourly_rate: 100,
      },
    ];

    const invoice = generateInvoiceFromTimeEntries(
      mixedEntries,
      nonBillableProjects,
      mockUserSettings,
      {
        clientName: "Test Client",
        periodStart: "2024-01-01T00:00:00Z",
        periodEnd: "2024-01-01T23:59:59Z",
      }
    );

    // Should only include the 2 billable entries
    expect(invoice.lineItems).toHaveLength(2);
    expect(invoice.subtotal).toBe(500);
  });
});
