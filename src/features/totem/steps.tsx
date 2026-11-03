import { useEffect, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  CircleCheck,
  Loader2,
  ScanBarcode,
  UserRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CpfInput } from "@/components/cpf-input"
import { isValidCPF } from "@/lib/cpf"

// ── Identificação (CPF) ───────────────────────────────────────────────────

export function IdentifyStep({
  onSubmit,
}: {
  onSubmit: (cpf: string) => Promise<void>
}) {
  const [cpf, setCpf] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!isValidCPF(cpf)) {
      setError("CPF inválido")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit(cpf)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md py-4">
      <Card>
        <CardHeader className="items-center text-center">
          <span className="bg-primary/10 text-primary mb-2 flex size-14 items-center justify-center rounded-full">
            <ScanBarcode className="size-7" />
          </span>
          <CardTitle className="text-3xl">Quem está comprando?</CardTitle>
          <CardDescription className="text-lg">
            Digite seu CPF para entrar na loja e começar a comprar.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <label
              htmlFor="totem-cpf"
              className="text-sm leading-none font-medium"
            >
              CPF
            </label>
            <CpfInput
              id="totem-cpf"
              value={cpf}
              onChange={(value) => {
                setCpf(value)
                setError(null)
              }}
              autoFocus
              disabled={busy}
              className="h-14 text-center text-2xl font-semibold tracking-widest"
            />
            {error ? (
              <p className="text-destructive text-sm font-medium" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <Button
            type="button"
            size="lg"
            className="h-16 w-full text-xl"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowRight className="size-4" />
            )}
            Continuar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Cadastro no primeiro acesso ───────────────────────────────────────────

export function RegisterStep({
  cpf,
  onSubmit,
  onBack,
}: {
  cpf: string
  onSubmit: (name: string) => Promise<void>
  onBack: () => void
}) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (name.trim().length < 2) {
      setError("Informe seu nome (mínimo 2 caracteres)")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onSubmit(name.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md py-4">
      <Card>
        <CardHeader className="items-center text-center">
          <span className="bg-primary/10 text-primary mb-2 flex size-14 items-center justify-center rounded-full">
            <UserRound className="size-7" />
          </span>
          <CardTitle className="text-3xl">Primeiro acesso</CardTitle>
          <CardDescription className="text-lg">
            Não encontramos o CPF <strong className="font-mono">{cpf}</strong>.
            Preencha seu nome para se cadastrar.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <label
              htmlFor="totem-name"
              className="text-sm leading-none font-medium"
            >
              Seu nome
            </label>
            <Input
              id="totem-name"
              placeholder="Ex.: Maria Silva"
              autoComplete="name"
              autoFocus
              disabled={busy}
              className="h-14 text-lg"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void submit()
                }
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
            size="lg"
            className="h-16 w-full text-xl"
            disabled={busy}
            onClick={() => void submit()}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowRight className="size-4" />
            )}
            Cadastrar e entrar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="h-14 text-lg"
            onClick={onBack}
            disabled={busy}
          >
            <ArrowLeft className="size-4" />
            Voltar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Acesso bloqueado ──────────────────────────────────────────────────────

export function BlockedStep({
  name,
  onBack,
}: {
  name?: string
  onBack: () => void
}) {
  return (
    <div className="mx-auto w-full max-w-md py-4">
      <Card className="border-destructive/40">
        <CardHeader className="items-center text-center">
          <span className="bg-destructive/10 text-destructive mb-2 flex size-14 items-center justify-center rounded-full">
            <CircleAlert className="size-7" />
          </span>
          <CardTitle className="text-3xl">Acesso bloqueado</CardTitle>
          <CardDescription className="text-lg">
            {name ? (
              <>
                <strong>{name}</strong>, seu acesso está bloqueado nesta loja.
              </>
            ) : (
              "Seu acesso está bloqueado nesta loja."
            )}{" "}
            Procure o administrador para mais informações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            size="lg"
            variant="outline"
            className="h-14 w-full text-lg"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" />
            Voltar ao início
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Conclusão ─────────────────────────────────────────────────────────────

export function DoneStep({
  name,
  onReset,
}: {
  name?: string
  onReset: () => void
}) {
  const [remaining, setRemaining] = useState(5)

  useEffect(() => {
    const countdown = setInterval(() => {
      setRemaining((value) => value - 1)
    }, 1000)
    return () => clearInterval(countdown)
  }, [])

  useEffect(() => {
    if (remaining <= 0) onReset()
  }, [remaining, onReset])

  return (
    <div className="mx-auto w-full max-w-md py-4">
      <Card className="border-primary/40">
        <CardHeader className="items-center text-center">
          <span className="bg-primary/10 text-primary mb-2 flex size-14 items-center justify-center rounded-full">
            <CircleCheck className="size-7" />
          </span>
          <CardTitle className="text-3xl">Até logo{name ? `, ${name}` : ""}!</CardTitle>
          <CardDescription className="text-lg">
            Sua saída foi registrada. Volte sempre — este totem reinicia em{" "}
            {Math.max(0, remaining)}s.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="lg" className="h-14 w-full text-lg" onClick={onReset}>
            Novo cliente
            <ArrowRight className="size-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
