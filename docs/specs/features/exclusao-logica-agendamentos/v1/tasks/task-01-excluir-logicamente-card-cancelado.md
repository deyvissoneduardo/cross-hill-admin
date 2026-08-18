# TASKCARD - Execução Rápida (com Guardrails LLM)

## 1. Identificação
- **ID**: TC-001
- **Nome da Task**: Excluir logicamente card de agendamento cancelado
- **model**: sonnet
- **risk**: low
- **gates**: [qa, tech_review]  # tipo=default full-stack com persistência e UI
- **Variante**: web
- **mode**: standard
- **source**: recommended
- **source_note**: N/A
- **Responsável**: executor definido pelo `agent-spec-taskcard-run`
- **Data**: 2026-08-18
- **Status**: A Fazer
- **Dependências**: N/A
- **Símbolos públicos criados**: N/A — card única
- **Símbolos consumidos de outras tasks**: N/A — card única
- **Relacionados**: `docs/specs/features/exclusao-logica-agendamentos/v1/pre-refinement.md`

---

## 2. Contexto
O painel passou a manter cards cancelados visíveis como histórico operacional. O administrador precisa retirar itens sem utilidade da visão cotidiana sem apagar o registro, preservando a distinção entre cancelar um agendamento e excluí-lo logicamente.

---

## 3. Objetivo da Task
Entregar a exclusão lógica de agendamentos já cancelados, com confirmação na interface, persistência do instante da exclusão e remoção dos registros excluídos da listagem administrativa.

---

## 4. Escopo
### 4.1 Inclui
- [ ] Exibir “Excluir” somente em cards com status `cancelado`.
- [ ] Confirmar a ação em diálogo que esclareça que o histórico será preservado e o card sairá do painel.
- [ ] Persistir `excluidoEm` como timestamp ISO-8601 UTC, sem apagar o documento.
- [ ] Recusar exclusão de agendamento inexistente, não cancelado ou já excluído.
- [ ] Não retornar registros com `excluidoEm` na listagem, inclusive no cálculo do limite de 200 itens.
- [ ] Revalidar `/admin` após sucesso e exibir feedback de conclusão.

### 4.2 Fora do escopo
- [ ] Exclusão física de documentos.
- [ ] Exclusão lógica de cards ativos ou confirmados.
- [ ] Lixeira, filtro de excluídos, restauração ou descarte definitivo.
- [ ] Alterações no cancelamento, na disponibilidade de horários ou no Google Calendar.

---

## 5. Arquivos Envolvidos

### 5.0 Visão em Árvore

```
app/
└── admin/
    └── page.tsx                                                   [M]
docs/
└── specs/
    └── features/
        └── exclusao-logica-agendamentos/
            └── v1/
                └── pre-refinement.md                              [R]
src/
├── features/
│   ├── admin/
│   │   ├── actions.ts                                            [M]
│   │   ├── actions.test.ts                                       [N]
│   │   └── components/
│   │       └── ConfirmationDialog.tsx                            [R]
│   └── agendamentos/
│       ├── components/
│       │   ├── AppointmentCard.tsx                               [M]
│       │   ├── AppointmentCardActions.test.tsx                   [M]
│       │   ├── AppointmentList.tsx                               [M]
│       │   └── AppointmentList.test.tsx                          [M]
│       ├── repositories/
│       │   └── appointmentRepository.ts                          [M]
│       ├── services/
│       │   └── bookingService.ts                                 [M]
│       └── types.ts                                              [M]
├── firebase/
│   └── firestorePaths.ts                                         [R]
└── shared/
    ├── constants/
    │   └── texts.ts                                              [M]
    └── errors.ts                                                  [R]
tests/
└── integration/
    └── bookingService.test.ts                                    [M]
```

Legenda: `[N]` Novo &nbsp; `[M]` Modificado &nbsp; `[R]` Referência

---

### 5.1 Arquivos Existentes (leitura/referência)
- `docs/specs/features/exclusao-logica-agendamentos/v1/pre-refinement.md` — decisões de produto aprovadas e limites da primeira versão.
- `src/features/admin/components/ConfirmationDialog.tsx` — diálogo acessível e recuperável que deve ser reutilizado.
- `src/firebase/firestorePaths.ts` — caminho canônico do documento de agendamento.
- `src/shared/errors.ts` — códigos `not_found`, `conflict` e tradução padrão de erros.

### 5.2 Arquivos a Criar
- `src/features/admin/actions.test.ts` — validar o contrato de revalidação da nova Server Action em sucesso e falha, usando o harness de sessão administrativa existente.

### 5.3 Arquivos a Modificar
- `src/features/agendamentos/types.ts` — adicionar `excluidoEm` ao modelo e ao DTO, preservando serialização.
- `src/features/agendamentos/repositories/appointmentRepository.ts` — ler/gravar `excluidoEm`, excluir logicamente em transação e filtrar excluídos antes da ordenação/limite.
- `src/features/agendamentos/services/bookingService.ts` — validar o ID e expor a operação de exclusão lógica sem sincronização externa.
- `src/features/admin/actions.ts` — adicionar Server Action protegida por `adminAction()` e revalidar `/admin` somente no sucesso.
- `app/admin/page.tsx` — passar a nova Server Action até a lista.
- `src/features/agendamentos/components/AppointmentList.tsx` — receber e encaminhar a ação de exclusão e manter o feedback no container.
- `src/features/agendamentos/components/AppointmentCard.tsx` — mostrar a ação somente no card cancelado, abrir confirmação, tratar loading/erro/sucesso.
- `src/shared/constants/texts.ts` — centralizar rótulos, consequência, sucesso e erros da exclusão lógica.
- `src/features/agendamentos/components/AppointmentCardActions.test.tsx` — cobrir visibilidade, confirmação, sucesso e falha da ação.
- `src/features/agendamentos/components/AppointmentList.test.tsx` — adaptar props/fixtures e comprovar que a ação chega ao card elegível.
- `tests/integration/bookingService.test.ts` — validar persistência real, filtragem e recusas sem efeitos colaterais.

**Blast radius**: toda construção de `Appointment`/`AppointmentDTO` no projeto deve receber `excluidoEm: null` ou usar um builder atualizado. A validação deve incluir `rg "canceladoEm:" src tests` e o typecheck para localizar fixtures e consumidores mecanicamente afetados.

---

## 6. Descrição de Execução (COMO fazer)
- Acrescentar `excluidoEm: string | null` a `Appointment` e `AppointmentDTO`; documentos legados sem o campo devem ser interpretados como `null`.
- Inicializar novas solicitações com `excluidoEm: null`, incluir o campo no formato interno persistido e propagá-lo por `toAppointmentDTO`.
- Criar no repository uma operação transacional sobre um documento: falhar com `not_found` se ausente; falhar com `conflict` se não estiver cancelado ou se `excluidoEm` já existir; caso contrário, gravar apenas `excluidoEm` com `now.toISOString()` e devolver o DTO atualizado.
- Não liberar ou ocupar slot e não chamar sincronização do Google Calendar durante a exclusão lógica; o cancelamento anterior já tratou esses efeitos.
- Na listagem, converter e remover documentos cujo `excluidoEm` não seja `null` antes de aplicar ordenação e `MAX_AGENDAMENTOS_ATIVOS`, para que itens ocultos não consumam vagas do limite.
- Expor a operação pelo `bookingService` e por uma Server Action protegida, mantendo os padrões de validação, `ActionResult`, erro em pt-BR e revalidação pós-sucesso.
- Encaminhar a action `page.tsx` → `AppointmentList` → `AppointmentCard` com uma assinatura dedicada que retorne `ActionResult<AppointmentDTO>`.
- No card, exibir “Excluir” apenas quando `status === "cancelado"`; reutilizar `ConfirmationDialog` com ação destrutiva, consequência explícita e bloqueio durante pending.
- No sucesso, fechar o diálogo, disparar o feedback do container e depender da revalidação para remover o card. Na falha, manter o diálogo aberto com ação de nova tentativa.
- Atualizar comentários diretamente afetados que ainda afirmem que cancelados ou cards após ação sempre saem da lista; não reescrever specs históricas da feature original.

### 6.1 Exemplo de Payload

N/A — sem payload parcial; a ação recebe somente o identificador do agendamento.

---

## 7. Guardrails de Execução (LLM) - DEVE / NÃO DEVE
> Quebrar qualquer item aqui invalida a task.

### 7.1 DEVE
- Reutilizar `adminAction()`, `ConfirmationDialog`, `ActionResult`, `AppError` e os validadores existentes.
- Manter compatibilidade com documentos dos dois schemas já aceitos pelo repository e com documentos legados sem `excluidoEm`.
- Verificar elegibilidade e gravar `excluidoEm` na mesma transação.
- Filtrar registros excluídos antes do limite da listagem.
- Usar timestamp UTC injetável nos níveis de repository/service para testes determinísticos.
- Preservar os fluxos atuais de confirmar, editar, cancelar, liberar horário e abrir WhatsApp.
- Alterar somente os arquivos listados na seção 5.3 e fixtures mecanicamente afetadas pelo novo campo obrigatório.

### 7.2 NÃO DEVE
- Não deletar o documento do Firestore.
- Não permitir exclusão lógica de agendamento ativo, confirmado ou já excluído.
- Não alterar slots de disponibilidade nem sincronizar exclusão lógica com Google Calendar.
- Não adicionar lixeira, restauração, novo filtro ou paginação.
- Não criar dependência nova ou abstração genérica para uma única operação.
- Não usar estado local para esconder o card antes da confirmação do backend.
- Não enfraquecer testes existentes para acomodar a mudança.

---

## 8. Passos Sugeridos (checklist executável)
- [ ] Propagar `excluidoEm` pelo modelo, DTO, conversores, criação e fixtures.
- [ ] Implementar a transação de exclusão lógica e a filtragem anterior ao limite.
- [ ] Expor a operação no service e na Server Action com erros específicos.
- [ ] Encaminhar a action pela página, lista e card.
- [ ] Reutilizar o diálogo de confirmação e implementar estados de pending, erro e sucesso.
- [ ] Atualizar textos centralizados e comentários diretamente afetados.
- [ ] Implementar os testes definidos na seção 10 e executar typecheck, lint, unitários e integração.

---

## 9. Aceite Técnico (critérios objetivos)
A task estará concluída quando:
- [ ] **AC-01**: somente cards cancelados exibem o botão “Excluir”.
- [ ] **AC-02**: o primeiro clique apenas abre um diálogo que informa preservação do histórico e retirada do painel; a mutação só ocorre após confirmação.
- [ ] **AC-03**: confirmar grava `excluidoEm` em ISO-8601 UTC no documento e não o apaga.
- [ ] **AC-04**: a listagem não devolve documentos com `excluidoEm`, e aplica `MAX_AGENDAMENTOS_ATIVOS` somente aos documentos ainda visíveis.
- [ ] **AC-05**: agendamento inexistente retorna `not_found`; ativo, confirmado ou já excluído retorna `conflict`, sem alterar documento ou disponibilidade.
- [ ] **AC-06**: exclusão lógica não modifica slots e não dispara sincronização com Google Calendar.
- [ ] **AC-07**: após sucesso, `/admin` é revalidado, o card desaparece e o usuário recebe feedback; após falha, o diálogo permanece aberto com nova tentativa.
- [ ] **AC-08**: documentos legados sem `excluidoEm` continuam válidos e visíveis.
- [ ] **AC-09**: lint, typecheck, testes unitários/componentes e integração passam sem regressão nos fluxos existentes.

---

## 10. Testes

> Gerado pelo agente `agent-spec-qa-test-generator` em 2026-08-18.

### 10.1 Testes Existentes a Modificar
- `src/features/agendamentos/components/AppointmentCardActions.test.tsx` — visibilidade, confirmação e falha recuperável da exclusão.
- `src/features/agendamentos/components/AppointmentList.test.tsx` — propagação do sucesso e remoção após atualização das props.
- `tests/integration/bookingService.test.ts` — persistência, recusas, ausência de efeitos em slots, filtro anterior ao limite e compatibilidade legada.

### 10.2 Testes a Criar
- `src/features/admin/actions.test.ts` — revalidação de `/admin` somente após sucesso.
  - **Setup (caminho legítimo)**: imitar o harness de sessão de `src/features/admin/auth.test.ts`, montando cookies e Firebase Auth pelos mocks de fronteira existentes; importar a action após o setup, sem criar flag ou export de produção para teste.

### 10.2.1 Detalhamento dos Casos de Teste

#### CT-001 — Exibe excluir somente no card cancelado

- **Tipo**: Componente | **Categoria**: caminho feliz
- **Arquivo**: `src/features/agendamentos/components/AppointmentCardActions.test.tsx` (modificar)
- **Invariant**: um card cancelado exibe exatamente uma ação “Excluir” e não oferece confirmação ou cancelamento.
- **Owning layer**: `unit` | **Real execution boundary**: `none`
- **Pré-condições**: construir o DTO por `toAppointmentDTO`, com status `cancelado` e `canceladoEm` ISO-8601.
- **Dados de entrada**: `id=agd-cancelado`, `canceladoEm=2026-08-13T18:00:00.000Z`.
- **Passos**: renderizar o card com ações espiãs; localizar o `article`; consultar ações por nome acessível.
- **Resultado esperado**: existe um botão “Excluir” habilitado; não existem botões “Confirmar” ou “Cancelar”.
- **Negative companion**: → CT-002: status aguardando ou confirmado — nenhum botão “Excluir”.
- **Critérios validados**: AC-01.
- **Obs**: usar queries semânticas; não usar snapshot, classe CSS ou estado interno.

#### CT-002 — Omite excluir de cards não cancelados

- **Tipo**: Componente | **Categoria**: teste negativo
- **Arquivo**: `src/features/agendamentos/components/AppointmentCardActions.test.tsx` (modificar)
- **Invariant**: agendamentos aguardando ou confirmados nunca oferecem exclusão lógica pela interface.
- **Owning layer**: `unit` | **Real execution boundary**: `none`
- **Pré-condições**: construir DTOs por `toAppointmentDTO` e parametrizar os dois estados inelegíveis.
- **Dados de entrada**: `status=[aguardando_agendamento, confirmado]`.
- **Passos**: renderizar um card por status; consultar o botão “Excluir” por papel e nome.
- **Resultado esperado**: `queryByRole` retorna `null` em ambos e a action permanece com zero chamadas.
- **Negative companion**: este é o caso negativo (`ct_id: self`).
- **Critérios validados**: AC-01.

#### CT-003 — Confirma antes de solicitar a exclusão

- **Tipo**: Componente | **Categoria**: interação do usuário
- **Arquivo**: `src/features/agendamentos/components/AppointmentCardActions.test.tsx` (modificar)
- **Invariant**: o primeiro clique apenas apresenta a consequência; a mutação recebe o ID somente após confirmação explícita.
- **Owning layer**: `unit` | **Real execution boundary**: `none`
- **Pré-condições**: card cancelado com action espiã e textos centralizados.
- **Dados de entrada**: `id=agd-cancelado`.
- **Passos**: clicar em “Excluir”; validar diálogo e consequência; comprovar zero chamadas; confirmar; aguardar a action.
- **Resultado esperado**: antes da confirmação há zero chamadas; depois, exatamente uma chamada com `agd-cancelado`.
- **Negative companion**: → CT-004: retorno `unavailable` — diálogo permanece aberto com “Serviço indisponível. Tente novamente.”.
- **Critérios validados**: AC-02.

#### CT-004 — Mantém diálogo recuperável quando a exclusão falha

- **Tipo**: Componente | **Categoria**: tratamento de erro
- **Arquivo**: `src/features/agendamentos/components/AppointmentCardActions.test.tsx` (modificar)
- **Invariant**: uma falha não fecha o diálogo nem oculta o card e permite repetir a confirmação.
- **Owning layer**: `unit` | **Real execution boundary**: `none`
- **Pré-condições**: action retorna `ok=false`, `code=unavailable` nas duas tentativas.
- **Dados de entrada**: mensagem `Serviço indisponível. Tente novamente.`.
- **Passos**: abrir e confirmar; aguardar falha; validar diálogo, erro e card; confirmar novamente.
- **Resultado esperado**: diálogo e card permanecem; a mensagem exata aparece; a segunda confirmação totaliza duas chamadas com o mesmo ID.
- **Negative companion**: este é o caso negativo (`ct_id: self`).
- **Critérios validados**: AC-07.

#### CT-005 — Propaga sucesso e remove o card após atualização das props

- **Tipo**: Componente | **Categoria**: interação do usuário
- **Arquivo**: `src/features/agendamentos/components/AppointmentList.test.tsx` (modificar)
- **Invariant**: após a exclusão confirmada, a lista anuncia conclusão e deixa de renderizar o card quando recebe dados revalidados sem o registro.
- **Owning layer**: `unit` | **Real execution boundary**: `none`
- **Pré-condições**: lista com um DTO cancelado e action bem-sucedida; usar `rerender` como resultado da revalidação.
- **Dados de entrada**: lista antes `[agd-cancelado]`; lista depois `[]`.
- **Passos**: confirmar exclusão; aguardar feedback; rerenderizar lista vazia; consultar o `article`.
- **Resultado esperado**: a mensagem centralizada de conclusão aparece e o `article` do cliente não existe após o rerender.
- **Negative companion**: → CT-004: retorno `unavailable` — card e diálogo permanecem.
- **Critérios validados**: AC-07.

#### CT-006 — Revalida o painel somente quando a Server Action conclui

- **Tipo**: Unitário | **Categoria**: tratamento de erro
- **Arquivo**: `src/features/admin/actions.test.ts` (criar)
- **Invariant**: a Server Action revalida exatamente `/admin` após sucesso e nenhuma rota após falha.
- **Owning layer**: `unit` | **Real execution boundary**: `none`
- **Pré-condições**: sessão administrativa montada pelo harness existente; mocks apenas em `bookingService` e `next/cache`.
- **Dados de entrada**: `id=agd-cancelado`; falha `AppError(unavailable)`.
- **Passos**: executar cenário de sucesso e verificar revalidação; em teste independente, executar falha e verificar resultado/ausência de revalidação.
- **Resultado esperado**: sucesso chama `revalidatePath("/admin")` exatamente uma vez e retorna `ok=true`; falha chama zero vezes e retorna `ok=false`, `code=unavailable`.
- **Negative companion**: este caso contém o ramo negativo de falha (`ct_id: self`).
- **Precondição privilegiada**: imitar `src/features/admin/auth.test.ts`; importar a action após montar cookies e Firebase Auth, sem superfície test-only.
- **Critérios validados**: AC-07.

#### CT-007 — Persiste exclusão lógica sem apagar documento nem alterar slots

- **Tipo**: Integração | **Categoria**: caminho feliz
- **Arquivo**: `tests/integration/bookingService.test.ts` (modificar)
- **Invariant**: excluir um cancelado grava `excluidoEm` em UTC no documento existente, preserva os demais dados e a grade de disponibilidade.
- **Owning layer**: `service-integration` | **Real execution boundary**: `db`
- **Pré-condições**: Firestore Emulator com cancelado, dois slots e snapshot anterior da grade.
- **Dados de entrada**: `id=ag-excluir-001`, `canceladoEm=2026-08-13T18:00:00.000Z`, relógio fixo.
- **Passos**: executar o service; reler documento e slots; consultar a listagem.
- **Resultado esperado**: documento ainda existe; `excluidoEm` é o instante injetado; status/cancelamento não mudam; slots são idênticos; ID não aparece na lista.
- **Negative companion**: → CT-008: ID/estado inelegível — `not_found` ou `conflict`, sem mutação.
- **Critérios validados**: AC-03, AC-06 e AC-09.

#### CT-008 — Recusa exclusões inelegíveis sem efeitos colaterais

- **Tipo**: Integração | **Categoria**: teste negativo
- **Arquivo**: `tests/integration/bookingService.test.ts` (modificar)
- **Invariant**: uma exclusão inelegível retorna o código específico sem modificar agendamento ou slot.
- **Owning layer**: `service-integration` | **Real execution boundary**: `db`
- **Pré-condições**: teste parametrizado isolado com snapshots anteriores de documento e slots.
- **Dados de entrada**: ID inexistente; status aguardando; status confirmado; cancelado com `excluidoEm` preenchido.
- **Passos**: executar cada cenário; capturar `AppError`; reler documento e slots no Emulator.
- **Resultado esperado**: inexistente retorna `not_found`; os três estados inelegíveis retornam `conflict`; documentos e slots permanecem exatamente iguais aos snapshots anteriores.
- **Negative companion**: este é o caso negativo (`ct_id: self`).
- **Critérios validados**: AC-05, AC-06 e AC-09.

#### CT-009 — Filtra excluídos antes do limite e mantém legado visível

- **Tipo**: Integração | **Categoria**: integridade de dados
- **Arquivo**: `tests/integration/bookingService.test.ts` (modificar)
- **Invariant**: excluídos não ocupam posições do teto e documentos legados sem `excluidoEm` continuam visíveis.
- **Owning layer**: `service-integration` | **Real execution boundary**: `db`
- **Pré-condições**: `MAX_AGENDAMENTOS_ATIVOS` documentos visíveis, um legado sem o campo e um excluído cronologicamente anterior.
- **Dados de entrada**: legado `ag-legado`; excluído `ag-excluido`.
- **Passos**: gravar documentos em lote; listar; coletar IDs e tamanho.
- **Resultado esperado**: exatamente `MAX_AGENDAMENTOS_ATIVOS` itens; contém `ag-legado` com `excluidoEm=null`; não contém `ag-excluido`.
- **Negative companion**: este caso contém o documento excluído como ramo negativo (`ct_id: self`).
- **Critérios validados**: AC-04, AC-08 e AC-09.

### 10.3 Cenários Obrigatórios
- [ ] CT-001 — ação somente no cancelado.
- [ ] CT-002 — ausência da ação em estados inelegíveis.
- [ ] CT-003 — confirmação anterior à mutação.
- [ ] CT-004 — erro recuperável sem ocultação local.
- [ ] CT-005 — feedback e remoção após novos dados.
- [ ] CT-006 — revalidação somente no sucesso.
- [ ] CT-007 — persistência real sem apagar ou alterar slots.
- [ ] CT-008 — recusas sem efeitos colaterais.
- [ ] CT-009 — filtro antes do limite e compatibilidade legada.

### 10.4 Padrões de Teste
- **Framework**: Vitest 4 + Testing Library; Firebase Emulator Suite para integração; Playwright disponível para E2E.
- **Convenção de nomes**: `describe`/`it` em pt-BR, CT identificável no título e uma invariante por teste.
- **Fixture/Setup**: builders com `toAppointmentDTO`; `beforeEach` e helpers de seed/leitura no Emulator; relógio explícito.
- **Mocks**: apenas fronteiras; queries por role/label; sem snapshot, seletor CSS, timeout fixo ou assertion auto-setada por mock.

### 10.5 Cenários de Erro

| Cenário | Trigger | Expected | Código/Status |
|---------|---------|----------|---------------|
| Falha recuperável da action | service retorna indisponibilidade | diálogo/card permanecem e nova tentativa é oferecida | `unavailable` |
| Agendamento ausente | ID não existe | nenhum documento/slot é alterado | `not_found` |
| Estado inelegível | aguardando, confirmado ou já excluído | documento e slots permanecem iguais | `conflict` |

### 10.6 Rastreabilidade: Aceite Técnico → Testes

| # | Critério de Aceite | Teste(s) Correspondente(s) | Tipo |
|---|--------------------|----------------------------|------|
| AC-01 | Botão somente em cancelados | CT-001, CT-002 | Componente |
| AC-02 | Confirmação anterior à mutação | CT-003 | Componente |
| AC-03 | Persistência sem apagar | CT-007 | Integração |
| AC-04 | Filtro anterior ao limite | CT-009 | Integração |
| AC-05 | Recusas sem mutação | CT-008 | Integração |
| AC-06 | Slots e integração externa preservados | CT-007, CT-008 | Integração |
| AC-07 | Revalidação, feedback e erro recuperável | CT-004, CT-005, CT-006 | Componente/Unitário |
| AC-08 | Documento legado visível | CT-009 | Integração |
| AC-09 | Suítes sem regressão | CT-007, CT-008, CT-009 + comandos do projeto | Integração/estático |

---

## 11. Notas / Observações
- A exclusão lógica é independente do status canônico: ela só pode acontecer após o cancelamento e não cria um novo status de agendamento.
- O nome persistido definido para a primeira versão é `excluidoEm`; sua ausência significa “não excluído”.
- O pré-refinamento registra que lixeira e restauração foram adiadas.
- As specs históricas de `painel-admin-agendamentos/v1` permanecem como registro da decisão original; comentários atuais incorretos no código devem ser alinhados.

### ADRs Aplicáveis nesta Feature

Nenhuma — `docs/adr/INDEX.md` não existe ou não contém ADRs aceitas.
