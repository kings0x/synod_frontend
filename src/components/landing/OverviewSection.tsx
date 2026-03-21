"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const OVERVIEW_TEXT =
    "Let AI agents move capital — without ever trusting them. enforcing how AI agents move money, at the network level, not by trust";
const WORDS = OVERVIEW_TEXT.split(" ");

function AnimatedWord({
    word,
    progress,
    index,
    total,
}: {
    word: string;
    progress: any;
    index: number;
    total: number;
}) {
    // Start revealing this word slightly after the previous one
    const start = (index / total) * 0.72;
    const end = start + 0.22;

    // Synod dark mode color interpolation: 
    // From faded slate-gray (unfocused) to luminous white/purple (focused)
    const color = useTransform(
        progress,
        [start, end],
        ["rgba(255, 255, 255, 0.12)", "rgba(255, 255, 255, 0.95)"]
    );

    return (
        <motion.span style={{ color }} className="inline-block transition-colors duration-75">
            {word}&nbsp;
        </motion.span>
    );
}

export default function OverviewSection() {
    const containerRef = useRef<HTMLElement>(null);

    // Track scroll progress strictly within this section's bounds
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"],
    });

    return (
        <section
            id="overview"
            ref={containerRef}
            // intentional taller-than-viewport height to create scrolling distance
            className="relative min-h-[150svh] sm:min-h-[160svh] lg:min-h-[170svh]"
            style={{ position: "relative" }}
        >
            <div className="sticky top-[5.75rem] flex items-start pt-6 sm:pt-8 lg:pt-10 min-h-[calc(100svh-5.75rem)] w-full">
                <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-5xl">
                        <p
                            className="text-balance leading-[1.04] tracking-[-0.06em]"
                            style={{
                                fontFamily: "var(--font-display)",
                                // exact responsive dimensions from Renew snippet
                                fontSize: "clamp(2rem, 4.7vw, 4.4rem)",
                            }}
                        >
                            {WORDS.map((word, i) => (
                                <AnimatedWord
                                    key={`${word}-${i}`}
                                    word={word}
                                    progress={scrollYProgress}
                                    index={i}
                                    total={WORDS.length}
                                />
                            ))}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
