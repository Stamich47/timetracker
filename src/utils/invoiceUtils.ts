import type { TimeEntry } from "../lib/timeEntriesApi";
import type { Project } from "../lib/projectsApi";
import type { UserSettings } from "../lib/settingsApi";
import { calculateTimeEntryRevenue, formatCurrency } from "./revenueUtils";
import { secondsToHMS, formatDate } from "./timeUtils";

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number; // hours
  rate: number; // hourly rate
  amount: number; // quantity * rate
  projectName: string;
  projectColor?: string;
  clientName?: string;
  date: string;
  duration: number; // in seconds for display
}

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  dateCreated: string;
  dueDate: string;

  // Client information
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;

  // Business information (from user settings or profile)
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: string;

  // Financial details
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;

  // Line items
  lineItems: InvoiceLineItem[];

  // Metadata
  status: "draft" | "sent" | "paid" | "overdue";
  notes?: string;

  // Date range for the invoice
  periodStart: string;
  periodEnd: string;
}

export type InvoiceStyle = "detailed" | "summary" | "compact";

// Type for PDF instance (to avoid importing jsPDF statically)
type PDFInstance = {
  setFontSize: (size: number) => void;
  setFont: (font: string, style?: string) => void;
  text: (
    text: string | string[],
    x: number,
    y: number,
    options?: { align?: string }
  ) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  rect: (
    x: number,
    y: number,
    width: number,
    height: number,
    style?: string
  ) => void;
  setTextColor: (r: number, g?: number, b?: number) => void;
  setDrawColor: (r: number, g?: number, b?: number) => void;
  setFillColor: (r: number, g?: number, b?: number) => void;
  getTextWidth: (text: string) => number;
  save: (filename: string) => void;
  internal: {
    pageSize: {
      width: number;
      height: number;
    };
  };
};

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

/**
 * Generate invoice from time entries and settings
 */
export function generateInvoiceFromTimeEntries(
  timeEntries: TimeEntry[],
  projects: Project[],
  userSettings: UserSettings,
  options: InvoiceOptions
): InvoiceData {
  // Filter billable entries only
  const billableEntries = timeEntries.filter((entry) => {
    const project = projects.find((p) => p.id === entry.project_id);
    return project?.billable !== false && entry.duration && entry.duration > 0;
  });

  // Filter by client if specified
  const filteredEntries = options.clientId
    ? billableEntries.filter((entry) => {
        const project = projects.find((p) => p.id === entry.project_id);
        return project?.client_id === options.clientId;
      })
    : billableEntries;

  // Group entries by project or combine them
  const lineItems: InvoiceLineItem[] = [];

  // Create line items from time entries
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

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxRate = userSettings.tax_rate || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  // Generate invoice number (simple timestamp-based)
  const invoiceNumber = `INV-${Date.now()}`;

  // Set due date (default to 30 days from creation)
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

/**
 * Group line items by project for better organization
 */
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

/**
 * Format invoice as text for preview or export
 */
export function formatInvoiceAsText(invoice: InvoiceData): string {
  const lines: string[] = [];

  lines.push(`INVOICE ${invoice.invoiceNumber}`);
  lines.push("=".repeat(50));
  lines.push("");

  // Business info
  if (invoice.businessName) {
    lines.push(`From: ${invoice.businessName}`);
    if (invoice.businessEmail) lines.push(`Email: ${invoice.businessEmail}`);
    if (invoice.businessPhone) lines.push(`Phone: ${invoice.businessPhone}`);
    if (invoice.businessAddress)
      lines.push(`Address: ${invoice.businessAddress}`);
    lines.push("");
  }

  // Client info
  lines.push(`To: ${invoice.clientName}`);
  if (invoice.clientEmail) lines.push(`Email: ${invoice.clientEmail}`);
  if (invoice.clientPhone) lines.push(`Phone: ${invoice.clientPhone}`);
  lines.push("");

  // Invoice details
  lines.push(`Invoice Date: ${formatDate(new Date(invoice.dateCreated))}`);
  lines.push(`Due Date: ${formatDate(new Date(invoice.dueDate))}`);
  lines.push(
    `Period: ${formatDate(new Date(invoice.periodStart))} - ${formatDate(
      new Date(invoice.periodEnd)
    )}`
  );
  lines.push("");

  // Line items
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
        `    ${item.quantity.toFixed(2)} hours × ${formatCurrency(
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

  // Totals
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

/**
 * Export invoice as CSV
 */
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

  // Add summary rows
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

/**
 * Export invoice as PDF (dynamically imports jsPDF to reduce bundle size)
 */
export async function exportInvoiceAsPDF(
  invoice: InvoiceData,
  style: InvoiceStyle = "detailed"
): Promise<void> {
  // Dynamic import for jsPDF to reduce initial bundle size
  const jsPDF = (await import("jspdf")).default;
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.width;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Colors for professional look
  const primaryColor = [66, 139, 202]; // Blue
  const secondaryColor = [108, 117, 125]; // Gray
  const darkColor = [33, 37, 41]; // Dark gray

  let y = 30;

  // Professional Header with gradient-like styling
  pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.rect(0, 0, pageWidth, 60, "F");

  // Add subtle accent line
  pdf.setFillColor(255, 255, 255, 0.2);
  pdf.rect(0, 55, pageWidth, 5, "F");

  // Invoice title in header
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(32);
  pdf.setFont("helvetica", "bold");
  pdf.text("INVOICE", margin, 35);

  // Invoice number and date in header
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Invoice #${invoice.invoiceNumber}`, pageWidth - margin, 25, {
    align: "right",
  });
  pdf.text(
    `Date: ${formatDate(new Date(invoice.dateCreated))}`,
    pageWidth - margin,
    40,
    { align: "right" }
  );

  // Reset colors for body content
  pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  y = 80;

  // Business and Client Info Section
  const fromToY = y;

  // FROM section (left side)
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.text("FROM", margin, fromToY);

  pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  pdf.setFont("helvetica", "normal");
  let leftY = fromToY + 10;

  if (invoice.businessName) {
    pdf.setFont("helvetica", "bold");
    pdf.text(invoice.businessName, margin, leftY);
    leftY += 7;
    pdf.setFont("helvetica", "normal");
  }
  if (invoice.businessEmail) {
    pdf.text(invoice.businessEmail, margin, leftY);
    leftY += 6;
  }
  if (invoice.businessPhone) {
    pdf.text(invoice.businessPhone, margin, leftY);
    leftY += 6;
  }
  if (invoice.businessAddress) {
    const addressLines = invoice.businessAddress.split("\n");
    addressLines.forEach((line) => {
      pdf.text(line, margin, leftY);
      leftY += 6;
    });
  }

  // TO section (right side - properly aligned)
  const rightStartX = pageWidth / 2 + 10;
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.text("TO", rightStartX, fromToY);

  pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  pdf.setFont("helvetica", "normal");
  let rightY = fromToY + 10;

  pdf.setFont("helvetica", "bold");
  pdf.text(invoice.clientName, rightStartX, rightY);
  rightY += 7;
  pdf.setFont("helvetica", "normal");

  if (invoice.clientEmail) {
    pdf.text(invoice.clientEmail, rightStartX, rightY);
    rightY += 6;
  }
  if (invoice.clientPhone) {
    pdf.text(invoice.clientPhone, rightStartX, rightY);
    rightY += 6;
  }

  // Calculate y position after both columns
  y = Math.max(leftY, rightY) + 20;

  // Invoice Details Box
  pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.setFillColor(248, 249, 250); // Light gray background
  pdf.rect(margin, y, contentWidth, 25, "FD");

  // Invoice details inside the box
  pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");

  const detailsY = y + 8;
  pdf.text("Invoice Date:", margin + 10, detailsY);
  pdf.text("Due Date:", margin + 80, detailsY);
  pdf.text("Period:", margin + 150, detailsY);

  pdf.setFont("helvetica", "normal");
  pdf.text(
    formatDate(new Date(invoice.dateCreated)),
    margin + 10,
    detailsY + 10
  );
  pdf.text(formatDate(new Date(invoice.dueDate)), margin + 80, detailsY + 10);
  pdf.text(
    `${formatDate(new Date(invoice.periodStart))} - ${formatDate(
      new Date(invoice.periodEnd)
    )}`,
    margin + 150,
    detailsY + 10
  );

  y += 40;

  // Line Items Section
  y = addProfessionalLineItems(
    pdf,
    invoice,
    y,
    style,
    margin,
    contentWidth,
    primaryColor,
    secondaryColor,
    darkColor
  );

  // Payment Terms Section
  y += 15;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.text("PAYMENT TERMS", margin, y);

  y += 8;
  pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Payment is due within 30 days of invoice date.`, margin, y);
  y += 6;
  pdf.text(
    `Please reference invoice #${invoice.invoiceNumber} with your payment.`,
    margin,
    y
  );

  // Save the PDF
  pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);
}

function addProfessionalLineItems(
  pdf: PDFInstance,
  invoice: InvoiceData,
  startY: number,
  style: InvoiceStyle,
  margin: number,
  contentWidth: number,
  primaryColor: number[],
  secondaryColor: number[],
  darkColor: number[]
): number {
  let y = startY;

  // Services Section Header
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.text("SERVICES", margin, y);
  y += 10;

  // Horizontal line under services
  pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.line(margin, y, margin + contentWidth, y);
  y += 15;

  if (style === "detailed") {
    y = addDetailedProfessionalItems(
      pdf,
      invoice,
      y,
      margin,
      contentWidth,
      primaryColor,
      secondaryColor,
      darkColor
    );
  } else if (style === "summary") {
    y = addSummaryProfessionalItems(
      pdf,
      invoice,
      y,
      margin,
      contentWidth,
      primaryColor,
      secondaryColor,
      darkColor
    );
  } else if (style === "compact") {
    y = addCompactProfessionalItems(
      pdf,
      invoice,
      y,
      margin,
      contentWidth,
      primaryColor,
      secondaryColor,
      darkColor
    );
  }

  return addProfessionalTotalsSection(
    pdf,
    invoice,
    y + 20,
    margin,
    contentWidth,
    primaryColor,
    darkColor
  );
}

function addDetailedProfessionalItems(
  pdf: PDFInstance,
  invoice: InvoiceData,
  startY: number,
  margin: number,
  contentWidth: number,
  primaryColor: number[],
  _secondaryColor: number[],
  darkColor: number[]
): number {
  let y = startY;

  // Table header with background
  pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.rect(margin, y - 5, contentWidth, 15, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");

  // Header columns with better spacing
  pdf.text("Date", margin + 5, y + 5);
  pdf.text("Description", margin + 50, y + 5);
  pdf.text("Hours", margin + 280, y + 5);
  pdf.text("Rate", margin + 320, y + 5);
  pdf.text("Amount", margin + contentWidth - 5, y + 5, { align: "right" });

  y += 20;

  // Group by project
  const groupedItems = groupLineItemsByProject(invoice.lineItems);
  let isEvenRow = true;

  pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);

  groupedItems.forEach((group) => {
    // Project header with subtle background
    if (!isEvenRow) {
      pdf.setFillColor(248, 249, 250);
      pdf.rect(margin, y - 3, contentWidth, 12, "F");
    }

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text(group.projectName, margin + 5, y + 5);
    pdf.text(`${group.totalHours.toFixed(2)}h`, margin + 280, y + 5);
    pdf.text(
      formatCurrency(group.totalAmount, invoice.currency),
      margin + contentWidth - 5,
      y + 5,
      { align: "right" }
    );

    y += 15;
    isEvenRow = !isEvenRow;

    // Individual items
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(
      _secondaryColor[0],
      _secondaryColor[1],
      _secondaryColor[2]
    );

    group.items.forEach((item) => {
      if (!isEvenRow) {
        pdf.setFillColor(248, 249, 250);
        pdf.rect(margin, y - 2, contentWidth, 10, "F");
      }

      const description =
        item.description.length > 35
          ? item.description.substring(0, 32) + "..."
          : item.description;

      pdf.text(item.date, margin + 10, y + 4);
      pdf.text(description, margin + 50, y + 4);
      pdf.text(item.quantity.toFixed(2), margin + 280, y + 4);
      pdf.text(`$${item.rate.toFixed(2)}`, margin + 320, y + 4);
      pdf.text(
        formatCurrency(item.amount, invoice.currency),
        margin + contentWidth - 5,
        y + 4,
        { align: "right" }
      );

      y += 10;
      isEvenRow = !isEvenRow;
    });

    y += 5;
  });

  return y;
}

function addSummaryProfessionalItems(
  pdf: PDFInstance,
  invoice: InvoiceData,
  startY: number,
  margin: number,
  contentWidth: number,
  _primaryColor: number[],
  _secondaryColor: number[],
  darkColor: number[]
): number {
  let y = startY;

  // Table header
  pdf.setFillColor(_primaryColor[0], _primaryColor[1], _primaryColor[2]);
  pdf.rect(margin, y - 5, contentWidth, 15, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");

  pdf.text("Project", margin + 5, y + 5);
  pdf.text("Hours", margin + 120, y + 5);
  pdf.text("Rate", margin + 150, y + 5);
  pdf.text("Amount", margin + contentWidth - 5, y + 5, { align: "right" });

  y += 20;

  const groupedItems = groupLineItemsByProject(invoice.lineItems);
  let isEvenRow = true;

  pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");

  groupedItems.forEach((group) => {
    if (!isEvenRow) {
      pdf.setFillColor(248, 249, 250);
      pdf.rect(margin, y - 3, contentWidth, 12, "F");
    }

    const avgRate = group.totalAmount / group.totalHours;

    pdf.text(group.projectName, margin + 5, y + 5);
    pdf.text(`${group.totalHours.toFixed(2)}h`, margin + 120, y + 5);
    pdf.text(`$${avgRate.toFixed(2)}`, margin + 150, y + 5);
    pdf.text(
      formatCurrency(group.totalAmount, invoice.currency),
      margin + contentWidth - 5,
      y + 5,
      { align: "right" }
    );

    y += 15;
    isEvenRow = !isEvenRow;
  });

  return y;
}

function addCompactProfessionalItems(
  pdf: PDFInstance,
  invoice: InvoiceData,
  startY: number,
  margin: number,
  contentWidth: number,
  _primaryColor: number[],
  _secondaryColor: number[],
  darkColor: number[]
): number {
  const y = startY;

  const totalHours = invoice.lineItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  // Single line item for professional services
  pdf.setFillColor(248, 249, 250);
  pdf.rect(margin, y, contentWidth, 25, "F");

  pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("Professional Services", margin + 10, y + 10);

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(_secondaryColor[0], _secondaryColor[1], _secondaryColor[2]);
  pdf.text(
    `${formatDate(new Date(invoice.periodStart))} - ${formatDate(
      new Date(invoice.periodEnd)
    )}`,
    margin + 10,
    y + 18
  );

  pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text(`${totalHours.toFixed(2)} hours`, margin + 120, y + 15);
  pdf.text(
    formatCurrency(invoice.subtotal, invoice.currency),
    margin + 165,
    y + 15,
    { align: "right" }
  );

  return y + 30;
}

function addProfessionalTotalsSection(
  pdf: PDFInstance,
  invoice: InvoiceData,
  startY: number,
  margin: number,
  contentWidth: number,
  primaryColor: number[],
  darkColor: number[]
): number {
  let y = startY;

  // Totals box
  const totalsWidth = 100;
  const totalsX = margin + contentWidth - totalsWidth;

  pdf.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.setFillColor(248, 249, 250);
  pdf.rect(totalsX, y, totalsWidth, invoice.taxAmount > 0 ? 45 : 30, "FD");

  pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");

  // Subtotal
  pdf.text("Subtotal:", totalsX + 5, y + 10);
  pdf.text(
    formatCurrency(invoice.subtotal, invoice.currency),
    totalsX + 95,
    y + 10,
    { align: "right" }
  );

  y += 12;

  // Tax if applicable
  if (invoice.taxAmount > 0) {
    pdf.text(`Tax (${invoice.taxRate}%):`, totalsX + 5, y);
    pdf.text(
      formatCurrency(invoice.taxAmount, invoice.currency),
      totalsX + 95,
      y,
      { align: "right" }
    );
    y += 12;
  }

  // Total with emphasis
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("TOTAL:", totalsX + 5, y);
  pdf.text(formatCurrency(invoice.total, invoice.currency), totalsX + 95, y, {
    align: "right",
  });

  y += 20;

  // Notes section if present
  if (invoice.notes) {
    y += 10;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.text("NOTES", margin, y);

    y += 8;
    pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    pdf.setFont("helvetica", "normal");

    // Wrap notes text
    const noteLines = invoice.notes.split("\n");
    noteLines.forEach((line) => {
      const words = line.split(" ");
      let currentLine = "";

      words.forEach((word) => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (pdf.getTextWidth(testLine) < contentWidth - 20) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            pdf.text(currentLine, margin, y);
            y += 6;
          }
          currentLine = word;
        }
      });

      if (currentLine) {
        pdf.text(currentLine, margin, y);
        y += 6;
      }
    });
  }

  return y;
}
