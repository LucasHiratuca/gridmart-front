import { useState } from "react"
import { CircleCheck, Eye, Loader2 } from "lucide-react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/status-badge"
import {
  adminListSales,
  adminPaySale,
  ApiError,
  getSale,
} from "@/lib/api"
import { formatBRL, formatDateTime } from "@/lib/format"
import type { SaleListItem, SaleStatus } from "@/lib/types"
import { PageHeader } from "./page-header"
import {
  TableEmptyRow,
  TableErrorRow,
  TableLoadingRows,
} from "./table-states"

const COLS = 6

type SalesFilter = "ALL" | SaleStatus

const FILTER_LABELS: Record<SalesFilter, string> = {
  ALL: "Todas",
  PENDING: "Pendentes",
  PAID: "Pagas",
  EXPIRED: "Expiradas",
}

export function AdminSalesPage() {
  const [filter, setFilter] = useState<SalesFilter>("ALL")
  const [paying, setPaying] = useState<SaleListItem | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "sales", filter],
    queryFn: () => adminListSales(filter === "ALL" ? undefined : filter),
  })

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Vendas"
        description="Acompanhe as vendas do totem — o Pix é confirmado automaticamente (confirme manualmente só como fallback)."
      >
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as SalesFilter)}
        >
          <TabsList>
            {(Object.keys(FILTER_LABELS) as SalesFilter[]).map((value) => (
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
                <TableHead className="w-16">#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="w-40 text-right">Ações</TableHead>
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
                <TableEmptyRow cols={COLS} message="Nenhuma venda nesta lista." />
              ) : (
                data.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {sale.id}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{sale.userName}</div>
                      <div className="text-muted-foreground font-mono text-xs">
                        {sale.userCpf}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatBRL(sale.totalInCents)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={sale.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {formatDateTime(sale.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {sale.status === "PENDING" ? (
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => setPaying(sale)}
                          >
                            <CircleCheck className="size-3.5" />
                            Confirmar pagamento
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Ver detalhes da venda ${sale.id}`}
                          onClick={() => setDetailId(sale.id)}
                        >
                          <Eye className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {paying ? (
        <PaySaleDialog
          sale={paying}
          open
          onOpenChange={(open) => {
            if (!open) setPaying(null)
          }}
        />
      ) : null}
      {detailId !== null ? (
        <SaleDetailDialog
          saleId={detailId}
          open
          onOpenChange={(open) => {
            if (!open) setDetailId(null)
          }}
        />
      ) : null}
    </div>
  )
}

// ── Confirmação de pagamento (substitui o webhook do Pix) ─────────────────

function PaySaleDialog({
  sale,
  open,
  onOpenChange,
}: {
  sale: SaleListItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()

  const payMutation = useMutation({
    mutationFn: () => adminPaySale(sale.id),
    onSuccess: () => {
      toast.success(`Venda #${sale.id} confirmada como paga.`)
      queryClient.invalidateQueries({ queryKey: ["admin", "sales"] })
      queryClient.invalidateQueries({ queryKey: ["sale", sale.id] })
      onOpenChange(false)
    },
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "Erro ao confirmar o pagamento.",
      )
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirmar pagamento</DialogTitle>
          <DialogDescription>
            A venda <strong>#{sale.id}</strong> de {sale.userName} no valor de{" "}
            <strong>{formatBRL(sale.totalInCents)}</strong> será marcada como
            paga. O cliente poderá gerar o token de saída em seguida.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={payMutation.isPending}
            onClick={() => payMutation.mutate()}
          >
            {payMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CircleCheck className="size-4" />
            )}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Detalhe da venda (itens) ──────────────────────────────────────────────

function SaleDetailDialog({
  saleId,
  open,
  onOpenChange,
}: {
  saleId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["sale", saleId],
    queryFn: () => getSale(saleId),
    enabled: open,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Venda #{saleId}</DialogTitle>
          <DialogDescription>Itens e total desta venda.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="grid gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        ) : error ? (
          <div className="grid gap-3">
            <p className="text-destructive text-sm">
              {error instanceof ApiError || error instanceof Error
                ? error.message
                : "Erro ao carregar a venda."}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : data ? (
          <div className="grid gap-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Qtd.</TableHead>
                  <TableHead className="text-right">Unitário</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-center tabular-nums">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(item.priceInCents)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(item.priceInCents * item.quantity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between">
              <StatusBadge status={data.status} />
              <span className="text-lg font-semibold tabular-nums">
                {formatBRL(data.totalInCents)}
              </span>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
