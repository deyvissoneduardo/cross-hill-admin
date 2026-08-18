# Crosshill Admin

> Painel administrativo para gerenciar agendamentos, disponibilidade e configurações de atendimento, com uma vitrine pública para o cliente solicitar horário.

> ⚠️ Adicionar screenshot/GIF do painel em `docs/assets/demo.png` e referenciá-lo aqui.

## Sobre

O Crosshill Admin substitui a operação manual e dispersa da agenda de um profissional único: hoje, sem um painel consolidado, horários duplicados, solicitações perdidas e comunicação inconsistente com o cliente sobre o status do agendamento são riscos reais.

O sistema tem duas frentes: uma área administrativa protegida, usada por um único administrador (sem múltiplos perfis nem cadastro público de admin), para gerenciar solicitações, disponibilidade, confirmações e cancelamentos; e uma vitrine pública, usada pelo cliente para consultar horários livres e solicitar atendimento, sem qualquer acesso a rotas ou dados administrativos.

## Features

- Lista de agendamentos em cards (cliente, telefone, profissional, data, horário, status) — agendamentos cancelados ficam ocultos automaticamente.
- Confirmação e cancelamento de agendamento com bloqueio de duplicidade; cancelar libera o horário imediatamente para novas solicitações.
- Agenda manual de horários disponíveis, com reserva atômica no Firestore para garantir que dois clientes nunca reservem o mesmo horário.
- Configuração de cores (aparência) e dos textos exibidos ao cliente após a solicitação.
- Vitrine pública para consultar disponibilidade e solicitar horário, restrita à leitura de slots livres e à criação de solicitações.
- Registro de confirmação por profissional e por administrador (com timestamp), mantendo o status "aguardando agendamento" até a chegada do horário.

## Pré-requisitos

- Node.js 20+ (compatível com Next.js 16.3)
- Um projeto no [Firebase](https://console.firebase.google.com/) com Authentication e Firestore habilitados
- Java 11+ — necessário apenas para rodar os testes de integração via Firebase Emulator Suite

## Como rodar

```bash
npm install
cp .env.example .env.local
# preencha .env.local com as credenciais do seu projeto Firebase (ver seção Configuração)
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) — a vitrine pública fica em `/`, o login administrativo em `/admin/login`.

## Configuração

Para ativar a sincronização de agendamentos, consulte o
[passo a passo do Google Calendar](docs/google-calendar-setup.md).

Variáveis de ambiente (`.env.local`, nunca commitado — ver `.env.example`):

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Chave pública do Firebase client (exposta ao browser). |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Domínio de autenticação do projeto Firebase. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ID do projeto Firebase. |
| `FIREBASE_PROJECT_ID` | ID do projeto para o Firebase Admin SDK (server-side). |
| `FIREBASE_CLIENT_EMAIL` | E-mail da conta de serviço do Firebase Admin SDK. |
| `FIREBASE_PRIVATE_KEY` | Chave privada da conta de serviço (aceita `\n` literal). |
| `ADMIN_EMAIL` | Único e-mail autorizado a acessar `/admin`. |
| `PROFISSIONAL_UNICO_NOME` | Semente do nome do profissional único, gravada em `configuracoes/profissional` na primeira leitura. |
| `FIREBASE_AUTH_EMULATOR_HOST` / `FIRESTORE_EMULATOR_HOST` | Opcionais — apontam para os emuladores locais (ver `firebase.json`) durante desenvolvimento/testes de integração. |

## Build / Deploy

```bash
npm run build
npm run start
```

## Testes

```bash
npm test               # unitários (Vitest)
npm run test:integration  # integração com Firestore Emulator (precisa Java)
npm run test:e2e       # E2E (Playwright)
npm run test:a11y      # acessibilidade (subconjunto do E2E, tag @a11y)
npm run lint           # ESLint
```

## Contribuindo

Não há `CONTRIBUTING.md` neste repositório. Antes de abrir um PR, rode `npm run lint`, `npm test`, `npm run test:integration` e `npm run test:e2e` localmente.

O contexto de produto e as decisões técnicas da feature vivem em `docs/prds/` (PRD) e `docs/specs/` (Tech Spec, task plans e histórico de execução).

## Licença

Projeto privado (`"private": true` no `package.json`) — sem arquivo `LICENSE` neste repositório; não está licenciado para redistribuição.
