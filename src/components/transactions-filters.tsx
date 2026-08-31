"use client";

import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUpDownIcon,
  Building03Icon,
  Calendar03Icon,
  CheckIcon,
  EyeIcon,
  Search01Icon,
  TagsIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import type { TransactionsResult } from "@/actions/transactions";
import type {
  TransactionFilters,
  TransactionPeriodKey,
} from "@/lib/transaction-filters";

type MenuName = "period" | "account" | "type" | "sort" | "category";

type FilterTriggerProps = {
  icon: ReactNode;
  label: string;
  active?: boolean;
  expanded: boolean;
  controls: string;
  onClick: () => void;
};

type MenuPanelProps = {
  id: string;
  children: ReactNode;
  className?: string;
};

type MenuOptionProps = {
  checked: boolean;
  children: ReactNode;
  onClick: () => void;
};

type CalendarMonth = {
  year: number;
  month: number;
};

const periodOptions: Array<{
  key: Exclude<TransactionPeriodKey, "custom">;
  label: string;
}> = [
  { key: "all", label: "Todo período" },
  { key: "last-30-days", label: "Últimos 30 dias" },
  { key: "last-90-days", label: "Últimos 90 dias" },
  { key: "current-month", label: "Este mês" },
  { key: "previous-month", label: "Mês passado" },
  { key: "last-6-months", label: "Últimos 6 meses" },
  { key: "current-year", label: "Este ano" },
  { key: "previous-year", label: "Ano passado" },
];

const typeOptions = [
  { key: "all", label: "Todas Transações" },
  { key: "CREDIT", label: "Receitas" },
  { key: "DEBIT", label: "Despesas" },
] as const;

const sortOptions = [
  { key: "newest", label: "Data (mais recentes)" },
  { key: "oldest", label: "Data (mais antigas)" },
] as const;

const weekDays = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function getDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getDateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function getCalendarMonth(date: Date): CalendarMonth {
  return { year: date.getFullYear(), month: date.getMonth() };
}

function addCalendarMonths(month: CalendarMonth, amount: number) {
  const date = new Date(month.year, month.month + amount, 1, 12);
  return getCalendarMonth(date);
}

function getMonthDates(month: CalendarMonth) {
  const firstDay = new Date(month.year, month.month, 1, 12);
  const firstWeekday = firstDay.getDay();

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      month.year,
      month.month,
      index - firstWeekday + 1,
      12,
    );

    return {
      date,
      day: date.getDate(),
      inMonth: date.getMonth() === month.month,
      key: getDateKey(date),
    };
  });
}

function formatMonthLabel(month: CalendarMonth) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(month.year, month.month, 1, 12));

  return label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1);
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(getDateFromKey(value));
}

function formatAccountNumber(value: string) {
  const digits = value.replace(/\D/gu, "");

  return digits ? `•••• ${digits.slice(-4)}` : null;
}

function getInitials(value: string) {
  const initials = value
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("pt-BR");

  return initials || "?";
}

function FilterTrigger({
  icon,
  label,
  active = false,
  expanded,
  controls,
  onClick,
}: FilterTriggerProps) {
  return (
    <button
      type="button"
      aria-controls={controls}
      aria-expanded={expanded}
      aria-haspopup="menu"
      className={`inline-flex h-10 min-w-40 items-center justify-between gap-3 rounded-xl border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        active
          ? "border-primary/50 bg-primary/5 text-foreground"
          : "border-border/80 bg-background text-foreground hover:bg-muted/50"
      }`}
      onClick={onClick}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-muted-foreground">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <HugeiconsIcon
        icon={ArrowDown01Icon}
        aria-hidden="true"
        className={`size-4 shrink-0 text-muted-foreground transition-transform ${
          expanded ? "rotate-180" : ""
        }`}
        strokeWidth={2}
      />
    </button>
  );
}

function MenuPanel({ id, children, className = "" }: MenuPanelProps) {
  return (
    <div
      id={id}
      role="menu"
      className={`absolute top-[calc(100%+0.5rem)] left-0 z-50 min-w-full overflow-hidden rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-xl shadow-black/10 ${className}`}
    >
      {children}
    </div>
  );
}

function MenuOption({ checked, children, onClick }: MenuOptionProps) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      className="flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onClick}
    >
      <span className="min-w-0 truncate">{children}</span>
      {checked ? (
        <HugeiconsIcon
          icon={CheckIcon}
          aria-hidden="true"
          className="size-4 shrink-0 text-primary"
          strokeWidth={2.5}
        />
      ) : null}
    </button>
  );
}

function AccountMenuOption({
  account,
  checked,
  onClick,
}: {
  account: TransactionsResult["filterOptions"]["accounts"][number];
  checked: boolean;
  onClick: () => void;
}) {
  const accountNumber = formatAccountNumber(account.accountNumber);

  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onClick}
    >
      {account.logoPath ? (
        <Image
          src={account.logoPath}
          alt=""
          width={28}
          height={28}
          className="size-7 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
          {getInitials(account.name)}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {account.name}
        </span>
        {accountNumber ? (
          <span className="block text-xs text-muted-foreground">
            {accountNumber}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        {account.typeLabel}
      </span>
      {checked ? (
        <HugeiconsIcon
          icon={CheckIcon}
          aria-hidden="true"
          className="size-4 shrink-0 text-primary"
          strokeWidth={2.5}
        />
      ) : null}
    </button>
  );
}

function CalendarMonthView({
  month,
  dateFrom,
  dateTo,
  onSelect,
}: {
  month: CalendarMonth;
  dateFrom: string | null;
  dateTo: string | null;
  onSelect: (date: string) => void;
}) {
  const dates = getMonthDates(month);

  return (
    <div className="min-w-0">
      <p className="mb-3 text-center text-sm font-semibold">
        {formatMonthLabel(month)}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {weekDays.map((day) => (
          <span key={day} className="py-1">
            {day}
          </span>
        ))}
        {dates.map(({ day, inMonth, key }) => {
          const isStart = key === dateFrom;
          const isEnd = key === dateTo;
          const isInRange =
            dateFrom !== null &&
            dateTo !== null &&
            key >= dateFrom &&
            key <= dateTo;

          return (
            <button
              key={key}
              type="button"
              aria-label={formatDateLabel(key)}
              className={`relative flex h-8 items-center justify-center rounded-lg text-xs transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isInRange ? "bg-primary/10" : "hover:bg-muted"
              } ${
                isStart || isEnd
                  ? "bg-primary font-semibold text-primary-foreground hover:bg-primary"
                  : inMonth
                    ? "text-foreground"
                    : "text-muted-foreground/40"
              }`}
              onClick={() => onSelect(key)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DateRangePanel({
  dateFrom,
  dateTo,
  onApply,
}: {
  dateFrom: string | null;
  dateTo: string | null;
  onApply: (dateFrom: string, dateTo: string) => void;
}) {
  const [draftFrom, setDraftFrom] = useState(dateFrom);
  const [draftTo, setDraftTo] = useState(dateTo);
  const [calendarMonth, setCalendarMonth] = useState<CalendarMonth>(() =>
    getCalendarMonth(new Date()),
  );

  useEffect(() => {
    setDraftFrom(dateFrom);
    setDraftTo(dateTo);
  }, [dateFrom, dateTo]);

  function selectDate(date: string) {
    if (!draftFrom || draftTo) {
      setDraftFrom(date);
      setDraftTo(null);
      return;
    }

    if (date < draftFrom) {
      setDraftFrom(date);
      setDraftTo(draftFrom);
      return;
    }

    setDraftTo(date);
  }

  const previousMonth = addCalendarMonths(calendarMonth, -1);

  return (
    <div className="min-w-0 flex-1 p-4">
      <p className="mb-3 text-sm text-muted-foreground">
        Ou selecione um período personalizado
      </p>
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Meses anteriores"
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setCalendarMonth(addCalendarMonths(calendarMonth, -1))}
        >
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            aria-hidden="true"
            className="size-4"
            strokeWidth={2}
          />
        </button>
        <div className="grid flex-1 grid-cols-2 gap-4 text-center text-xs text-muted-foreground">
          <span>{formatMonthLabel(previousMonth)}</span>
          <span>{formatMonthLabel(calendarMonth)}</span>
        </div>
        <button
          type="button"
          aria-label="Próximos meses"
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setCalendarMonth(addCalendarMonths(calendarMonth, 1))}
        >
          <HugeiconsIcon
            icon={ArrowRight01Icon}
            aria-hidden="true"
            className="size-4"
            strokeWidth={2}
          />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <CalendarMonthView
          month={previousMonth}
          dateFrom={draftFrom}
          dateTo={draftTo}
          onSelect={selectDate}
        />
        <CalendarMonthView
          month={calendarMonth}
          dateFrom={draftFrom}
          dateTo={draftTo}
          onSelect={selectDate}
        />
      </div>
      <div className="mt-4 flex justify-end border-t border-border pt-3">
        <button
          type="button"
          disabled={!draftFrom || !draftTo}
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            if (draftFrom && draftTo) {
              onApply(draftFrom, draftTo);
            }
          }}
        >
          <HugeiconsIcon
            icon={CheckIcon}
            aria-hidden="true"
            className="size-4"
            strokeWidth={2.5}
          />
          Aplicar
        </button>
      </div>
    </div>
  );
}

function getPeriodLabel(filters: TransactionFilters) {
  if (
    filters.period === "custom" &&
    filters.dateFrom !== null &&
    filters.dateTo !== null
  ) {
    return `${formatDateLabel(filters.dateFrom)} – ${formatDateLabel(filters.dateTo)}`;
  }

  return (
    periodOptions.find(({ key }) => key === filters.period)?.label ?? "Este mês"
  );
}

function getTypeLabel(filters: TransactionFilters) {
  return (
    typeOptions.find(({ key }) => key === filters.type)?.label ??
    "Todas Transações"
  );
}

function useTransactionQueryUpdater() {
  const pathname = usePathname();
  const router = useRouter();

  return (changes: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(window.location.search);

    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    }

    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };
}

export function TransactionsFilters({
  filters,
  options,
}: {
  filters: TransactionFilters;
  options: TransactionsResult["filterOptions"];
}) {
  const updateQuery = useTransactionQueryUpdater();
  const [openMenu, setOpenMenu] = useState<MenuName | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenu]);

  function toggleMenu(menu: MenuName) {
    setOpenMenu((current) => (current === menu ? null : menu));
  }

  function selectPeriod(period: Exclude<TransactionPeriodKey, "custom">) {
    updateQuery({
      period: period === "current-month" ? null : period,
      from: null,
      to: null,
    });
    setOpenMenu(null);
  }

  return (
    <div ref={containerRef} className="relative z-30">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <FilterTrigger
            icon={
              <HugeiconsIcon
                icon={Calendar03Icon}
                aria-hidden="true"
                className="size-4"
                strokeWidth={2}
              />
            }
            label={getPeriodLabel(filters)}
            active={filters.period !== "current-month"}
            expanded={openMenu === "period"}
            controls="transactions-period-menu"
            onClick={() => toggleMenu("period")}
          />
          {openMenu === "period" ? (
            <MenuPanel
              id="transactions-period-menu"
              className="w-[min(46rem,calc(100vw-2rem))] p-0"
            >
              <div className="flex flex-col md:flex-row">
                <div className="border-b border-border p-2 md:w-44 md:border-r md:border-b-0">
                  {periodOptions.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      role="menuitemradio"
                      aria-checked={filters.period === key}
                      className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        filters.period === key
                          ? "bg-muted font-medium text-foreground"
                          : "text-muted-foreground"
                      }`}
                      onClick={() => selectPeriod(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <DateRangePanel
                  dateFrom={
                    filters.period === "custom" ? filters.dateFrom : null
                  }
                  dateTo={filters.period === "custom" ? filters.dateTo : null}
                  onApply={(dateFrom, dateTo) => {
                    updateQuery({
                      period: "custom",
                      from: dateFrom,
                      to: dateTo,
                    });
                    setOpenMenu(null);
                  }}
                />
              </div>
            </MenuPanel>
          ) : null}
        </div>

        <div className="relative">
          <FilterTrigger
            icon={
              <HugeiconsIcon
                icon={Building03Icon}
                aria-hidden="true"
                className="size-4"
                strokeWidth={2}
              />
            }
            label={
              options.accounts.find(
                (account) => account.id === filters.accountId,
              )?.name ?? "Todas Contas"
            }
            active={filters.accountId !== null}
            expanded={openMenu === "account"}
            controls="transactions-account-menu"
            onClick={() => toggleMenu("account")}
          />
          {openMenu === "account" ? (
            <MenuPanel
              id="transactions-account-menu"
              className="max-h-96 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto"
            >
              <MenuOption
                checked={filters.accountId === null}
                onClick={() => {
                  updateQuery({ account: null });
                  setOpenMenu(null);
                }}
              >
                <span className="flex items-center gap-3">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <HugeiconsIcon
                      icon={Building03Icon}
                      aria-hidden="true"
                      className="size-4"
                      strokeWidth={2}
                    />
                  </span>
                  Todas Contas
                </span>
              </MenuOption>
              {options.accounts.map((account) => (
                <AccountMenuOption
                  key={account.id}
                  account={account}
                  checked={filters.accountId === account.id}
                  onClick={() => {
                    updateQuery({ account: account.id });
                    setOpenMenu(null);
                  }}
                />
              ))}
            </MenuPanel>
          ) : null}
        </div>

        <div className="relative">
          <FilterTrigger
            icon={
              <HugeiconsIcon
                icon={ArrowUpDownIcon}
                aria-hidden="true"
                className="size-4"
                strokeWidth={2}
              />
            }
            label={getTypeLabel(filters)}
            active={filters.type !== "all"}
            expanded={openMenu === "type"}
            controls="transactions-type-menu"
            onClick={() => toggleMenu("type")}
          />
          {openMenu === "type" ? (
            <MenuPanel id="transactions-type-menu" className="w-52">
              {typeOptions.map(({ key, label }) => (
                <MenuOption
                  key={key}
                  checked={filters.type === key}
                  onClick={() => {
                    updateQuery({ type: key === "all" ? null : key });
                    setOpenMenu(null);
                  }}
                >
                  {label}
                </MenuOption>
              ))}
            </MenuPanel>
          ) : null}
        </div>

        <div className="relative">
          <FilterTrigger
            icon={
              <HugeiconsIcon
                icon={Calendar03Icon}
                aria-hidden="true"
                className="size-4"
                strokeWidth={2}
              />
            }
            label={
              sortOptions.find(({ key }) => key === filters.sort)?.label ??
              "Data (mais recentes)"
            }
            active={filters.sort !== "newest"}
            expanded={openMenu === "sort"}
            controls="transactions-sort-menu"
            onClick={() => toggleMenu("sort")}
          />
          {openMenu === "sort" ? (
            <MenuPanel id="transactions-sort-menu" className="w-56">
              {sortOptions.map(({ key, label }) => (
                <MenuOption
                  key={key}
                  checked={filters.sort === key}
                  onClick={() => {
                    updateQuery({ sort: key === "newest" ? null : key });
                    setOpenMenu(null);
                  }}
                >
                  {label}
                </MenuOption>
              ))}
            </MenuPanel>
          ) : null}
        </div>

        <div className="relative">
          <FilterTrigger
            icon={
              <HugeiconsIcon
                icon={TagsIcon}
                aria-hidden="true"
                className="size-4"
                strokeWidth={2}
              />
            }
            label={
              options.categories.find(
                (category) => category.label === filters.category,
              )?.label ?? "Categorias"
            }
            active={filters.category !== null}
            expanded={openMenu === "category"}
            controls="transactions-category-menu"
            onClick={() => toggleMenu("category")}
          />
          {openMenu === "category" ? (
            <MenuPanel
              id="transactions-category-menu"
              className="max-h-80 w-64 max-w-[calc(100vw-2rem)] overflow-y-auto"
            >
              <MenuOption
                checked={filters.category === null}
                onClick={() => {
                  updateQuery({ category: null });
                  setOpenMenu(null);
                }}
              >
                Todas categorias
              </MenuOption>
              {options.categories.map((category) => (
                <MenuOption
                  key={category.label}
                  checked={filters.category === category.label}
                  onClick={() => {
                    updateQuery({ category: category.label });
                    setOpenMenu(null);
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true">{category.icon}</span>
                    {category.label}
                  </span>
                </MenuOption>
              ))}
            </MenuPanel>
          ) : null}
        </div>

        <button
          type="button"
          aria-pressed={filters.showHidden}
          className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() =>
            updateQuery({ hidden: filters.showHidden ? null : "1" })
          }
        >
          <span
            aria-hidden="true"
            className={`relative inline-flex h-6 w-11 items-center rounded-full p-1 transition-colors ${
              filters.showHidden ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`size-4 rounded-full bg-background shadow-sm transition-transform ${
                filters.showHidden ? "translate-x-5" : ""
              }`}
            />
          </span>
          <HugeiconsIcon
            icon={EyeIcon}
            aria-hidden="true"
            className="size-4"
            strokeWidth={2}
          />
          <span>Mostrar ocultos</span>
        </button>
      </div>
    </div>
  );
}

export function TransactionsSearch({ initialValue }: { initialValue: string }) {
  const updateQuery = useTransactionQueryUpdater();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateQuery({ search: value.trim() || null });
  }

  return (
    <form className="relative w-full max-w-sm" onSubmit={handleSubmit}>
      <HugeiconsIcon
        icon={Search01Icon}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        strokeWidth={2}
      />
      <input
        type="search"
        value={value}
        aria-label="Buscar transações"
        placeholder="Buscar transações..."
        className="h-10 w-full rounded-xl border border-border bg-input/30 pr-3 pl-10 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        onChange={(event) => setValue(event.target.value)}
      />
    </form>
  );
}
