import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

const FIELD_CLASS =
  "rounded-md border border-border bg-bg-elevated px-3 py-2 text-fg placeholder:text-fg-muted focus:border-accent focus:outline-none";

export function Label({ children }: { children: ReactNode }) {
  return <span className="text-xs font-medium uppercase tracking-wide text-fg-muted">{children}</span>;
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${FIELD_CLASS} ${className}`} {...props} />;
}

export function Select({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${FIELD_CLASS} ${className}`} {...props} />;
}

export function Field({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <label className={`flex flex-col gap-1.5 ${className}`}>{children}</label>;
}
