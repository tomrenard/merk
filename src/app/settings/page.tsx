import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { freshPages } from "@/lib/fresh";
import { translator } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";
import { getSettings, saveSettings } from "@/lib/review";
import { requireUser } from "@/lib/session";
import { LanguageSwitch } from "../language";
import { Go } from "../Nav";
import { VoicePicker } from "./VoicePicker";

export const dynamic = "force-dynamic";

async function save(form: FormData) {
  "use server";
  const userId = await requireUser();
  const newPerDay = Number(form.get("newPerDay"));
  if (!Number.isInteger(newPerDay) || newPerDay < 0 || newPerDay > 50) {
    throw new Error("Invalid settings");
  }
  await saveSettings(userId, { newPerDay });
  freshPages();
  redirect("/");
}

async function logout() {
  "use server";
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}

export default async function SettingsPage() {
  const current = await getSettings(await requireUser());
  const locale = await getLocale();
  const t = translator(locale);
  return (
    <main className="screen">
      <form action={save} className="flex flex-col gap-5">
        <header className="topbar">
          <h1 className="text-3xl font-black">{t("Settings")}</h1>
          <Go href="/" className="muted text-2xl font-black" aria-label={t("Close settings")}>
            ✕
          </Go>
        </header>
        <label className="card flex flex-col gap-2">
          <span className="muted text-sm font-semibold">{t("New words per day")}</span>
          <input
            type="number"
            name="newPerDay"
            min={0}
            max={50}
            defaultValue={current.newPerDay}
            className="field"
          />
          <span className="muted text-sm">
            {t(
              "7 is about 15 minutes of reviews a day once things settle. On days with more than 120 reviews, new words pause by themselves.",
            )}
          </span>
        </label>
        <button type="submit" className="btn btn-primary">
          {t("Save")}
        </button>
      </form>
      <section className="card flex flex-col gap-2">
        <span className="muted text-sm font-semibold">{t("App language")}</span>
        <LanguageSwitch current={locale} label={t("App language")} />
      </section>
      <form action={save} className="flex flex-col gap-5">
        <VoicePicker />
        <Go href="/placement" className="btn">
          🧭 {t("Retake the placement test")}
        </Go>
        <button type="submit" formAction={logout} formNoValidate className="btn mt-4">
          {t("Log out")}
        </button>
      </form>
    </main>
  );
}
