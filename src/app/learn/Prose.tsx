// biome-ignore-all lint/suspicious/noArrayIndexKey: static text that is never reordered
import { Fragment, type ReactNode } from "react";

/** **bold** and *italic* inside a line. */
function inline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
    .map((part, i) =>
      part.startsWith("**") ? (
        <strong key={i}>{part.slice(2, -2)}</strong>
      ) : part.startsWith("*") && part.length > 1 ? (
        <em key={i}>{part.slice(1, -1)}</em>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      ),
    );
}

type Kind = "table" | "list" | "text";
const kind = (line: string): Kind =>
  line.startsWith("|") ? "table" : line.startsWith("- ") ? "list" : "text";

/** Lines grouped into runs of one kind: a list right under a sentence is still a list. */
function blocks(text: string): string[][] {
  const runs: string[][] = [];
  let last: Kind | null = null;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) {
      last = null;
      continue;
    }
    if (kind(line) === last) runs.at(-1)?.push(line);
    else runs.push([line]);
    last = kind(line);
  }
  return runs;
}

const cells = (row: string) =>
  row
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());

/**
 * The small markdown the unit explanations use: paragraphs, "- " lists, pipe tables, bold and
 * italics. Content is ours (data/units), never user input.
 */
export function Prose({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-3 leading-relaxed">
      {blocks(text).map((lines, b) => {
        if (lines.every((line) => line.trim().startsWith("|"))) {
          const [head = "", , ...rows] = lines;
          return (
            <div key={b} className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    {cells(head).map((cell, c) => (
                      <th key={c} className="line border-b-2 px-2 py-1 font-extrabold">
                        {inline(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, r) => (
                    <tr key={r}>
                      {cells(row).map((cell, c) => (
                        <td key={c} className="line border-b px-2 py-1">
                          {inline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (lines.every((line) => line.trim().startsWith("- "))) {
          return (
            <ul key={b} className="flex list-disc flex-col gap-1 pl-5">
              {lines.map((line, l) => (
                <li key={l}>{inline(line.trim().slice(2))}</li>
              ))}
            </ul>
          );
        }
        return <p key={b}>{inline(lines.join(" "))}</p>;
      })}
    </div>
  );
}
