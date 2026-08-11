"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface HabitCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  color?: string;
  today?: boolean;
}

export function HabitCheckbox({
  checked,
  onToggle,
  color = "#22c55e",
  today = false,
}: HabitCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md border-2 transition-all duration-200 ease-out",
        "hover:scale-110 active:scale-95",
        checked
          ? "border-transparent text-white"
          : "border-muted-foreground/40 bg-transparent hover:border-foreground/60",
        today && !checked && "border-primary/50"
      )}
      style={
        checked
          ? { backgroundColor: color, borderColor: color }
          : undefined
      }
    >
      <Check
        className={cn(
          "h-4 w-4 transition-all duration-200",
          checked ? "scale-100 opacity-100" : "scale-0 opacity-0"
        )}
        strokeWidth={3}
      />
    </button>
  );
}
