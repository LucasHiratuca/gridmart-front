import { useEffect, useState } from "react";
import { ScanBarcode, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { isValidCPF, maskCPF, onlyDigits } from "@/lib/cpf";
import { CartScreen } from "./CartScreen";
import { ExitQrScreen, PaidScreen, PayingScreen } from "./PaymentScreens";

/**
 * Totem (tablet travado no caixa + leitor de código de barras).
 *
 * A pessoa precisa ter passado pela porta antes — o CPF é quem amarra
 * a venda à visita aberta (POST /sales resolve a visita sozinho).
 */

type Customer = { cpf: string; name: string };

type Phase =
  | { name: "identify" }
  | { name: "cart" }
  | { name: "paying"; saleId: number }
  | { name: "paid"; saleId: number }
  | { name: "exit_qr"; saleId: number; token: string; expiresAt: string };

export function KioskPage() {
  const [phase, setPhase] = useState<Phase>({ name: "identify" });
  const [customer, setCustomer] = useState<Customer | null>(null);

  // A UI do totem é 20% maior que a do celular (mesmo Tailwind, outra escala)
  useEffect(() => {
    document.documentElement.dataset.surface = "kiosk";
    return () => {
      delete document.documentElement.dataset.surface;
    };
  }, []);

  function reset() {
    setCustomer(null);
    setPhase({ name: "identify" });
  }

  let content: React.ReactNode;

  switch (phase.name) {
    case "identify":
      content = (
        <IdentifyScreen
          onIdentified={(c) => {
            setCustomer(c);
            setPhase({ name: "cart" });
          }}
        />
      );
      break;

    case "cart":
      content = (
        <CartScreen
          customer={customer!}
          onCheckout={(saleId) => setPhase({ name: "paying", saleId })}
          onChangeCustomer={reset}
        />
      );
      break;

    case "paying":
      content = (
        <PayingScreen
          saleId={phase.saleId}
          onConfirmed={() => setPhase({ name: "paid", saleId: phase.saleId })}
        />
      );
      break;

    case "paid":
      content = (
        <PaidScreen
          onGenerateQr={async () => {
            const { token, expiresAt } = await api.exitToken(phase.saleId);
            setPhase({ name: "exit_qr", saleId: phase.saleId, token, expiresAt });
          }}
        />
      );
      break;

    case "exit_qr":
      content = (
        <ExitQrScreen
          token={phase.token}
          expiresAt={phase.expiresAt}
          onRegenerate={async () => {
            const { token, expiresAt } = await api.exitToken(phase.saleId);
            setPhase({ name: "exit_qr", saleId: phase.saleId, token, expiresAt });
          }}
          onDone={reset}
        />
      );
      break;
  }

  return (
    <main className="flex min-h-dvh flex-col bg-muted/40">
      <header className="flex items-center justify-between border-b bg-background px-6 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <ScanBarcode className="size-6" />
          GridMart · Caixa
        </div>

        {customer && (
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-muted-foreground">
              <UserRound className="size-5" />
              <span className="font-medium text-foreground">{customer.name}</span>
              <span className="tabular-nums">{maskCPF(customer.cpf)}</span>
            </span>
            <Button variant="outline" onClick={reset}>
              Trocar cliente
            </Button>
          </div>
        )}
      </header>

      <div className="flex flex-1 items-center justify-center p-6">{content}</div>
    </main>
  );
}

function IdentifyScreen({ onIdentified }: { onIdentified: (c: Customer) => void }) {
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function enter() {
    if (!isValidCPF(cpf)) {
      setError("CPF inválido");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const digits = onlyDigits(cpf);
      const check = await api.access.check(digits);

      if (!check.registered) {
        setError("CPF não encontrado. Passe pela porta para se cadastrar.");
        return;
      }
      if (!check.allowed) {
        setError("Acesso bloqueado. Fale com o lojista.");
        return;
      }

      // 409 = já tem visita aberta (ele entrou pela porta antes) — é o esperado
      try {
        await api.access.enter(digits);
      } catch (e) {
        if (!(e instanceof ApiError && e.status === 409)) throw e;
      }

      onIdentified({ cpf: digits, name: check.name ?? "Cliente" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não consegui falar com a loja");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Quem está comprando?</CardTitle>
        <CardDescription>Digite seu CPF para começar a passar os produtos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          aria-label="CPF"
          inputMode="numeric"
          autoComplete="off"
          className="h-14 text-2xl"
          placeholder="000.000.000-00"
          value={cpf}
          autoFocus
          disabled={busy}
          onChange={(e) => setCpf(maskCPF(e.target.value))}
          onKeyDown={(e) => e.key === "Enter" && enter()}
        />

        {error && (
          <p className="font-medium text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button className="h-14 w-full text-xl" size="lg" disabled={busy} onClick={enter}>
          Começar compra
        </Button>
      </CardContent>
    </Card>
  );
}
