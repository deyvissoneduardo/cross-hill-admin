# SCOPE — Cleanup de Débitos Técnicos · painel-admin-agendamentos · v2-debits

> **Variante**: web (herdada de v1)
> **Versão**: v2-debits
> **Padrão**: 1 task por débito, `gates: [qa]` (cleanup é categoria `code_review_only`)

---

## 1. O que está incluído

Os 17 débitos abaixo serão resolvidos nesta versão. Cada um vira 1 task em `tasks/T{n}.md`.

- [x] **D-001 (naming, baixo)** — Constante `ADMIN_SESSION_COOKIE` redeclarada localmente no teste em vez de importada
  - **Arquivo**: `src/features/admin/auth.test.ts:23`
  - **Origem**: task `T1` de `v1`
  - **Correção**: Importar `ADMIN_SESSION_COOKIE` de `src/features/admin/sessionCookie.ts` no teste.
  - **Custo estimado**: ~2min
  - **Classificação LLM**: recomendado_corrigir — Custo trivial, risco nulo, valor real: elimina drift silencioso entre teste e produção.

- [x] **D-002 (tests, baixo)** — Pré-condição do CT-21 não prova presença de credencial real do Admin SDK antes do teste principal
  - **Arquivo**: `tests/e2e/admin-security.spec.ts`
  - **Origem**: task `T1` de `v1`
  - **Correção**: Promover a chamada de `assertServidorComFirebaseConfigurado` (já existe) para ficar mais visível/explícita no setup do CT-21.
  - **Custo estimado**: ~3min
  - **Classificação LLM**: recomendado_corrigir — Custo mínimo, risco nulo, valor incremental de robustez de CI.

- [x] **D-003 (tests, baixo)** — Script `test:a11y` usa `--pass-with-no-tests`, divergindo de `_run/test-cases.json:26`
  - **Arquivo**: `package.json`
  - **Origem**: task `T1` de `v1`
  - **Correção**: Remover `--pass-with-no-tests` de `test:a11y` (specs `@a11y` já existem desde T8).
  - **Custo estimado**: ~1min
  - **Classificação LLM**: recomendado_corrigir — Edição de uma linha, risco nulo, fecha um gate que hoje passaria falsamente.

- [x] **D-004 (security, baixo)** — Modo emulador dispensa verificação de assinatura sem checar `NODE_ENV`
  - **Arquivo**: `src/firebase/admin.ts:53,68`
  - **Origem**: task `T1` de `v1`
  - **Correção**: Recusar o modo emulador quando `NODE_ENV === "production"`, lançando erro ruidoso no boot.
  - **Custo estimado**: ~3min
  - **Classificação LLM**: recomendado_corrigir — Guarda de poucas linhas; valor de segurança alto para o custo.

- [x] **D-008 (security, baixo)** — Comentário promete não-divulgação que o timing de resposta não garante
  - **Arquivo**: `src/features/admin/auth.ts:196`
  - **Origem**: task `T1` de `v1`
  - **Correção**: Manter o curto-circuito (decisão correta); ajustar o comentário para delimitar a garantia ao corpo/redirect.
  - **Custo estimado**: ~2min
  - **Classificação LLM**: recomendado_corrigir — Edição de comentário, risco nulo.

- [x] **D-013 (project_pattern, baixo)** — Duas mensagens de `AppError` continuam literais no `throw` após centralização de `dominioTexts`
  - **Arquivo**: `src/features/agendamentos/repositories/appointmentRepository.ts:306,358`
  - **Origem**: task `T2` de `v1`
  - **Correção**: Trocar os dois `throw new AppError("unexpected", ...)` por `new Error` simples, já que o catch adjacente os converte.
  - **Custo estimado**: ~2min
  - **Classificação LLM**: recomendado_corrigir — Troca de duas linhas, risco nulo.

- [x] **D-014 (scope_deviation, baixo)** — Ignore dos logs do emulador Firestore não consta em §5.1/§5.2 do T2.md
  - **Arquivo**: `docs/specs/features/painel-admin-agendamentos/v1/tasks/T2.md` (§5.2)
  - **Origem**: task `T2` de `v1`
  - **Correção**: Adicionar a linha do `.gitignore` (emulador Firestore) à tabela §5.2 do T2.md.
  - **Custo estimado**: ~2min
  - **Classificação LLM**: recomendado_corrigir — Edição trivial de markdown, mantém consistência de auditoria.

- [x] **D-016 (code_quality, baixo)** — Moldura visual do card do esqueleto copiada literalmente do card real
  - **Arquivo**: `src/features/agendamentos/components/AppointmentListSkeleton.tsx:35-38`, `AppointmentCard.tsx:150-152`, `appointmentListLayout.ts`
  - **Origem**: task `T4` de `v1`
  - **Correção**: Extrair `APPOINTMENT_CARD_FRAME_CLASS` para `appointmentListLayout.ts` e consumir dos dois lados, mantendo `h-full`/transições locais ao card real.
  - **Custo estimado**: ~4min
  - **Classificação LLM**: recomendado_corrigir — Segue o mesmo molde já estabelecido para `APPOINTMENT_GRID_CLASS`; nenhum teste assere a classe literal.

- [x] **D-018 (documentation, baixo)** — §5.2 de T5.md declara `AdminShell.tsx` como arquivo a modificar mas nenhuma edição foi necessária
  - **Arquivo**: `docs/specs/features/painel-admin-agendamentos/v1/tasks/T5.md` (§5.2)
  - **Origem**: task `T5` de `v1`
  - **Correção**: Remover `AdminShell.tsx` da lista "a modificar" do T5.md ou mover para "referência".
  - **Custo estimado**: ~1min
  - **Classificação LLM**: recomendado_corrigir — Edição trivial de markdown, corrige desalinhamento real.

- [x] **D-019 (tests, baixo)** — Ramo de horário inválido/vazio em `adicionarHorario()` sem teste próprio
  - **Arquivo**: `src/features/agenda/components/ScheduleSlotGrid.test.tsx`
  - **Origem**: task `T5` de `v1`
  - **Correção**: Adicionar teste cobrindo `adicionarHorario()` com campo vazio, verificando `dominioTexts.horarioInvalido` visível e nenhum checkbox novo criado.
  - **Custo estimado**: ~5min
  - **Classificação LLM**: recomendado_corrigir — Padrão idêntico já existe no mesmo arquivo para horário repetido; mecânico com a infra de render já pronta.

- [x] **D-021 (code_quality, baixo)** — Typo no comentário: "puliaria" no lugar de "pularia"
  - **Arquivo**: `src/features/agendamentos/services/bookingService.ts:152`
  - **Origem**: task `T6` de `v1`
  - **Correção**: Corrigir a grafia.
  - **Custo estimado**: ~1min
  - **Classificação LLM**: recomendado_corrigir — Correção de uma palavra, risco nulo.

- [x] **D-022 (scope_deviation, baixo)** — `texts.ts` alterado sem constar em §5.1/§5.2 da task T7
  - **Arquivo**: `docs/specs/features/painel-admin-agendamentos/v1/tasks/T7.md` (§5.2)
  - **Origem**: task `T7` de `v1`
  - **Correção**: Declarar `src/shared/constants/texts.ts` em §5.2 do T7.md.
  - **Custo estimado**: ~2min
  - **Classificação LLM**: recomendado_corrigir — Edição trivial; mudança já é aditiva e coerente com a convenção do projeto.

- [x] **D-023 (scope_deviation, baixo)** — `auth.ts` corrigido (bug pré-existente) sem constar em §5.1/§5.2 da T8
  - **Arquivo**: `docs/specs/features/painel-admin-agendamentos/v1/tasks/T8.md` (§5.2)
  - **Origem**: task `T8` de `v1`
  - **Correção**: Declarar `src/features/admin/auth.ts` em §5.2 do T8.md.
  - **Custo estimado**: ~2min
  - **Classificação LLM**: recomendado_corrigir — Edição trivial; a correção de código já está restrita ao branch de emulador.

- [x] **D-024 (scope_deviation, baixo)** — `firebase.json` alterado sem constar em §5.1/§5.2 da T8
  - **Arquivo**: `docs/specs/features/painel-admin-agendamentos/v1/tasks/T8.md` (§5.2)
  - **Origem**: task `T8` de `v1`
  - **Correção**: Declarar `firebase.json` em §5.2 do T8.md.
  - **Custo estimado**: ~2min
  - **Classificação LLM**: recomendado_corrigir — Edição trivial; o bloco `emulators.auth` é pré-requisito real e já correto.

- [x] **D-025 (code_quality, baixo)** — `AdminSeedData` devolve `aparencia` e `posAgendamento` que nenhum spec consome
  - **Arquivo**: `tests/e2e/fixtures/adminSeed.ts:75-76,125-126`
  - **Origem**: task `T8` de `v1`
  - **Correção**: Remover os dois campos de `AdminSeedData` e do objeto retornado (as constantes de seed continuam privadas).
  - **Custo estimado**: ~3min
  - **Classificação LLM**: recomendado_corrigir — Nenhum spec lê os campos; os documentos correspondentes continuam sendo escritos independentemente do retorno.

- [x] **D-026 (testability, baixo)** — INVARIANT do CT-14 afirma "nem Server Action" mas o caso só prova ausência de rota
  - **Arquivo**: `tests/e2e/professional-surface.spec.ts:9`
  - **Origem**: task `T8` de `v1`
  - **Correção**: Alinhar ao padrão do CT-21 — acrescentar parágrafo "Limite conhecido desta camada" explicando a garantia por construção.
  - **Custo estimado**: ~4min
  - **Classificação LLM**: recomendado_corrigir — O padrão já existe literalmente no docstring do CT-21; replicar é edição de comentário seguindo modelo pronto.

- [x] **D-027 (security, baixo)** — Servidor Next emulado (porta 3101) sobe sem `--hostname`, escutando em `0.0.0.0`, com credencial de teste versionada em claro
  - **Arquivo**: `playwright.config.ts:182`
  - **Origem**: task `T8` de `v1`
  - **Correção**: Adicionar `--hostname localhost` ao comando do `webServer` emulado.
  - **Custo estimado**: ~1min
  - **Classificação LLM**: recomendado_corrigir — Troca de uma string; valor de segurança direto para ambiente local/CI single-machine.

---

## 2. O que está fora do escopo (débitos NÃO selecionados nesta rodada)

Os débitos abaixo foram coletados mas **não** entram nesta versão. Ficam registrados para auditoria — podem ser revisitados em `v3-debits/` futura.

- [ ] **D-005 (security, baixo)** — Bloqueio de despacho de Server Action responde `307` em vez de encerrar a requisição (`proxy.ts:55`)
  - **Classificação LLM**: perfumaria — `admin-security.spec.ts` asserta 307 em ≥4 pontos; trocar o status quebra essas asserções e muda comportamento de redirecionamento em produção. Custo >15min, risco médio.
  - **Motivo da exclusão**: não selecionado pelo usuário nesta rodada.

- [ ] **D-006 (code_quality, baixo)** — `isAuthorizedAdminEmail` exportada sem consumidor externo (`auth.ts:72`)
  - **Classificação LLM**: perfumaria — Correção honesta exige julgamento sobre módulo sensível, mais que um one-liner.
  - **Motivo da exclusão**: não selecionado pelo usuário nesta rodada.

- [ ] **D-007 (code_quality, baixo)** — Validação de env duplicada entre `client.ts` e `admin.ts` (`client.ts:48-71`)
  - **Classificação LLM**: perfumaria — Extrair `readRequiredEnv` compartilhado exige tocar 2 módulos e revalidar 2 superfícies (client bundle-safe vs server-only).
  - **Motivo da exclusão**: não selecionado pelo usuário nesta rodada.

- [ ] **D-009 (scope_deviation, baixo)** — Ignores de tooling do framework de agentes no diff da feature (`eslint.config.mjs:17`, `.gitignore:49`)
  - **Classificação LLM**: perfumaria — As entradas já estão mescladas no histórico; "corrigir" exigiria rewrite de commits já integrados, desproporcional.
  - **Motivo da exclusão**: não selecionado pelo usuário nesta rodada.

- [ ] **D-010 (tests, baixo)** — Helper `readSlotLink` duplica leitura já coberta por `readDaySlots` (`tests/integration/bookingService.test.ts:663`)
  - **Classificação LLM**: perfumaria — Unificar exige mover/exportar a segunda função e revalidar 3 suítes consumidoras do helper compartilhado.
  - **Motivo da exclusão**: não selecionado pelo usuário nesta rodada.

- [ ] **D-011 (tests, baixo)** — Asserção de ordenação cronológica pouco discriminante no teste de truncamento (`tests/integration/bookingService.test.ts:397`)
  - **Classificação LLM**: perfumaria — Redesenhar o seed sem comprometer a asserção primária exige cuidado, não é replace mecânico.
  - **Motivo da exclusão**: não selecionado pelo usuário nesta rodada.

- [ ] **D-012 (security, baixo)** — `requestAppointmentAtomically` (caminho público) sem rate-limit por IP/telefone (`bookingService.ts:120-127`)
  - **Classificação LLM**: perfumaria — Exige decisão de arquitetura (onde mora a barreira) e implementação nova, não edição pontual.
  - **Motivo da exclusão**: não selecionado pelo usuário nesta rodada.

- [ ] **D-015 (tests, baixo)** — Fixture e configuração de relógio duplicadas entre 2 suítes de componente
  - **Classificação LLM**: perfumaria — Extrair helper compartilhado cria módulo novo sem convenção prévia de fixture de componente no projeto.
  - **Motivo da exclusão**: não selecionado pelo usuário nesta rodada.

- [ ] **D-017 (best_practices, baixo)** — Modal `ConfirmationDialog` sem focus trap (`ConfirmationDialog.tsx:105`)
  - **Classificação LLM**: perfumaria — Não há nenhuma lógica de focus trap hoje; implementar corretamente e testar é lógica nova não-trivial.
  - **Motivo da exclusão**: não selecionado pelo usuário nesta rodada.

- [ ] **D-020 (architecture, baixo)** — `readProfessionalName` executa `set()` de semeadura alcançável pelo caminho público (`settingsRepository.ts`)
  - **Classificação LLM**: perfumaria — Mudar o contrato de leitura é decisão de arquitetura que toca comportamento de persistência acessível por caminho público.
  - **Motivo da exclusão**: não selecionado pelo usuário nesta rodada.

- [ ] **D-028 (project_pattern, baixo)** — Project id do emulador diverge entre suíte de integração e E2E (`playwright.config.ts:151`)
  - **Classificação LLM**: perfumaria — A própria descrição já admite "sem efeito em CI"; unificar toca 2 arquivos de config compartilhados por múltiplas suítes.
  - **Motivo da exclusão**: não selecionado pelo usuário nesta rodada.

---

## 3. Definições Técnicas

### 3.1 Arquivos Impactados (consolidado)

| Arquivo | Débitos que tocam | Ação esperada |
|---------|-------------------|---------------|
| `src/features/admin/auth.test.ts` | D-001 | Importar constante em vez de redeclarar |
| `tests/e2e/admin-security.spec.ts` | D-002 | Promover smoke check de credencial já existente |
| `package.json` | D-003 | Remover flag `--pass-with-no-tests` |
| `src/firebase/admin.ts` | D-004 | Adicionar guarda de `NODE_ENV` no modo emulador |
| `src/features/admin/auth.ts` | D-008 | Ajustar comentário sobre garantia de não-divulgação |
| `src/features/agendamentos/repositories/appointmentRepository.ts` | D-013 | Trocar `AppError` literal por `Error` simples |
| `docs/specs/features/painel-admin-agendamentos/v1/tasks/T2.md` | D-014 | Adicionar linha à tabela §5.2 |
| `src/features/agendamentos/components/AppointmentListSkeleton.tsx` + `AppointmentCard.tsx` + `appointmentListLayout.ts` | D-016 | Extrair constante de moldura compartilhada |
| `docs/specs/features/painel-admin-agendamentos/v1/tasks/T5.md` | D-018 | Remover linha da tabela §5.2 |
| `src/features/agenda/components/ScheduleSlotGrid.test.tsx` | D-019 | Adicionar teste de horário vazio |
| `src/features/agendamentos/services/bookingService.ts` | D-021 | Corrigir typo em comentário |
| `docs/specs/features/painel-admin-agendamentos/v1/tasks/T7.md` | D-022 | Adicionar linha à tabela §5.2 |
| `docs/specs/features/painel-admin-agendamentos/v1/tasks/T8.md` | D-023, D-024 | Adicionar 2 linhas à tabela §5.2 (tasks separadas) |
| `tests/e2e/fixtures/adminSeed.ts` | D-025 | Remover campos mortos de `AdminSeedData` |
| `tests/e2e/professional-surface.spec.ts` | D-026 | Acrescentar parágrafo "Limite conhecido desta camada" |
| `playwright.config.ts` | D-027 | Adicionar `--hostname localhost` |

### 3.2 Frontmatter padrão de cada task

```markdown
- model: sonnet
- risk: low
- gates: [qa]      # cleanup é categoria code_review_only — Tech Review traz pouco valor
- source: agent-spec-debt-resolution
```

Nenhum dos 17 débitos selecionados toca path que bate literalmente com as categorias de Critical Paths (`**/auth/**`, `**/security/**`, `**/crypto/**`, `**/secrets/**`, etc. — glob por diretório, não por nome de arquivo) — nenhuma task força `gates: [qa, tech_review]`.

### 3.3 Estratégia de testes

- A maioria das tasks **NÃO cria testes novos** — é refactor/rename/guarda pontual.
- **Exceções por natureza do débito**: D-002 e D-019 têm como `correcao_sugerida` original adicionar cobertura/smoke check faltante — essas 2 tasks adicionam exatamente a asserção descrita, sem tocar SUT nem expandir para cenários não pedidos.
- A suíte existente **DEVE continuar passando** sem alteração. O Gate 1 (QA) executa a suíte completa após cada task.
- Se algum teste regredir após cleanup, é sinal de que o débito carregava lógica relevante — **task rejeitada**, débito investigado individualmente.

### 3.4 Paralelização

Tasks de débito são **independentes por construção**, com uma exceção: **T13 (D-023) e T14 (D-024) editam o mesmo arquivo** (`docs/specs/features/painel-admin-agendamentos/v1/tasks/T8.md`) — paralelismo forçado para `Não` entre esse par. As demais 15 tasks são derivadas como paralelizáveis (arquivos disjuntos), sujeitas à re-verificação de guards pelo orquestrador `/agent-spec-minispec-run-tasks` (MAX_PARALLEL=4).

---

## 4. Critérios de Aceite

- [x] 17 tasks `Concluído` no `task_plan.md` desta versão.
- [x] Suíte de testes da feature inteira passa após cada task (Gate 1 valida).
- [x] Nenhum diff em arquivos fora dos listados em §3.1.
- [x] §2 do `_run/run-report.md` da `v1` marca os débitos em cleanup; `_run/workflow-report.md` registra a execução (via FASE 4.6 da skill `/agent-spec-debt-resolution`).

---

## 5. Observações

- **Origem**: gerada pela skill `/agent-spec-debt-resolution` em 2026-08-12.
- **Agente especialista usado**: `Default (orquestrador genérico)` — nenhum agente de stack registrado em `.claude/agents/` nesta sessão.
- **Decisão do usuário**: 17 de 28 débitos coletados foram aprovados para cleanup nesta rodada (atalho "Incluir TODOS os recomendados").
- **Não é candidato a ADR**: cleanup técnico não dispara ADR. Se durante execução algum débito revelar padrão arquitetural a registrar, sinalize ao usuário criar `/agent-spec-adr-create` separadamente — NÃO inclua nesta versão.
