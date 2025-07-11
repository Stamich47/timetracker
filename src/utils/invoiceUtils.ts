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
 * @param invoice Invoice data
 * @param style Invoice style
 * @param logoDataUrl Optional logo image as data URL
 */
export async function exportInvoiceAsPDF(
  invoice: InvoiceData,
  style: InvoiceStyle = "detailed",
  logoDataUrl?: string
): Promise<void> {
  const jsPDF = (await import("jspdf")).default;
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const primaryColor = [66, 139, 202]; // Blue
  const secondaryColor = [108, 117, 125]; // Gray
  const darkColor = [33, 37, 41]; // Dark gray
  const lightGray = [248, 249, 250];

  let y = 20;

  // Header background (reduced height)
  pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.rect(0, 0, pageWidth, 40, "F");

  // Logo (if provided, smaller and vertically centered)
  if (logoDataUrl) {
    try {
      pdf.setFillColor(255, 255, 255);
      pdf.rect(margin, 7, 32, 24, "F");
      pdf.addImage(
        logoDataUrl,
        "PNG",
        margin + 2,
        9,
        28,
        20,
        undefined,
        "FAST"
      );
    } catch {
      // Optionally log error or ignore
    }
  }

  // Invoice title (smaller, vertically centered)
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.text("INVOICE", margin + (logoDataUrl ? 38 : 0), 22);

  // Invoice meta (number, date, due, period) - smaller font, tighter spacing
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  const metaStartY = 12;
  const metaLineHeight = 5.2;
  pdf.text(
    `Invoice #${invoice.invoiceNumber}`,
    pageWidth - margin,
    metaStartY,
    { align: "right" }
  );
  pdf.text(
    `Date: ${formatDate(new Date(invoice.dateCreated))}`,
    pageWidth - margin,
    metaStartY + metaLineHeight,
    { align: "right" }
  );
  pdf.text(
    `Due: ${formatDate(new Date(invoice.dueDate))}`,
    pageWidth - margin,
    metaStartY + metaLineHeight * 2,
    { align: "right" }
  );
  pdf.text(
    `Period: ${formatDate(new Date(invoice.periodStart))} - ${formatDate(
      new Date(invoice.periodEnd)
    )}`,
    pageWidth - margin,
    metaStartY + metaLineHeight * 3,
    { align: "right" }
  );

  y = 48;

  // Business/Client Info
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.text("From", margin, y);
  pdf.text("Bill To", pageWidth / 2 + 5, y);
  y += 7;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  let leftY = y,
    rightY = y;
  // Business info
  if (invoice.businessName) {
    pdf.setFont("helvetica", "bold");
    pdf.text(invoice.businessName, margin, leftY);
    leftY += 6;
    pdf.setFont("helvetica", "normal");
  }
  if (invoice.businessEmail) {
    pdf.text(invoice.businessEmail, margin, leftY);
    leftY += 5;
  }
  if (invoice.businessPhone) {
    pdf.text(invoice.businessPhone, margin, leftY);
    leftY += 5;
  }
  if (invoice.businessAddress) {
    invoice.businessAddress.split("\n").forEach((line) => {
      pdf.text(line, margin, leftY);
      leftY += 5;
    });
  }
  // Client info
  pdf.setFont("helvetica", "bold");
  pdf.text(invoice.clientName, pageWidth / 2 + 5, rightY);
  rightY += 6;
  pdf.setFont("helvetica", "normal");
  if (invoice.clientEmail) {
    pdf.text(invoice.clientEmail, pageWidth / 2 + 5, rightY);
    rightY += 5;
  }
  if (invoice.clientPhone) {
    pdf.text(invoice.clientPhone, pageWidth / 2 + 5, rightY);
    rightY += 5;
  }
  y = Math.max(leftY, rightY) + 8;
  // Divider
  pdf.setDrawColor(230, 230, 230);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Services Table
  y = addModernProfessionalLineItems(
    pdf,
    invoice,
    y,
    style,
    margin,
    contentWidth,
    primaryColor,
    secondaryColor,
    darkColor,
    lightGray
  );

  // Totals Section
  y = addModernProfessionalTotalsSection(
    pdf,
    invoice,
    y + 10,
    margin,
    contentWidth,
    primaryColor,
    darkColor,
    lightGray
  );

  // Notes/Terms Section
  if (invoice.notes) {
    y += 10;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.text("Notes / Payment Terms", margin, y);
    y += 7;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    const notes =
      invoice.notes ||
      `Payment is due within 30 days of invoice date. Please reference invoice #${invoice.invoiceNumber} with your payment.`;
    const noteLines = notes.split("\n");
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
            y += 5;
          }
          currentLine = word;
        }
      });
      if (currentLine) {
        pdf.text(currentLine, margin, y);
        y += 5;
      }
    });
  }

  // Footer
  pdf.setFontSize(9);
  pdf.setTextColor(180, 180, 180);
  pdf.text(
    `Thank you for your business!  |  Page 1 of 1`,
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);
}

// Modern, striped, professional table
function addModernProfessionalLineItems(
  pdf: PDFInstance,
  invoice: InvoiceData,
  startY: number,
  style: InvoiceStyle,
  margin: number,
  contentWidth: number,
  primaryColor: number[],
  secondaryColor: number[],
  darkColor: number[],
  lightGray: number[]
): number {
  if (style === "summary") {
    return addModernSummaryLineItems(
      pdf,
      invoice,
      startY,
      margin,
      contentWidth,
      primaryColor,
      secondaryColor,
      darkColor,
      lightGray
    );
  } else if (style === "compact") {
    return addModernCompactLineItems(
      pdf,
      invoice,
      startY,
      margin,
      contentWidth,
      primaryColor,
      darkColor
    );
  }
  // Default: detailed
  let y = startY;
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.text("Services", margin, y);
  y += 8;
  // Table header
  pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.rect(margin, y, contentWidth, 12, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.text("Date", margin + 4, y + 8);
  pdf.text("Description", margin + 44, y + 8);
  pdf.text("Hours", margin + 170, y + 8, { align: "right" });
  pdf.text("Rate", margin + 210, y + 8, { align: "right" });
  pdf.text("Amount", margin + contentWidth - 8, y + 8, { align: "right" });
  y += 12;
  // Table rows
  const grouped = groupLineItemsByProject(invoice.lineItems);
  let isEven = false;
  pdf.setFontSize(9);
  grouped.forEach((group) => {
    group.items.forEach((item) => {
      if (isEven) {
        pdf.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
        pdf.rect(margin, y, contentWidth, 10, "F");
      }
      pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      pdf.setFont("helvetica", "normal");
      pdf.text(item.date, margin + 4, y + 7);
      const desc =
        item.description.length > 40
          ? item.description.slice(0, 37) + "..."
          : item.description;
      pdf.text(desc, margin + 44, y + 7);
      pdf.text(item.quantity.toFixed(2), margin + 170, y + 7, {
        align: "right",
      });
      pdf.text(
        formatCurrency(item.rate, invoice.currency),
        margin + 210,
        y + 7,
        { align: "right" }
      );
      pdf.text(
        formatCurrency(item.amount, invoice.currency),
        margin + contentWidth - 8,
        y + 7,
        { align: "right" }
      );
      y += 10;
      isEven = !isEven;
    });
    // Project subtotal row
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    pdf.text(`${group.projectName} subtotal:`, margin + 44, y + 2);
    pdf.text(
      formatCurrency(group.totalAmount, invoice.currency),
      margin + contentWidth - 8,
      y + 2,
      { align: "right" }
    );
    y += 8;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  });
  return y;
}

// Modern summary table
function addModernSummaryLineItems(
  pdf: PDFInstance,
  invoice: InvoiceData,
  startY: number,
  margin: number,
  contentWidth: number,
  primaryColor: number[],
  _secondaryColor: number[], // unused
  darkColor: number[],
  lightGray: number[] // use this param
): number {
  let y = startY;
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.text("Services Summary", margin, y);
  y += 8;
  // Table header
  pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.rect(margin, y, contentWidth, 12, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.text("Project", margin + 4, y + 8);
  pdf.text("Hours", margin + 120, y + 8, { align: "right" });
  pdf.text("Rate", margin + 170, y + 8, { align: "right" });
  pdf.text("Amount", margin + contentWidth - 8, y + 8, { align: "right" });
  y += 12;
  // Table rows
  const grouped = groupLineItemsByProject(invoice.lineItems);
  let isEven = false;
  pdf.setFontSize(9);
  grouped.forEach((group) => {
    if (isEven) {
      pdf.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      pdf.rect(margin, y, contentWidth, 10, "F");
    }
    pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    pdf.setFont("helvetica", "normal");
    const avgRate = group.totalAmount / group.totalHours;
    pdf.text(group.projectName, margin + 4, y + 7);
    pdf.text(group.totalHours.toFixed(2), margin + 120, y + 7, {
      align: "right",
    });
    pdf.text(formatCurrency(avgRate, invoice.currency), margin + 170, y + 7, {
      align: "right",
    });
    pdf.text(
      formatCurrency(group.totalAmount, invoice.currency),
      margin + contentWidth - 8,
      y + 7,
      { align: "right" }
    );
    y += 10;
    isEven = !isEven;
  });
  return y;
}

// Modern compact table
function addModernCompactLineItems(
  pdf: PDFInstance,
  invoice: InvoiceData,
  startY: number,
  margin: number,
  contentWidth: number,
  primaryColor: number[],
  darkColor: number[] // unused
): number {
  let y = startY;
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.text("Professional Services", margin, y);
  y += 8;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  const totalHours = invoice.lineItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  pdf.text(
    `${formatDate(new Date(invoice.periodStart))} - ${formatDate(
      new Date(invoice.periodEnd)
    )}`,
    margin,
    y + 6
  );
  pdf.text(`${totalHours.toFixed(2)} hours`, margin + 120, y + 6, {
    align: "right",
  });
  pdf.text(
    formatCurrency(invoice.subtotal, invoice.currency),
    margin + contentWidth - 8,
    y + 6,
    { align: "right" }
  );
  return y + 16;
}

// Modern, striped, professional totals section
function addModernProfessionalTotalsSection(
  pdf: PDFInstance,
  invoice: InvoiceData,
  startY: number,
  margin: number,
  contentWidth: number,
  primaryColor: number[],
  darkColor: number[],
  lightGray: number[]
): number {
  let y = startY;
  // Subtotal
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.text("Subtotal", margin, y);
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  pdf.text(
    formatCurrency(invoice.subtotal, invoice.currency),
    margin + contentWidth - 8,
    y,
    { align: "right" }
  );
  y += 8;
  // Tax
  if (invoice.taxAmount > 0) {
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.text(`Tax (${invoice.taxRate}%`, margin, y);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    pdf.text(
      formatCurrency(invoice.taxAmount, invoice.currency),
      margin + contentWidth - 8,
      y,
      { align: "right" }
    );
    y += 8;
  }
  // Total
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.text("TOTAL", margin, y);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  pdf.text(
    formatCurrency(invoice.total, invoice.currency),
    margin + contentWidth - 8,
    y,
    { align: "right" }
  );
  y += 16;
  return y;
}
