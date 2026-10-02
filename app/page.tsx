import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Realizacje } from "@/components/Realizacje";
import { CoRobimy } from "@/components/CoRobimy";
import { WiekszeInwestycje } from "@/components/WiekszeInwestycje";
import { OFirmie } from "@/components/OFirmie";
import { Mapa } from "@/components/Mapa";
import { Kontakt } from "@/components/Kontakt";
import { Footer } from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <>
      <Header />
      {/* Cel linku „Przejdź do treści” z layoutu; tabIndex przenosi tam fokus. */}
      <main id="main-content" tabIndex={-1} className="outline-none">
        <Hero />
        <Realizacje />
        <CoRobimy />
        <WiekszeInwestycje />
        <OFirmie />
        <Mapa />
        <Kontakt />
      </main>
      <Footer />
    </>
  );
}
