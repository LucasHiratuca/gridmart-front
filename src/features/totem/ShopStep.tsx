import { useRef, useState, type FormEvent } from "react"
import {
  Loader2,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CircleAlert } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { createSale, getProductByBarcode, listProducts, ApiError } from "@/lib/api"
import { formatBRL } from "@/lib/format"
import type { Product, SaleDetail } from "@/lib/types"
import { cartCount, cartTotal, type CartItem } from "./cart"

type ShopStepProps = {
  cpf: string
  cart: CartItem[]
  onAdd: (product: Product) => void
  onChangeQuantity: (productId: number, quantity: number) => void
  onSaleCreated: (sale: SaleDetail) => void
}

export function ShopStep({
  cpf,
  cart,
  onAdd,
  onChangeQuantity,
  onSaleCreated,
}: ShopStepProps) {
  const [scanValue, setScanValue] = useState("")
  const [search, setSearch] = useState("")
  const scanInputRef = useRef<HTMLInputElement>(null)

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  })

  const lookupMutation = useMutation({
    mutationFn: getProductByBarcode,
    onSuccess: (product) => {
      onAdd(product)
      toast.success(`${product.name} adicionado ao carrinho.`)
      scanInputRef.current?.focus()
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError && error.status === 404
          ? "Produto não encontrado no catálogo."
          : error instanceof Error
            ? error.message
            : "Erro ao buscar o produto.",
      )
      scanInputRef.current?.focus()
    },
  })

  const checkoutMutation = useMutation({
    mutationFn: () =>
      createSale(
        cpf,
        cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      ),
    onSuccess: onSaleCreated,
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao finalizar a compra.",
      )
    },
  })

  const products = productsQuery.data ?? []
  const query = search.trim().toLowerCase()
  const filtered = query
    ? products.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.barcode.includes(query),
      )
    : products

  const handleScanSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = scanValue.trim()
    setScanValue("")
    if (!value) return

    const local = products.find((product) => product.barcode === value)
    if (local) {
      onAdd(local)
      scanInputRef.current?.focus()
      return
    }

    if (/^\d{6,}$/.test(value)) {
      lookupMutation.mutate(value)
      return
    }

    setSearch(value)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
      {/* Coluna de escaneamento/busca */}
      <div className="grid content-start gap-4">
        <form onSubmit={handleScanSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3.5 size-5 -translate-y-1/2" />
            <Input
              ref={scanInputRef}
              value={scanValue}
              onChange={(event) => setScanValue(event.target.value)}
              placeholder="Escaneie o código de barras e pressione Enter…"
              className="h-14 pl-11 text-xl"
              autoComplete="off"
              aria-label="Código de barras"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-14 px-6 text-lg"
            disabled={!scanValue.trim() || lookupMutation.isPending}
          >
            {lookupMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Adicionar
          </Button>
        </form>

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="…ou busque pelo nome do produto"
            className="pl-8"
            aria-label="Buscar produtos"
          />
        </div>

        {productsQuery.isLoading ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
        ) : productsQuery.error ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>Falha ao carregar o catálogo</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              <span>
                {productsQuery.error instanceof Error
                  ? productsQuery.error.message
                  : "Erro inesperado."}
              </span>
              <Button
                variant="outline"
                size="xs"
                onClick={() => productsQuery.refetch()}
              >
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
            Nenhum produto encontrado para “{search}”.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => onAdd(product)}
                className="border-border hover:border-foreground/30 hover:bg-muted focus-visible:border-ring focus-visible:ring-ring/50 rounded-xl border p-3 text-left transition-all focus-visible:ring-3 focus-visible:outline-none"
              >
                <div className="text-sm font-medium">{product.name}</div>
                <div className="text-muted-foreground font-mono text-xs">
                  {product.barcode}
                </div>
                <div className="mt-2 text-base font-semibold tabular-nums">
                  {formatBRL(product.priceInCents)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Carrinho */}
      <Card className="h-fit lg:sticky lg:top-32">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="size-4" />
              Carrinho
            </CardTitle>
            <Badge variant="secondary">{cartCount(cart)}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {cart.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center">
              <span className="text-4xl">🛒</span>
              <p className="text-sm">Escaneie um produto para começar.</p>
            </div>
          ) : (
            <div className="grid max-h-80 gap-3 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.product.id} className="grid gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {item.product.name}
                      </div>
                      <div className="text-muted-foreground text-xs tabular-nums">
                        {formatBRL(item.product.priceInCents)} un.
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Remover ${item.product.name}`}
                      onClick={() => onChangeQuantity(item.product.id, 0)}
                    >
                      <Trash2 className="text-destructive size-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon-xs"
                        aria-label="Diminuir quantidade"
                        onClick={() =>
                          onChangeQuantity(
                            item.product.id,
                            item.quantity - 1,
                          )
                        }
                      >
                        <Minus className="size-3.5" />
                      </Button>
                      <span className="w-7 text-center text-sm tabular-nums">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon-xs"
                        aria-label="Aumentar quantidade"
                        onClick={() =>
                          onChangeQuantity(
                            item.product.id,
                            item.quantity + 1,
                          )
                        }
                      >
                        <Plus className="size-3.5" />
                      </Button>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatBRL(item.product.priceInCents * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-border flex items-center justify-between border-t pt-4">
            <span className="text-muted-foreground text-sm">Total</span>
            <span className="text-4xl font-bold tabular-nums">
              {formatBRL(cartTotal(cart))}
            </span>
          </div>

          <Button
            size="lg"
            className="h-16 w-full text-xl"
            disabled={cart.length === 0 || checkoutMutation.isPending}
            onClick={() => checkoutMutation.mutate()}
          >
            {checkoutMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Finalizar compra
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            A cobrança é gerada por Pix no totem e confirmada automaticamente.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
