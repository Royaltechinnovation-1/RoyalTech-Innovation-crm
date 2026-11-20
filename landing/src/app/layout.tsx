import type { Metadata } from "next";
import { FormModalProvider } from "@/components/FormModal";
import "./globals.css";
import "./site-chrome.css";
import "@/styles/crm-landing.css";

export const metadata: Metadata = {
  title: "Smart CRM Software | RoyalTech Innovation",
  description:
    "Manage leads, automate sales, track customer relationships and grow your business with RoyalTech Innovation CRM software.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <FormModalProvider>{children}</FormModalProvider>
      </body>
    </html>
  );
}

