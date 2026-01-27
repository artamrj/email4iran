"use client";

import React from "react";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

export const LanguageToggle = () => {
  const { locale, setLocale, t } = useTranslation();
  const nextLocale = locale === "en" ? "fa" : "en";
  const nextLabel =
    nextLocale === "fa" ? t("languagePersian") : t("languageEnglish");

  return (
    <Button
      variant="ghost"
      size="sm"
      className="rounded-full px-3 text-xs font-semibold"
      onClick={() => setLocale(nextLocale)}
      aria-label={t("toggleLanguage", { language: nextLabel })}
    >
      {nextLabel}
    </Button>
  );
};
