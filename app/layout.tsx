import type { Metadata } from "next";
import "./globals.css";
import "./startup";

export const metadata: Metadata = {
  title: "Text Viewer",
  description: "Text Viewer",
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
