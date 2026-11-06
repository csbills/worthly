import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Tito, o tatu-bola do Worthly. Desenhado em SVG com partes separadas (corpo,
 * braços, olhos, casco) para que cada humor seja só uma combinação de peças e
 * animações CSS — sem JavaScript, então funciona em Server Components.
 *
 * "ball" e "sleep" mostram o Tito enrolado, o gesto que dá nome ao bicho:
 * é ele protegendo o seu dinheiro (bloqueio do app) e rolando (carregando).
 */
export const titoMoods = [
  "idle",
  "wave",
  "thinking",
  "celebrate",
  "worried",
  "ball",
  "sleep",
  "rolling",
] as const;

export type TitoMood = (typeof titoMoods)[number];

const sizes = {
  xs: "size-8",
  sm: "size-12",
  md: "size-20",
  lg: "size-28",
  xl: "size-40",
} as const;

export type TitoSize = keyof typeof sizes;

function isCurled(mood: TitoMood) {
  return mood === "ball" || mood === "sleep" || mood === "rolling";
}

function Eyes({ mood }: { mood: TitoMood }) {
  if (mood === "celebrate") {
    return (
      <g className="tito-eyes" fill="none" strokeWidth="2.6">
        <path d="M45.5 45 Q50 39.5 54.5 45" />
        <path d="M65.5 45 Q70 39.5 74.5 45" />
      </g>
    );
  }

  const lookUp = mood === "thinking" ? -2.2 : 0;

  return (
    <g className="tito-eyes">
      <ellipse
        cx="50"
        cy={44 + lookUp}
        rx="3.7"
        ry="4.5"
        className="tito-ink"
      />
      <ellipse
        cx="70"
        cy={44 + lookUp}
        rx="3.7"
        ry="4.5"
        className="tito-ink"
      />
      <circle cx="51.3" cy={42.4 + lookUp} r="1.4" fill="#fff" />
      <circle cx="71.3" cy={42.4 + lookUp} r="1.4" fill="#fff" />
    </g>
  );
}

function Mouth({ mood }: { mood: TitoMood }) {
  if (mood === "celebrate" || mood === "wave") {
    return (
      <path
        d="M54.5 54 Q60 62.5 65.5 54 Z"
        fill="#9b3434"
        className="tito-stroke"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    );
  }

  if (mood === "worried") {
    return (
      <path
        d="M54.5 57 Q57.25 54.5 60 57 Q62.75 59.5 65.5 57"
        fill="none"
        className="tito-stroke"
        strokeWidth="2"
        strokeLinecap="round"
      />
    );
  }

  if (mood === "thinking") {
    return (
      <path
        d="M57 56 L63 55"
        fill="none"
        className="tito-stroke"
        strokeWidth="2"
        strokeLinecap="round"
      />
    );
  }

  return (
    <path
      d="M55 54.5 Q60 59 65 54.5"
      fill="none"
      className="tito-stroke"
      strokeWidth="2"
      strokeLinecap="round"
    />
  );
}

type ArmPose = "down" | "up" | "chin";

/** Centro e inclinação de cada braço; o lado direito espelha o esquerdo. */
const armPoses: Record<ArmPose, { cx: number; cy: number; angle: number }> = {
  down: { cx: 28, cy: 80, angle: 20 },
  up: { cx: 24, cy: 55, angle: -32 },
  chin: { cx: 45, cy: 64, angle: 55 },
};

function Arm({ pose, side }: { pose: ArmPose; side: "left" | "right" }) {
  const { cx, cy, angle } = armPoses[pose];
  const x = side === "left" ? cx : 120 - cx;
  const rotation = side === "left" ? angle : -angle;

  return (
    <ellipse
      cx={x}
      cy={cy}
      rx="5.5"
      ry="10"
      transform={`rotate(${rotation} ${x} ${cy})`}
      className="tito-skin tito-stroke"
      strokeWidth="2.4"
    />
  );
}

function StandingTito({ mood }: { mood: TitoMood }) {
  const leftArm: ArmPose = mood === "celebrate" ? "up" : "down";
  const rightArm: ArmPose =
    mood === "wave" || mood === "celebrate"
      ? "up"
      : mood === "thinking"
        ? "chin"
        : "down";

  return (
    <g className="tito-body">
      {/* Pés */}
      <ellipse
        cx="46"
        cy="103"
        rx="9"
        ry="5.5"
        className="tito-skin tito-stroke"
        strokeWidth="2.4"
      />
      <ellipse
        cx="74"
        cy="103"
        rx="9"
        ry="5.5"
        className="tito-skin tito-stroke"
        strokeWidth="2.4"
      />

      {/* Casco */}
      <ellipse
        cx="60"
        cy="72"
        rx="35"
        ry="33"
        className="tito-shell tito-stroke"
        strokeWidth="2.6"
      />
      <g
        className="tito-bands"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M27 62 Q60 50 93 62" />
        <path d="M25.5 76 Q60 64 94.5 76" />
        <path d="M29 90 Q60 79 91 90" />
      </g>
      <path
        d="M34 52 Q42 44 52 42"
        fill="none"
        className="tito-shine"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Barriga */}
      <ellipse
        cx="60"
        cy="80"
        rx="20"
        ry="22"
        className="tito-belly tito-stroke"
        strokeWidth="2.2"
      />
      <g
        className="tito-belly-lines"
        fill="none"
        strokeWidth="1.4"
        strokeLinecap="round"
      >
        <path d="M50 74 Q60 77 70 74" />
        <path d="M49 84 Q60 87 71 84" />
      </g>

      {/* Braços */}
      <Arm pose={leftArm} side="left" />
      <g className="tito-arm-right">
        <Arm pose={rightArm} side="right" />
      </g>

      {/* Cabeça */}
      <g className="tito-head">
        <ellipse
          cx="38"
          cy="29"
          rx="6"
          ry="8.5"
          transform="rotate(-28 38 29)"
          className="tito-skin tito-stroke"
          strokeWidth="2.4"
        />
        <ellipse
          cx="38.5"
          cy="29.5"
          rx="2.6"
          ry="4.6"
          transform="rotate(-28 38.5 29.5)"
          className="tito-ear"
        />
        <ellipse
          cx="82"
          cy="29"
          rx="6"
          ry="8.5"
          transform="rotate(28 82 29)"
          className="tito-skin tito-stroke"
          strokeWidth="2.4"
        />
        <ellipse
          cx="81.5"
          cy="29.5"
          rx="2.6"
          ry="4.6"
          transform="rotate(28 81.5 29.5)"
          className="tito-ear"
        />

        <ellipse
          cx="60"
          cy="45"
          rx="24"
          ry="19.5"
          className="tito-skin tito-stroke"
          strokeWidth="2.6"
        />
        <path
          d="M37.5 41 Q38 21 60 20.5 Q82 21 82.5 41 Q72 33.5 60 33.5 Q48 33.5 37.5 41 Z"
          className="tito-shell tito-stroke"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <g
          className="tito-bands"
          fill="none"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M49 23.5 Q47.5 29 48 34" />
          <path d="M60 21 L60 33.5" />
          <path d="M71 23.5 Q72.5 29 72 34" />
        </g>

        <ellipse cx="44" cy="52.5" rx="4" ry="2.4" className="tito-blush" />
        <ellipse cx="76" cy="52.5" rx="4" ry="2.4" className="tito-blush" />
        <ellipse cx="60" cy="53" rx="9.5" ry="6.5" className="tito-snout" />
        <ellipse cx="60" cy="49.5" rx="3.4" ry="2.4" className="tito-ink" />

        {mood === "worried" ? (
          <g
            fill="none"
            className="tito-stroke"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M45 37.5 L53 39.5" />
            <path d="M75 37.5 L67 39.5" />
          </g>
        ) : null}

        <Eyes mood={mood} />
        <Mouth mood={mood} />
      </g>

      {mood === "worried" ? (
        <path
          className="tito-sweat"
          d="M86 34 Q90 41 86 44 Q82 41 86 34 Z"
          fill="#8cc4ff"
          stroke="#3a7cf5"
          strokeWidth="1.2"
        />
      ) : null}
    </g>
  );
}

function CurledTito({ mood }: { mood: TitoMood }) {
  return (
    <g className="tito-ball">
      <circle
        cx="60"
        cy="70"
        r="36"
        className="tito-shell tito-stroke"
        strokeWidth="2.6"
      />
      <g
        className="tito-bands"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M27 56 Q60 44 93 56" />
        <path d="M24.5 72 Q60 60 95.5 72" />
        <path d="M28 88 Q60 77 92 88" />
      </g>
      <path
        d="M36 46 Q44 38 54 36.5"
        fill="none"
        className="tito-shine"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* A fresta por onde ele espia */}
      <path
        d="M52 66 Q66 60 80 66 Q66 72 52 66 Z"
        className="tito-skin tito-stroke"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {mood === "sleep" ? (
        <path
          d="M62 66.5 Q66 69 70 66.5"
          fill="none"
          className="tito-stroke"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      ) : (
        <g className="tito-peek">
          <ellipse cx="66" cy="66" rx="2.8" ry="3" className="tito-ink" />
          <circle cx="67" cy="65" r="1" fill="#fff" />
        </g>
      )}
    </g>
  );
}

function Extras({ mood }: { mood: TitoMood }) {
  if (mood === "celebrate") {
    return (
      <g className="tito-sparkles">
        <path
          d="M18 30 l2.2 5.8 5.8 2.2 -5.8 2.2 -2.2 5.8 -2.2 -5.8 -5.8 -2.2 5.8 -2.2 Z"
          fill="#f5b524"
        />
        <path
          d="M100 18 l1.6 4.2 4.2 1.6 -4.2 1.6 -1.6 4.2 -1.6 -4.2 -4.2 -1.6 4.2 -1.6 Z"
          fill="#f5b524"
        />
        <path
          d="M104 46 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2 Z"
          fill="#f5b524"
        />
      </g>
    );
  }

  if (mood === "thinking") {
    return (
      <g className="tito-dots">
        <circle cx="86" cy="14" r="3.2" className="tito-dot" />
        <circle cx="96" cy="14" r="3.2" className="tito-dot" />
        <circle cx="106" cy="14" r="3.2" className="tito-dot" />
      </g>
    );
  }

  if (mood === "sleep") {
    return (
      <g className="tito-zzz tito-ink-text" fontSize="12" fontWeight="500">
        <text x="88" y="30">
          z
        </text>
        <text x="97" y="20" fontSize="9">
          z
        </text>
      </g>
    );
  }

  if (mood === "wave") {
    return (
      <g
        className="tito-wave-lines"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M104 40 Q108 44 106 50" />
        <path d="M98 34 Q101 36 102 39" />
      </g>
    );
  }

  return null;
}

export function Tito({
  mood = "idle",
  size = "md",
  className,
  label,
  animated = true,
}: {
  mood?: TitoMood;
  size?: TitoSize;
  className?: string;
  /** Texto para leitores de tela; sem ele o Tito é decorativo. */
  label?: string;
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      data-mood={mood}
      data-animated={animated ? "true" : "false"}
      className={cn("tito shrink-0 overflow-visible", sizes[size], className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="60" cy="110" rx="30" ry="4" className="tito-shadow" />
      {isCurled(mood) ? (
        <CurledTito mood={mood} />
      ) : (
        <StandingTito mood={mood} />
      )}
      <Extras mood={mood} />
    </svg>
  );
}

/**
 * O Tito acompanhado de uma fala curta: estados vazios, avisos e boas-vindas.
 */
export function TitoMessage({
  mood = "idle",
  title,
  children,
  action,
  size = "lg",
  className,
}: {
  mood?: TitoMood;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  size?: TitoSize;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 px-6 py-10 text-center",
        className,
      )}
    >
      <Tito mood={mood} size={size} />
      <div className="max-w-sm">
        <p className="text-base font-medium">{title}</p>
        {children ? (
          <div className="mt-1.5 text-sm leading-6 text-muted-foreground">
            {children}
          </div>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
