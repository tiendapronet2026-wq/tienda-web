"use client";

import Image from "next/image";
import { useState } from "react";
import { resolveProductImageUrl } from "@/lib/product-image";

type ProductImageProps = {
  src: string | null | undefined;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Clases del contenedor del fallback (debe conservar la proporción). */
  fallbackClassName?: string;
};

function ImageUnavailable({ className }: { className?: string }) {
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-brand-soft text-brand ${className ?? ""}`}
      role="img"
      aria-label="Imagen no disponible"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-8 w-8 opacity-70"
        aria-hidden="true"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="8.5" cy="10" r="1.5" />
        <path d="M21 16l-5.5-5.5L6 20" />
      </svg>
      <span className="px-2 text-center text-xs font-medium text-text-secondary">
        Imagen no disponible
      </span>
    </div>
  );
}

export function ProductImage({
  src,
  alt,
  fill = true,
  width,
  height,
  className,
  sizes,
  priority,
  fallbackClassName,
}: ProductImageProps) {
  const resolved = resolveProductImageUrl(src);
  const [failed, setFailed] = useState(false);

  if (!resolved || failed) {
    return <ImageUnavailable className={fallbackClassName} />;
  }

  return (
    <Image
      src={resolved}
      alt={alt}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={className}
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
    />
  );
}
