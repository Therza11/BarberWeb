import { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border border-border bg-bg-card p-5 shadow-lg shadow-black/20 ${className}`}
    >
      {children}
    </div>
  );
}
