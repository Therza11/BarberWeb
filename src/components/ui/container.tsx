import { ReactNode } from "react";

export function Container({
  children,
  className = "",
  size = "md",
}: {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const width = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-4xl" : "max-w-xl";
  return <div className={`mx-auto w-full ${width} px-4 py-10 ${className}`}>{children}</div>;
}
