import { useState } from "react"
import { CircleCheck, DoorOpen, Loader2 } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { adminCloseVisit, adminListVisits } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import type { VisitListItem, VisitStatus } from "@/lib/types"
import { PageHeader } from "./page-header"
import {
  TableEmptyRow,
  TableErrorRow,
  TableLoadingRows,
} from "./table-states"

const COLS = 6

type VisitsFilter = "ALL" | VisitStatus

const FILTER_LABELS: Record<VisitsFilter, string> = {
  ALL: "Todas",
  OPEN: "Dentro agora",
  CLOSED: "Encerradas",
}

export function AdminVisitsPage() {
  const [filter, setFilter] = useState<VisitsFilter>("OPEN")
  const [closing, setClosing] = useState<VisitListItem | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "visits", filter],
    queryFn: () => adminListVisits(filter === "ALL" ? undefined : filter),
  })

  const insideCount = data?.length ?? 0

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Visitas"
        description={
          filter === "OPEN"
            ? `${insideCount} ${insideCount === 1 ? "cliente está" : "clientes estão"} dentro da loja.`
            : "Histórico de entradas e saídas dos clientes."
        }
      >
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as VisitsFilter)}
        >
          <TabsList>
            {(Object.keys(FILTER_LABELS) as VisitsFilter[]).map((value) => (
              <TabsTrigger key={value} value={value}>
                {FILTER_LABELS[value]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Entrou</TableHead>
                <TableHead>Saiu</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableLoadingRows cols={COLS} />
              ) : error ? (
                <TableErrorRow
                  cols={COLS}
                  error={error}
                  onRetry={() => refetch()}
                />
              ) : !data || data.length === 0 ? (
                <TableEmptyRow
                  cols={COLS}
                  message={
                    filter === "OPEN"
                      ? "Nenhum cliente dentro da loja."
                      : "Nenhuma visita encontrada."
                  }
                />
              ) : (
                data.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell className="font-medium">
                      {visit.userName}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {visit.userCpf}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={visit.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {formatDateTime(visit.enteredAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {visit.exitedAt ? formatDateTime(visit.exitedAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {visit.status === "OPEN" ? (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setClosing(visit)}
                        >
                          <DoorOpen className="size-3.5" />
                          Fechar visita
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {closing ? (
        <CloseVisitDialog
          visit={closing}
          open
          onOpenChange={(open) => {
            if (!open) setClosing(null)
          }}
        />
      ) : null}
    </div>
  )
}

function CloseVisitDialog({
  visit,
  open,
  onOpenChange,
}: {
  visit: VisitListItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()

  const closeMutation = useMutation({
    mutationFn: () => adminCloseVisit(visit.id),
    onSuccess: () => {
      toast.success(`Visita de ${visit.userName} encerrada.`)
      queryClient.invalidateQueries({ queryKey: ["admin", "visits"] })
      onOpenChange(false)
    },
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "Erro ao fechar a visita.",
      )
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Fechar visita</DialogTitle>
          <DialogDescription>
            Encerrar a visita de <strong>{visit.userName}</strong>? Use isso
            quando o cliente sair sem gerar token (ex.: saiu pela botoeira).
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={closeMutation.isPending}
            onClick={() => closeMutation.mutate()}
          >
            {closeMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CircleCheck className="size-4" />
            )}
            Fechar visita
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
