"use client";

import { STATIC_DOTS, GLOW_DOTS } from "./dotGridData";

export default function DotGrid() {
    return (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
                {/* Static dots */}
                <g fill="var(--dot-color)">
                    {STATIC_DOTS.map(([cx, cy], i) => (
                        <circle key={`s-${i}`} cx={cx} cy={cy} r={1.8} />
                    ))}
                </g>

                {/* Glowing / pulsing dots */}
                <g fill="var(--dot-glow)">
                    {GLOW_DOTS.map(([cx, cy, begin], i) => (
                        <circle key={`g-${i}`} cx={cx} cy={cy} r={1.9}>
                            <animate
                                attributeName="r"
                                values="1.9;2.6;1.9"
                                dur="1.8s"
                                begin={begin}
                                repeatCount="indefinite"
                            />
                            <animate
                                attributeName="fill-opacity"
                                values="0.34;0.7;0.34"
                                dur="1.8s"
                                begin={begin}
                                repeatCount="indefinite"
                            />
                        </circle>
                    ))}
                </g>
            </svg>
        </div>
    );
}
