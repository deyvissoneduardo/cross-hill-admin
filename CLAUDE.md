@AGENTS.md

## Visão do Projeto
Painel administrativo (Next.js App Router) para gerenciar agendamentos, disponibilidade e configurações de um profissional único, com vitrine pública para o cliente solicitar horário. Administrador único, sem múltiplos perfis. Prioriza corretude sobre conveniência: nenhuma duplicidade de horário, nenhuma superfície administrativa exposta ao cliente.

## Stack
- Next.js 16.3.0 (App Router), React 19.2.8, TypeScript 5 (strict), Tailwind CSS 4
- Firebase: client SDK `^12.17.1` (browser), Admin SDK `^14.2.0` (server-only)
- Testes: Vitest 4 (unit + integração), Playwright 1.62 (E2E + a11y via `@axe-core/playwright`)
- Gerenciador de pacotes: npm (`package-lock.json`) — NÃO use yarn/pnpm
- NÃO há script de typecheck dedicado — rode `npx tsc --noEmit` diretamente
- NÃO há CI configurado (`.github/workflows` ausente) — nenhum gate automático no PR

## Como rodar
- Instalar: `npm ci` · Dev: `npm run dev` · Build: `npm run build` · Lint: `npm run lint`
- Unitários: `npm test` (Vitest, colocated com o código-fonte)
- Integração: `npm run test:integration` — sobe o Firestore Emulator sozinho via `firebase emulators:exec`
- E2E/a11y: `npm run test:e2e` / `npm run test:a11y` — Playwright sobe 2-3 servidores em portas fixas (3100/3101 + emuladores); NÃO rode em paralelo com outro processo Playwright/emulador

## Arquitetura
- Camadas: rota/Server Action → `services/` (validação, `AppError`/`withDomainErrors`, orquestração entre features) → `repositories/` (transação Firestore, conversão doc↔domínio) → Firestore.
- Cada feature em `src/features/<nome>/` pode ter `components/`, `services/`, `repositories/`, `validators/`, `types.ts` — mas nem toda feature usa todas as camadas (`admin` não tem `repositories/`; `whatsapp` é um arquivo único). NÃO force uma camada que a feature não precisa.
- `src/shared/` é só para utilitário verdadeiramente transversal (erros, tempo, validação, primitives de UI) — NÃO coloque lógica de domínio de uma feature específica aqui.
- `src/firebase/firestorePaths.ts` centraliza todo path/coleção do Firestore — NÃO hardcode um path fora dele.
- Server Actions autenticadas ficam em `actions.ts` na raiz da feature; públicas (sem sessão) em `publicActions.ts` — nunca misture os dois no mesmo arquivo.

## Convenções
- NÃO crie arquivo barrel/index — todo import é direto ao arquivo-fonte.
- NÃO exporte símbolo de produção só para um teste alcançar (Iron Law do projeto — ver `.claude/skills/agent-spec-testing-best-practices/`).
- Design tokens são custom properties CSS em `app/globals.css` (`--color-*`), consumidas via sintaxe arbitrária do Tailwind (`text-(--color-foreground)`) — NÃO hardcode hex fora desses tokens.
- Commits em Conventional Commits, pt-BR (`tipo(escopo): descrição`).

## Onde coisas novas vão
- Teste unitário: colocated como `<Arquivo>.test.ts(x)` ao lado do código — NUNCA em pasta `tests/` separada.
- Teste de integração (Firestore Emulator): `tests/integration/`. Teste E2E/a11y (Playwright): `tests/e2e/` (`*.spec.ts`), fixtures em `tests/e2e/fixtures/`.
- Nova rota administrativa: `app/admin/<nome>/page.tsx`, sob o layout de `app/admin/layout.tsx`.
- Regra de negócio nova numa feature existente: estenda o `service`/`repository` já existente em vez de criar um novo arquivo para a mesma entidade.

## Testing & Quality Bar
- "Feito" = lint limpo + `tsc --noEmit` limpo + testes relevantes verdes (unit sempre; integração/E2E quando a mudança tocar Firestore ou fluxo ponta-a-ponta).
- Teste falhando → investigue o SUT primeiro. NÃO enfraqueça uma asserção só para o teste passar.

## Safe-Change Rules
- A guarda contra `*_EMULATOR_HOST` + `NODE_ENV=production` em `src/firebase/admin.ts` existe para impedir bypass silencioso de autenticação — não remova sem entender por quê.
- Ao tocar um arquivo fora do que foi pedido (padrão recorrente neste projeto), sinalize explicitamente em vez de expandir escopo silenciosamente.

## Regras de comportamento (não negocie)
1. **Incerteza → leia o arquivo ou rode `grep`. Nunca chute.** Se não achou (função, campo, API, arquivo), diga que não achou.
2. **Menor delta possível.** Resolva só o pedido. Oportunidade de melhoria fora do escopo → reporte separado, não execute sem pedir.
3. **Não toque em código fora do escopo sem autorização explícita.** Viu algo errado → sinalize, não conserte por conta própria.
4. **"Funciona" só com evidência.** Ao afirmar que algo funciona, mostre o output do comando/teste. Não rodou → diga "não rodei".
5. **Ações destrutivas exigem confirmação prévia.** Migração de schema, delete em massa, mudança de CI/auth → confirme antes de executar.

<!-- Itere este arquivo: erro que estava neste contrato → fortaleça a regra existente; erro que NÃO estava → adicione uma regra nova. -->
