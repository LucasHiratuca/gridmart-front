import { useRef, useState } from "react";
import { AlertCircle, Minus, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { api, ApiError } from "@/lib/api";
import { moneyInCents } from "@/lib/format";
import type { Product } from "@/lib/types";

interface Line {
  product: Product;
  quantity: number;
}

interface Props {
  customer: { cpf: string; name: string };
  onCheckout: (saleId: number) => void;
  onChangeCustomer: () => void;
}

export function CartScreen({ customer, onCheckout, onChangeCustomer }: Props) {
  const [lines, setLines] = useState<Line[]>([]);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [flash, setFlash] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  const { refocus } = useBarcodeScanner(addByBarcode, barcodeRef);

  function addByBarcode(barcode: string) {
    api.products
      .byBarcode(barcode)
      .then((product) => {
        setNotFound(null);
        setLines((prev) => {
          const i = prev.findIndex((l) => l.product.id === product.id);
          if (i >= 0) {
            const next = [...prev];
            next[i] = { ...next[i], quantity: next[i].quantity + 1 };
            return next;
          }
          return [...prev, { product, quantity: 1 }];
        });
        // destaca a linha nova por 800ms — feedback do "bip" do leitor
        setFlash(product.id);
        setTimeout(() => setFlash(null), 800);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) {
          setNotFound(barcode);
          setTimeout(() => setNotFound(null), 3000);
        } else {
          setNotFound(e instanceof Error ? e.message : "Erro ao buscar produto");
        }
      })
      .finally(() => barcodeRef.current?.focus());
  }

  function changeQty(id: number, delta: number) {
    setLines((prev) =>
      prev
        .map((l) => (l.product.id === id ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0),
    );
    refocus();
  }

  const total = lines.reduce((sum, l) => sum + l.product.priceInCents * l.quantity, 0);
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);

  async function checkout() {
    setCreating(true);
    try {
      const sale = await api.sales.create(
        customer.cpf,
        lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      );
      onCheckout(sale.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não consegui registrar a venda");
      setCreating(false);
    }
  }

  return (
    <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1fr_360px]">
      {/* ── Lista de produtos ─────────────────────────── */}
      <Card className="max-h-[70vh] overflow-hidden">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xl">Produtos da compra</CardTitle>
          <Badge variant={count ? "default" : "secondary"}>{count} itens</Badge>
        </CardHeader>

        <CardContent className="overflow-y-auto">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
              <span className="text-5xl">🛒</span>
              <p className="text-lg">Passe o primeiro produto no leitor.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {lines.map((line) => (
                <li
                  key={line.product.id}
                  className={`flex items-center gap-4 py-3 transition-colors ${
                    flash === line.product.id ? "bg-primary/10" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-medium">{line.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {moneyInCents(line.product.priceInCents)} · {line.product.barcode}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-11"
                      aria-label={`Tirar uma unidade de ${line.product.name}`}
                      onClick={() => changeQty(line.product.id, -1)}
                    >
                      <Minus />
                    </Button>
                    <span className="w-10 text-center text-xl font-semibold tabular-nums">
                      {line.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-11"
                      aria-label={`Somar uma unidade de ${line.product.name}`}
                      onClick={() => changeQty(line.product.id, 1)}
                    >
                      <Plus />
                    </Button>
                  </div>

                  <p className="w-28 text-right text-xl font-semibold tabular-nums">
                    {moneyInCents(line.product.priceInCents * line.quantity)}
                  </p>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 text-muted-foreground"
                    aria-label={`Remover ${line.product.name} da compra`}
                    onClick={() => changeQty(line.product.id, -line.quantity)}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* ── Leitor + total + ações ────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <Input
            ref={barcodeRef}
            aria-label="Código de barras"
            placeholder="Passe o código de barras"
            className="h-14 text-xl"
            autoComplete="off"
            disabled={creating}
          />
          {notFound && (
            <p
              className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 font-medium text-destructive"
              role="alert"
            >
              <AlertCircle className="size-5 shrink-0" />
              Produto não encontrado: {notFound}
            </p>
          )}
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Total da compra</p>
              <p className="text-5xl font-bold tabular-nums">{moneyInCents(total)}</p>
            </div>

            <Button
              className="h-16 w-full text-2xl"
              size="lg"
              disabled={lines.length === 0 || creating}
              onClick={checkout}
            >
              {creating ? "Registrando..." : "Finalizar compra"}
            </Button>

            <Button
              variant="outline"
              className="h-12 w-full text-lg"
              onClick={onChangeCustomer}
              disabled={creating}
            >
              <X /> Cancelar e trocar cliente
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Cliente: <span className="font-medium text-foreground">{customer.name}</span>
        </p>
      </div>
    </div>
  );
}
