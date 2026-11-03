import { useMemo, useState } from "react"
import { Ban, Loader2, Search, ShieldCheck } from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { StatusBadge } from "@/components/status-badge"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { adminListUsers, adminSetBlocked } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import type { User } from "@/lib/types"
import { PageHeader } from "./page-header"
import {
  TableEmptyRow,
  TableErrorRow,
  TableLoadingRows,
} from "./table-states"

const COLS = 5

export function AdminUsersPage() {
  const [search, setSearch] = useState("")
  const [blocking, setBlocking] = useState<User | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: adminListUsers,
  })

  const filtered = useMemo(() => {
    const users = data ?? []
    const query = search.trim().toLowerCase()
    if (!query) return users
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) || user.cpf.includes(query),
    )
  }, [data, search])

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Clientes"
        description="Pessoas cadastradas para entrar na loja por CPF."
      >
        <div className="relative w-full max-w-xs">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome ou CPF…"
            className="pl-8"
            aria-label="Buscar clientes"
          />
        </div>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Cadastrado em</TableHead>
                <TableHead className="w-36 text-right">Ações</TableHead>
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
                      ? "Nenhum cliente corresponde à busca."
                      : "Nenhum cliente cadastrado."
                  }
                />
              ) : (
                filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {user.cpf}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={user.isBlocked ? "BLOCKED" : "ACTIVE"}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {formatDateTime(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => setBlocking(user)}
                      >
                        {user.isBlocked ? (
                          <ShieldCheck className="size-3.5" />
                        ) : (
                          <Ban className="size-3.5" />
                        )}
                        {user.isBlocked ? "Desbloquear" : "Bloquear"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {blocking ? (
        <ToggleBlockDialog
          user={blocking}
          open
          onOpenChange={(open) => {
            if (!open) setBlocking(null)
          }}
        />
      ) : null}
    </div>
  )
}

function ToggleBlockDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const willBlock = !user.isBlocked

  const toggleMutation = useMutation({
    mutationFn: () => adminSetBlocked(user.id, willBlock),
    onSuccess: () => {
      toast.success(
        willBlock
          ? `${user.name} foi bloqueado.`
          : `${user.name} foi desbloqueado.`,
      )
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      onOpenChange(false)
    },
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "Erro ao atualizar o cliente.",
      )
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{willBlock ? "Bloquear" : "Desbloquear"} cliente</DialogTitle>
          <DialogDescription>
            {willBlock ? (
              <>
                <strong>{user.name}</strong> não conseguirá entrar na loja até
                ser desbloqueado.
              </>
            ) : (
              <>
                <strong>{user.name}</strong> voltará a poder entrar na loja.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant={willBlock ? "destructive" : "default"}
            disabled={toggleMutation.isPending}
            onClick={() => toggleMutation.mutate()}
          >
            {toggleMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : willBlock ? (
              <Ban className="size-4" />
            ) : (
              <ShieldCheck className="size-4" />
            )}
            {willBlock ? "Bloquear" : "Desbloquear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
