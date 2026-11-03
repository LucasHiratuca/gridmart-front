# GridMart Front 🛒⚡

Front-end do GridMart: totem de autoatendimento, controle de acesso na porta e painel administrativo.

## 🛠️ Stack

- **Build**: [Vite](https://vite.dev) + React 19 + TypeScript
- **Estilo**: [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) (base neutra `neutral`, tema claro)
- **Roteamento**: [React Router](https://reactrouter.com)
- **Dados**: [TanStack Query](https://tanstack.com/query) (cache, mutações, polling)
- **Formulários**: estado nativo do React (`useState`) + validação inline
- **Toasts**: sonner

## ▶️ Como rodar

1. **API rodando local** (em outro terminal, na pasta `../gridmart-api`):
   ```bash
   bun run db:migrate && bun run db:seed   # só na primeira vez
   bun run dev                             # http://localhost:8787
   ```
   > O CORS já está habilitado na API (`hono/cors` no `src/index.ts`).

2. **Front**:
   ```bash
   bun install
   bun run dev        # http://localhost:5173
   ```

3. **Variável de ambiente** (opcional — já existe `.env.local`):
   ```bash
   VITE_API_URL=http://localhost:8787   # default se ausente
   ```

4. **Token do painel admin**: o valor de `ADMIN_TOKEN` está no `.dev.vars` da API (em dev: `dev-admin-token`). Ele é digitado na tela de acesso do `/admin` e fica no `localStorage`.

## 📦 Rotas

| Rota | O que é |
|---|---|
| `/` | Home com as três entradas |
| `/totem` | Kiosk: CPF → cadastro → escanear código de barras → carrinho → venda `PENDING` → **QR Pix** (Mercado Pago) → polling até `PAID` → **QR de saída** (token de 25s) → exit |
| `/acesso` | Tela da porta (celular): **só a entrada** por CPF (check/register/enter, autoenvio quando o CPF fica completo); a opção de saída **só aparece depois que a pessoa entrou**; chegar com `?token=` (vindo do QR do totem) **confirma a saída automaticamente** |
| `/admin` | Painel protegido por token: Produtos (CRUD), Vendas (Pix automático; confirmar pagamento como fallback), Visitas (fechar), Clientes (bloquear), Auditoria |

## 📁 Estrutura

```
src/
├── lib/
│   ├── api.ts          # client fetch tipado (base URL, x-admin-token, ApiError)
│   ├── types.ts        # tipos espelhando as respostas da API
│   ├── cpf.ts          # validação/máscara de CPF (mesma regra da API)
│   └── format.ts       # BRL (priceInCents/100), datas, countdown
├── components/
│   ├── ui/             # shadcn/ui (gerado)
│   ├── cpf-input.tsx   # input com máscara 000.000.000-00
│   └── status-badge.tsx# badges de status (PENDING/PAID/EXPIRED/OPEN/…)
├── features/
│   ├── home/           # página inicial
│   ├── totem/          # fluxo do kiosk (máquina de estados)
│   ├── access/         # tela de entrada/saída por CPF
│   └── admin/          # layout + 5 páginas do painel
└── index.css           # tema shadcn (variáveis, apenas tema claro)
```

## 🧰 Scripts

```bash
bun run dev        # servidor de desenvolvimento
bun run build      # typecheck + build de produção
bun run typecheck  # só verificação de tipos
bun run lint       # oxlint
bun run preview    # serve o build (dist/)
```

## 🚀 Deploy

O front é um SPA (Vite). Em produção ele só precisa apontar para a API:

```bash
echo 'VITE_API_URL=https://<sua-api>.workers.dev' > .env.production
bun run build
bunx wrangler pages deploy dist --project-name gridmart
```

- `public/_redirects` (`/* /index.html 200`) garante que `/totem`, `/acesso` e `/admin` abram ao recarregar a página.
- Nenhum token fica no bundle: o `/admin` pede o token e guarda no `localStorage`.
- Passo a passo completo do Pix em produção (conta Mercado Pago, webhook, secrets, checklist): [`gridmart-api/docs/PIX-PRODUCAO.md`](../gridmart-api/docs/PIX-PRODUCAO.md).

## 📝 Notas

- **Fluxo de saída**: depois que o pagamento Pix é confirmado, o totem mostra um **QR** (`/acesso?token=…`). O cliente escaneia com a câmera do celular, a tela de acesso abre e **confirma a saída sozinha**. Sem câmera, dá para copiar o código e digitar na tela de acesso.
- Para testar o QR **pelo celular**, rode o front na rede local: `bun run dev --host` e aponte o QR para o IP da máquina (ex.: `http://192.168.x.x:5173`) em vez de `localhost`.
- **Sem re-entrada**: depois que a pessoa entrou, a tela não oferece "nova entrada" (a API também bloqueia visita aberta com 409). **Sem saída antes de entrar**: o bloco de saída só existe com a visita aberta.
- A API expõe **IDs numéricos** nas rotas (o README do `gridmart-api` fala em UUID, mas o código usa `Number(:id)` — seguir o código).
- Preços vêm em **centavos** (`priceInCents`) e são formatados com `Intl` em pt-BR.
- O estado de "cliente dentro" (visita) é gerido pela API; totem e tela de acesso não compartilham estado (são aparelhos diferentes na loja real).
- **Pix**: o totem chama `POST /sales/:id/pix` e mostra o QR Code, o copia-e-cola e o link do Mercado Pago. O status é confirmado automaticamente (polling em `GET /sales/:id`, que consulta o provedor; o webhook é o reforço). Se o servidor responder **503 (Pix não configurado)**, o totem cai no modo manual e o admin confirma pela tela de Vendas.
- ESP32 (botoeira) e auth real (JWT) ficaram fora do escopo desta primeira versão.
