import RouteReset from "@/components/route/RouteReset";

export default function Template({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RouteReset>{children}</RouteReset>;
}
