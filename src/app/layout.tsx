import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter_Tight } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { cn } from "@/lib/utils";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "Bytewave — suas finanças em um só lugar",
    template: "%s · Bytewave",
  },
  description:
    "Organizador de finanças open source. Conecte seus bancos via Open Finance com o Meu Pluggy e acompanhe gastos, cartões e investimentos.",
  applicationName: "Bytewave",
};

export const viewport: Viewport = {
  // Lets the layout draw under the notch and home indicator; the shell pads
  // itself with env(safe-area-inset-*).
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f6" },
    { media: "(prefers-color-scheme: dark)", color: "#131314" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // An explicit choice lives in a cookie so the server paints the right theme;
  // without one, CSS follows the system's prefers-color-scheme.
  const theme = (await cookies()).get("theme")?.value;

  return (
    <html
      lang="pt-BR"
      className={cn(
        "h-full antialiased font-sans",
        theme === "dark" && "dark",
        theme === "light" && "light",
        interTight.variable,
        geistMono.variable,
      )}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
