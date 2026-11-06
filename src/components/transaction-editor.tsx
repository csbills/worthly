"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useState,
  useTransition,
} from "react";

import { saveTransactionAdjustment } from "@/actions/transaction-adjustments";
import { Tito } from "@/components/mascot/tito";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { selectTriggerVariants } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { TransactionCategoryOptionGroup } from "@/lib/transaction-category-dictionary";
import { cn } from "@/lib/utils";

export type EditableTransaction = {
  id: string;
  description: string;
  amountLabel: string;
  categoryId: string | null;
  categoryLabel: string;
  note: string | null;
  ignored: boolean;
};

type EditorContextValue = {
  open: (transaction: EditableTransaction) => void;
};

const EditorContext = createContext<EditorContextValue | null>(null);

/** Um trecho estável da descrição para virar regra: sem números de pedido. */
export function suggestRulePattern(description: string) {
  const firstPart = description.split(/[|·]/)[0] ?? description;

  return firstPart
    .replace(/[0-9]{3,}.*$/u, "")
    .replace(/[*#-]+\s*$/u, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

function EditorForm({
  transaction,
  categories,
  onDone,
}: {
  transaction: EditableTransaction;
  categories: TransactionCategoryOptionGroup[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [categoryId, setCategoryId] = useState(transaction.categoryId ?? "");
  const [note, setNote] = useState(transaction.note ?? "");
  const [ignored, setIgnored] = useState(transaction.ignored);
  const [createRule, setCreateRule] = useState(false);
  const [rulePattern, setRulePattern] = useState(() =>
    suggestRulePattern(transaction.description),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveTransactionAdjustment({
        transactionId: transaction.id,
        categoryId: categoryId || null,
        note,
        ignored,
        rulePattern: createRule ? rulePattern : null,
      });

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setSaved(true);
      router.refresh();
      window.setTimeout(onDone, 900);
    });
  }

  if (saved) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center animate-pop-in">
        <Tito mood="celebrate" size="lg" />
        <p className="font-medium">Prontinho!</p>
        <p className="text-sm text-muted-foreground">
          {createRule
            ? "A regra já vale para as transações parecidas."
            : "Os relatórios já usam o ajuste."}
        </p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 pb-6"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <label className="space-y-1.5">
        <span className="block text-sm font-medium">Categoria</span>
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className={cn(
            selectTriggerVariants({ size: "lg" }),
            "appearance-auto",
          )}
        >
          <option value="">Usar a da Pluggy</option>
          {categories.map((group) => (
            <optgroup key={group.id} label={`${group.icon} ${group.label}`}>
              {group.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="space-y-2 rounded-xl border p-3">
        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={createRule}
            onChange={(event) => setCreateRule(event.target.checked)}
            className="mt-0.5 size-4 accent-primary"
          />
          <span>
            Aplicar às transações parecidas
            <span className="block text-xs text-muted-foreground">
              Toda descrição que contém o trecho abaixo recebe esta categoria.
            </span>
          </span>
        </label>
        {createRule ? (
          <Input
            value={rulePattern}
            onChange={(event) => setRulePattern(event.target.value)}
            aria-label="Trecho da descrição"
            className="animate-rise-in"
          />
        ) : null}
      </div>

      <label className="space-y-1.5">
        <span className="block text-sm font-medium">Nota</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={280}
          rows={3}
          placeholder="Ex.: presente de aniversário da Ana"
          className="w-full resize-none rounded-xl border border-input bg-card px-3 py-2 text-sm shadow-[0_1px_2px_rgb(0_0_0/0.04)] outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 dark:bg-input/30"
        />
      </label>

      <label className="flex items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={ignored}
          onChange={(event) => setIgnored(event.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>
          Ignorar nos relatórios
          <span className="block text-xs text-muted-foreground">
            Fica na lista, mas sai dos totais, gráficos e orçamentos. Bom para
            reembolsos e transferências entre amigos.
          </span>
        </span>
      </label>

      {error ? (
        <p role="alert" className="text-sm text-destructive-foreground">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="mt-auto h-11"
      >
        {pending ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}

/**
 * Um único painel de edição para a página inteira: as linhas só avisam qual
 * transação abrir, e a lista de categorias viaja uma vez só.
 */
export function TransactionEditorProvider({
  categories,
  children,
}: {
  categories: TransactionCategoryOptionGroup[];
  children: ReactNode;
}) {
  const [transaction, setTransaction] = useState<EditableTransaction | null>(
    null,
  );
  const [isOpen, setIsOpen] = useState(false);

  return (
    <EditorContext.Provider
      value={{
        open: (next) => {
          setTransaction(next);
          setIsOpen(true);
        },
      }}
    >
      {children}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          {transaction ? (
            <>
              <SheetHeader className="pr-12">
                <SheetTitle className="line-clamp-2">
                  {transaction.description}
                </SheetTitle>
                <SheetDescription>
                  {transaction.amountLabel} · {transaction.categoryLabel}
                </SheetDescription>
              </SheetHeader>
              <EditorForm
                key={transaction.id}
                transaction={transaction}
                categories={categories}
                onDone={() => setIsOpen(false)}
              />
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </EditorContext.Provider>
  );
}

export function EditTransactionTrigger({
  transaction,
  className,
  children,
}: {
  transaction: EditableTransaction;
  className?: string;
  children: ReactNode;
}) {
  const context = useContext(EditorContext);

  return (
    <button
      type="button"
      onClick={() => context?.open(transaction)}
      className={cn(
        "w-full cursor-pointer text-left outline-none focus-visible:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}
