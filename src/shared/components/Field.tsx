import type { ComponentProps, ReactNode } from "react";

/**
 * Campo de formulário base (label + controle + mensagem).
 *
 * Acessibilidade (`design.md` §9 e tech_spec §13.2): label sempre explícito e
 * associado por `htmlFor`/`id`; mensagem de erro referenciada por
 * `aria-describedby` e sinalizada por `aria-invalid`, para não depender de cor.
 *
 * `id` é obrigatório em vez de gerado internamente: o componente precisa
 * funcionar em Server Components, onde hooks (`useId`) não são permitidos.
 */

type FieldProps = Omit<ComponentProps<"input">, "className" | "id"> & {
  id: string;
  label: ReactNode;
  /** Mensagem de erro do campo; quando presente marca o controle inválido. */
  error?: string;
  /** Texto auxiliar exibido abaixo do controle quando não há erro. */
  hint?: string;
};

export function Field({ id, label, error, hint, ...inputProps }: FieldProps) {
  const errorId = `${id}-erro`;
  const hintId = `${id}-ajuda`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-(--color-foreground)">
        {label}
      </label>

      <input
        {...inputProps}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={
          "min-h-11 rounded-lg border bg-(--color-surface-2) px-3 text-sm text-(--color-foreground) " +
          "placeholder:text-(--color-muted) " +
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus-ring) " +
          (error ? "border-(--color-danger)" : "border-(--color-border)")
        }
      />

      {error ? (
        <p id={errorId} className="text-sm text-(--color-danger)">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-(--color-muted)">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
