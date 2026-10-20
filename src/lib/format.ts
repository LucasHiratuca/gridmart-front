/** A API guarda preços em centavos; aqui só converte pra exibição. */

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function moneyInCents(cents: number): string {
  return brl.format(cents / 100);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
