// Tipos espelhando as respostas da API (gridmart-api).

/** Unidades de conteúdo aceitas pela API. */
export const PRODUCT_UNITS = ["un", "ml", "l", "g", "kg"] as const
export type ProductUnit = (typeof PRODUCT_UNITS)[number]

/** Departamento (parentId null) ou tipo de produto (folha). */
export type Category = {
  id: number
  parentId: number | null
  name: string
  slug: string
  sortOrder: number
}

/** Linha da listagem admin: categoria + contagem de produtos vinculados. */
export type AdminCategory = Category & {
  productCount: number
}

export type CategoryInput = {
  name: string
  /** null/ausente = departamento (raiz); id = tipo dentro do departamento. */
  parentId?: number | null
  sortOrder?: number
}

export type Brand = {
  id: number
  name: string
  slug: string
  isActive: boolean
}

export type Packaging = {
  id: number
  name: string
  slug: string
  sortOrder: number
}

/** Grupo de preço: produtos vinculados compartilham o mesmo valor. */
export type PriceGroup = {
  id: number
  name: string
  priceInCents: number
  updatedAt: string
  /** Quantos produtos estão vinculados (só na listagem admin). */
  productCount?: number
}

export type CatalogUnit = {
  value: ProductUnit
  label: string
}

/** Catálogo de apoio do cadastro (GET /catalog). */
export type Catalog = {
  categories: Category[]
  leaves: Category[]
  brands: Brand[]
  packagings: Packaging[]
  units: CatalogUnit[]
}

export type Product = {
  id: number
  barcode: string
  name: string
  /** Preço efetivo (do grupo de preço, quando houver). */
  priceInCents: number
  /** Preço próprio do produto (fallback quando não está em grupo). */
  ownPriceInCents: number
  priceGroupId: number | null
  priceGroupName: string | null
  priceGroupPriceInCents: number | null
  categoryId: number | null
  brandId: number | null
  packagingId: number | null
  /** Sabor/linha: "Original", "Zero", "Ao Leite". */
  variant: string | null
  /** Conteúdo em texto, com vírgula: "350", "1,5". */
  netContent: string | null
  unit: ProductUnit | null
  /** 6 -> "Pack 6x" no começo do nome. */
  packQty: number | null
  isActive: boolean
  /** Nomes resolvidos pelos joins (só leitura). */
  categoryName: string | null
  brandName: string | null
  packagingName: string | null
}

/**
 * Campos aceitos no cadastro. Quando `categoryId` + `brandId` vêm preenchidos,
 * a API gera o `name` no padrão; senão usa `name` como fallback normalizado.
 */
export type ProductInput = {
  barcode: string
  name?: string | null
  priceInCents: number
  /** Ao vincular a um grupo, o preço efetivo passa a ser o do grupo. */
  priceGroupId?: number | null
  categoryId?: number | null
  brandId?: number | null
  packagingId?: number | null
  variant?: string | null
  netContent?: string | null
  unit?: ProductUnit | null
  packQty?: number | null
  isActive?: boolean
}

export type SaleStatus = "PENDING" | "PAID" | "EXPIRED"
export type VisitStatus = "OPEN" | "CLOSED"
export type LogStatus = "GRANTED" | "DENIED"

export type SaleItem = {
  productId: number
  name: string
  priceInCents: number
  quantity: number
}

/** Detalhe da venda (GET /sales/:id e POST /sales). */
export type SaleDetail = {
  id: number
  visitId: number
  totalInCents: number
  status: SaleStatus
  items: SaleItem[]
}

/** Cobrança Pix da venda (POST /sales/:id/pix). */
export type PixCharge = {
  saleId: number
  totalInCents: number
  status: SaleStatus
  /** Id da order no Mercado Pago. */
  orderId: string | null
  /** Status cru do provedor (`action_required`, `processed`, …). */
  pixStatus: string | null
  /** Pix copia e cola. */
  qrCode: string | null
  /** Imagem do QR em base64, sem o prefixo `data:`. */
  qrCodeBase64: string | null
  /** Link para abrir o pagamento no app do banco. */
  ticketUrl: string | null
  expiresAt: string | null
}

/** Resumo de venda (confirmação de pagamento). */
export type SaleSummary = {
  id: number
  visitId: number
  totalInCents: number
  status: SaleStatus
}

/** Linha da listagem admin (GET /admin/sales). */
export type SaleListItem = {
  id: number
  visitId: number
  userCpf: string
  userName: string
  totalInCents: number
  status: SaleStatus
  createdAt: string
}

export type VisitListItem = {
  id: number
  userId: number
  userCpf: string
  userName: string
  status: VisitStatus
  enteredAt: string
  exitedAt: string | null
}

export type User = {
  id: number
  cpf: string
  name: string
  isBlocked: boolean
  createdAt: string
}

export type AccessLog = {
  id: number
  cpf: string
  status: LogStatus
  createdAt: string
}

export type AccessCheck = {
  registered: boolean
  allowed: boolean
  name?: string
}

export type RegisterResult = {
  registered: boolean
  allowed: boolean
  name: string
  userId: number
}

export type EnterResult = {
  visitId: number
  name: string
}

export type ExitToken = {
  token: string
  expiresAt: string
}

export type ExitResult = {
  visitId: number
}
