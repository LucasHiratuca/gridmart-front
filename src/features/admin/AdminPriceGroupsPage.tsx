import { useMemo, useState, type FormEvent } from "react"
import {
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Search,
  Tags,
  Trash2,
} from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  adminCreatePriceGroup,
  adminDeletePriceGroup,
  adminListPriceGroups,
  adminListProducts,
  adminSyncPriceGroupProducts,
  adminUpdatePriceGroup,
} from "@/lib/api"
import { formatBRL, formatDateTime, parseBRLToCents } from "@/lib/format"
import { normalizeText } from "@/lib/product-name"
import type { PriceGroup, Product } from "@/lib/types"
import { PageHeader } from "./page-header"
import {
  TableEmptyRow,
  TableErrorRow,
  TableLoadingRows,
} from "./table-states"

const COLS = 6

/** Centavos → texto do input ("399" → "3,99"). */
function toPriceInput(priceInCents: number): string {
  return (priceInCents / 100).toFixed(2).replace(".", ",")
}

/** Dados mínimos para editar um grupo no formulário do topo. */
type EditingGroup = Pick<
  PriceGroup,
  "id" | "name" | "priceInCents" | "productCount"
>

export function AdminPriceGroupsPage() {
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<PriceGroup | null>(null)
  const [managing, setManaging] = useState<PriceGroup | null>(null)

  // Estado do formulário (criar e editar usam o mesmo form).
  const [editing, setEditing] = useState<EditingGroup | null>(null)
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const groupsQuery = useQuery({
    queryKey: ["price-groups"],
    queryFn: adminListPriceGroups,
  })
  const productsQuery = useQuery({
    queryKey: ["admin-products"],
    queryFn: adminListProducts,
  })

  const groups = groupsQuery.data ?? []

  /** Produtos vinculados por grupo (para abrir a linha e conferir). */
  const productsByGroup = useMemo(() => {
    const map = new Map<number, Product[]>()
    for (const product of productsQuery.data ?? []) {
      if (!product.priceGroupId) continue
      const list = map.get(product.priceGroupId) ?? []
      list.push(product)
      map.set(product.priceGroupId, list)
    }
    return map
  }, [productsQuery.data])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["price-groups"] })
    queryClient.invalidateQueries({ queryKey: ["admin-products"] })
    queryClient.invalidateQueries({ queryKey: ["products"] })
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const priceInCents = parseBRLToCents(price.trim())
      if (name.trim().length < 2) throw new Error("Informe o nome do grupo.")
      if (priceInCents === null) throw new Error("Preço inválido.")
      if (priceInCents <= 0) throw new Error("O preço deve ser maior que zero.")

      const payload = { name: name.trim(), priceInCents }
      return editing
        ? adminUpdatePriceGroup(editing.id, payload)
        : adminCreatePriceGroup(payload)
    },
    onSuccess: () => {
      toast.success(editing ? "Grupo atualizado" : "Grupo criado")
      resetForm()
      invalidate()
    },
    onError: (error) => {
      setFormError(
        error instanceof Error ? error.message : "Erro ao salvar o grupo.",
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (group: PriceGroup) => adminDeletePriceGroup(group.id),
    onSuccess: (_data, group) => {
      toast.success(
        `Grupo "${group.name}" excluído. Os produtos voltaram ao preço próprio.`,
      )
      invalidate()
      setDeleting(null)
      if (editing?.id === group.id) resetForm()
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir o grupo.",
      )
    },
  })

  function resetForm() {
    setEditing(null)
    setName("")
    setPrice("")
    setFormError(null)
  }

  function startEdit(group: EditingGroup) {
    setEditing(group)
    setName(group.name)
    setPrice(toPriceInput(group.priceInCents))
    setFormError(null)
    document
      .getElementById("price-group-form")
      ?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    saveMutation.mutate()
  }

  const totalProducts = groups.reduce(
    (total, group) => total + (group.productCount ?? 0),
    0,
  )

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Grupos de preço"
        description="Produtos no mesmo grupo compartilham o preço. Mudar o valor do grupo altera todos de uma vez."
      >
        <Badge variant="secondary">
          {groups.length} grupo(s) · {totalProducts} produto(s)
        </Badge>
      </PageHeader>

      <Card id="price-group-form">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tags className="size-4" />
            {editing ? `Editar “${editing.name}”` : "Novo grupo de preço"}
          </CardTitle>
          <CardDescription>
            {editing
              ? `Ao salvar, o novo preço vale para os ${editing.productCount ?? 0} produto(s) deste grupo.`
              : "Dê um nome fácil de reconhecer (ex.: “Bebidas 350 ml”) e o preço que todos os produtos do grupo terão."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-end"
            onSubmit={submit}
          >
            <div className="grid gap-2">
              <Label htmlFor="price-group-name">Nome do grupo</Label>
              <Input
                id="price-group-name"
                placeholder="Bebidas 350 ml"
                autoComplete="off"
                value={name}
                disabled={saveMutation.isPending}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price-group-price">Preço (R$)</Label>
              <Input
                id="price-group-price"
                inputMode="decimal"
                placeholder="3,99"
                autoComplete="off"
                value={price}
                disabled={saveMutation.isPending}
                onChange={(event) => setPrice(event.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {editing ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={saveMutation.isPending}
                  onClick={resetForm}
                >
                  Cancelar
                </Button>
              ) : null}
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : editing ? (
                  <Check className="size-4" />
                ) : (
                  <Plus className="size-4" />
                )}
                {editing ? "Salvar grupo" : "Criar grupo"}
              </Button>
            </div>
            {formError ? (
              <p
                className="text-destructive text-sm font-medium sm:col-span-3"
                role="alert"
              >
                {formError}
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Grupo</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead>Atualizado em</TableHead>
                <TableHead className="w-40 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupsQuery.isLoading ? (
                <TableLoadingRows cols={COLS} />
              ) : groupsQuery.error ? (
                <TableErrorRow
                  cols={COLS}
                  error={groupsQuery.error}
                  onRetry={() => groupsQuery.refetch()}
                />
              ) : groups.length === 0 ? (
                <TableEmptyRow
                  cols={COLS}
                  message="Nenhum grupo de preço criado. Use o formulário acima para começar."
                />
              ) : (
                groups.map((group) => {
                  const expanded = expandedId === group.id
                  const products = productsByGroup.get(group.id) ?? []

                  return (
                    <GroupRow
                      key={group.id}
                      group={group}
                      products={products}
                      expanded={expanded}
                      onToggle={() =>
                        setExpandedId(expanded ? null : group.id)
                      }
                      onManage={() => setManaging(group)}
                      onEdit={() => startEdit(group)}
                      onDelete={() => setDeleting(group)}
                    />
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {managing && productsQuery.data ? (
        <ManageProductsDialog
          key={managing.id}
          group={managing}
          products={productsQuery.data}
          onClose={() => setManaging(null)}
          onSaved={() => {
            invalidate()
            setManaging(null)
          }}
        />
      ) : null}

      {deleting ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleting(null)
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Excluir grupo “{deleting.name}”?</DialogTitle>
              <DialogDescription>
                Os {deleting.productCount ?? 0} produto(s) vinculados voltam a
                usar o preço próprio. Nenhum produto é excluído.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                disabled={deleteMutation.isPending}
                onClick={() => setDeleting(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleting)}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Excluir grupo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}

// ── Linha do grupo (expande para mostrar os produtos) ─────────────────────

function GroupRow({
  group,
  products,
  expanded,
  onToggle,
  onManage,
  onEdit,
  onDelete,
}: {
  group: PriceGroup
  products: Product[]
  expanded: boolean
  onToggle: () => void
  onManage: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <>
      <TableRow className={expanded ? "bg-muted/40" : undefined}>
        <TableCell className="pr-0">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-expanded={expanded}
            aria-label={
              expanded
                ? `Recolher produtos de ${group.name}`
                : `Ver produtos de ${group.name}`
            }
            onClick={onToggle}
          >
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </Button>
        </TableCell>
        <TableCell className="font-medium">
          <button
            type="button"
            className="text-left hover:underline"
            onClick={onToggle}
          >
            {group.name}
          </button>
        </TableCell>
        <TableCell className="text-right font-semibold tabular-nums">
          {formatBRL(group.priceInCents)}
        </TableCell>
        <TableCell>
          <Badge variant="secondary">{group.productCount ?? 0}</Badge>
        </TableCell>
        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
          {formatDateTime(group.updatedAt)}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button variant="outline" size="xs" onClick={onManage}>
              <Plus className="size-3.5" />
              Produtos
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Editar ${group.name}`}
              onClick={onEdit}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Excluir ${group.name}`}
              onClick={onDelete}
            >
              <Trash2 className="text-destructive size-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {expanded ? (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell />
          <TableCell colSpan={COLS - 1} className="py-3">
            {products.length === 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-muted-foreground text-sm">
                  Nenhum produto vinculado ainda.
                </p>
                <Button variant="outline" size="xs" onClick={onManage}>
                  <Plus className="size-3.5" />
                  Adicionar produtos
                </Button>
              </div>
            ) : (
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Produtos neste grupo ({products.length})
                  </p>
                  <Button variant="ghost" size="xs" onClick={onManage}>
                    <Plus className="size-3.5" />
                    Adicionar ou remover
                  </Button>
                </div>
                <ul className="divide-border bg-background grid divide-y rounded-lg border">
                  {products.map((product) => (
                    <li
                      key={product.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{product.name}</p>
                        <p className="text-muted-foreground font-mono text-xs">
                          {product.barcode}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="tabular-nums">
                          {formatBRL(group.priceInCents)}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          próprio: {formatBRL(product.ownPriceInCents)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TableCell>
        </TableRow>
      ) : null}
    </>
  )
}

// ── Seleção de produtos do grupo (checkbox) ───────────────────────────────

function ManageProductsDialog({
  group,
  products,
  onClose,
  onSaved,
}: {
  group: PriceGroup
  products: Product[]
  onClose: () => void
  onSaved: () => void
}) {
  const initialIds = useMemo(
    () =>
      new Set(
        products
          .filter((product) => product.priceGroupId === group.id)
          .map((product) => product.id),
      ),
    [products, group.id],
  )

  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(initialIds),
  )
  const [search, setSearch] = useState("")

  const sorted = useMemo(
    () =>
      [...products].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [products],
  )

  const filtered = useMemo(() => {
    const query = normalizeText(search.trim())
    if (!query) return sorted
    return sorted.filter((product) =>
      normalizeText(
        [product.name, product.barcode, product.priceGroupName ?? ""].join(
          " ",
        ),
      ).includes(query),
    )
  }, [sorted, search])

  const joining = [...selected].filter((id) => !initialIds.has(id)).length
  const leaving = [...initialIds].filter((id) => !selected.has(id)).length
  const dirty = joining > 0 || leaving > 0

  const saveMutation = useMutation({
    mutationFn: () => adminSyncPriceGroupProducts(group.id, [...selected]),
    onSuccess: (result) => {
      toast.success(
        `Grupo "${group.name}" agora tem ${result.productCount} produto(s).`,
      )
      onSaved()
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar a seleção.",
      )
    },
  })

  function toggle(id: number) {
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectFiltered() {
    setSelected((previous) => {
      const next = new Set(previous)
      for (const product of filtered) next.add(product.id)
      return next
    })
  }

  const hasOtherGroups = filtered.some(
    (product) =>
      product.priceGroupId && product.priceGroupId !== group.id,
  )

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Produtos de “{group.name}”</DialogTitle>
          <DialogDescription>
            Marque os produtos que devem usar o preço de{" "}
            {formatBRL(group.priceInCents)}. Quem for desmarcado volta ao preço
            próprio.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome ou código…"
                className="pl-8"
                aria-label="Buscar produtos"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectFiltered}
                disabled={filtered.length === 0}
              >
                Marcar todos
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelected(new Set())}
                disabled={selected.size === 0}
              >
                Limpar
              </Button>
            </div>
          </div>

          {hasOtherGroups ? (
            <p className="text-muted-foreground text-xs">
              Produtos de outros grupos serão movidos para “{group.name}” ao
              salvar.
            </p>
          ) : null}

          <div className="divide-border max-h-[45vh] overflow-y-auto rounded-lg border">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground px-3 py-8 text-center text-sm">
                {products.length === 0
                  ? "Nenhum produto cadastrado ainda."
                  : "Nenhum produto corresponde à busca."}
              </p>
            ) : (
              filtered.map((product) => {
                const checked = selected.has(product.id)
                const otherGroup =
                  product.priceGroupId &&
                  product.priceGroupId !== group.id

                return (
                  <div
                    key={product.id}
                    className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors"
                    onClick={() => toggle(product.id)}
                  >
                    <Checkbox
                      checked={checked}
                      aria-label={`Incluir ${product.name} no grupo`}
                      onClick={(event) => event.stopPropagation()}
                      onCheckedChange={() => toggle(product.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {product.name}
                      </p>
                      <p className="text-muted-foreground font-mono text-xs">
                        {product.barcode}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm tabular-nums">
                        {formatBRL(product.ownPriceInCents)}
                      </span>
                      <div className="flex gap-1">
                        {otherGroup ? (
                          <Badge variant="outline" className="text-[10px]">
                            em {product.priceGroupName}
                          </Badge>
                        ) : null}
                        {product.isActive ? null : (
                          <Badge variant="secondary" className="text-[10px]">
                            inativo
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <p className="text-muted-foreground text-sm">
            {selected.size} selecionado(s)
            {joining > 0 ? ` · +${joining} entram` : ""}
            {leaving > 0 ? ` · −${leaving} saem` : ""}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={saveMutation.isPending}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              disabled={saveMutation.isPending || !dirty}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Salvar seleção
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
