import { useMemo, useState, type FormEvent } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  adminCreateBrand,
  adminCreateProduct,
  adminDeleteProduct,
  adminListProducts,
  adminUpdateProduct,
  getCatalog,
} from "@/lib/api"
import { formatBRL, parseBRLToCents } from "@/lib/format"
import {
  buildProductName,
  normalizeProductName,
  normalizeText,
  type ProductUnit,
} from "@/lib/product-name"
import type { Catalog, Product } from "@/lib/types"
import { PageHeader } from "./page-header"
import {
  TableEmptyRow,
  TableErrorRow,
  TableLoadingRows,
} from "./table-states"

const COLS = 6

function toPriceInput(priceInCents: number): string {
  return (priceInCents / 100).toFixed(2).replace(".", ",")
}

/** Departamentos (parentId null) e seus tipos (folhas). */
function groupCategories(catalog: Catalog | undefined) {
  if (!catalog) return []
  return catalog.categories
    .filter((category) => category.parentId === null)
    .map((department) => ({
      department,
      children: catalog.categories.filter(
        (category) => category.parentId === department.id,
      ),
    }))
    .filter((group) => group.children.length > 0)
}

/** Sugestões de sabor/linha: o que já existe + um vocabulário curto. */
const VARIANT_SUGGESTIONS = [
  "Original",
  "Tradicional",
  "Zero",
  "Diet",
  "Light",
  "Integral",
  "Desnatado",
  "Semidesnatado",
  "Ao Leite",
  "Meio Amargo",
  "Branco",
  "Morango",
  "Chocolate",
  "Baunilha",
]

export function AdminProductsPage() {
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [brandFilter, setBrandFilter] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)

  const catalogQuery = useQuery({ queryKey: ["catalog"], queryFn: getCatalog })
  const productsQuery = useQuery({
    queryKey: ["admin-products"],
    queryFn: adminListProducts,
  })

  const groups = useMemo(
    () => groupCategories(catalogQuery.data),
    [catalogQuery.data],
  )

  const filtered = useMemo(() => {
    const products = productsQuery.data ?? []
    const query = normalizeText(search)

    return products.filter((product) => {
      if (categoryFilter && String(product.categoryId) !== categoryFilter) {
        return false
      }
      if (brandFilter && String(product.brandId) !== brandFilter) {
        return false
      }
      if (!query) return true

      const haystack = normalizeText(
        [
          product.name,
          product.barcode,
          product.categoryName ?? "",
          product.brandName ?? "",
        ].join(" "),
      )
      return haystack.includes(query)
    })
  }, [productsQuery.data, search, categoryFilter, brandFilter])

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Produtos"
        description="Cadastro guiado: código, grupo, marca e tamanho. O nome é montado no padrão da loja."
      >
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Novo produto
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, marca ou código…"
            className="pl-8"
            aria-label="Buscar produtos"
          />
        </div>

        <Select
          value={categoryFilter || "all"}
          onValueChange={(value) =>
            setCategoryFilter(value === "all" ? "" : value)
          }
        >
          <SelectTrigger aria-label="Filtrar por grupo" className="w-52">
            <SelectValue placeholder="Todos os grupos" />
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            <SelectItem value="all">Todos os grupos</SelectItem>
            {groups.map((group) => (
              <SelectGroup key={group.department.id}>
                <SelectLabel>{group.department.name}</SelectLabel>
                {group.children.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={brandFilter || "all"}
          onValueChange={(value) => setBrandFilter(value === "all" ? "" : value)}
        >
          <SelectTrigger aria-label="Filtrar por marca" className="w-48">
            <SelectValue placeholder="Todas as marcas" />
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            <SelectItem value="all">Todas as marcas</SelectItem>
            {(catalogQuery.data?.brands ?? []).map((brand) => (
              <SelectItem key={brand.id} value={String(brand.id)}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código de barras</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productsQuery.isLoading ? (
                <TableLoadingRows cols={COLS} />
              ) : productsQuery.error ? (
                <TableErrorRow
                  cols={COLS}
                  error={productsQuery.error}
                  onRetry={() => productsQuery.refetch()}
                />
              ) : filtered.length === 0 ? (
                <TableEmptyRow
                  cols={COLS}
                  message={
                    search || categoryFilter || brandFilter
                      ? "Nenhum produto corresponde aos filtros."
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
                      <span className="flex items-center gap-2">
                        {product.name}
                        {product.isActive ? null : (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {product.categoryName ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {product.brandName ?? "—"}
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

// ── Formulário em 4 passos ────────────────────────────────────────────────

type StepKey = "barcode" | "group" | "brand" | "details" | "manual-name" | "price"

const STRUCTURED_STEPS: { key: StepKey; label: string }[] = [
  { key: "barcode", label: "Código" },
  { key: "group", label: "Grupo" },
  { key: "brand", label: "Marca" },
  { key: "details", label: "Tamanho e preço" },
]

const MANUAL_STEPS: { key: StepKey; label: string }[] = [
  { key: "barcode", label: "Código" },
  { key: "manual-name", label: "Nome" },
  { key: "price", label: "Preço" },
]

type Draft = {
  barcode: string
  manual: boolean
  name: string
  categoryId: string
  brandId: string
  newBrand: string
  variant: string
  packagingId: string
  netContent: string
  unit: ProductUnit
  packQty: string
  price: string
  isActive: boolean
}

function draftFromProduct(product?: Product): Draft {
  return {
    barcode: product?.barcode ?? "",
    // Produto antigo (sem grupo) abre no modo "nome digitado".
    manual: product ? product.categoryId === null : false,
    name: product?.name ?? "",
    categoryId: product?.categoryId ? String(product.categoryId) : "",
    brandId: product?.brandId ? String(product.brandId) : "",
    newBrand: "",
    variant: product?.variant ?? "",
    packagingId: product?.packagingId ? String(product.packagingId) : "",
    netContent: product?.netContent ?? "",
    unit: product?.unit ?? "un",
    packQty: product?.packQty ? String(product.packQty) : "1",
    price: product ? toPriceInput(product.priceInCents) : "",
    isActive: product?.isActive ?? true,
  }
}

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

  const catalogQuery = useQuery({ queryKey: ["catalog"], queryFn: getCatalog })
  const productsQuery = useQuery({
    queryKey: ["admin-products"],
    queryFn: adminListProducts,
  })
  const catalog = catalogQuery.data

  const [draft, setDraft] = useState<Draft>(() => draftFromProduct(product))
  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const steps = draft.manual ? MANUAL_STEPS : STRUCTURED_STEPS
  const step = steps[Math.min(stepIndex, steps.length - 1)]
  const isLastStep = stepIndex === steps.length - 1

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  const groups = useMemo(() => groupCategories(catalog), [catalog])

  const categoryName =
    catalog?.categories.find((category) => String(category.id) === draft.categoryId)
      ?.name ?? null
  const brandName =
    catalog?.brands.find((brand) => String(brand.id) === draft.brandId)?.name ??
    null
  const packagingName =
    catalog?.packagings.find(
      (packaging) => String(packaging.id) === draft.packagingId,
    )?.name ?? null

  const packQty = Number(draft.packQty) > 1 ? Number(draft.packQty) : null

  const preview = draft.manual
    ? normalizeProductName(draft.name)
    : buildProductName({
        categoryName,
        brandName,
        variant: draft.variant,
        packagingName,
        netContent: draft.netContent,
        unit: draft.unit,
        packQty,
      })

  const suggestedVariants = useMemo(() => {
    const fromProducts = (productsQuery.data ?? [])
      .map((item) => item.variant)
      .filter((value): value is string => Boolean(value))
    return [...new Set([...VARIANT_SUGGESTIONS, ...fromProducts])].sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    )
  }, [productsQuery.data])

  const createBrandMutation = useMutation({
    mutationFn: () => adminCreateBrand(draft.newBrand.trim()),
    onSuccess: (brand) => {
      toast.success(`Marca "${brand.name}" pronta para uso`)
      setDraft((prev) => ({ ...prev, brandId: String(brand.id), newBrand: "" }))
      queryClient.invalidateQueries({ queryKey: ["catalog"] })
    },
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "Erro ao criar a marca.",
      )
    },
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      const priceInCents = parseBRLToCents(draft.price.trim()) ?? 0

      const payload = draft.manual
        ? {
            barcode: draft.barcode.trim(),
            name: normalizeProductName(draft.name),
            priceInCents,
            categoryId: null,
            brandId: null,
            packagingId: null,
            variant: null,
            netContent: null,
            unit: null,
            packQty: null,
            isActive: draft.isActive,
          }
        : {
            barcode: draft.barcode.trim(),
            name: preview,
            priceInCents,
            categoryId: Number(draft.categoryId),
            brandId: Number(draft.brandId),
            packagingId: draft.packagingId
              ? Number(draft.packagingId)
              : null,
            variant: draft.variant.trim() || null,
            netContent: draft.netContent.trim() || null,
            unit: draft.netContent.trim() ? draft.unit : null,
            packQty,
            isActive: draft.isActive,
          }

      return isEditing
        ? adminUpdateProduct(product.id, payload)
        : adminCreateProduct(payload)
    },
    onSuccess: () => {
      toast.success(isEditing ? "Produto atualizado" : "Produto criado")
      queryClient.invalidateQueries({ queryKey: ["admin-products"] })
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

  /** Valida o passo atual; devolve a mensagem de erro (ou null). */
  function validateStep(): string | null {
    if (step.key === "barcode" && draft.barcode.trim().length < 3) {
      return "Informe o código de barras (mínimo 3 caracteres)."
    }
    if (step.key === "manual-name") {
      if (draft.name.trim().length < 2) return "Informe o nome do produto."
      if (!preview) return "Informe um nome válido."
    }
    if (step.key === "group" && !draft.categoryId) {
      return "Escolha o grupo do produto."
    }
    if (step.key === "brand" && !draft.brandId) {
      return "Escolha a marca (ou crie uma nova)."
    }
    if (step.key === "details" || step.key === "price") {
      const cents = parseBRLToCents(draft.price.trim())
      if (!draft.price.trim()) return "Informe o preço."
      if (cents === null) return "Preço inválido."
      if (cents <= 0) return "O preço deve ser maior que zero."
    }
    if (step.key === "details" && !preview) {
      return "Preencha os dados do produto para gerar o nome."
    }
    return null
  }

  function goNext() {
    const message = validateStep()
    if (message) {
      setError(message)
      return
    }
    if (isLastStep) {
      saveMutation.mutate()
      return
    }
    setStepIndex((index) => index + 1)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    goNext()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar produto" : "Novo produto"}</DialogTitle>
          <DialogDescription>
            {draft.manual
              ? "Produto sem grupo: o nome é digitado e padronizado pela loja."
              : "Preencha os quatro passos. O nome final é montado automaticamente."}
          </DialogDescription>
        </DialogHeader>

        <ol className="flex flex-wrap items-center gap-1.5" aria-label="Passos">
          {steps.map((item, index) => {
            const done = index < stepIndex
            const current = index === stepIndex
            return (
              <li key={item.key} className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={index > stepIndex}
                  onClick={() => index < stepIndex && setStepIndex(index)}
                  className="flex items-center gap-1.5 rounded-full text-xs disabled:cursor-default"
                  aria-current={current ? "step" : undefined}
                >
                  <span
                    className={[
                      "flex size-5 items-center justify-center rounded-full border text-[11px] font-semibold",
                      current
                        ? "border-primary bg-primary text-primary-foreground"
                        : done
                          ? "border-primary text-primary"
                          : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {done ? <Check className="size-3" /> : index + 1}
                  </span>
                  <span
                    className={
                      current
                        ? "font-medium"
                        : "text-muted-foreground hidden sm:inline"
                    }
                  >
                    {item.label}
                  </span>
                </button>
                {index < steps.length - 1 ? (
                  <span className="bg-border h-px w-4" />
                ) : null}
              </li>
            )
          })}
        </ol>

        <form onSubmit={handleSubmit} className="grid gap-4">
          {step.key === "barcode" ? (
            <div className="grid gap-2">
              <Label htmlFor="product-barcode">Código de barras</Label>
              <Input
                id="product-barcode"
                inputMode="numeric"
                placeholder="7891000100103"
                autoComplete="off"
                autoFocus
                disabled={saveMutation.isPending}
                value={draft.barcode}
                onChange={(event) => set("barcode", event.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Passe o leitor ou digite o número impresso na embalagem.
              </p>
            </div>
          ) : null}

          {step.key === "group" ? (
            <div className="grid gap-2">
              <Label>Grupo (tipo de produto)</Label>
              <Select
                value={draft.categoryId || undefined}
                onValueChange={(value) => set("categoryId", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Escolha o grupo…" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {groups.map((group) => (
                    <SelectGroup key={group.department.id}>
                      <SelectLabel>{group.department.name}</SelectLabel>
                      {group.children.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                O grupo vira a primeira palavra do nome: “Refrigerante …”.
              </p>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground justify-self-start text-xs underline underline-offset-4"
                onClick={() => {
                  set("manual", true)
                  setStepIndex(0)
                  setError(null)
                }}
              >
                Produto sem grupo? Digitar o nome manualmente
              </button>
            </div>
          ) : null}

          {step.key === "manual-name" ? (
            <div className="grid gap-2">
              <Label htmlFor="product-name">Nome do produto</Label>
              <Input
                id="product-name"
                placeholder="CAFÉ PILÃO 500G"
                autoFocus
                disabled={saveMutation.isPending}
                value={draft.name}
                onChange={(event) => set("name", event.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Nome final:{" "}
                <span className="text-foreground font-medium">
                  {preview || "—"}
                </span>
              </p>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground justify-self-start text-xs underline underline-offset-4"
                onClick={() => {
                  set("manual", false)
                  setStepIndex(0)
                  setError(null)
                }}
              >
                Voltar para o cadastro com grupo e marca
              </button>
            </div>
          ) : null}

          {step.key === "brand" ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Marca</Label>
                <Select
                  value={draft.brandId || undefined}
                  onValueChange={(value) => set("brandId", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Escolha a marca…" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {(catalog?.brands ?? []).map((brand) => (
                      <SelectItem key={brand.id} value={String(brand.id)}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted/40 grid gap-2 rounded-lg border p-3">
                <Label htmlFor="new-brand" className="text-xs">
                  Não achou? Crie a marca
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="new-brand"
                    placeholder="Nova marca"
                    autoComplete="off"
                    value={draft.newBrand}
                    disabled={createBrandMutation.isPending}
                    onChange={(event) => set("newBrand", event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      createBrandMutation.isPending ||
                      draft.newBrand.trim().length < 2
                    }
                    onClick={() => createBrandMutation.mutate()}
                  >
                    {createBrandMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    Criar
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  A marca é normalizada (ex.: “coca cola” → “Coca Cola”) e
                  reutilizada nos próximos cadastros.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="product-variant">Sabor / variante</Label>
                <Input
                  id="product-variant"
                  list="variant-suggestions"
                  placeholder="Original, Zero, Integral…"
                  autoComplete="off"
                  value={draft.variant}
                  onChange={(event) => set("variant", event.target.value)}
                />
                <datalist id="variant-suggestions">
                  {suggestedVariants.map((suggestion) => (
                    <option key={suggestion} value={suggestion} />
                  ))}
                </datalist>
                <p className="text-muted-foreground text-xs">
                  Opcional. Texto livre com sugestões — use quando a marca tem
                  versões.
                </p>
              </div>
            </div>
          ) : null}

          {step.key === "details" ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Embalagem</Label>
                <Select
                  value={draft.packagingId || "none"}
                  onValueChange={(value) =>
                    set("packagingId", value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Escolha a embalagem…" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="none">Sem embalagem</SelectItem>
                    {(catalog?.packagings ?? []).map((packaging) => (
                      <SelectItem
                        key={packaging.id}
                        value={String(packaging.id)}
                      >
                        {packaging.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="product-content">Conteúdo</Label>
                  <Input
                    id="product-content"
                    inputMode="decimal"
                    placeholder="350"
                    autoComplete="off"
                    value={draft.netContent}
                    onChange={(event) => set("netContent", event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Unidade</Label>
                  <Select
                    value={draft.unit}
                    onValueChange={(value) =>
                      set("unit", value as ProductUnit)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {(catalog?.units ?? []).map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="product-pack">Qtd. no pack</Label>
                  <Input
                    id="product-pack"
                    inputMode="numeric"
                    placeholder="1"
                    autoComplete="off"
                    value={draft.packQty}
                    onChange={(event) =>
                      set("packQty", event.target.value.replace(/\D/g, ""))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="product-price">Preço (R$)</Label>
                  <Input
                    id="product-price"
                    inputMode="decimal"
                    placeholder="18,90"
                    autoComplete="off"
                    value={draft.price}
                    onChange={(event) => set("price", event.target.value)}
                  />
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                Deixe o pack em 1 quando for unidade avulsa. A unidade “un” não
                aparece no nome.
              </p>
            </div>
          ) : null}

          {step.key === "price" ? (
            <div className="grid gap-2">
              <Label htmlFor="manual-price">Preço (R$)</Label>
              <Input
                id="manual-price"
                inputMode="decimal"
                placeholder="18,90"
                autoComplete="off"
                autoFocus
                disabled={saveMutation.isPending}
                value={draft.price}
                onChange={(event) => set("price", event.target.value)}
              />
            </div>
          ) : null}

          {preview ? (
            <div className="bg-muted/40 rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">Nome no totem</p>
              <p className="font-medium">{preview}</p>
            </div>
          ) : null}

          {isEditing ? (
            <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span className="text-sm">
                <span className="font-medium">Ativo no catálogo</span>
                <span className="text-muted-foreground block text-xs">
                  Desligado, o produto some do totem mas continua no histórico.
                </span>
              </span>
              <Switch
                checked={draft.isActive}
                onCheckedChange={(checked) => set("isActive", checked)}
              />
            </label>
          ) : null}

          {error ? <p className="text-destructive text-sm">{error}</p> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={stepIndex === 0 || saveMutation.isPending}
              onClick={() => {
                setError(null)
                setStepIndex((index) => Math.max(0, index - 1))
              }}
            >
              <ArrowLeft className="size-4" />
              Voltar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {isLastStep ? "Salvar" : "Próximo"}
              {isLastStep ? null : <ArrowRight className="size-4" />}
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
      queryClient.invalidateQueries({ queryKey: ["admin-products"] })
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
