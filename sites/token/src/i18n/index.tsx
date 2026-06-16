import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LOCALE_KEY, type Locale } from "./config";
import type { Translations } from "./translations/ja";
import ja from "./translations/ja";

export type { Locale };

const loaders: Record<Locale, () => Promise<{ default: Translations }>> = {
  ja: () => Promise.resolve({ default: ja }),
  en: () => import("./translations/en"),
  zh: () => import("./translations/zh"),
  ko: () => import("./translations/ko"),
};

function detectLocale(): Locale {
  const saved = localStorage.getItem(LOCALE_KEY);
  if (saved && saved in loaders) return saved as Locale;
  const lang = navigator.language.split("-")[0] ?? "";
  if (lang in loaders) return lang as Locale;
  return "ja";
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

export interface TFunction {
  (key: string, ...args: unknown[]): string;
  raw: Translations;
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFunction;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);
  const [msgs, setMsgs] = useState<Translations>(ja);

  useEffect(() => {
    const initial = detectLocale();
    if (initial !== "ja") {
      void loaders[initial]().then((m) => {
        setMsgs(m.default);
      });
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_KEY, newLocale);
    void loaders[newLocale]().then((m) => {
      setMsgs(m.default);
    });
  }, []);

  const t = useMemo(() => {
    const fn = (key: string, ...args: unknown[]): string => {
      const val = getNestedValue(msgs, key);
      if (typeof val === "function") return String((val as (...a: unknown[]) => unknown)(...args));
      if (typeof val === "string") return val;
      const fallback = getNestedValue(ja, key);
      if (typeof fallback === "function") return String((fallback as (...a: unknown[]) => unknown)(...args));
      if (typeof fallback === "string") return fallback;
      return key;
    };
    return Object.assign(fn, { raw: msgs });
  }, [msgs]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
