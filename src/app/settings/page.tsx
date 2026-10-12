import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { settings } from "@/db/schema";
import { getSettings } from "@/lib/review";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

async function save(form: FormData) {
  "use server";
  await requireSession();
  const newPerDay = Number(form.get("newPerDay"));
  if (!Number.isInteger(newPerDay) || newPerDay < 0 || newPerDay > 200) {
    throw new Error("Invalid settings");
  }
  await db().update(settings).set({ newPerDay });
  redirect("/");
}

export default async function SettingsPage() {
  const current = await getSettings();
  return (
    <form action={save} className="card mx-auto mt-16 flex max-w-xs flex-col gap-4">
      <h1 className="text-3xl font-extrabold">Settings</h1>
      <label className="flex flex-col gap-1">
        <span className="muted text-sm font-semibold">New cards per day</span>
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
      <Link href="/" className="muted text-center text-sm font-semibold">
        Cancel
      </Link>
    </form>
  );
}
