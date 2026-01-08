import type { Metadata } from "next";
import "./globals.css";
import "./startup";

export const metadata: Metadata = {
  title: "Log Viewer",
  description: "Log file viewer with authentication",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
