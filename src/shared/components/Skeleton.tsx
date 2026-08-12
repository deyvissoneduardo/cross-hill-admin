/**
 * Placeholder de carregamento.
 *
 * `design.md` §5 pede skeletons com dimensões estáveis (evita CLS), por isso
 * altura/largura são explícitas pelo chamador. A animação é suprimida sob
 * `prefers-reduced-motion` (§9) e o bloco é escondido de leitores de tela —
 * quem anuncia o carregamento é a região com `aria-busy`/`role="status"`.
 */

type SkeletonProps = {
  /** Classe utilitária de dimensão, ex.: `"h-4 w-32"`. */
  className?: string;
  /** Rótulo acessível: use apenas quando o skeleton for a única pista de carga. */
  label?: string;
};

export function Skeleton({ className = "h-4 w-full", label }: SkeletonProps) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`block animate-pulse rounded-md bg-(--color-surface-3) motion-reduce:animate-none ${className}`}
    />
  );
}
