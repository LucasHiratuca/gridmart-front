import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, KeyRound, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, moneyInCents } from "@/lib/format";
import type { SaleStatus } from "@/lib/types";

const TOKEN_KEY = "gridmart:admin-token";

/**
 * Painel do lojista. Toda escrita da API passa por /admin com
 * x-admin-token — o token fica guardado aqui e nunca sai da máquina.
 */
export function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  if (!token) return <TokenGate onSaved={setToken} />;
  return <SalesPanel token={token} onLogout={() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }} />;
}

function TokenGate({ onSaved }: { onSaved: (t: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function enter() {
    setBusy(true);
    setError("");
    try {
      await api.admin.withToken(value).sales();
      localStorage.setItem(TOKEN_KEY, value);
      onSaved(value);
    } catch (e) {
      setError(e instanceof ApiError ? "Token inválido" : "Não consegui falar com a API");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound /> Painel do lojista
          </CardTitle>
          <CardDescription>Digite o token de administrador.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="password"
            aria-label="Token de administrador"
            placeholder="ADMIN_TOKEN"
            value={value}
            autoFocus
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enter()}
          />
          {error && (
            <p className="font-medium text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button className="w-full" disabled={busy || !value} onClick={enter}>
            {busy && <Loader2 className="animate-spin" />} Entrar
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

function SalesPanel({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [filter, setFilter] = useState<SaleStatus | "ALL">("ALL");
  const queryClient = useQueryClient();
  const client = api.admin.withToken(token);

  const { data = [], isPending, isError, error } = useQuery({
    queryKey: ["admin-sales", filter],
    queryFn: () => client.sales(filter === "ALL" ? undefined : filter),
  });

  const [payingId, setPayingId] = useState<number | null>(null);

  async function confirm(id: number) {
    setPayingId(id);
    try {
      await client.pay(id);
      await queryClient.invalidateQueries({ queryKey: ["admin-sales"] });
    } catch {
      alert("Não consegui confirmar o pagamento");
    } finally {
      setPayingId(null);
    }
  }

  if (isError) {
    const invalid = error instanceof ApiError && (error.status === 401 || error.status === 403);
    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <Card className="max-w-sm text-center">
          <CardContent className="space-y-4 pt-6">
            <p className="text-destructive">{invalid ? "Token inválido" : error.message}</p>
            <Button variant="outline" onClick={onLogout}>
              Trocar token
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const pending = data.filter((s) => s.status === "PENDING").length;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Vendas</h1>
          <p className="text-muted-foreground">
            {pending > 0 ? `${pending} aguardando pagamento` : "Nenhuma pendência"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(["ALL", "PENDING", "PAID"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
            >
              {f === "ALL" ? "Todas" : f === "PENDING" ? "Pendentes" : "Pagas"}
            </Button>
          ))}
          <Separator orientation="vertical" className="h-8" />
          <Button variant="ghost" onClick={onLogout}>
            Sair
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="pt-6">
          {isPending ? (
            <p className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="animate-spin" /> Carregando vendas...
            </p>
          ) : data.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">Nenhuma venda ainda.</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-sm text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Cliente</th>
                  <th className="py-2 pr-4 font-medium">CPF</th>
                  <th className="py-2 pr-4 font-medium">Quando</th>
                  <th className="py-2 pr-4 text-right font-medium">Total</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {data.map((sale) => (
                  <tr key={sale.id} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">{sale.userName}</td>
                    <td className="py-3 pr-4 tabular-nums text-muted-foreground">
                      {sale.userCpf}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDateTime(sale.createdAt)}
                    </td>
                    <td className="py-3 pr-4 text-right font-semibold tabular-nums">
                      {moneyInCents(sale.totalInCents)}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={sale.status === "PAID" ? "default" : "secondary"}>
                        {sale.status === "PAID" ? "Pago" : "Pendente"}
                      </Badge>
                    </td>
                    <td className="py-3">
                      {sale.status === "PENDING" && (
                        <Button
                          size="sm"
                          disabled={payingId === sale.id}
                          onClick={() => confirm(sale.id)}
                        >
                          {payingId === sale.id ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <BadgeCheck />
                          )}
                          Confirmar pagamento
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
