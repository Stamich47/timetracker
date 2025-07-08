import { format } from "date-fns";

export const formatTime = (date: Date, is24Hour: boolean = false): string => {
  return format(date, is24Hour ? "HH:mm:ss" : "h:mm:ss a");
};

export const formatTimeShort = (
  date: Date,
  is24Hour: boolean = false
): string => {
  return format(date, is24Hour ? "HH:mm" : "h:mm a");
};

export const formatDate = (date: Date): string => {
  return format(date, "MMM dd, yyyy");
};

export const formatDateTime = (
  date: Date,
  is24Hour: boolean = false
): string => {
  return format(date, is24Hour ? "MMM dd, yyyy HH:mm" : "MMM dd, yyyy h:mm a");
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
