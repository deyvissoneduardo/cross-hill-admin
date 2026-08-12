import { getFirestoreAdmin } from "@/src/firebase/admin";
import { firestorePaths } from "@/src/firebase/firestorePaths";

/**
 * Utilitários compartilhados pelas suítes de integração (Firestore Emulator).
 *
 * Não é arquivo de teste (`*.test.ts` é o único padrão coletado por
 * `vitest.integration.config.mts`), então nada aqui roda sozinho.
 *
 * Só entra aqui o que é **genérico e idêntico** entre suítes: limpeza de
 * collection, captura de rejeição e as duas leituras cruas usadas pelas duas
 * suítes para asserir estado persistido. Seeds continuam em cada arquivo — eles
 * carregam o estado de partida específico do que aquela suíte exercita, e
 * centralizá-los transformaria a fixture em configuração remota.
 */

/** Apaga todos os documentos da collection — chamado em `beforeEach`. */
export async function wipeCollection(collection: string): Promise<void> {
  const snapshot = await getFirestoreAdmin().collection(collection).get();
  await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
}

/** Captura a rejeição para asserir tipo E código, em vez de "lançou algo". */
export async function capture(operacao: () => Promise<unknown>): Promise<unknown> {
  try {
    await operacao();
  } catch (error) {
    return error;
  }

  throw new Error("A operação deveria ter falhado, mas concluiu com sucesso.");
}

/** Id do agendamento vinculado ao slot, direto do documento do dia. */
export async function readSlotLink(
  isoDate: string,
  horario: string,
): Promise<string | null> {
  const snapshot = await getFirestoreAdmin()
    .doc(firestorePaths.disponibilidadeDoDia(isoDate))
    .get();

  const slots = snapshot.get("slots") as
    | Record<string, { agendamentoId?: string | null }>
    | undefined;

  return slots?.[horario]?.agendamentoId ?? null;
}

/** Ids de todos os agendamentos persistidos, ordenados. */
export async function listAppointmentIds(): Promise<string[]> {
  const snapshot = await getFirestoreAdmin()
    .collection(firestorePaths.agendamentos())
    .get();

  return snapshot.docs.map((doc) => doc.id).sort();
}
