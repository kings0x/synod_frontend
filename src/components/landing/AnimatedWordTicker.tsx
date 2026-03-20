"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const WORDS = ["TREASURY", "AGENTS", "CAPITAL", "TRUST"];
const TYPING_SPEED = 120; // ms per letter
const DELETING_SPEED = 60; // ms per letter
const PAUSE_DURATION = 2000; // ms to display full word before deleting

export default function AnimatedWordTicker() {
    const [wordIndex, setWordIndex] = useState(0);
    const [text, setText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const currentWord = WORDS[wordIndex];

        const timer = setTimeout(() => {
            // Typing logic
            if (!isDeleting) {
                if (text.length < currentWord.length) {
                    setText(currentWord.slice(0, text.length + 1));
                } else {
                    // Pause before deleting
                    setTimeout(() => setIsDeleting(true), PAUSE_DURATION);
                }
            }
            // Deleting logic
            else {
                if (text.length > 0) {
                    setText(currentWord.slice(0, text.length - 1));
                } else {
                    // Move to next word
                    setIsDeleting(false);
                    setWordIndex((prev) => (prev + 1) % WORDS.length);
                }
            }
        }, isDeleting ? DELETING_SPEED : TYPING_SPEED);

        return () => clearTimeout(timer);
    }, [text, isDeleting, wordIndex]);

    return (
        <span className="inline-flex items-baseline">
            {/* Container for motion animations when word completely changes (simulating the symbol enter/exit from renew-site) */}
            <AnimatePresence mode="popLayout">
                <motion.span
                    key={wordIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="inline-block text-[var(--brand)]"
                >
                    {text}
                </motion.span>
            </AnimatePresence>
            <span
                aria-hidden="true"
                className="ml-2 inline-block h-[0.8em] w-[0.08em] bg-[var(--brand)] opacity-90 animate-[hero-caret_0.9s_steps(1,end)_infinite]"
            ></span>
        </span>
    );
}
