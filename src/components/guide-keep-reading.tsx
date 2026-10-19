import Link from "next/link";
import {
  GUIDES_HUB_PATH,
  otherPublicGuides,
  type PublicGuideId,
} from "@/lib/guides-catalog";

const chip =
  "inline-flex rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:border-[var(--accent)]";

export function GuideKeepReading({
  currentId,
  extras,
}: {
  currentId: PublicGuideId;
  extras?: readonly { href: string; label: string }[];
}) {
  const others = otherPublicGuides(currentId);
  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {others.map((g) => (
        <li key={g.path}>
          <Link href={g.path} className={chip}>
            {g.label}
          </Link>
        </li>
      ))}
      <li>
        <Link href={GUIDES_HUB_PATH} className={chip}>
          All guides
        </Link>
      </li>
      {extras?.map((item) => (
        <li key={`${item.href}-${item.label}`}>
          <Link href={item.href} className={chip}>
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
