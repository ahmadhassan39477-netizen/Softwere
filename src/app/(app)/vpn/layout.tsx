import type { Metadata } from "next";
import { absoluteTitle } from "@/lib/seo-meta";

export const metadata: Metadata = {
  title: absoluteTitle("VPN & Proxy | Temp Empire"),
  description:
    "Datacenter proxy, residential proxy, and VPN config on your Temp Empire account. Sign in required. Not a fake connected tunnel.",
};

export default function VpnLayout({ children }: { children: React.ReactNode }) {
  return children;
}
