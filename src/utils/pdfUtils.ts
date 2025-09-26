import type { InvoiceData } from "./invoiceUtils";

// Type for PDF instance (to avoid importing jsPDF statically)
type PDFInstance = {
  internal: {
    pageSize: {
      width: number;
      height: number;
    };
  };
  setFillColor: (r: number, g: number, b: number) => void;
  rect: (x: number, y: number, w: number, h: number, style?: string) => void;
  setTextColor: (r: number, g: number, b: number) => void;
  setFontSize: (size: number) => void;
  setFont: (font: string, style?: string) => void;
  text: (
    text: string,
    x: number,
    y: number,
    options?: { align?: string }
  ) => void;
  addImage: (
    imageData: string,
    format: string,
    x: number,
    y: number,
    w: number,
    h: number,
    alias?: string,
    compression?: string
  ) => void;
  save: (filename: string) => void;
  addPage: () => void;
  setLineWidth: (width: number) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  getTextWidth: (text: string) => number;
};

/**
 * Export invoice as PDF (completely lazy loaded to reduce bundle size)
 * @param invoice Invoice data
 * @param style Invoice style
 * @param logoDataUrl Optional logo image as data URL
 */
export async function exportInvoiceAsPDF(
  invoice: InvoiceData,
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

  y = Math.max(leftY, rightY) + 10;

  // Line items header
  pdf.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  pdf.rect(margin, y - 5, contentWidth, 10, "F");
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  pdf.text("Description", margin + 2, y);
  pdf.text("Qty", margin + contentWidth - 60, y, { align: "right" });
  pdf.text("Rate", margin + contentWidth - 35, y, { align: "right" });
  pdf.text("Amount", margin + contentWidth - 2, y, { align: "right" });
  y += 12;

  // Line items
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  for (const item of invoice.lineItems) {
    // Check if we need a new page
    if (y > pageHeight - 60) {
      pdf.addPage();
      y = 20;
    }

    const description = `${item.description}${
      item.projectName ? ` (${item.projectName})` : ""
    }`;
    const wrappedDescription = wrapText(pdf, description, contentWidth - 70);
    const lineHeight = 5;

    // Description (wrapped)
    pdf.text(wrappedDescription[0], margin + 2, y);
    let currentY = y;
    for (let i = 1; i < wrappedDescription.length; i++) {
      currentY += lineHeight;
      pdf.text(wrappedDescription[i], margin + 2, currentY);
    }

    // Quantity, Rate, Amount (right aligned)
    const valuesY = y;
    pdf.text(item.quantity.toString(), margin + contentWidth - 60, valuesY, {
      align: "right",
    });
    pdf.text(
      formatCurrency(item.rate, invoice.currency),
      margin + contentWidth - 35,
      valuesY,
      { align: "right" }
    );
    pdf.text(
      formatCurrency(item.amount, invoice.currency),
      margin + contentWidth - 2,
      valuesY,
      { align: "right" }
    );

    y = currentY + lineHeight + 2;
  }

  y += 10;

  // Totals section
  y = renderTotals(
    pdf,
    invoice,
    y,
    margin,
    contentWidth,
    primaryColor,
    darkColor
  );

  // Notes (if any)
  if (invoice.notes) {
    y += 10;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    pdf.text("Notes:", margin, y);
    y += 7;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    const wrappedNotes = wrapText(pdf, invoice.notes, contentWidth);
    for (const line of wrappedNotes) {
      pdf.text(line, margin, y);
      y += 5;
    }
  }

  // Save the PDF
  pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);
}

// Helper function to wrap text
function wrapText(pdf: PDFInstance, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine + (currentLine ? " " : "") + word;
    const textWidth = pdf.getTextWidth(testLine);

    if (textWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

// Helper function to render totals section
function renderTotals(
  pdf: PDFInstance,
  invoice: InvoiceData,
  startY: number,
  margin: number,
  contentWidth: number,
  primaryColor: number[],
  darkColor: number[]
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

// Helper functions that need to be imported
function formatDate(date: Date): string {
  return date.toLocaleDateString();
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(amount);
}
