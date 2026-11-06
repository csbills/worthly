"use client";

import { useEffect, useRef, useState } from "react";

const DURATION_MS = 650;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset.motion === "reduced")
  );
}

function easeOutCubic(progress: number) {
  return 1 - (1 - progress) ** 3;
}

export function formatCurrencyValue(value: number, currencyCode = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currencyCode,
  }).format(value);
}

/**
 * Um valor em dinheiro que desliza até o novo número quando muda (troca de
 * período, nova sincronização). O HTML do servidor já traz o valor final, então
 * não há salto na primeira pintura nem conteúdo diferente para leitores de tela.
 */
export function AnimatedCurrency({
  value,
  currencyCode = "BRL",
  signed = false,
  className,
}: {
  value: number;
  currencyCode?: string;
  /** Mostra "+" em valores positivos. */
  signed?: boolean;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;

    if (from === value || prefersReducedMotion()) {
      setDisplayed(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / DURATION_MS);
      setDisplayed(from + (value - from) * easeOutCubic(progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [value]);

  const formatted = formatCurrencyValue(
    signed ? Math.abs(displayed) : displayed,
    currencyCode,
  );
  const sign = signed ? (displayed > 0 ? "+" : displayed < 0 ? "-" : "") : "";

  return (
    <span className={className}>
      {sign}
      {formatted}
    </span>
  );
}
