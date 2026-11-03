import { Badge } from "@/components/ui/badge"
import { cn } from "cn"

export type StatusKind =
  | "PENDING"
  | "PAID"
  | "EXPIRED"
  | "OPEN"
  | "CLOSED"
  | "GRANTED"
  | "DENIED"
  | "BLOCKED"
  | "ACTIVE"

const STATUS_STYLES: Record<StatusKind, string> = {
  PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  PAID: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  EXPIRED: "bg-red-500/15 text-red-700 dark:text-red-400",
  OPEN: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  CLOSED: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
  GRANTED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  DENIED: "bg-red-500/15 text-red-700 dark:text-red-400",
  BLOCKED: "bg-red-500/15 text-red-700 dark:text-red-400",
  ACTIVE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
}

const STATUS_LABELS: Record<StatusKind, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  EXPIRED: "Expirada",
  OPEN: "Aberta",
  CLOSED: "Fechada",
  GRANTED: "Liberado",
  DENIED: "Negado",
  BLOCKED: "Bloqueado",
  ACTIVE: "Ativo",
}

export function StatusBadge({
  status,
  className,
}: {
  status: StatusKind
  className?: string
}) {
  return (
    <Badge variant="secondary" className={cn(STATUS_STYLES[status], className)}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}
