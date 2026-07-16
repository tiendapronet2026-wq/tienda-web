import Image from "next/image";
import Link from "next/link";

type BrandLogoProps = {
  href?: string | null;
  /** light = icono + wordmark CSS (fondos claros). dark = logo horizontal completo. mark = solo isotipo */
  variant?: "light" | "dark" | "mark";
  size?: "sm" | "md" | "lg";
  className?: string;
  priority?: boolean;
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
}: BrandLogoProps) {
  const mark = markSize[size];

  const content =
    variant === "dark" ? (
      <Image
        src="/brand/logos/logo-tiendapro-horizontal.png"
        alt="TiendaPro"
        width={200}
        height={56}
        className="h-9 w-auto sm:h-10"
        priority={priority}
      />
    ) : variant === "mark" ? (
      <Image
        src="/brand/icons/logo-tiendapro-icon.png"
        alt="TiendaPro"
        width={mark.px}
        height={mark.px}
        className={mark.box}
        priority={priority}
      />
    ) : (
      <span className="flex items-center gap-2.5">
        <Image
          src="/brand/icons/logo-tiendapro-icon.png"
          alt=""
          width={40}
          height={40}
          className="h-9 w-9 sm:h-10 sm:w-10"
          priority={priority}
        />
        <span className="text-xl font-extrabold tracking-tight text-foreground sm:text-[1.35rem]">
          Tienda<span className="text-brand">Pro</span>
        </span>
      </span>
    );

  if (!href) {
    return <span className={`inline-flex items-center ${className}`}>{content}</span>;
  }

  return (
    <Link href={href} className={`inline-flex items-center ${className}`} aria-label="TiendaPro inicio">
      {content}
    </Link>
  );
}
