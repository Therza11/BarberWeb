import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-accent text-sm font-bold text-accent">
        B
      </span>
      <span className="font-display text-lg font-semibold tracking-wide text-fg">
        Barber<span className="text-accent">Web</span>
      </span>
    </Link>
  );
}
