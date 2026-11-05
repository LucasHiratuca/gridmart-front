import { useMemo, useState, type FormEvent } from "react"
import {
  Check,
  CornerDownRight,
  FolderTree,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  adminCreateCategory,
  adminDeleteCategory,
  adminListCategories,
  adminUpdateCategory,
} from "@/lib/api"
import type { AdminCategory } from "@/lib/types"
import { PageHeader } from "./page-header"
import {
  TableEmptyRow,
  TableErrorRow,
  TableLoadingRows,
} from "./table-states"

const COLS = 4
/** Valor do Select para "sem departamento" (departamento raiz). */
const ROOT = "root"

/** O que o modal está fazendo: criar um tipo ou editar uma categoria. */
type CategoryDialogState =
  | { mode: "create"; parentId: number; suggestedOrder: number }
  | { mode: "edit"; category: AdminCategory }

export function AdminCategoriesPage() {
  const queryClient = useQueryClient()
  const [deleting, setDeleting] = useState<AdminCategory | null>(null)
  const [dialog, setDialog] = useState<CategoryDialogState | null>(null)

  // Formulário inline: só cria departamento (o tipo abre em modal).
  const [departmentName, setDepartmentName] = useState("")
  const [departmentOrder, setDepartmentOrder] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  const categoriesQuery = useQuery({
    queryKey: ["admin-categories"],
    queryFn: adminListCategories,
  })

  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  )

  /** Departamento → tipos (a API já devolve ordenado por sortOrder/nome). */
  const { departments, childrenByDepartment, orphanTypes } = useMemo(() => {
    const departments = categories.filter((item) => item.parentId === null)
    const departmentIds = new Set(departments.map((item) => item.id))

    const childrenByDepartment = new Map<number, AdminCategory[]>()
    for (const item of categories) {
      if (item.parentId === null) continue
      const list = childrenByDepartment.get(item.parentId) ?? []
      list.push(item)
      childrenByDepartment.set(item.parentId, list)
    }

    // Tipos cujo departamento não veio na lista (dado inconsistente): mostra
    // no fim em vez de sumir com a categoria.
    const orphanTypes = categories.filter(
      (item) => item.parentId !== null && !departmentIds.has(item.parentId),
    )

    return { departments, childrenByDepartment, orphanTypes }
  }, [categories])

  const typeCount = categories.length - departments.length

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] })
    queryClient.invalidateQueries({ queryKey: ["catalog"] })
    queryClient.invalidateQueries({ queryKey: ["admin-products"] })
  }

  const createDepartmentMutation = useMutation({
    mutationFn: () => {
      const cleanName = departmentName.trim()
      if (cleanName.length < 2) {
        throw new Error("Informe o nome do departamento.")
      }

      const parsedOrder =
        departmentOrder.trim() === "" ? 0 : Number(departmentOrder)
      if (!Number.isInteger(parsedOrder) || parsedOrder < 0) {
        throw new Error(
          "A ordem deve ser um número inteiro maior ou igual a zero.",
        )
      }

      return adminCreateCategory({
        name: cleanName,
        parentId: null,
        sortOrder: parsedOrder,
      })
    },
    onSuccess: () => {
      toast.success("Departamento criado")
      setDepartmentName("")
      setDepartmentOrder("")
      setFormError(null)
      invalidate()
    },
    onError: (error) => {
      setFormError(
        error instanceof Error
          ? error.message
          : "Erro ao salvar o departamento.",
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (category: AdminCategory) => adminDeleteCategory(category.id),
    onSuccess: (_data, category) => {
      toast.success(`Categoria “${category.name}” excluída.`)
      invalidate()
      setDeleting(null)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Erro ao excluir a categoria.",
      )
    },
  })

  function submitDepartment(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    createDepartmentMutation.mutate()
  }

  function startCreateType(department: AdminCategory) {
    const types = childrenByDepartment.get(department.id) ?? []
    setDialog({
      mode: "create",
      parentId: department.id,
      suggestedOrder: types.length + 1,
    })
  }

  function startEdit(category: AdminCategory) {
    setDialog({ mode: "edit", category })
  }

  /** Motivo pelo qual a exclusão está bloqueada (se estiver). */
  function blockedReason(category: AdminCategory): string | null {
    const children = childrenByDepartment.get(category.id) ?? []
    if (category.parentId === null && children.length > 0) {
      return `Este departamento tem ${children.length} tipo(s). Mova ou exclua os tipos antes de removê-lo.`
    }
    if (category.productCount > 0) {
      return `Há ${category.productCount} produto(s) usando esta categoria. Troque a categoria deles antes de excluir.`
    }
    return null
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Categorias"
        description="Departamentos (ex.: Bebidas) e tipos (ex.: Refrigerante). O tipo é o que vira a primeira palavra do nome do produto."
      >
        <Badge variant="secondary">
          {departments.length} departamento(s) · {typeCount} tipo(s)
        </Badge>
      </PageHeader>

      <Card id="category-form">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderTree className="size-4" />
            Novo departamento
          </CardTitle>
          <CardDescription>
            O departamento organiza os tipos no cadastro do produto (ex.:
            Bebidas, Doces, Mercearia). Para adicionar um tipo, use o botão
            “Tipo” na linha do departamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_6rem_auto] sm:items-end"
            onSubmit={submitDepartment}
          >
            <div className="grid gap-2">
              <Label htmlFor="department-name">Nome</Label>
              <Input
                id="department-name"
                placeholder="Bebidas"
                autoComplete="off"
                value={departmentName}
                disabled={createDepartmentMutation.isPending}
                onChange={(event) => setDepartmentName(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="department-order">Ordem</Label>
              <Input
                id="department-order"
                inputMode="numeric"
                placeholder="0"
                value={departmentOrder}
                disabled={createDepartmentMutation.isPending}
                onChange={(event) => setDepartmentOrder(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={createDepartmentMutation.isPending}>
              {createDepartmentMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Criar departamento
            </Button>
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
                <TableHead>Categoria</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead className="w-20 text-right">Ordem</TableHead>
                <TableHead className="w-48 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoriesQuery.isLoading ? (
                <TableLoadingRows cols={COLS} />
              ) : categoriesQuery.error ? (
                <TableErrorRow
                  cols={COLS}
                  error={categoriesQuery.error}
                  onRetry={() => categoriesQuery.refetch()}
                />
              ) : categories.length === 0 ? (
                <TableEmptyRow
                  cols={COLS}
                  message="Nenhuma categoria criada. Use o formulário acima para começar."
                />
              ) : (
                <>
                  {departments.map((department) => {
                    const types = childrenByDepartment.get(department.id) ?? []

                    return (
                      <DepartmentRows
                        key={department.id}
                        department={department}
                        types={types}
                        onCreateType={() => startCreateType(department)}
                        onEdit={startEdit}
                        onDelete={setDeleting}
                      />
                    )
                  })}

                  {orphanTypes.length > 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={COLS}
                        className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
                      >
                        Tipos sem departamento
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {orphanTypes.map((category) => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      isType
                      onEdit={startEdit}
                      onDelete={setDeleting}
                    />
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {dialog ? (
        <CategoryDialog
          key={
            dialog.mode === "edit"
              ? `edit-${dialog.category.id}`
              : `create-${dialog.parentId}`
          }
          state={dialog}
          departments={departments}
          onClose={() => setDialog(null)}
          onSaved={() => {
            invalidate()
            setDialog(null)
          }}
        />
      ) : null}

      {deleting ? (
        <DeleteDialog
          category={deleting}
          blockedReason={blockedReason(deleting)}
          pending={deleteMutation.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={() => deleteMutation.mutate(deleting)}
        />
      ) : null}
    </div>
  )
}

// ── Linhas da tabela ──────────────────────────────────────────────────────

function DepartmentRows({
  department,
  types,
  onCreateType,
  onEdit,
  onDelete,
}: {
  department: AdminCategory
  types: AdminCategory[]
  onCreateType: () => void
  onEdit: (category: AdminCategory) => void
  onDelete: (category: AdminCategory) => void
}) {
  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/40">
        <TableCell className="font-semibold">
          <div className="flex flex-wrap items-center gap-2">
            <FolderTree className="text-muted-foreground size-4" />
            {department.name}
            <Badge variant="secondary">{types.length} tipo(s)</Badge>
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">—</TableCell>
        <TableCell className="text-right tabular-nums">
          {department.sortOrder}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button variant="outline" size="xs" onClick={onCreateType}>
              <Plus className="size-3.5" />
              Tipo
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Editar ${department.name}`}
              onClick={() => onEdit(department)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Excluir ${department.name}`}
              onClick={() => onDelete(department)}
            >
              <Trash2 className="text-destructive size-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {types.length === 0 ? (
        <TableRow>
          <TableCell
            colSpan={COLS}
            className="text-muted-foreground py-2 pl-10 text-sm"
          >
            Nenhum tipo neste departamento. Use o botão “Tipo” para criar.
          </TableCell>
        </TableRow>
      ) : (
        types.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            isType
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))
      )}
    </>
  )
}

function CategoryRow({
  category,
  isType,
  onEdit,
  onDelete,
}: {
  category: AdminCategory
  isType?: boolean
  onEdit: (category: AdminCategory) => void
  onDelete: (category: AdminCategory) => void
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        <div className={isType ? "flex items-center gap-2 pl-6" : undefined}>
          {isType ? (
            <CornerDownRight className="text-muted-foreground size-3.5" />
          ) : null}
          {category.name}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={category.productCount > 0 ? "default" : "secondary"}>
          {category.productCount}
        </Badge>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {category.sortOrder}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Editar ${category.name}`}
            onClick={() => onEdit(category)}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Excluir ${category.name}`}
            onClick={() => onDelete(category)}
          >
            <Trash2 className="text-destructive size-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ── Modal de criação/edição ───────────────────────────────────────────────

function CategoryDialog({
  state,
  departments,
  onClose,
  onSaved,
}: {
  state: CategoryDialogState
  departments: AdminCategory[]
  onClose: () => void
  onSaved: () => void
}) {
  const editing = state.mode === "edit" ? state.category : null
  const createParent =
    state.mode === "create"
      ? departments.find((department) => department.id === state.parentId)
      : undefined

  const [name, setName] = useState(editing?.name ?? "")
  const [parent, setParent] = useState(
    editing
      ? editing.parentId === null
        ? ROOT
        : String(editing.parentId)
      : String(state.mode === "create" ? state.parentId : ROOT),
  )
  const [sortOrder, setSortOrder] = useState(
    String(
      editing?.sortOrder ?? (state.mode === "create" ? state.suggestedOrder : 0),
    ),
  )
  const [error, setError] = useState<string | null>(null)

  const saveMutation = useMutation({
    mutationFn: () => {
      const cleanName = name.trim()
      if (cleanName.length < 2) throw new Error("Informe o nome da categoria.")

      const parsedOrder = Number(sortOrder)
      if (!Number.isInteger(parsedOrder) || parsedOrder < 0) {
        throw new Error(
          "A ordem deve ser um número inteiro maior ou igual a zero.",
        )
      }

      const payload = {
        name: cleanName,
        parentId: parent === ROOT ? null : Number(parent),
        sortOrder: parsedOrder,
      }

      return editing
        ? adminUpdateCategory(editing.id, payload)
        : adminCreateCategory(payload)
    },
    onSuccess: () => {
      toast.success(editing ? "Categoria atualizada" : "Tipo criado")
      onSaved()
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Erro ao salvar a categoria.",
      )
    },
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    saveMutation.mutate()
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saveMutation.isPending) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? `Editar “${editing.name}”`
              : `Novo tipo em “${createParent?.name ?? "departamento"}”`}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Mudar o nome também atualiza o slug usado no catálogo."
              : "O tipo entra no nome gerado do produto (ex.: Refrigerante, Chocolate, Café)."}
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label htmlFor="category-name">Nome</Label>
            <Input
              id="category-name"
              placeholder="Refrigerante"
              autoComplete="off"
              autoFocus
              value={name}
              disabled={saveMutation.isPending}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category-parent">Dentro de</Label>
            <Select
              value={parent}
              disabled={saveMutation.isPending}
              onValueChange={setParent}
            >
              <SelectTrigger id="category-parent" className="w-full">
                <SelectValue placeholder="Escolha…" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value={ROOT}>— Departamento (raiz) —</SelectItem>
                {departments
                  .filter((department) => department.id !== editing?.id)
                  .map((department) => (
                    <SelectItem
                      key={department.id}
                      value={String(department.id)}
                    >
                      {department.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category-order">Ordem</Label>
            <Input
              id="category-order"
              inputMode="numeric"
              value={sortOrder}
              disabled={saveMutation.isPending}
              onChange={(event) => setSortOrder(event.target.value)}
            />
          </div>

          {error ? (
            <p className="text-destructive text-sm font-medium" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saveMutation.isPending}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {editing ? "Salvar" : "Criar tipo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Confirmação de exclusão ───────────────────────────────────────────────

function DeleteDialog({
  category,
  blockedReason,
  pending,
  onCancel,
  onConfirm,
}: {
  category: AdminCategory
  blockedReason: string | null
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir “{category.name}”?</DialogTitle>
          <DialogDescription>
            {blockedReason ??
              "Nenhum produto será excluído. A categoria sairá do cadastro de produtos."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={onCancel}>
            {blockedReason ? "Entendi" : "Cancelar"}
          </Button>
          {blockedReason ? null : (
            <Button
              variant="destructive"
              disabled={pending}
              onClick={onConfirm}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Excluir categoria
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
