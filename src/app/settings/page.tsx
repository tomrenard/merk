import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { COURSES } from "@/lib/courses";
import { freshPages } from "@/lib/fresh";
import { translator } from "@/lib/i18n";
import { getCourse, getLocale, getQuiet } from "@/lib/locale";
import { getSettings, saveSettings } from "@/lib/review";
import { requireUser } from "@/lib/session";
import { CourseSwitch, LanguageSwitch, QuietSwitch } from "../language";
import { Go } from "../Nav";
import { LogOut } from "../Offline";
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
  const [locale, course, quiet] = await Promise.all([getLocale(), getCourse(), getQuiet()]);
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
      <section id="course" className="card flex flex-col gap-2">
        <span className="muted text-sm font-semibold">{t("You're learning")}</span>
        <CourseSwitch
          current={course}
          label={t("You're learning")}
          name={(id) => t(COURSES[id].name)}
        />
        <span className="muted text-sm">
          {t("Each language keeps its own lessons, words and progress.")}
        </span>
      </section>
      <section id="quiet" className="card flex flex-col gap-2">
        <span className="muted text-sm font-semibold">🤫 {t("Quiet mode")}</span>
        <QuietSwitch current={quiet} label={t("Quiet mode")} on={t("On")} off={t("Off")} />
        <span className="muted text-sm">
          {t(
            "Tap only: no typing, no speaking. Gaps and word cards become choices; dictations, speaking and writing become sentences you build from word tiles.",
          )}
        </span>
      </section>
      <section className="card flex flex-col gap-2">
        <span className="muted text-sm font-semibold">{t("App language")}</span>
        <LanguageSwitch current={locale} label={t("App language")} />
      </section>
      <VoicePicker />
      {COURSES[course].placement && (
        <Go href="/placement" className="btn">
          🧭 {t("Retake the placement test")}
        </Go>
      )}
      <LogOut action={logout} label={t("Log out")} />
    </main>
  );
}
