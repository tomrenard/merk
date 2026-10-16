import { cookies } from "next/headers";
import { freshPages } from "@/lib/fresh";
import { isLocale, LOCALE_COOKIE, LOCALES, type Locale } from "@/lib/i18n";

const NAMES: Record<Locale, string> = { en: "English", fr: "Français" };

async function setLanguage(form: FormData) {
  "use server";
  const locale = form.get("locale");
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  freshPages();
}

/** EN / FR buttons; the current one is highlighted. Its own form, so it nests nowhere. */
export function LanguageSwitch({ current, label }: { current: Locale; label: string }) {
  return (
    <form
      action={setLanguage}
      className="flex items-center justify-center gap-2"
      aria-label={label}
    >
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="submit"
          name="locale"
          value={locale}
          aria-pressed={locale === current}
          className={`chip border ${locale === current ? "border-[var(--brand)] text-[var(--brand)]" : "line muted"}`}
        >
          {NAMES[locale]}
        </button>
      ))}
    </form>
  );
}
