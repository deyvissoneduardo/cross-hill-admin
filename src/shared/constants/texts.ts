/**
 * Textos pt-BR centralizados (sem biblioteca de i18n na v1).
 *
 * As mensagens de erro/vazio/sucesso são literais definidos em
 * `docs/specs/features/painel-admin-agendamentos/v1/design.md` §5 e §5.1 —
 * alterar aqui muda a UI, portanto mantenha-as sincronizadas com o design.
 */

export const appTexts = {
  nomeProduto: "Crosshill",
  descricaoProduto: "Agendamentos e painel administrativo Crosshill.",
} as const;

export const adminTexts = {
  areaTitulo: "Painel administrativo",
  loginTitulo: "Acesso administrativo",
  loginSubtitulo: "Entre com as credenciais do administrador para continuar.",
  loginEmailLabel: "E-mail",
  loginSenhaLabel: "Senha",
  loginEnviar: "Entrar",
  loginEnviando: "Entrando...",
  loginFalha: "Não foi possível entrar. Verifique os dados e tente novamente.",
  loginIndisponivel: "Serviço indisponível agora. Tente novamente em instantes.",
  loginSessaoExpirada: "Sua sessão expirou. Entre novamente para continuar.",
  sairAcao: "Sair",
  navDashboard: "Agendamentos",
  navAgenda: "Agenda",
  navAparencia: "Aparência",
  navPosAgendamento: "Pós-agendamento",
  pularParaConteudo: "Pular para o conteúdo",
} as const;

/** Mensagens de recuperação — `design.md` §5.1 (literais). */
export const feedbackTexts = {
  falhaCarregarAgendamentos: "Não foi possível carregar os agendamentos.",
  listaVaziaAgendamentos: "Nenhum agendamento para acompanhar agora.",
  falhaConfirmar: "Não foi possível confirmar o agendamento.",
  falhaCancelar: "Não foi possível cancelar o agendamento.",
  confirmacaoDuplicada: "Este agendamento já foi confirmado.",
  falhaCarregarAgenda: "Não foi possível carregar a agenda.",
  dataSemHorarios: "Nenhum horário nesta data.",
  coresInvalidas: "Ajuste as cores para manter a leitura confortável.",
  falhaSalvarConfiguracoes: "Não foi possível salvar as configurações.",
  falhaSalvarAgenda: "Não foi possível salvar a agenda.",
  disponibilidadeSalva: "Disponibilidade salva.",
  falhaCarregarDisponibilidadePublica: "Não foi possível carregar os horários disponíveis.",
  falhaSolicitarAgendamento: "Não foi possível concluir a solicitação. Tente novamente.",
  falhaGenerica: "Não foi possível concluir a ação. Tente novamente.",
  acaoTentarNovamente: "Tentar novamente",
  acaoAtualizar: "Atualizar",
  acaoEntendi: "Entendi",
  acaoFechar: "Fechar",
  acaoAdicionarHorario: "Adicionar horário",
} as const;

/**
 * Textos da Agenda e Disponibilidade (`design.md` §4.3) — rótulos da tela e do
 * badge de status de cada slot.
 *
 * Separados de `agendamentoTexts`: aquele bloco descreve o agendamento
 * (status, confirmações, ações do card); este descreve a tela de controle
 * manual de horários e o profissional único somente-leitura (US-05/US-07).
 */
export const agendaTexts = {
  tituloPagina: "Agenda e disponibilidade",
  carregandoAgenda: "Carregando agenda...",
  seletorDataLabel: "Data",
  seletorDataAcao: "Ver",
  novoHorarioLabel: "Novo horário",
  liberadoLabel: "Liberado",
  salvarAcao: "Salvar",

  // Badge de status do slot (`AvailabilitySlotDTO.statusVisual`) — combina cor
  // e texto, nunca só cor (`design.md` §9).
  statusDisponivel: "Disponível",
  statusOcupado: "Ocupado",
  statusBloqueado: "Bloqueado",
  statusInativo: "Inativo",

  // Profissional único somente-leitura (PRD RN-10/RN-11, CA-10): sem tela,
  // action ou rota de CRUD.
  profissionalNaoConfigurado: "Nenhum profissional configurado.",
} as const;

/**
 * Textos do painel operacional de agendamentos (`design.md` §4.2 e §4.6).
 *
 * Separados de `adminTexts` porque descrevem o agendamento (status, partes que
 * confirmam, ações do card), não a área administrativa em si: a mesma listagem
 * poderá ser exibida fora do shell administrativo sem arrastar rótulos de login
 * e navegação.
 */
export const agendamentoTexts = {
  painelTitulo: "Painel de agendamentos",
  resumoAguardando: "Aguardando",
  resumoConfirmados: "Confirmados",

  // Status canônico (PRD RN-01/RN-15/RN-16) — badge combina cor E texto (§9).
  statusAguardando: "Aguardando agendamento",
  statusConfirmado: "Confirmado",
  statusCancelado: "Cancelado",

  profissionalRotulo: "Profissional",

  // Linhas de confirmação das duas partes (PRD RN-14/RN-17).
  confirmacoesTitulo: "Confirmações",
  confirmacaoProfissional: "Profissional",
  confirmacaoAdministrador: "Administrador",
  confirmacaoPendente: "pendente",
  confirmacaoRegistrada: "confirmado",
  confirmacaoRegistradaEm: "confirmado em",
  primeiroConfirmadorRotulo: "Primeiro a confirmar",
  primeiroConfirmadorAdmin: "administrador",
  primeiroConfirmadorProfissional: "profissional",

  // Ações do card e dos diálogos (`design.md` §4.6).
  confirmarAcao: "Confirmar",
  cancelarAcao: "Cancelar",
  dialogVoltar: "Voltar",
  confirmarDialogTitulo: "Confirmar agendamento",
  confirmarDialogConsequencia:
    "A confirmação administrativa fica registrada com data e hora e não pode ser desfeita.",
  confirmarDialogAcao: "Confirmar agendamento",
  cancelarDialogTitulo: "Cancelar agendamento",
  cancelarDialogConsequencia:
    "O agendamento sai da listagem e o horário volta a ficar disponível. Não é possível desfazer.",
  cancelarDialogAcao: "Cancelar agendamento",

  // Estados de carregamento (`design.md` §5). O design descreve a FORMA do
  // skeleton, não um literal — estes textos são o rótulo acessível da região que
  // anuncia a carga (§9: o skeleton em si é decorativo e fica oculto do leitor).
  painelCarregando: "Carregando agendamentos...",
  cardAtualizando: "Atualizando agendamento...",

  acaoConcluida: "Agendamento atualizado.",
  comunicacaoTitulo: "Mensagem para o cliente",
  comunicacaoAbrirConversa: "Abrir conversa no WhatsApp",
} as const;

/**
 * Textos das telas de configuração (`design.md` §4.4 e §4.5) — aparência da
 * área do cliente e textos exibidos após a solicitação.
 *
 * Inclui as mensagens de validação dos dois validators da feature: elas são
 * exibidas inline no campo (`Field.error`) e viram a `message` do `AppError`
 * devolvido pela Server Action, então precisam nascer em pt-BR aqui, junto do
 * resto da UI, e não espalhadas pelos módulos que validam.
 *
 * "Ajuste as cores para manter a leitura confortável." NÃO é duplicada aqui: é
 * literal de `design.md` §5.1 e mora em `feedbackTexts.coresInvalidas`.
 */
export const configuracoesTexts = {
  // Aparência (`design.md` §4.4)
  aparenciaTitulo: "Configurações de aparência",
  aparenciaDescricao: "Cores aplicadas à área do cliente.",
  corPrimariaLabel: "Cor de fundo",
  corSecundariaLabel: "Cor do texto",
  corDestaqueLabel: "Cor de destaque",
  aparenciaSalva: "Aparência salva.",
  previewTitulo: "Prévia da área do cliente",
  previewChamada: "Agende seu horário",
  previewTexto: "Escolha um horário disponível e acompanhe a confirmação.",
  previewAcao: "Solicitar horário",

  // Pós-agendamento (`design.md` §4.5)
  posAgendamentoTitulo: "Textos pós-agendamento",
  posAgendamentoDescricao: "Conteúdo exibido ao cliente após a solicitação.",
  tituloLabel: "Título",
  descricaoLabel: "Descrição",
  dicasLabel: "Dicas",
  avisosLabel: "Avisos",
  adicionarDica: "Adicionar dica",
  adicionarAviso: "Adicionar aviso",
  /** Rótulo visível do botão; o nome acessível traz a lista e a posição. */
  removerAcao: "Remover",
  removerDica: "Remover dica",
  removerAviso: "Remover aviso",
  dicaLabel: "Dica",
  avisoLabel: "Aviso",
  textosSalvos: "Textos salvos.",
  previewPosAgendamento: "Prévia do que o cliente verá",
  padraoTitulo: "Solicitação recebida",
  padraoDescricao:
    "Recebemos sua solicitação. Você receberá a confirmação do horário em breve.",

  // Estados compartilhados pelas duas telas (`design.md` §5)
  salvarAcao: "Salvar",
  carregandoConfiguracoes: "Carregando configurações...",
  falhaCarregarConfiguracoes: "Não foi possível carregar as configurações.",

  // Mensagens de validação (motivos devolvidos pelos validators)
  corInvalida: "Informe uma cor no formato #RRGGBB.",
  tituloObrigatorio: "Informe o título exibido ao cliente.",
  descricaoObrigatoria: "Informe a descrição exibida ao cliente.",
  textoLongo: "Texto longo demais.",
  itensDemais: "Há itens demais nesta lista.",
  listaInvalida: "Lista de itens inválida.",
  htmlNaoPermitido: "Não use HTML: o texto é exibido exatamente como escrito.",
} as const;

/**
 * Mensagens de erro do domínio — o texto de cada `AppError` lançado por
 * validators, repositories e services (tech_spec §9: `AppError.message` é sempre
 * exibível ao usuário, em pt-BR).
 *
 * Separadas de `feedbackTexts` porque a origem é outra: `feedbackTexts` espelha
 * 1:1 os literais de `design.md` §5.1 (contrato visual das telas), enquanto estas
 * são o contrato de mensagem do domínio — nenhuma delas está no design. Ambas
 * moram neste arquivo por tech_spec §12.2 (textos centralizados).
 *
 * `confirmacaoDuplicada` NÃO é duplicada aqui de propósito: ela existe nos dois
 * mundos e o literal do design é a fonte — o domínio a consome de
 * `feedbackTexts`.
 */
export const dominioTexts = {
  /** Falha de infraestrutura já traduzida (nunca detalhe de SDK). */
  servicoIndisponivel: "Serviço indisponível. Tente novamente.",

  // Agendamento
  agendamentoInvalido: "Agendamento inválido.",
  agendamentoNaoEncontrado: "Agendamento não encontrado.",
  agendamentoJaCancelado: "Este agendamento já foi cancelado.",
  agendamentoCancelado: "Este agendamento foi cancelado.",
  horarioIndisponivel: "Horário indisponível.",

  // Campos de formulário/documento
  dataInvalida: "Data inválida.",
  horarioInvalido: "Horário inválido.",
  clienteObrigatorio: "Informe o nome do cliente.",
  profissionalObrigatorio: "Informe o profissional.",
  telefoneInvalido: "Telefone inválido.",
  statusInvalido: "Status inválido.",

  // Agenda do dia
  horariosDemais: "Há horários demais nesta data.",
  horarioRepetido: "Horário repetido na agenda.",
  horarioOcupadoNaoBloqueavel: "Não é possível bloquear um horário já ocupado.",
} as const;

export const publicTexts = {
  tituloEntrada: "Agende seu horário",
  descricaoEntrada:
    "Escolha um horário disponível e acompanhe a confirmação do seu atendimento.",
  acessoAdministrativo: "Acesso administrativo",

  // Seleção de data e horário (PRD US-06, CA-07/CA-08).
  dataLabel: "Data",
  horariosDisponiveisTitulo: "Horários disponíveis",
  carregandoDisponibilidade: "Carregando horários...",

  // Formulário de solicitação (PRD US-06, CA-08/CA-09).
  horarioSelecionadoRotulo: "Horário selecionado",
  clienteLabel: "Seu nome",
  telefoneLabel: "Telefone (WhatsApp)",
  solicitarAcao: "Solicitar horário",
  solicitandoAcao: "Solicitando...",
  escolherOutroHorario: "Escolher outro horário",
} as const;
