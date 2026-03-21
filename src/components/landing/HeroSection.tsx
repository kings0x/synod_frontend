"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";
import DotGrid from "./DotGrid";
import AnimatedWordTicker from "./AnimatedWordTicker";

const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
    hidden: { opacity: 0, y: 32 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function HeroSection() {
    const controls = useAnimation();

    useEffect(() => {
        // Explicitly start animation on mount to bypass Next.js back-navigation cache issues
        controls.start("show");
    }, [controls]);

    return (
        <section className="relative z-0 flex min-h-[calc(100svh-6.5rem)] items-center overflow-hidden pb-20 pt-8 isolate sm:pb-24 lg:min-h-[calc(100svh-7rem)] lg:pb-32">
            {/* ── Radial gradient overlay ── */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[30rem] bg-[radial-gradient(circle_at_top,rgba(167,139,250,0.12),rgba(0,0,0,0)_62%)]" />

            {/* ── Dot grid background ── */}
            <DotGrid />

            {/* ── Content ── */}
            <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="mx-auto w-full max-w-5xl">
                    {/* ── Headline ── */}
                    <motion.div
                        variants={stagger}
                        initial="hidden"
                        animate={controls}
                    >
                        <motion.h1
                            variants={fadeUp}
                            className="leading-[0.9] tracking-[-0.06em] text-[var(--ink)]"
                            style={{ fontFamily: "var(--font-display)" }}
                        >
                            <span className="block text-[clamp(3.3rem,8vw,6.8rem)] uppercase">
                                <span className="sm:inline">GOVERN </span>
                                <span className="block sm:inline">
                                    <AnimatedWordTicker />
                                </span>
                            </span>
                            <span className="block text-[clamp(2.8rem,6.7vw,5.8rem)] uppercase">
                                ON-CHAIN BY POLICY
                            </span>
                        </motion.h1>

                        {/* ── Subheadline ── */}
                        {/* <motion.p
                            variants={fadeUp}
                            className="mt-6 max-w-[38ch] text-base leading-7 sm:text-lg sm:leading-8"
                            style={{ fontFamily: "var(--font-mono)", color: "var(--ink-muted)" }}
                        >
                            Synod is the treasury layer for autonomous AI agents.
                        </motion.p> */}

                        {/* ── CTAs ── */}
                        <motion.div
                            variants={fadeUp}
                            className="mt-8 flex flex-row flex-wrap items-center gap-3"
                        >
                            {/* Primary CTA */}
                            <a
                                className="inline-flex items-center justify-center rounded-full px-5 py-3 sm:px-7 sm:py-3.5 text-sm font-semibold tracking-[-0.02em] transition-colors duration-200 bg-[var(--brand)] text-[var(--bg-base)] hover:bg-[var(--accent)]"
                                href="#"
                                style={{ fontFamily: "var(--font-mono)" }}
                            >
                                Get started
                            </a>

                            {/* Ghost CTA */}
                            <a
                                className="inline-flex items-center justify-center rounded-full px-5 py-3 sm:px-7 sm:py-3.5 text-sm font-semibold tracking-[-0.02em] transition-colors duration-200 border border-[var(--line)] bg-white/5 text-[var(--ink)] hover:bg-white/10"
                                href="#"
                                style={{ fontFamily: "var(--font-mono)" }}
                            >
                                View docs
                            </a>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
