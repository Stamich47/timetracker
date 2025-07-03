import React, { createContext, useReducer, useEffect } from "react";
import type { TimerState, Project } from "../types";

interface TimerAction {
  type:
    | "START_TIMER"
    | "STOP_TIMER"
    | "PAUSE_TIMER"
    | "SET_DESCRIPTION"
    | "SET_PROJECT"
    | "UPDATE_ELAPSED";
  payload?: string | Project | number;
}

interface TimerContextType {
  timer: TimerState;
  startTimer: () => void;
  stopTimer: () => void;
  pauseTimer: () => void;
  setDescription: (description: string) => void;
  setProject: (project: Project) => void;
}

const initialState: TimerState = {
  isRunning: false,
  elapsedTime: 0,
  description: "",
  selectedProject: undefined,
};

const timerReducer = (state: TimerState, action: TimerAction): TimerState => {
  switch (action.type) {
    case "START_TIMER":
      return {
        ...state,
        isRunning: true,
        startTime: new Date(),
      };
    case "STOP_TIMER":
      return {
        ...state,
        isRunning: false,
        startTime: undefined,
        elapsedTime: 0,
        description: "",
      };
    case "PAUSE_TIMER":
      return {
        ...state,
        isRunning: false,
        startTime: undefined,
      };
    case "SET_DESCRIPTION":
      return {
        ...state,
        description: action.payload as string,
      };
    case "SET_PROJECT":
      return {
        ...state,
        selectedProject: action.payload as Project,
      };
    case "UPDATE_ELAPSED":
      return {
        ...state,
        elapsedTime: action.payload as number,
      };
    default:
      return state;
  }
};

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export { TimerContext };

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [timer, dispatch] = useReducer(timerReducer, initialState);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (timer.isRunning && timer.startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor(
          (now.getTime() - timer.startTime!.getTime()) / 1000
        );
        dispatch({ type: "UPDATE_ELAPSED", payload: elapsed });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [timer.isRunning, timer.startTime]);

  const startTimer = () => dispatch({ type: "START_TIMER" });
  const stopTimer = () => dispatch({ type: "STOP_TIMER" });
  const pauseTimer = () => dispatch({ type: "PAUSE_TIMER" });
  const setDescription = (description: string) =>
    dispatch({ type: "SET_DESCRIPTION", payload: description });
  const setProject = (project: Project) =>
    dispatch({ type: "SET_PROJECT", payload: project });

  return (
    <TimerContext.Provider
      value={{
        timer,
        startTimer,
        stopTimer,
        pauseTimer,
        setDescription,
        setProject,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};
