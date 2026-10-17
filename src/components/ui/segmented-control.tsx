"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

type SegmentedOption<Value extends string> = {
  value: Value;
  label: string;
};

/**
 * Two-to-four mutually exclusive choices shown at once — faster than a
 * select when every option fits on one line. Built on native radios, so it
 * posts with plain `<form action>` server actions and keeps arrow-key
 * navigation for free.
 */
export function SegmentedControl<Value extends string>({
  name,
  value,
  options,
  onValueChange,
  className,
  "aria-label": ariaLabel,
}: {
  name: string;
  value: Value;
  options: readonly SegmentedOption<Value>[];
  onValueChange: (value: Value) => void;
  className?: string;
  "aria-label"?: string;
}) {
  const groupId = useId();

  return (
    <fieldset
      aria-label={ariaLabel}
      className={cn(
        "m-0 grid h-9 min-w-0 auto-cols-fr grid-flow-col gap-0.5 rounded-xl border-0 bg-foreground/[0.06] p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const id = `${groupId}-${option.value}`;

        return (
          <label
            key={option.value}
            htmlFor={id}
            className="relative flex cursor-pointer items-center justify-center rounded-[10px] px-3 text-sm font-medium text-muted-foreground transition-[background-color,color,box-shadow] hover:text-foreground has-checked:bg-card has-checked:text-foreground has-checked:shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_0.5px_rgb(0_0_0/0.06)] has-focus-visible:ring-[3px] has-focus-visible:ring-ring/30 dark:has-checked:bg-secondary"
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onValueChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        );
      })}
    </fieldset>
  );
}
