import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { cards, notes } from "@/db/schema";
import { freshPages } from "@/lib/fresh";
import { cardId } from "@/lib/review";
import { requireUser } from "@/lib/session";
import { Back } from "../../Nav";

const FIELDS = [
  { name: "de", label: "German (with der/die/das for nouns)", required: true },
  { name: "en", label: "English", required: true },
  { name: "exampleDe", label: "Where you heard it (German sentence)", required: false },
  { name: "hint", label: "Note", required: false },
] as const;

/** A word or phrase from your own life. It is offered as the next new word, both directions. */
async function add(form: FormData) {
  "use server";
  const userId = await requireUser();
  const field = (name: (typeof FIELDS)[number]["name"]) => {
    const value = String(form.get(name) ?? "").trim();
    const required = FIELDS.find((f) => f.name === name)?.required;
    if ((required && !value) || value.length > 500) throw new Error(`Invalid ${name}`);
    return value || null;
  };
  const id = `mine:${randomUUID()}`;
  const de = field("de") ?? "";
  await db().transaction(async (tx) => {
    await tx.insert(notes).values({
      id,
      source: "mine",
      userId,
      cefr: "Mine",
      // Before every list word, so it comes up next.
      ord: -1,
      de,
      en: field("en") ?? "",
      exampleDe: field("exampleDe"),
      hint: field("hint"),
      editedAt: new Date(),
    });
    await tx.insert(cards).values(
      (["de_en", "en_de"] as const).map((direction) => ({
        id: cardId(userId, id, direction),
        noteId: id,
        userId,
        direction,
      })),
    );
  });
  freshPages();
  redirect(`/words?q=${encodeURIComponent(de)}`);
}

export default function NewWordPage() {
  return (
    <form action={add} className="screen">
      <header className="topbar">
        <h1 className="text-3xl font-black">Add a word</h1>
        <Back href="/words" className="muted text-2xl font-black" aria-label="Cancel">
          ✕
        </Back>
      </header>
      <p className="muted font-semibold">
        Something you heard or read today? It becomes your next new word.
      </p>
      {FIELDS.map(({ name, label, required }) => (
        <label key={name} className="flex flex-col gap-1">
          <span className="muted text-sm font-bold">{label}</span>
          <input
            name={name}
            required={required}
            maxLength={500}
            lang={name === "en" ? "en" : "de"}
            autoCapitalize="off"
            className="field"
          />
        </label>
      ))}
      <button type="submit" className="btn btn-primary">
        Add
      </button>
    </form>
  );
}
