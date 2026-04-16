"use client";

import { Fragment, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function RouteReset({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [restoreVersion, setRestoreVersion] = useState(0);

  useEffect(() => {
    const handlePageShow = () => {
      setRestoreVersion((current) => current + 1);
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  return <Fragment key={`${pathname}:${restoreVersion}`}>{children}</Fragment>;
}
