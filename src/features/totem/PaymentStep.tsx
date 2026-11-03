import { useEffect, useRef } from "react"
import {
  ArrowLeft,
  CircleCheck,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  QrCode,
  TriangleAlert,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { StatusBadge } from "@/components/status-badge"
import { ApiError, createSalePixCharge, getSale } from "@/lib/api"
import { formatBRL } from "@/lib/format"
import type { SaleDetail } from "@/lib/types"

type PaymentStepProps = {
  sale: SaleDetail
  /** Chamado uma única vez quando o pagamento é confirmado. */
  onPaid: (saleId: number) => Promise<void>
  /** Volta ao carrinho enquanto a venda está pendente. */
  onBackToCart: () => void
}

export function PaymentStep({ sale, onPaid, onBackToCart }: PaymentStepProps) {
  const requestedRef = useRef(false)

  // A cobrança é criada uma vez (o servidor reusa enquanto não expirar).
  const charge = useQuery({
    queryKey: ["sale-charge", sale.id],
    queryFn: () => createSalePixCharge(sale.id),
    staleTime: Infinity,
    retry: false,
  })

  // O GET da venda consulta o Mercado Pago no servidor a cada polling.
  const { data, error, refetch } = useQuery({
    queryKey: ["sale", sale.id],
    queryFn: () => getSale(sale.id),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === "PAID" || status === "EXPIRED" ? false : 3000
    },
  })

  const status = data?.status ?? sale.status
  const isPaid = status === "PAID"
  const isExpired = status === "EXPIRED"

  useEffect(() => {
    if (isPaid && !requestedRef.current) {
      requestedRef.current = true
      void onPaid(sale.id)
    }
  }, [isPaid, onPaid, sale.id])

  const pix = charge.data
  const pixDisabled =
    charge.error instanceof ApiError && charge.error.status === 503

  async function copyPix() {
    if (!pix?.qrCode) return
    try {
      await navigator.clipboard.writeText(pix.qrCode)
      toast.success("Código Pix copiado")
    } catch {
      toast.error("Não foi possível copiar. Selecione o código manualmente.")
    }
  }

  const expiresLabel = pix?.expiresAt
    ? new Date(pix.expiresAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  return (
    <div className="mx-auto w-full max-w-lg py-4">
      <Card className={isPaid ? "border-primary/40" : undefined}>
        <CardHeader className="items-center text-center">
          <span
            className={
              isPaid
                ? "bg-primary/10 text-primary mb-2 flex size-14 items-center justify-center rounded-full"
                : isExpired
                  ? "bg-destructive/10 text-destructive mb-2 flex size-14 items-center justify-center rounded-full"
                  : "bg-amber-500/15 text-amber-600 mb-2 flex size-14 items-center justify-center rounded-full"
            }
          >
            {isPaid ? (
              <CircleCheck className="size-7" />
            ) : isExpired ? (
              <TriangleAlert className="size-7" />
            ) : (
              <Clock className="size-7" />
            )}
          </span>
          <CardTitle className="text-3xl">
            {isPaid
              ? "Pagamento confirmado!"
              : isExpired
                ? "Pagamento expirado"
                : "Aguardando pagamento"}
          </CardTitle>
          <CardDescription className="text-lg">
            {isPaid
              ? "Gerando o código de saída…"
              : isExpired
                ? "O QR Code expirou ou o pagamento foi recusado. Volte ao carrinho para gerar uma nova venda."
                : pixDisabled
                  ? "O pagamento será confirmado pelo painel admin."
                  : "Pague com Pix no app do seu banco — o totem confirma automaticamente."}
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          <div className="bg-muted/50 grid gap-1 rounded-xl p-4 text-center">
            <span className="text-muted-foreground text-sm">
              Total da venda #{sale.id}
            </span>
            <span className="text-6xl font-bold tabular-nums">
              {formatBRL(sale.totalInCents)}
            </span>
          </div>

          {!isPaid && !isExpired ? (
            charge.isPending ? (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-8">
                <Loader2 className="size-5 animate-spin" />
                Gerando o QR Code Pix…
              </div>
            ) : charge.error ? (
              <Alert variant={pixDisabled ? "default" : "destructive"}>
                <TriangleAlert />
                <AlertTitle>
                  {pixDisabled
                    ? "Pix não configurado no servidor"
                    : "Falha ao gerar o Pix"}
                </AlertTitle>
                <AlertDescription className="grid justify-items-start gap-3">
                  <span>
                    {pixDisabled
                      ? "Confirme o pagamento pelo painel admin."
                      : charge.error.message}
                  </span>
                  {!pixDisabled ? (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => void charge.refetch()}
                    >
                      Tentar de novo
                    </Button>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : pix ? (
              <div className="grid gap-4 text-center">
                <div className="grid gap-1">
                  <h2 className="text-xl font-semibold">Pague com Pix</h2>
                  <p className="text-muted-foreground text-sm">
                    Abra o app do seu banco e escaneie o QR Code.
                  </p>
                </div>

                {pix.qrCodeBase64 ? (
                  <img
                    src={`data:image/png;base64,${pix.qrCodeBase64}`}
                    alt="QR Code Pix da venda"
                    className="mx-auto size-60 rounded-xl border bg-white p-2"
                  />
                ) : pix.qrCode ? (
                  // Alguns provedores devolvem só o copia-e-cola: desenhamos o QR aqui.
                  <span className="mx-auto rounded-xl border bg-white p-3">
                    <QRCodeSVG value={pix.qrCode} size={216} />
                  </span>
                ) : (
                  <span className="bg-muted mx-auto flex size-60 items-center justify-center rounded-xl">
                    <QrCode className="text-muted-foreground size-16" />
                  </span>
                )}

                {pix.qrCode ? (
                  <div className="grid gap-2">
                    <span className="text-muted-foreground text-xs tracking-wide uppercase">
                      Pix copia e cola
                    </span>
                    <code className="bg-muted max-h-20 overflow-y-auto rounded-lg p-3 text-left text-xs break-all">
                      {pix.qrCode}
                    </code>
                    <Button
                      variant="outline"
                      className="h-12 text-base"
                      onClick={() => void copyPix()}
                    >
                      <Copy className="size-4" />
                      Copiar código
                    </Button>
                  </div>
                ) : null}

                {pix.ticketUrl ? (
                  <Button variant="ghost" asChild>
                    <a href={pix.ticketUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" />
                      Abrir no app do banco
                    </a>
                  </Button>
                ) : null}

                {expiresLabel ? (
                  <p className="text-muted-foreground text-xs">
                    QR válido até {expiresLabel}.
                  </p>
                ) : null}
              </div>
            ) : null
          ) : null}

          <Separator />

          <div className="grid gap-2">
            {sale.items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground truncate">
                  {item.quantity}× {item.name}
                </span>
                <span className="tabular-nums">
                  {formatBRL(item.priceInCents * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <StatusBadge status={status} />
            {!isPaid && !isExpired ? (
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Verificando a cada 3s…
              </span>
            ) : null}
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Falha ao consultar a venda</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center gap-3">
                <span>
                  {error instanceof Error ? error.message : "Erro inesperado."}
                </span>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => void refetch()}
                >
                  Tentar agora
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {!isPaid ? (
            <Button
              variant="outline"
              className="h-14 text-lg"
              onClick={onBackToCart}
            >
              <ArrowLeft className="size-4" />
              Voltar ao carrinho
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
