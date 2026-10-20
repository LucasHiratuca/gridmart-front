import { useCallback, useEffect, useRef } from "react";

/**
 * Leitor de código de barras no caixa.
 *
 * O leitor é um teclado muito rápido que digita os dígitos e manda Enter,
 * mas o campo também tem que aceitar quem digita à mão no tablet — então a
 * fonte da verdade é o `value` do próprio input (e não um buffer de teclas
 * paralelo: ele quebrava toda digitação lenta).
 *
 * O Enter é tratado aqui, então o componente só precisa do `ref` no Input.
 */
export function useBarcodeScanner(
  onScan: (barcode: string) => void,
  inputRef: React.RefObject<HTMLInputElement | null>,
) {
  const scan = useRef(onScan);
  scan.current = onScan;

  const submit = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;

    const barcode = input.value.trim();
    input.value = "";
    input.focus();

    // menos de 3 dígitos é digitação incompleta, não um produto (EAN = 8 ou 13)
    if (barcode.length >= 3) scan.current(barcode);
  }, [inputRef]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      submit();
    };

    input.addEventListener("keydown", onKeyDown);
    return () => input.removeEventListener("keydown", onKeyDown);
  }, [inputRef, submit]);

  /** Volta o foco pro campo: senão o leitor digita no vazio depois de um clique. */
  const refocus = useCallback(() => {
    if (document.activeElement !== inputRef.current) inputRef.current?.focus();
  }, [inputRef]);

  return { refocus };
}
