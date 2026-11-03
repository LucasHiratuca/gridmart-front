import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ApiError,
  checkAccess,
  createExitToken,
  enterStore,
  registerAccess,
} from "@/lib/api"
import { onlyDigits } from "@/lib/cpf"
import type { ExitToken, Product, SaleDetail } from "@/lib/types"
import { cn } from "cn"
import { PaymentStep } from "./PaymentStep"
import { ExitStep } from "./ExitStep"
import { ShopStep } from "./ShopStep"
import { BlockedStep, DoneStep, IdentifyStep, RegisterStep } from "./steps"
import { addToCart, setQuantity, type CartItem } from "./cart"

type Step =
  | "identify"
  | "register"
  | "blocked"
  | "shop"
  | "payment"
  | "exit"
  | "done"

const FLOW_LABELS = ["Entrada", "Compra", "Pagamento", "Saída"]

const FLOW_INDEX: Record<Step, number> = {
  identify: 0,
  register: 0,
  blocked: 0,
  shop: 1,
  payment: 2,
  exit: 3,
  done: 3,
}

export function TotemPage() {
  const queryClient = useQueryClient()

  // A UI do totem é 20% maior que a do celular (mesmo Tailwind, outra escala):
  // trocar o font-size do <html> escala tipografia e espaçamento de uma vez.
  useEffect(() => {
    document.documentElement.dataset.surface = "kiosk"
    return () => {
      delete document.documentElement.dataset.surface
    }
  }, [])

  const [step, setStep] = useState<Step>("identify")
  const [cpf, setCpf] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [sale, setSale] = useState<SaleDetail | null>(null)
  const [exitToken, setExitToken] = useState<ExitToken | null>(null)
  const [exitError, setExitError] = useState<string | null>(null)
  const [exitBusy, setExitBusy] = useState(false)

  // ── Fluxo de acesso ────────────────────────────────────────────────────

  const handleIdentify = useCallback(async (maskedCpf: string) => {
    const digits = onlyDigits(maskedCpf)
    const check = await checkAccess(digits)
    setCpf(maskedCpf)

    if (!check.registered) {
      setStep("register")
      return
    }

    if (!check.allowed) {
      setCustomerName(check.name ?? "")
      setStep("blocked")
      return
    }

    try {
      const entered = await enterStore(digits)
      setCustomerName(entered.name)
    } catch (error) {
      // 409: já existe visita aberta — a pessoa já está dentro.
      if (error instanceof ApiError && error.status === 409) {
        setCustomerName(check.name ?? "")
      } else {
        throw error
      }
    }

    setStep("shop")
  }, [])

  const handleRegister = useCallback(
    async (name: string) => {
      const digits = onlyDigits(cpf)

      try {
        const registered = await registerAccess(digits, name)
        setCustomerName(registered.name)
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          setCustomerName(name)
        } else {
          throw error
        }
      }

      try {
        const entered = await enterStore(digits)
        setCustomerName(entered.name)
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 409)) throw error
      }

      setStep("shop")
    },
    [cpf],
  )

  // ── Carrinho ───────────────────────────────────────────────────────────

  const handleAdd = useCallback((product: Product) => {
    setCart((items) => addToCart(items, product))
  }, [])

  const handleChangeQuantity = useCallback(
    (productId: number, quantity: number) => {
      setCart((items) => setQuantity(items, productId, quantity))
    },
    [],
  )

  // ── Pagamento ──────────────────────────────────────────────────────────

  const handleSaleCreated = useCallback((newSale: SaleDetail) => {
    setSale(newSale)
    setStep("payment")
  }, [])

  const handleBackToCart = useCallback(() => {
    toast.info(
      "A venda pendente continuará registrada no painel do administrador.",
    )
    setSale(null)
    setStep("shop")
  }, [])

  const requestExitToken = useCallback(async (saleId: number) => {
    setExitBusy(true)
    setExitError(null)
    try {
      const token = await createExitToken(saleId)
      setExitToken(token)
    } catch (error) {
      setExitToken(null)
      setExitError(
        error instanceof Error
          ? error.message
          : "Erro ao gerar o código de saída.",
      )
    } finally {
      setExitBusy(false)
    }
  }, [])

  const handlePaid = useCallback(
    async (saleId: number) => {
      setStep("exit")
      await requestExitToken(saleId)
    },
    [requestExitToken],
  )

  const handleRegenerateExit = useCallback(() => {
    if (sale) void requestExitToken(sale.id)
  }, [sale, requestExitToken])

  const handleExited = useCallback(() => setStep("done"), [])

  const handleReset = useCallback(() => {
    setStep("identify")
    setCpf("")
    setCustomerName("")
    setCart([])
    setSale(null)
    setExitToken(null)
    setExitError(null)
    setExitBusy(false)
    queryClient.removeQueries({ queryKey: ["sale"] })
    queryClient.removeQueries({ queryKey: ["sale-charge"] })
  }, [queryClient])

  // ── Render ─────────────────────────────────────────────────────────────

  const showCustomer = ["shop", "payment", "exit", "done"].includes(step)

  return (
    <div className="bg-muted/40 text-foreground flex min-h-svh flex-col">
      <header className="border-border/60 bg-background border-b">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg font-bold">
                G
              </span>
              <span className="font-semibold tracking-tight">GridMart</span>
              <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs font-medium">
                totem
              </span>
            </Link>
            {showCustomer && customerName ? (
              <Badge variant="secondary" className="max-w-40 truncate">
                {customerName}
              </Badge>
            ) : null}
          </div>

          <FlowProgress current={FLOW_INDEX[step]} />

          <div className="flex items-center gap-1">
            <ClockText />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">Sair</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {step === "identify" ? <IdentifyStep onSubmit={handleIdentify} /> : null}
        {step === "register" ? (
          <RegisterStep
            cpf={cpf}
            onSubmit={handleRegister}
            onBack={() => setStep("identify")}
          />
        ) : null}
        {step === "blocked" ? (
          <BlockedStep
            name={customerName}
            onBack={() => setStep("identify")}
          />
        ) : null}
        {step === "shop" ? (
          <ShopStep
            cpf={cpf}
            cart={cart}
            onAdd={handleAdd}
            onChangeQuantity={handleChangeQuantity}
            onSaleCreated={handleSaleCreated}
          />
        ) : null}
        {step === "payment" && sale ? (
          <PaymentStep
            sale={sale}
            onPaid={handlePaid}
            onBackToCart={handleBackToCart}
          />
        ) : null}
        {step === "exit" ? (
          <ExitStep
            token={exitToken}
            busy={exitBusy}
            error={exitError}
            onRegenerate={handleRegenerateExit}
            onExited={handleExited}
          />
        ) : null}
        {step === "done" ? (
          <DoneStep name={customerName} onReset={handleReset} />
        ) : null}
      </main>
    </div>
  )
}

function FlowProgress({ current }: { current: number }) {
  return (
    <ol className="hidden items-center gap-1.5 md:flex">
      {FLOW_LABELS.map((label, index) => (
        <li
          key={label}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
            index === current
              ? "bg-primary text-primary-foreground"
              : index < current
                ? "bg-primary/15 text-foreground"
                : "bg-muted text-muted-foreground",
          )}
        >
          <span className="size-1.5 rounded-full bg-current" />
          {label}
        </li>
      ))}
    </ol>
  )
}

function ClockText() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(id)
  }, [])

  return (
    <span className="text-muted-foreground px-2 text-sm tabular-nums">
      {now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  )
}
