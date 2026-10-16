"use client";

import { createContext, useContext, useMemo } from "react";
import type { CourseId } from "@/lib/courses";
import { type Locale, translator } from "@/lib/i18n";

const LocaleContext = createContext<{ locale: Locale; course: CourseId }>({
  locale: "en",
  course: "de",
});

/** Gives client components the UI language and course the layout read from the cookies. */
export function LocaleProvider({
  locale,
  course,
  children,
}: {
  locale: Locale;
  course: CourseId;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ locale, course }), [locale, course]);
  return <LocaleContext value={value}>{children}</LocaleContext>;
}

export const useLocale = () => useContext(LocaleContext).locale;

/** The course being studied (a lesson's own course comes from its id: courseOfId). */
export const useCourse = () => useContext(LocaleContext).course;

/** `t()` for client components. */
export function useT() {
  const locale = useLocale();
  return useMemo(() => translator(locale), [locale]);
}
