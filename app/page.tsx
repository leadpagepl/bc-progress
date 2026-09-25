import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Realizacje } from "@/components/Realizacje";
import { CoRobimy } from "@/components/CoRobimy";
import { WiekszeInwestycje } from "@/components/WiekszeInwestycje";
import { OFirmie } from "@/components/OFirmie";
import { Mapa } from "@/components/Mapa";
import { Kontakt } from "@/components/Kontakt";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
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
