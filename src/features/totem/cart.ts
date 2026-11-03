import type { Product } from "@/lib/types"

export type CartItem = {
  product: Product
  quantity: number
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0)
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce(
    (total, item) => total + item.product.priceInCents * item.quantity,
    0,
  )
}

export function addToCart(items: CartItem[], product: Product): CartItem[] {
  const existing = items.find((item) => item.product.id === product.id)
  if (!existing) return [...items, { product, quantity: 1 }]
  return items.map((item) =>
    item.product.id === product.id
      ? { ...item, quantity: item.quantity + 1 }
      : item,
  )
}

export function setQuantity(
  items: CartItem[],
  productId: number,
  quantity: number,
): CartItem[] {
  if (quantity <= 0) return items.filter((item) => item.product.id !== productId)
  return items.map((item) =>
    item.product.id === productId ? { ...item, quantity } : item,
  )
}
