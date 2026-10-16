import { cookies } from "next/headers";
import { COURSE_COOKIE, type CourseId, isCourseId } from "./courses";
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

/** The course this device is studying (German until switched). */
export async function getCourse(): Promise<CourseId> {
  const value = (await cookies()).get(COURSE_COOKIE)?.value;
  return isCourseId(value) ? value : "de";
}
