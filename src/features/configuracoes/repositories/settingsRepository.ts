import "server-only";

import {
  type AppearanceSettingsDTO,
  type PostBookingTextDTO,
} from "@/src/features/configuracoes/types";
import { validateClientColors } from "@/src/features/configuracoes/validators/colorValidator";
import { validatePostBookingText } from "@/src/features/configuracoes/validators/textSettingsValidator";
import { getFirestoreAdmin } from "@/src/firebase/admin";
import { firestorePaths } from "@/src/firebase/firestorePaths";

/**
 * Persistência das configurações — um documento por assunto na collection
 * `configuracoes` (`aparencia`, `pos-agendamento`, `profissional`).
 *
 * Três decisões moram aqui:
 *
 * 1. **Documento lido é entrada desconfiável.** Estes documentos são editáveis
 *    à mão no console do Firebase, e a área do cliente não pode herdar cores
 *    ilegíveis ou textos truncados só porque alguém digitou errado lá. Toda
 *    leitura reatravessa o MESMO validator da escrita; documento fora do
 *    contrato é registrado e tratado como ausente, e quem chama cai no padrão.
 * 2. **`configuracoes/profissional` é a fonte do profissional único da v1**
 *    (PRD RN-10/RN-11). A v1 não tem CRUD de profissional — nenhuma rota, action
 *    ou tela escreve esse documento —, então a primeira leitura o **semeia** com
 *    `PROFISSIONAL_UNICO_NOME` quando ele ainda não existe (read-through de
 *    configuração). Depois disso o documento é a fonte, e a variável de ambiente
 *    é só o valor inicial de implantação.
 * 3. **O nome da variável de ambiente vive em UM lugar** — este. `bookingService`
 *    (reserva pública) e `professionalSummary` (Agenda administrativa) leem por
 *    esta função e não conhecem mais a variável; renomeá-la é uma edição só.
 */

/** Semente do profissional único até o documento existir (PRD RN-10). */
const PROFISSIONAL_ENV = "PROFISSIONAL_UNICO_NOME";

export const settingsRepository = {
  /** Cores persistidas, ou `null` quando não configuradas/fora do contrato. */
  async readAppearance(): Promise<AppearanceSettingsDTO | null> {
    const snapshot = await getFirestoreAdmin()
      .doc(firestorePaths.configuracaoAparencia())
      .get();

    if (!snapshot.exists) {
      return null;
    }

    const dados = snapshot.data() ?? {};
    const resultado = validateClientColors({
      corPrimaria: dados.corPrimaria,
      corSecundaria: dados.corSecundaria,
      corDestaque: dados.corDestaque,
    });

    if (!resultado.valido) {
      // Só o motivo: as cores em si não são segredo, mas o log é evento, não
      // dump de documento (mesma política de `withDomainErrors`).
      console.warn("[configuracoes] aparência persistida ignorada", {
        motivo: resultado.motivo,
      });
      return null;
    }

    return resultado.cores;
  },

  /** Grava as cores já validadas. Substitui o documento inteiro. */
  async saveAppearance(
    cores: AppearanceSettingsDTO,
    now: Date,
  ): Promise<AppearanceSettingsDTO> {
    await getFirestoreAdmin()
      .doc(firestorePaths.configuracaoAparencia())
      .set({ ...cores, atualizadoEm: now.toISOString() });

    return cores;
  },

  /** Textos persistidos, ou `null` quando não configurados/fora do contrato. */
  async readPostBookingText(): Promise<PostBookingTextDTO | null> {
    const snapshot = await getFirestoreAdmin()
      .doc(firestorePaths.configuracaoPosAgendamento())
      .get();

    if (!snapshot.exists) {
      return null;
    }

    const dados = snapshot.data() ?? {};
    const resultado = validatePostBookingText({
      titulo: dados.titulo,
      descricao: dados.descricao,
      dicas: dados.dicas,
      avisos: dados.avisos,
    });

    if (!resultado.valido) {
      console.warn("[configuracoes] textos persistidos ignorados", {
        motivo: resultado.motivo,
      });
      return null;
    }

    return resultado.textos;
  },

  /** Grava os textos já validados. Substitui o documento inteiro. */
  async savePostBookingText(
    textos: PostBookingTextDTO,
    now: Date,
  ): Promise<PostBookingTextDTO> {
    await getFirestoreAdmin()
      .doc(firestorePaths.configuracaoPosAgendamento())
      .set({ ...textos, atualizadoEm: now.toISOString() });

    return textos;
  },

  /**
   * Nome do profissional único configurado, ou `null` quando não há nem
   * documento nem semente.
   *
   * Semeadura preguiçosa: sem documento (ou com `nome` vazio/fora do contrato) e
   * com `PROFISSIONAL_UNICO_NOME` definida, o valor da variável é gravado e
   * devolvido. A gravação é oportunista — se ela falhar, a leitura ainda entrega
   * o valor semeado, porque derrubar uma solicitação de cliente por causa de uma
   * escrita de conveniência seria trocar um problema pequeno por um grande.
   */
  async readProfessionalName(): Promise<string | null> {
    const db = getFirestoreAdmin();
    const ref = db.doc(firestorePaths.configuracaoProfissional());
    const snapshot = await ref.get();

    const persistido = readNome(snapshot.data());
    if (persistido !== null) {
      return persistido;
    }

    const semente = process.env[PROFISSIONAL_ENV]?.trim();
    if (!semente) {
      return null;
    }

    try {
      await ref.set({ nome: semente, atualizadoEm: new Date().toISOString() });
    } catch (error) {
      // Somente o NOME da variável e o tipo do erro: o valor é configuração do
      // estabelecimento, não vai para o log.
      console.error("[configuracoes] falha ao semear profissional", {
        variavel: PROFISSIONAL_ENV,
        tipo: error instanceof Error ? error.name : typeof error,
      });
    }

    return semente;
  },
} as const;

/** `nome` do documento do profissional, aparado; `null` se ausente/vazio. */
function readNome(dados: Record<string, unknown> | undefined): string | null {
  const nome = typeof dados?.nome === "string" ? dados.nome.trim() : "";

  if (nome.length === 0) {
    if (dados !== undefined && dados.nome !== undefined) {
      console.warn("[configuracoes] profissional persistido ignorado", {
        motivo: "nome_invalido",
      });
    }

    return null;
  }

  return nome;
}
