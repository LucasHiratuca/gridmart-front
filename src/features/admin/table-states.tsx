import type React from "react"
import { Inbox, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableRow } from "@/components/ui/table"

/** Esqueleto de carregamento para tabelas. */
export function TableLoadingRows({
  cols,
  rows = 5,
}: {
  cols: number
  rows?: number
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: cols }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

/** Linha centralizada com mensagem (erro/vazio). */
export function TableMessageRow({
  cols,
  children,
}: {
  cols: number
  children: React.ReactNode
}) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="h-32 text-center">
        <div className="text-muted-foreground flex flex-col items-center justify-center gap-3 text-sm">
          {children}
        </div>
      </TableCell>
    </TableRow>
  )
}

export function TableEmptyRow({
  cols,
  message = "Nenhum registro encontrado.",
}: {
  cols: number
  message?: string
}) {
  return (
    <TableMessageRow cols={cols}>
      <Inbox className="size-5" />
      <span>{message}</span>
    </TableMessageRow>
  )
}

export function TableErrorRow({
  cols,
  error,
  onRetry,
}: {
  cols: number
  error: unknown
  onRetry: () => void
}) {
  const message = error instanceof Error ? error.message : "Erro inesperado."

  return (
    <TableMessageRow cols={cols}>
      <span className="text-destructive">{message}</span>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="size-4" />
        Tentar novamente
      </Button>
    </TableMessageRow>
  )
}
