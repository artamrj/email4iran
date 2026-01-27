import type { Metadata } from "next";

import "./globals.css";
import { Providers } from "./providers";

const favicon = new URL("./favicon.ico", import.meta.url);

export const metadata: Metadata = {
  title: "Email4Iran",
  description: "Explore topics and send emails to key contacts.",
  icons: {
    icon: favicon,
    shortcut: favicon,
    apple: favicon,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
