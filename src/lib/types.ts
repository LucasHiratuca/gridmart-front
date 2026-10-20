/** Shapes das respostas da API (gridmart-api). */

export interface Product {
  id: number;
  barcode: string;
  name: string;
  priceInCents: number;
}

export interface SaleItem {
  productId: number;
  name: string;
  priceInCents: number;
  quantity: number;
}

export type SaleStatus = "PENDING" | "PAID";

export interface Sale {
  id: number;
  visitId: number;
  totalInCents: number;
  status: SaleStatus;
  items: SaleItem[];
}

export interface SaleSummary {
  id: number;
  visitId: number;
  userCpf: string;
  userName: string;
  totalInCents: number;
  status: SaleStatus;
  createdAt: string;
}

export interface VisitSummary {
  id: number;
  userId: number;
  userCpf: string;
  userName: string;
  status: "OPEN" | "CLOSED";
  enteredAt: string;
  exitedAt: string | null;
}

export interface AccessCheck {
  registered: boolean;
  allowed: boolean;
  name?: string;
}

export interface AccessEnter {
  visitId: number;
  name: string;
}

export interface ExitToken {
  token: string;
  expiresAt: string;
}
