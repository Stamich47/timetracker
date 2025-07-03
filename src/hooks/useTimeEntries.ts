import { useContext } from "react";
import { TimeEntriesContext } from "../contexts/TimeEntriesContext";

export const useTimeEntries = () => {
  const context = useContext(TimeEntriesContext);
  if (!context) {
    throw new Error("useTimeEntries must be used within a TimeEntriesProvider");
  }
  return context;
};
