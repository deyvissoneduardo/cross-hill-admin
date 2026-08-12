# TASK PLAN – Plano de Execução das Tasks

## 1. Identificação
- **Feature/Projeto**: Painel administrativo de agendamentos
- **Responsável (Tech Lead)**: agent-spec-sdd-generate-task-plan
- **Data**: 2026-08-10
- **Status**: Concluído
- **TECH_SPEC**: `docs/specs/features/painel-admin-agendamentos/v1/tech_spec.md`
- **PRD**: `docs/prds/features/painel-admin-agendamentos/v1/prd.md`

---

## 2. Objetivo do Task Plan
Decompor a v1 do painel administrativo em tasks executáveis para implementar autenticação administrativa, Firestore, agendamentos, agenda manual, configurações do cliente, fluxo público de solicitação e validação integrada, mantendo o escopo do PRD e do Tech Spec.

---

## 3. Macro-Fases (alto nível)
- **Fase 1 – Fundação técnica, Firebase e segurança administrativa**
  - Objetivo: preparar dependências, Firebase, auth admin, shell protegido, primitives e stack de testes.
  - Tasks: T1
- **Fase 2 – Domínio de agenda, disponibilidade e agendamentos**
  - Objetivo: criar services/repositories, contratos de domínio, concorrência de reserva e mensagens.
  - Tasks: T2, T3
- **Fase 3 – Interface administrativa operacional**
  - Objetivo: entregar dashboard, cards, dialogs, timeline, agenda manual e profissional único somente leitura.
  - Tasks: T4, T5
- **Fase 4 – Configurações e experiência do cliente**
  - Objetivo: entregar configurações de aparência/textos e fluxo público de disponibilidade/solicitação.
  - Tasks: T6, T7
- **Fase 5 – Validação integrada e hardening**
  - Objetivo: validar E2E, acessibilidade, segurança e ausência de superfícies fora de escopo.
  - Tasks: T8

---

## 4. Lista de Tasks (visão macro)

| ID | Nome da Task | Arquivo | Fase | Dependências | Pode Rodar em Paralelo? (derivado) | Status |
|----|--------------|---------|------|--------------|------------------------------------|--------|
| T1 | Fundação Firebase, autenticação admin e stack de testes | [T1](tasks/T1.md) | 1 | — | Não | Concluído |
| T2 | Domínio, repositories e transações de agendamento | [T2](tasks/T2.md) | 2 | T1 | Não | Concluído |
| T3 | Mensagens WhatsApp e helpers de comunicacao | [T3](tasks/T3.md) | 2 | T1, T2 | Não | Concluído |
| T4 | Dashboard administrativo de agendamentos | [T4](tasks/T4.md) | 3 | T1, T2, T3 | Não | Concluído |
| T5 | Agenda manual e profissional unico | [T5](tasks/T5.md) | 3 | T1, T2 | Não | Concluído |
| T6 | Configurações de aparência e textos pós-agendamento | [T6](tasks/T6.md) | 4 | T1, T2 | Não | Concluído |
| T7 | Fluxo publico de disponibilidade e solicitacao | [T7](tasks/T7.md) | 4 | T1, T2, T6 | Não | Concluído |
| T8 | Hardening E2E, acessibilidade e superficie fora de escopo | [T8](tasks/T8.md) | 5 | T1, T2, T4, T5, T6, T7 | Não | Concluído |

### 4.1 Ordem de Execução (grafo)

```text
T1 -> T2 -> T3 -> T4 -> T8
T1 -> T2 -> T5 -> T8
T1 -> T2 -> T6 -> T7 -> T8
```

---

## 5. Rastreabilidade: User Stories → Tasks

| User Story (PRD) | Definição Técnica (SPEC) | Tasks Relacionadas | Status |
|------------------|--------------------------|--------------------|--------|
| US-01 | Server Component carrega agendamentos ativos; cards responsivos | T1, T4, T8 | Concluído |
| US-02 | Server Action confirma agendamento com guarda de auth e bloqueio de duplicidade | T1, T2, T4 | Concluído |
| US-03 | Server Action cancela agendamento e libera slot | T1, T2, T4, T8 | Concluído |
| US-04 | Service puro gera mensagem/URL com dados do agendamento | T3, T4 | Concluído |
| US-05 | Tela de agenda salva slots liberados/bloqueados via service | T1, T2, T5, T8 | Concluído |
| US-06 | Solicitação pública usa operação atômica para ocupar slot | T2, T7 | Concluído |
| US-07 | Profissional único lido como dado somente leitura | T3, T5, T8 | Concluído |
| US-08 | Formulário valida cores e salva aparência | T1, T6, T7, T8 | Concluído |
| US-09 | Formulário valida textos pós-agendamento e salva configuração | T1, T6, T7, T8 | Concluído |
| US-10 | Card exibe confirmação de profissional/admin por timestamps | T2, T4, T8 | Concluído |
| US-11 | Service/model deriva `confirmadoPrimeiroPor` por timestamp | T2, T4 | Concluído |
| US-12 | Model/status mantém `aguardando agendamento` até o horário | T2, T4, T8 | Concluído |

---

## 6. Dependências Gerais
- Firebase Authentication e Firestore precisam de configuração de ambiente para execução real.
- Firebase Emulator Suite é pré-requisito para CTs de integração de persistência e concorrência.
- Stack de testes deve ser instalada/fixada em T1 antes das tasks que criam testes.
- `docs/specs/features/painel-admin-agendamentos/v1/design.md` é referência obrigatória para tasks de UI.
- Não existem ADRs ativas no projeto (`docs/adr/INDEX.md` ausente).

---

## 7. Critérios de Conclusão da Feature
A feature será considerada concluída quando:
- [x] Todas as tasks estiverem completas
- [x] Testes CT-01 a CT-22 implementados sem duplicidade entre tasks
- [x] `npm run lint`, `npm run test` e `npm run test:e2e` passarem ou limitações ambientais forem registradas
- [x] Critérios técnicos do SPEC atendidos
- [x] Nenhum comportamento divergente do PRD
- [x] Todas as User Stories cobertas (tabela seção 5)
- [x] Rotas/actions administrativas protegidas server-side
- [x] Reserva de horário validada com transação/operação atômica

---

## 8. Riscos & Mitigações
- Overbooking por concorrência mal implementada -> mitigar com Firestore transaction e CT-11/CT-12.
- Vazamento de dados administrativos -> mitigar com `assertAdminSession` em páginas/actions e CT-21.
- Falta de stack de testes formal -> mitigar em T1 instalando/fixando Vitest/Playwright/axe.
- UI divergente do design -> mitigar referenciando `design.md` nas tasks de UI e CT-22.
- Escopo crescer para CRUD de profissionais -> mitigar com CT-13/CT-14 e ausência explícita de rotas/actions.

---

## 9. Checklist Final
- [x] Task Plan completo
- [x] Tasks mapeadas
- [x] Dependências validadas
- [x] Rastreabilidade User Stories → Tasks preenchida
- [x] Paralelismo derivado conservadoramente
- [x] Seção 6 das tasks redistribuída a partir de `_run/test-cases.json`
- [x] Pronto para execução sequencial controlada
