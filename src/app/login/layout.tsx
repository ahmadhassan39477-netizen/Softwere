import type { Metadata } from "next";
import { absoluteTitle, PAGE_META } from "@/lib/seo-meta";

export const metadata: Metadata = {
  title: absoluteTitle(PAGE_META.login.title),
  description: PAGE_META.login.description,
  alternates: { canonical: "https://www.tempempire.store/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
