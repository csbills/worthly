import { cva } from "class-variance-authority";

/**
 * Estilo do gatilho do Select, também usado em <select> nativos. Fica fora de
 * select.tsx (Client Component) para Server Components poderem chamá-lo.
 */
export const selectTriggerVariants = cva(
  "group/select relative inline-flex w-full min-w-0 cursor-pointer select-none items-center justify-between gap-2 rounded-xl border border-input bg-card text-left text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.04)] outline-none transition-[border-color,box-shadow,background-color] hover:border-[color-mix(in_srgb,var(--ink)_20%,transparent)] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 data-popup-open:border-[color-mix(in_srgb,var(--ink)_22%,transparent)] data-disabled:pointer-events-none data-disabled:opacity-60 aria-invalid:border-destructive/50 dark:bg-input/30 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      size: {
        default: "h-9 px-3 text-sm",
        sm: "h-8 px-2.5 text-[13px]",
        lg: "h-10 px-3.5 text-sm",
      },
    },
    defaultVariants: { size: "default" },
  },
);
