import React from "react";

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onSave,
  onDiscard,
  onCancel,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-theme rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center">
        <h2 className="text-xl font-bold text-primary mb-2">Unsaved Changes</h2>
        <p className="text-secondary mb-6 text-center">
          You have unsaved changes. What would you like to do?
        </p>
        <div className="flex flex-col gap-2 w-full">
          <button className="btn-primary w-full" onClick={onSave}>
            Save and Leave
          </button>
          <button className="btn-secondary w-full" onClick={onDiscard}>
            Discard Changes
          </button>
          <button className="btn-tertiary w-full" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesModal;
