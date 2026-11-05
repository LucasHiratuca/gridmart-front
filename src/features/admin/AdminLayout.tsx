import { useEffect, useState } from "react"
import {
  DoorOpen,
  FolderTree,
  KeyRound,
  Loader2,
  Package,
  Receipt,
  ScrollText,
  ShieldCheck,
  Tags,
  Users,
} from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { NavLink, Outlet } from "react-router"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  adminPing,
  ApiError,
  clearAdminToken,
  getAdminToken,
  saveAdminToken,
} from "@/lib/api"
import { cn } from "cn"

type AuthStatus = "checking" | "authorized" | "denied"

export function AdminLayout() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AuthStatus>(() =>
    getAdminToken() ? "checking" : "denied",
  )
  const [notice, setNotice] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (status !== "checking") return

    let cancelled = false
    adminPing()
      .then(() => {
        if (!cancelled) setStatus("authorized")
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof ApiError && error.status === 401) {
          clearAdminToken()
        }
        setNotice(
          error instanceof Error ? error.message : "Erro ao validar o token.",
        )
        setStatus("denied")
      })

    return () => {
      cancelled = true
    }
  }, [status])

  const handleLogout = () => {
    clearAdminToken()
    queryClient.clear()
    setNotice(undefined)
    setStatus("denied")
  }

  if (status === "checking") {
    return (
      <GateShell>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Validando token…
            </CardTitle>
            <CardDescription>
              Verificando o acesso ao painel administrativo.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-2/3" />
          </CardContent>
        </Card>
      </GateShell>
    )
  }

  if (status === "denied") {
    return (
      <TokenGate
        notice={notice}
        onAuthorized={() => {
          setNotice(undefined)
          setStatus("authorized")
        }}
      />
    )
  }

  return (
    <AdminShell onLogout={handleLogout}>
      <Outlet />
    </AdminShell>
  )
}

// ── Tela de digitação do token ────────────────────────────────────────────

function TokenGate({
  notice,
  onAuthorized,
}: {
  notice?: string
  onAuthorized: () => void
}) {
  const [token, setToken] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(notice)

  async function submit() {
    if (!token.trim()) {
      setError("Informe o token de administrador")
      return
    }
    setBusy(true)
    setError(undefined)
    saveAdminToken(token.trim())
    try {
      await adminPing()
      onAuthorized()
    } catch (e) {
      clearAdminToken()
      setError(e instanceof Error ? e.message : "Erro ao validar o token.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <GateShell>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <span className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-full">
            <ShieldCheck className="size-5" />
          </span>
          <CardTitle>Painel Admin</CardTitle>
          <CardDescription>
            Informe o token de administrador para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <label
              htmlFor="admin-token"
              className="text-sm leading-none font-medium"
            >
              Token
            </label>
            <Input
              id="admin-token"
              type="password"
              placeholder="••••••••••••"
              autoComplete="off"
              autoFocus
              disabled={busy}
              value={token}
              onChange={(event) => {
                setToken(event.target.value)
                setError(undefined)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submit()
              }}
            />
            {error ? (
              <p className="text-destructive text-sm font-medium" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            className="w-full"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            Entrar
          </Button>
        </CardContent>
      </Card>
    </GateShell>
  )
}

function GateShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/40 text-foreground flex min-h-svh flex-col items-center justify-center gap-6 px-4">
      <div className="flex items-center gap-2">
        <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg font-bold">
          G
        </span>
        <span className="text-lg font-semibold tracking-tight">GridMart</span>
      </div>
      {children}
    </div>
  )
}

// ── Shell autenticado ─────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: "/admin/produtos", label: "Produtos", icon: Package },
  { to: "/admin/categorias", label: "Categorias", icon: FolderTree },
  { to: "/admin/precos", label: "Preços", icon: Tags },
  { to: "/admin/vendas", label: "Vendas", icon: Receipt },
  { to: "/admin/visitas", label: "Visitas", icon: DoorOpen },
  { to: "/admin/usuarios", label: "Clientes", icon: Users },
  { to: "/admin/auditoria", label: "Auditoria", icon: ScrollText },
] as const

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
    isActive
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  )
}

function AdminShell({
  onLogout,
  children,
}: {
  onLogout: () => void
  children: React.ReactNode
}) {
  return (
    <div className="bg-muted/40 text-foreground min-h-svh">
      <header className="border-border/60 bg-background/95 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-3">
            <NavLink to="/" className="flex items-center gap-2">
              <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md text-sm font-bold">
                G
              </span>
              <span className="font-semibold tracking-tight">GridMart</span>
              <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs font-medium">
                admin
              </span>
            </NavLink>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={onLogout}>
                <KeyRound className="size-4" />
                Trocar token
              </Button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto pb-2">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                <item.icon className="size-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  )
}
