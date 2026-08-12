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

- **Nome da Ideia / Feature**: Painel administrativo de agendamentos
- **Fonte da ideia**: `admin.md` + decisões do usuário sobre os ramos A-E
- **Autor**: usuário
- **Data**: 2026-08-10
- **Versão**: v1
- **Status**: Pronto para próxima etapa
- **Relacionados**: `admin.md`; nenhum PRD/spec existente encontrado em `docs/specs/**/*.md` ou `docs/prds/**/*.md`

---

## 2. Ideia Resumida (uma frase)

Criar uma frente administrativa mobile-first para controlar agendamentos, confirmação/cancelamento, agenda disponível, profissional único nesta fase e configurações exibidas ao cliente.

---

## 3. Esqueleto do Tema (Fase 1 — ramos da árvore)

| # | Ramo | Status (Fase 1) |
|---|------|-----------------|
| A | Controle administrativo dos agendamentos | explorar |
| B | Gestão de profissionais e escopo operacional | explorar |
| C | Disponibilidade, bloqueio e concorrência de horários | explorar |
| D | Configurações da experiência do cliente | explorar |
| E | Confirmação entre partes e priorização no admin | explorar |

---

## 4. Árvore de Rumos (Fase 2 — Tree of Thought)

### Ramo A — Controle administrativo dos agendamentos

**Direções candidatas:**

- **A1 — Listagem operacional por status**: o admin vê os agendamentos em cards com cliente, telefone, profissional, data, horário e status.
  - _Exemplo:_ a tela inicial mostra agendamentos `AGUARDANDO_CONFIRMACAO` e `CONFIRMADO`, deixando cancelados fora da listagem principal.
  - _Viabilidade:_ alinhado ao `admin.md`; exige organizar a jornada administrativa, mas não cria produto adjacente.
- **A2 — Ações administrativas com confirmação**: o admin confirma ou cancela um agendamento a partir do card, com confirmação explícita da ação.
  - _Exemplo:_ um card aguardando confirmação exibe "Confirmar" e "Cancelar"; um card confirmado deixa claro que já foi confirmado e não permite confirmação duplicada.
  - _Viabilidade:_ alinhado ao `admin.md`; reusa o conceito de status já definido.
- **A3 — Histórico completo e auditoria avançada**: o admin teria filtros detalhados, trilha completa de eventos e exportação.
  - _Exemplo:_ tela de histórico com todos os cancelamentos, filtros por período e download.
  - _Viabilidade:_ possível, mas maior que a primeira versão; não foi priorizado pelo usuário.

**Direção escolhida**: A1 + A2 — o usuário pediu seguir A1 e A2.
**Podadas / adiadas**: A3 adiado para versão futura por ampliar o painel além da operação essencial.

### Ramo B — Gestão de profissionais e escopo operacional

**Direções candidatas:**

- **B1 — Profissional único como configuração inicial**: nesta fase o sistema opera com um único profissional, sem exigir CRUD completo.
  - _Exemplo:_ o admin visualiza e usa o profissional configurado para liberar horários e associar agendamentos.
  - _Viabilidade:_ confirmado pelo usuário; reduz escopo frente ao CRUD completo descrito em `admin.md`.
- **B2 — Edição mínima de dados do profissional**: permitir ajustar dados essenciais do único profissional quando necessário.
  - _Exemplo:_ atualizar nome ou CREF do profissional ativo sem criar múltiplos profissionais.
  - _Viabilidade:_ confirmado pelo usuário; mantém valor operacional sem criar gestão multi-profissional.
- **B3 — CRUD completo de profissionais**: cadastrar, editar, ativar, desativar e gerenciar múltiplos profissionais.
  - _Exemplo:_ lista de profissionais com vários registros ativos/inativos e vínculo com diferentes agendas.
  - _Viabilidade:_ previsto em `admin.md`, mas podado nesta fase pela observação do usuário.

**Direção escolhida**: B1 + B2 — com a restrição explícita de que neste momento há um único profissional e não há necessidade de CRUD completo.
**Podadas / adiadas**: B3 adiado porque adiciona escopo de gestão que não entrega valor imediato no cenário atual.

### Ramo C — Disponibilidade, bloqueio e concorrência de horários

**Direções candidatas:**

- **C1 — Agenda disponível controlada pelo admin**: o admin define datas e horários liberados, e o cliente só escolhe slots disponíveis.
  - _Exemplo:_ para 15/08/2026, o admin libera 08:00, 09:00 e 10:00; o cliente não pode escolher outro horário arbitrário.
  - _Viabilidade:_ alinhado ao `admin.md`; é central para evitar agendamentos fora da agenda planejada.
- **C2 — Disponibilidade recorrente automatizada**: o admin define regras semanais recorrentes para gerar horários automaticamente.
  - _Exemplo:_ toda segunda e quarta, das 08:00 às 12:00, com intervalo de 60 minutos.
  - _Viabilidade:_ útil, mas não confirmado para esta versão.
- **C3 — Lista de espera para horário cheio**: clientes entram em espera quando o horário desejado está bloqueado.
  - _Exemplo:_ se 09:00 estiver ocupado, o cliente solicita notificação em caso de cancelamento.
  - _Viabilidade:_ produto adjacente à primeira versão; aumenta complexidade de comunicação.

**Direção escolhida**: C1 — o usuário pediu seguir C1.
**Podadas / adiadas**: C2 adiado por automatizar além do necessário; C3 adiado por criar uma jornada adicional de cliente.

### Ramo D — Configurações da experiência do cliente

**Direções candidatas:**

- **D1 — Aparência configurável pelo admin**: o admin define cores básicas da interface do cliente.
  - _Exemplo:_ configurar cor principal, secundária e de destaque usadas na área pública de agendamento.
  - _Viabilidade:_ alinhado ao `admin.md`; mantém o cliente visualmente ajustável sem redesenhar o produto.
- **D2 — Textos pós-agendamento configuráveis**: o admin define título, descrição, dicas e avisos exibidos após o cliente solicitar um agendamento.
  - _Exemplo:_ "Agendamento solicitado com sucesso!" com aviso de que o horário aguarda confirmação.
  - _Viabilidade:_ alinhado ao `admin.md`; reduz texto fixo no cliente.
- **D3 — Editor completo de conteúdo e páginas**: o admin controlaria textos de toda a experiência pública.
  - _Exemplo:_ editar textos de capa, seção institucional, perguntas frequentes e políticas.
  - _Viabilidade:_ `[fora do escopo do projeto]` para esta feature; vira gestão de site/conteúdo.

**Direção escolhida**: D1 + D2 — o usuário pediu seguir D1 e D2.
**Podadas / adiadas**: D3 descartado nesta versão por extrapolar o painel de agendamentos.

### Ramo E — Confirmação entre partes e priorização no admin

**Direções candidatas:**

- **E1 — Status permanece aguardando agendamento até dupla confirmação**: quando ambos confirmam, o registro ainda fica em estado de aguardando agendamento.
  - _Exemplo:_ cliente e profissional confirmam presença, mas o card continua como "aguardando agendamento" até a próxima etapa operacional definida.
  - _Viabilidade:_ confirmado pelo usuário; exige clareza visual para não confundir "confirmado" com "agendado definitivamente".
- **E2 — Admin vê quem confirmou primeiro por timestamp**: a tela administrativa ordena ou destaca a primeira confirmação registrada.
  - _Exemplo:_ o card mostra "primeiro confirmado: cliente, 10/08/2026 14:32" antes da confirmação do profissional.
  - _Viabilidade:_ confirmado pelo usuário; melhora acompanhamento administrativo sem criar múltiplos perfis administrativos.
- **E3 — Status muda automaticamente para confirmado quando ambos confirmam**: a dupla confirmação encerraria o estado de espera.
  - _Exemplo:_ após cliente e profissional confirmarem, o card passa para `CONFIRMADO`.
  - _Viabilidade:_ conflitante com a decisão do usuário para este momento.

**Direção escolhida**: E1 + E2 — ambos confirmam, o status fica "aguardando agendamento", e o admin vê quem confirmou primeiro pelo timestamp.
**Podadas / adiadas**: E3 podado porque contraria a decisão explícita do usuário.

---

## 5. Problema

- **Qual é a dor real hoje?** O responsável pelo sistema precisa controlar agendamentos, confirmações, cancelamentos, agenda disponível e informações exibidas ao cliente sem depender de operação manual solta.
- **Como o problema aparece no dia a dia?** Horários podem ser exibidos ou ocupados de forma inconsistente, o admin precisa saber o que está aguardando ação e mensagens ao cliente/profissional precisam usar dados corretos.
- **Quem sente o impacto?** O administrador sente o impacto operacional; clientes sentem impacto quando não sabem se o horário está solicitado, confirmado ou cancelado; [HIPÓTESE] o profissional também é afetado pela confirmação e pela agenda.
- **Por que resolver agora?** O painel administrativo é a base para tornar o fluxo de agendamento confiável antes de escalar funcionalidades como múltiplos profissionais ou histórico avançado.

---

## 6. Objetivo Principal

- **Qual é o resultado esperado ao final?** O administrador consegue operar a agenda diária, agir sobre solicitações, controlar disponibilidade e configurar a experiência básica do cliente.
- **Qual mudança de comportamento/estado deve acontecer?** Agendamentos deixam de depender de conferência manual informal e passam a ter status, ações e informações rastreáveis no painel.

---

## 7. Público / Usuário Envolvido

- **Persona primária**: administrador único do sistema.
- **Persona secundária**: cliente que solicita agendamento; [HIPÓTESE] profissional único que participa da confirmação.
- **Contexto de uso**: painel administrativo mobile-first, com interface dark theme; cliente usa a área pública configurada pelo admin.

---

## 8. Escopo Inicial (resultado da convergência)

Direções escolhidas na árvore de rumos que entram na primeira versão:

- [ ] Listagem operacional de agendamentos por cards, exibindo aguardando confirmação/agendamento e confirmados.
- [ ] Ações administrativas de confirmar e cancelar, com confirmação da ação e bloqueio contra duplicidade.
- [ ] Profissional único com edição mínima dos dados necessários, sem CRUD completo.
- [ ] Controle manual de datas e horários disponíveis pelo admin.
- [ ] Bloqueio de horário assim que houver solicitação aguardando confirmação/agendamento ou confirmação.
- [ ] Configuração de cores da interface do cliente.
- [ ] Configuração de textos exibidos após solicitação de agendamento.
- [ ] Registro de confirmação entre partes mantendo status "aguardando agendamento".
- [ ] Exibição administrativa de quem confirmou primeiro conforme timestamp.

---

## 9. Fora do Escopo (podado / adiado)

- CRUD completo de múltiplos profissionais — adiado porque o usuário confirmou que há um único profissional neste momento.
- Histórico avançado, auditoria completa e exportações — adiado por ampliar a operação além da primeira versão.
- Disponibilidade recorrente automatizada — adiado até validar necessidade real.
- Lista de espera de horários — adiado por criar nova jornada de cliente.
- Editor completo de conteúdo/páginas públicas — `[fora do escopo do projeto]` para esta feature.
- Mudança automática para confirmado quando ambos confirmam — podado porque contradiz a decisão de manter status aguardando agendamento.
- Login social, cadastro público, recuperação pública de senha, múltiplos administradores, roles e permissões administrativas — fora do escopo por decisão registrada em `admin.md`.
- API paga de WhatsApp — fora do escopo inicial; `admin.md` orienta começar com `wa.me`.

---

## 10. Ancoramento no Projeto (guarda de escopo)

- **O que o projeto É** (CLAUDE.md / README): projeto Next.js criado com `create-next-app`; `CLAUDE.md` aponta para `AGENTS.md`; `admin.md` define o domínio como painel administrativo de agendamentos com React, Next.js, TypeScript, Firebase/Firestore, Material Design 3, dark theme e mobile-first.
- **PRDs / specs existentes consultados** (`/docs/specs/**/*.md` + `/docs/prds/**/*.md`): nenhum arquivo existente encontrado; sem conflito ou duplicação documental.
- **Capacidades reutilizáveis** (apenas para viabilidade):
  - **Persistência**: `admin.md` define Firebase Firestore; o projeto ainda não possui módulo de persistência implementado.
  - **Autenticação / autorização**: `admin.md` permite Firebase Authentication apenas para autenticação técnica do administrador; o projeto ainda não possui fluxo implementado.
  - **Outros módulos internos**: estrutura atual contém `app/` inicial do Next.js e `src/services`; não foram encontrados módulos de agendamento, agenda, profissionais, configurações ou WhatsApp já implementados.
- **Conflitos / sobreposições detectados**: nenhum conflito documental detectado; há ajuste de escopo entre `admin.md` e o usuário em profissionais, reduzindo CRUD completo para profissional único nesta fase.

---

## 11. Premissas e Decisões já tomadas

**Premissas** — suposições assumidas para que a ideia faça sentido:

- [HIPÓTESE] "aguardando agendamento" é o nome de produto desejado para o estado que permanece mesmo após ambas as confirmações; em `admin.md`, o status original mais próximo era `AGUARDANDO_CONFIRMACAO`.
- [HIPÓTESE] a confirmação entre partes envolve cliente e profissional, porque o usuário mencionou "ambos confirma" e "quem confirmou primeiro".
- [HIPÓTESE] o profissional único ainda precisa ter dados básicos visíveis/editáveis para mensagens e agenda.

**Decisões já tomadas (fora de negociação)** — restrições travadas pelo usuário que limitam os rumos viáveis:

- Ramo A: seguir A1 e A2.
- Ramo B: seguir B1 + B2.
- Neste momento é somente um único profissional; não há necessidade de CRUD completo.
- Ramo C: seguir C1.
- Ramo D: seguir D1 + D2.
- Ramo E: ambos confirmam, fica com status de aguardando agendamento.
- Tela de admin aparece quem confirmou primeiro de acordo com o timestamp.
- Não existe cadastro público de administrador.
- Existe apenas um único administrador.
- Não criar login social, múltiplos usuários, permissões, perfis ou roles administrativas.
- Agendamentos cancelados não precisam aparecer na listagem principal.
- Não permitir confirmação duplicada.
- Não adicionar API paga de WhatsApp sem necessidade.
- Dois clientes nunca poderão reservar o mesmo horário.

---

## 12. Riscos e Pontos de Atenção

- **Risco de produto / aceitação**: o termo "aguardando agendamento" após dupla confirmação pode confundir usuários internos se parecer que nada avançou. Mitigação: diferenciar visualmente confirmação das partes e status operacional.
- **Risco de escopo**: o painel pode crescer para CRM, histórico, múltiplos profissionais e conteúdo público completo. Mitigação: manter v1 focada nos ramos escolhidos e registrar adiamentos.
- **Risco técnico ou operacional**: concorrência de horários é requisito obrigatório e pode gerar overbooking se tratada só visualmente. Mitigação: preservar a exigência de validação no Firebase na próxima etapa.
- **Risco de privacidade / segurança / compliance**: o painel lida com nome e telefone de clientes. Mitigação: restringir listagens administrativas ao administrador autenticado e limitar leitura pública ao mínimo necessário.

---

## 13. Dúvidas em Aberto

Perguntas objetivas a responder antes da próxima etapa:

1. [DÚVIDA] O status canônico deve se chamar exatamente `AGUARDANDO_AGENDAMENTO`, ou "aguardando agendamento" é apenas o texto exibido na interface?
2. [DÚVIDA] Quem são exatamente as duas partes que confirmam: cliente e profissional, cliente e administrador, ou profissional e administrador?
3. [DÚVIDA] Depois de ambas as partes confirmarem e o status continuar aguardando agendamento, qual evento futuro encerra esse estado?
4. [DÚVIDA] O profissional único precisa ser editável pelo admin na interface ou pode ser apenas uma configuração inicial feita pelo responsável técnico?

---

## 14. Síntese do Brainstorm

- **Absorvido no escopo inicial (seção 8)**: A1, A2, B1, B2, C1, D1, D2, E1 e E2.
- **Descartado com justificativa**: E3 descartado por contrariar a decisão de manter o status aguardando agendamento; D3 descartado por virar gestão de conteúdo fora do escopo do painel.
- **Adiado para v2/v3**: CRUD completo de profissionais, histórico/auditoria avançada, recorrência automática de agenda, lista de espera e exportações.
- **Provocações que mudaram o rumo**: a observação de profissional único reduziu o escopo de CRUD; a regra de dupla confirmação mudou a leitura do status final.

---

## 15. Recomendação de Framework

### 15.1 Complexidade Observada

| Dimensão | Valor detectado | Confirmação |
|---|---|---|
| Amplitude — # rumos/US que sobreviveram | 4+ | confirmado |
| Personas | múltiplas personas | inferido |
| Novidade | greenfield | inferido |
| Decisão arquitetural transversal nova? | sim — autenticação, autorização, persistência e concorrência em Firebase atravessam a feature | inferido |

### 15.2 Framework Recomendado

**Escolhido**: `SDD`

**Justificativa**: A amplitude ficou em 4+ rumos sobreviventes e o projeto está em cenário greenfield para este domínio administrativo. Além disso, há múltiplas personas impactadas e decisões transversais de segurança, persistência e concorrência que precisam ser formalizadas antes de virar plano de execução.

### 15.3 Alternativas Consideradas

**Por que NÃO miniSpec**: miniSpec seria leve demais para um escopo que junta painel admin, agenda, confirmação/cancelamento, configuração do cliente, autenticação, regras públicas/privadas e concorrência obrigatória. A chance de perder rastreabilidade entre regra de produto, estados e segurança é alta.

**Por que NÃO TaskCard**: TaskCard é subdimensionado porque não se trata de ajuste pontual; a feature cria o núcleo operacional do produto.

### 15.4 Próximo Passo

```bash
/agent-spec-adr-create "Estratégia de autenticação, autorização e concorrência de agendamentos no Firebase"
/agent-spec-sdd-generate-prd "painel administrativo de agendamentos"
```

### 15.5 Quando Reconsiderar a Recomendação

- **Upgrade** se durante a execução emergirem: integração paga de WhatsApp, múltiplos profissionais já na v1, painel público do profissional ou fluxos financeiros.
- **Downgrade** se: o escopo for reduzido para apenas listar/confirmar/cancelar agendamentos já existentes; o profissional único e configurações de cliente forem removidos da v1.

---

## 16. Checklist Final

- [x] Ideia resumida em uma frase clara
- [x] **Esqueleto (seção 3)** com 3-5 ramos, validado com o usuário na Fase 1
- [x] **Árvore de rumos (seção 4)**: cada ramo com direções candidatas + exemplo concreto + viabilidade + direção escolhida/podada
- [x] Rumos fora do escopo do projeto marcados como `[fora do escopo do projeto]`
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
