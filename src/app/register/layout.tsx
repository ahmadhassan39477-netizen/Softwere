import type { Metadata } from "next";
import { absoluteTitle, PAGE_META } from "@/lib/seo-meta";

export const metadata: Metadata = {
  title: absoluteTitle(PAGE_META.register.title),
  description: PAGE_META.register.description,
  alternates: { canonical: "https://www.tempempire.store/register" },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
