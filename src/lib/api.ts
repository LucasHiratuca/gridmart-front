import type {
  AccessCheck,
  AccessEnter,
  ExitToken,
  Product,
  Sale,
  SaleStatus,
  SaleSummary,
  VisitSummary,
} from "./types";

/**
 * Client mínimo da API. Em dev o Vite faz proxy de /api → localhost:8787
 * (ver vite.config.ts), então aqui basta usar caminhos relativos.
 */

const BASE = "/api";

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    // A API devolve { message } nas exceções do Hono
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(res.status, body?.message ?? `Erro ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  access: {
    check: (cpf: string) =>
      request<AccessCheck>("/access/check", { method: "POST", body: JSON.stringify({ cpf }) }),

    register: (cpf: string, name: string) =>
      request<{ registered: boolean; allowed: boolean; name: string; userId: number }>(
        "/access/register",
        { method: "POST", body: JSON.stringify({ cpf, name }) },
      ),

    enter: (cpf: string) =>
      request<AccessEnter>("/access/enter", { method: "POST", body: JSON.stringify({ cpf }) }),

    exit: (token: string) =>
      request<{ visitId: number }>("/access/exit", {
        method: "POST",
        body: JSON.stringify({ token }),
      }),
  },

  products: {
    list: () => request<Product[]>("/products"),
    byBarcode: (barcode: string) => request<Product>(`/products/barcode/${barcode}`),
  },

  sales: {
    create: (cpf: string, items: { productId: number; quantity: number }[]) =>
      request<Sale>("/sales", { method: "POST", body: JSON.stringify({ cpf, items }) }),

    byId: (id: number) => request<Sale>(`/sales/${id}`),
  },

  admin: {
    /** Todo endpoint de /admin exige o header x-admin-token. */
    withToken: (token: string) => {
      const headers = { "x-admin-token": token };

      return {
        sales: (status?: SaleStatus) =>
          request<SaleSummary[]>(`/admin/sales${status ? `?status=${status}` : ""}`, {
            headers,
          }),

        pay: (id: number) =>
          request<{ id: number; status: string }>(`/admin/sales/${id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify({ status: "PAID" }),
          }),

        visits: (status?: "OPEN" | "CLOSED") =>
          request<VisitSummary[]>(`/admin/visits${status ? `?status=${status}` : ""}`, {
            headers,
          }),
      };
    },
  },

  exitToken: (saleId: number) =>
    request<ExitToken>("/access/exit-token", {
      method: "POST",
      body: JSON.stringify({ saleId }),
    }),
};

export { ApiError };
