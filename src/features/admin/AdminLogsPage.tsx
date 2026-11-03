import { RefreshCw } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { adminListAccessLogs } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { PageHeader } from "./page-header"
import {
  TableEmptyRow,
  TableErrorRow,
  TableLoadingRows,
} from "./table-states"

const COLS = 3

export function AdminLogsPage() {
  const { data, isFetching, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "access-logs"],
    queryFn: () => adminListAccessLogs(100),
  })

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Auditoria"
        description="Os 100 acessos mais recentes (entradas tentadas por CPF)."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw
            className={`size-4 ${isFetching ? "animate-spin" : ""}`}
          />
          Atualizar
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>CPF</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Data e hora</TableHead>
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
              ) : !data || data.length === 0 ? (
                <TableEmptyRow
                  cols={COLS}
                  message="Nenhum acesso registrado ainda."
                />
              ) : (
                data.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {log.cpf}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={log.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
