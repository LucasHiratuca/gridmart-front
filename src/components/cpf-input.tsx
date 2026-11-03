import { Input } from "@/components/ui/input"
import { maskCPF } from "@/lib/cpf"

type CpfInputProps = {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  name?: string
  id?: string
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  className?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

/** Input de CPF com máscara 000.000.000-00 (valor sempre mascarado). */
export function CpfInput({
  value,
  onChange,
  onBlur,
  name,
  id,
  placeholder = "000.000.000-00",
  disabled,
  autoFocus,
  className,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: CpfInputProps) {
  return (
    <Input
      id={id}
      name={name}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      className={className}
      inputMode="numeric"
      autoComplete="off"
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      onBlur={onBlur}
      onChange={(event) => onChange(maskCPF(event.target.value))}
    />
  )
}
