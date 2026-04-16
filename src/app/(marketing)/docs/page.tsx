import Link from "next/link";

export default function DocsPage() {
  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-[1200px] items-center px-4 py-24 sm:px-6 lg:px-8">
      <section className="max-w-3xl rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-10">
        <p
          className="text-sm uppercase tracking-[0.24em] text-[var(--brand)]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Docs
        </p>
        <h1
          className="mt-4 text-4xl uppercase tracking-[-0.06em] text-[var(--ink)] sm:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Product documentation entrypoint.
        </h1>
        <p
          className="mt-5 max-w-[48ch] text-base leading-7 text-[var(--ink-muted)]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          The route is live now, and the Synod Skill navigation gives direct
          access to the downloadable skill file.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/synod.md"
            className="inline-flex rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-[var(--bg-base)] transition-colors hover:bg-[var(--accent)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Open synod.md
          </Link>
          <Link
            href="/"
            className="inline-flex rounded-full border border-[var(--line)] px-5 py-3 text-sm font-semibold text-[var(--ink)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Back home
          </Link>
        </div>
      </section>
    </main>
  );
}
