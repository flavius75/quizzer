import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const CATEGORY_COLORS: Record<string, string> = {
  Science: "bg-blue-600",
  Technology: "bg-green-600",
  History: "bg-purple-600",
  Geography: "bg-yellow-600",
  General: "bg-teal-600",
  Entertainment: "bg-pink-600",
};

export function getCategoryColor(category?: string): string {
  return (category && CATEGORY_COLORS[category]) || "bg-teal-600";
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
