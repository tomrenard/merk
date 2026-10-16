"use client";

import { createContext, useContext, useMemo } from "react";
import { type Locale, translator } from "@/lib/i18n";

const LocaleContext = createContext<Locale>("en");

/** Gives client components the UI language the layout read from the cookie. */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export const useLocale = () => useContext(LocaleContext);

/** `t()` for client components. */
export function useT() {
  const locale = useLocale();
  return useMemo(() => translator(locale), [locale]);
}
