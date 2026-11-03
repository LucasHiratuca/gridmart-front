import { Link } from "react-router"
import {
  ArrowRight,
  DoorOpen,
  ScanBarcode,
  ShieldCheck,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "cn"

const ENTRADAS = [
  {
    to: "/totem",
    title: "Totem",
    description:
      "Autoatendimento: escaneie os produtos, monte o carrinho e acompanhe a confirmação do pagamento.",
    icon: ScanBarcode,
    badge: "Loja",
  },
  {
    to: "/acesso",
    title: "Acesso",
    description:
      "Entrada e saída da loja por CPF: cadastro no primeiro acesso e token de saída.",
    icon: DoorOpen,
    badge: "Porta",
  },
  {
    to: "/admin",
    title: "Admin",
    description:
      "Painel de gestão: produtos, vendas, visitas, clientes e auditoria de acessos.",
    icon: ShieldCheck,
    badge: "Protegido",
  },
] as const

const cardClass =
  "group relative transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5"

export function HomePage() {
  return (
    <div className="bg-muted/40 text-foreground flex min-h-svh flex-col">
      <header className="border-border/60 bg-background border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg font-bold">
              G
            </span>
            <span className="text-lg font-semibold tracking-tight">
              GridMart
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 sm:py-16">
        <div className="max-w-2xl">
          <Badge variant="secondary" className="mb-4">
            Micro-mercado autônomo
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Escolha por onde começar
          </h1>
          <p className="text-muted-foreground mt-3 text-base sm:text-lg">
            Três interfaces para a mesma loja: o totem de autoatendimento, o
            controle de acesso na porta e o painel de gestão.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ENTRADAS.map((entrada) => (
            <Link key={entrada.to} to={entrada.to} className={cardClass}>
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-lg transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <entrada.icon className="size-5" />
                    </span>
                    <Badge variant="outline">{entrada.badge}</Badge>
                  </div>
                  <CardTitle className="mt-2">{entrada.title}</CardTitle>
                  <CardDescription className="line-clamp-3">
                    {entrada.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <span
                    className={cn(
                      "text-muted-foreground inline-flex items-center gap-1 text-sm font-medium",
                      "transition-all group-hover:text-foreground group-hover:gap-2",
                    )}
                  >
                    Abrir <ArrowRight className="size-4" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-border/60 border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-5 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            GridMart — totem, acesso e gestão para lojas autônomas.
          </p>
          <p className="text-muted-foreground">
            API Hono · Cloudflare Workers · D1
          </p>
        </div>
      </footer>
    </div>
  )
}
