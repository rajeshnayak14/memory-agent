import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TOUR_STEPS } from "../tourSteps";

const TourContext = createContext(null);

function tourSeenKey(userId) {
  return `mnemos.tour_seen.${userId}`;
}

// Tracked per account, per browser (localStorage) rather than round-
// tripped to the backend — same lightweight pattern this app already
// uses for theme and the default chat thread id, and "has this browser
// already shown the tour" is all the auto-start decision actually needs.
export function hasTourBeenSeen(userId) {
  try {
    return localStorage.getItem(tourSeenKey(userId)) === "true";
  } catch {
    return true; // fail safe: never force a tour if storage is inaccessible
  }
}

function markTourSeen(userId) {
  try {
    localStorage.setItem(tourSeenKey(userId), "true");
  } catch {
    // ignore — worst case the tour offers to replay next session too
  }
}

export function TourProvider({ children }) {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(-1);
  const [userId, setUserId] = useState(null);

  const isActive = stepIndex >= 0;
  const step = isActive ? TOUR_STEPS[stepIndex] : null;

  const goToStep = useCallback(
    (index) => {
      const target = TOUR_STEPS[index];
      if (!target) return;
      setStepIndex(index);
      navigate(target.route);
    },
    [navigate]
  );

  const end = useCallback(
    (id) => {
      const uid = id ?? userId;
      if (uid) markTourSeen(uid);
      setStepIndex(-1);
    },
    [userId]
  );

  const start = useCallback(
    (uid) => {
      setUserId(uid);
      goToStep(0);
    },
    [goToStep]
  );

  const next = useCallback(() => {
    if (stepIndex + 1 >= TOUR_STEPS.length) {
      end();
      return;
    }
    goToStep(stepIndex + 1);
  }, [stepIndex, goToStep, end]);

  const back = useCallback(() => {
    if (stepIndex <= 0) return;
    goToStep(stepIndex - 1);
  }, [stepIndex, goToStep]);

  const value = useMemo(
    () => ({
      isActive,
      step,
      stepIndex,
      totalSteps: TOUR_STEPS.length,
      start,
      next,
      back,
      end,
    }),
    [isActive, step, stepIndex, start, next, back, end]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return ctx;
}
