import React from "react";
import { useTheme } from "../hooks/useTheme";
import { Heart } from "lucide-react";

const Footer: React.FC = () => {
  const { themeType } = useTheme();
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={`mt-auto border-t ${
        themeType === "dark"
          ? "bg-gray-900 border-gray-700 text-gray-300"
          : "bg-gray-50 border-gray-200 text-gray-600"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Desktop layout - 3 column grid */}
        <div className="hidden sm:grid sm:grid-cols-3 sm:items-center">
          {/* Left side - Copyright */}
          <div className="flex items-center space-x-2 text-sm">
            <span>© {currentYear} Time Tracker.</span>
            <span>All rights reserved.</span>
          </div>

          {/* Center - Powered by */}
          <div className="flex items-center justify-center space-x-2 text-sm">
            <span className="flex items-center space-x-1">
              <span>Designed with</span>
              <Heart
                className={`h-4 w-4 fill-current ${
                  themeType === "dark" ? "text-rose-400/70" : "text-rose-500/70"
                }`}
              />
              <span>by</span>
            </span>
            <a
              href="https://mjswebdesign.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center font-medium transition-colors ${
                themeType === "dark"
                  ? "text-blue-400 hover:text-blue-300"
                  : "text-blue-600 hover:text-blue-700"
              }`}
            >
              <span>MJS Web Design</span>
            </a>
          </div>

          {/* Right side - Version */}
          <div className="flex items-center justify-end space-x-4 text-sm">
            <span
              className={`${
                themeType === "dark" ? "text-gray-400" : "text-gray-500"
              }`}
            >
              v1.0.0
            </span>
          </div>
        </div>

        {/* Mobile layout - stacked vertically, centered */}
        <div className="flex flex-col items-center space-y-3 text-center sm:hidden">
          {/* Copyright */}
          <div className="text-sm">
            <span>© {currentYear} Time Tracker.</span>
          </div>

          {/* Powered by */}
          <div className="flex items-center space-x-2 text-sm">
            <span className="flex items-center space-x-1">
              <span>Designed with</span>
              <Heart
                className={`h-4 w-4 fill-current ${
                  themeType === "dark" ? "text-rose-400/70" : "text-rose-500/70"
                }`}
              />
              <span>by</span>
            </span>
            <a
              href="https://mjswebdesign.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center font-medium transition-colors ${
                themeType === "dark"
                  ? "text-blue-400 hover:text-blue-300"
                  : "text-blue-600 hover:text-blue-700"
              }`}
            >
              <span>MJS Web Design</span>
            </a>
          </div>

          {/* Version */}
          <div className="text-sm">
            <span
              className={`${
                themeType === "dark" ? "text-gray-400" : "text-gray-500"
              }`}
            >
              v1.0.0
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
