import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { settings } from "@/db/schema";
import { getSettings } from "@/lib/review";
import { requireSession } from "@/lib/session";
import { TabBar } from "../TabBar";

export const dynamic = "force-dynamic";

async function save(form: FormData) {
  "use server";
  await requireSession();
  const newPerDay = Number(form.get("newPerDay"));
  if (!Number.isInteger(newPerDay) || newPerDay < 0 || newPerDay > 50) {
    throw new Error("Invalid settings");
  }
  await db().update(settings).set({ newPerDay });
  redirect("/");
}

export default async function SettingsPage() {
  const current = await getSettings();
  return (
    <form action={save} className="screen with-tabs">
      <h1 className="text-3xl font-black">Settings</h1>
      <label className="card flex flex-col gap-2">
        <span className="muted text-sm font-semibold">New words per day</span>
        <input
          type="number"
          name="newPerDay"
          min={0}
          max={50}
          defaultValue={current.newPerDay}
          className="field"
        />
        <span className="muted text-sm">
          7 is about 15 minutes of reviews a day once things settle. New words pause by themselves
          when more than 120 reviews are waiting.
        </span>
      </label>
      <button type="submit" className="btn btn-primary">
        Save
      </button>
      <TabBar active="/settings" />
    </form>
  );
}
