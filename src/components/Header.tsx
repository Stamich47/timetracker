import React from "react";
import {
  Timer as TimerIcon,
  BarChart3,
  FolderOpen,
  Settings,
  User,
} from "lucide-react";

const Header: React.FC = () => {
  return (
    <header className="bg-white bg-opacity-10 backdrop-blur-md border-b border-white border-opacity-20 px-6 py-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
            <TimerIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            TimeTracker Pro
          </h1>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          <button className="flex items-center gap-2 px-4 py-2 text-white text-opacity-90 hover:text-white hover:bg-white hover:bg-opacity-10 rounded-lg transition-all duration-200">
            <TimerIcon className="w-4 h-4" />
            Timer
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-white text-opacity-70 hover:text-white hover:bg-white hover:bg-opacity-10 rounded-lg transition-all duration-200">
            <FolderOpen className="w-4 h-4" />
            Projects
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-white text-opacity-70 hover:text-white hover:bg-white hover:bg-opacity-10 rounded-lg transition-all duration-200">
            <BarChart3 className="w-4 h-4" />
            Reports
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-white text-opacity-70 hover:text-white hover:bg-white hover:bg-opacity-10 rounded-lg transition-all duration-200">
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <button className="p-2 bg-white bg-opacity-10 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all duration-200">
            <User className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
