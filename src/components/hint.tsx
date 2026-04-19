"use client";

import { HelpCircle } from "lucide-react";

interface Props {
  text: string;
  position?: "top" | "bottom" | "left" | "right";
  width?: string; // tailwind max-w class e.g. "max-w-xs"
}

// Lightweight inline hint icon that shows a tooltip on hover/focus.
// No extra dependencies — pure Tailwind + CSS absolute positioning.
export function Hint({ text, position = "top", width = "max-w-xs" }: Props) {
  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }[position];

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-800",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-800",
    left: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-800",
    right: "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-800",
  }[position];

  return (
    <span className="relative inline-flex items-center group/hint">
      <HelpCircle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 cursor-help flex-shrink-0" />
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 ${positionClasses} ${width}
          bg-gray-800 text-white text-xs rounded-md px-3 py-2 leading-snug shadow-lg
          opacity-0 group-hover/hint:opacity-100 transition-opacity duration-150 whitespace-normal text-left`}
      >
        {text}
        <span
          className={`absolute w-0 h-0 border-4 ${arrowClasses}`}
        />
      </span>
    </span>
  );
}
