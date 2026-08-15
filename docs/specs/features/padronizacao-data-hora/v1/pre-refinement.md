# Pré-Refinamento — Brainstorm de Produto

> Artefato **intermediário** (anterior ao PRD / INTENT / TaskCard), produto de um brainstorm em **Tree of Thought**: divergir os rumos possíveis, podar com o usuário e convergir.
>
> **Legenda:**
> - Linhas sem marcação = **FATO** (afirmado pelo usuário).
> - `[HIPÓTESE]` = inferência da skill que precisa ser validada.
> - `[DÚVIDA]` = ponto em aberto, detalhado na seção 13.
> - `[fora do escopo do projeto]` = rumo que extrapola o que este projeto se propõe a ser.

---

## 1. Metadados

- **Nome da Ideia / Feature**: Padronização de data/hora (24h + formato brasileiro) em todo o projeto
- **Fonte da ideia**: texto livre (comando do usuário)
- **Autor**: Deyvisson Eduardo
- **Data**: 2026-08-12
- **Versão**: v1
- **Status**: Refinado
- **Relacionados**: `painel-admin-agendamentos/v1` (única feature existente no projeto — este pré-refinamento toca o código dela, mas não é uma versão dela)

---

## 2. Ideia Resumida (uma frase)

Garantir que toda exibição de data seja no formato brasileiro (dd/mm/aaaa) e toda exibição de hora seja em 24 horas, em qualquer lugar do projeto — hoje e nas features futuras.

---

## 3. Esqueleto do Tema (Fase 1 — ramos da árvore)

| # | Ramo | Status (Fase 1) |
|---|------|-----------------|
| A | Inputs nativos de data/hora — a UI do seletor do navegador pode escapar do padrão | explorado |
| B | Trava contra regressão futura (lint + convenção) | explorado |
| C | Cobertura completa dos pontos de exibição hoje | explorado |
| D | Escopo do pedido: pontual vs. convenção permanente do projeto | explorado |

---

## 4. Árvore de Rumos (Fase 2 — Tree of Thought)

### Ramo A — Inputs nativos de data/hora

**Contexto (FATO, verificado por grep)**: existem 3 `<input type="date">`/`<input type="time">` nativos do HTML (`app/admin/agenda/page.tsx:84`, `src/features/agenda/components/ScheduleSlotGrid.tsx:194`, `src/features/agendamentos/components/PublicAvailabilityView.tsx:115`). O **valor** desses inputs já é sempre `YYYY-MM-DD`/`HH:mm` (padrão do HTML), mas a **UI do seletor** (calendário/relógio desenhado pelo navegador) segue o locale do navegador/SO do usuário, não o código do app. `<html lang="pt-BR">` já está configurado em `app/layout.tsx:28`.

**Direções candidatas:**

- **A1 — Substituir por input mascarado**: criar um campo de texto mascarado (`09:00`, `15/08/2026`) usando as validações que já existem em `src/shared/time.ts` (`isTimeOfDay`/`isIsoDate`), sem depender do widget nativo do navegador.
  - _Exemplo:_ o campo "Novo horário" da Agenda passa a ser um input de texto mascarado em vez do relógio nativo do Chrome.
  - _Viabilidade:_ reusa 100% de `time.ts` (parsing/validação já existe); exige estender o componente `Field` já compartilhado em `src/shared/components/`. Garante o resultado para qualquer usuário, independente do navegador/SO dele. Perde o picker visual nativo (calendário/relógio de clique).
- **A2 — Manter nativo + `lang="pt-BR"` no elemento do input**: mudança de 1 atributo em 3 lugares.
  - _Exemplo:_ `<input type="date" lang="pt-BR" />`.
  - _Viabilidade:_ trivial, mas suporte de navegador inconsistente (Chrome tende a respeitar; Firefox tende a seguir o SO) — não garante o resultado.
- **A3 — Não mudar nada**: confiar no `lang` do `<html>` já configurado.
  - _Exemplo:_ n/a — status quo.
  - _Viabilidade:_ custo zero; cobre a maioria dos usuários com SO/navegador em pt-BR, mas não cobre usuário com SO/navegador em inglês.

**Direção escolhida**: **A1** — é a única que garante o resultado para qualquer usuário, e reusa integralmente a camada de validação já existente em `time.ts`.
**Podadas**: A2 (suporte de navegador inconsistente, não garante o requisito) e A3 (não cobre 100% dos casos).

### Ramo B — Trava contra regressão futura

**Contexto (FATO, verificado por grep)**: hoje **nenhum** arquivo do projeto usa `toLocaleDateString`/`toLocaleTimeString`/`Intl.DateTimeFormat` fora de `time.ts` — 100% conforme. Mas não há nenhuma trava automática impedindo que isso apareça numa mudança futura.

**Direções candidatas:**

- **B1 — Regra de lint + documentar no CLAUDE.md**: adicionar regra no `eslint.config.mjs` (ESLint 9, flat config) proibindo `toLocaleDateString`/`toLocaleTimeString`/`Intl.DateTimeFormat` fora de `src/shared/time.ts`, e registrar a convenção no `CLAUDE.md`.
  - _Exemplo:_ regra `no-restricted-syntax` bloqueando as chamadas dessas APIs em qualquer arquivo diferente de `time.ts`.
  - _Viabilidade:_ configuração pura (o projeto já usa ESLint 9 flat config) — falha automática de PR, não depende de revisão humana lembrar.
- **B2 — Só documentar no CLAUDE.md**: 1 linha na seção Convenções, sem lint.
  - _Viabilidade:_ zero custo, mas o histórico deste projeto (débitos D9/D14/D23-D25 do `run-report.md` da feature existente) já mostrou que "declarar sem travar" tende a vazar — arquivo tocado fora do escopo declarado é o anti-padrão mais recorrente encontrado.
- **B3 — Nenhuma trava**: confiar em code review.
  - _Viabilidade:_ risco baixo hoje (100% conforme), mas sem proteção contra drift futuro.

**Direção escolhida**: **B1** — barato (config, não código), objetivo, e alinhado ao padrão "NÃO faça X" que o `CLAUDE.md` do projeto já valoriza.
**Podadas**: B2 (histórico do próprio projeto mostra que só documentar não é suficiente) e B3 (sem proteção).

### Ramo C — Cobertura completa dos pontos de exibição hoje

**Contexto (FATO, verificado por grep)**: os 6 arquivos que exibem data/hora ao usuário (`PublicBookingForm.tsx`, `PublicAvailabilityView.tsx`, `AppointmentCard.tsx`, `ConfirmationTimeline.tsx`, `whatsappService.ts`, `ScheduleSlotGrid.tsx`) já passam 100% pelas funções de `time.ts`.

**Direções candidatas:**

- **C1 — Varredura extra por texto de erro/toast com data crua**: grep por `Date().toString()`, `String(date)`, interpolação direta de `Date` em texto exibido.
  - _Exemplo:_ um toast de erro que interpolasse `new Date()` sem passar por `formatInstantPtBr`.
  - _Viabilidade:_ grep de baixo custo, feito nesta própria sessão.
- **C2 — Não investigar mais**: aceitar a varredura já feita como suficiente.

**Direção escolhida**: **C1**, executada nesta sessão. **Resultado (FATO)**: nenhum ponto cego novo encontrado — os 5 usos de `new Date(` fora de `time.ts` (`availabilityService.ts`, `settingsService.ts`, `settingsRepository.ts`, `bookingService.ts`, `ScheduleSlotGrid.tsx:109`) são todos parâmetros internos (`now`) passados para funções de domínio, nunca exibidos crus ao usuário.
**Podadas**: nenhuma — C1 foi executada e fechou o ramo sem achados.

### Ramo D — Escopo: pontual vs. convenção permanente

**Direções candidatas:**

- **D1 — Convenção permanente no `CLAUDE.md`**: adicionar 1 linha na seção Convenções (já existe, gerada nesta mesma sessão): "data/hora exibida ao usuário usa `src/shared/time.ts`; 24h e dd/mm/aaaa são obrigatórios".
  - _Viabilidade:_ custo igual a fazer só pontual agora (é 1 linha), mas protege toda feature futura automaticamente — o projeto hoje tem só 1 feature, então "permanente" não custa mais que "pontual" neste momento.
- **D2 — Só a feature atual**: ajustar os 3 inputs + o lint sem tocar `CLAUDE.md`.
  - _Viabilidade:_ mais restrito ao pedido literal, mas exige repetir a decisão manualmente em toda feature nova.

**Direção escolhida**: **D1** — o `CLAUDE.md` já tem seção Convenções pronta para receber a linha; sem custo adicional.
**Podadas**: D2 (não se paga: mesma linha, sem a proteção futura).

---

## 5. Problema

- **Qual é a dor real hoje?** Nenhuma regressão foi observada no código (a camada de formatação já está 100% conforme) — o pedido é preventivo/de padronização: garantir que a exibição de data/hora nunca dependa do locale do navegador de quem usa o sistema, e que isso se mantenha assim conforme o projeto cresce.
- **Como o problema aparece no dia a dia?** O único ponto onde o formato pode escapar do controle do código são os 3 `<input type="date">`/`<input type="time">` nativos — a picker do navegador pode mostrar 12h/AM-PM ou ordem de data americana para um usuário com navegador/SO configurado em inglês, mesmo sendo um produto 100% pt-BR.
- **Quem sente o impacto?** O administrador único (ao preencher a agenda) e o cliente (ao escolher horário na vitrine pública) — ambos usuários brasileiros que esperam ver hora em 24h e data em dd/mm/aaaa sempre.
- **Por que resolver agora?** Custo de correção é baixo agora (3 inputs, 1 feature); adiar cresce o custo proporcionalmente a quantas telas novas usarem input nativo de data/hora.

---

## 6. Objetivo Principal

- **Qual é o resultado esperado ao final?** Nenhuma tela do sistema exibe data ou hora fora do formato dd/mm/aaaa · HH:mm 24h, independentemente do navegador/SO/locale de quem usa — hoje e em qualquer feature futura.
- **Qual mudança de comportamento/estado deve acontecer?** Os 3 inputs nativos de data/hora são substituídos por um input mascarado que usa as validações de `time.ts`; uma regra de lint impede reintrodução de formatação dependente de locale (`toLocaleDateString`/`Intl.DateTimeFormat`) fora de `time.ts`; a convenção fica registrada no `CLAUDE.md`.

---

## 7. Público / Usuário Envolvido

- **Persona primária**: Administrador único do painel (preenche a agenda, vê os cards de agendamento).
- **Persona secundária**: Cliente da vitrine pública (escolhe data/horário para solicitar atendimento).
- **Contexto de uso**: Navegador desktop/mobile, potencialmente com SO/navegador configurado em qualquer idioma — o produto em si é 100% pt-BR e não deve variar com essa configuração externa.

---

## 8. Escopo Inicial (resultado da convergência)

- [x] Substituir os 3 `<input type="date">`/`<input type="time">` nativos por um componente de input mascarado (texto), validado com `isIsoDate`/`isTimeOfDay` de `src/shared/time.ts` (Ramo A → A1)
- [x] Adicionar regra de lint no `eslint.config.mjs` proibindo `toLocaleDateString`/`toLocaleTimeString`/`Intl.DateTimeFormat` fora de `src/shared/time.ts` (Ramo B → B1)
- [x] Registrar a convenção "data/hora exibida usa `src/shared/time.ts`; 24h e dd/mm/aaaa obrigatórios" na seção Convenções do `CLAUDE.md` (Ramo D → D1)

> Ponto de partida para o TaskCard — não é definitivo.

---

## 9. Fora do Escopo (podado / adiado)

- Manter input nativo só com `lang="pt-BR"` no elemento (Ramo A2) — suporte de navegador inconsistente, não garante o requisito.
- Confiar apenas no `lang` do `<html>` sem mudança nos inputs (Ramo A3) — não cobre usuário com navegador/SO em outro idioma.
- Documentar convenção sem lint (Ramo B2) — histórico do projeto mostra que "declarar sem travar" tende a vazar.
- Mudar o formato de **persistência interna** (Firestore já usa `YYYY-MM-DD`/`HH:mm` internamente, e instantes em ISO-8601 UTC) — o pedido é sobre **exibição**, não sobre armazenamento; mudar isso seria arquitetural, destrutivo e fora do que foi pedido.

---

## 10. Ancoramento no Projeto (guarda de escopo)

- **O que o projeto É** (`CLAUDE.md`): painel administrativo (Next.js App Router) de agendamentos, com vitrine pública — administrador único, sem múltiplos perfis. `CLAUDE.md` já tem uma seção Convenções e uma seção Stack citando Tailwind CSS 4 (design tokens em `app/globals.css`).
- **PRDs / specs existentes consultados** (`/docs/specs/**/*.md` + `/docs/prds/**/*.md`):
  - `painel-admin-agendamentos/v1` — única feature do projeto. PRD, Tech Spec e `design.md` **não mencionam** formato de data/hora explicitamente (grep confirmou ausência de "24 horas"/"dd/mm"/"AM/PM" nesses três arquivos) — este pedido não duplica nem conflita com nada já especificado, apenas formaliza um comportamento que o código já implementa quase integralmente.
- **Capacidades reutilizáveis**:
  - **Formatação de data/hora**: `src/shared/time.ts` — já contém `isIsoDate`, `isTimeOfDay`, `formatDatePtBr`, `formatTimePtBr`, `formatDateTimePtBr`, `formatInstantPtBr`, `normalizeTimeOfDay`, `todayIsoDate`. Toda a lógica de validação e formatação já existe; não é preciso criar nada novo aqui.
  - **Componente de input compartilhado**: `src/shared/components/Field.tsx` — usado pelos 3 pontos que precisam de máscara; é o candidato natural a estender (Ramo A1) em vez de criar um componente novo do zero.
  - **Configuração de lint**: `eslint.config.mjs` (ESLint 9, flat config) — já existe e é o lugar correto para a regra do Ramo B1.
  - **Outros módulos internos**: nenhum outro módulo relevante para esta mudança (é uma mudança de camada de apresentação).
- **Conflitos / sobreposições detectados**: nenhum.

---

## 11. Premissas e Decisões já tomadas

**Premissas**:

- [HIPÓTESE] O usuário quer garantir o resultado para **qualquer** usuário/navegador, não apenas "no ambiente que a equipe usa hoje" — é essa leitura que justificou escolher A1 (input mascarado) em vez de A2/A3. Se a intenção fosse mais restrita, A2/A3 seriam suficientes e mais baratas.
- [HIPÓTESE] "Todo o projeto" inclui features futuras, não só a feature `painel-admin-agendamentos` existente — é essa leitura que justificou D1 (convenção no `CLAUDE.md`) em vez de D2 (só a feature atual).

**Decisões já tomadas (fora de negociação)**:

- "tudo que for relacionado a hora tem que estar no padrão 24 horas" — restrição literal do usuário, já satisfeita pela camada de domínio (`time.ts`); o trabalho real é garantir que a UI nunca escape disso.
- "tudo que for relacionado a data deve estar no padrão do Brasil" — idem, formato dd/mm/aaaa.

---

## 12. Riscos e Pontos de Atenção

- **Risco de produto / aceitação**: baixo — a mudança visível ao usuário final é só a troca do picker nativo por um campo mascarado; se a UX do campo mascarado for mal implementada (sem feedback claro de formato esperado), pode piorar a experiência de preencher data/hora. Mitigação: seguir o padrão de erro/validação já usado pelo `Field` (mensagens de `dominioTexts`).
- **Risco de escopo**: baixo — os 3 pontos de input já foram mapeados; não há descoberta pendente de mais pontos.
- **Risco técnico ou operacional**: baixo-médio — substituir input nativo por texto mascarado exige lidar com paste, digitação parcial, e teclado mobile (o nativo já otimiza teclado numérico em mobile; um input de texto mascarado precisa de `inputMode="numeric"` ou similar para não piorar a UX mobile). Mitigação: tratar como critério de aceite explícito no TaskCard.
- **Risco de privacidade / segurança / compliance**: nenhum identificado.

---

## 13. Dúvidas em Aberto

1. [DÚVIDA] O componente de input mascarado deve manter algum affordance visual de calendário/relógio (ex.: ícone clicável que abre um mini-picker customizado), ou um campo de texto puro com placeholder (`dd/mm/aaaa`, `hh:mm`) já resolve?
2. [DÚVIDA] A regra de lint deve ser `error` (bloqueia o build/CI) ou `warn` (só aviso)? O projeto hoje não tem CI configurado (confirmado: `.github/workflows` ausente), então "bloquear PR" hoje depende de lint local rodado manualmente/pelo agente — vale considerar isso ao decidir a severidade.

---

## 14. Síntese do Brainstorm

- **Absorvido no escopo inicial (seção 8)**: A1 (input mascarado), B1 (lint + CLAUDE.md), D1 (convenção permanente). C1 foi executado como investigação (não é entregável, mas confirmou que não há mais nada a corrigir além do escopo acima).
- **Descartado com justificativa**: A2 (lang no input — suporte inconsistente), A3 (não mudar nada — não garante o requisito), B2 (só documentar — histórico do projeto mostra que vaza), B3 (nenhuma trava), D2 (só a feature atual — não se paga).
- **Adiado para v2/v3**: nenhum item foi adiado — o escopo encontrado é pequeno e coube inteiro nesta rodada.
- **Provocações que mudaram o rumo**: a varredura de Ancoramento revelou que a "dor" não é a formatação em si (já 100% correta na camada de domínio) — é a superfície de input nativo do HTML, que o pedido original não mencionava explicitamente. Isso reduziu o escopo real do trabalho de "reformatar tudo" para "blindar 3 pontos + travar regressão".

---

## 15. Recomendação de Framework

### 15.1 Complexidade Observada

| Dimensão | Valor detectado | Confirmação |
|---|---|---|
| Amplitude — # rumos/US que sobreviveram | 1 (só dev) | confirmado |
| Personas | só dev | confirmado |
| Novidade | ajuste | confirmado |
| Decisão arquitetural transversal nova? | não | inferido |

### 15.2 Framework Recomendado

**Escolhido**: `TaskCard`

**Justificativa**: Amplitude = 1 (um único requisito de UI: blindar os inputs de data/hora, com lint como reforço) e Novidade = ajuste pontual sobre um componente já existente (`Field`) e uma camada de domínio já completa (`time.ts`) — não há decisão arquitetural nova nem persona além do dev que vai implementar. É exatamente o perfil que o TaskCard resolve sem overhead de PRD/Tech Spec.

### 15.3 Alternativas Consideradas

**Por que NÃO miniSpec**: miniSpec se justifica com 2-3 rumos e ao menos uma persona além do dev diretamente impactada pela formalização (ex.: um time de produto acompanhando o incremento). Aqui sobrou 1 rumo técnico só, sem necessidade do scope.md intermediário.

**Por que NÃO Conversa direta**: o pedido, apesar de pequeno, envolve 3 arquivos de UI a alterar, uma regra de lint nova e uma atualização de convenção — merece um TaskCard rastreável (com QA validando os 3 pontos) em vez de uma edição ad-hoc sem gate.

### 15.4 Próximo Passo

```bash
/agent-spec-taskcard-generate "docs/specs/features/padronizacao-data-hora/v1/pre-refinement.md"
```

### 15.5 Quando Reconsiderar a Recomendação

- **Upgrade** se durante a execução emergir: necessidade de um design system formal de máscara de input reutilizável em múltiplos projetos (decisão arquitetural nova → considerar ADR), ou se o componente mascarado precisar de acessibilidade complexa que exija validação de mais de uma persona.
- **Downgrade** se: o TaskCard revelar que basta o atributo `lang` nos inputs nativos (Ramo A2) e a regra de lint sozinha já resolve — nesse caso poderia até ter sido uma Conversa direta.

---

## 16. Checklist Final

- [x] Ideia resumida em uma frase clara
- [x] **Esqueleto (seção 3)** com 4 ramos, validado com o usuário na Fase 1
- [x] **Árvore de rumos (seção 4)**: cada ramo com direções candidatas + exemplo concreto + viabilidade + direção escolhida/podada
- [x] Rumos fora do escopo do projeto marcados como `[fora do escopo do projeto]` (nenhum rumo saiu do escopo do projeto nesta rodada)
- [x] Problema, público, escopo inicial e fora de escopo delimitados
- [x] **Ancoramento (seção 10)** preenchido com PRDs/capacidades concretos
- [x] Toda inferência marcada `[HIPÓTESE]`; dúvidas listadas como perguntas objetivas
- [x] **Síntese (seção 14)** registra absorvido / descartado / adiado
- [x] **Complexidade (15.1)** preenchida
- [x] **Framework recomendado (15.2)** justificado com 2 dimensões decisivas
- [x] **Alternativas (15.3)** explicam por que NÃO o vizinho mais próximo
- [x] **Comando exato (15.4)** escrito
- [x] **Gatilhos (15.5)** de reclassificação listados
- [x] Pronto para alimentar PRD / INTENT / TaskCard
