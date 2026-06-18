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
