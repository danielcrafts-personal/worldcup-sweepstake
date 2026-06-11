"use client";
import { useEffect } from "react";

// Fires once per page load (module flag also guards React's dev double-invoke).
let fired = false;

/** Invisible beacon: records a dashboard page view for the traffic counter. */
export function VisitTracker() {
  useEffect(() => {
    if (fired) return;
    fired = true;
    fetch("/api/track", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
