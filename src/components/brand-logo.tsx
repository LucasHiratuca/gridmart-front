import { cn } from "cn"

/**
 * Arquivos oficiais em `public/brand/`:
 * - `logo_longa.png`: símbolo + nome (cabeçalhos);
 * - `logo.png`: símbolo isolado (favicon e espaços curtos).
 */
const LOGO_SRC = {
  full: "/brand/logo_longa.png",
  symbol: "/brand/logo-256.png",
} as const

type BrandLogoProps = {
  variant?: keyof typeof LOGO_SRC
  className?: string
  alt?: string
}

export function BrandLogo({
  variant = "symbol",
  className,
  alt = "GridMart",
}: BrandLogoProps) {
  return (
    <img
      src={LOGO_SRC[variant]}
      alt={alt}
      draggable={false}
      className={cn("w-auto object-contain select-none", className)}
    />
  )
}
