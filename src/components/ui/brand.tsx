import Image from "next/image";
import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2">
      <Image
        src="/logo-icon.png"
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 rounded-full"
        priority
      />
      <span className="font-display text-lg font-semibold tracking-wide text-fg">
        Barber<span className="text-accent">Web</span>
      </span>
    </Link>
  );
}
