import { Fragment, type ReactNode } from "react";

/**
 * Markdown mínimo para as respostas do Tito: parágrafos, listas e **negrito**.
 * Monta elementos React (nunca HTML cru), então nada do texto vira código.
 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={key} className="font-medium text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

const bullet = /^\s*(?:[-•*]|\d+[.)])\s+/;

export function RichText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").filter((line) => line.trim());
        const key = `b${blockIndex}`;

        if (lines.length > 0 && lines.every((line) => bullet.test(line))) {
          const ordered = /^\s*\d/.test(lines[0] ?? "");
          const ListTag = ordered ? "ol" : "ul";
          return (
            <ListTag
              key={key}
              className={
                ordered
                  ? "list-decimal space-y-1 pl-5"
                  : "list-disc space-y-1 pl-5 marker:text-muted-foreground"
              }
            >
              {lines.map((line, lineIndex) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: texto estático, nunca reordena
                <li key={`${key}-${lineIndex}`}>
                  {renderInline(
                    line.replace(bullet, ""),
                    `${key}-${lineIndex}`,
                  )}
                </li>
              ))}
            </ListTag>
          );
        }

        return (
          <p key={key}>
            {lines.map((line, lineIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: texto estático, nunca reordena
              <Fragment key={`${key}-${lineIndex}`}>
                {lineIndex > 0 ? <br /> : null}
                {renderInline(line, `${key}-${lineIndex}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
