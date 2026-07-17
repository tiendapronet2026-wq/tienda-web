import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "destructive" | "dark";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand-hover shadow-[var(--shadow-sm)] disabled:bg-surface-muted disabled:text-muted disabled:shadow-none",
  secondary:
    "bg-brand-secondary text-white hover:bg-brand-secondary-hover shadow-[var(--shadow-sm)] disabled:bg-surface-muted disabled:text-muted",
  ghost: "bg-transparent text-text-secondary hover:bg-surface-muted hover:text-foreground",
  outline:
    "border border-border bg-surface text-foreground hover:border-brand hover:text-brand disabled:opacity-60",
  destructive: "bg-error text-white hover:bg-error/90 disabled:opacity-60",
  dark: "bg-hero text-white hover:bg-foreground shadow-[var(--shadow-sm)]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-xs rounded-[var(--radius-md)]",
  md: "h-11 px-5 text-sm rounded-[var(--radius-lg)]",
  lg: "h-12 px-6 text-sm rounded-[var(--radius-lg)]",
};

const base =
  "inline-flex items-center justify-center gap-2 font-semibold transition duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary disabled:cursor-not-allowed";

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    />
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
};

export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth,
  className = "",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    />
  );
}
