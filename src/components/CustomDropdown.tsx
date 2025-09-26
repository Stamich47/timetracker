import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface DropdownOption {
  value: string;
  label: string;
  element?: React.ReactNode;
}

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select option",
  className = "",
  size = "md",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Reset focused index when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setFocusedIndex(-1);
    } else {
      // Set focused index to current selected option when opening
      const selectedIndex = options.findIndex(
        (option) => option.value === value
      );
      setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [isOpen, value, options]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) {
      // Handle opening the dropdown
      if (
        event.key === "Enter" ||
        event.key === " " ||
        event.key === "ArrowDown"
      ) {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    // Handle navigation within open dropdown
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % options.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + options.length) % options.length);
        break;
      case "Home":
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case "End":
        event.preventDefault();
        setFocusedIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          onChange(options[focusedIndex].value);
          setIsOpen(false);
        }
        break;
      case "Escape":
        event.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
    }
  };

  const selectedOption = options.find((option) => option.value === value);

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return {
          button: "px-2 py-1.5 text-xs",
          dropdown: "py-1",
          option: "px-2 py-1.5 text-xs",
          icon: "w-3 h-3",
        };
      case "lg":
        return {
          button: "px-4 py-3 text-base",
          dropdown: "py-2",
          option: "px-4 py-3 text-base",
          icon: "w-5 h-5",
        };
      default:
        return {
          button: "px-3 py-2 text-sm",
          dropdown: "py-1",
          option: "px-3 py-2 text-sm",
          icon: "w-4 h-4",
        };
    }
  };

  const sizeClasses = getSizeClasses();

  // Check if height is specified in className prop
  const hasHeightClass = className.includes("h-");
  const buttonHeightClass = hasHeightClass ? "h-full" : "";

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`
          w-full ${sizeClasses.button} ${buttonHeightClass}
          bg-surface backdrop-blur-sm
          border border-theme rounded-lg
          hover:bg-surface-hover hover:border-theme
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-all duration-200
          flex items-center justify-between gap-2
          text-left font-medium text-primary
          shadow-sm hover:shadow-md
        `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={
          selectedOption
            ? `Selected: ${selectedOption.label}. Click to change selection.`
            : `Select an option. ${options.length} options available.`
        }
        id={`dropdown-button-${Math.random().toString(36).substr(2, 9)}`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`${
            sizeClasses.icon
          } text-muted transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-labelledby={`dropdown-button-${Math.random()
            .toString(36)
            .substr(2, 9)}`}
          onKeyDown={handleKeyDown}
          className="absolute z-[100] w-full mt-1 bg-surface border border-theme rounded-lg shadow-xl backdrop-blur-sm overflow-auto scrollbar-thin"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
            boxShadow:
              "0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)",
            maxHeight: options.length > 4 ? "12rem" : "auto", // Show ~4 items before scrolling
          }}
        >
          <div className={sizeClasses.dropdown}>
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={value === option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full ${sizeClasses.option} text-left
                  hover:bg-surface-hover
                  focus:outline-none focus:bg-surface-hover
                  transition-colors duration-150
                  ${value === option.value ? "font-medium" : ""}
                  ${focusedIndex === index ? "bg-surface-hover" : ""}
                `}
                style={{
                  backgroundColor:
                    value === option.value
                      ? "var(--color-blueSelection)"
                      : focusedIndex === index
                      ? "var(--color-surface-hover)"
                      : undefined,
                  color:
                    value === option.value
                      ? "var(--color-blueText)"
                      : "var(--color-textPrimary)",
                }}
              >
                {option.element || option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
