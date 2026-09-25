import type { Metadata, Viewport } from "next";
import { Archivo, Geist } from "next/font/google";
import "./globals.css";
import { WycenaProvider } from "@/components/wycena/WycenaProvider";
import { company } from "@/lib/content";

const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
});

const geist = Geist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bcprogres.pl"),
  title: {
    default: "BC PROGRES, firma budowlana z Ochotnicy Dolnej",
    template: "%s, BC PROGRES",
  },
  description:
    "BC PROGRES sp. z o.o. Budowa domów i obiektów, więźby i pokrycia dachowe, hale stalowe, prace ziemne. Ochotnica Dolna.",
  openGraph: {
    type: "website",
    locale: "pl_PL",
    siteName: "BC PROGRES sp. z o.o.",
    title: "BC PROGRES, firma budowlana z Ochotnicy Dolnej",
    description: "Budowa domów i obiektów. Ochotnica Dolna.",
    images: ["/assets/bc-progres/img/hero-poster.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#191A19",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "GeneralContractor",
  name: company.name,
  url: "https://bcprogres.pl",
  address: {
    "@type": "PostalAddress",
    streetAddress: company.address.line1,
    postalCode: "34-452",
    addressLocality: "Ochotnica Dolna",
    addressCountry: "PL",
  },
  identifier: [
    { "@type": "PropertyValue", name: "KRS", value: company.krs },
    { "@type": "PropertyValue", name: "NIP", value: company.nip },
    { "@type": "PropertyValue", name: "REGON", value: company.regon },
  ],
  sameAs: [company.instagram, company.facebook],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl" className={`${archivo.variable} ${geist.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <a
          href="#realizacje"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-yellow focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-graphite"
        >
          Przejdź do treści
        </a>
        <WycenaProvider>{children}</WycenaProvider>
      </body>
    </html>
  );
}
