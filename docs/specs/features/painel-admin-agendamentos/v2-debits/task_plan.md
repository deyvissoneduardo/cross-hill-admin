# TASK PLAN — Cleanup de Débitos · painel-admin-agendamentos · v2-debits

## 1. Identificação

- **Feature**: painel-admin-agendamentos
- **Versão**: v2-debits
- **Versão pai**: v1
- **Variante**: web
- **Intent**: `docs/specs/features/painel-admin-agendamentos/v2-debits/intent.md`
- **Scope**: `docs/specs/features/painel-admin-agendamentos/v2-debits/scope.md`
- **Origem**: gerado por `/agent-spec-debt-resolution` em 2026-08-12
- **Agente especialista (classificação)**: `Default (orquestrador genérico)`
- **Status**: Concluído

---

## 2. Objetivo Técnico

Resolver 17 débitos técnicos atômicos via tasks `gates: [qa]` (cleanup é `code_review_only`). Cada task toca exatamente 1 débito; suíte existente é o oráculo de regressão.

---

## 3. Macro-Fases

- **Fase 1 — Cleanup**
  - Objetivo: aplicar correção pontual de cada débito.
  - Tasks: T1 .. T17 (flag de paralelismo derivado por task — Regra 10d; guards do orquestrador decidem se vão em lote ou sequencial).

> Por que 1 fase só: débitos são independentes. Não há ordem técnica obrigatória.

---

## 4. Lista de Tasks

| ID | Nome | Arquivo da task | Débito original | Custo (min) | model | risk | gates | Paralelo? | Status |
|----|------|-----------------|-----------------|-------------|-------|------|-------|-----------|--------|
| T1 | Resolver D-001: import de `ADMIN_SESSION_COOKIE` | [T1](tasks/T1.md) | D-001 (naming) | ~2 | sonnet | low | [qa] | Sim | Concluído |
| T2 | Resolver D-002: smoke check de credencial no CT-21 | [T2](tasks/T2.md) | D-002 (tests) | ~3 | sonnet | low | [qa] | Sim | Concluído |
| T3 | Resolver D-003: remover `--pass-with-no-tests` | [T3](tasks/T3.md) | D-003 (tests) | ~1 | sonnet | low | [qa] | Sim | Concluído |
| T4 | Resolver D-004: guarda de `NODE_ENV` no modo emulador | [T4](tasks/T4.md) | D-004 (security) | ~3 | sonnet | low | [qa] | Sim | Concluído |
| T5 | Resolver D-008: ajustar comentário de timing | [T5](tasks/T5.md) | D-008 (security) | ~2 | sonnet | low | [qa] | Sim | Concluído |
| T6 | Resolver D-013: `AppError` literal → `Error` simples | [T6](tasks/T6.md) | D-013 (project_pattern) | ~2 | sonnet | low | [qa] | Sim | Concluído |
| T7 | Resolver D-014: declarar `.gitignore` em T2.md §5.2 | [T7](tasks/T7.md) | D-014 (scope_deviation) | ~2 | sonnet | low | [qa] | Sim | Concluído |
| T8 | Resolver D-016: extrair moldura compartilhada do card | [T8](tasks/T8.md) | D-016 (code_quality) | ~4 | sonnet | low | [qa] | Sim | Concluído |
| T9 | Resolver D-018: remover `AdminShell.tsx` de T5.md §5.2 | [T9](tasks/T9.md) | D-018 (documentation) | ~1 | sonnet | low | [qa] | Sim | Concluído |
| T10 | Resolver D-019: teste de horário vazio | [T10](tasks/T10.md) | D-019 (tests) | ~5 | sonnet | low | [qa] | Sim | Concluído |
| T11 | Resolver D-021: corrigir typo "puliaria" | [T11](tasks/T11.md) | D-021 (code_quality) | ~1 | sonnet | low | [qa] | Sim | Concluído |
| T12 | Resolver D-022: declarar `texts.ts` em T7.md §5.2 | [T12](tasks/T12.md) | D-022 (scope_deviation) | ~2 | sonnet | low | [qa] | Sim | Concluído |
| T13 | Resolver D-023: declarar `auth.ts` em T8.md §5.2 | [T13](tasks/T13.md) | D-023 (scope_deviation) | ~2 | sonnet | low | [qa] | Não | Concluído |
| T14 | Resolver D-024: declarar `firebase.json` em T8.md §5.2 | [T14](tasks/T14.md) | D-024 (scope_deviation) | ~2 | sonnet | low | [qa] | Não | Concluído |
| T15 | Resolver D-025: remover campos mortos de `AdminSeedData` | [T15](tasks/T15.md) | D-025 (code_quality) | ~3 | sonnet | low | [qa] | Sim | Concluído |
| T16 | Resolver D-026: limite conhecido do CT-14 | [T16](tasks/T16.md) | D-026 (testability) | ~4 | sonnet | low | [qa] | Sim | Concluído |
| T17 | Resolver D-027: `--hostname localhost` no servidor emulado | [T17](tasks/T17.md) | D-027 (security) | ~1 | sonnet | low | [qa] | Sim | Concluído |

<!-- Paralelo? é DERIVADO (Regra 10d): T13/T14 marcadas Não por compartilharem o mesmo
     arquivo (v1/tasks/T8.md) — guard de paths disjuntos. As demais 15 são disjuntas entre si. -->

---

## 5. Ordem de Execução

```
Fase 1 (paralelo, respeitando guards do orquestrador):
  T1, T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T15, T16, T17 ─┐
                                                                     ┤ → orquestrador detecta
  T13 ─┐                                                            │   lote(s) paralelizável(is)
  T14 ─┘ → mesmo arquivo (v1/tasks/T8.md) → sequencial entre si    ┘   até MAX_PARALLEL=4
```

### Grafo de Dependências

Nenhuma dependência entre tasks (são independentes por construção).

| Task | Depende de | Pode Rodar em Paralelo? |
|------|------------|--------------------------|
| T1 | — | Sim |
| T2 | — | Sim |
| T3 | — | Sim |
| T4 | — | Sim |
| T5 | — | Sim |
| T6 | — | Sim |
| T7 | — | Sim |
| T8 | — | Sim |
| T9 | — | Sim |
| T10 | — | Sim |
| T11 | — | Sim |
| T12 | — | Sim |
| T13 | — | Não (compartilha arquivo com T14) |
| T14 | — | Não (compartilha arquivo com T13) |
| T15 | — | Sim |
| T16 | — | Sim |
| T17 | — | Sim |

---

## 6. Arquivos / Áreas Impactadas (consolidado)

| Arquivo | Tasks que tocam | Categorias |
|---------|-----------------|------------|
| `src/features/admin/auth.test.ts` | T1 | naming |
| `tests/e2e/admin-security.spec.ts` | T2 | tests |
| `package.json` | T3 | tests |
| `src/firebase/admin.ts` | T4 | security |
| `src/features/admin/auth.ts` | T5 | security |
| `src/features/agendamentos/repositories/appointmentRepository.ts` | T6 | project_pattern |
| `docs/specs/features/painel-admin-agendamentos/v1/tasks/T2.md` | T7 | scope_deviation |
| `src/features/agendamentos/components/AppointmentListSkeleton.tsx`, `AppointmentCard.tsx`, `appointmentListLayout.ts` | T8 | code_quality |
| `docs/specs/features/painel-admin-agendamentos/v1/tasks/T5.md` | T9 | documentation |
| `src/features/agenda/components/ScheduleSlotGrid.test.tsx` | T10 | tests |
| `src/features/agendamentos/services/bookingService.ts` | T11 | code_quality |
| `docs/specs/features/painel-admin-agendamentos/v1/tasks/T7.md` | T12 | scope_deviation |
| `docs/specs/features/painel-admin-agendamentos/v1/tasks/T8.md` | T13, T14 | scope_deviation |
| `tests/e2e/fixtures/adminSeed.ts` | T15 | code_quality |
| `tests/e2e/professional-surface.spec.ts` | T16 | testability |
| `playwright.config.ts` | T17 | security |

> **Atenção do orquestrador**: T13 e T14 tocam o mesmo arquivo (`v1/tasks/T8.md`) — o guard "paths disjuntos" força fallback para sequencial entre esse par, mesmo que ambas entrem no mesmo lote paralelo com outras tasks.

---

## 7. Critérios de Conclusão Geral

- [x] Todas as 17 tasks com Status `Concluído`.
- [x] Suíte de testes da feature passa sem regressão (Gate 1 valida em cada task).
- [x] Nenhum diff em arquivos fora da seção 6 acima.
- [x] §2 do `_run/run-report.md` da `v1` marca os débitos em cleanup; `_run/workflow-report.md` registra a execução.
- [x] `_run/minispec_state.yaml` desta versão marca `execution: completed`.

---

## 8. Notas para a LLM Executora

### Convenções desta versão

- **NÃO** criar testes novos além dos explicitamente descritos em T2 e T10 (as únicas 2 tasks cuja correção original é adicionar cobertura).
- **NÃO** refatorar fora do escopo do débito específico.
- **NÃO** "aproveitar a oportunidade" para corrigir débitos não listados (ex.: os 11 de "perfumaria" em `scope.md §2`).
- **SIM**: aplicar exatamente a `correcao_sugerida` da task — escopo cirúrgico.
- **SIM**: executar o comando de teste canônico da stack (`npm run lint`, `npm test`, `npm run test:integration`; `npm run test:e2e` quando a task tocar arquivo de E2E) após cada modificação para confirmar zero regressão antes de retornar a task.

### Frontmatter de cada task

```markdown
- model: sonnet
- risk: low
- gates: [qa]
- source: agent-spec-debt-resolution
- debito_origem: D-XXX
- task_origem_parent: T{N} (de v1)
```

### Saída esperada do executor

Formato padrão de output enxuto:

```
✅ T{N} — Resolver D-XXX: <título curto> /
  Arquivos: 1 modificado /
  Testes: <regrediu? 0 sim, todos passando> /
  Pendências: nenhuma
```
