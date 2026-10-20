import { useEffect, useRef, useState } from "react";
import { AlertCircle, DoorOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api, ApiError } from "@/lib/api";
import { isValidCPF, maskCPF, onlyDigits } from "@/lib/cpf";

/**
 * Fluxo da porta (celular, aberto pelo QR colado nela):
 *
 *   digitando → verificando → precisa_nome → aberto
 *                                ↘ bloqueado | erro
 */
type Phase = "typing" | "checking" | "need_name" | "opening" | "open" | "blocked" | "error";

export function DoorPage() {
  const [phase, setPhase] = useState<Phase>("typing");
  const [cpf, setCpf] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  // Quando o campo de nome aparece, o foco vai pra ele
  useEffect(() => {
    if (phase === "need_name") nameRef.current?.focus();
  }, [phase]);

  async function submitCpf() {
    if (!isValidCPF(cpf)) {
      setError("CPF inválido");
      return;
    }

    setPhase("checking");
    setError("");

    try {
      const check = await api.access.check(onlyDigits(cpf));

      if (!check.registered) return setPhase("need_name");
      if (!check.allowed) return setPhase("blocked");

      await enter();
    } catch (e) {
      showError(e);
    }
  }

  async function submitName() {
    if (name.trim().length < 2) {
      setError("Escreva seu nome completo");
      return;
    }

    setPhase("checking");
    setError("");

    try {
      await api.access.register(onlyDigits(cpf), name.trim());
      await enter();
    } catch (e) {
      showError(e);
    }
  }

  async function enter() {
    setPhase("opening");
    try {
      await api.access.enter(onlyDigits(cpf));
      setPhase("open");
    } catch (e) {
      showError(e);
    }
  }

  function showError(e: unknown) {
    if (e instanceof ApiError && e.status === 403) {
      setError(e.message);
      setPhase("blocked");
      return;
    }
    setError(e instanceof Error ? e.message : "Algo deu errado");
    setPhase("error");
  }

  if (phase === "open") return <Success />;

  if (phase === "blocked") {
    return (
      <Shell>
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle /> Acesso bloqueado
            </CardTitle>
            <CardDescription>
              Fale com o lojista para liberar seu acesso à loja.
            </CardDescription>
          </CardHeader>
        </Card>
      </Shell>
    );
  }

  const checking = phase === "checking" || phase === "opening";

  return (
    <Shell>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Bem-vindo à GridMart</CardTitle>
          <CardDescription>
            {phase === "need_name"
              ? "É a primeira vez? Só precisamos do seu nome."
              : "Informe seu CPF para entrar na loja."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {phase !== "need_name" && (
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                value={cpf}
                disabled={checking}
                onChange={(e) => setCpf(maskCPF(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && submitCpf()}
              />
            </div>
          )}

          {phase === "need_name" && (
            <>
              <p className="text-sm text-muted-foreground">
                CPF <span className="font-medium text-foreground">{cpf}</span>
              </p>
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  ref={nameRef}
                  autoComplete="name"
                  placeholder="Como devemos te chamar"
                  value={name}
                  disabled={checking}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitName()}
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          )}

          <Separator />

          {phase === "need_name" ? (
            <Button className="w-full" size="lg" disabled={checking} onClick={submitName}>
              {checking && <Loader2 className="animate-spin" />}
              Cadastrar e entrar
            </Button>
          ) : (
            <Button className="w-full" size="lg" disabled={checking} onClick={submitCpf}>
              {checking && <Loader2 className="animate-spin" />}
              Entrar na loja
            </Button>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
}

function Success() {
  return (
    <Shell>
      <Card className="border-primary/40">
        <CardContent className="flex flex-col items-center gap-4 pt-8 pb-8 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
            <DoorOpen className="size-10 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-semibold">Porta aberta</p>
            <p className="text-muted-foreground">Passe rápido, ela fecha sozinha em alguns segundos.</p>
          </div>
        </CardContent>
      </Card>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
