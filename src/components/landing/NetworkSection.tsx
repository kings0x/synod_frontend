"use client";

import Reveal from "@/components/motion/Reveal";

const features = [
    {
        number: "01",
        title: "Deterministic Execution",
        description: "Agents act with predictable, enforceable outcomes."
    },
    {
        number: "02",
        title: "Chain-Agnostic by Design",
        description: "Integrates across networks without rewriting logic."
    },
    {
        number: "03",
        title: "Programmable Treasury Policy",
        description: "Capital flows follow rules, not assumptions."
    },
    {
        number: "04",
        title: "Unified Liquidity Access",
        description: "Abstracts fragmented liquidity into one surface."
    }
];

export function NetworkSection() {
    return (
        <section id="network" className="pb-24 pt-4 sm:pb-28 sm:pt-6">
            <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
                <div
                    className="overflow-hidden rounded-[1.25rem] sm:rounded-[2rem] border border-white/10 p-4 sm:p-6 lg:p-10"
                    style={{
                        background: "radial-gradient(circle at top left, rgba(255, 255, 255, 0.05), transparent 30%), linear-gradient(180deg, #171816 0%, #111111 100%)"
                    }}
                >
                    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)] lg:gap-12">
                        {/* Left Side: Intro */}
                        <Reveal>
                            <div className="max-w-xl">
                                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand)] sm:text-sm">
                                    Why it works
                                </p>
                                <h2 className="mt-4 max-w-[14ch] sm:max-w-[12ch] text-balance font-display text-3xl leading-[0.98] tracking-[-0.06em] text-white sm:text-4xl lg:text-[3.2rem]">
                                    Infrastructure that keeps up with agent
                                </h2>
                                <p className="mt-5 max-w-[32ch] text-base leading-7 text-white/70 sm:text-lg" style={{ fontFamily: "var(--font-mono)" }}>
                                    runs wherever capital lives,
                                </p>
                            </div>
                        </Reveal>

                        {/* Right Side: Feature Grid */}
                        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                            {features.map((feature, i) => (
                                <Reveal key={i} delay={0.1 + i * 0.05} offset={22}>
                                    <div className="h-full rounded-xl sm:rounded-[1.5rem] border border-white/5 bg-white/[0.03] p-4 sm:p-5 lg:p-6 transition-colors hover:bg-white/[0.05]">
                                        <div className="flex flex-col gap-3 sm:gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-xs font-bold text-[var(--brand)] shadow-sm">
                                                    {feature.number}
                                                </div>
                                                <p className="text-[15px] font-semibold tracking-[-0.02em] text-white sm:text-base">
                                                    {feature.title}
                                                </p>
                                            </div>
                                            <p className="text-xs tracking-tight sm:text-[13px] leading-[1.4] text-white/50" style={{ fontFamily: "var(--font-mono)" }}>
                                                {feature.description}
                                            </p>
                                        </div>
                                    </div>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
