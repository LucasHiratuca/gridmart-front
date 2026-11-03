import type {
  AccessCheck,
  AccessLog,
  Brand,
  Catalog,
  EnterResult,
  ExitResult,
  ExitToken,
  PixCharge,
  Product,
  ProductInput,
  RegisterResult,
  SaleDetail,
  SaleListItem,
  SaleStatus,
  SaleSummary,
  User,
  VisitListItem,
  VisitStatus,
} from "./types"

/** URL base da API (em dev: `bun run dev` na pasta gridmart-api → :8787). */
export const API_BASE_URL = (
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:8787"
).replace(/\/+$/, "")

const ADMIN_TOKEN_KEY = "gridmart.admin-token"

export function getAdminToken(): string | null {
  return window.localStorage.getItem(ADMIN_TOKEN_KEY)
}

export function saveAdminToken(token: string): void {
  window.localStorage.setItem(ADMIN_TOKEN_KEY, token)
}

export function clearAdminToken(): void {
  window.localStorage.removeItem(ADMIN_TOKEN_KEY)
}

/** Erro da API: status HTTP + mensagem ({ error: string }). */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  body?: unknown
  /** Envia o header `x-admin-token`. */
  admin?: boolean
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, admin = false } = options

  const headers: Record<string, string> = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (admin) {
    const token = getAdminToken()
    if (token) headers["x-admin-token"] = token
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(
      0,
      "Não foi possível conectar à API. Verifique se ela está rodando.",
    )
  }

  if (!response.ok) {
    let message = `Erro ${response.status}`
    try {
      const data: unknown = await response.json()
      if (
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof data.error === "string"
      ) {
        message = data.error
      }
    } catch {
      // resposta sem corpo JSON — mantém a mensagem padrão
    }
    throw new ApiError(response.status, message)
  }

  return (await response.json()) as T
}

// ── Catálogo público (totem) ──────────────────────────────────────────────

export const listProducts = () => request<Product[]>("/products")

export const getProductByBarcode = (barcode: string) =>
  request<Product>(`/products/barcode/${encodeURIComponent(barcode)}`)

/** Catálogo de apoio do cadastro: categorias, marcas, embalagens, unidades. */
export const getCatalog = () => request<Catalog>("/catalog")

// ── Acesso ────────────────────────────────────────────────────────────────

export const checkAccess = (cpf: string) =>
  request<AccessCheck>("/access/check", { method: "POST", body: { cpf } })

export const registerAccess = (cpf: string, name: string) =>
  request<RegisterResult>("/access/register", {
    method: "POST",
    body: { cpf, name },
  })

export const enterStore = (cpf: string) =>
  request<EnterResult>("/access/enter", { method: "POST", body: { cpf } })

export const createExitToken = (saleId: number) =>
  request<ExitToken>("/access/exit-token", {
    method: "POST",
    body: { saleId },
  })

export const exitStore = (token: string) =>
  request<ExitResult>("/access/exit", { method: "POST", body: { token } })

// ── Vendas ────────────────────────────────────────────────────────────────

export const createSale = (
  cpf: string,
  items: { productId: number; quantity: number }[],
) => request<SaleDetail>("/sales", { method: "POST", body: { cpf, items } })

export const getSale = (id: number) => request<SaleDetail>(`/sales/${id}`)

/** Cria (ou reusa) a cobrança Pix da venda. 503 = Pix não configurado. */
export const createSalePixCharge = (id: number) =>
  request<PixCharge>(`/sales/${id}/pix`, { method: "POST" })

// ── Admin (requer x-admin-token) ──────────────────────────────────────────

/** Lista completa (inclui produtos inativos); o público só vê os ativos. */
export const adminListProducts = () =>
  request<Product[]>("/admin/products", { admin: true })

/** Cria a marca ou devolve a existente (comparação por slug). */
export const adminCreateBrand = (name: string) =>
  request<Brand>("/admin/brands", {
    method: "POST",
    body: { name },
    admin: true,
  })

export const adminCreateProduct = (data: ProductInput) =>
  request<Product>("/admin/products", { method: "POST", body: data, admin: true })

export const adminUpdateProduct = (id: number, data: Partial<ProductInput>) =>
  request<Product>(`/admin/products/${id}`, {
    method: "PUT",
    body: data,
    admin: true,
  })

export const adminDeleteProduct = (id: number) =>
  request<Product>(`/admin/products/${id}`, { method: "DELETE", admin: true })

export const adminListSales = (status?: SaleStatus) =>
  request<SaleListItem[]>(
    `/admin/sales${status ? `?status=${encodeURIComponent(status)}` : ""}`,
    { admin: true },
  )

export const adminPaySale = (id: number) =>
  request<SaleSummary>(`/admin/sales/${id}`, {
    method: "PUT",
    body: { status: "PAID" },
    admin: true,
  })

export const adminListVisits = (status?: VisitStatus) =>
  request<VisitListItem[]>(
    `/admin/visits${status ? `?status=${encodeURIComponent(status)}` : ""}`,
    { admin: true },
  )

export const adminCloseVisit = (id: number) =>
  request<{ visitId: number; status: VisitStatus }>(`/admin/visits/${id}`, {
    method: "PUT",
    body: { status: "CLOSED" },
    admin: true,
  })

export const adminListUsers = () =>
  request<User[]>("/admin/users", { admin: true })

export const adminSetBlocked = (id: number, isBlocked: boolean) =>
  request<User>(`/admin/users/${id}`, {
    method: "PUT",
    body: { isBlocked },
    admin: true,
  })

export const adminListAccessLogs = (limit = 100) =>
  request<AccessLog[]>(`/admin/access-logs?limit=${limit}`, { admin: true })

/** Valida o token admin barato (1 registro de auditoria). */
export const adminPing = () => adminListAccessLogs(1)
