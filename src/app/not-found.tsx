"use client";

import { useTranslation } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">{t("notFoundTitle")}</p>
        <a href="/" className="text-blue-500 hover:text-blue-700 underline">
          {t("returnHome")}
        </a>
      </div>
    </div>
  );
}
