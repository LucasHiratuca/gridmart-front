import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { BadgeCheck, Clock, Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { moneyInCents } from "@/lib/format";

/**
 * Depois de criar a venda, ela fica PENDING até o admin confirmar
 * (PUT /admin/sales/:id {status:"PAID"}) — aqui só acompanhamos.
 * Quando existir o webhook do Pix, este polling morre.
 */
export function PayingScreen({
  saleId,
  onConfirmed,
}: {
  saleId: number;
  onConfirmed: () => void;
}) {
  const { data } = useQuery({
    queryKey: ["sale", saleId],
    queryFn: () => api.sales.byId(saleId),
    refetchInterval: (query) => (query.state.data?.status === "PAID" ? false : 2000),
  });

  useEffect(() => {
    if (data?.status === "PAID") onConfirmed();
  }, [data?.status, onConfirmed]);

  return (
    <Card className="w-full max-w-lg text-center">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-3 text-3xl">
          <Clock className="size-9" /> Aguardando pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-6xl font-bold tabular-nums">
            {data ? moneyInCents(data.totalInCents) : "—"}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
          <p className="text-lg">Confirme o pagamento no caixa.</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function PaidScreen({ onGenerateQr }: { onGenerateQr: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);

  return (
    <Card className="w-full max-w-lg border-primary/40 text-center">
      <CardContent className="space-y-6 pt-8">
        <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-primary/10">
          <BadgeCheck className="size-14 text-primary" />
        </div>

        <div>
          <p className="text-4xl font-semibold">Pagamento confirmado</p>
          <p className="mt-2 text-xl text-muted-foreground">
            Você já pode gerar o QR de saída.
          </p>
        </div>

        <Button
          className="h-16 w-full text-2xl"
          size="lg"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onGenerateQr();
          }}
        >
          <QrCode /> Gerar QR de saída
        </Button>
      </CardContent>
    </Card>
  );
}

export function ExitQrScreen({
  token,
  expiresAt,
  onRegenerate,
  onDone,
}: {
  token: string;
  expiresAt: string;
  onRegenerate: () => Promise<void>;
  onDone: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(() => remaining(expiresAt));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSecondsLeft(remaining(expiresAt));
    const t = setInterval(() => setSecondsLeft(remaining(expiresAt)), 250);
    return () => clearInterval(t);
  }, [expiresAt]);

  const expired = secondsLeft <= 0;
  const url = `${location.origin}/exit?token=${token}`;

  return (
    <Card className="w-full max-w-lg text-center">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-3 text-3xl">
          <QrCode className="size-9" /> Saída da loja
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="mx-auto w-fit rounded-xl bg-white p-4">
          <QRCodeSVG value={url} size={240} level="M" />
        </div>

        <p className="text-xl text-muted-foreground">
          Aponte a câmera do celular para o QR na porta.
        </p>

        <p
          className={`text-5xl font-bold tabular-nums ${expired ? "text-destructive" : ""}`}
          role="timer"
        >
          {expired ? "expirado" : `${secondsLeft}s`}
        </p>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="h-14 flex-1 text-lg"
            disabled={busy || !expired}
            onClick={async () => {
              setBusy(true);
              await onRegenerate();
              setBusy(false);
            }}
          >
            {busy ? <Loader2 className="animate-spin" /> : "Gerar de novo"}
          </Button>
          <Button className="h-14 flex-1 text-lg" onClick={onDone}>
            Próximo cliente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function remaining(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
}
