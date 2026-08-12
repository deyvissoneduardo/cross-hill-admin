# INTENT — Cleanup de Débitos Técnicos · painel-admin-agendamentos · v2-debits

> **Tipo**: Versão de débitos (gerada por `/agent-spec-debt-resolution`).
> **Origem**: `docs/specs/features/painel-admin-agendamentos/v1/_run/run-report.md`
> **Variante**: web
> **Data**: 2026-08-12

## 1. Identificação

- **Feature**: painel-admin-agendamentos
- **Versão**: v2-debits
- **Versão pai**: v1 (feature original)
- **Variante**: web (herdada de v1)
- **Origem dos débitos**: `docs/specs/features/painel-admin-agendamentos/v1/_run/run-report.md`
- **Tipo de operação**: cleanup técnico (zero feature nova)

---

## 2. Objetivo

Resolver **17 débitos técnicos** acumulados na execução de `v1`, classificados como aceitáveis para passar pelos gates (severidade `BAIXO`, categorias `code_review_only`) mas que prejudicam manutenibilidade, legibilidade, segurança de hardening ou rastreabilidade se deixados sem ação.

A versão foi gerada via skill `/agent-spec-debt-resolution` que:

1. Coletou 28 débitos elegíveis de `_run/run-report.md` da `v1` (D1-D29, excluindo D20 — já resolvido por T6).
2. Submeteu ao agente especialista (`Default (orquestrador genérico)` — nenhum agente de stack registrado em `.claude/agents/`) para classificação binária (`recomendado_corrigir` / `perfumaria`).
3. Apresentou a classificação ao usuário, que selecionou os 17 `recomendado_corrigir` para cleanup nesta rodada.
4. Os demais 11 débitos (perfumaria) ficam registrados em `scope.md §2 (Fora do escopo)` para auditoria — podem ser revisitados em uma futura `v3-debits/`.

---

## 3. Resultado esperado

Após execução desta versão via `/agent-spec-minispec-run-tasks`:

- Cada débito selecionado vira **1 task atômica** em `tasks/T{n}.md` com `gates: [qa]`.
- Suíte de testes da feature continua passando (cleanup não muda comportamento observável, salvo os 2 débitos cuja correção é adicionar cobertura de teste faltante — D-002 e D-019 — que adicionam asserção sem alterar o SUT).
- §2 do `_run/run-report.md` da `v1` marca os débitos em cleanup; `_run/workflow-report.md` registra a execução.
- Diff esperado: pequeno em cada task (rename/import, guarda de poucas linhas, extração de constante compartilhada, correção de comentário, edição de tabela markdown de task).

---

## 4. Critérios de sucesso

- [x] Todas as 17 tasks aprovadas pelo Gate 1 (QA).
- [x] Suíte de testes da feature inteira passa sem regressão.
- [x] Nenhum arquivo fora do escopo de cada débito modificado.
- [x] §2 do `_run/run-report.md` da `v1` marca os débitos em cleanup; `_run/workflow-report.md` registra a execução.

---

## 5. Premissas

- A `v1` está concluída (8/8 tasks aprovadas pelos gates; commitada em 8 commits `feat`/`test`).
- Os débitos coletados refletem o estado real após a última execução de `/agent-spec-sdd-run-tasks` na `v1`.
- Tasks de débito são independentes entre si, exceto T13/T14 (ambas editam a mesma task de origem `v1/tasks/T8.md` — paralelismo forçado para `Não` entre esse par).

---

## 6. Fora do escopo

- **Funcionalidade nova**: zero. Esta versão é cleanup puro.
- **Refactor arquitetural**: os 11 débitos de "perfumaria" (D-005 a D-012, D-015, D-017, D-020, D-028) exigem decisão de arquitetura, refactor não-trivial (>10min) ou tocam área que se beneficiaria de refatoração maior — **não** entram aqui. Registrados em `scope.md §2` para auditoria.
- **Tech Review profundo**: todas as 17 tasks têm `gates: [qa]` — nenhum débito selecionado toca path que bate literalmente com as categorias de Critical Paths (`auth/`, `security/`, `crypto/`, `db_migrations/`, `secrets|config`) da rule `agent-spec-workflow-rules.md`.

---

## 7. Próximo passo

```
/agent-spec-minispec-run-tasks docs/specs/features/painel-admin-agendamentos/v2-debits/task_plan.md
```

Tempo estimado total: ~40 minutos (soma dos custos individuais).
