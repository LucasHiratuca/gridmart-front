import { useMemo, useState } from "react"
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  adminCreateProduct,
  adminDeleteProduct,
  adminUpdateProduct,
  listProducts,
} from "@/lib/api"
import { formatBRL, parseBRLToCents } from "@/lib/format"
import type { Product } from "@/lib/types"
import { PageHeader } from "./page-header"
import {
  TableEmptyRow,
  TableErrorRow,
  TableLoadingRows,
} from "./table-states"

const COLS = 4

type ProductErrors = { barcode?: string; name?: string; price?: string }

function toPriceInput(priceInCents: number): string {
  return (priceInCents / 100).toFixed(2).replace(".", ",")
}

export function AdminProductsPage() {
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["products"],
    queryFn: listProducts,
  })

  const filtered = useMemo(() => {
    const products = data ?? []
    const query = search.trim().toLowerCase()
    if (!query) return products
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.barcode.includes(query),
    )
  }, [data, search])

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Produtos"
        description="Catálogo lido pelo leitor de código de barras do totem."
      >
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Novo produto
        </Button>
      </PageHeader>

      <div className="relative w-full max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome ou código…"
          className="pl-8"
          aria-label="Buscar produtos"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código de barras</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
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
              ) : filtered.length === 0 ? (
                <TableEmptyRow
                  cols={COLS}
                  message={
                    search
                      ? "Nenhum produto corresponde à busca."
                      : "Nenhum produto cadastrado."
                  }
                />
              ) : (
                filtered.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-xs">
                      {product.barcode}
                    </TableCell>
                    <TableCell className="font-medium">
                      {product.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBRL(product.priceInCents)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Editar ${product.name}`}
                          onClick={() => setEditing(product)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Excluir ${product.name}`}
                          onClick={() => setDeleting(product)}
                        >
                          <Trash2 className="size-4 text-destructive" />
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

      {createOpen ? (
        <ProductFormDialog open onOpenChange={setCreateOpen} />
      ) : null}
      {editing ? (
        <ProductFormDialog
          key={editing.id}
          product={editing}
          open
          onOpenChange={() => setEditing(null)}
        />
      ) : null}
      {deleting ? (
        <DeleteProductDialog
          product={deleting}
          open
          onOpenChange={() => setDeleting(null)}
        />
      ) : null}
    </div>
  )
}

// ── Dialog de criação/edição ──────────────────────────────────────────────

function ProductFormDialog({
  product,
  open,
  onOpenChange,
}: {
  product?: Product
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const isEditing = product !== undefined

  const [barcode, setBarcode] = useState(product?.barcode ?? "")
  const [name, setName] = useState(product?.name ?? "")
  const [price, setPrice] = useState(
    product ? toPriceInput(product.priceInCents) : "",
  )
  const [errors, setErrors] = useState<ProductErrors>({})

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        barcode: barcode.trim(),
        name: name.trim(),
        priceInCents: parseBRLToCents(price.trim()) ?? 0,
      }
      return isEditing
        ? adminUpdateProduct(product.id, payload)
        : adminCreateProduct(payload)
    },
    onSuccess: () => {
      toast.success(isEditing ? "Produto atualizado" : "Produto criado")
      queryClient.invalidateQueries({ queryKey: ["products"] })
      onOpenChange(false)
    },
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "Erro ao salvar o produto.",
      )
    },
  })

  function submit(event: React.FormEvent) {
    event.preventDefault()

    const next: ProductErrors = {}
    if (barcode.trim().length < 3) {
      next.barcode = "Informe o código de barras (mínimo 3 caracteres)"
    }
    if (name.trim().length < 2) next.name = "Informe o nome do produto"
    const cents = parseBRLToCents(price.trim())
    if (!price.trim()) next.price = "Informe o preço"
    else if (cents === null) next.price = "Preço inválido"
    else if (cents <= 0) next.price = "O preço deve ser maior que zero"

    setErrors(next)
    if (Object.keys(next).length > 0) return

    saveMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar produto" : "Novo produto"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Atualize os dados do produto no catálogo."
              : "O produto aparece no totem assim que for salvo."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="product-barcode">Código de barras</Label>
            <Input
              id="product-barcode"
              inputMode="numeric"
              placeholder="7891000100103"
              autoComplete="off"
              disabled={saveMutation.isPending}
              value={barcode}
              onChange={(event) => {
                setBarcode(event.target.value)
                setErrors((prev) => ({ ...prev, barcode: undefined }))
              }}
            />
            {errors.barcode ? (
              <p className="text-destructive text-sm">{errors.barcode}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-name">Nome</Label>
            <Input
              id="product-name"
              placeholder="Café 500g"
              disabled={saveMutation.isPending}
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setErrors((prev) => ({ ...prev, name: undefined }))
              }}
            />
            {errors.name ? (
              <p className="text-destructive text-sm">{errors.name}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="product-price">Preço (R$)</Label>
            <Input
              id="product-price"
              inputMode="decimal"
              placeholder="18,90"
              autoComplete="off"
              disabled={saveMutation.isPending}
              value={price}
              onChange={(event) => {
                setPrice(event.target.value)
                setErrors((prev) => ({ ...prev, price: undefined }))
              }}
            />
            {errors.price ? (
              <p className="text-destructive text-sm">{errors.price}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Dialog de exclusão ────────────────────────────────────────────────────

function DeleteProductDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: () => adminDeleteProduct(product.id),
    onSuccess: () => {
      toast.success(`"${product.name}" foi excluído.`)
      queryClient.invalidateQueries({ queryKey: ["products"] })
      onOpenChange(false)
    },
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "Erro ao excluir o produto.",
      )
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir produto</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir <strong>{product.name}</strong>{" "}
            (código {product.barcode})? Essa ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
