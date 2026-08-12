# QA Context — Painel administrativo de agendamentos/v1

## Stack
- Next.js 16.3 App Router, React 19.2, TypeScript, Tailwind CSS 4.
- Stack de testes ainda nao formalizada. Recomendado: Vitest + Testing Library + Firebase Emulator Suite + Playwright + axe.
- Nao ha `src/` implementado; o app contem apenas template base em `app/`.

## Componentes e Fluxos
- Admin protegido: `/admin/login`, `/admin`, `/admin/agenda`, `/admin/configuracoes/aparencia`, `/admin/configuracoes/agendamento`.
- Services via Server Actions, sem API HTTP interna v1.
- Firestore/Auth encapsulados em `src/firebase` e repositories.
- Reserva publica deve usar transacao/operacao atomica para impedir overbooking.
- Status canonico `aguardando agendamento` permanece ate a chegada da data/horario mesmo apos confirmacoes.

## Mapa CA -> CT
- CA-01: CT-01, CT-22
- CA-02: CT-02
- CA-03: CT-03, CT-22
- CA-04: CT-04
- CA-05: CT-05, CT-06, CT-22
- CA-06: CT-07, CT-08
- CA-07: CT-09, CT-10
- CA-08: CT-09, CT-10
- CA-09: CT-11, CT-12
- CA-10: CT-13, CT-14
- CA-11: CT-15, CT-22
- CA-12: CT-15, CT-16, CT-22
- CA-13: CT-17, CT-18, CT-22
- CA-14: CT-19, CT-20
- CA-15: CT-19, CT-20
- CA-16: CT-21, CT-22

## Distribuicao CT -> Task
- T1: CT-21
- T2: CT-05, CT-06, CT-11, CT-12
- T3: CT-07, CT-08
- T4: CT-01, CT-02, CT-03, CT-04, CT-19, CT-20
- T5: CT-13
- T6: CT-15, CT-16, CT-17, CT-18
- T7: CT-09, CT-10
- T8: CT-14, CT-22

## Paths Relevantes
- `docs/specs/features/painel-admin-agendamentos/v1/tech_spec.md`
- `docs/prds/features/painel-admin-agendamentos/v1/prd.md`
- `docs/specs/features/painel-admin-agendamentos/v1/design.md`
- `docs/specs/features/painel-admin-agendamentos/v1/_run/test-cases.json`
