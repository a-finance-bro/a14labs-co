"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { A14Lockup } from "@/components/A14Mark";
import { RevealOnView, RevealWords } from "@/components/Reveal";
import { MagneticLink } from "@/components/MagneticLink";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Nav />
      <Hero />
      <Mission />
      <Products />
      <Team />
      <Notes />
      <Footer />
    </main>
  );
}

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 md:px-10">
        <Link
          href="/"
          aria-label="A14 Labs — home"
          className="inline-flex items-center text-foreground"
        >
          <A14Lockup size={32} animated />
        </Link>
        <ul className="hidden items-center gap-9 md:flex">
          {[
            ["Studio", "#studio"],
            ["Products", "#products"],
            ["Team", "#team"],
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
  // All hero content lives in the shader as cast shadows — the HTML layer
  // only contributes the scroll cue. The section is 200svh tall with a
  // sticky inner stage: scrolling the first viewport-height draws the
  // blinds down over the window light, then the page continues.
  return (
    <section id="studio" className="relative h-[200svh] w-full">
      <div className="sticky top-0 flex h-[100svh] w-full flex-col justify-end overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="relative z-10 mx-auto mb-6 font-mono text-[10px] uppercase tracking-[0.4em] text-foreground/60"
        >
          <motion.span
            animate={{ y: [0, 6, 0], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="inline-block"
          >
            Scroll ↓
          </motion.span>
        </motion.div>
      </div>
    </section>
  );
}

function Mission() {
  return (
    <section
      id="mission"
      className="relative z-10 px-6 py-24 md:px-10 md:py-32"
    >
      <div className="mx-auto w-full max-w-[1400px]">
        <h1 className="txt-shadow font-display text-[clamp(44px,7.5vw,120px)] font-semibold leading-[0.94] tracking-[-0.04em]">
          <RevealWords text="We build the tools" />
          <br />
          <span className="font-italic italic font-normal text-crema">
            <RevealWords text="we wished existed." baseDelay={0.15} italic />
          </span>
        </h1>

        <RevealOnView
          delay={0.25}
          duration={0.7}
          className="mt-10 grid grid-cols-12 gap-4 border-t border-hairline pt-6 md:gap-8 md:pt-8"
        >
          <p className="col-span-12 font-mono text-[11px] uppercase tracking-[0.28em] text-foreground/60 md:col-span-3">
            Mission
          </p>
          <p className="txt-shadow-soft col-span-12 max-w-2xl text-[15px] leading-[1.6] text-foreground/85 md:col-span-9 md:text-[16px]">
            A14 Labs is an AI-native product studio. We design, build, and
            operate AI-native software end-to-end — primarily in finance,
            education, and personal infrastructure. Frontier AI changes who
            gets to build the future, and what it means to be contrarian. We
            just build the tools we wished existed — bootstrapped,
            forward-looking, and results-oriented.
          </p>
        </RevealOnView>
      </div>
    </section>
  );
}

function Products() {
  const items = [
    {
      tag: "01 / Live",
      title: "Fintellect Learning",
      tagline: "AI-native adaptive learning for overlooked APAC markets.",
      body:
        "Live and revenue-generating — 1k+ students reached across APAC and the US. AI-augmented grading and knowledge-graph + RAG curricula, bridging Western and Asia-Pacific institutions.",
      href: "https://www.fintellectlearning.com/en",
      hrefLabel: "fintellectlearning.com",
    },
    {
      tag: "02 / Waitlist",
      title: "Wend",
      tagline: "A digital brain for the people in your life.",
      body:
        "A schema-evolving knowledge graph that captures every interaction — chat, voice, email, calendar, browser — and tells you who to talk to, when, and why. Waitlist open.",
      href: "https://trywend.io",
      hrefLabel: "trywend.io",
    },
  ];

  return (
    <section
      id="products"
      className="relative z-10 border-t border-b border-hairline px-6 py-24 md:px-10 md:py-32"
    >
      <div className="mx-auto max-w-[1400px]">
        <RevealOnView className="mb-12 flex items-end justify-between gap-6 border-b border-hairline pb-6">
          <h2 className="txt-shadow-soft font-mono text-[11px] uppercase tracking-[0.4em] text-foreground/60">
            Products
          </h2>
          <span className="txt-shadow-soft font-mono text-[11px] uppercase tracking-[0.28em] text-foreground/60">
            2 brands live · more in stealth
          </span>
        </RevealOnView>

        <div className="grid grid-cols-1 gap-px bg-hairline md:grid-cols-2">
          {items.map((p, i) => (
            <ProductCard key={p.title} {...p} delay={i * 0.12} />
          ))}
        </div>

        <RevealOnView delay={0.2} className="mt-8">
          <p className="txt-shadow-soft font-mono text-[11px] uppercase tracking-[0.32em] text-foreground/60">
            More in stealth, coming soon.
          </p>
        </RevealOnView>
      </div>
    </section>
  );
}

function ProductCard({
  tag,
  title,
  tagline,
  body,
  href,
  hrefLabel,
  delay = 0,
}: {
  tag: string;
  title: string;
  tagline: string;
  body: string;
  href: string;
  hrefLabel: string;
  delay?: number;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 60, rotateX: -8 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay }}
      style={{ transformPerspective: 1200 }}
      whileHover={{ y: -6 }}
      className="group relative flex flex-col justify-between gap-8 bg-background/85 p-8 backdrop-blur-sm md:p-12"
    >
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-caramel">
          {tag}
        </p>
        <h3 className="mt-6 font-display text-[clamp(32px,4vw,52px)] font-semibold leading-[1] tracking-[-0.03em]">
          {title}
        </h3>
        <p className="mt-3 font-italic text-[18px] italic leading-snug text-crema">
          {tagline}
        </p>
        <p className="mt-6 max-w-md text-[14px] leading-[1.65] text-foreground/80">
          {body}
        </p>
      </div>
      <MagneticLink
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.32em] text-foreground/85 transition-colors hover:text-caramel"
      >
        <span>↗</span>
        <span>{hrefLabel}</span>
      </MagneticLink>
      <CornerTicks />
    </motion.article>
  );
}

function CornerTicks() {
  return (
    <>
      {[
        "top-3 left-3 border-t border-l",
        "top-3 right-3 border-t border-r",
        "bottom-3 left-3 border-b border-l",
        "bottom-3 right-3 border-b border-r",
      ].map((cls) => (
        <span
          key={cls}
          aria-hidden
          className={`absolute h-3 w-3 border-foreground/25 transition-colors group-hover:border-caramel/70 ${cls}`}
        />
      ))}
    </>
  );
}

function Team() {
  const members = [
    {
      name: "Ansh Vasani",
      role: "Founder · Co-CEO · technical",
      bio:
        "Solo dev across the stack; co-leadership on strategy, finance, ops. Previously at 1435 Capital (VC, Princeton) and currently CTO of GlobalSVF. SF Bay Area.",
      email: "ansh@a14labs.co",
      links: [
        { href: "https://anshvasani.com", label: "anshvasani.com" },
        { href: "https://linkedin.anshvasani.com", label: "LinkedIn" },
      ],
    },
    {
      name: "Ava Yu",
      role: "Founder · Co-CEO · growth",
      bio:
        "Growth & partnerships across the A14 portfolio; co-leads strategy, finance, and ops alongside Ansh. Drives go-to-market for Fintellect and Wend. NYC-based.",
      email: "ava@a14labs.co",
      links: [],
    },
  ];

  return (
    <section
      id="team"
      className="relative z-10 border-b border-hairline px-6 py-24 md:px-10 md:py-32"
    >
      <div className="mx-auto max-w-[1400px]">
        <RevealOnView className="mb-12 flex items-end justify-between gap-6 border-b border-hairline pb-6">
          <h2 className="txt-shadow-soft font-mono text-[11px] uppercase tracking-[0.4em] text-foreground/60">
            Meet the Team
          </h2>
          <span className="txt-shadow-soft font-mono text-[11px] uppercase tracking-[0.28em] text-foreground/60">
            2 founders · co-led
          </span>
        </RevealOnView>

        <div className="grid grid-cols-1 gap-px bg-hairline md:grid-cols-2">
          {members.map((m, i) => (
            <motion.article
              key={m.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.9, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="group relative flex flex-col justify-between gap-10 bg-background/85 p-8 backdrop-blur-sm md:p-12"
            >
              <div>
                <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-caramel">
                  {String(i + 1).padStart(2, "0")} / Founder
                </span>
                <h3 className="mt-6 font-display text-[clamp(40px,5vw,72px)] font-semibold leading-[0.95] tracking-[-0.03em]">
                  <span className="font-italic italic font-normal text-crema">
                    {m.name.split(" ")[0]}
                  </span>{" "}
                  {m.name.split(" ").slice(1).join(" ")}
                </h3>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.32em] text-foreground/65">
                  {m.role}
                </p>
                <p className="mt-6 max-w-md text-[14px] leading-[1.7] text-foreground/85 md:text-[15px]">
                  {m.bio}
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <MagneticLink
                  href={`mailto:${m.email}`}
                  className="inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.32em] text-caramel transition-colors hover:text-crema"
                >
                  <span>✉</span>
                  <span>{m.email}</span>
                </MagneticLink>
                {m.links.length > 0 && (
                  <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.28em] text-foreground/70">
                    {m.links.map((l) => (
                      <MagneticLink
                        key={l.href}
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-caramel"
                      >
                        ↗ {l.label}
                      </MagneticLink>
                    ))}
                  </div>
                )}
              </div>
              <CornerTicks />
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Notes() {
  return (
    <section
      id="notes"
      className="relative z-10 px-6 py-24 md:px-10 md:py-32"
    >
      <div className="mx-auto grid max-w-[1400px] grid-cols-12 gap-8">
        <RevealOnView delay={0} className="col-span-12 md:col-span-4">
          <h2 className="txt-shadow-soft font-mono text-[11px] uppercase tracking-[0.4em] text-foreground/60">
            Notes
          </h2>
        </RevealOnView>
        <div className="col-span-12 md:col-span-8">
          <RevealOnView delay={0.1}>
            <p className="txt-shadow max-w-2xl font-display text-[clamp(24px,2.6vw,38px)] font-medium leading-[1.2] tracking-[-0.015em]">
              Reach out at{" "}
              <MagneticLink
                href="mailto:hello@a14labs.co"
                className="text-caramel underline decoration-caramel/50 underline-offset-[6px] transition-colors hover:decoration-caramel"
              >
                hello@a14labs.co
              </MagneticLink>
              .
            </p>
          </RevealOnView>
          <RevealOnView
            delay={0.25}
            className="mt-12 grid grid-cols-1 gap-x-12 gap-y-8 font-mono text-[11px] uppercase tracking-[0.28em] text-foreground/60 sm:grid-cols-2"
          >
            <div>
              <p>Studio</p>
              <p className="mt-2 text-foreground/85">A14 Labs LLC</p>
              <p className="text-foreground/85">San Francisco · NYC</p>
            </div>
            <div>
              <p>Status</p>
              <p className="mt-2 text-foreground/85">Bootstrapped</p>
              <p className="text-foreground/85">2 brands live</p>
            </div>
          </RevealOnView>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 border-t border-hairline">
      <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-3 px-6 py-8 font-mono text-[11px] uppercase tracking-[0.32em] text-foreground/55 md:flex-row md:items-center md:px-10">
        <div className="flex items-center gap-3">
          <A14Lockup size={20} />
          <span>· est. 2025</span>
        </div>
        <span>© {new Date().getFullYear()} A14 Labs LLC — All rights reserved.</span>
      </div>
    </footer>
  );
}
