import { dominioTexts } from "@/src/shared/constants/texts";

/**
 * Erros tipados da aplicação e contrato de retorno das Server Actions.
 *
 * Regra: nada que atravessa a fronteira servidor → cliente carrega detalhe
 * interno (stack, mensagem de SDK, e-mail, telefone). Server Actions devolvem
 * sempre um `ActionResult` serializável com mensagem pt-BR já pronta para a UI.
 */

/** Códigos estáveis de erro de domínio — a UI decide o tratamento por código. */
export type AppErrorCode =
  | "unauthorized"
  | "not_found"
  | "validation"
  | "conflict"
  | "unavailable"
  | "unexpected";

/** Erros de campo de formulário: `nome do campo` → mensagem pt-BR. */
export type FieldErrors = Record<string, string>;

/**
 * Erro de domínio previsível. `message` é sempre exibível ao usuário (pt-BR);
 * detalhes técnicos ficam em `cause` e nunca são serializados para o cliente.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly fieldErrors?: FieldErrors;

  constructor(
    code: AppErrorCode,
    message: string,
    options?: { fieldErrors?: FieldErrors; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = options?.fieldErrors;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Erro de validação de um campo específico.
 *
 * A mesma mensagem vai para `message` (banner/toast) e para `fieldErrors[field]`
 * (erro inline no campo): quem valida não precisa saber qual das duas a UI usa.
 */
export function fieldError(field: string, message: string): AppError {
  return new AppError("validation", message, { fieldErrors: { [field]: message } });
}

/**
 * Executa a operação de domínio aplicando a política de erro da camada de
 * service, registrando a falha uma única vez.
 *
 * `AppError` é resultado previsível (conflito, não encontrado, validação) e sobe
 * intacta — a mensagem já está em pt-BR para a UI. Qualquer outra falha é de
 * infraestrutura (Firestore, rede): o motivo real fica no log do servidor e o
 * chamador recebe `unavailable`, sem stack nem mensagem de SDK (tech_spec §9).
 *
 * Vive em `shared` porque a política é uma só para todas as features — quando ela
 * mudar (formato do log, código do erro), muda em um lugar. `escopo` é o prefixo
 * de log da feature (`agendamentos`, `agenda`) e `acao` identifica a operação.
 */
export async function withDomainErrors<T>(
  escopo: string,
  acao: string,
  operacao: () => Promise<T>,
): Promise<T> {
  try {
    return await operacao();
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }

    console.error(`[${escopo}] falha inesperada`, {
      acao,
      tipo: error instanceof Error ? error.name : typeof error,
    });

    throw new AppError("unavailable", dominioTexts.servicoIndisponivel, {
      cause: error,
    });
  }
}

/** Resultado serializável de uma Server Action. */
export type ActionResult<TData = undefined> =
  | { ok: true; message?: string; data?: TData }
  | { ok: false; code: AppErrorCode; message: string; fieldErrors?: FieldErrors };

export function actionOk<TData = undefined>(
  data?: TData,
  message?: string,
): ActionResult<TData> {
  return { ok: true, data, message };
}

export function actionFail<TData = undefined>(
  code: AppErrorCode,
  message: string,
  fieldErrors?: FieldErrors,
): ActionResult<TData> {
  return { ok: false, code, message, fieldErrors };
}

/**
 * Converte qualquer erro em `ActionResult` serializável.
 *
 * `AppError` é considerado previsível e sua mensagem vai para a UI. Erro
 * inesperado é registrado server-side (sem dados sensíveis do usuário) e
 * substituído por `fallbackMessage`, para não vazar detalhe de infraestrutura.
 */
export function toActionResult<TData = undefined>(
  error: unknown,
  fallbackMessage: string,
  context?: string,
): ActionResult<TData> {
  if (isAppError(error)) {
    return actionFail<TData>(error.code, error.message, error.fieldErrors);
  }

  console.error("[erro-inesperado]", {
    context: context ?? "desconhecido",
    tipo: error instanceof Error ? error.name : typeof error,
  });

  return actionFail<TData>("unexpected", fallbackMessage);
}
