import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { settings } from "@/db/schema";
import { getSettings } from "@/lib/review";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const LANGS = { en: "English", fr: "Français", both: "Both" } as const;

async function save(form: FormData) {
  "use server";
  await requireSession();
  const lang = String(form.get("explainLang"));
  const newPerDay = Number(form.get("newPerDay"));
  if (
    !Object.hasOwn(LANGS, lang) ||
    !Number.isInteger(newPerDay) ||
    newPerDay < 0 ||
    newPerDay > 200
  ) {
    throw new Error("Invalid settings");
  }
  await db()
    .update(settings)
    .set({ explainLang: lang as keyof typeof LANGS, newPerDay });
  redirect("/");
}

export default async function SettingsPage() {
  const current = await getSettings();
  return (
    <form action={save} className="mx-auto mt-16 flex max-w-xs flex-col gap-4 p-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm opacity-60">Translations & explanations</legend>
        {Object.entries(LANGS).map(([value, label]) => (
          <label key={value} className="flex gap-2">
            <input
              type="radio"
              name="explainLang"
              value={value}
              defaultChecked={current.explainLang === value}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1">
        <span className="text-sm opacity-60">New cards per day</span>
        <input
          type="number"
          name="newPerDay"
          min={0}
          max={200}
          defaultValue={current.newPerDay}
          className="field"
        />
      </label>
      <button type="submit" className="btn btn-primary">
        Save
      </button>
      <Link href="/" className="text-center text-sm opacity-60">
        Cancel
      </Link>
    </form>
  );
}
