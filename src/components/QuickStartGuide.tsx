import React, { useState, useEffect } from "react";
import {
  X,
  ChevronRight,
  Clock,
  Users,
  FileText,
  Settings,
  CheckCircle,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";

interface QuickStartGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const QuickStartGuide: React.FC<QuickStartGuideProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const { themeType } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;

      // Prevent scrolling without changing position
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = "15px"; // Prevent layout shift from scrollbar

      // Handle escape key
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          onClose();
        }
      };

      document.addEventListener("keydown", handleEscape);

      return () => {
        // Restore original styles when modal closes
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";

        // Maintain scroll position
        window.scrollTo(0, scrollY);

        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isOpen, onClose]);

  const steps = [
    {
      title: "Welcome to Time Tracker",
      description: "Let's get you started with tracking your time efficiently.",
      icon: Clock,
      content: (
        <div className="space-y-4">
          <p
            className={`${
              themeType === "dark" ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Time Tracker helps you monitor your work hours, manage projects, and
            generate professional invoices.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={`p-4 rounded-lg ${
                themeType === "dark" ? "bg-gray-700" : "bg-blue-50"
              }`}
            >
              <h4
                className={`font-medium mb-2 ${
                  themeType === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                Track Time
              </h4>
              <p
                className={`text-sm ${
                  themeType === "dark" ? "text-gray-300" : "text-gray-600"
                }`}
              >
                Start/stop timers for different projects and tasks
              </p>
            </div>
            <div
              className={`p-4 rounded-lg ${
                themeType === "dark" ? "bg-gray-700" : "bg-green-50"
              }`}
            >
              <h4
                className={`font-medium mb-2 ${
                  themeType === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                Generate Invoices
              </h4>
              <p
                className={`text-sm ${
                  themeType === "dark" ? "text-gray-300" : "text-gray-600"
                }`}
              >
                Create professional invoices from your tracked time
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Create Your First Client",
      description: "Add a client to organize your projects and billing.",
      icon: Users,
      content: (
        <div className="space-y-4">
          <p
            className={`${
              themeType === "dark" ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Clients help you organize your work and generate accurate invoices.
          </p>
          <div
            className={`p-4 rounded-lg border ${
              themeType === "dark"
                ? "bg-gray-700 border-gray-600"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <h4
              className={`font-medium mb-2 ${
                themeType === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              Steps to add a client:
            </h4>
            <ol
              className={`list-decimal list-inside space-y-1 text-sm ${
                themeType === "dark" ? "text-gray-300" : "text-gray-600"
              }`}
            >
              <li>Go to the "Clients" tab</li>
              <li>Click "Add Client"</li>
              <li>Fill in client details (name, email, etc.)</li>
              <li>Set billing preferences</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      title: "Set Up Your First Project",
      description: "Create a project to start tracking time.",
      icon: FileText,
      content: (
        <div className="space-y-4">
          <p
            className={`${
              themeType === "dark" ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Projects help you organize your time entries and set billing rates.
          </p>
          <div
            className={`p-4 rounded-lg border ${
              themeType === "dark"
                ? "bg-gray-700 border-gray-600"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <h4
              className={`font-medium mb-2 ${
                themeType === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              Project setup tips:
            </h4>
            <ul
              className={`list-disc list-inside space-y-1 text-sm ${
                themeType === "dark" ? "text-gray-300" : "text-gray-600"
              }`}
            >
              <li>Choose a descriptive project name</li>
              <li>Select the appropriate client</li>
              <li>Set your hourly rate for billing</li>
              <li>Choose a color for easy identification</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: "Configure Your Settings",
      description: "Customize your workspace and billing preferences.",
      icon: Settings,
      content: (
        <div className="space-y-4">
          <p
            className={`${
              themeType === "dark" ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Personalize your experience and set up billing defaults.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={`p-4 rounded-lg ${
                themeType === "dark" ? "bg-gray-700" : "bg-purple-50"
              }`}
            >
              <h4
                className={`font-medium mb-2 ${
                  themeType === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                Personal Settings
              </h4>
              <ul
                className={`text-sm space-y-1 ${
                  themeType === "dark" ? "text-gray-300" : "text-gray-600"
                }`}
              >
                <li>• Choose theme (Dark/Light)</li>
                <li>• Set timezone</li>
                <li>• Configure date formats</li>
              </ul>
            </div>
            <div
              className={`p-4 rounded-lg ${
                themeType === "dark" ? "bg-gray-700" : "bg-orange-50"
              }`}
            >
              <h4
                className={`font-medium mb-2 ${
                  themeType === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                Billing Settings
              </h4>
              <ul
                className={`text-sm space-y-1 ${
                  themeType === "dark" ? "text-gray-300" : "text-gray-600"
                }`}
              >
                <li>• Default hourly rate</li>
                <li>• Currency preference</li>
                <li>• Tax rate setup</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "You're All Set!",
      description: "Start tracking time and building your business.",
      icon: CheckCircle,
      content: (
        <div className="space-y-4">
          <p
            className={`${
              themeType === "dark" ? "text-gray-300" : "text-gray-600"
            }`}
          >
            Congratulations! You're ready to start using Time Tracker
            effectively.
          </p>
          <div
            className={`p-4 rounded-lg border ${
              themeType === "dark"
                ? "bg-green-900/20 border-green-700"
                : "bg-green-50 border-green-200"
            }`}
          >
            <h4
              className={`font-medium mb-2 ${
                themeType === "dark" ? "text-green-300" : "text-green-800"
              }`}
            >
              Next Steps:
            </h4>
            <ul
              className={`list-disc list-inside space-y-1 text-sm ${
                themeType === "dark" ? "text-green-200" : "text-green-700"
              }`}
            >
              <li>Click the timer button to start tracking</li>
              <li>Add descriptions to your time entries</li>
              <li>Review your time in the Reports section</li>
              <li>Generate your first invoice when ready</li>
            </ul>
          </div>
          <div
            className={`p-4 rounded-lg ${
              themeType === "dark" ? "bg-blue-900/20" : "bg-blue-50"
            }`}
          >
            <p
              className={`text-sm ${
                themeType === "dark" ? "text-blue-200" : "text-blue-700"
              }`}
            >
              💡 Tip: Navigate to the Timer tab to access the start/stop timer
              controls and project selection!
            </p>
          </div>
        </div>
      ),
    },
  ];

  const markStepComplete = (stepIndex: number) => {
    setCompletedSteps((prev) => new Set([...prev, stepIndex]));
  };

  const handleNext = () => {
    markStepComplete(currentStep);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-2xl rounded-xl border shadow-xl overflow-hidden ${
          themeType === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        }`}
        style={{
          maxHeight: "90vh",
          position: "relative",
          zIndex: 1,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-start-title"
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-6 border-b ${
            themeType === "dark" ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-lg ${
                themeType === "dark" ? "bg-blue-900/30" : "bg-blue-100"
              }`}
            >
              <StepIcon
                className={`h-6 w-6 ${
                  themeType === "dark" ? "text-blue-400" : "text-blue-600"
                }`}
              />
            </div>
            <div>
              <h2
                id="quick-start-title"
                className={`text-lg font-semibold ${
                  themeType === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                {currentStepData.title}
              </h2>
              <p
                className={`text-sm ${
                  themeType === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Step {currentStep + 1} of {steps.length}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              themeType === "dark"
                ? "hover:bg-gray-700 text-gray-400 hover:text-white"
                : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div
          className={`px-6 py-4 border-b ${
            themeType === "dark" ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div
            className={`w-full bg-gray-200 rounded-full h-2 ${
              themeType === "dark" ? "bg-gray-700" : "bg-gray-200"
            }`}
          >
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${((currentStep + 1) / steps.length) * 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`flex items-center space-x-1 text-xs ${
                  index <= currentStep
                    ? themeType === "dark"
                      ? "text-blue-400"
                      : "text-blue-600"
                    : themeType === "dark"
                    ? "text-gray-500"
                    : "text-gray-400"
                }`}
              >
                {completedSteps.has(index) ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <div
                    className={`h-3 w-3 rounded-full ${
                      index <= currentStep
                        ? "bg-blue-600"
                        : themeType === "dark"
                        ? "bg-gray-600"
                        : "bg-gray-300"
                    }`}
                  />
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div
          className="p-6 overflow-y-auto"
          style={{ maxHeight: "calc(90vh - 200px)" }}
        >
          <div className="mb-4">
            <p
              className={`text-sm ${
                themeType === "dark" ? "text-gray-300" : "text-gray-600"
              }`}
            >
              {currentStepData.description}
            </p>
          </div>
          {currentStepData.content}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between p-6 border-t ${
            themeType === "dark" ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              currentStep === 0
                ? themeType === "dark"
                  ? "text-gray-500 cursor-not-allowed"
                  : "text-gray-400 cursor-not-allowed"
                : themeType === "dark"
                ? "text-gray-300 hover:bg-gray-700"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            Previous
          </button>

          <div className="text-xs text-center">
            <span
              className={
                themeType === "dark" ? "text-gray-400" : "text-gray-500"
              }
            >
              You can always access this guide from Settings
            </span>
          </div>

          <button
            onClick={handleNext}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1"
          >
            <span>
              {currentStep === steps.length - 1 ? "Get Started" : "Next"}
            </span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickStartGuide;
