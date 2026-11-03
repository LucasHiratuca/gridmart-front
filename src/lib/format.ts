const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "medium",
})

const timeFormatter = new Intl.DateTimeFormat("pt-BR", { timeStyle: "medium" })

/** Converte centavos → "R$ 18,90". */
export function formatBRL(priceInCents: number): string {
  return brlFormatter.format(priceInCents / 100)
}

/** ISO → "20/10/2026, 14:03:25" */
export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso))
}

/** ISO → "14:03:25" */
export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso))
}

/**
 * Converte um valor digitado em reais ("18,90" / "18.90") para centavos.
 * Retorna `null` se não for um número válido.
 */
export function parseBRLToCents(value: string): number | null {
  let normalized = value.trim()
  if (normalized.includes(",")) {
    // pt-BR: ponto = milhar, vírgula = decimal
    normalized = normalized.replace(/\./g, "").replace(",", ".")
  }
  if (normalized === "") return null
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed * 100)
}

/** Contagem regressiva mm:ss até uma data ISO. */
export function formatCountdown(targetIso: string, now = Date.now()): string {
  const remaining = Math.max(0, new Date(targetIso).getTime() - now)
  const totalSeconds = Math.ceil(remaining / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}
