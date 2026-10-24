"use client";

import { SUBJECTS, type Subject } from "@/components/design/teaching-data";

/** Segmented Python / HTML / CSS control. A sliding pill marks the active subject. */
export function SubjectSwitcher({
  value,
  onChange,
}: {
  value: Subject;
  onChange: (subject: Subject) => void;
}) {
  const index = SUBJECTS.findIndex((s) => s.id === value);
  return (
    <div
      role="group"
      aria-label="Subject"
      className="relative inline-grid grid-cols-3 rounded-full border bg-card/80 p-0.5 text-[11px] font-medium"
    >
      <span
        aria-hidden="true"
        className="subject-pill brand-fill absolute inset-y-0.5 left-0.5 w-[calc((100%-0.25rem)/3)] rounded-full"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {SUBJECTS.map((s) => (
        <button
          key={s.id}
          type="button"
          aria-pressed={value === s.id}
          onClick={() => onChange(s.id)}
          className={`relative z-10 min-h-7 rounded-full px-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-foreground ${
            value === s.id ? "text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
