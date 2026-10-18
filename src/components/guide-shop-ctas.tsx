"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  REGISTER_INDIA,
  REGISTER_SERVICES,
  REGISTER_UK,
  REGISTER_USA,
  REGISTER_WHATSAPP,
} from "@/lib/guest-links";

/**
 * Buy / Services / US / UK (and India from the article body) go through signup
 * when the visitor is logged out. Signed-in shoppers open Services directly.
 */
export function GuideShopCtas() {
  const { status } = useSession();
  const inShop = status === "authenticated";

  const items: { href: string; label: string; primary?: boolean }[] = [
    {
      href: inShop ? "/services?service=whatsapp" : REGISTER_WHATSAPP,
      label: "Buy",
      primary: true,
    },
    { href: inShop ? "/services" : REGISTER_SERVICES, label: "Services" },
    { href: inShop ? "/services?country=US&service=whatsapp" : REGISTER_USA, label: "US" },
    { href: inShop ? "/services?country=GB&service=whatsapp" : REGISTER_UK, label: "UK" },
    { href: inShop ? "/services?country=IN&service=whatsapp" : REGISTER_INDIA, label: "India" },
  ];

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={item.primary ? "btn btn-primary" : "btn btn-ghost"}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
