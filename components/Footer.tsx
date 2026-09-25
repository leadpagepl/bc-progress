import Link from "next/link";
import { Logo } from "./Logo";
import { company, nav } from "@/lib/content";

export function Footer() {
  return (
    <footer className="bg-ink text-bone">
      <div className="gut spine-dark grid gap-9 py-10 sm:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Logo tone="light" className="w-[196px]" />
          <p className="mt-6 text-sm text-bone/45">
            KRS {company.krs} · NIP {company.nip} · REGON {company.regon}
          </p>
        </div>

        <nav className="lg:col-span-3 lg:col-start-6" aria-label="Stopka">
          <p className="eyebrow text-bone/40">Strona</p>
          <ul className="mt-5 flex flex-col gap-3">
            {nav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-sm text-bone/75 transition-colors hover:text-yellow"
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                href="/polityka-prywatnosci"
                className="text-sm text-bone/75 transition-colors hover:text-yellow"
              >
                Polityka prywatności
              </Link>
            </li>
          </ul>
        </nav>

        <div className="lg:col-span-3 lg:col-start-10">
          <p className="eyebrow text-bone/40">Siedziba</p>
          <p className="mt-5 text-sm leading-relaxed text-bone/75">
            {company.address.line1}
            <br />
            {company.address.line2}
          </p>
          <div className="mt-5 flex gap-4">
            <a
              href={company.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-bone/75 transition-colors hover:text-yellow"
            >
              Instagram
            </a>
            <a
              href={company.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-bone/75 transition-colors hover:text-yellow"
            >
              Facebook
            </a>
          </div>
        </div>
      </div>

      <div className="gut spine-dark flex flex-wrap items-center justify-between gap-4 py-6">
        <p className="text-xs text-bone/35">
          © {new Date().getFullYear()} {company.name}
        </p>
        <p className="text-xs text-bone/35">Ochotnica Dolna, Małopolska</p>
      </div>

      {/* Podpis wykonawcy strony. */}
      <div className="gut spine-dark py-5">
        <p className="text-xs text-bone/30">
          Strona wykonana przez{" "}
          <a
            href="https://leadpage.pl"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1.5 border-b border-bone/20 pb-0.5 text-bone/55 transition-colors hover:border-yellow hover:text-yellow"
          >
            LeadPage
            <svg
              viewBox="0 0 12 12"
              fill="none"
              className="w-2.5 transition-transform duration-400 ease-[var(--ease-out-quint)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden="true"
            >
              <path d="M1 11L11 1M4 1h7v7" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </a>
        </p>
      </div>
    </footer>
  );
}
