import type { TimeEntry } from "../lib/timeEntriesApi";
import type { Project } from "../lib/projectsApi";
import type { UserSettings } from "../lib/settingsApi";
import { calculateTimeEntryRevenue, formatCurrency } from "./revenueUtils";
import { secondsToHMS, formatDate } from "./timeUtils";

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  projectName: string;
  projectColor?: string;
  clientName?: string;
  date: string;
  duration: number;
}

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  dateCreated: string;
  dueDate: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  lineItems: InvoiceLineItem[];
  status: "draft" | "sent" | "paid" | "overdue";
  notes?: string;
  periodStart: string;
  periodEnd: string;
}

export type InvoiceStyle = "detailed" | "summary" | "compact";

export interface InvoiceOptions {
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  periodStart: string;
  periodEnd: string;
  businessInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  notes?: string;
  dueDate?: string;
  style?: InvoiceStyle;
}

export function generateInvoiceFromTimeEntries(
  timeEntries: TimeEntry[],
  projects: Project[],
  userSettings: UserSettings,
  options: InvoiceOptions
): InvoiceData {
  const billableEntries = timeEntries.filter((entry) => {
    const project = projects.find((p) => p.id === entry.project_id);
    return project?.billable !== false && entry.duration && entry.duration > 0;
  });

  const filteredEntries = options.clientId
    ? billableEntries.filter((entry) => {
        const project = projects.find((p) => p.id === entry.project_id);
        return project?.client_id === options.clientId;
      })
    : billableEntries;

  const lineItems: InvoiceLineItem[] = [];

  filteredEntries.forEach((entry) => {
    const project = projects.find((p) => p.id === entry.project_id);
    const revenueData = calculateTimeEntryRevenue(entry, project, userSettings);

    if (revenueData.grossRevenue > 0) {
      lineItems.push({
        id: entry.id || `entry-${Date.now()}`,
        description: entry.description || "Time tracking",
        quantity: parseFloat(revenueData.hours.toFixed(2)),
        rate: revenueData.hourlyRate,
        amount: revenueData.grossRevenue,
        projectName: project?.name || "Unknown Project",
        projectColor: project?.color,
        clientName:
          project?.client?.name || options.clientName || "Unknown Client",
        date: formatDate(new Date(entry.start_time)),
        duration: entry.duration || 0,
      });
    }
  });

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxRate = userSettings.tax_rate || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const invoiceNumber = `INV-${Date.now()}`;
  const dateCreated = new Date().toISOString();
  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 30);
  const dueDate = options.dueDate || defaultDueDate.toISOString();

  return {
    id: `invoice-${Date.now()}`,
    invoiceNumber,
    dateCreated,
    dueDate,
    clientName:
      options.clientName || lineItems[0]?.clientName || "Unknown Client",
    clientEmail: options.clientEmail,
    clientPhone: options.clientPhone,
    businessName: options.businessInfo?.name,
    businessEmail: options.businessInfo?.email,
    businessPhone: options.businessInfo?.phone,
    businessAddress: options.businessInfo?.address,
    subtotal,
    taxRate,
    taxAmount,
    total,
    currency: userSettings.currency || "USD",
    lineItems,
    status: "draft",
    notes: options.notes,
    periodStart: options.periodStart,
    periodEnd: options.periodEnd,
  };
}

export function groupLineItemsByProject(lineItems: InvoiceLineItem[]): Array<{
  projectName: string;
  projectColor?: string;
  clientName?: string;
  items: InvoiceLineItem[];
  totalHours: number;
  totalAmount: number;
}> {
  const groups = new Map<
    string,
    {
      projectName: string;
      projectColor?: string;
      clientName?: string;
      items: InvoiceLineItem[];
      totalHours: number;
      totalAmount: number;
    }
  >();

  lineItems.forEach((item) => {
    const key = item.projectName;
    if (!groups.has(key)) {
      groups.set(key, {
        projectName: item.projectName,
        projectColor: item.projectColor,
        clientName: item.clientName,
        items: [],
        totalHours: 0,
        totalAmount: 0,
      });
    }

    const group = groups.get(key)!;
    group.items.push(item);
    group.totalHours += item.quantity;
    group.totalAmount += item.amount;
  });

  return Array.from(groups.values());
}

export function formatInvoiceAsText(invoice: InvoiceData): string {
  const lines: string[] = [];

  lines.push(`INVOICE ${invoice.invoiceNumber}`);
  lines.push("=".repeat(50));
  lines.push("");

  if (invoice.businessName) {
    lines.push(`From: ${invoice.businessName}`);
    if (invoice.businessEmail) lines.push(`Email: ${invoice.businessEmail}`);
    if (invoice.businessPhone) lines.push(`Phone: ${invoice.businessPhone}`);
    if (invoice.businessAddress)
      lines.push(`Address: ${invoice.businessAddress}`);
    lines.push("");
  }

  lines.push(`To: ${invoice.clientName}`);
  if (invoice.clientEmail) lines.push(`Email: ${invoice.clientEmail}`);
  if (invoice.clientPhone) lines.push(`Phone: ${invoice.clientPhone}`);
  lines.push("");

  lines.push(`Invoice Date: ${formatDate(new Date(invoice.dateCreated))}`);
  lines.push(`Due Date: ${formatDate(new Date(invoice.dueDate))}`);
  lines.push(
    `Period: ${formatDate(new Date(invoice.periodStart))} - ${formatDate(
      new Date(invoice.periodEnd)
    )}`
  );
  lines.push("");

  lines.push("SERVICES");
  lines.push("-".repeat(50));

  const grouped = groupLineItemsByProject(invoice.lineItems);
  grouped.forEach((group) => {
    lines.push(`${group.projectName} (${group.totalHours.toFixed(2)} hours)`);
    group.items.forEach((item) => {
      lines.push(
        `  ${item.date} - ${item.description} (${secondsToHMS(item.duration)})`
      );
      lines.push(
        `    ${item.quantity.toFixed(2)} hours  ${formatCurrency(
          item.rate,
          invoice.currency
        )} = ${formatCurrency(item.amount, invoice.currency)}`
      );
    });
    lines.push(
      `  Project Total: ${formatCurrency(group.totalAmount, invoice.currency)}`
    );
    lines.push("");
  });

  lines.push("-".repeat(50));
  lines.push(`Subtotal: ${formatCurrency(invoice.subtotal, invoice.currency)}`);
  if (invoice.taxAmount > 0) {
    lines.push(
      `Tax (${invoice.taxRate}%): ${formatCurrency(
        invoice.taxAmount,
        invoice.currency
      )}`
    );
  }
  lines.push(`TOTAL: ${formatCurrency(invoice.total, invoice.currency)}`);

  if (invoice.notes) {
    lines.push("");
    lines.push("Notes:");
    lines.push(invoice.notes);
  }

  return lines.join("\n");
}

export function exportInvoiceAsCSV(invoice: InvoiceData): string {
  const headers = [
    "Date",
    "Project",
    "Description",
    "Duration",
    "Hours",
    "Rate",
    "Amount",
  ];

  const rows = invoice.lineItems.map((item) => [
    item.date,
    item.projectName,
    item.description,
    secondsToHMS(item.duration),
    item.quantity.toFixed(2),
    item.rate.toFixed(2),
    item.amount.toFixed(2),
  ]);

  rows.push([]);
  rows.push(["", "", "", "", "", "Subtotal:", invoice.subtotal.toFixed(2)]);
  if (invoice.taxAmount > 0) {
    rows.push([
      "",
      "",
      "",
      "",
      "",
      `Tax (${invoice.taxRate}%):`,
      invoice.taxAmount.toFixed(2),
    ]);
  }
  rows.push(["", "", "", "", "", "TOTAL:", invoice.total.toFixed(2)]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");
}
