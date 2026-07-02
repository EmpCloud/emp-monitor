import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// EMP AI Assistant is gated behind an env flag — shown only when
// VITE_SHOW_EMP_AI_ASSISTANT is explicitly set to "true".
export function isEmpAiAssistantEnabled() {
  return String(import.meta.env.VITE_SHOW_EMP_AI_ASSISTANT).toLowerCase() === "true";
}

// On-premise deployments hide a set of cloud-only monitoring features
// (webcam casting, file-upload detection/blocking, print detection/blocking,
// geolocation logs). Enabled when VITE_IS_ON_PREMISE is explicitly "true".
export function isOnPremise() {
  return String(import.meta.env.VITE_IS_ON_PREMISE).toLowerCase() === "true";
}
