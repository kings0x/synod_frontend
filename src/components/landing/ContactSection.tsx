"use client";

import Reveal from "@/components/motion/Reveal";
import Link from "next/link";

export function ContactSection() {
    return (
        <section id="contact" className="pb-16 pt-4 sm:pb-20 sm:pt-6">
            <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
                <Reveal>
                    <div className="relative rounded-[2rem] border border-white/5 bg-white/[0.02] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.4)] sm:p-8 lg:p-10">
                        {/* Note: I adjusted the background from the bright white of Renew 
                            to match Synod's dark theme, maintaining a glossy premium feel */}
                        <div className="pointer-events-none absolute left-1/2 top-[47%] hidden h-28 w-[20rem] -translate-x-1/2 -translate-y-1/2 lg:block">
                            <svg aria-hidden="true" viewBox="0 0 720 200" className="h-full w-full" fill="none">
                                <defs>
                                    <marker id="cta-arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto" markerUnits="strokeWidth">
                                        <path d="M0 0L8 4L0 8" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"></path>
                                    </marker>
                                </defs>
                                <path
                                    d="M18 152C116 64 230 32 332 40C405 46 451 84 451 125C451 157 424 181 392 176C360 171 341 143 347 116C354 87 383 69 422 72C478 77 529 115 590 124C635 131 673 120 706 92"
                                    stroke="var(--brand)"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    markerEnd="url(#cta-arrowhead)"
                                    opacity="0.5"
                                ></path>
                            </svg>
                        </div>

                        <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-8">
                            <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
                                <h2 className="mx-auto max-w-[14ch] text-balance font-display text-4xl leading-[0.98] tracking-[-0.06em] text-white sm:text-[3.15rem] lg:mx-0">
                                    Launch Your Agentic Treasury.
                                </h2>
                            </div>

                            <div className="mx-auto flex flex-row flex-wrap items-center justify-center gap-3 lg:mx-0 lg:flex-col lg:items-end lg:justify-start">
                                <Link
                                    href="#"
                                    className="inline-flex items-center justify-center rounded-full px-5 py-3 sm:px-7 sm:py-3.5 text-sm font-semibold tracking-[-0.02em] transition-colors duration-200 bg-[var(--brand)] text-[var(--bg-base)] hover:bg-[var(--accent)]"
                                >
                                    Get started
                                </Link>
                                <Link
                                    href="#"
                                    className="inline-flex items-center justify-center rounded-full px-5 py-3 sm:px-7 sm:py-3.5 text-sm font-semibold tracking-[-0.02em] transition-colors duration-200 border border-white/20 bg-white/5 text-white hover:bg-white/10"
                                >
                                    Read docs
                                </Link>
                            </div>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
