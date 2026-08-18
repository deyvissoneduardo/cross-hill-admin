# Pré-Refinamento — Exclusão lógica de agendamentos

> Artefato intermediário de discovery. Linhas sem marcação são fatos informados pelo usuário; inferências aparecem como `[HIPÓTESE]`.

## 1. Metadados

- **Nome da Ideia / Feature**: Exclusão lógica de agendamentos
- **Fonte da ideia**: texto livre
- **Autor**: usuário do projeto
- **Data**: 2026-08-18
- **Versão**: v1
- **Status**: Pronto para próxima etapa
- **Relacionados**: `painel-admin-agendamentos/v1` e `painel-admin-agendamentos/v2-debits`

## 2. Ideia Resumida

Permitir que o administrador oculte da tela um card já cancelado sem apagar definitivamente o registro do agendamento.

## 3. Esqueleto do Tema

| # | Ramo | Status (Fase 1) |
|---|---|---|
| A | Definir quais cards podem ser excluídos | explorar |
| B | Evitar exclusão lógica acidental | explorar |
| C | Definir onde ficam os cards excluídos | explorar |
| D | Decidir se haverá recuperação imediata | explorar |

## 4. Árvore de Rumos

### Ramo A — Cards elegíveis

**Direções candidatas:**

- **A1 — Somente cancelados**: a exclusão lógica aparece apenas após o cancelamento.
  - _Exemplo:_ um atendimento cancelado pode ser removido da visão diária sem afetar um atendimento pendente.
  - _Viabilidade:_ aproveita o estado de cancelamento já visível no painel.
- **A2 — Qualquer card**: ativos e cancelados podem ser ocultados.
  - _Exemplo:_ um agendamento futuro ainda pendente poderia desaparecer do painel.
  - _Viabilidade:_ aumenta o risco de confundir exclusão com cancelamento.

**Direção escolhida**: A1 — o usuário aprovou a versão mínima recomendada.
**Podadas / adiadas**: A2, porque pode retirar um agendamento ativo do fluxo operacional sem cancelá-lo.

### Ramo B — Confirmação da ação

**Direções candidatas:**

- **B1 — Confirmação obrigatória**: o administrador confirma que deseja ocultar o card.
  - _Exemplo:_ ao selecionar “Excluir”, uma mensagem informa que o registro será preservado, mas sairá do painel.
  - _Viabilidade:_ o projeto já usa confirmação para ações sensíveis em cards.
- **B2 — Exclusão imediata**: um clique oculta o card.
  - _Exemplo:_ tocar acidentalmente no botão remove o item da lista sem uma pausa de segurança.
  - _Viabilidade:_ simples, mas inadequada para uma ação de remoção.

**Direção escolhida**: B1 — confirmação obrigatória.
**Podadas / adiadas**: B2, pelo risco de acionamento acidental.

### Ramo C — Destino do card

**Direções candidatas:**

- **C1 — Ocultar da lista atual**: o card deixa de aparecer no painel após a exclusão lógica.
  - _Exemplo:_ a lista fica limpa, mantendo apenas os registros ainda relevantes para a operação.
  - _Viabilidade:_ extensão direta da listagem existente.
- **C2 — Área de excluídos**: os cards saem da lista principal e aparecem em uma seção própria.
  - _Exemplo:_ um filtro “Excluídos” permite consultar itens antigos.
  - _Viabilidade:_ amplia navegação, estados e decisões do produto.

**Direção escolhida**: C1 — ocultação simples na primeira versão.
**Podadas / adiadas**: C2, adiada para uma versão futura.

### Ramo D — Recuperação

**Direções candidatas:**

- **D1 — Sem restauração na interface**: o registro é preservado, mas não pode ser recuperado pelo painel nesta versão.
  - _Exemplo:_ um card excluído não volta a aparecer por ação do administrador.
  - _Viabilidade:_ mantém o fluxo inicial pequeno.
- **D2 — Permitir restaurar**: uma ação devolve o card excluído à lista.
  - _Exemplo:_ o administrador corrige uma exclusão feita por engano.
  - _Viabilidade:_ depende de uma área ou filtro para localizar excluídos.

**Direção escolhida**: D1 — sem restauração nesta versão.
**Podadas / adiadas**: D2, adiada junto com a área de excluídos.

## 5. Problema

- **Dor atual**: cards cancelados permanecem na tela e podem poluir a visão operacional.
- **Como aparece**: o administrador continua vendo registros que já não exigem ação.
- **Quem sente o impacto**: administrador do painel.
- **Por que resolver agora**: a listagem passou a preservar cancelados como histórico visível e precisa de uma forma segura de removê-los da visão cotidiana.

## 6. Objetivo Principal

- Permitir que o administrador retire cards cancelados da listagem sem destruir o histórico.
- Após a confirmação, o card deve deixar de aparecer na tela.

## 7. Público / Usuário Envolvido

- **Persona primária**: administrador único do painel.
- **Persona secundária**: nenhuma.
- **Contexto de uso**: organização da lista administrativa de agendamentos.

## 8. Escopo Inicial

- [ ] Exibir a opção de exclusão lógica somente em cards cancelados.
- [ ] Solicitar confirmação antes de concluir a ação.
- [ ] Ocultar da listagem os registros logicamente excluídos.
- [ ] Preservar os registros excluídos no sistema.

## 9. Fora do Escopo

- Excluir cards ativos — confunde exclusão com cancelamento.
- Apagar definitivamente o registro — contraria a exclusão lógica solicitada.
- Área ou filtro de excluídos — adiado para uma versão futura.
- Restaurar cards pela interface — adiado junto com a área de excluídos.

## 10. Ancoramento no Projeto

- **O que o projeto É**: o `README.md` descreve um painel administrativo de profissional único para gerir agendamentos, confirmações e cancelamentos.
- **PRDs / specs existentes consultados**:
  - `painel-admin-agendamentos/v1` — cobre os cards, a confirmação e o cancelamento; sua regra original de ocultar cancelados diverge do comportamento atual.
  - `painel-admin-agendamentos/v2-debits` — manutenção adjacente, sem fluxo de exclusão lógica.
- **Capacidades reutilizáveis**:
  - **Persistência**: agendamentos e estados já são preservados no Firestore.
  - **Autenticação / autorização**: ações do painel já são restritas ao administrador.
  - **Outros módulos internos**: cards e diálogo de confirmação já existem.
- **Conflitos / sobreposições detectados**: o PRD e a spec v1 afirmam que cancelados não aparecem, mas o código atual e seus testes os mantêm visíveis. A próxima etapa deve alinhar a documentação ao comportamento aprovado.

## 11. Premissas e Decisões já tomadas

**Premissas:**

- [HIPÓTESE] A exclusão lógica serve para reduzir poluição visual, não para alterar o cancelamento ou a disponibilidade do horário.
- [HIPÓTESE] O histórico preservado não precisa ser consultável pela interface nesta versão.

**Decisões já tomadas:**

- Utilizar exclusão lógica.
- Permitir a exclusão somente de cards cancelados.
- Exigir confirmação antes da exclusão.
- Ocultar o card excluído da lista.
- Não oferecer restauração nesta versão.

## 12. Riscos e Pontos de Atenção

- **Produto**: o usuário pode interpretar “Excluir” como apagamento definitivo → explicar na confirmação que o histórico será preservado.
- **Escopo**: área de lixeira e restauração podem ampliar a entrega → manter explicitamente fora desta versão.
- **Operacional**: um item excluído por engano não poderá ser restaurado pela tela → confirmação obrigatória.
- **Privacidade**: dados pessoais continuam preservados → [HIPÓTESE] a política futura de retenção deverá tratar descarte definitivo separadamente.

## 13. Dúvidas em Aberto

Nenhuma dúvida bloqueante para a próxima etapa.

## 14. Síntese do Brainstorm

- **Absorvido**: exclusão lógica somente de cancelados, com confirmação e ocultação da lista.
- **Descartado**: exclusão de cards ativos e exclusão física.
- **Adiado**: área de excluídos e restauração.
- **Provocação decisiva**: separar claramente “Cancelar” de “Excluir” evita remover silenciosamente um agendamento ainda ativo.

## 15. Recomendação de Framework

### 15.1 Complexidade Observada

| Dimensão | Valor detectado | Confirmação |
|---|---|---|
| Amplitude — rumos que sobreviveram | 1 | confirmado |
| Personas | dev+1 | inferido |
| Novidade | incremento | inferido |
| Decisão arquitetural transversal nova? | não | inferido |

### 15.2 Framework Recomendado

**Escolhido**: TaskCard

**Justificativa**: há um único fluxo de produto para uma persona e o trabalho incrementa um módulo existente. Não surgiu decisão arquitetural transversal nova.

### 15.3 Alternativas Consideradas

**Por que NÃO miniSpec**: o escopo já convergiu para uma ação pequena, sem múltiplas histórias ou integrações novas que justifiquem intent e scope separados.

**Por que NÃO conversa direta**: a mudança afeta comportamento persistido e interface administrativa, portanto merece critérios de aceite e testes registrados.

### 15.4 Próximo Passo

```bash
/agent-spec-taskcard-generate "adicionar exclusão lógica de cards cancelados"
```

### 15.5 Quando Reconsiderar a Recomendação

- **Upgrade** se entrarem restauração, área de excluídos ou regras de retenção de dados.
- **Downgrade** se a necessidade for somente uma alteração visual sem persistência.

## 16. Checklist Final

- [x] Ideia resumida em uma frase clara
- [x] Esqueleto validado com o usuário
- [x] Árvore com alternativas, exemplos e decisões
- [x] Escopo e fora de escopo delimitados
- [x] Ancoramento no projeto preenchido
- [x] Inferências e dúvidas identificadas
- [x] Framework recomendado e justificado
- [x] Pronto para alimentar uma TaskCard
