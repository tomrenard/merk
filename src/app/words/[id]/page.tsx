import { eq, sql } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db/client";
import { notes } from "@/db/schema";
import { requireSession } from "@/lib/session";

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
  await requireSession();
  const id = String(form.get("id"));
  const values = Object.fromEntries(
    FIELDS.map(({ name, required }) => {
      const value = String(form.get(name) ?? "").trim();
      if ((required && !value) || value.length > 500) throw new Error(`Invalid ${name}`);
      return [name, value || null];
    }),
  ) as Record<(typeof FIELDS)[number]["name"], string | null>;
  await db()
    .update(notes)
    .set({ ...values, de: values.de ?? "", en: values.en ?? "", editedAt: sql`now()` })
    .where(eq(notes.id, id));
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
  const id = decodeURIComponent((await params).id);
  const [note] = await db().select().from(notes).where(eq(notes.id, id));
  if (!note) notFound();
  const back = (await searchParams).back === "review" ? "review" : "words";
  return (
    <form action={save} className="mx-auto mt-8 flex max-w-md flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">Edit word</h1>
      <p className="text-sm opacity-60">
        {note.cefr} · {note.source}
        {note.editedAt && " · edited"}
      </p>
      <input type="hidden" name="id" value={note.id} />
      <input type="hidden" name="back" value={back} />
      {FIELDS.map(({ name, label, required }) => (
        <label key={name} className="flex flex-col gap-1">
          <span className="text-sm opacity-60">{label}</span>
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
      <Link href={BACK[back]} className="text-center text-sm opacity-60">
        Cancel
      </Link>
    </form>
  );
}
