import Link from "next/link";

export function Footer() {
    return (
        <footer className="pb-10 pt-2 sm:pb-12">
            <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-5 border-t border-white/10 pt-6 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
                    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-4">
                        <div className="relative flex items-center h-4 sm:h-[1.125rem]">
                            <img src="/synod_logo.png" alt="Synod Logo" className="h-full w-auto opacity-90" />
                        </div>
                        <p className="max-w-[36ch] text-xs text-white/50" style={{ fontFamily: "var(--font-mono)" }}>
                            The Governance Layer for Autonomous Capital
                        </p>
                    </div>

                    <div className="flex flex-col items-center gap-3 text-sm text-white/50 sm:items-end">
                        <div className="flex items-center gap-4" style={{ fontFamily: "var(--font-mono)" }}>
                            <Link className="font-medium transition-colors hover:text-[var(--brand)]" href="/">
                                Home
                            </Link>
                            <Link className="font-medium transition-colors hover:text-[var(--brand)]" href="#">
                                Docs
                            </Link>
                            <a className="font-medium transition-colors hover:text-[var(--brand)]" href="#">
                                Twitter
                            </a>
                            <a className="font-medium transition-colors hover:text-[var(--brand)]" href="https://github.com/kings0x/synod.git" target="_blank" rel="noopener noreferrer">
                                GitHub
                            </a>
                        </div>
                        <p style={{ fontFamily: "var(--font-mono)" }}>© {new Date().getFullYear()} Synod</p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
