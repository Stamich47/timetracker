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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full ${sizeClasses.button} 
          bg-white bg-opacity-90 backdrop-blur-sm
          border border-gray-300 rounded-lg
          hover:bg-opacity-100 hover:border-gray-400
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          transition-all duration-200
          flex items-center justify-between gap-2
          text-left font-medium text-gray-700
          shadow-sm hover:shadow-md
        `}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`${
            sizeClasses.icon
          } text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white bg-opacity-95 backdrop-blur-sm border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          <div className={sizeClasses.dropdown}>
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full ${sizeClasses.option} text-left
                  hover:bg-blue-50 hover:bg-opacity-80
                  focus:outline-none focus:bg-blue-50 focus:bg-opacity-80
                  transition-colors duration-150
                  ${
                    value === option.value
                      ? "bg-blue-100 bg-opacity-60 text-blue-700 font-medium"
                      : "text-gray-700"
                  }
                `}
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
