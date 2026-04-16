"use client";

import { motion, useInView, useAnimation } from "framer-motion";
import { ReactNode, useEffect, useRef } from "react";

interface RevealProps {
    children: ReactNode;
    className?: string;
    offset?: number;
    delay?: number;
}

export default function Reveal({ children, className = "", offset = 24, delay = 0 }: RevealProps) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, amount: 0.1, margin: "0px 0px -50px 0px" });
    const controls = useAnimation();
    const hasRevealedRef = useRef(false);

    useEffect(() => {
        // If the item is in view, we explicitly tell Framer Motion to start the animation.
        // This avoids Next.js cache state-mismatches where whileInView fails to fire.
        if (isInView) {
            hasRevealedRef.current = true;
            controls.start({
                opacity: 1,
                y: 0,
                transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay },
            });
        }
    }, [isInView, controls, delay]);

    useEffect(() => {
        const fallbackTimer = window.setTimeout(() => {
            if (!hasRevealedRef.current) {
                controls.set({ opacity: 1, y: 0 });
            }
        }, 1200 + delay * 1000);

        return () => window.clearTimeout(fallbackTimer);
    }, [controls, delay]);

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: offset }}
            animate={controls}
            className={className}
        >
            {children}
        </motion.div>
    );
}
