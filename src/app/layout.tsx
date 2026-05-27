import type { Metadata } from "next";
import { Style } from "./Style";
import "./globals.css";

export const metadata: Metadata = {
  title: "Unistyles SSR RSS repro",
  description: "React Native Web and Unistyles SSR memory repro",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Style>{children}</Style>
      </body>
    </html>
  );
}
