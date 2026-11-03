/** Remove tudo que não for dígito. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "")
}

/** Valida CPF (mesma regra da API — src/utils/cpf.ts). */
export function isValidCPF(cpf: string): boolean {
  const cleanCPF = onlyDigits(cpf)

  if (cleanCPF.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false

  let sum = 0
  let remainder: number

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false

  sum = 0
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false

  return true
}

/** Mascara um CPF digitado: 000.000.000-00 */
export function maskCPF(input: string): string {
  const digits = onlyDigits(input).slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}
