import type { Metadata, Viewport } from "next";
import { Archivo, Geist } from "next/font/google";
import "./globals.css";
import { WycenaProvider } from "@/components/wycena/WycenaProvider";
import { company } from "@/lib/content";
import { siteUrl } from "@/lib/site";

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

const OG_IMAGE = "/assets/bc-progres/img/hero-poster.jpg";

const description =
  "Firma budowlana z Ochotnicy Dolnej. Budowa domów i obiektów, więźby i pokrycia dachowe, hale stalowe, prace ziemne. Zapytaj o wycenę.";

/* Adres canonical ustawia każda strona osobno (alternates w layoucie
   odziedziczyłyby wszystkie podstrony). */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BC PROGRES, firma budowlana z Ochotnicy Dolnej",
    template: "%s, BC PROGRES",
  },
  description,
  openGraph: {
    type: "website",
    locale: "pl_PL",
    siteName: "BC PROGRES sp. z o.o.",
    title: "BC PROGRES, firma budowlana z Ochotnicy Dolnej",
    description,
    images: [OG_IMAGE],
  },
};

export const viewport: Viewport = {
  themeColor: "#191A19",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "GeneralContractor",
  name: company.name,
  url: siteUrl,
  image: `${siteUrl}${OG_IMAGE}`,
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
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-yellow focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-graphite"
        >
          Przejdź do treści
        </a>
        <WycenaProvider>{children}</WycenaProvider>
      </body>
    </html>
  );
}
