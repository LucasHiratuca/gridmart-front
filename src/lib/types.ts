// Tipos espelhando as respostas da API (gridmart-api).

export type Product = {
  id: number
  barcode: string
  name: string
  priceInCents: number
}

export type ProductInput = {
  barcode: string
  name: string
  priceInCents: number
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
