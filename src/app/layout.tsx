import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "Email4Iran",
  description: "Explore topics and send emails to key contacts.",
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
