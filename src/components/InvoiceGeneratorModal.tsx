import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  Download,
  Eye,
  Calendar,
  User,
  Building,
  Loader2,
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
    groupByProject: true,
  });

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && selectedClientId) {
      // Find client info from projects
      const clientProjects = projects.filter(
        (p) => p.client_id === selectedClientId
      );
      const clientName = clientProjects[0]?.client?.name || "";

      setFormData((prev) => ({
        ...prev,
        clientName,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      }));
    }
  }, [isOpen, selectedClientId, projects]);

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
                </div>
              </div>
            )}

            {/* Step 2: Preview */}
            {step === "preview" && invoice && (
              <div className="space-y-6">
                {/* Invoice Header */}
                <div className="text-center border-b pb-4">
                  <h1 className={`text-2xl font-bold ${themeClasses.text}`}>
                    INVOICE
                  </h1>
                  <p className={`text-lg ${themeClasses.textSecondary}`}>
                    {invoice.invoiceNumber}
                  </p>
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
                  <h3 className={`font-semibold ${themeClasses.text}`}>
                    Services
                  </h3>

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
                          <h4 className={`font-medium ${themeClasses.text}`}>
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
                                {formatCurrency(item.amount, invoice.currency)}
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
                          <span className={`font-medium ${themeClasses.text}`}>
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
                    className={`px-4 py-2 rounded-lg transition-colors ${themeClasses.button}`}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
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
