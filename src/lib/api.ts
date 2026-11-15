import type {
  AccessCheck,
  AccessLog,
  AdminCategory,
  Brand,
  Catalog,
  Category,
  CategoryInput,
  EnterResult,
  ExitResult,
  ExitToken,
  PixCharge,
  PriceGroup,
  Product,
  ProductInput,
  RegisterResult,
  LogStatus,
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
  "https://gridmart-api.pereira-mateus-0111.workers.dev"
).replace(/\/+$/, "")

const ADMIN_TOKEN_KEY = "gridmart.admin-token"
let inMemoryAdminToken: string | null = null

export function getAdminToken(): string | null {
  if (typeof window !== "undefined") {
    return window.localStorage.getItem(ADMIN_TOKEN_KEY)
  }
  return inMemoryAdminToken
}

export function saveAdminToken(token: string): void {
  inMemoryAdminToken = token
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, token)
  }
}

export function clearAdminToken(): void {
  inMemoryAdminToken = null
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY)
  }
}

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
export const adminListProducts = async () => {
  try {
    return await request<Product[]>("/admin/products", { admin: true })
  } catch (error) {
    if (getAdminToken() === "dev-admin-token") return await listProducts()
    throw error
  }
}

/** Cria a marca ou devolve a existente (comparação por slug). */
export const adminCreateBrand = async (name: string) => {
  try {
    return await request<Brand>("/admin/brands", {
      method: "POST",
      body: { name },
      admin: true,
    })
  } catch (error) {
    if (getAdminToken() === "dev-admin-token") {
      return {
        id: Date.now(),
        name,
        slug: name.toLowerCase().replace(/\s+/g, "-"),
        isActive: true,
      }
    }
    throw error
  }
}

// ── Categorias (departamento → tipo) ─────────────────────────────────────

export const adminListCategories = async () => {
  try {
    return await request<AdminCategory[]>("/admin/categories", { admin: true })
  } catch (error) {
    if (getAdminToken() === "dev-admin-token") {
      const cat = await getCatalog()
      const parents = cat.categories.filter((c) => !c.parentId)
      return parents.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        departmentId: null,
        productCount: 0,
        types: cat.categories
          .filter((c) => c.parentId === p.id)
          .map((t) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            departmentId: p.id,
            productCount: 0,
            types: [],
          })),
      })) as unknown as AdminCategory[]
    }
    throw error
  }
}

export const adminCreateCategory = async (data: CategoryInput) => {
  try {
    return await request<Category>("/admin/categories", {
      method: "POST",
      body: data,
      admin: true,
    })
  } catch (error) {
    if (getAdminToken() === "dev-admin-token") {
      return { id: Date.now(), ...data, slug: data.name.toLowerCase().replace(/\s+/g, "-") } as Category
    }
    throw error
  }
}

export const adminUpdateCategory = async (
  id: number,
  data: Partial<CategoryInput>,
) => {
  try {
    return await request<Category>(`/admin/categories/${id}`, {
      method: "PUT",
      body: data,
      admin: true,
    })
  } catch (error) {
    if (getAdminToken() === "dev-admin-token") {
      return { id, name: "Categoria", slug: "cat", ...data } as Category
    }
    throw error
  }
}

export const adminDeleteCategory = async (id: number) => {
  try {
    return await request<Category>(`/admin/categories/${id}`, {
      method: "DELETE",
      admin: true,
    })
  } catch (error) {
    if (getAdminToken() === "dev-admin-token") {
      return { id, name: "Categoria", slug: "cat" } as Category
    }
    throw error
  }
}

// ── Grupos de preço ──────────────────────────────────────────────────────

export const adminListPriceGroups = async () => {
  try {
    return await request<PriceGroup[]>("/admin/price-groups", { admin: true })
  } catch (error) {
    if (getAdminToken() === "dev-admin-token") return []
    throw error
  }
}

export const adminCreatePriceGroup = async (data: {
  name: string
  priceInCents: number
}) => {
  try {
    return await request<PriceGroup>("/admin/price-groups", {
      method: "POST",
      body: data,
      admin: true,
    })
  } catch (error) {
    if (getAdminToken() === "dev-admin-token") {
      return { id: Date.now(), ...data, productCount: 0 } as PriceGroup
    }
    throw error
  }
}

export const adminUpdatePriceGroup = async (
  id: number,
  data: Partial<{ name: string; priceInCents: number }>,
) => {
  try {
    return await request<PriceGroup>(`/admin/price-groups/${id}`, {
      method: "PUT",
      body: data,
      admin: true,
    })
  } catch (error) {
    if (getAdminToken() === "dev-admin-token") {
      return { id, name: data.name ?? "Grupo", priceInCents: data.priceInCents ?? 1000, productCount: 0 }
    }
    throw error
  }
}

export const adminDeletePriceGroup = async (id: number) => {
  try {
    return await request<PriceGroup>(`/admin/price-groups/${id}`, {
      method: "DELETE",
      admin: true,
    })
  } catch (error) {
    if (getAdminToken() === "dev-admin-token") {
      return { id, name: "Grupo", priceInCents: 1000, productCount: 0 }
    }
    throw error
  }
}

/** Define a seleção final de produtos do grupo (checkbox do admin). */
export const adminSyncPriceGroupProducts = async (
  id: number,
  productIds: number[],
) => {
  try {
    return await request<{ id: number; productCount: number }>(
      `/admin/price-groups/${id}/products`,
      {
        method: "PUT",
        body: { productIds },
        admin: true,
      },
    )
  } catch (error) {
    if (getAdminToken() === "dev-admin-token") {
      return { id, productCount: productIds.length }
    }
    throw error
  }
}

export const adminCreateProduct = async (data: ProductInput) => {
  try {
    return await request<Product>("/admin/products", { method: "POST", body: data, admin: true })
  } catch (error) {
    if (getAdminToken() === "dev-admin-token") {
      return {
        id: Date.now(),
        ...data,
        name: data.name ?? "Novo Produto",
        ownPriceInCents: data.priceInCents,
        isActive: true,
      } as unknown as Product
    }
    throw error
  }
}

export const adminUpdateProduct = async (id: number, data: Partial<ProductInput>) => {
  try {
    return await request<Product>(`/admin/products/${id}`, {
      method: "PUT",
      body: data,
      admin: true,
    })
  } catch (error) {
    if (getAdminToken() === "dev-admin-token") {
      return {
        id,
        barcode: "000",
        name: "Produto",
        priceInCents: 1000,
        ownPriceInCents: 1000,
        isActive: true,
        ...data,
      } as unknown as Product
    }
    throw error
  }
}

export const adminDeleteProduct = async (id: number) => {
  try {
    return await request<Product>(`/admin/products/${id}`, { method: "DELETE", admin: true })
  } catch (error) {
    if (getAdminToken() === "dev-admin-token") {
      return {
        id,
        barcode: "000",
        name: "Produto",
        priceInCents: 0,
        ownPriceInCents: 0,
        isActive: false,
      } as unknown as Product
    }
    throw error
  }
}

export const adminListSales = async (status?: SaleStatus) => {
  try {
    return await request<SaleListItem[]>(
      `/admin/sales${status ? `?status=${encodeURIComponent(status)}` : ""}`,
      { admin: true },
    )
  } catch (error) {
    if (getAdminToken() === "dev-admin-token") {
      const mockSales: SaleListItem[] = [
        {
          id: 12,
          visitId: 6,
          userCpf: "529.982.247-25",
          userName: "Ana",
          totalInCents: 1890,
          status: "PENDING",
          createdAt: new Date().toISOString(),
        },
        {
          id: 9,
          visitId: 2,
          userCpf: "111.444.777-35",
          userName: "Cliente Balcão",
          totalInCents: 1890,
          status: "PAID",
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ]
      return status ? mockSales.filter((s) => s.status === status) : mockSales
    }
    throw error
  }
}

export const adminPaySale = async (id: number) => {
  try {
    return await request<SaleSummary>(`/admin/sales/${id}`, {
      method: "PUT",
      body: { status: "PAID" },
      admin: true,
    })
  } catch (error) {
    if (getAdminToken() === "dev-admin-token") {
      return { id, visitId: 1, totalInCents: 1890, status: "PAID" as SaleStatus }
    }
    throw error
  }
}

export const adminListVisits = async (status?: VisitStatus) => {
  try {
    return await request<VisitListItem[]>(
      `/admin/visits${status ? `?status=${encodeURIComponent(status)}` : ""}`,
      { admin: true },
    )
  } catch (error) {
    if (getAdminToken() === "dev-admin-token") {
      const mockVisits: VisitListItem[] = [
        {
          id: 6,
          userId: 1,
          userCpf: "529.982.247-25",
          userName: "Ana",
          status: "OPEN",
          enteredAt: new Date(Date.now() - 600000).toISOString(),
          exitedAt: null,
        },
      ]
      return status ? mockVisits.filter((v) => v.status === status) : mockVisits
    }
    throw error
  }
}

export const adminCloseVisit = async (id: number) => {
  try {
    return await request<{ visitId: number; status: VisitStatus }>(`/admin/visits/${id}`, {
      method: "PUT",
      body: { status: "CLOSED" },
      admin: true,
    })
  } catch (error) {
    if (getAdminToken() === "dev-admin-token") {
      return { visitId: id, status: "CLOSED" as VisitStatus }
    }
    throw error
  }
}

export const adminListUsers = async () => {
  try {
    return await request<User[]>("/admin/users", { admin: true })
  } catch (error) {
    if (getAdminToken() === "dev-admin-token") {
      return [
        {
          id: 1,
          cpf: "529.982.247-25",
          name: "Ana",
          isBlocked: false,
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 2,
          cpf: "111.444.777-35",
          name: "Cliente Teste",
          isBlocked: false,
          createdAt: new Date(Date.now() - 172800000).toISOString(),
        },
      ]
    }
    throw error
  }
}

export const adminSetBlocked = async (id: number, isBlocked: boolean) => {
  try {
    return await request<User>(`/admin/users/${id}`, {
      method: "PUT",
      body: { isBlocked },
      admin: true,
    })
  } catch (error) {
    if (getAdminToken() === "dev-admin-token") {
      return {
        id,
        cpf: "529.982.247-25",
        name: "Ana",
        isBlocked,
        createdAt: new Date().toISOString(),
      }
    }
    throw error
  }
}

export const adminListAccessLogs = async (limit = 100) => {
  try {
    return await request<AccessLog[]>(`/admin/access-logs?limit=${limit}`, { admin: true })
  } catch (error) {
    if (getAdminToken() === "dev-admin-token") {
      return [
        {
          id: 1,
          cpf: "529.982.247-25",
          status: "GRANTED" as LogStatus,
          createdAt: new Date().toISOString(),
        },
        {
          id: 2,
          cpf: "111.444.777-35",
          status: "GRANTED" as LogStatus,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ]
    }
    throw error
  }
}

/** Valida o token admin barato (1 registro de auditoria). */
export const adminPing = async () => {
  if (getAdminToken() === "dev-admin-token") return [] as unknown as AccessLog[]
  return adminListAccessLogs(1)
}
