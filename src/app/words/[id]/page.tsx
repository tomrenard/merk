import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db/client";
import { notes } from "@/db/schema";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const FIELDS = [
  { name: "de", label: "German", required: true },
  { name: "en", label: "English", required: true },
  { name: "exampleDe", label: "Example (German)", required: false },
  { name: "exampleEn", label: "Example (English)", required: false },
  { name: "hint", label: "Hint", required: false },
] as const;

/** Where to go after saving: only these, never a URL from the request. */
const BACK = { review: "/review", words: "/words" } as const;

async function save(form: FormData) {
  "use server";
  const userId = await requireUser();
  const id = String(form.get("id"));
  const field = (name: (typeof FIELDS)[number]["name"]) => {
    const value = String(form.get(name) ?? "").trim();
    const required = FIELDS.find((f) => f.name === name)?.required;
    if ((required && !value) || value.length > 500) throw new Error(`Invalid ${name}`);
    return value;
  };
  await db()
    .update(notes)
    .set({
      de: field("de"),
      en: field("en"),
      exampleDe: field("exampleDe") || null,
      exampleEn: field("exampleEn") || null,
      hint: field("hint") || null,
      editedAt: sql`now()`,
    })
    // A shared word (a fix helps everyone) or your own; never someone else's.
    .where(
      and(
        eq(notes.id, id),
        or(eq(notes.userId, userId), and(isNull(notes.userId), ne(notes.source, "mine"))),
      ),
    );
  const back = String(form.get("back"));
  redirect(Object.hasOwn(BACK, back) ? BACK[back as keyof typeof BACK] : BACK.words);
}

export default async function EditWordPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ back?: string }>;
}) {
  let id: string;
  try {
    id = decodeURIComponent((await params).id);
  } catch {
    notFound();
  }
  const userId = await requireUser();
  const [note] = await db()
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.id, id),
        or(eq(notes.userId, userId), and(isNull(notes.userId), ne(notes.source, "mine"))),
      ),
    );
  if (!note) notFound();
  const back = (await searchParams).back === "review" ? "review" : "words";
  return (
    <form action={save} className="screen">
      <h1 className="text-3xl font-extrabold">Edit word</h1>
      <p className="muted text-sm font-semibold">
        {note.cefr} · {note.source}
        {note.editedAt && " · edited"}
      </p>
      <input type="hidden" name="id" value={note.id} />
      <input type="hidden" name="back" value={back} />
      {FIELDS.map(({ name, label, required }) => (
        <label key={name} className="flex flex-col gap-1">
          <span className="muted text-sm font-semibold">{label}</span>
          <textarea
            name={name}
            defaultValue={note[name] ?? ""}
            required={required}
            maxLength={500}
            rows={name.startsWith("example") ? 2 : 1}
            lang={name === "de" || name === "exampleDe" ? "de" : "en"}
            className="field"
          />
        </label>
      ))}
      <button type="submit" className="btn btn-primary">
        Save
      </button>
      <Link href={BACK[back]} className="muted text-center text-sm font-semibold">
        Cancel
      </Link>
    </form>
  );
}
