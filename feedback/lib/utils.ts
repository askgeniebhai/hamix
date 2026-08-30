import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

/** Formats a Date as e.g. "Aug 29, 2026" — used wherever a created/submitted date is shown to a reader. */
export function formatDate(date: Date): string {
  return dateFormatter.format(date)
}
