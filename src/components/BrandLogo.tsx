import Image from "next/image";
import Link from "next/link";
import type { StoreBrandingConfig } from "@/lib/branding/types";
import { BrandWordmark } from "@/components/branding/BrandWordmark";

type BrandLogoProps = {
  href?: string | null;
  variant?: "light" | "dark" | "mark";
  size?: "sm" | "md" | "lg";
  className?: string;
  priority?: boolean;
  branding?: StoreBrandingConfig;
};

const markSize = {
  sm: { box: "h-8 w-8", px: 32 },
  md: { box: "h-9 w-9 sm:h-10 sm:w-10", px: 40 },
  lg: { box: "h-40 w-40 sm:h-52 sm:w-52 lg:h-64 lg:w-64", px: 256 },
} as const;

export function BrandLogo({
  href = "/",
  variant = "light",
  size = "md",
  className = "",
  priority = false,
  branding,
}: BrandLogoProps) {
  const mark = markSize[size];
  const logoSrc = branding?.logoUrl ?? "/brand/icons/logo-tiendapro-icon.png";
  const label = branding?.brandName ?? "TiendaPro";

  const content =
    variant === "dark" ? (
      <Image
        src="/brand/logos/logo-tiendapro-horizontal.png"
        alt={label}
        width={200}
        height={56}
        className="h-9 w-auto sm:h-10"
        priority={priority}
      />
    ) : variant === "mark" ? (
      <Image
        src={logoSrc}
        alt={label}
        width={mark.px}
        height={mark.px}
        className={mark.box}
        priority={priority}
        unoptimized={logoSrc.startsWith("http")}
      />
    ) : (
      <span className="flex items-center gap-2.5">
        <Image
          src={logoSrc}
          alt=""
          width={40}
          height={40}
          className="h-9 w-9 sm:h-10 sm:w-10"
          priority={priority}
          unoptimized={logoSrc.startsWith("http")}
        />
        {branding ? (
          <BrandWordmark branding={branding} />
        ) : (
          <span className="text-xl font-extrabold tracking-tight text-foreground sm:text-[1.35rem]">
            Tienda<span className="text-brand">Pro</span>
          </span>
        )}
      </span>
    );

  if (!href) {
    return <span className={`inline-flex items-center ${className}`}>{content}</span>;
  }

  return (
    <Link href={href} className={`inline-flex items-center ${className}`} aria-label={`${label} inicio`}>
      {content}
    </Link>
  );
}
