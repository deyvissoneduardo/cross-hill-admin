# PRD -- Product Requirements Document (O QUE / POR QUÊ)

## 1. Metadados
- **Nome da Feature/Projeto**: Painel administrativo de agendamentos
- **Responsável/Autor**: usuário
- **Data**: 2026-08-10
- **Versão**: v1
- **Status**: Revisão
- **Relacionados**: `docs/specs/features/painel-admin-agendamentos/v1/pre-refinement.md`, `admin.md`

---

## 2. Contexto & Motivação
- **Qual problema ou dor existe hoje?** O responsável pelo sistema precisa operar solicitações de agendamento, disponibilidade, confirmações e cancelamentos sem depender de controles manuais dispersos.
- **Como funciona atualmente?** Ainda não há uma frente administrativa consolidada para acompanhar o ciclo do agendamento e orientar o que o cliente vê após solicitar um horário.
- **Por que isso precisa ser resolvido agora?** O painel administrativo é a base para que os horários disponíveis sejam confiáveis, para que solicitações não sejam perdidas e para que o cliente receba uma comunicação coerente sobre o estado do agendamento.
- **Quem sofre o impacto do problema?** O administrador sofre impacto operacional direto; o cliente sofre quando não entende se o horário foi solicitado, confirmado, cancelado ou ainda aguarda o momento do atendimento; o profissional sofre quando não há clareza sobre confirmações vinculadas à agenda.

---

## 3. Objetivo da Feature
- **O que se deseja alcançar?** Permitir que o administrador único acompanhe e controle a agenda, os agendamentos e as configurações essenciais da experiência do cliente.
- **Qual mudança de comportamento esta feature deve gerar?** O fluxo deixa de depender de acompanhamento informal e passa a ter estados, ações, regras e mensagens claras para cada agendamento.
- **Qual o resultado final esperado do ponto de vista do usuário?** O administrador sabe quais horários estão disponíveis, quais solicitações precisam de ação, quem já confirmou, quem confirmou primeiro e quais informações serão exibidas ao cliente.

---

## 4. Escopo
### 4.1 O que está incluído (dentro do O QUE)
- [ ] Listagem principal de agendamentos em cards com dados essenciais e status.
- [ ] Exibição padrão de agendamentos em `aguardando agendamento` e confirmados, sem listar cancelados na tela principal.
- [ ] Ação administrativa de confirmar agendamento, com confirmação explícita da ação e prevenção de confirmação duplicada.
- [ ] Ação administrativa de cancelar agendamento, com confirmação explícita da ação e liberação do horário para nova solicitação.
- [ ] Disponibilização de mensagem de confirmação e cancelamento para envio ao cliente por canal de conversa.
- [ ] Controle manual de datas e horários disponíveis para agendamento.
- [ ] Bloqueio imediato de horário quando houver solicitação em `aguardando agendamento` ou agendamento confirmado.
- [ ] Garantia de que dois clientes não reservem o mesmo horário.
- [ ] Profissional único configurado fora da interface administrativa, sem edição pelo admin na v1.
- [ ] Configuração de cores básicas exibidas na área do cliente.
- [ ] Configuração de textos exibidos ao cliente após solicitação de agendamento.
- [ ] Registro da confirmação do profissional e do administrador.
- [ ] Exibição, no painel administrativo, de quem confirmou primeiro com base no timestamp.
- [ ] Permanência do status canônico `aguardando agendamento` após a confirmação do profissional e do administrador, até a chegada da data/horário do atendimento.

### 4.2 O que está explicitamente fora do escopo
- [ ] Cadastro público de administrador.
- [ ] Recuperação pública de senha, login social, múltiplos administradores, perfis ou permissões administrativas.
- [ ] CRUD completo de profissionais.
- [ ] Edição do profissional único pela interface administrativa.
- [ ] Histórico avançado, auditoria completa e exportação de dados.
- [ ] Disponibilidade recorrente automatizada.
- [ ] Lista de espera para horários ocupados.
- [ ] Editor completo de conteúdo da área pública.
- [ ] Mudança automática para confirmado quando profissional e administrador confirmam.
- [ ] Integração paga ou automatizada com provedor externo de mensagens.

---

## 5. Usuários & Personas
- **Quem é o usuário principal?** Administrador único responsável pela operação dos agendamentos.
- **Qual é seu objetivo ao usar essa feature?** Controlar solicitações, disponibilidade, confirmações, cancelamentos e configurações do cliente com baixa fricção.
- **Quais dores/dificuldades essa feature resolve pra ele?** Reduz risco de horário duplicado, falta de clareza sobre status, perda de solicitações, mensagens inconsistentes e configuração manual fora do painel.

### 5.1 Histórias de Usuário (User Stories)
- **US-01**: Como administrador, quero visualizar os agendamentos em cards para acompanhar rapidamente cliente, telefone, profissional, data, horário e status.
- **US-02**: Como administrador, quero confirmar uma solicitação de agendamento para registrar que ela foi validada administrativamente.
- **US-03**: Como administrador, quero cancelar uma solicitação de agendamento para impedir atendimento indevido e liberar o horário.
- **US-04**: Como administrador, quero disponibilizar uma mensagem de confirmação ou cancelamento para comunicar o cliente com os dados corretos do agendamento.
- **US-05**: Como administrador, quero controlar datas e horários disponíveis para que clientes só solicitem horários liberados.
- **US-06**: Como cliente, quero que um horário solicitado deixe de aparecer como disponível para evitar disputa com outro cliente.
- **US-07**: Como administrador, quero usar o profissional único já configurado para associar agenda e mensagens sem gerenciar múltiplos profissionais.
- **US-08**: Como administrador, quero configurar cores básicas da área do cliente para manter a experiência visual alinhada ao negócio.
- **US-09**: Como administrador, quero configurar os textos exibidos após a solicitação para orientar o cliente corretamente.
- **US-10**: Como administrador, quero ver se profissional e administrador já confirmaram para entender o progresso do agendamento.
- **US-11**: Como administrador, quero ver quem confirmou primeiro pelo timestamp para acompanhar a ordem das confirmações.
- **US-12**: Como administrador, quero que o status permaneça `aguardando agendamento` após as confirmações até a chegada do horário para manter o estado operacional correto.

---

## 6. Regras de Negócio (alto nível)
- **RN-01** -- A tela principal deve listar agendamentos em `aguardando agendamento` e confirmados.
- **RN-02** -- Agendamentos cancelados não devem aparecer na listagem principal.
- **RN-03** -- Um agendamento em `aguardando agendamento` deve permitir ações administrativas de confirmar e cancelar.
- **RN-04** -- Um agendamento confirmado deve indicar claramente essa condição e não deve permitir confirmação duplicada.
- **RN-05** -- Ao cancelar um agendamento, o horário deve voltar a ficar disponível para nova solicitação.
- **RN-06** -- O cliente só pode solicitar datas e horários previamente liberados pelo administrador.
- **RN-07** -- Um horário deve ficar indisponível assim que houver solicitação em `aguardando agendamento`.
- **RN-08** -- Um horário confirmado também deve permanecer indisponível.
- **RN-09** -- Dois clientes nunca podem reservar o mesmo horário.
- **RN-10** -- A v1 deve operar com um único profissional previamente configurado fora da interface administrativa.
- **RN-11** -- O administrador não deve criar, editar, ativar, desativar ou excluir profissionais na v1.
- **RN-12** -- As cores configuráveis da área do cliente devem preservar legibilidade.
- **RN-13** -- Os textos pós-solicitação devem ser configuráveis pelo administrador e exibidos ao cliente após a solicitação.
- **RN-14** -- Profissional e administrador são as duas partes que podem confirmar.
- **RN-15** -- Quando profissional e administrador confirmarem, o status canônico deve permanecer `aguardando agendamento`.
- **RN-16** -- O status `aguardando agendamento` deve permanecer até a chegada da data/horário do atendimento.
- **RN-17** -- O painel administrativo deve exibir quem confirmou primeiro conforme timestamp.
- **RN-18** -- Não deve existir cadastro público de administrador nem múltiplos perfis administrativos.

---

## 7. Fluxo Comportamental (não técnico)
### 7.1 Fluxo Principal
1. O administrador acessa a área administrativa.
2. O sistema apresenta a listagem principal de agendamentos em cards.
3. O administrador identifica solicitações em `aguardando agendamento`.
4. O administrador confirma ou cancela uma solicitação.
5. O sistema pede confirmação explícita da ação.
6. Ao confirmar, o sistema registra a confirmação administrativa e permite comunicar o cliente.
7. Ao cancelar, o sistema registra o cancelamento, libera o horário e permite comunicar o cliente.
8. O administrador gerencia datas e horários que podem receber solicitações.
9. O cliente só encontra horários liberados e não ocupados.
10. O administrador ajusta cores e textos que serão refletidos na experiência do cliente.
11. Quando profissional e administrador confirmam, o painel mostra quem confirmou primeiro e mantém o agendamento em `aguardando agendamento` até a chegada do horário.

### 7.2 Fluxos Alternativos
- Se o administrador tentar confirmar um agendamento já confirmado, o sistema deve impedir a duplicidade e informar que a confirmação já existe.
- Se o administrador cancelar um agendamento, ele deve deixar de aparecer na listagem principal.
- Se um horário já estiver ocupado por solicitação ou confirmação, o cliente não deve conseguir reservá-lo.
- Se duas pessoas tentarem solicitar o mesmo horário ao mesmo tempo, apenas uma solicitação deve ser aceita.
- Se uma configuração visual prejudicar legibilidade, o sistema deve impedir o salvamento e orientar correção.
- Se o profissional ainda não tiver confirmado, o painel deve mostrar apenas a confirmação existente e deixar claro qual parte está pendente.
- Se o horário do atendimento chegar, o estado `aguardando agendamento` deve ser encerrado conforme a próxima regra operacional definida na etapa seguinte. [DELEGAR_TECH_SPEC]

---

## 8. Critérios de Aceite (O QUE deve acontecer)
- [ ] **CA-01**: DADO que o administrador acessa a listagem principal QUANDO existirem agendamentos em `aguardando agendamento` ou confirmados ENTÃO o sistema exibe esses agendamentos em cards com cliente, telefone, profissional, data, horário e status.
- [ ] **CA-02**: DADO que existem agendamentos cancelados QUANDO o administrador acessa a listagem principal ENTÃO esses agendamentos não aparecem na listagem principal.
- [ ] **CA-03**: DADO um agendamento em `aguardando agendamento` QUANDO o administrador escolhe confirmar ENTÃO o sistema solicita confirmação da ação antes de registrar a confirmação administrativa.
- [ ] **CA-04**: DADO um agendamento já confirmado QUANDO o administrador visualiza o card ENTÃO o sistema indica claramente que ele já está confirmado e não permite nova confirmação.
- [ ] **CA-05**: DADO um agendamento em `aguardando agendamento` QUANDO o administrador escolhe cancelar e confirma a ação ENTÃO o sistema registra o cancelamento, remove o agendamento da listagem principal e libera o horário.
- [ ] **CA-06**: DADO uma confirmação ou cancelamento registrado QUANDO o administrador deseja comunicar o cliente ENTÃO o sistema disponibiliza uma mensagem com nome, data, horário e profissional.
- [ ] **CA-07**: DADO que o administrador define datas e horários disponíveis QUANDO o cliente procura horários ENTÃO apenas horários liberados e desocupados podem ser solicitados.
- [ ] **CA-08**: DADO que um cliente solicita um horário disponível QUANDO a solicitação é aceita ENTÃO esse horário deixa imediatamente de estar disponível para outros clientes.
- [ ] **CA-09**: DADO que duas pessoas tentam solicitar o mesmo horário simultaneamente QUANDO o sistema processa as solicitações ENTÃO no máximo uma solicitação é aceita.
- [ ] **CA-10**: DADO que a v1 opera com profissional único QUANDO o administrador usa agenda, cards ou mensagens ENTÃO o sistema usa o profissional previamente configurado e não oferece CRUD de profissionais.
- [ ] **CA-11**: DADO que o administrador acessa configurações de aparência QUANDO informa cores válidas e legíveis ENTÃO o sistema salva as cores para a área do cliente.
- [ ] **CA-12**: DADO que o administrador informa cores que prejudicam legibilidade QUANDO tenta salvar ENTÃO o sistema impede o salvamento e informa o problema.
- [ ] **CA-13**: DADO que o administrador acessa configurações de agendamento QUANDO altera título, descrição, dicas ou avisos ENTÃO o sistema salva os textos para exibição ao cliente após a solicitação.
- [ ] **CA-14**: DADO um agendamento com confirmação do profissional e do administrador QUANDO o administrador visualiza o card ENTÃO o sistema mostra ambas as confirmações, quem confirmou primeiro e mantém o status `aguardando agendamento`.
- [ ] **CA-15**: DADO um agendamento em `aguardando agendamento` com ambas as confirmações QUANDO a data/horário do atendimento ainda não chegou ENTÃO o sistema mantém esse status.
- [ ] **CA-16**: DADO uma pessoa não autorizada QUANDO tenta realizar ações administrativas ENTÃO o sistema impede acesso a listagens, confirmações, cancelamentos, disponibilidade e configurações administrativas.

---

## 9. Restrições & Considerações
- Existe apenas um administrador.
- As credenciais administrativas devem ser previamente configuradas pelo responsável pelo sistema.
- Não há cadastro público, recuperação pública de senha, login social, múltiplos usuários administrativos, perfis ou roles administrativas.
- A interface administrativa deve priorizar uso em dispositivos móveis, contraste, legibilidade e áreas de toque adequadas.
- A interface administrativa deve usar tema escuro e não deve ser excessivamente colorida.
- A experiência do cliente deve refletir as cores e textos configurados pelo administrador.
- Informações pessoais de clientes, como nome e telefone, devem ficar disponíveis apenas para quem tem permissão administrativa.
- O cliente pode consultar disponibilidade pública, solicitar agendamento e visualizar configurações necessárias à experiência pública.
- O cliente não pode alterar agenda, horários, profissionais, configurações ou agendamentos administrativos.
- A prevenção de reserva duplicada de horário é obrigatória. [DELEGAR_TECH_SPEC]
- Detalhes de autenticação, autorização, armazenamento, comunicação externa e consistência de reserva devem ser definidos na etapa técnica. [DELEGAR_TECH_SPEC]

---

## 10. Métricas de Sucesso
- Percentual de agendamentos em `aguardando agendamento` tratados pelo administrador sem intervenção fora do painel.
- Redução de solicitações com horário duplicado para zero.
- Redução de mensagens manuais inconsistentes enviadas ao cliente.
- Percentual de horários exibidos ao cliente que correspondem à agenda liberada pelo administrador.
- Tempo médio do administrador para identificar solicitações pendentes e agir sobre elas.
- Percentual de solicitações com confirmação do profissional e do administrador registradas corretamente.

---

## 11. Roadmap / Fases
- **Fase 1:** Núcleo administrativo: listagem, confirmação, cancelamento, agenda manual, profissional único não editável, configurações básicas do cliente e confirmação profissional/admin.
- **Fase 2:** Melhorias operacionais: histórico, filtros avançados, auditoria, exportação e recorrência de horários.
- **Fase 3:** Expansão de produto: múltiplos profissionais, lista de espera, automações de comunicação e gestão ampliada de conteúdo.

---

## 12. Rastreabilidade de User Stories

| User Story | Descrição Resumida | Critério de Aceite Relacionado |
|------------|-------------------|-------------------------------|
| US-01 | Visualizar cards de agendamento | CA-01, CA-02 |
| US-02 | Confirmar solicitação | CA-03, CA-04 |
| US-03 | Cancelar solicitação | CA-05 |
| US-04 | Comunicar cliente após ação | CA-06 |
| US-05 | Controlar datas e horários disponíveis | CA-07 |
| US-06 | Impedir disputa de horário pelo cliente | CA-08, CA-09 |
| US-07 | Usar profissional único configurado | CA-10 |
| US-08 | Configurar cores da área do cliente | CA-11, CA-12 |
| US-09 | Configurar textos pós-solicitação | CA-13 |
| US-10 | Ver confirmações das partes | CA-14 |
| US-11 | Ver quem confirmou primeiro | CA-14 |
| US-12 | Manter status aguardando agendamento | CA-15 |
| US-01, US-02, US-03, US-05, US-08, US-09, US-10, US-11, US-12 | Proteger ações administrativas | CA-16 |

---

## 13. Checklist Final
- [x] PRD descreve apenas O QUE / POR QUÊ
- [x] Escopo fechado
- [x] User Stories definidas e numeradas (US-XX)
- [x] Critérios de aceite claros
- [x] Tabela de rastreabilidade preenchida
- [x] Pronto para criar o TECH_SPEC (COMO)
