import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecureChain | Medical Records Demo",
  description: "Local demonstration of encrypted medical record access controls.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
