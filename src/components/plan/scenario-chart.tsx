import type { PlanScenario } from "@/lib/financial-plan";

const colors = ["var(--muted-foreground)", "var(--primary)", "var(--success)"];

function formatCompact(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Patrimônio investido ano a ano em cada cenário, até a linha da
 * independência. SVG puro, renderizado no servidor.
 */
export function ScenarioChart({
  scenarios,
  target,
}: {
  scenarios: PlanScenario[];
  target: number;
}) {
  const width = 640;
  const height = 220;
  const pad = { top: 16, right: 12, bottom: 24, left: 56 };
  const allPoints = scenarios.flatMap((scenario) => scenario.points);

  if (allPoints.length < 2) return null;

  const minYear = Math.min(...allPoints.map((point) => point.year));
  const maxYear = Math.max(...allPoints.map((point) => point.year));
  const maxValue = Math.max(target, ...allPoints.map((point) => point.value));
  const x = (year: number) =>
    pad.left +
    ((year - minYear) / Math.max(1, maxYear - minYear)) *
      (width - pad.left - pad.right);
  const y = (value: number) =>
    pad.top + (1 - value / maxValue) * (height - pad.top - pad.bottom);
  const ticks = [0, 0.5, 1].map((share) => maxValue * share);

  return (
    <figure className="space-y-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Evolução do patrimônio investido em cada cenário"
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--border)"
            />
            <text
              x={pad.left - 8}
              y={y(tick) + 4}
              textAnchor="end"
              fontSize="11"
              fill="var(--muted-foreground)"
            >
              {formatCompact(tick)}
            </text>
          </g>
        ))}
        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={y(target)}
          y2={y(target)}
          stroke="var(--warning)"
          strokeDasharray="4 4"
        />
        <text
          x={width - pad.right}
          y={y(target) - 6}
          textAnchor="end"
          fontSize="11"
          fill="var(--warning-foreground)"
        >
          Independência
        </text>
        {[minYear, Math.round((minYear + maxYear) / 2), maxYear].map((year) => (
          <text
            key={year}
            x={x(year)}
            y={height - 6}
            textAnchor="middle"
            fontSize="11"
            fill="var(--muted-foreground)"
          >
            {year}
          </text>
        ))}
        {scenarios.map((scenario, index) => (
          <polyline
            key={scenario.key}
            fill="none"
            stroke={colors[index % colors.length]}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={scenario.points
              .map((point) => `${x(point.year)},${y(point.value)}`)
              .join(" ")}
          />
        ))}
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {scenarios.map((scenario, index) => (
          <span key={scenario.key} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-0.5 w-4 rounded-full"
              style={{ background: colors[index % colors.length] }}
            />
            {scenario.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
