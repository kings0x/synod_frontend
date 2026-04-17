"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Copy } from "lucide-react";

type NavLink = {
    label: string;
    href: string;
};

const NAV_LINKS: NavLink[] = [
    { label: "About Synod", href: "https://medium.com/@kingjusticefr/the-ungoverned-machine-why-autonomous-finance-needs-a-policy-layer-and-why-we-are-building-synod-b7669a6f245e" },
    { label: "Blog", href: "https://medium.com/@kingjusticefr" },
    { label: "Docs", href: "/docs" },
    { label: "Sandbox", href: "/sandbox" },
] as const;

const SYNOD_SKILL_INSTALL_COMMAND =
    "curl -fsSL https://skill.synodai.xyz/synod.md -o /path/to/save/synod.md";

export default function Header() {
    const [scrolled, setScrolled] = useState(() => {
        if (typeof window === "undefined") {
            return false;
        }

        return window.scrollY > 20;
    });
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mobileSkillOpen, setMobileSkillOpen] = useState(false);
    const [skillCopied, setSkillCopied] = useState(false);
    const [visible, setVisible] = useState(true);
    const lastScrollYRef = useRef(0);

    const closeMobileMenus = () => {
        setMobileOpen(false);
        setMobileSkillOpen(false);
    };

    const copySkillCommand = async () => {
        await navigator.clipboard.writeText(SYNOD_SKILL_INSTALL_COMMAND);
        setSkillCopied(true);
        window.setTimeout(() => setSkillCopied(false), 2000);
    };

    useEffect(() => {
        lastScrollYRef.current = window.scrollY;

        const onScroll = () => {
            const currentScrollY = window.scrollY;
            setScrolled(currentScrollY > 20);

            if (currentScrollY > lastScrollYRef.current && currentScrollY > 50) {
                setVisible(false);
            } else {
                setVisible(true);
            }

            lastScrollYRef.current = currentScrollY;
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header className={`sticky top-0 z-40 py-5 transition-transform duration-300 ease-out ${visible ? "translate-y-0" : "-translate-y-[140%]"}`}>
            <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
                <div
                    className={`rounded-[1.75rem] border px-5 py-3 transition-all duration-300 max-sm:px-3 ${scrolled
                        ? "border-[var(--line)] bg-[var(--bg-base)]/90 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl"
                        : "border-transparent bg-transparent"
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <Link aria-label="Synod home" className="shrink-0" href="/">
                            <Image
                                src="/synod_logo.png"
                                alt="Synod Logo"
                                width={320}
                                height={72}
                                priority
                                className="h-4 w-auto sm:h-[1.125rem]"
                            />
                        </Link>

                        <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
                            {NAV_LINKS.map((link) => (
                                <Link
                                    key={link.label}
                                    className="text-sm font-semibold tracking-[-0.02em] text-[var(--ink-muted)] transition-colors hover:text-[var(--brand)]"
                                    href={link.href}
                                    style={{ fontFamily: "var(--font-mono)" }}
                                >
                                    {link.label}
                                </Link>
                            ))}

                            <div className="group/skill relative">
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 text-sm font-semibold tracking-[-0.02em] text-[var(--brand)] transition-colors group-hover/skill:text-[var(--accent)] group-focus-within/skill:text-[var(--accent)]"
                                    style={{ fontFamily: "var(--font-mono)" }}
                                >
                                    <span>Synod Skill</span>
                                    <svg
                                        aria-hidden="true"
                                        viewBox="0 0 12 12"
                                        className="h-3 w-3 text-[var(--brand)] transition-transform duration-200 group-hover/skill:translate-y-px group-focus-within/skill:translate-y-px"
                                        fill="none"
                                    >
                                        <path d="M2 4.25L6 8.25L10 4.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>

                                <div className="pointer-events-none absolute left-0 top-full z-50 pt-3 opacity-0 transition-all duration-200 group-hover/skill:pointer-events-auto group-hover/skill:opacity-100 group-focus-within/skill:pointer-events-auto group-focus-within/skill:opacity-100">
                                    <div className="w-[min(22.5rem,calc(100vw-3rem))] rounded-[1.35rem] border border-[rgba(167,139,250,0.18)] bg-[#24242b] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.46)]">
                                        <div className="space-y-4">
                                            <div className="text-[1.08rem] font-bold tracking-tight text-white">
                                                Install the Synod Skill
                                            </div>

                                            <div className="flex items-center gap-3 rounded-[1.1rem] border border-white/8 bg-[#2d2d35] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                                                <pre className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-[0.76rem] leading-5 tracking-[-0.02em] text-white">{SYNOD_SKILL_INSTALL_COMMAND}</pre>
                                                <button
                                                    type="button"
                                                    onClick={copySkillCommand}
                                                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] border border-white/12 bg-white/[0.06] text-[var(--brand)] transition-colors hover:bg-white/[0.1]"
                                                    title="Copy install command"
                                                >
                                                    {skillCopied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                                                </button>
                                            </div>

                                            <p className="max-w-[18rem] text-[0.73rem] leading-5 text-[var(--ink-muted)]">
                                                Compatible with Claude Code, Codex, Cursor, Openclaw, and more.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </nav>

                        <div className="flex items-center gap-2 sm:gap-3">
                            <Link className="group inline-flex items-center gap-2.5" href="/signin">
                                <span
                                    className="hidden text-base font-semibold tracking-[-0.03em] text-[var(--ink)] transition-colors sm:inline"
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

                            <button
                                type="button"
                                aria-label="Open navigation"
                                aria-expanded={mobileOpen}
                                onClick={() => {
                                    if (mobileOpen) {
                                        closeMobileMenus();
                                        return;
                                    }

                                    setMobileOpen(true);
                                }}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[var(--ink)] transition-colors hover:bg-white/10 lg:hidden"
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

                    <div
                        className={`overflow-hidden transition-all duration-300 ease-out lg:hidden ${mobileOpen ? "mt-4 max-h-[30rem] opacity-100" : "max-h-0 opacity-0"
                            }`}
                    >
                        <nav aria-label="Mobile primary" className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--bg-surface)]/90 px-4 py-4 backdrop-blur-xl">
                            <div className="flex flex-col gap-1">
                                {NAV_LINKS.map((link) => (
                                    <Link
                                        key={link.label}
                                        className="rounded-2xl px-3 py-3 text-sm font-semibold tracking-[-0.02em] text-[var(--ink-muted)] transition-colors hover:bg-white/5 hover:text-[var(--brand)]"
                                        href={link.href}
                                        onClick={closeMobileMenus}
                                        style={{ fontFamily: "var(--font-mono)" }}
                                    >
                                        {link.label}
                                    </Link>
                                ))}

                                <div className="rounded-2xl border border-white/5 bg-white/[0.02]">
                                    <button
                                        type="button"
                                        className="flex w-full items-center justify-between px-3 py-3 text-left text-sm font-semibold tracking-[-0.02em] text-[var(--brand)]"
                                        onClick={() => setMobileSkillOpen((current) => !current)}
                                        style={{ fontFamily: "var(--font-mono)" }}
                                    >
                                        <span>Synod Skill</span>
                                        <svg
                                            aria-hidden="true"
                                            viewBox="0 0 12 12"
                                            className={`h-3 w-3 transition-transform duration-200 ${mobileSkillOpen ? "rotate-180" : ""}`}
                                            fill="none"
                                        >
                                            <path d="M2 4.25L6 8.25L10 4.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>

                                    <div className={`grid transition-all duration-200 ${mobileSkillOpen ? "grid-rows-[1fr] pb-2" : "grid-rows-[0fr]"}`}>
                                        <div className="overflow-hidden">
                                            <div className="space-y-4 px-3 pb-3">
                                                <div className="pt-1 text-base font-semibold tracking-[-0.02em] text-white">
                                                    Install the Synod Skill
                                                </div>

                                                <div className="flex items-center gap-3 rounded-[1.25rem] border border-white/8 bg-white/[0.05] px-4 py-4">
                                                    <pre className="min-w-0 flex-1 whitespace-pre-wrap break-all font-mono text-[0.82rem] leading-6 text-white">{SYNOD_SKILL_INSTALL_COMMAND}</pre>
                                                    <button
                                                        type="button"
                                                        onClick={copySkillCommand}
                                                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.06] text-[var(--brand)] transition-colors hover:bg-white/[0.1]"
                                                        title="Copy install command"
                                                    >
                                                        {skillCopied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                                                    </button>
                                                </div>

                                                <p className="text-xs leading-6 text-[var(--ink-muted)]">
                                                    Compatible with Claude Code, Codex, Cursor, Openclaw, and more.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </nav>
                    </div>
                </div>
            </div>
        </header>
    );
}
