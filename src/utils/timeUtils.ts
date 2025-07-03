import { format } from "date-fns";

export const formatTime = (date: Date): string => {
  return format(date, "HH:mm:ss");
};

export const formatDate = (date: Date): string => {
  return format(date, "MMM dd, yyyy");
};

export const formatDateTime = (date: Date): string => {
  return format(date, "MMM dd, yyyy HH:mm");
};

export const secondsToHMS = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export const hoursToSeconds = (hours: number): number => {
  return Math.round(hours * 3600);
};

export const secondsToHours = (seconds: number): number => {
  return seconds / 3600;
};

export const getCurrentTimeString = (): string => {
  return new Date().toISOString();
};
