"use client";

import Reveal from "@/components/motion/Reveal";

const steps = [
    {
        number: "01",
        title: "Define the rules",
        body: "Set who can spend, how much, and under what conditions. Your Capital Constitution is the law — agents operate within it or not at all.",
    },
    {
        number: "02",
        title: "Agents request, policy decides",
        body: "When an agent needs capital, Synod checks the request against your rules in real time. A valid request gets a signed permit. An invalid one gets nothing.",
    },
    {
        number: "03",
        title: "Capital moves on Stellar",
        body: "Approved transactions execute on Stellar with multisig enforcement. No override, no workaround — the network itself is the final authority.",
    },
];

export default function HowItWorksSection() {
    return (
        <section id="how-it-works" className="pb-24 pt-8 sm:pb-28 sm:pt-10">
            <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
                <div className="mt-2 grid gap-8 sm:mt-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-10">

                    {/* Left Column: Sticky Title */}
                    <Reveal className="lg:sticky lg:top-28 lg:self-start" offset={24}>
                        <div className="max-w-2xl">
                            <h2
                                className="font-display text-4xl leading-[0.98] tracking-[-0.06em] text-[var(--ink)] text-balance sm:text-[3.25rem] uppercase"
                                style={{ fontFamily: "var(--font-display)" }} // Oswald
                            >
                                FROM CONSTITUTION TO CAPITAL
                            </h2>
                        </div>
                    </Reveal>

                    {/* Right Column: Vertical Timeline Rail */}
                    <div className="relative ml-5 border-l border-white/10 pl-8 sm:ml-6 sm:pl-12 lg:ml-0">
                        {steps.map((step, idx) => (
                            <Reveal
                                key={idx}
                                delay={0.1 * (idx + 1)}
                                offset={28}
                                className={idx === steps.length - 1 ? "" : "pb-5 sm:pb-6"}
                            >
                                {/* Premium Dark Glassmorphism Step Card */}
                                <div className="relative rounded-[2rem] border border-[rgba(255,255,255,0.06)] bg-[rgba(20,19,26,0.35)] backdrop-blur-xl p-6 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-colors">
                                    {/* Subtle top-inner highlight for glass rim */}
                                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.15)] to-transparent rounded-t-[2rem]" />

                                    {/* Timeline Badge */}
                                    {/* Size 14 (3.5rem). Mobile pl-8 (2rem offset) => left offset is 2.0 + 1.75 = 3.75rem */}
                                    {/* Tablet sm:pl-12 (3rem offset) => left offset is 3.0 + 1.75 = 4.75rem */}
                                    {/* Adds +1px precision for center of border */}
                                    <div className="absolute -left-[calc(3.75rem+1px)] sm:-left-[calc(4.75rem+1px)] top-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-[var(--ink)] text-lg font-bold tracking-tight text-[#0a0a0b] shadow-[0_4px_24px_rgba(255,255,255,0.12)]">
                                        {step.number}
                                    </div>

                                    {/* Internal Step Label */}
                                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--brand)] sm:text-sm">
                                        Step {idx + 1}
                                    </p>

                                    <h3 className="mt-4 max-w-[14ch] text-[1.7rem] font-semibold leading-[1.04] tracking-[-0.05em] text-[var(--ink)] sm:text-[2rem]">
                                        {step.title}
                                    </h3>

                                    <p
                                        className="mt-4 max-w-[44ch] text-sm leading-relaxed text-[var(--ink-muted)] sm:text-[0.95rem] sm:leading-7"
                                        style={{ fontFamily: "var(--font-mono)" }}
                                    >
                                        {step.body}
                                    </p>
                                </div>
                            </Reveal>
                        ))}
                    </div>

                </div>
            </div>
        </section>
    );
}

