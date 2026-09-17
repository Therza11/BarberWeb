import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "danger" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-fg hover:bg-accent-hover disabled:bg-accent/40",
  outline:
    "border border-border text-fg hover:border-accent hover:text-accent disabled:opacity-40",
  danger:
    "border border-danger/50 text-danger hover:bg-danger/10 disabled:opacity-40",
  ghost: "text-fg-muted hover:text-fg disabled:opacity-40",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({ variant = "primary", className = "", ...props }: Props) {
  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-medium tracking-wide transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
