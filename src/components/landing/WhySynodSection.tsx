"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Reveal from "@/components/motion/Reveal";

const features = [
    {
        eyebrow: "capital rules defined upfront",
        title: "Create The Capital Constitution",
        body: "Set how money can be used. Every rule is enforced automatically.",
    },
    {
        eyebrow: "permit based execution",
        title: "No Permit, No Spend",
        body: "Every transaction needs approval. No permit, no movement of capital.",
    },
    {
        eyebrow: "Unbreakable enforcement",
        title: "The rules that govern everything",
        body: "Agents can’t bypass the rules. Invalid transactions never reach the network.",
    },
    {
        eyebrow: "Multisig by default",
        title: "Capital moves when Signers Agree",
        body: "Agents don’t act alone. Every transaction requires coordinated approval.",
    },
];

export default function WhySynodSection() {
    const [activeIndex, setActiveIndex] = useState(0);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
    const ratios = useRef<number[]>(features.map(() => 0));

    useEffect(() => {
        const validCards = cardRefs.current.filter((ref) => ref !== null) as HTMLDivElement[];
        if (!validCards.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    const index = Number(entry.target.getAttribute("data-index"));
                    if (!isNaN(index)) {
                        ratios.current[index] = entry.isIntersecting ? entry.intersectionRatio : 0;
                    }
                }
                // Find the index of the container with the highest intersection ratio
                const maxIndex = ratios.current.reduce(
                    (maxIdx, currRatio, idx, arr) => (currRatio > arr[maxIdx] ? idx : maxIdx),
                    0
                );
                setActiveIndex(maxIndex);
            },
            {
                threshold: [0.2, 0.35, 0.5, 0.65, 0.8],
                rootMargin: "-18% 0px -42% 0px",
            }
        );

        for (const card of validCards) {
            observer.observe(card);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <section id="why-synod" className="pb-24 pt-6 sm:pb-28 sm:pt-16">
            <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12">

                    {/* ── Left Column: Sticky Title & Sidebar ── */}
                    <Reveal className="lg:sticky lg:top-28 lg:self-start" offset={24}>
                        <div className="max-w-xl">
                            <h2
                                className="leading-[0.98] tracking-[-0.06em] text-[var(--ink)] text-4xl sm:text-[3.25rem] uppercase"
                                style={{ fontFamily: "var(--font-display)" }}
                            >
                                Programmable Guardrails
                            </h2>

                            <div className="mt-8 grid gap-3">
                                {features.map((feature, idx) => {
                                    const isActive = idx === activeIndex;
                                    return (
                                        <div
                                            key={idx}
                                            className="relative overflow-hidden rounded-2xl border border-[var(--line)] px-4 py-3"
                                        >
                                            {isActive && (
                                                <motion.span
                                                    layoutId="why-synod-active"
                                                    className="absolute inset-0 rounded-2xl bg-[var(--bg-surface)] border border-[var(--line)] shadow-inner"
                                                    transition={{ type: "spring", stiffness: 320, damping: 30 }}
                                                />
                                            )}
                                            <div className="relative flex items-center gap-3">
                                                <span
                                                    className={`h-2 w-2 rounded-full transition-colors duration-300 ${isActive ? "bg-[var(--brand)]" : "bg-[var(--line)]"
                                                        }`}
                                                />
                                                <p
                                                    className={`text-xs sm:text-sm font-semibold uppercase tracking-[0.15em] transition-colors duration-300 ${isActive ? "text-[var(--brand)]" : "text-[var(--ink-muted)]"
                                                        }`}
                                                >
                                                    {feature.eyebrow}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </Reveal>

                    {/* ── Right Column: Stacked Feature Cards ── */}
                    <div className="grid gap-6">
                        {features.map((feature, idx) => {
                            const isEven = idx % 2 === 0;

                            return (
                                <Reveal key={idx} delay={0.1 * (idx + 1)} offset={26} className="h-full">
                                    <div
                                        // @ts-ignore
                                        ref={(el) => (cardRefs.current[idx] = el)}
                                        data-index={idx}
                                        className={`rounded-[2rem] p-7 sm:p-9 border shadow-lg transition-colors ${isEven
                                            ? "border-[var(--line)] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.03),transparent_40%),linear-gradient(180deg,var(--bg-lift)_0%,var(--bg-surface)_100%)]"
                                            : "border-[rgba(255,255,255,0.06)] bg-[#18181b]"
                                            }`}
                                    >
                                        <h3
                                            className="max-w-[12ch] text-[1.9rem] leading-[1.02] tracking-[-0.05em] text-[var(--ink)] sm:text-[2.25rem] font-bold"
                                        >
                                            {feature.title}
                                        </h3>
                                        <p
                                            style={{ fontFamily: "var(--font-mono)" }}
                                            className="mt-5 max-w-[28ch] text-sm leading-6 text-[var(--ink-muted)] sm:text-base sm:leading-7"
                                        >
                                            {feature.body}
                                        </p>
                                    </div>
                                </Reveal>
                            );
                        })}
                    </div>

                </div>
            </div>
        </section>
    );
}
