import { cookies } from "next/headers";
import { COURSE_COOKIE, COURSE_IDS, COURSES, type CourseId, isCourseId } from "@/lib/courses";
import { freshPages } from "@/lib/fresh";
import { isLocale, LOCALE_COOKIE, LOCALES, type Locale } from "@/lib/i18n";

const NAMES: Record<Locale, string> = { en: "English", fr: "Français" };

/** This device's choices, each checked before it is stored. */
const CHOICES = {
  [LOCALE_COOKIE]: isLocale,
  [COURSE_COOKIE]: isCourseId,
} as Record<string, (value: unknown) => boolean>;

async function choose(form: FormData) {
  "use server";
  for (const [name, valid] of Object.entries(CHOICES)) {
    const value = form.get(name);
    if (typeof value !== "string" || !valid(value)) continue;
    (await cookies()).set(name, value, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  freshPages();
}

/** One button per option; the current one is highlighted. Its own form, so it nests nowhere. */
function Switch({
  name,
  options,
  current,
  label,
}: {
  name: string;
  options: { value: string; text: string }[];
  current: string;
  label: string;
}) {
  return (
    <form
      action={choose}
      className="flex flex-wrap items-center justify-center gap-2"
      aria-label={label}
    >
      {options.map(({ value, text }) => (
        <button
          key={value}
          type="submit"
          name={name}
          value={value}
          aria-pressed={value === current}
          className={`chip border ${value === current ? "border-[var(--brand)] text-[var(--brand)]" : "line muted"}`}
        >
          {text}
        </button>
      ))}
    </form>
  );
}

/** EN / FR. */
export function LanguageSwitch({ current, label }: { current: Locale; label: string }) {
  const options = LOCALES.map((value) => ({ value, text: NAMES[value] }));
  return <Switch name={LOCALE_COOKIE} options={options} current={current} label={label} />;
}

/** German / Darija; `name` gives a course's name in the UI language. */
export function CourseSwitch({
  current,
  label,
  name,
}: {
  current: CourseId;
  label: string;
  name: (course: CourseId) => string;
}) {
  const options = COURSE_IDS.map((value) => ({
    value,
    text: `${COURSES[value].flag} ${name(value)}`,
  }));
  return <Switch name={COURSE_COOKIE} options={options} current={current} label={label} />;
}
