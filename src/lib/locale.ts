import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE, type Locale, translator } from "./i18n";

/** This device's UI language (a cookie, so it works before login too). */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : "en";
}

/** `t()` for server components and actions. */
export async function getT() {
  return translator(await getLocale());
}
