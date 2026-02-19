import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n";
import { LOCALE_LABELS, type Locale } from "@/i18n/config";

const locales = Object.keys(LOCALE_LABELS) as Locale[];

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
      <SelectTrigger size="sm" className="w-auto text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {locales.map((l) => (
          <SelectItem key={l} value={l}>
            {LOCALE_LABELS[l]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
