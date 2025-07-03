// Utility function to generate random project colors
export const getRandomProjectColor = (): string => {
  const colors = [
    "#3B82F6", // Blue
    "#10B981", // Emerald
    "#F59E0B", // Amber
    "#EF4444", // Red
    "#8B5CF6", // Violet
    "#06B6D4", // Cyan
    "#84CC16", // Lime
    "#F97316", // Orange
    "#EC4899", // Pink
    "#6366F1", // Indigo
    "#14B8A6", // Teal
    "#A3A3A3", // Gray
    "#F43F5E", // Rose
    "#22C55E", // Green
    "#8B5A2B", // Brown
    "#6B7280", // Cool Gray
    "#7C3AED", // Purple
    "#059669", // Emerald Dark
    "#DC2626", // Red Dark
    "#7C2D12", // Orange Dark
  ];

  return colors[Math.floor(Math.random() * colors.length)];
};

// Alternative function that generates a random color based on project name
export const getProjectColorFromName = (projectName: string): string => {
  const colors = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#06B6D4",
    "#84CC16",
    "#F97316",
    "#EC4899",
    "#6366F1",
    "#14B8A6",
    "#A3A3A3",
    "#F43F5E",
    "#22C55E",
    "#8B5A2B",
    "#6B7280",
    "#7C3AED",
    "#059669",
    "#DC2626",
    "#7C2D12",
  ];

  // Create a simple hash from the project name
  let hash = 0;
  for (let i = 0; i < projectName.length; i++) {
    const char = projectName.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Use absolute value and modulo to get consistent color for same name
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};
