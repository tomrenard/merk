"use client";

import { createContext, useContext, useMemo } from "react";
import type { CourseId } from "@/lib/courses";
import { type Locale, translator } from "@/lib/i18n";

const LocaleContext = createContext<{ locale: Locale; course: CourseId; quiet: boolean }>({
  locale: "en",
  course: "de",
  quiet: false,
});

/** Gives client components the UI language and course the layout read from the cookies. */
export function LocaleProvider({
  locale,
  course,
  quiet,
  children,
}: {
  locale: Locale;
  course: CourseId;
  quiet: boolean;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ locale, course, quiet }), [locale, course, quiet]);
  return <LocaleContext value={value}>{children}</LocaleContext>;
}

export const useLocale = () => useContext(LocaleContext).locale;

/** The course being studied (a lesson's own course comes from its id: courseOfId). */
export const useCourse = () => useContext(LocaleContext).course;

/** Quiet mode: every typing or speaking step becomes a tap (see QuietSwitch). */
export const useQuiet = () => useContext(LocaleContext).quiet;

/** `t()` for client components. */
export function useT() {
  const locale = useLocale();
  return useMemo(() => translator(locale), [locale]);
}
