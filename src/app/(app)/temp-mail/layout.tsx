import type { Metadata } from "next";
import { absoluteTitle, PAGE_META } from "@/lib/seo-meta";

export const metadata: Metadata = {
  title: absoluteTitle(PAGE_META.mail.title),
  description: PAGE_META.mail.description,
};

export default function TempMailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
