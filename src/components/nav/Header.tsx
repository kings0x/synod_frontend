"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Header() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header className="sticky top-0 z-40 py-5 transition-transform duration-300 ease-out">
            <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
                <div
                    className={`rounded-[1.75rem] px-5 py-3 transition-all duration-300 max-sm:px-3 border ${scrolled
                            ? "border-[var(--line)] bg-[var(--bg-base)]/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                            : "border-transparent bg-transparent"
                        }`}
                >
                    <div className="flex items-center justify-between">
                        {/* ── Logo ── */}
                        <Link aria-label="Synod home" className="shrink-0" href="/">
                            <span className="font-[var(--font-display)] text-xl font-bold tracking-[-0.04em] text-[var(--ink)]"
                                style={{ fontFamily: "var(--font-display)" }}>
                                SYNOD
                            </span>
                        </Link>

                        {/* ── Desktop Nav ── */}
                        <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
                            {["Overview", "Protocol", "Docs"].map((label) => (
                                <a
                                    key={label}
                                    className="text-sm font-semibold tracking-[-0.02em] transition-colors text-[var(--ink-muted)] hover:text-[var(--brand)]"
                                    href={`#${label.toLowerCase()}`}
                                    style={{ fontFamily: "var(--font-mono)" }}
                                >
                                    {label}
                                </a>
                            ))}
                        </nav>

                        {/* ── CTA + Mobile Toggle ── */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            <Link className="group inline-flex items-center gap-2.5" href="/login">
                                <span
                                    className="hidden text-base font-semibold tracking-[-0.03em] transition-colors sm:inline text-[var(--ink)]"
                                    style={{ fontFamily: "var(--font-mono)" }}
                                >
                                    Get started
                                </span>
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand)] text-[var(--bg-base)] transition-colors duration-200 group-hover:bg-[var(--accent)]">
                                    <svg
                                        aria-hidden="true"
                                        viewBox="0 0 16 16"
                                        className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                                        fill="none"
                                    >
                                        <path d="M3.5 12.5L12.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                        <path d="M6 3.5h6.5V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </span>
                            </Link>

                            {/* ── Mobile hamburger ── */}
                            <button
                                type="button"
                                aria-label="Open navigation"
                                aria-expanded={mobileOpen}
                                onClick={() => setMobileOpen(!mobileOpen)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors lg:hidden bg-white/5 text-[var(--ink)] hover:bg-white/10"
                            >
                                <svg aria-hidden="true" viewBox="0 0 18 18" className="h-4 w-4" fill="none">
                                    {mobileOpen ? (
                                        <>
                                            <path d="M4 4L14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                            <path d="M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                        </>
                                    ) : (
                                        <>
                                            <path d="M3 5.25H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                            <path d="M3 9H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                            <path d="M3 12.75H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                        </>
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* ── Mobile Menu ── */}
                    <div
                        className={`overflow-hidden transition-[max-height,margin-top,opacity] duration-300 ease-out lg:hidden ${mobileOpen ? "max-h-60 mt-4 opacity-100" : "max-h-0 opacity-0"
                            }`}
                    >
                        <nav aria-label="Mobile primary" className="rounded-[1.5rem] border px-4 py-4 border-[var(--line)] bg-[var(--bg-surface)]/90">
                            <div className="flex flex-col gap-1">
                                {["Overview", "Protocol", "Docs"].map((label) => (
                                    <a
                                        key={label}
                                        className="rounded-2xl px-3 py-3 text-sm font-semibold tracking-[-0.02em] transition-colors text-[var(--ink-muted)] hover:bg-white/5 hover:text-[var(--brand)]"
                                        href={`#${label.toLowerCase()}`}
                                        onClick={() => setMobileOpen(false)}
                                        style={{ fontFamily: "var(--font-mono)" }}
                                    >
                                        {label}
                                    </a>
                                ))}
                            </div>
                        </nav>
                    </div>
                </div>
            </div>
        </header>
    );
}
