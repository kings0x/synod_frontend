"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface RevealProps {
    children: ReactNode;
    className?: string;
    offset?: number;
    delay?: number;
}

export default function Reveal({ children, className = "", offset = 24, delay = 0 }: RevealProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: offset }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }}
            className={className}
        >
            {children}
        </motion.div>
    );
}
