import React, { useState, useEffect, useRef } from "react";
import {
  X,
  FileText,
  Download,
  Eye,
  Calendar,
  User,
  Building,
  Loader2,
  FileDown,
  Layout,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import type { TimeEntry } from "../lib/timeEntriesApi";
import type { Project } from "../lib/projectsApi";
import type { UserSettings } from "../lib/settingsApi";
import {
  generateInvoiceFromTimeEntries,
  formatInvoiceAsText,
  exportInvoiceAsCSV,
  groupLineItemsByProject,
  type InvoiceData,
  type InvoiceStyle,
} from "../utils/invoiceUtils";
import { formatCurrency } from "../utils/revenueUtils";
import { formatDate, secondsToHMS } from "../utils/timeUtils";

interface InvoiceGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeEntries: TimeEntry[];
  projects: Project[];
  userSettings: UserSettings;
  selectedClientId?: string;
  periodStart: string;
  periodEnd: string;
}

const InvoiceGeneratorModal: React.FC<InvoiceGeneratorModalProps> = ({
  isOpen,
  onClose,
  timeEntries,
  projects,
  userSettings,
  selectedClientId,
  periodStart,
  periodEnd,
}) => {
  const { themeType } = useTheme();
  const [step, setStep] = useState<"setup" | "preview" | "export">("setup");
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Form state for invoice setup
  const [formData, setFormData] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    businessName: "",
    businessEmail: "",
    businessPhone: "",
    businessAddress: "",
    notes: "",
    dueDate: "",
    invoiceStyle: "detailed" as InvoiceStyle,
  });

  // Initialize form data when modal opens (autopopulate business info from userSettings)
  useEffect(() => {
    if (isOpen) {
      let clientName = "";
      if (selectedClientId) {
        // Find client info from projects
        const clientProjects = projects.filter(
          (p) => p.client_id === selectedClientId
        );
        clientName = clientProjects[0]?.client?.name || "";
      }
      setFormData((prev) => ({
        ...prev,
        clientName: clientName || prev.clientName,
        dueDate:
          prev.dueDate ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        businessName: prev.businessName || userSettings.business_name || "",
        businessEmail: prev.businessEmail || userSettings.business_email || "",
        businessPhone: prev.businessPhone || userSettings.business_phone || "",
        businessAddress:
          prev.businessAddress || userSettings.business_address || "",
      }));
    }
  }, [isOpen, selectedClientId, projects, userSettings]);

  // Generate invoice when moving to preview
  const handleGenerateInvoice = async () => {
    setLoading(true);
    try {
      const invoiceData = generateInvoiceFromTimeEntries(
        timeEntries,
        projects,
        userSettings,
        {
          clientId: selectedClientId,
          clientName: formData.clientName,
          clientEmail: formData.clientEmail,
          clientPhone: formData.clientPhone,
          periodStart,
          periodEnd,
          businessInfo: {
            name: formData.businessName,
            email: formData.businessEmail,
            phone: formData.businessPhone,
            address: formData.businessAddress,
          },
          notes: formData.notes,
          dueDate: formData.dueDate
            ? new Date(formData.dueDate).toISOString()
            : undefined,
          style: formData.invoiceStyle,
        }
      );

      setInvoice(invoiceData);
      setStep("preview");
    } catch (error) {
      console.error("Error generating invoice:", error);
    } finally {
      setLoading(false);
    }
  };

  // Export handlers
  const handleExportCSV = () => {
    if (!invoice) return;

    const csvContent = exportInvoiceAsCSV(invoice);
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-${invoice.invoiceNumber}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExportText = () => {
    if (!invoice) return;

    const textContent = formatInvoiceAsText(invoice);
    const blob = new Blob([textContent], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-${invoice.invoiceNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (!invoice) return;
    try {
      const { exportInvoiceAsPDF } = await import("../utils/invoiceUtils");
      await exportInvoiceAsPDF(
        invoice,
        formData.invoiceStyle,
        logoDataUrl ?? undefined
      );
    } catch (error) {
      console.error("Error exporting PDF:", error);
    }
  };

  // Logo upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogoDataUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  // Theme classes
  const themeClasses = {
    modal:
      themeType === "dark"
        ? "bg-gray-800 border-gray-700"
        : "bg-white border-gray-200",
    text: themeType === "dark" ? "text-white" : "text-gray-900",
    textSecondary: themeType === "dark" ? "text-gray-300" : "text-gray-600",
    input:
      themeType === "dark"
        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500",
    button:
      themeType === "dark"
        ? "bg-blue-600 hover:bg-blue-700 text-white"
        : "bg-blue-600 hover:bg-blue-700 text-white",
    secondaryButton:
      themeType === "dark"
        ? "bg-gray-600 hover:bg-gray-700 text-white border-gray-600"
        : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300",
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />

        <div
          className={`relative w-full max-w-4xl rounded-lg border shadow-xl ${themeClasses.modal}`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between border-b p-4 ${
              themeType === "dark" ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <h2 className={`text-lg font-semibold ${themeClasses.text}`}>
                Generate Invoice
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`rounded-lg p-1 transition-colors ${
                themeType === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"
              }`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Step indicator */}
            <div className="mb-6 flex items-center justify-center space-x-4">
              {["setup", "preview", "export"].map((stepName, index) => (
                <div key={stepName} className="flex items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      step === stepName
                        ? "bg-blue-500 text-white"
                        : index < ["setup", "preview", "export"].indexOf(step)
                        ? "bg-green-500 text-white"
                        : themeType === "dark"
                        ? "bg-gray-700 text-gray-300"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span
                    className={`ml-2 capitalize ${themeClasses.textSecondary}`}
                  >
                    {stepName}
                  </span>
                  {index < 2 && (
                    <div
                      className={`mx-4 h-px w-8 ${
                        index < ["setup", "preview", "export"].indexOf(step)
                          ? "bg-green-500"
                          : themeType === "dark"
                          ? "bg-gray-700"
                          : "bg-gray-300"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Setup */}
            {step === "setup" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Client Information */}
                  <div className="space-y-4">
                    <h3
                      className={`flex items-center text-lg font-medium ${themeClasses.text}`}
                    >
                      <User className="mr-2 h-5 w-5" />
                      Client Information
                    </h3>

                    <div>
                      <label
                        className={`block text-sm font-medium ${themeClasses.textSecondary}`}
                      >
                        Client Name *
                      </label>
                      <input
                        type="text"
                        value={formData.clientName}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            clientName: e.target.value,
                          }))
                        }
                        className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${themeClasses.input}`}
                        required
                      />
                    </div>

                    <div>
                      <label
                        className={`block text-sm font-medium ${themeClasses.textSecondary}`}
                      >
                        Client Email
                      </label>
                      <input
                        type="email"
                        value={formData.clientEmail}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            clientEmail: e.target.value,
                          }))
                        }
                        className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${themeClasses.input}`}
                      />
                    </div>

                    <div>
                      <label
                        className={`block text-sm font-medium ${themeClasses.textSecondary}`}
                      >
                        Client Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.clientPhone}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            clientPhone: e.target.value,
                          }))
                        }
                        className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${themeClasses.input}`}
                      />
                    </div>
                  </div>

                  {/* Business Information */}
                  <div className="space-y-4">
                    <h3
                      className={`flex items-center text-lg font-medium ${themeClasses.text}`}
                    >
                      <Building className="mr-2 h-5 w-5" />
                      Business Information
                    </h3>

                    <div>
                      <label
                        className={`block text-sm font-medium ${themeClasses.textSecondary}`}
                      >
                        Business Name
                      </label>
                      <input
                        type="text"
                        value={formData.businessName}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            businessName: e.target.value,
                          }))
                        }
                        className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${themeClasses.input}`}
                      />
                    </div>

                    <div>
                      <label
                        className={`block text-sm font-medium ${themeClasses.textSecondary}`}
                      >
                        Business Email
                      </label>
                      <input
                        type="email"
                        value={formData.businessEmail}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            businessEmail: e.target.value,
                          }))
                        }
                        className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${themeClasses.input}`}
                      />
                    </div>

                    <div>
                      <label
                        className={`block text-sm font-medium ${themeClasses.textSecondary}`}
                      >
                        Business Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.businessPhone}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            businessPhone: e.target.value,
                          }))
                        }
                        className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${themeClasses.input}`}
                      />
                    </div>

                    <div>
                      <label
                        className={`block text-sm font-medium ${themeClasses.textSecondary}`}
                      >
                        Business Address
                      </label>
                      <textarea
                        value={formData.businessAddress}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            businessAddress: e.target.value,
                          }))
                        }
                        rows={3}
                        className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${themeClasses.input}`}
                      />
                    </div>

                    {/* Logo Upload Section - moved here */}
                    <div>
                      <label
                        className={`block text-sm font-medium ${themeClasses.textSecondary}`}
                      >
                        Business Logo (optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        ref={logoInputRef}
                        onChange={handleLogoUpload}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {logoDataUrl && (
                        <div className="mt-2 flex items-center gap-2">
                          <img
                            src={logoDataUrl}
                            alt="Logo preview"
                            className="h-16 w-auto object-contain rounded shadow border"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setLogoDataUrl(null);
                              if (logoInputRef.current)
                                logoInputRef.current.value = "";
                            }}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Invoice Details */}
                <div className="space-y-4">
                  <h3
                    className={`flex items-center text-lg font-medium ${themeClasses.text}`}
                  >
                    <Calendar className="mr-2 h-5 w-5" />
                    Invoice Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        className={`block text-sm font-medium ${themeClasses.textSecondary}`}
                      >
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            dueDate: e.target.value,
                          }))
                        }
                        className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${themeClasses.input}`}
                      />
                    </div>

                    <div>
                      <label
                        className={`block text-sm font-medium ${themeClasses.textSecondary}`}
                      >
                        Period
                      </label>
                      <input
                        type="text"
                        value={`${formatDate(
                          new Date(periodStart)
                        )} - ${formatDate(new Date(periodEnd))}`}
                        readOnly
                        className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${themeClasses.input} opacity-75 cursor-not-allowed`}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium ${themeClasses.textSecondary}`}
                    >
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Add any additional notes or terms..."
                      className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${themeClasses.input}`}
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-sm font-medium ${themeClasses.textSecondary} mb-3`}
                    >
                      Invoice Style
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        {
                          value: "detailed",
                          label: "Detailed",
                          description:
                            "Show all time entries with descriptions",
                          icon: "📄",
                          features: [
                            "Individual time entries",
                            "Full descriptions",
                            "Date breakdown",
                          ],
                        },
                        {
                          value: "summary",
                          label: "Summary",
                          description: "Group by project, show totals only",
                          icon: "📊",
                          features: [
                            "Grouped by project",
                            "Total hours per project",
                            "Clean overview",
                          ],
                        },
                        {
                          value: "compact",
                          label: "Compact",
                          description: "Minimal format with period totals",
                          icon: "📋",
                          features: [
                            "Minimal design",
                            "Period totals",
                            "Quick overview",
                          ],
                        },
                      ].map((style) => (
                        <div
                          key={style.value}
                          className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                            formData.invoiceStyle === style.value
                              ? themeType === "dark"
                                ? "border-blue-500 bg-blue-900/20"
                                : "border-blue-500 bg-blue-50"
                              : themeType === "dark"
                              ? "border-gray-600 bg-gray-700/50 hover:border-gray-500"
                              : "border-gray-200 bg-gray-50 hover:border-gray-300"
                          }`}
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              invoiceStyle: style.value as InvoiceStyle,
                            }))
                          }
                        >
                          <div className="flex items-start space-x-3">
                            <div className="text-2xl">{style.icon}</div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  name="invoiceStyle"
                                  value={style.value}
                                  checked={
                                    formData.invoiceStyle === style.value
                                  }
                                  onChange={() => {}}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                />
                                <h4
                                  className={`font-medium ${themeClasses.text}`}
                                >
                                  {style.label}
                                </h4>
                              </div>
                              <p
                                className={`text-sm mt-1 ${themeClasses.textSecondary}`}
                              >
                                {style.description}
                              </p>
                              <ul
                                className={`text-xs mt-2 space-y-1 ${themeClasses.textSecondary}`}
                              >
                                {style.features.map((feature, index) => (
                                  <li
                                    key={index}
                                    className="flex items-center space-x-1"
                                  >
                                    <span className="text-green-500">•</span>
                                    <span>{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Preview */}
            {step === "preview" && invoice && (
              <div className="space-y-6">
                {/* Invoice Header with Logo */}
                <div className="flex items-center border-b pb-4">
                  {logoDataUrl ? (
                    <img
                      src={logoDataUrl}
                      alt="Logo"
                      className="h-16 w-auto object-contain mr-4 rounded shadow border"
                    />
                  ) : (
                    <div className="h-16 w-16 mr-4 bg-gray-100 rounded flex items-center justify-center text-gray-400 border">
                      No Logo
                    </div>
                  )}
                  <div className="flex-1 text-center">
                    <h1 className={`text-2xl font-bold ${themeClasses.text}`}>
                      INVOICE
                    </h1>
                    <p className={`text-lg ${themeClasses.textSecondary}`}>
                      {invoice.invoiceNumber}
                    </p>
                  </div>
                </div>

                {/* Invoice Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className={`font-semibold mb-2 ${themeClasses.text}`}>
                      From:
                    </h3>
                    {invoice.businessName && (
                      <p className={themeClasses.textSecondary}>
                        {invoice.businessName}
                      </p>
                    )}
                    {invoice.businessEmail && (
                      <p className={themeClasses.textSecondary}>
                        {invoice.businessEmail}
                      </p>
                    )}
                    {invoice.businessPhone && (
                      <p className={themeClasses.textSecondary}>
                        {invoice.businessPhone}
                      </p>
                    )}
                    {invoice.businessAddress && (
                      <p
                        className={`whitespace-pre-line ${themeClasses.textSecondary}`}
                      >
                        {invoice.businessAddress}
                      </p>
                    )}
                  </div>

                  <div>
                    <h3 className={`font-semibold mb-2 ${themeClasses.text}`}>
                      To:
                    </h3>
                    <p className={themeClasses.textSecondary}>
                      {invoice.clientName}
                    </p>
                    {invoice.clientEmail && (
                      <p className={themeClasses.textSecondary}>
                        {invoice.clientEmail}
                      </p>
                    )}
                    {invoice.clientPhone && (
                      <p className={themeClasses.textSecondary}>
                        {invoice.clientPhone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className={`font-medium ${themeClasses.text}`}>
                      Invoice Date:
                    </span>
                    <p className={themeClasses.textSecondary}>
                      {formatDate(new Date(invoice.dateCreated))}
                    </p>
                  </div>
                  <div>
                    <span className={`font-medium ${themeClasses.text}`}>
                      Due Date:
                    </span>
                    <p className={themeClasses.textSecondary}>
                      {formatDate(new Date(invoice.dueDate))}
                    </p>
                  </div>
                  <div>
                    <span className={`font-medium ${themeClasses.text}`}>
                      Period:
                    </span>
                    <p className={themeClasses.textSecondary}>
                      {formatDate(new Date(invoice.periodStart))} -{" "}
                      {formatDate(new Date(invoice.periodEnd))}
                    </p>
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-semibold ${themeClasses.text}`}>
                      Services
                    </h3>
                    <div
                      className={`flex items-center space-x-2 text-sm ${themeClasses.textSecondary}`}
                    >
                      <Layout className="h-4 w-4" />
                      <span className="capitalize">
                        {formData.invoiceStyle} Style
                      </span>
                    </div>
                  </div>

                  {formData.invoiceStyle === "detailed" && (
                    <>
                      {groupLineItemsByProject(invoice.lineItems).map(
                        (group, index) => (
                          <div
                            key={index}
                            className={`border rounded-lg p-4 ${
                              themeType === "dark"
                                ? "border-gray-700"
                                : "border-gray-200"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h4
                                className={`font-medium ${themeClasses.text}`}
                              >
                                {group.projectName}
                              </h4>
                              <div
                                className={`text-sm ${themeClasses.textSecondary}`}
                              >
                                {group.totalHours.toFixed(2)} hours
                              </div>
                            </div>

                            <div className="space-y-2">
                              {group.items.map((item, itemIndex) => (
                                <div
                                  key={itemIndex}
                                  className="grid grid-cols-1 md:grid-cols-5 gap-2 text-sm"
                                >
                                  <div className={themeClasses.textSecondary}>
                                    {item.date}
                                  </div>
                                  <div
                                    className={`md:col-span-2 ${themeClasses.text}`}
                                  >
                                    {item.description}
                                  </div>
                                  <div className={themeClasses.textSecondary}>
                                    {secondsToHMS(item.duration)} (
                                    {item.quantity.toFixed(2)}h)
                                  </div>
                                  <div
                                    className={`text-right ${themeClasses.text}`}
                                  >
                                    {formatCurrency(
                                      item.amount,
                                      invoice.currency
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div
                              className={`mt-3 pt-3 border-t text-right ${
                                themeType === "dark"
                                  ? "border-gray-700"
                                  : "border-gray-200"
                              }`}
                            >
                              <span
                                className={`font-medium ${themeClasses.text}`}
                              >
                                Project Total:{" "}
                                {formatCurrency(
                                  group.totalAmount,
                                  invoice.currency
                                )}
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </>
                  )}

                  {formData.invoiceStyle === "summary" && (
                    <div
                      className={`border rounded-lg p-4 ${
                        themeType === "dark"
                          ? "border-gray-700"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                        <div className={`font-medium ${themeClasses.text}`}>
                          Project
                        </div>
                        <div className={`font-medium ${themeClasses.text}`}>
                          Hours
                        </div>
                        <div className={`font-medium ${themeClasses.text}`}>
                          Rate
                        </div>
                        <div
                          className={`font-medium ${themeClasses.text} text-right`}
                        >
                          Amount
                        </div>
                      </div>
                      {groupLineItemsByProject(invoice.lineItems).map(
                        (group, index) => {
                          const avgRate = group.totalAmount / group.totalHours;
                          return (
                            <div
                              key={index}
                              className="grid grid-cols-1 md:grid-cols-4 gap-4 py-2 text-sm"
                            >
                              <div className={themeClasses.text}>
                                {group.projectName}
                              </div>
                              <div className={themeClasses.textSecondary}>
                                {group.totalHours.toFixed(2)}h
                              </div>
                              <div className={themeClasses.textSecondary}>
                                ${avgRate.toFixed(2)}/hr
                              </div>
                              <div
                                className={`text-right ${themeClasses.text}`}
                              >
                                {formatCurrency(
                                  group.totalAmount,
                                  invoice.currency
                                )}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}

                  {formData.invoiceStyle === "compact" && (
                    <div
                      className={`border rounded-lg p-4 ${
                        themeType === "dark"
                          ? "border-gray-700"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className={`font-medium ${themeClasses.text}`}>
                            Professional Services
                          </h4>
                          <p
                            className={`text-sm ${themeClasses.textSecondary}`}
                          >
                            {formatDate(new Date(invoice.periodStart))} -{" "}
                            {formatDate(new Date(invoice.periodEnd))}
                          </p>
                          <p
                            className={`text-sm ${themeClasses.textSecondary}`}
                          >
                            Total:{" "}
                            {invoice.lineItems
                              .reduce((sum, item) => sum + item.quantity, 0)
                              .toFixed(2)}{" "}
                            hours
                          </p>
                        </div>
                        <div
                          className={`text-xl font-semibold ${themeClasses.text}`}
                        >
                          {formatCurrency(invoice.subtotal, invoice.currency)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div
                  className={`border-t pt-4 ${
                    themeType === "dark" ? "border-gray-700" : "border-gray-200"
                  }`}
                >
                  <div className="space-y-2 text-right">
                    <div className="flex justify-between">
                      <span className={themeClasses.textSecondary}>
                        Subtotal:
                      </span>
                      <span className={themeClasses.text}>
                        {formatCurrency(invoice.subtotal, invoice.currency)}
                      </span>
                    </div>
                    {invoice.taxAmount > 0 && (
                      <div className="flex justify-between">
                        <span className={themeClasses.textSecondary}>
                          Tax ({invoice.taxRate}%):
                        </span>
                        <span className={themeClasses.text}>
                          {formatCurrency(invoice.taxAmount, invoice.currency)}
                        </span>
                      </div>
                    )}
                    <div
                      className={`flex justify-between text-lg font-semibold border-t pt-2 ${
                        themeType === "dark"
                          ? "border-gray-700"
                          : "border-gray-200"
                      }`}
                    >
                      <span className={themeClasses.text}>Total:</span>
                      <span className={themeClasses.text}>
                        {formatCurrency(invoice.total, invoice.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                  <div
                    className={`border-t pt-4 ${
                      themeType === "dark"
                        ? "border-gray-700"
                        : "border-gray-200"
                    }`}
                  >
                    <h3 className={`font-semibold mb-2 ${themeClasses.text}`}>
                      Notes:
                    </h3>
                    <p
                      className={`whitespace-pre-line ${themeClasses.textSecondary}`}
                    >
                      {invoice.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className={`flex items-center justify-between border-t p-4 ${
              themeType === "dark" ? "border-gray-700" : "border-gray-200"
            }`}
          >
            <div className="flex space-x-2">
              {step !== "setup" && (
                <button
                  onClick={() =>
                    setStep(step === "preview" ? "setup" : "preview")
                  }
                  className={`px-4 py-2 rounded-lg border transition-colors ${themeClasses.secondaryButton}`}
                >
                  Back
                </button>
              )}
            </div>

            <div className="flex space-x-2">
              {step === "setup" && (
                <button
                  onClick={handleGenerateInvoice}
                  disabled={!formData.clientName || loading}
                  className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${themeClasses.button}`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" />
                      Preview Invoice
                    </>
                  )}
                </button>
              )}

              {step === "preview" && (
                <>
                  <button
                    onClick={handleExportText}
                    className={`px-4 py-2 rounded-lg border transition-colors ${themeClasses.secondaryButton}`}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Export Text
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className={`px-4 py-2 rounded-lg border transition-colors ${themeClasses.secondaryButton}`}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className={`px-4 py-2 rounded-lg transition-colors ${themeClasses.button}`}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    Export PDF
                  </button>
                </>
              )}

              <button
                onClick={onClose}
                className={`px-4 py-2 rounded-lg border transition-colors ${themeClasses.secondaryButton}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceGeneratorModal;
