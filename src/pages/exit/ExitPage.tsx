import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { DoorOpen, Loader2, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";

/**
 * Aberto pelo QR de saída gerado no totem: /exit?token=...
 * Consome o token (uso único, 25s) e fecha a visita → a porta abre.
 */
export function ExitPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [done, setDone] = useState(false);

  const exit = useMutation({
    mutationFn: () => api.access.exit(token),
    onSuccess: () => setDone(true),
  });
  const { mutate } = exit;

  // Consome o token assim que a página abre (é só ler o QR).
  // A ref evita disparar 2× no StrictMode do dev — o token é de uso único,
  // então a segunda chamada seria um 403 falso.
  const fired = useRef<string | null>(null);
  useEffect(() => {
    if (token && fired.current !== token) {
      fired.current = token;
      mutate();
    }
  }, [token, mutate]);

  // Sem token na URL = alguém abriu /exit direto
  if (!token) {
    return (
      <Shell>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert /> Código ausente
            </CardTitle>
            <CardDescription>
              Gere um novo QR de saída no caixa e leia ele pela câmera.
            </CardDescription>
          </CardHeader>
        </Card>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <Card className="border-primary/40">
          <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8 text-center">
            <div className="flex size-24 items-center justify-center rounded-full bg-primary/10">
              <DoorOpen className="size-12 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-semibold">Porta aberta</p>
              <p className="mt-1 text-muted-foreground">Até a próxima!</p>
            </div>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const error = exit.error;

  return (
    <Shell>
      <Card>
        <CardHeader>
          <CardTitle>Sair da loja</CardTitle>
          <CardDescription>Estou liberando a porta...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <>
              <p className="font-medium text-destructive" role="alert">
                {describe(error)}
              </p>
              <p className="text-sm text-muted-foreground">
                Volte ao caixa e gere um novo QR de saída.
              </p>
            </>
          ) : (
            <p className="flex items-center gap-3 text-lg text-muted-foreground">
              <Loader2 className="size-6 animate-spin" /> Aguardando liberação
            </p>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
}

function describe(error: unknown): string {
  if (!(error instanceof ApiError)) return "Não consegui falar com a loja.";
  if (error.status === 410) return "Este QR expirou (ele vale só 25 segundos).";
  if (error.status === 403) return "Este QR já foi usado ou é inválido.";
  return error.message;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
