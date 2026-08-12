# TECH_SPEC -- Especificação Técnica (Web)

## 1. Identificação
- **Feature/Projeto**: Painel administrativo de agendamentos
- **Variante**: web
- **Stack**: Next.js 16.3 App Router + React 19.2 + TypeScript + Tailwind CSS 4. Render híbrido com Server Components por padrão e Client Components apenas para interatividade.
- **Autor**: usuário + agent-spec-sdd-generate-tech-spec
- **Data**: 2026-08-10
- **Versão**: v1
- **Status**: Refinando
- **PRD Relacionado**: `docs/prds/features/painel-admin-agendamentos/v1/prd.md`
- **Design Relacionado**: `docs/specs/features/painel-admin-agendamentos/v1/design.md`

---

## 2. Resumo Técnico da Solução

A feature será implementada no App Router com rotas administrativas protegidas, Server Components para carregamento inicial e Client Components pontuais para formulários, dialogs, feedback e seleção de datas/horários. As operações de domínio ficam em services/repositories acessados por Server Actions, sem API HTTP interna na v1. A persistência usa Firebase/Firestore, autenticação administrativa usa Firebase Authentication para um único administrador previamente criado, e reserva de horário usa transação/operação atômica para evitar duplicidade.

---

## 3. Arquitetura da Solução

### 3.1 Visão Geral

```
App Router
  ├─ Rotas públicas do cliente
  │   └─ consulta disponibilidade + cria solicitação
  └─ Rotas administrativas protegidas
      ├─ páginas Server Components
      ├─ componentes interativos Client Components
      └─ Server Actions
          └─ services
              └─ repositories Firebase/Firestore/Auth
```

As páginas administrativas validam sessão antes de renderizar dados sensíveis. Client Components recebem dados serializáveis e disparam Server Actions para confirmar, cancelar, salvar disponibilidade e salvar configurações. Repositories encapsulam Firebase/Firestore para manter regras de negócio fora dos componentes.

### 3.2 Componentes / Páginas

| Componente / Página | Responsabilidade | Camada (UI / Container / Service / API Client) |
|---------------------|------------------|------------------------------------------------|
| `app/admin/login/page.tsx` | Exibir login administrativo | UI/Page |
| `app/admin/page.tsx` | Dashboard de agendamentos | Page/Container |
| `app/admin/agenda/page.tsx` | Controle de disponibilidade | Page/Container |
| `app/admin/configuracoes/aparencia/page.tsx` | Configuração de cores do cliente | Page/Container |
| `app/admin/configuracoes/agendamento/page.tsx` | Configuração de textos pós-agendamento | Page/Container |
| `AppointmentCard` | Card operacional com dados, status e ações | UI |
| `ConfirmationDialog` | Confirmações de ações administrativas | UI |
| `ScheduleSlotGrid` | Grade de slots de horário | UI |
| `AppearanceSettingsForm` | Formulário e prévia de aparência | UI/Container |
| `PostBookingTextForm` | Formulário de textos pós-agendamento | UI/Container |
| `adminActions` | Server Actions administrativas | Service boundary |
| `bookingService` | Regras de agendamento e concorrência | Service |
| `availabilityService` | Regras de disponibilidade | Service |
| `settingsService` | Regras de configurações | Service |
| `whatsappService` | Mensagem e URL de conversa | Service |
| Repositories Firebase | Leitura/escrita de auth, agendamentos, disponibilidade e configurações | Repository |

### 3.3 Camadas e Interações

- **UI/Page**: renderiza páginas, componentes e estados visuais definidos em `design.md`.
- **Container/Client Component**: mantém estado local de dialogs, campos, seleção de data e feedback.
- **Server Actions**: recebem submissões/mutações, validam autenticação/autorização e chamam services.
- **Services**: aplicam regras de domínio, validações, normalização e orquestração.
- **Repositories**: encapsulam Firebase/Firestore/Auth; nenhuma página ou componente acessa Firebase diretamente.
- **Cliente público**: consulta disponibilidade e cria solicitação por service dedicado com superfície mínima.

### 3.4 Visão em Árvore

```
app/
├── admin/
│   ├── layout.tsx                                      [N]
│   ├── login/
│   │   └── page.tsx                                    [N]
│   ├── page.tsx                                        [N]
│   ├── agenda/
│   │   └── page.tsx                                    [N]
│   └── configuracoes/
│       ├── aparencia/
│       │   └── page.tsx                                [N]
│       └── agendamento/
│           └── page.tsx                                [N]
├── globals.css                                         [M]
├── layout.tsx                                          [M]
└── page.tsx                                            [M]
src/
├── features/
│   ├── admin/
│   │   ├── actions.ts                                  [N]
│   │   ├── auth.ts                                     [N]
│   │   └── components/
│   │       ├── AdminShell.tsx                          [N]
│   │       ├── ConfirmationDialog.tsx                  [N]
│   │       └── FeedbackBanner.tsx                      [N]
│   ├── agendamentos/
│   │   ├── components/
│   │   │   ├── AppointmentCard.tsx                     [N]
│   │   │   ├── AppointmentList.tsx                     [N]
│   │   │   └── ConfirmationTimeline.tsx                [N]
│   │   ├── services/bookingService.ts                  [N]
│   │   ├── repositories/appointmentRepository.ts       [N]
│   │   ├── validators/appointmentValidators.ts         [N]
│   │   └── types.ts                                    [N]
│   ├── agenda/
│   │   ├── components/ScheduleSlotGrid.tsx             [N]
│   │   ├── services/availabilityService.ts             [N]
│   │   ├── repositories/availabilityRepository.ts      [N]
│   │   └── types.ts                                    [N]
│   ├── configuracoes/
│   │   ├── components/
│   │   │   ├── AppearancePreview.tsx                   [N]
│   │   │   ├── AppearanceSettingsForm.tsx              [N]
│   │   │   └── PostBookingTextForm.tsx                 [N]
│   │   ├── services/settingsService.ts                 [N]
│   │   ├── repositories/settingsRepository.ts          [N]
│   │   ├── validators/colorValidator.ts                [N]
│   │   └── validators/textSettingsValidator.ts         [N]
│   └── whatsapp/
│       └── whatsappService.ts                          [N]
├── firebase/
│   ├── client.ts                                       [N]
│   ├── admin.ts                                        [N]
│   └── firestorePaths.ts                               [N]
├── shared/
│   ├── components/
│   │   ├── Button.tsx                                  [N]
│   │   ├── Field.tsx                                   [N]
│   │   ├── Skeleton.tsx                                [N]
│   │   └── Toast.tsx                                   [N]
│   ├── constants/texts.ts                              [N]
│   ├── errors.ts                                      [N]
│   └── time.ts                                        [N]
package.json                                            [M]
next.config.ts                                          [R]
tsconfig.json                                           [R]
eslint.config.mjs                                       [R]
docs/prds/features/painel-admin-agendamentos/v1/prd.md  [R]
docs/specs/features/painel-admin-agendamentos/v1/design.md [R]
```

Legenda: `[N]` Novo &nbsp; `[M]` Modificado &nbsp; `[R]` Referência

### 3.5 Arquivos a Criar

| Arquivo | Descrição | Camada |
|---------|-----------|--------|
| `app/admin/layout.tsx` | Shell protegido das rotas administrativas | Page/Layout |
| `app/admin/login/page.tsx` | Login administrativo | Page |
| `app/admin/page.tsx` | Dashboard de agendamentos | Page |
| `app/admin/agenda/page.tsx` | Disponibilidade de agenda | Page |
| `app/admin/configuracoes/aparencia/page.tsx` | Aparência do cliente | Page |
| `app/admin/configuracoes/agendamento/page.tsx` | Textos pós-agendamento | Page |
| `src/features/admin/actions.ts` | Server Actions administrativas | Service boundary |
| `src/features/admin/auth.ts` | Helpers de sessão/autorização admin | Service |
| `src/features/admin/components/*` | Shell, dialogs e feedback | UI |
| `src/features/agendamentos/**` | Cards, listagem, types, validators, service e repository | UI/Service/Repository |
| `src/features/agenda/**` | Slots, disponibilidade, service e repository | UI/Service/Repository |
| `src/features/configuracoes/**` | Formulários, preview, validators, service e repository | UI/Service/Repository |
| `src/features/whatsapp/whatsappService.ts` | Builder de mensagem e URL de conversa | Service |
| `src/firebase/client.ts` | Inicialização Firebase client-side | Infra |
| `src/firebase/admin.ts` | Inicialização Firebase admin/server-side | Infra |
| `src/firebase/firestorePaths.ts` | Centralização de caminhos/collections | Infra |
| `src/shared/components/*` | Primitivos visuais locais | UI |
| `src/shared/constants/texts.ts` | Textos pt-BR centralizados | Shared |
| `src/shared/errors.ts` | Erros tipados da aplicação | Shared |
| `src/shared/time.ts` | Utilitários de data/hora | Shared |

### 3.6 Arquivos a Modificar

| Arquivo | Modificação | Motivo |
|---------|-------------|--------|
| `package.json` | Adicionar dependências `firebase`, `firebase-admin`; adicionar dependências e scripts de teste se a stack for confirmada | Persistência/auth e cobertura de testes |
| `app/globals.css` | Expandir tokens escuros, foco, superfícies e classes base | Suportar design aprovado |
| `app/layout.tsx` | Ajustar metadados e base visual do app | Integrar shell do produto |
| `app/page.tsx` | Substituir template inicial por entrada pública ou redirecionamento definido na implementação | Remover placeholder |

### 3.7 Arquivos de Referência (somente leitura)

| Arquivo | Motivo da Consulta |
|---------|--------------------|
| `docs/prds/features/painel-admin-agendamentos/v1/prd.md` | Requisitos e CA |
| `docs/specs/features/painel-admin-agendamentos/v1/design.md` | Fonte de verdade visual |
| `admin.md` | Restrições originais de produto/stack |
| `AGENTS.md` | Instrução obrigatória de leitura de docs Next |
| `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md` | Estrutura App Router |
| `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` | Server/Client Components |
| `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md` | Data fetching |
| `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` | Server Functions/Actions |
| `node_modules/next/dist/docs/01-app/02-guides/authentication.md` | Autenticação em Next |
| `package.json` | Dependências reais |
| `tsconfig.json` | Alias e TS strict |
| `eslint.config.mjs` | Lint Next/Core Web Vitals |

---

## 4. Fluxos de Interface

### 4.1 Mapa de Telas / Rotas

| Rota | Tela / Página | Acesso | Descrição |
|------|---------------|--------|-----------|
| `/admin/login` | Login Administrativo | Público, redireciona admin autenticado | Layout visual: ver `design.md` §4.1 |
| `/admin` | Dashboard de Agendamentos | Admin autenticado | Layout visual: ver `design.md` §4.2 |
| `/admin/agenda` | Agenda e Disponibilidade | Admin autenticado | Layout visual: ver `design.md` §4.3 |
| `/admin/configuracoes/aparencia` | Configurações de Aparência | Admin autenticado | Layout visual: ver `design.md` §4.4 |
| `/admin/configuracoes/agendamento` | Configurações de Pós-Agendamento | Admin autenticado | Layout visual: ver `design.md` §4.5 |

### 4.2 Jornadas e Navegação

- Usuário não autenticado que acessa `/admin`, `/admin/agenda` ou `/admin/configuracoes/*` é redirecionado para `/admin/login`.
- Login válido redireciona para `/admin`.
- A navegação administrativa usa links internos entre dashboard, agenda e configurações, preservando shell comum.
- Server Actions administrativas retornam resultado serializável para o Client Component atualizar feedback local e solicitar revalidação/refresh quando necessário.
- Não há deep links complexos na v1; query params podem ser usados apenas para data selecionada em agenda (`?data=YYYY-MM-DD`) se a implementação optar por estado compartilhável.

---

## 5. Comportamento Visual e Estados da UI

O `design.md` é a fonte de verdade para layout, composição, estados visuais, responsividade e interações. Esta Tech Spec referencia o design para evitar duplicação e mantém aqui apenas a ponte técnica.

### 5.1 Estados por Tela / Componente

| Componente / Tela | Loading | Sucesso | Erro | Vazio |
|-------------------|---------|---------|------|-------|
| Login Administrativo | Ver `design.md` §5 | Ver `design.md` §5 | Ver `design.md` §5 | Ver `design.md` §5 |
| Dashboard de Agendamentos | Ver `design.md` §5 | Ver `design.md` §5 | Ver `design.md` §5 | Ver `design.md` §5 |
| Card de Agendamento | Ver `design.md` §5 | Ver `design.md` §5 | Ver `design.md` §5 | Ver `design.md` §5 |
| Agenda e Disponibilidade | Ver `design.md` §5 | Ver `design.md` §5 | Ver `design.md` §5 | Ver `design.md` §5 |
| Configurações de Aparência | Ver `design.md` §5 | Ver `design.md` §5 | Ver `design.md` §5 | Ver `design.md` §5 |
| Configurações de Pós-Agendamento | Ver `design.md` §5 | Ver `design.md` §5 | Ver `design.md` §5 | Ver `design.md` §5 |
| Diálogos | Ver `design.md` §5 | Ver `design.md` §5 | Ver `design.md` §5 | Ver `design.md` §5 |

### 5.2 Transições e Feedback Visual

Fonte de verdade: `design.md` §8. Tecnicamente, feedback de sucesso/erro deve ser acionado a partir do resultado das Server Actions e não por timers artificiais. Reduced motion deve respeitar preferência do usuário.

---

## 6. Gestão de Estado

### 6.1 Solução Escolhida

Estado local React + Context API leve por feature. Não instalar Redux/Zustand/Jotai na v1.

Justificativa: o escopo tem formulários, dialogs, seleção de data e feedback local; os dados persistidos vêm de repositories/services. Context fica restrito a estados transversais pequenos do shell/admin, evitando store global prematuro.

### 6.2 Estrutura de Stores / Slices

| Store / Slice | Estado Gerenciado | Ações Principais |
|---------------|-------------------|------------------|
| `AdminSessionContext` | sessão/admin autenticado serializável | expor status de sessão e logout |
| estado local do dashboard | dialog aberto, card em ação, toast | abrir/fechar dialog, marcar pending, exibir feedback |
| estado local da agenda | data selecionada, slot em edição, pending | selecionar data, acionar slot, exibir feedback |
| estado local de configurações | campos de formulário, validações e preview | editar campo, validar, salvar, resetar feedback |

### 6.3 Persistência de Estado

- Não persistir estado de UI em `localStorage` na v1.
- Sessão administrativa deve ser gerida pelo mecanismo de autenticação escolhido, sem armazenar senha ou token sensível em storage acessível ao JavaScript quando houver alternativa segura.
- Configurações, agendamentos e disponibilidade persistem no Firestore.

---

## 7. Integração com APIs

### 7.1 Endpoints Consumidos

Não haverá API HTTP interna própria na v1. A Web consome services/repositories internos via Server Components e Server Actions.

| Ação | Método | Rota | Payload Enviado | Resposta Esperada | Auth |
|------|--------|------|-----------------|-------------------|------|
| Login admin | N/A | Firebase Authentication | e-mail/senha | sessão admin válida ou erro | público |
| Listar agendamentos admin | N/A | Repository Firestore | filtros de status/data | lista de agendamentos ativos | admin |
| Confirmar agendamento | N/A | Server Action → service | `agendamentoId` | agendamento atualizado | admin |
| Cancelar agendamento | N/A | Server Action → service | `agendamentoId` | cancelamento + slot liberado | admin |
| Salvar disponibilidade | N/A | Server Action → service | data/slots | disponibilidade atualizada | admin |
| Salvar configurações | N/A | Server Action → service | aparência/textos | configuração atualizada | admin |
| Solicitar agendamento público | N/A | Server Action/service público | cliente + slot | solicitação criada ou conflito | público |

### 7.2 Contratos / DTOs de Resposta

| DTO | Campos principais | Origem (proto/openapi/manual) |
|-----|-------------------|-------------------------------|
| `AppointmentDTO` | `id`, `cliente`, `telefone`, `profissional`, `data`, `horario`, `status`, `adminConfirmadoEm`, `profissionalConfirmadoEm`, `confirmadoPrimeiroPor`, `canceladoEm` | manual |
| `AvailabilitySlotDTO` | `id`, `data`, `horario`, `liberado`, `ocupado`, `statusVisual` | manual |
| `AppearanceSettingsDTO` | `corPrimaria`, `corSecundaria`, `corDestaque` | manual |
| `PostBookingTextDTO` | `titulo`, `descricao`, `dicas`, `avisos` | manual |
| `ActionResultDTO` | `ok`, `message`, `fieldErrors`, `data` | manual |

### 7.3 Mapping para Models de Domínio

Repositories convertem documentos Firestore em DTOs serializáveis. Services convertem DTOs em modelos de domínio usados pela UI, normalizando status, datas e estados derivados como `confirmadoPrimeiroPor`. Componentes não conhecem documentos Firestore nem SDKs.

---

## 8. Sincronização de Dados

### 8.1 Estratégia de Cache HTTP

Sem SWR/TanStack Query na v1. Server Components carregam dados iniciais. Após Server Actions, a UI deve disparar refresh/revalidação do segmento afetado ou atualizar estado local a partir do retorno da ação.

### 8.2 Tempo Real

Sem WebSockets/SSE na v1. Atualização manual por ação "Atualizar" no dashboard e recarregamento após mutações. Se a necessidade de tempo real surgir, deve ser registrada como evolução futura.

---

## 9. Gerenciamento de Erros

| Tipo de Erro | Origem | Tratamento UI | Fallback |
|--------------|--------|---------------|----------|
| Rede / Timeout | Firebase/Server Action | banner inline ou erro no card | ação "Tentar novamente" |
| Validação | validators de forms/services | erro inline por campo | manter dados preenchidos |
| Auth (401/403) | sessão ausente/inválida | redirecionar para login ou bloquear ação | não executar mutação |
| Conflito de horário | transação de reserva | mensagem "Horário indisponível" | recarregar disponibilidade |
| Servidor (5xx) | operação inesperada | banner/toast de falha | log server-side e retry manual |

Estratégia geral: erros de domínio devem usar tipos/objetos previsíveis em `src/shared/errors.ts`; páginas podem usar boundaries do App Router para falhas não recuperáveis.

---

## 10. Segurança

### 10.1 Storage de Tokens

Usar Firebase Authentication para admin único. A implementação deve evitar persistir senha ou credenciais em texto puro. Tokens/sessão não devem ser usados como autorização suficiente sem validação server-side nas Server Actions e repositories administrativos.

### 10.2 XSS / CSRF / Headers

- Não renderizar HTML arbitrário vindo das configurações; textos configuráveis devem ser exibidos como texto.
- Server Actions administrativas devem validar autenticação/autorização internamente, conforme guia local do Next que alerta que Server Functions são alcançáveis por POST direto.
- CSRF deve ser mitigado pela combinação de sessão/autorização server-side e validação da origem/mecanismo de chamada conforme a estratégia final do Next/Firebase.
- Headers de segurança/CSP podem ser adicionados em `next.config.ts` se a etapa de implementação confirmar necessidade.

### 10.3 Validação de Input

Usar validators puros em TypeScript para v1, sem biblioteca adicional de validação. Validar no cliente para feedback rápido e no servidor/services para segurança. Campos críticos: e-mail/senha no login, data/horário, telefone, status, cores, textos e IDs de agendamento.

---

## 11. Performance

### 11.1 Métricas Alvo (Core Web Vitals)
- LCP: até 2,5s em rede razoável para login e dashboard inicial.
- INP: até 200ms para ações de UI locais.
- CLS: até 0,1, preservando dimensões de cards/skeletons.

### 11.2 Estratégias

- Server Components para reduzir JS inicial.
- Client Components pequenos e isolados.
- Skeletons com dimensões estáveis conforme `design.md`.
- Sem bibliotecas pesadas de estado/i18n/flags.
- Paginação ou segmentação por data se a lista de agendamentos crescer.

### 11.3 Bundle Size

Sem limite formal existente. Meta operacional: manter dependências novas restritas a Firebase e stack de testes; avaliar bundle no build se a UI crescer ou se bibliotecas visuais forem adicionadas.

---

## 12. Internacionalização (i18n)

### 12.1 Idiomas Suportados
- Default: pt-BR.
- Adicionais: nenhum na v1.

### 12.2 Solução

Sem biblioteca de i18n. Textos ficam centralizados em `src/shared/constants/texts.ts` e/ou constantes por feature para facilitar migração futura.

### 12.3 Considerações Regionais

Datas e horários devem ser formatados em pt-BR. Não há RTL, pluralização complexa ou moeda na v1.

---

## 13. Acessibilidade (a11y)

### 13.1 Padrão Alvo

WCAG 2.1 AA.

### 13.2 Práticas Aplicadas

- Labels explícitos em inputs.
- Botões com nomes acessíveis.
- Foco visível em botões, slots e campos.
- Status e badges com texto além de cor.
- Dialogs com título, descrição e gestão correta de foco.
- Touch targets mínimos conforme `design.md`.

### 13.3 Auditoria

Usar ESLint Next/Core Web Vitals já presente. Stack recomendada para testes: Testing Library para componentes e Playwright + axe para E2E/a11y, pendente de formalização em testing-stack.

---

## 14. Feature Flags

### 14.1 Solução

Sem feature flags na v1.

### 14.2 Flags Envolvidas

| Flag | Propósito | Escopo (global/usuário/segmento) | Default |
|------|-----------|-----------------------------------|---------|
| N/A | N/A — não há rollout segmentado na v1 | N/A | N/A |

---

## 15. Mapeamento de User Stories para Definições Técnicas

| User Story (PRD) | Definição Técnica | Componentes / Páginas Envolvidos |
|------------------|-------------------|----------------------------------|
| US-01 | Server Component carrega agendamentos ativos; lista renderiza cards responsivos | `/admin`, `AppointmentList`, `AppointmentCard`, `appointmentRepository` |
| US-02 | Server Action confirma agendamento com guarda de auth e bloqueio de duplicidade | `adminActions`, `bookingService`, `AppointmentCard`, `ConfirmationDialog` |
| US-03 | Server Action cancela agendamento, registra cancelamento e libera slot | `adminActions`, `bookingService`, `availabilityService` |
| US-04 | Service puro gera mensagem/URL com dados do agendamento | `whatsappService`, `AppointmentCard` |
| US-05 | Tela de agenda salva slots liberados/bloqueados via service | `/admin/agenda`, `ScheduleSlotGrid`, `availabilityService` |
| US-06 | Solicitação pública usa transação/operação atômica para ocupar slot | `bookingService`, `appointmentRepository`, `availabilityRepository` |
| US-07 | Configuração de profissional único é lida como dado somente leitura | `settingsRepository`, `AppointmentCard`, `ScheduleSlotGrid` |
| US-08 | Formulário valida cores e salva aparência | `/admin/configuracoes/aparencia`, `AppearanceSettingsForm`, `colorValidator` |
| US-09 | Formulário valida textos pós-agendamento e salva configuração | `/admin/configuracoes/agendamento`, `PostBookingTextForm`, `textSettingsValidator` |
| US-10 | Card exibe confirmação de profissional/admin por timestamps | `ConfirmationTimeline`, `AppointmentCard` |
| US-11 | Service/model deriva `confirmadoPrimeiroPor` a partir de timestamps | `bookingService`, `AppointmentCard` |
| US-12 | Model/status mantém `aguardando agendamento` até chegada do horário | `bookingService`, `AppointmentCard`, `time.ts` |

---

## 16. Dependências Externas

| Tipo | Nome | Versão | Motivo |
|------|------|--------|--------|
| Framework | `next` | 16.3.0 | Já instalado |
| UI | `react`, `react-dom` | 19.2.8 | Já instalado |
| Estilo | `tailwindcss`, `@tailwindcss/postcss` | ^4 | Já instalado |
| Auth/Data | `firebase` | a definir pelo lock na implementação | Auth client e Firestore client quando necessário |
| Admin SDK | `firebase-admin` | a definir pelo lock na implementação | Operações server-side seguras |
| Validação | N/A | N/A | Validators puros na v1 |
| i18n | N/A | N/A | pt-BR centralizado sem lib |
| Testes recomendados | `vitest`, Testing Library, Playwright, axe | a definir | Não instalados ainda; ver seção 17 |

---

## 17. Estratégia de Testes

> **Resumo**: 22 casos de teste | Unitários/Componentes: 12 | Integração: 8 | E2E/Segurança/A11y: 2
> **Padrão**: stack ainda não formalizada. Recomendação do QA: Vitest + Testing Library + Firebase Emulator Suite + Playwright + axe.

### Rastreabilidade: Critérios de Aceite → Testes

| CA (PRD) | Descrição Resumida | Testes |
|----------|--------------------|--------|
| CA-01 | Cards com dados essenciais | CT-01, CT-22 |
| CA-02 | Cancelados fora da listagem | CT-02 |
| CA-03 | Confirmar exige confirmação explícita | CT-03, CT-22 |
| CA-04 | Confirmado não confirma de novo | CT-04 |
| CA-05 | Cancelar remove da principal e libera slot | CT-05, CT-06, CT-22 |
| CA-06 | Mensagem com dados do agendamento | CT-07, CT-08 |
| CA-07 | Apenas horários liberados e livres | CT-09, CT-10 |
| CA-08 | Solicitação bloqueia horário | CT-09, CT-10 |
| CA-09 | Concorrência aceita no máximo uma reserva | CT-11, CT-12 |
| CA-10 | Profissional único sem CRUD | CT-13, CT-14 |
| CA-11 | Salva cores válidas/legíveis | CT-15, CT-22 |
| CA-12 | Rejeita cores ilegíveis | CT-15, CT-16, CT-22 |
| CA-13 | Salva textos pós-agendamento | CT-17, CT-18, CT-22 |
| CA-14 | Exibe confirmações e primeiro confirmador | CT-19, CT-20 |
| CA-15 | Mantém status aguardando antes do horário | CT-19, CT-20 |
| CA-16 | Bloqueia acesso não autorizado | CT-21, CT-22 |

### 17.1 Testes Unitários e de Componentes

#### Componente: `AppointmentList` / `AppointmentCard`

| CT | Teste | CA | Objetivo | Input | Expected | Mock | Setup (caminho legítimo) |
|----|-------|----|----------|-------|----------|------|--------------------------|
| CT-01 | `renderiza cards com dados essenciais para aguardando e confirmados` | CA-01 | Cards ativos devem exibir cliente, telefone, profissional, data, horário e status | agendamentos aguardando/confirmado | dados obrigatórios visíveis | boundary de leitura | sessão admin via harness público |
| CT-02 | `nao renderiza cards com status cancelado` | CA-02 | Cancelados não entram na listagem principal | cancelado + ativo | cancelado ausente | boundary de leitura | fixture de dados |
| CT-03 | `abre dialog antes de executar confirmacao administrativa` | CA-03 | Confirmação só ocorre após dialog | card aguardando | mutação não roda antes do dialog | spy de action | fixture pública |
| CT-04 | `bloqueia nova confirmacao quando status ja esta confirmado` | CA-04 | Confirmado não oferece nova confirmação | card confirmado | ação ausente/desabilitada | fixture | fixture pública |
| CT-19 | `cardExibeConfirmacoesOrdemEStatusAguardando` | CA-14, CA-15 | Card mostra ambas confirmações, primeiro confirmador e status | timestamps das duas partes | status preservado | clock controlado | fake timers/helper público |
| CT-20 | `cardExibePartePendenteQuandoConfirmacaoIncompleta` | CA-14, CA-15 | Card mostra pendência quando uma parte falta | um timestamp ausente | pendência explícita | clock controlado | fake timers/helper público |

#### Services/Validators Puros

| CT | Teste | CA | Objetivo | Input | Expected | Mock | Setup (caminho legítimo) |
|----|-------|----|----------|-------|----------|------|--------------------------|
| CT-07 | `buildMensagemCliente inclui nome data horario e profissional` | CA-06 | Mensagem inclui dados obrigatórios | agendamento válido | mensagem/URL completa | — | chamada direta |
| CT-08 | `buildMensagemCliente rejeita dados obrigatorios ausentes` | CA-06 | Não gerar mensagem incompleta | profissional vazio | erro tipado | — | chamada direta |
| CT-15 | `validarCoresCliente aceita contraste WCAG AA` | CA-11, CA-12 | Cores legíveis são aceitas | cores válidas | resultado válido | — | função pura |
| CT-16 | `validarCoresCliente rejeita contraste abaixo de WCAG AA` | CA-12 | Cores ilegíveis são rejeitadas | baixo contraste | erro específico | — | função pura |

#### Profissional Único

| CT | Teste | CA | Objetivo | Input | Expected | Mock | Setup (caminho legítimo) |
|----|-------|----|----------|-------|----------|------|--------------------------|
| CT-13 | `admin mostra profissional configurado e nao renderiza acoes de crud de profissionais` | CA-10 | V1 usa profissional único e não expõe CRUD | profissional configurado | nome visível e ações CRUD ausentes | leitura de configuração | provider público |

### 17.2 Testes de Integração

#### Services + Firestore Emulator

| CT | Teste | CA | Objetivo | Fluxo | Validação | Setup (caminho legítimo) |
|----|-------|----|----------|-------|-----------|--------------------------|
| CT-05 | `cancelarAgendamento remove da listagem ativa e torna slot disponivel` | CA-05 | Cancelamento libera horário corretamente | seed → cancelar → consultar | item cancelado fora da lista e slot livre | seed via SDK admin no emulador |
| CT-06 | `cancelarAgendamento inexistente nao libera slots indevidos` | CA-05 | Cancelamento inválido não tem efeito colateral | seed → cancelar id inválido | erro e slot controle preservado | seed no emulador |
| CT-09 | `consultarDisponibilidadePublica retorna somente slots liberados sem agendamento ativo` | CA-07, CA-08 | Cliente só vê slots liberados/livres | seed slots → consultar | só slot livre solicitável | Firestore Emulator |
| CT-10 | `solicitarAgendamento falha para slot indisponivel` | CA-07, CA-08 | Slot ocupado/bloqueado não cria solicitação | seed ocupado → solicitar | erro e sem duplicidade | Firestore Emulator |
| CT-11 | `transacaoDeReserva aceita apenas uma solicitacao concorrente por slot` | CA-09 | Concorrência aceita no máximo uma reserva | chamadas paralelas | 1 sucesso e 1 conflito | chamadas reais contra emulador |
| CT-12 | `transacaoDeReserva rejeita slot previamente ocupado` | CA-09 | Slot previamente ocupado rejeita novas reservas | seed ocupado → tentativas | nenhuma nova criação | Firestore Emulator |
| CT-17 | `salvarTextosPosAgendamento persiste titulo descricao dicas e avisos` | CA-13 | Textos salvos voltam para cliente | salvar → consultar | campos persistidos | Firestore Emulator |
| CT-18 | `salvarTextosPosAgendamento invalido preserva textos atuais` | CA-13 | Payload inválido não sobrescreve config | seed válido → salvar inválido | erro e config preservada | Firestore Emulator |

### 17.3 Testes End-to-End (E2E)

#### Fluxo: segurança administrativa (CT-21)
- **Framework**: Playwright recomendado.
- **CA**: CA-16
- **Objetivo**: pessoa não autorizada não acessa listagens nem executa mutações administrativas.
- **Pré-condições**: servidor Next em teste, ausência real de sessão administrativa.
- **Passos**:
  1. Acessar rotas administrativas sem sessão.
  2. Tentar acionar mutações administrativas.
  3. Consultar dados no emulador.
- **Validações**: redirecionamento/401/403 e ausência de mutações.

#### Fluxo: acessibilidade administrativa (CT-22)
- **Framework**: Playwright + axe recomendado.
- **CA**: CA-01, CA-03, CA-05, CA-11, CA-12, CA-13, CA-16
- **Objetivo**: telas administrativas principais preservam WCAG 2.1 AA.
- **Pré-condições**: servidor Next em teste, admin autenticado por mecanismo real de teste, dados seedados.
- **Passos**:
  1. Abrir login, dashboard, agenda e configurações em mobile e desktop.
  2. Executar checagem axe.
  3. Navegar por teclado em controles principais.
- **Validações**: sem violações críticas/sérias, foco visível e nomes acessíveis.

### 17.4 Cenários de Erro

| Cenário | CA | Objetivo | Trigger | Status / Log Esperado |
|---------|----|----------|---------|------------------------|
| Confirmação duplicada | CA-04 | Impedir repetição de ação | card já confirmado | ação indisponível |
| Cancelamento inválido | CA-05 | Evitar liberar slot indevido | id inexistente | erro tipado e sem mutação |
| Mensagem incompleta | CA-06 | Não gerar comunicação inválida | campo obrigatório ausente | erro tipado |
| Slot indisponível | CA-07, CA-08 | Não criar reserva inválida | slot ocupado/bloqueado | erro de indisponibilidade |
| Corrida de reserva | CA-09 | Garantir atomicidade | chamadas simultâneas | uma reserva aceita no máximo |
| CRUD de profissional fora de escopo | CA-10 | Bloquear superfície inexistente | tentativa HTTP/mutação | 404/405/403 |
| Cores ilegíveis | CA-12 | Preservar legibilidade | baixo contraste | erro de validação |
| Textos inválidos | CA-13 | Preservar config anterior | título vazio | erro e não sobrescrita |
| Não autorizado | CA-16 | Proteger dados e mutações | sem sessão | redirecionamento/401/403 |

Notas do QA:
- `stack_discovery.discovery_needed=true`: não há stack de testes formal. Recomenda-se fixar stack antes da execução.
- JSON lossless persistido em `docs/specs/features/painel-admin-agendamentos/v1/_run/test-cases.json`.

---

## 18. Riscos Técnicos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Overbooking por concorrência mal implementada | Média | Alto | Firestore transaction/operação atômica + testes CT-11/CT-12 |
| Vazamento de dados administrativos | Média | Alto | Guardas server-side em páginas/actions e regras de segurança |
| Mistura de regra de negócio em componentes | Média | Médio | Services/repositories e validators puros |
| Dependência Firebase mal isolada | Média | Médio | Encapsular SDK em `src/firebase` e repositories |
| Falta de stack de testes formal | Alta | Médio | Rodar bootstrap de testing-stack antes da execução ou fixar na task plan |
| Interface admin crescer sem padrão visual | Média | Médio | Usar `design.md` como fonte visual da feature |

---

## 19. Observações Técnicas

### ADRs Aplicáveis nesta Feature

Sem ADRs ativas no projeto: `docs/adr/INDEX.md` não existe.

### Candidatos a ADR

- **Candidato a ADR parcial — auth/security/data/cross-cutting**: usar Firebase Authentication + Firestore transactions atravessa a feature e tem custo de reversão médio/alto, mas o usuário já indicou na tentativa de ADR anterior que a decisão não é surpreendente sem contexto. Critérios que falham: C4. Registrar como decisão técnica nesta spec.

### Glossário de Domínio

Não há glossário global ou da feature. Termos candidatos para canonização futura: `Agendamento`, `Slot de Horário`, `Disponibilidade`, `Profissional`, `Administrador`, `Status aguardando agendamento`.

### Next.js 16

Antes da implementação, consultar novamente os guias locais em `node_modules/next/dist/docs/` para qualquer API específica de Server Actions, auth, cache/revalidation e rotas.

---

## 20. Checklist Final

- [x] Variante registrada (web) na seção 1
- [x] TECH_SPEC cobre todo o PRD (todas as US-XX mapeadas em 15)
- [x] Resumo técnico claro e objetivo (seção 2)
- [x] Arquitetura definida com componentes, páginas e camadas (seção 3)
- [x] Mapa de telas/rotas e jornadas descrito (seção 4)
- [x] Estados da UI por componente referenciam `design.md` (seção 5)
- [x] Solução de gestão de estado e estrutura de stores (seção 6)
- [x] APIs consumidas, DTOs e mapping (seção 7)
- [x] Estratégia de cache/tempo real (seção 8)
- [x] Gerenciamento de erros mapeado (seção 9)
- [x] Segurança: tokens, XSS/CSRF, validação (seção 10)
- [x] Performance: métricas alvo e estratégias (seção 11)
- [x] i18n: idiomas, solução, considerações regionais (seção 12)
- [x] a11y: padrão WCAG e práticas (seção 13)
- [x] Feature flags listadas (seção 14)
- [x] Dependências externas listadas (seção 16)
- [x] Estratégia de testes via `agent-spec-qa-test-generator` integrada (seção 17, com rastreabilidade CA→CT)
- [x] Riscos técnicos identificados (seção 18)
- [x] Observações técnicas registradas (seção 19)
- [x] Arquivos envolvidos listados — árvore + criar/modificar/referência (seções 3.4-3.7)
- [x] Pronto para geração das TASKS
