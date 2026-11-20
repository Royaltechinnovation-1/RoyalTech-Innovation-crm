import type { Metadata } from "next";
import BackToTop from "@/components/BackToTop";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import WhatsAppButton from "@/components/WhatsAppButton";
import HomeHero from "./component/HomeHero";

export const metadata: Metadata = {
  title: "CRM Software & Lead Management | Royal Tech Innovation",
  description:
    "Royal Tech Innovation builds custom CRM software with lead management, sales pipeline tracking and automation to help businesses grow customer relationships.",
  keywords: [
    "Royal Tech Innovation",
    "CRM software development",
    "custom CRM software",
    "CRM software for small businesses",
    "lead management software",
    "sales pipeline management",
    "customer relationship management software",
    "CRM automation",
    "business CRM solutions",
  ],
  alternates: {
    canonical: "https://royaltechinnovation.co.in/crm",
  },
  openGraph: {
    title: "CRM Software & Lead Management | Royal Tech Innovation",
    description:
      "Manage leads, automate sales and track your pipeline with custom CRM software from Royal Tech Innovation.",
    url: "https://royaltechinnovation.co.in/crm",
    siteName: "Royal Tech Innovation",
    type: "website",
  },
};

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HomeHero />
      </main>
      <Footer />
      <BackToTop />
      <WhatsAppButton />
    </>
  );
}
