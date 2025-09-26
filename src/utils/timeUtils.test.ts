import { describe, it, expect } from "vitest";
import {
  formatTime,
  formatTimeShort,
  formatDate,
  formatDateTime,
  secondsToHMS,
  hoursToSeconds,
  secondsToHours,
  getCurrentTimeString,
} from "../utils/timeUtils";

describe("timeUtils", () => {
  describe("formatTime", () => {
    it("should format time in 12-hour format by default", () => {
      const date = new Date("2023-01-01T14:30:45");
      expect(formatTime(date)).toBe("2:30:45 PM");
    });

    it("should format time in 24-hour format when specified", () => {
      const date = new Date("2023-01-01T14:30:45");
      expect(formatTime(date, true)).toBe("14:30:45");
    });
  });

  describe("formatTimeShort", () => {
    it("should format time without seconds in 12-hour format by default", () => {
      const date = new Date("2023-01-01T14:30:45");
      expect(formatTimeShort(date)).toBe("2:30 PM");
    });

    it("should format time without seconds in 24-hour format when specified", () => {
      const date = new Date("2023-01-01T14:30:45");
      expect(formatTimeShort(date, true)).toBe("14:30");
    });
  });

  describe("formatDate", () => {
    it("should format date correctly", () => {
      const date = new Date("2023-01-15T10:00:00");
      expect(formatDate(date)).toBe("Jan 15, 2023");
    });
  });

  describe("formatDateTime", () => {
    it("should format date and time in 12-hour format by default", () => {
      const date = new Date("2023-01-15T14:30:00");
      expect(formatDateTime(date)).toBe("Jan 15, 2023 2:30 PM");
    });

    it("should format date and time in 24-hour format when specified", () => {
      const date = new Date("2023-01-15T14:30:00");
      expect(formatDateTime(date, true)).toBe("Jan 15, 2023 14:30");
    });
  });

  describe("secondsToHMS", () => {
    it("should convert seconds to HH:MM:SS format", () => {
      expect(secondsToHMS(3661)).toBe("01:01:01");
      expect(secondsToHMS(7323)).toBe("02:02:03");
      expect(secondsToHMS(59)).toBe("00:00:59");
      expect(secondsToHMS(3600)).toBe("01:00:00");
    });

    it("should handle zero seconds", () => {
      expect(secondsToHMS(0)).toBe("00:00:00");
    });
  });

  describe("hoursToSeconds", () => {
    it("should convert hours to seconds and round to nearest integer", () => {
      expect(hoursToSeconds(1)).toBe(3600);
      expect(hoursToSeconds(0.5)).toBe(1800);
      expect(hoursToSeconds(2.5)).toBe(9000);
    });
  });

  describe("secondsToHours", () => {
    it("should convert seconds to hours", () => {
      expect(secondsToHours(3600)).toBe(1);
      expect(secondsToHours(1800)).toBe(0.5);
      expect(secondsToHours(7200)).toBe(2);
    });
  });

  describe("getCurrentTimeString", () => {
    it("should return a valid ISO string", () => {
      const result = getCurrentTimeString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("should return current time", () => {
      const before = new Date();
      const result = getCurrentTimeString();
      const after = new Date();

      const resultDate = new Date(result);
      expect(resultDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(resultDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
