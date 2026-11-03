/**
 * Espelho de `gridmart-api/src/utils/product-name.ts` para pré-visualizar o
 * nome enquanto o operador preenche o formulário. A API é a fonte da verdade:
 * o nome salvo é gerado por ela, com as mesmas regras.
 */

export const PRODUCT_UNITS = ["un", "ml", "l", "g", "kg"] as const
export type ProductUnit = (typeof PRODUCT_UNITS)[number]

const UNIT_LABELS: Record<ProductUnit, string> = {
  un: "un",
  ml: "ml",
  l: "L",
  g: "g",
  kg: "kg",
}

const isProductUnit = (value: string): value is ProductUnit =>
  (PRODUCT_UNITS as readonly string[]).includes(value)

/** Minúsculas e sem acento — usado na busca (independe de "Café"/"cafe"). */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

const collapse = (value: string) => value.trim().replace(/\s+/g, " ")

/** "ZERO" -> "Zero" · "coca-cola" -> "Coca-Cola" · "Nestlé" -> "Nestlé". */
export function titleize(value: string): string {
  const trimmed = collapse(value)
  if (!trimmed) return ""

  const isShout =
    trimmed === trimmed.toUpperCase() && trimmed !== trimmed.toLowerCase()
  const isLazy = trimmed === trimmed.toLowerCase()
  if (!isShout && !isLazy) return trimmed

  return trimmed
    .toLowerCase()
    .replace(
      /(^|[\s\-/])(\p{L})/gu,
      (_, separator: string, letter: string) =>
        separator + letter.toUpperCase(),
    )
}

/** "1.5" -> "1,5" · "0350" -> "350". */
const normalizeAmount = (value: string) =>
  collapse(value)
    .replace(/\./g, ",")
    .replace(/^0+(?=\d)/, "")

/** "350" + "ml" -> "350 ml". Unidade isolada ("1 un") é omitida. */
export function formatSize(
  netContent?: string | null,
  unit?: string | null,
): string {
  if (!netContent || !unit) return ""
  const amount = normalizeAmount(netContent)
  if (!amount) return ""
  if (unit === "un" && (amount === "1" || amount === "0")) return ""
  const label = isProductUnit(unit) ? UNIT_LABELS[unit] : unit
  return `${amount} ${label}`
}

export type ProductNameInput = {
  categoryName?: string | null
  brandName?: string | null
  variant?: string | null
  packagingName?: string | null
  netContent?: string | null
  unit?: string | null
  packQty?: number | null
}

/** Mesmo padrão da API: `[Pack Nx] Tipo Marca Variante Embalagem Conteúdo`. */
export function buildProductName(input: ProductNameInput): string {
  const parts: string[] = []

  if (input.packQty && input.packQty > 1) parts.push(`Pack ${input.packQty}x`)

  const category = titleize(input.categoryName ?? "")
  if (category) parts.push(category)

  const brand = titleize(input.brandName ?? "")
  if (brand) parts.push(brand)

  const variant = titleize(input.variant ?? "")
  if (variant) parts.push(variant)

  const packaging = titleize(input.packagingName ?? "")
  if (
    packaging &&
    !["un", "unidade"].includes(normalizeText(packaging))
  ) {
    parts.push(packaging)
  }

  const size = formatSize(input.netContent, input.unit)
  if (size) parts.push(size)

  return collapse(parts.join(" "))
}

/** Nome digitado à mão (produtos sem classificação), normalizado. */
export function normalizeProductName(name: string): string {
  return titleize(collapse(name).toLowerCase()).replace(
    /(\d)\s*(ml|kg|g|mg|l)\b/gi,
    (_, digit: string, unit: string) => {
      const lower = unit.toLowerCase()
      return `${digit} ${lower === "l" ? "L" : lower}`
    },
  )
}
