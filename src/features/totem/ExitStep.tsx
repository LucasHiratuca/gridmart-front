import { useEffect, useMemo, useState } from "react"
import {
  CircleAlert,
  Copy,
  DoorOpen,
  Loader2,
  QrCode,
  RefreshCw,
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useMutation } from "@tanstack/react-query"
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
import { exitStore } from "@/lib/api"
import { formatCountdown } from "@/lib/format"
import type { ExitToken } from "@/lib/types"

type ExitStepProps = {
  token: ExitToken | null
  /** true enquanto um token está sendo gerado. */
  busy: boolean
  /** erro do último pedido de token (quando token === null). */
  error: string | null
  onRegenerate: () => void
  onExited: () => void
}

export function ExitStep({
  token,
  busy,
  error,
  onRegenerate,
  onExited,
}: ExitStepProps) {
  const [now, setNow] = useState(() => Date.now())
  const [exitError, setExitError] = useState<string | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [])

  const confirmMutation = useMutation({
    mutationFn: (value: string) => exitStore(value),
    onSuccess: () => onExited(),
    onError: (mutationError) => {
      setExitError(
        mutationError instanceof Error
          ? mutationError.message
          : "Erro ao confirmar a saída.",
      )
    },
  })

  const expired = token ? new Date(token.expiresAt).getTime() <= now : false
  const countdown =
    token && !expired ? formatCountdown(token.expiresAt, now) : "00:00"

  const qrValue = useMemo(
    () =>
      token
        ? `${window.location.origin}/acesso?token=${encodeURIComponent(token.token)}`
        : "",
    [token],
  )

  if (busy && !token) {
    return (
      <ExitShell
        icon={<Loader2 className="size-7 animate-spin" />}
        iconClass="bg-muted text-muted-foreground"
        title="Gerando QR de saída…"
        description="Aguarde um instante."
      />
    )
  }

  if (error && !token) {
    return (
      <ExitShell
        icon={<CircleAlert className="size-7" />}
        iconClass="bg-destructive/10 text-destructive"
        title="Não foi possível gerar o QR"
        description={error}
        action={
          <Button size="lg" onClick={onRegenerate} disabled={busy}>
            <RefreshCw className="size-4" />
            Tentar novamente
          </Button>
        }
      />
    )
  }

  if (!token || expired) {
    return (
      <ExitShell
        icon={<CircleAlert className="size-7" />}
        iconClass="bg-amber-500/15 text-amber-600"
        title="QR expirado"
        description="O código de saída vale por 25 segundos. Gere um novo para continuar."
        action={
          <Button size="lg" onClick={onRegenerate} disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Gerar novo QR
          </Button>
        }
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-md py-4">
      <Card className="border-primary/40">
        <CardHeader className="items-center text-center">
          <span className="bg-primary/10 text-primary mb-2 flex size-14 items-center justify-center rounded-full">
            <QrCode className="size-7" />
          </span>
          <CardTitle className="text-3xl">Pagamento confirmado!</CardTitle>
          <CardDescription className="text-lg">
            Aponte a câmera do seu celular para o QR abaixo: a tela de acesso
            abre com a saída pronta para confirmar.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-4">
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-xl bg-white p-4">
              <QRCodeSVG value={qrValue} size={240} level="M" />
            </div>
            <span className="text-muted-foreground flex items-center gap-2 text-sm tabular-nums">
              expira em{" "}
              <strong className="text-foreground font-semibold">
                {countdown}
              </strong>
            </span>
            <div className="grid gap-0.5 text-center">
              <span className="text-muted-foreground text-[11px] tracking-wide uppercase">
                ou digite este código na tela de acesso
              </span>
              <span className="font-mono text-sm font-semibold tracking-wider select-all">
                {token.token.replace(/(.{4})/g, "$1 ").trim()}
              </span>
            </div>
          </div>

          {exitError ? (
            <Alert variant="destructive">
              <CircleAlert />
              <AlertTitle>Falha na saída</AlertTitle>
              <AlertDescription>{exitError}</AlertDescription>
            </Alert>
          ) : null}

          <Button
            size="lg"
            className="h-16 w-full text-xl"
            disabled={confirmMutation.isPending}
            onClick={() => {
              setExitError(null)
              confirmMutation.mutate(token.token)
            }}
          >
            {confirmMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <DoorOpen className="size-4" />
            )}
            Confirmar saída aqui
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="h-14 text-lg"
            onClick={() => {
              setExitError(null)
              onRegenerate()
            }}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Gerar novo QR
          </Button>

          <button
            type="button"
            className="text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5 text-xs transition-colors"
            onClick={() => {
              void navigator.clipboard
                .writeText(token.token)
                .then(() => toast.success("Código copiado."))
                .catch(() => toast.error("Não foi possível copiar."))
            }}
          >
            <Copy className="size-3.5" />
            Problema com a câmera? Copie o código e digite na tela de acesso
          </button>
        </CardContent>
      </Card>
    </div>
  )
}

function ExitShell({
  icon,
  iconClass,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  iconClass: string
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-md py-4">
      <Card>
        <CardHeader className="items-center text-center">
          <span
            className={`mb-2 flex size-14 items-center justify-center rounded-full ${iconClass}`}
          >
            {icon}
          </span>
          <CardTitle className="text-3xl">{title}</CardTitle>
          <CardDescription className="text-lg">{description}</CardDescription>
        </CardHeader>
        {action ? (
          <CardContent className="grid gap-2">{action}</CardContent>
        ) : null}
      </Card>
    </div>
  )
}
