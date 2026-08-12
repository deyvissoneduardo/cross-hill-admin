# DESIGN — Especificação de Design (Web)

## 1. Identificação
- **Feature/Projeto**: Painel administrativo de agendamentos
- **Frente**: web
- **Documento de Definição**: `docs/prds/features/painel-admin-agendamentos/v1/prd.md`
- **Design System Global**: inexistente
- **Origem do Design**: Descritivo + inferido do tema mínimo existente no projeto
- **Referências**: `docs/prds/features/painel-admin-agendamentos/v1/prd.md`, `docs/specs/features/painel-admin-agendamentos/v1/pre-refinement.md`, `app/globals.css`, `app/page.tsx`
- **Autor**: usuário + agent-spec-generate-design
- **Data**: 2026-08-10
- **Status**: Refinando

---

## 2. Princípios Visuais da Feature

O painel deve ser escuro, utilitário, denso e orientado à operação repetida. A hierarquia visual prioriza o que exige ação do administrador: status, data/horário, confirmação das partes e botões de confirmar/cancelar. A interface evita decoração e usa superfícies discretas, contraste alto, cards compactos e feedback visual direto.

---

## 3. Design System Aplicável

### 3.1 Tokens Utilizados

| Categoria | Tokens | Origem |
|-----------|--------|--------|
| Cores | `--background`, `--foreground`; escala Tailwind neutra (`zinc`/`black`/`white`) para superfícies, bordas e textos; cores semânticas para sucesso, alerta e erro | `app/globals.css`, Tailwind disponível no projeto |
| Tipografia | `--font-sans`, `--font-mono`; pesos regular, medium e semibold | `app/globals.css`, template inicial |
| Espaçamento | escala Tailwind (`2`, `3`, `4`, `6`, `8`) com áreas de toque mínimas de 44px | Tailwind disponível no projeto |
| Raio e borda | raio de 8px para cards/formulários/dialogs; bordas sutis em superfícies escuras | novo padrão específico da feature |

### 3.2 Componentes Reutilizados

| Componente | Origem (design system / biblioteca / path) | Uso nesta feature |
|------------|--------------------------------------------|-------------------|
| Tokens globais mínimos | `app/globals.css` | base de tema claro/escuro e tipografia |
| Utilitários de layout e espaçamento | Tailwind disponível no projeto | composição responsiva, grid, espaçamentos, contraste |
| Página inicial de referência | `app/page.tsx` | confirma uso de utilitários Tailwind, dark mode e tipografia existente |

### 3.3 Componentes e Tokens Novos

| Item | Tipo (componente/token) | Justificativa (por que o existente não atende) | Promover ao global? |
|------|--------------------------|-----------------------------------------------|---------------------|
| Card de agendamento | componente | O projeto não possui componente de card operacional; a feature precisa de bloco denso com status, dados e ações. | Não nesta etapa |
| Badge de status | componente | Necessário diferenciar `aguardando agendamento`, confirmado e cancelado com leitura rápida. | Não nesta etapa |
| Linha de confirmação | componente | Necessária para mostrar profissional/admin, pendências e quem confirmou primeiro. | Não nesta etapa |
| Slot de horário | componente | Necessário representar horários livres, bloqueados, liberados e selecionáveis na agenda. | Não nesta etapa |
| Dialog de confirmação | componente | Necessário para ações administrativas destrutivas ou definitivas. | Não nesta etapa |
| Banner inline | componente | Necessário para erros recuperáveis sem tirar o usuário do fluxo. | Não nesta etapa |
| Toast/snackbar operacional | componente | Necessário para feedback breve após salvar, confirmar ou cancelar. | Não nesta etapa |
| Prévia de aparência do cliente | componente | Necessária para validar visualmente cores configuradas antes de salvar. | Não nesta etapa |

---

## 4. Mapa Visual de Telas

### 4.1 Login Administrativo

- **Rota**: área de login administrativo.
- **Propósito visual**: permitir entrada do administrador único com baixa distração.
- **Layout**: tela full-height em fundo quase preto; bloco central estreito com título, subtítulo curto, campos de e-mail e senha empilhados, botão principal em largura total e feedback inline abaixo dos campos. Em telas largas, o bloco continua centralizado e não vira layout editorial.
- **Componentes**: campos de formulário, botão principal, banner inline compacto.

```
┌──────────────────────────────┐
│      Acesso administrativo    │
│  E-mail                       │
│  Senha                        │
│  [Entrar]                     │
│  mensagem de erro inline      │
└──────────────────────────────┘
```

### 4.2 Dashboard de Agendamentos

- **Rota**: área inicial administrativa.
- **Propósito visual**: dar ao administrador uma fila operacional de agendamentos que exigem leitura e ação rápida.
- **Layout**: cabeçalho fixo no topo da área com título, contadores por status e ação secundária para atualizar. Abaixo, cards responsivos: lista de uma coluna no mobile; grid de duas colunas em telas médias; até três colunas em telas largas. Cada card mostra status no topo, data/horário em destaque, cliente/telefone, profissional, confirmação do profissional e administrador, quem confirmou primeiro e ações no rodapé.
- **Componentes**: card de agendamento, badge de status, linha de confirmação, botões de ação, toast/snackbar, dialog de confirmação.

```
Painel de agendamentos       [Atualizar]
[Aguardando: 8] [Confirmados: 3]

┌──────────────────────────────┐
│ Badge status       15/08 09h │
│ João · telefone              │
│ Profissional configurado     │
│ Profissional: pendente       │
│ Admin: confirmado 14:32      │
│ Primeiro: administrador      │
│ [Confirmar] [Cancelar]       │
└──────────────────────────────┘
```

### 4.3 Agenda e Disponibilidade

- **Rota**: área administrativa de agenda.
- **Propósito visual**: permitir que o administrador visualize uma data e controle horários disponíveis.
- **Layout**: no mobile, seletor de data no topo, resumo do profissional único em bloco somente leitura e lista de slots em grade de duas colunas. Em telas médias e largas, a tela divide data/resumo à esquerda e slots à direita. Slots usam aparência distinta para disponível, bloqueado, ocupado e inativo.
- **Componentes**: seletor de data, bloco de profissional, slot de horário, botões secundários, banner inline, toast/snackbar.

### 4.4 Configurações de Aparência

- **Rota**: área de configurações de aparência.
- **Propósito visual**: permitir configurar cores da área do cliente com validação visual e legibilidade.
- **Layout**: formulário em uma coluna no mobile com campos de cor e mensagens de validação inline. A prévia da área do cliente aparece abaixo do formulário no mobile e à direita no desktop, mantendo proporção estável. A ação de salvar fica fixa ao fim do formulário, não no topo.
- **Componentes**: campos de cor, prévia de aparência, banner inline, botão principal, toast/snackbar.

### 4.5 Configurações de Pós-Agendamento

- **Rota**: área de configurações de agendamento.
- **Propósito visual**: permitir configurar textos que o cliente verá após solicitar um horário.
- **Layout**: formulário com título, descrição, lista de dicas e lista de avisos. A prévia do resultado aparece em bloco separado, abaixo no mobile e ao lado no desktop. Itens de dicas e avisos aparecem como linhas editáveis com ação de remover.
- **Componentes**: campos de texto, lista editável, prévia de pós-agendamento, botão principal, banner inline, toast/snackbar.

### 4.6 Diálogos de Confirmação e Cancelamento

- **Rota**: N/A — padrão visual reutilizado nas telas operacionais.
- **Propósito visual**: impedir ações acidentais e deixar claro o impacto da confirmação ou cancelamento.
- **Layout**: dialog central com título direto, resumo do agendamento, texto de consequência e duas ações. A ação primária confirma a intenção; a secundária retorna ao fluxo. Cancelamento usa cor de erro com parcimônia apenas na ação destrutiva.
- **Componentes**: dialog de confirmação, botões principal/secundário/destrutivo.

---

## 5. Estados Visuais por Tela

| Tela / Componente | Loading | Sucesso | Erro | Vazio |
|-------------------|---------|---------|------|-------|
| Login Administrativo | Botão entra em estado ocupado e campos permanecem visíveis; não usar tela cheia. | Entrada bem-sucedida segue para a área administrativa sem mensagem intermediária. | Mensagem inline abaixo dos campos: "Não foi possível entrar. Verifique os dados e tente novamente." | N/A — tela sempre possui formulário. |
| Dashboard de Agendamentos | Skeleton de 3 cards com linhas para status, horário, cliente e ações. | Toast: "Agendamento atualizado." após confirmação/cancelamento; card reflete novo estado. | Banner no topo da lista: "Não foi possível carregar os agendamentos." com ação "Tentar novamente". | Bloco central: "Nenhum agendamento para acompanhar agora." com ação "Atualizar". |
| Card de Agendamento | Skeleton local quando um card está atualizando após ação. | Badge e linhas de confirmação atualizam no próprio card; toast confirma a ação. | Erro inline no rodapé do card: "Ação não concluída. Tente novamente." | N/A — card só existe quando há agendamento. |
| Agenda e Disponibilidade | Skeleton de calendário/data e 8 slots cinza escuro. | Toast: "Disponibilidade salva." e slots mudam de aparência imediatamente. | Banner: "Não foi possível carregar a agenda." com ação "Tentar novamente". | Bloco na área de slots: "Nenhum horário nesta data." com ação "Adicionar horário". |
| Configurações de Aparência | Skeleton de campos e prévia em bloco neutro. | Toast: "Aparência salva." e prévia mantém as cores salvas. | Validação inline por campo e banner se o salvamento falhar. | N/A — formulário sempre possui campos mínimos. |
| Configurações de Pós-Agendamento | Skeleton de campos e prévia textual. | Toast: "Textos salvos." e prévia reflete o conteúdo. | Validação inline nos campos obrigatórios e banner se o salvamento falhar. | Prévia mostra estado mínimo com título/descrição padrão quando ainda não houver textos salvos. |
| Diálogos de Confirmação e Cancelamento | Ação primária entra em estado ocupado; demais ações ficam desabilitadas. | Dialog fecha e toast confirma resultado. | Mensagem inline dentro do dialog: "Não foi possível concluir a ação." com ação "Tentar novamente". | N/A — dialog sempre abre a partir de um item existente. |

### 5.1 Mensagens e Ações de Recuperação

| Cenário | Mensagem exibida (literal) | Ação oferecida |
|---------|----------------------------|----------------|
| Falha ao carregar agendamentos | "Não foi possível carregar os agendamentos." | Tentar novamente |
| Lista sem agendamentos | "Nenhum agendamento para acompanhar agora." | Atualizar |
| Falha ao confirmar | "Não foi possível confirmar o agendamento." | Tentar novamente |
| Falha ao cancelar | "Não foi possível cancelar o agendamento." | Tentar novamente |
| Confirmação duplicada | "Este agendamento já foi confirmado." | Entendi |
| Falha ao carregar agenda | "Não foi possível carregar a agenda." | Tentar novamente |
| Data sem horários | "Nenhum horário nesta data." | Adicionar horário |
| Cores inválidas | "Ajuste as cores para manter a leitura confortável." | Corrigir campos destacados |
| Falha ao salvar configuração | "Não foi possível salvar as configurações." | Tentar novamente |

---

## 6. Responsividade

- **Abordagem**: mobile-first.
- **Breakpoints**: Tailwind (`sm`, `md`, `lg`) conforme utilitários disponíveis no projeto.

| Faixa (usar nomes do projeto) | O que muda no layout |
|-------------------------------|----------------------|
| Base / celular | Navegação e conteúdo em uma coluna; cards em lista; ações principais em largura total; formulários empilhados; prévias abaixo dos campos. |
| `sm` / celular largo | Espaçamento aumenta levemente; botões relacionados podem ficar lado a lado quando couberem sem quebrar texto. |
| `md` / tablet | Dashboard usa grid de 2 colunas; agenda divide resumo/data e slots; configurações podem mostrar prévia ao lado quando houver largura. |
| `lg` / desktop | Dashboard pode usar até 3 colunas; conteúdo recebe largura máxima para leitura; painéis laterais permanecem fixos apenas se não comprimirem cards. |

---

## 7. Tema e Modo Escuro

- **Tema**: herda os tokens mínimos existentes do projeto e aplica direção escura utilitária para o admin. Superfícies devem usar cinzas escuros com contraste suficiente contra texto claro; cores semânticas aparecem apenas em badges, estados e ações críticas.
- **Dark mode**: suportado pelo projeto via `prefers-color-scheme` e classes dark existentes no template inicial. Nesta feature, o painel administrativo deve priorizar dark theme mesmo quando a área pública do cliente tiver cores configuráveis.

---

## 8. Interações e Motion

| Interação | Comportamento visual | Duração/Easing (se relevante) |
|-----------|----------------------|-------------------------------|
| Hover em card acionável | Elevação visual sutil por mudança de borda/fundo, sem deslocar layout. | 150ms ease-out |
| Clique em confirmar/cancelar | Abre dialog; botão acionado mostra estado ocupado após confirmação. | Dialog aparece sem animação chamativa; 150ms |
| Salvamento de configurações | Botão fica ocupado; toast aparece após sucesso; foco permanece na tela atual. | Toast entra/sai com transição curta |
| Alteração de cores | Prévia atualiza visualmente conforme o usuário edita, sem piscar ou reposicionar conteúdo. | Transição de cor curta, respeitando reduced motion |
| Seleção de data/slot | Slot muda de estado visual imediatamente após ação concluída. | 120ms |

---

## 9. Acessibilidade Visual

- **Contraste**: textos principais em superfícies escuras devem usar contraste alto; textos secundários podem ser mais suaves, mas nunca competir com bordas de baixa opacidade. Badges de status devem combinar cor e texto, não depender só de cor.
- **Foco visível**: todo botão, campo, slot e ação de card deve exibir anel de foco claro e afastado da borda para navegação por teclado.
- **Alvos de clique**: ações principais, slots e botões devem respeitar mínimo visual de 44px de altura/toque. Em cards densos, ícones sem texto só podem aparecer com rótulo acessível e área de toque preservada.
- **Reduced motion**: transições de hover, toast e cor devem ser removidas ou reduzidas quando o usuário preferir movimento reduzido.

---

## 10. Assets Necessários

| Asset | Tipo (ícone/ilustração/imagem/fonte) | Origem (biblioteca do projeto / a produzir / link) |
|-------|---------------------------------------|---------------------------------------------------|
| Ícone de atualizar | ícone | biblioteca de ícones a definir na tech spec; se não houver biblioteca, usar texto no botão |
| Ícone de confirmação | ícone | biblioteca de ícones a definir na tech spec; opcional se o botão tiver texto claro |
| Ícone de cancelamento | ícone | biblioteca de ícones a definir na tech spec; opcional se o botão tiver texto claro |
| Ícone de alerta/erro | ícone | biblioteca de ícones a definir na tech spec; pode ser substituído por texto e cor semântica |
| Ilustrações | ilustração | N/A — não usar ilustrações na v1; estados vazios devem ser textuais e utilitários |
| Fontes novas | fonte | N/A — herdar fonte do projeto |

---

## 11. Observações e Pontos em Aberto

- **Candidatos a ADR (tag `ui`)**: nenhum; as decisões são específicas desta feature e não estabelecem trade-off transversal confirmado.
- **Dependências de produto**: regra final após a chegada da data/horário do atendimento permanece fora deste design; o documento apenas reflete que `aguardando agendamento` existe até esse momento.
- **Deixado para a tech spec**: autenticação, autorização, armazenamento, consistência de reserva, biblioteca de ícones, mecanismo de envio de mensagem, rotas finais e contratos de dados.
- **Design system global**: não foi criado nem atualizado; os componentes novos ficam feature-local nesta etapa porque o projeto ainda não possui biblioteca visual consolidada e não houve confirmação para promoção global.

---

## 12. Checklist Final

- [x] Toda tela do PRD/Intent tem entrada no Mapa Visual (seção 4)
- [x] Toda tela tem os 4 estados especificados com comportamento concreto (seção 5)
- [x] Componentes classificados: reuso com origem (3.2) vs novos justificados (3.3)
- [x] Tokens referenciam o design system/projeto — nada inventado em paralelo
- [x] Responsividade definida por faixa (seção 6)
- [x] Tema/dark mode resolvido ou marcado N/A (seção 7)
- [x] Acessibilidade visual coberta (seção 9)
- [x] Assets listados com origem (seção 10)
- [x] Nenhuma regra de negócio; nenhuma mecânica técnica (estado/API/arquivos de código)
- [x] Candidatos ao design-system.md global confirmados com o usuário
