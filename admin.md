# DESENVOLVIMENTO — PAINEL ADMINISTRATIVO DE AGENDAMENTOS

Você é um engenheiro de software sênior especialista em:

- React
- Next.js
- TypeScript
- Firebase
- Material Design 3
- Arquitetura de software
- Segurança
- Testes automatizados
- Aplicações mobile-first

Sua tarefa é desenvolver a **frente administrativa de um sistema de agendamentos**.

O projeto deve ser desenvolvido com código limpo, coeso, testável e de fácil manutenção.

---

# 1. STACK OBRIGATÓRIA

Utilizar obrigatoriamente:

- Next.js na versão estável compatível com o projeto;
- React;
- TypeScript;
- Firebase;
- Firebase Firestore como banco de dados;
- Firebase Authentication apenas se necessário para autenticação técnica do administrador;
- Material Design 3 como referência visual;
- arquitetura mobile-first.

Não adicionar bibliotecas sem necessidade.

Antes de instalar qualquer dependência:

1. verificar se a funcionalidade já pode ser implementada com os recursos existentes;
2. verificar compatibilidade da biblioteca com Next.js e React utilizados;
3. instalar apenas dependências realmente necessárias.

---

# 2. OBJETIVO DO ADMIN

O administrador deverá controlar:

- agendamentos;
- confirmação;
- cancelamento;
- profissionais;
- disponibilidade de agenda;
- horários;
- dias disponíveis;
- cores utilizadas na área do cliente;
- textos exibidos após o agendamento.

Não existe cadastro público de administrador.

Existe apenas **um único administrador**.

---

# 3. LOGIN ADMINISTRATIVO

Criar tela de login contendo:

- e-mail;
- senha;
- botão "Entrar".

Não criar:

- cadastro;
- recuperação pública de senha;
- login social;
- múltiplos usuários;
- permissões;
- perfis;
- roles administrativas.

Existe apenas um administrador.

As credenciais administrativas devem ser previamente configuradas pelo responsável pelo sistema.

Nunca armazenar senha em texto puro.

Caso Firebase Authentication seja utilizado:

- criar o administrador diretamente no Firebase;
- não disponibilizar nenhuma tela ou endpoint para registro.

Rotas administrativas devem ser protegidas.

Exemplo:

/admin/login

/admin

/admin/profissionais

/admin/agenda

/admin/configuracoes

---

# 4. TELA PRINCIPAL DO ADMIN

A tela inicial deverá exibir os agendamentos em cards.

Cada card deverá apresentar:

- nome do cliente;
- telefone;
- profissional;
- data;
- horário;
- status.

Status possíveis:

AGUARDANDO_CONFIRMACAO

CONFIRMADO

CANCELADO

Por padrão, a tela principal deverá listar:

- AGUARDANDO_CONFIRMACAO;
- CONFIRMADO.

Agendamentos cancelados não precisam aparecer na listagem principal.

---

# 5. CARD DE AGENDAMENTO

Para agendamentos com status:

AGUARDANDO_CONFIRMACAO

mostrar dois botões:

- Confirmar
- Cancelar

Para agendamentos:

CONFIRMADO

mostrar claramente que o agendamento já está confirmado.

Não permitir confirmação duplicada.

---

# 6. CONFIRMAR AGENDAMENTO

Ao clicar em:

"Confirmar"

o sistema deverá:

1. solicitar confirmação da ação;
2. atualizar o status para:

CONFIRMADO

3. registrar data/hora da confirmação;
4. persistir a alteração no Firebase;
5. disponibilizar envio de mensagem para WhatsApp.

A mensagem deverá utilizar os dados:

- nome;
- data;
- horário;
- profissional.

Exemplo conceitual:

Olá, João.

Seu agendamento foi confirmado.

Data: 15/08/2026
Horário: 09:00
Profissional: Maria Silva

A mensagem NÃO deverá ficar fixa dentro do componente.

Criar um serviço responsável pela geração da mensagem.

---

# 7. CANCELAR AGENDAMENTO

Ao clicar em:

"Cancelar"

o sistema deverá:

1. solicitar confirmação;
2. alterar o status para:

CANCELADO

3. registrar data/hora do cancelamento;
4. liberar novamente o horário;
5. disponibilizar envio de mensagem pelo WhatsApp.

A mensagem deverá utilizar:

- nome;
- data;
- horário;
- profissional.

Exemplo conceitual:

Olá, João.

Seu agendamento do dia 15/08/2026 às 09:00 foi cancelado.

---

# 8. WHATSAPP

Criar integração desacoplada.

Não colocar regras de WhatsApp diretamente nos componentes.

Criar algo equivalente a:

WhatsappService

Responsabilidades:

- sanitizar telefone;
- gerar mensagem;
- gerar URL do WhatsApp;
- abrir WhatsApp.

Inicialmente poderá utilizar:

https://wa.me/

Não adicionar API paga de WhatsApp sem necessidade.

A arquitetura deve permitir que futuramente seja substituído por:

- WhatsApp Cloud API;
- Evolution API;
- Twilio;
- outro provedor.

---

# 9. PROFISSIONAIS

Criar CRUD simples de profissionais.

O profissional deverá possuir somente:

- id;
- nome;
- CREF;
- ativo;
- criadoEm.

Campos obrigatórios para cadastro:

Nome

CREF

Não criar informações adicionais sem necessidade.

Exemplo:

{
"id": "...",
"nome": "Maria Silva",
"cref": "123456-G/DF",
"ativo": true
}

Permitir:

- cadastrar;
- editar;
- ativar;
- desativar.

Evitar exclusão definitiva caso já existam agendamentos relacionados ao profissional.

---

# 10. DISPONIBILIDADE DA AGENDA

O administrador deverá controlar quais datas e horários poderão receber agendamentos.

O cliente NÃO poderá escolher qualquer data arbitrariamente.

O administrador deverá:

1. selecionar profissional;
2. selecionar uma data;
3. adicionar horários disponíveis;
4. remover horários;
5. liberar a data;
6. bloquear a data.

Exemplo:

Profissional:
Maria Silva

Data:
15/08/2026

Horários:

08:00
09:00
10:00
11:00
14:00
15:00

---

# 11. HORÁRIO

Cada horário deverá representar um slot individual.

Exemplo conceitual:

{
"id": "...",
"profissionalId": "...",
"data": "2026-08-15",
"horario": "09:00",
"ativo": true
}

O horário somente estará disponível ao cliente quando:

- estiver ativo;
- estiver liberado pelo administrador;
- não possuir agendamento AGUARDANDO_CONFIRMACAO;
- não possuir agendamento CONFIRMADO.

---

# 12. BLOQUEIO DE HORÁRIO

Quando um cliente realizar um agendamento:

o horário deverá deixar imediatamente de estar disponível.

Não esperar o administrador confirmar.

Portanto:

AGUARDANDO_CONFIRMACAO

já bloqueia o horário.

CONFIRMADO

também bloqueia.

CANCELADO

libera novamente o horário.

---

# 13. CONCORRÊNCIA

Este requisito é obrigatório.

Dois clientes nunca poderão reservar o mesmo horário.

Não implementar apenas validação visual.

A validação precisa ocorrer no Firebase.

Utilizar transação, operação atômica ou estratégia equivalente.

O fluxo deve ser:

Cliente escolhe horário

↓

Sistema inicia operação atômica

↓

Verifica disponibilidade

↓

Se estiver disponível:
cria agendamento + bloqueia horário

↓

Se não estiver disponível:
retorna erro

Nunca permitir:

Cliente A → 09:00
Cliente B → 09:00

mesmo que ambos cliquem simultaneamente.

---

# 14. CONFIGURAÇÃO DE CORES DO CLIENTE

Criar uma área:

Configurações > Aparência

Permitir ao administrador definir cores da interface do cliente.

No mínimo:

- cor principal;
- cor secundária;
- cor de destaque.

Armazenar no Firebase.

Exemplo:

configuracoes/aparencia

{
"corPrimaria": "#...",
"corSecundaria": "#...",
"corDestaque": "#..."
}

Antes de salvar:

- validar hexadecimal;
- validar contraste;
- impedir configurações que prejudiquem legibilidade.

O cliente deverá buscar essas configurações automaticamente.

---

# 15. TEMA ESCURO

Toda interface administrativa deve ser dark theme.

Utilizar boas práticas do Material Design 3.

Priorizar:

- contraste;
- acessibilidade;
- hierarquia visual;
- cards;
- espaçamento consistente;
- tipografia legível;
- áreas de toque adequadas;
- feedback visual.

Não criar uma interface excessivamente colorida.

---

# 16. TEXTO DA TELA DE SUCESSO

Criar:

Configurações > Agendamento

Permitir configurar os textos apresentados ao cliente depois que ele solicitar um agendamento.

Exemplo:

Título:

"Agendamento solicitado com sucesso!"

Descrição:

"Seu horário foi reservado e está aguardando confirmação."

Dicas:

- Chegue com 10 minutos de antecedência.
- Utilize roupas confortáveis.
- Em caso de imprevisto, entre em contato.

Avisos:

- O horário somente será considerado definitivo após confirmação.

Essas informações devem ser armazenadas no Firebase.

Não deixar textos fixos no frontend do cliente.

---

# 17. FIREBASE

Criar collections equivalentes a:

admins

profissionais

disponibilidades

agendamentos

configuracoes

Sugestão:

agendamentos/{id}

{
"nomeCliente": "...",
"telefone": "...",
"telefoneNormalizado": "...",
"profissionalId": "...",
"data": "2026-08-15",
"horario": "09:00",
"status": "AGUARDANDO_CONFIRMACAO",
"criadoEm": "...",
"confirmadoEm": null,
"canceladoEm": null
}

---

# 18. SEGURANÇA

Criar regras de segurança do Firebase.

O cliente:

PODE:

- consultar disponibilidade pública;
- criar agendamento;
- consultar configurações visuais necessárias.

NÃO PODE:

- cadastrar profissional;
- criar horários;
- alterar horários;
- confirmar agendamento;
- cancelar agendamento administrativo;
- alterar configurações;
- listar todos os clientes;
- listar todos os agendamentos.

Somente administrador autenticado pode realizar operações administrativas.

---

# 19. ARQUITETURA

Separar responsabilidades.

Estrutura sugerida:

src/
app/
components/
features/
agendamentos/
profissionais/
agenda/
configuracoes/
autenticacao/
services/
firebase/
whatsapp/
repositories/
models/
validators/
hooks/
utils/
types/

Não concentrar regras de negócio em componentes React.

Componentes devem ser majoritariamente responsáveis por apresentação e interação.

---

# 20. REPOSITORY

Todas as operações Firebase devem passar por uma camada de repository/service.

Exemplo:

AgendamentoRepository

ProfissionalRepository

DisponibilidadeRepository

ConfiguracaoRepository

Não realizar chamadas ao Firestore espalhadas pelos componentes.

---

# 21. RESPONSIVIDADE

Mobile-first obrigatório.

O painel deve funcionar corretamente em:

320px

375px

390px

430px

tablet

desktop

Cards devem reorganizar automaticamente conforme largura disponível.

---

# 22. LOADING E ERROS

Toda chamada assíncrona deverá tratar:

- loading;
- sucesso;
- erro;
- estado vazio.

Nunca deixar usuário sem feedback.

---

# 23. VALIDAÇÕES

Validar:

Nome do profissional

CREF

Data

Horário

Telefone

Configurações

Não confiar somente no frontend.

---

# 24. TESTES

Criar testes para as principais regras.

No mínimo:

- login do administrador;
- cadastro de profissional;
- criação de disponibilidade;
- bloqueio de horário;
- confirmação;
- cancelamento;
- liberação após cancelamento;
- tentativa de duas reservas simultâneas;
- configuração de aparência;
- configuração do texto de sucesso.

Priorizar testes de regra de negócio.

---

# 25. REGRAS ABSOLUTAS

NUNCA:

- permitir cadastro público de administrador;
- armazenar senha em texto puro;
- permitir dois agendamentos no mesmo horário;
- disponibilizar horário AGUARDANDO_CONFIRMACAO;
- disponibilizar horário CONFIRMADO;
- permitir ao cliente controlar agenda;
- colocar lógica Firebase diretamente em componentes;
- colocar regra de WhatsApp diretamente em componentes;
- duplicar regra de negócio;
- ignorar erros;
- criar campos ou funcionalidades não solicitadas.

---

# 26. CRITÉRIO FINAL

A frente administrativa estará concluída quando for possível:

1. fazer login como administrador;
2. cadastrar profissional;
3. criar datas disponíveis;
4. criar horários disponíveis;
5. visualizar agendamentos;
6. confirmar agendamento;
7. cancelar agendamento;
8. enviar confirmação/cancelamento pelo WhatsApp;
9. configurar cores da frente cliente;
10. configurar texto da tela de sucesso;
11. bloquear corretamente horários reservados;
12. garantir que dois clientes nunca ocupem o mesmo horário;
13. utilizar interface mobile-first;
14. utilizar dark theme baseado em Material Design 3.

Não implementar funcionalidades fora deste escopo.
