import React, { useState } from "react";
import {
  X,
  Target,
  Clock,
  DollarSign,
  FolderOpen,
  Zap,
  Check,
  Lightbulb,
} from "lucide-react";
import { useGoals } from "../hooks/useGoals";
import {
  GOAL_TEMPLATES,
  type GoalType,
  type TimeGoalPeriod,
} from "../lib/goals";
import type { CreateGoalData } from "../lib/goalsApi";

interface GoalCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GoalCreationModal: React.FC<GoalCreationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { createGoal } = useGoals();
  const [step, setStep] = useState<"template" | "customize">("template");
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [goalData, setGoalData] = useState<
    Partial<CreateGoalData & { templateId?: string }>
  >({
    type: "time",
    priority: "medium",
  });

  if (!isOpen) return null;

  const handleTemplateSelect = (templateId: string) => {
    const template = GOAL_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setGoalData({
        ...template.defaultConfig,
        name: template.name,
        description: template.description,
        templateId,
      });
      setStep("customize");
    }
  };

  const handleCustomGoal = () => {
    setGoalData({
      type: "time",
      priority: "medium",
      templateId: undefined,
    });
    setStep("customize");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalData.name || !goalData.type) return;

    setIsCreating(true);
    try {
      await createGoal(goalData as CreateGoalData);
      onClose();
      // Reset form
      setStep("template");
      setGoalData({ type: "time", priority: "medium" });
    } catch (error) {
      console.error("Failed to create goal:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const updateGoalData = (
    field: keyof CreateGoalData,
    value: string | number | boolean | undefined
  ) => {
    setGoalData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-primary flex items-center">
              <Target className="h-6 w-6 mr-2" />
              Create New Goal
            </h2>
            <p className="text-secondary mt-1">
              {step === "template"
                ? "Choose a template or create custom"
                : "Customize your goal settings"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === "template" ? (
            <div className="space-y-6">
              {/* Quick Templates */}
              <div>
                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Quick Templates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {GOAL_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template.id)}
                      className="card p-4 hover:shadow-md transition-shadow text-left border-2 border-transparent hover:border-primary"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-primary">
                          {template.name}
                        </h4>
                        {template.type === "time" && (
                          <Clock className="h-4 w-4 text-blue-500" />
                        )}
                        {template.type === "revenue" && (
                          <DollarSign className="h-4 w-4 text-green-500" />
                        )}
                        {template.type === "project" && (
                          <FolderOpen className="h-4 w-4 text-purple-500" />
                        )}
                      </div>
                      <p className="text-sm text-secondary">
                        {template.description}
                      </p>
                      <div className="mt-2 text-xs text-primary font-medium">
                        {template.category}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Goal */}
              <div className="border-t pt-6">
                <button
                  onClick={handleCustomGoal}
                  className="w-full card p-4 hover:shadow-md transition-shadow text-left border-2 border-dashed border-gray-300 hover:border-primary"
                >
                  <div className="flex items-center">
                    <Lightbulb className="h-5 w-5 mr-3 text-secondary" />
                    <div>
                      <h4 className="font-medium text-primary">
                        Create Custom Goal
                      </h4>
                      <p className="text-sm text-secondary">
                        Build your own goal from scratch
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Goal Name */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Goal Name *
                </label>
                <input
                  type="text"
                  value={goalData.name || ""}
                  onChange={(e) => updateGoalData("name", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., Monthly Billable Hours"
                  required
                />
              </div>

              {/* Goal Type */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Goal Type *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "time", label: "Time", icon: Clock },
                    { value: "revenue", label: "Revenue", icon: DollarSign },
                    { value: "project", label: "Project", icon: FolderOpen },
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateGoalData("type", value as GoalType)}
                      className={`p-3 border rounded-lg text-center transition-colors ${
                        goalData.type === value
                          ? "border-primary bg-primary bg-opacity-10 text-primary"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
                      }`}
                    >
                      <Icon className="h-5 w-5 mx-auto mb-1" />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Type-specific fields */}
              {goalData.type === "time" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Period
                    </label>
                    <select
                      value={goalData.period || "weekly"}
                      onChange={(e) =>
                        updateGoalData(
                          "period",
                          e.target.value as TimeGoalPeriod
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {goalData.templateId === "productivity-goal" ? (
                        <>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </>
                      ) : (
                        <>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="yearly">Yearly</option>
                          <option value="custom">Custom Range</option>
                        </>
                      )}
                    </select>
                  </div>
                  {goalData.period === "custom" && (
                    <div className="col-span-2 grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          Start Date *
                        </label>
                        <input
                          type="date"
                          value={goalData.startDate || ""}
                          onChange={(e) =>
                            updateGoalData("startDate", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          End Date *
                        </label>
                        <input
                          type="date"
                          value={goalData.endDate || ""}
                          onChange={(e) =>
                            updateGoalData("endDate", e.target.value)
                          }
                          min={goalData.startDate}
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Target Hours
                    </label>
                    <input
                      type="number"
                      value={goalData.targetHours || ""}
                      onChange={(e) =>
                        updateGoalData(
                          "targetHours",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="160"
                      min="1"
                      required
                    />
                  </div>
                </div>
              )}

              {goalData.type === "revenue" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Period
                    </label>
                    <select
                      value={goalData.period || "monthly"}
                      onChange={(e) =>
                        updateGoalData(
                          "period",
                          e.target.value as TimeGoalPeriod
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      {goalData.templateId === "revenue-target" ? (
                        <>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="yearly">Annually</option>
                          <option value="custom">Custom Range</option>
                        </>
                      ) : (
                        <>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="yearly">Yearly</option>
                          <option value="custom">Custom Range</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Target Amount ($)
                    </label>
                    <input
                      type="number"
                      value={goalData.targetAmount || ""}
                      onChange={(e) =>
                        updateGoalData(
                          "targetAmount",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="5000"
                      min="1"
                      required
                    />
                  </div>
                  {goalData.period === "custom" && (
                    <div className="col-span-2 grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          Start Date *
                        </label>
                        <input
                          type="date"
                          value={goalData.startDate || ""}
                          onChange={(e) =>
                            updateGoalData("startDate", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          End Date *
                        </label>
                        <input
                          type="date"
                          value={goalData.endDate || ""}
                          onChange={(e) =>
                            updateGoalData("endDate", e.target.value)
                          }
                          min={goalData.startDate}
                          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {goalData.type === "project" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Target Hours (Optional)
                    </label>
                    <input
                      type="number"
                      value={goalData.targetHours || ""}
                      onChange={(e) =>
                        updateGoalData(
                          "targetHours",
                          parseFloat(e.target.value) || undefined
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="80"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Due Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={goalData.targetCompletionDate || ""}
                      onChange={(e) =>
                        updateGoalData("targetCompletionDate", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Priority
                </label>
                <div className="flex gap-3">
                  {["low", "medium", "high"].map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() =>
                        updateGoalData(
                          "priority",
                          priority as "low" | "medium" | "high"
                        )
                      }
                      className={`px-4 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                        goalData.priority === priority
                          ? "border-primary bg-primary bg-opacity-10 text-primary"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-800"
                      }`}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={goalData.description || ""}
                  onChange={(e) =>
                    updateGoalData("description", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={3}
                  placeholder="Describe your goal..."
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          {step === "customize" && (
            <button
              onClick={() => setStep("template")}
              className="px-4 py-2 text-secondary hover:text-primary transition-colors"
            >
              Back to Templates
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-secondary hover:text-primary transition-colors"
          >
            Cancel
          </button>
          {step === "customize" && (
            <button
              onClick={handleSubmit}
              disabled={isCreating || !goalData.name}
              className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Create Goal
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoalCreationModal;
