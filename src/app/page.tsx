import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Nav />
      <Hero />
      <Products />
      <Operators />
      <Notes />
      <Footer />
    </main>
  );
}

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 mix-blend-difference">
      <nav className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" aria-label="A14 Labs — home" className="inline-flex items-center gap-3">
          <Mark size={28} />
          <span className="font-mono text-[12px] uppercase tracking-[0.28em] text-foreground/80">
            A14 Labs
          </span>
        </Link>
        <ul className="hidden items-center gap-8 md:flex">
          {[
            ["Studio", "#studio"],
            ["Products", "#products"],
            ["Operators", "#operators"],
            ["Notes", "#notes"],
          ].map(([label, href]) => (
            <li key={href}>
              <a
                href={href}
                className="font-mono text-[11px] uppercase tracking-[0.32em] text-foreground/70 transition-colors hover:text-foreground"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section
      id="studio"
      className="relative flex min-h-[100svh] w-full flex-col justify-between overflow-hidden px-6 pb-12 pt-32 md:px-10 md:pb-16 md:pt-40"
    >
      <Lattice className="pointer-events-none absolute inset-0 opacity-[0.18]" />

      <div className="relative z-10 mx-auto w-full max-w-[1400px]">
        <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-stone">
          <span className="text-foreground">{`{Si · 14}`}</span>
          <span className="ml-3">AI-native product studio</span>
        </p>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1400px]">
        <h1 className="font-sans text-[clamp(56px,11vw,180px)] font-semibold leading-[0.92] tracking-[-0.04em]">
          We build
          <br />
          the tools
          <br />
          <span className="italic font-medium text-stone">we wished existed.</span>
        </h1>

        <div className="mt-10 grid grid-cols-12 gap-4 border-t border-hairline pt-8 md:gap-8 md:pt-10">
          <p className="col-span-12 font-mono text-[11px] uppercase tracking-[0.28em] text-stone md:col-span-3">
            Mission
          </p>
          <p className="col-span-12 max-w-2xl text-[15px] leading-[1.65] text-foreground/85 md:col-span-9 md:text-[16px]">
            A14 Labs is an AI-native product studio.{" "}
            We design, build, and operate AI-native software end-to-end —
            mostly in finance, education, and personal infrastructure. Bootstrapped.
            Long-term oriented. No theatre — just shipping things people use.
          </p>
        </div>
      </div>
    </section>
  );
}

function Products() {
  const items = [
    {
      tag: "01 / Live",
      title: "Fintellect Learning",
      tagline: "AI-native adaptive learning, built for overlooked markets.",
      body:
        "An adaptive learning ecosystem that bridges Western and Asia-Pacific institutions. AI-augmented grading, knowledge-graph + RAG curricula, 1k+ students reached, bootstrapped to revenue.",
      href: "https://www.fintellectlearning.com/en",
      hrefLabel: "fintellectlearning.com",
    },
    {
      tag: "02 / Pilot",
      title: "Wend",
      tagline: "A digital brain for the people in your life.",
      body:
        "An AI-native digital brain for personal and professional relationships. Schema-evolving knowledge graph across chat, voice, email, calendar, and a browser extension. Pilot cohort live; waitlist open.",
      href: "https://trywend.io",
      hrefLabel: "trywend.io",
    },
  ];

  return (
    <section id="products" className="border-t border-hairline px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-12 flex items-end justify-between gap-6 border-b border-hairline pb-6">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.4em] text-stone">
            Products
          </h2>
          <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-stone">
            2 active · more soon
          </span>
        </div>

        <div className="grid grid-cols-1 gap-px bg-hairline md:grid-cols-2">
          {items.map((p) => (
            <article
              key={p.title}
              className="flex flex-col justify-between gap-8 bg-background p-8 md:p-12"
            >
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-stone">
                  {p.tag}
                </p>
                <h3 className="mt-6 font-sans text-[clamp(32px,4vw,52px)] font-semibold leading-[1] tracking-[-0.03em]">
                  {p.title}
                </h3>
                <p className="mt-3 text-[15px] italic leading-snug text-foreground/75">
                  {p.tagline}
                </p>
                <p className="mt-6 max-w-md text-[14px] leading-[1.65] text-foreground/80">
                  {p.body}
                </p>
              </div>
              <a
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.32em] text-foreground/80 transition-colors hover:text-foreground"
              >
                <span>↗</span>
                <span>{p.hrefLabel}</span>
              </a>
            </article>
          ))}
        </div>

        <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.32em] text-stone">
          Next product → in build. Quiet until it ships.
        </p>
      </div>
    </section>
  );
}

function Operators() {
  return (
    <section
      id="operators"
      className="border-t border-hairline px-6 py-24 md:px-10 md:py-32"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-12 border-b border-hairline pb-6">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.4em] text-stone">
            Operators
          </h2>
        </div>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-stone">
              Co-founded · two founders
            </p>
            <h3 className="mt-4 font-sans text-[clamp(36px,4.5vw,64px)] font-semibold leading-[0.95] tracking-[-0.03em]">
              Ansh Vasani
            </h3>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.32em] text-stone">
              Founder · Co-CEO · technical
            </p>
          </div>
          <div className="col-span-12 md:col-span-7 md:col-start-6">
            <p className="text-[15px] leading-[1.7] text-foreground/85 md:text-[16px]">
              Solo developer across the A14 stack — Fintellect, Wend, and what
              comes next. Architect, builder, and operator. Previously at 1435
              Capital (VC, Princeton) and currently CTO of GlobalSVF. SF Bay Area,
              originally NYC.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.28em] text-foreground/70">
              <a
                href="https://anshvasani.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                ↗ anshvasani.com
              </a>
              <a
                href="https://linkedin.anshvasani.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground"
              >
                ↗ LinkedIn
              </a>
            </div>
          </div>
        </div>

        <p className="mt-10 max-w-3xl font-mono text-[11px] uppercase tracking-[0.32em] text-stone">
          Engineers, designers, operators — quiet inquiries welcome.
        </p>
      </div>
    </section>
  );
}

function Notes() {
  return (
    <section
      id="notes"
      className="border-t border-hairline px-6 py-24 md:px-10 md:py-32"
    >
      <div className="mx-auto grid max-w-[1400px] grid-cols-12 gap-8">
        <div className="col-span-12 md:col-span-4">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.4em] text-stone">
            Notes
          </h2>
        </div>
        <div className="col-span-12 md:col-span-8">
          <p className="max-w-2xl text-[clamp(22px,2.4vw,34px)] font-medium leading-[1.2] tracking-[-0.015em]">
            Press, partnerships, recruiting, investors — write to{" "}
            <a
              href="mailto:hello@a14labs.co"
              className="underline decoration-stone underline-offset-[6px] transition-colors hover:decoration-foreground"
            >
              hello@a14labs.co
            </a>
            . Quiet replies preferred.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-x-12 gap-y-6 font-mono text-[11px] uppercase tracking-[0.28em] text-stone sm:grid-cols-2">
            <div>
              <p>Studio</p>
              <p className="mt-2 text-foreground/80">A14 Labs LLC</p>
              <p className="text-foreground/80">San Francisco · NYC</p>
            </div>
            <div>
              <p>Status</p>
              <p className="mt-2 text-foreground/80">Bootstrapped · 2 products live</p>
              <p className="text-foreground/80">Hiring on referral only</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-hairline px-6 py-8 md:px-10">
      <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.32em] text-stone sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Mark size={20} />
          <span>A14 Labs · est. 2025</span>
        </div>
        <span>{`{Si · 14}`} — Atomic number 14. Silicon. Build matter.</span>
      </div>
    </footer>
  );
}

function Mark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        rx="2"
        stroke="currentColor"
        strokeWidth="3"
      />
      <text
        x="86"
        y="28"
        textAnchor="end"
        fontFamily="var(--font-geist-mono), monospace"
        fontWeight={600}
        fontSize="13"
        fill="currentColor"
      >
        14
      </text>
      <text
        x="50"
        y="68"
        textAnchor="middle"
        fontFamily="var(--font-geist-sans), sans-serif"
        fontWeight={800}
        fontSize="44"
        fill="currentColor"
      >
        Si
      </text>
    </svg>
  );
}

function Lattice({ className }: { className?: string }) {
  const cols = 14;
  const rows = 8;
  const ticks: Array<{ x: number; y: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ticks.push({ x: (c + 0.5) / cols, y: (r + 0.5) / rows });
    }
  }
  return (
    <svg
      className={className}
      viewBox="0 0 1000 600"
      preserveAspectRatio="none"
      aria-hidden
    >
      {ticks.map(({ x, y }, i) => (
        <g key={i} stroke="currentColor" strokeWidth={1}>
          <line
            x1={x * 1000 - 6}
            y1={y * 600}
            x2={x * 1000 + 6}
            y2={y * 600}
          />
          <line
            x1={x * 1000}
            y1={y * 600 - 6}
            x2={x * 1000}
            y2={y * 600 + 6}
          />
        </g>
      ))}
    </svg>
  );
}
