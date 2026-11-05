import { useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  CircleCheck,
  DoorOpen,
  Loader2,
  LogIn,
} from "lucide-react"
import { Link, useSearchParams } from "react-router"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { BrandLogo } from "@/components/brand-logo"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { CpfInput } from "@/components/cpf-input"
import {
  ApiError,
  checkAccess,
  enterStore,
  exitStore,
  registerAccess,
} from "@/lib/api"
import { isValidCPF, onlyDigits } from "@/lib/cpf"

type Phase = "enter" | "register" | "inside" | "confirming" | "exited"

export function AccessPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const qrToken = searchParams.get("token")?.trim() ?? ""

  const [phase, setPhase] = useState<Phase>(qrToken ? "confirming" : "enter")
  const [cpf, setCpf] = useState("")
  const [cpfError, setCpfError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState("")
  const [alreadyInside, setAlreadyInside] = useState(false)
  const [busy, setBusy] = useState(false)
  const [entryError, setEntryError] = useState<string | null>(null)
  const [exitError, setExitError] = useState<string | null>(null)
  const [exitBusy, setExitBusy] = useState(false)
  const autoConfirmRef = useRef(false)

  /** Tenta registrar a saída. true = sucesso. */
  const performExit = useCallback(
    async (token: string): Promise<boolean> => {
      setExitBusy(true)
      setExitError(null)
      try {
        await exitStore(token.trim().toLowerCase())
        // limpa ?token= da URL para um reload não tentar de novo
        setSearchParams({}, { replace: true })
        setPhase("exited")
        return true
      } catch (error) {
        setExitError(
          error instanceof Error ? error.message : "Erro ao confirmar a saída.",
        )
        return false
      } finally {
        setExitBusy(false)
      }
    },
    [setSearchParams],
  )

  // Chegou pelo QR de confirmação do pagamento → sai direto.
  useEffect(() => {
    if (!qrToken || autoConfirmRef.current) return
    autoConfirmRef.current = true
    void performExit(qrToken).then((ok) => {
      if (!ok) setPhase("inside")
    })
  }, [qrToken, performExit])

  // ── Entrada ─────────────────────────────────────────────────────────────

  const submitIdentify = useCallback(async () => {
    if (!isValidCPF(cpf)) {
      setCpfError("CPF inválido")
      return
    }
    setCpfError(null)
    setEntryError(null)
    setBusy(true)

    const digits = onlyDigits(cpf)
    try {
      const check = await checkAccess(digits)

      if (!check.registered) {
        setPhase("register")
        return
      }
      if (!check.allowed) {
        setEntryError("Seu acesso está bloqueado. Procure o administrador.")
        return
      }

      try {
        const entered = await enterStore(digits)
        setCustomerName(entered.name)
        setAlreadyInside(false)
        setPhase("inside")
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          // Visita já aberta: não permite nova entrada, só mostra o status.
          setCustomerName(check.name ?? "")
          setAlreadyInside(true)
          setPhase("inside")
        } else {
          throw error
        }
      }
    } catch (error) {
      setEntryError(error instanceof Error ? error.message : "Erro inesperado.")
    } finally {
      setBusy(false)
    }
  }, [cpf])

  const submitRegister = useCallback(async () => {
    if (name.trim().length < 2) {
      setNameError("Informe seu nome (mínimo 2 caracteres)")
      return
    }
    setNameError(null)
    setEntryError(null)
    setBusy(true)

    const digits = onlyDigits(cpf)
    try {
      try {
        const registered = await registerAccess(digits, name.trim())
        setCustomerName(registered.name)
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 409)) throw error
        setCustomerName(name.trim())
      }

      try {
        const entered = await enterStore(digits)
        setCustomerName(entered.name)
        setAlreadyInside(false)
        setPhase("inside")
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          setAlreadyInside(true)
          setPhase("inside")
        } else {
          throw error
        }
      }
    } catch (error) {
      setEntryError(error instanceof Error ? error.message : "Erro inesperado.")
    } finally {
      setBusy(false)
    }
  }, [cpf, name])

  // Autoenvia o CPF assim que os 11 dígitos ficam válidos (menos toques no celular).
  const autoSentRef = useRef(false)
  useEffect(() => {
    if (phase !== "enter") return
    if (onlyDigits(cpf).length < 11) {
      autoSentRef.current = false
      return
    }
    if (autoSentRef.current || busy || !isValidCPF(cpf)) return
    autoSentRef.current = true
    void submitIdentify()
  }, [cpf, phase, busy, submitIdentify])

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="bg-muted/40 text-foreground min-h-svh">
      <header className="border-border/60 bg-background border-b">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogo className="h-9" />
            <span className="font-semibold tracking-tight">GridMart</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">Início</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-4 py-6 sm:py-10">
        {phase === "enter" || phase === "register" ? (
          <Card>
            <CardHeader>
              <span className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-full">
                <LogIn className="size-5" />
              </span>
              <CardTitle className="text-2xl">
                {phase === "register" ? "Primeiro acesso" : "Entrar na loja"}
              </CardTitle>
              <CardDescription>
                {phase === "register" ? (
                  <>
                    Não encontramos o CPF{" "}
                    <strong className="font-mono">{cpf}</strong>. Só falta seu
                    nome.
                  </>
                ) : (
                  "Informe seu CPF para registrar a entrada."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {phase === "register" ? (
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Seu nome</Label>
                    <Input
                      id="name"
                      placeholder="Ex.: Maria Silva"
                      autoComplete="name"
                      autoFocus
                      disabled={busy}
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value)
                        setNameError(null)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          void submitRegister()
                        }
                      }}
                    />
                    {nameError ? (
                      <p className="text-destructive text-sm">{nameError}</p>
                    ) : null}
                  </div>

                  {entryError ? (
                    <Alert variant="destructive">
                      <CircleAlert />
                      <AlertTitle>Não foi possível cadastrar</AlertTitle>
                      <AlertDescription>{entryError}</AlertDescription>
                    </Alert>
                  ) : null}

                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    disabled={busy}
                    onClick={() => void submitRegister()}
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ArrowRight className="size-4" />
                    )}
                    Cadastrar e entrar
                  </Button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5 text-sm transition-colors"
                    onClick={() => setPhase("enter")}
                  >
                    <ArrowLeft className="size-4" />
                    Corrigir CPF
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <CpfInput
                      id="cpf"
                      value={cpf}
                      onChange={(value) => {
                        setCpf(value)
                        setCpfError(null)
                      }}
                      autoFocus
                      disabled={busy}
                      className="h-12 text-center text-lg font-semibold tracking-widest"
                    />
                    {cpfError ? (
                      <p className="text-destructive text-sm">{cpfError}</p>
                    ) : null}
                  </div>

                  {entryError ? (
                    <Alert variant="destructive">
                      <CircleAlert />
                      <AlertTitle>Não foi possível entrar</AlertTitle>
                      <AlertDescription>{entryError}</AlertDescription>
                    </Alert>
                  ) : null}

                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    disabled={busy}
                    onClick={() => void submitIdentify()}
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ArrowRight className="size-4" />
                    )}
                    Entrar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : phase === "confirming" ? (
          <Card>
            <CardHeader className="items-center text-center">
              <span className="bg-muted text-muted-foreground mb-2 flex size-12 items-center justify-center rounded-full">
                <Loader2 className="size-6 animate-spin" />
              </span>
              <CardTitle className="text-2xl">Confirmando saída…</CardTitle>
              <CardDescription>
                Só um instante — estamos encerrando sua visita.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : phase === "exited" ? (
          <Card className="border-primary/40">
            <CardHeader className="items-center text-center">
              <span className="bg-primary/10 text-primary mb-2 flex size-14 items-center justify-center rounded-full">
                <CircleCheck className="size-7" />
              </span>
              <CardTitle className="text-2xl">Saída registrada!</CardTitle>
              <CardDescription>
                Sua visita foi encerrada. Volte sempre 👋
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          /* phase === "inside" */
          <Card>
            <CardHeader>
              <span className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-full">
                <CircleCheck className="size-5" />
              </span>
              <CardTitle className="text-2xl">
                {alreadyInside ? "Você já está dentro" : "Entrada registrada"}
              </CardTitle>
              <CardDescription>
                {customerName ? (
                  <>
                    Bem-vindo(a), <strong>{customerName}</strong>.{" "}
                  </>
                ) : null}
                Aproveite as compras no totem.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-muted-foreground text-xs">
                Entrou por engano? Procure o atendente.
              </p>

              <Separator />

              <div className="grid gap-3">
                <div className="grid gap-1">
                  <h2 className="flex items-center gap-2 text-base font-semibold">
                    <DoorOpen className="size-4" />
                    Sair da loja
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Após pagar no totem, aponte a câmera do celular para o{" "}
                    <strong className="text-foreground">
                      QR de confirmação
                    </strong>{" "}
                    — ele abre esta tela com a saída pronta.
                  </p>
                </div>

                <form
                  className="grid gap-3"
                  onSubmit={(event) => {
                    event.preventDefault()
                    const input = new FormData(event.currentTarget).get(
                      "exit-token",
                    )
                    const value =
                      typeof input === "string" ? input.trim() : ""
                    if (!value) return
                    void performExit(value)
                  }}
                >
                  <Input
                    name="exit-token"
                    defaultValue={qrToken}
                    placeholder="Código de saída"
                    className="font-mono"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={exitBusy}
                    aria-label="Código de saída"
                  />
                  {exitError ? (
                    <Alert variant="destructive">
                      <CircleAlert />
                      <AlertTitle>Não foi possível sair</AlertTitle>
                      <AlertDescription>{exitError}</AlertDescription>
                    </Alert>
                  ) : null}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={exitBusy}
                  >
                    {exitBusy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <DoorOpen className="size-4" />
                    )}
                    Confirmar saída
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
