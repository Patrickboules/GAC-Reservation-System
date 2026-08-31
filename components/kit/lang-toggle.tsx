"use client"

import { cn } from "@/lib/utils"

export type Lang = "en" | "ar"

export interface LangToggleProps {
  lang: Lang
  onLangChange: (lang: Lang) => void
}

/** Page-scoped EN/AR chrome-language switch, shared by pages that mirror
 * their own layout via `dir` without opting into app-wide RTL. */
function LangToggle({ lang, onLangChange }: LangToggleProps) {
  const isAr = lang === "ar"

  return (
    <div className="flex gap-0.5 rounded-lg bg-canvas p-0.5">
      <button
        type="button"
        onClick={() => onLangChange("en")}
        aria-pressed={!isAr}
        className={cn(
          "rounded-md px-3 py-1.5 text-caption font-semibold transition-colors",
          !isAr ? "bg-white text-ink-900 shadow-sm" : "text-ink-500"
        )}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => onLangChange("ar")}
        aria-pressed={isAr}
        className={cn(
          "rounded-md px-3 py-1.5 text-caption font-semibold transition-colors",
          isAr ? "bg-white text-ink-900 shadow-sm" : "text-ink-500"
        )}
      >
        AR
      </button>
    </div>
  )
}

export { LangToggle }
