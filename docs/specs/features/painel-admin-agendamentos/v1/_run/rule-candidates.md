# Rule candidates — painel-admin-agendamentos/v1

> Append-only. Cada tópico abaixo é um candidato a regra detectado durante um run.
> Consumido por `/agent-spec-mine-rule-candidates` (agrupa por tema) e `/agent-spec-curate-project-rules` (decide se vira regra).

## [pre_refinement_decision] Fluxo de confirmação dupla do agendamento

**Regra que isto sugere:** o status "aguardando agendamento" só é resolvido quando cliente E profissional confirmam; o timestamp de quem confirmou primeiro deve ser exibido na UI admin.

**O que ela faria (simples):** garante que nenhuma implementação futura simplifique o fluxo para confirmação única, e que a UI sempre mostre "quem confirmou primeiro".

- Evidência: "Ramo E: ambos confirmam, fica com status de aguardando agendamento." / "Tela de admin aparece quem confirmou primeiro de acordo com o timestamp." — pre-refinement.md §11
- Sinal: `pre_refinement_decision` · Origem: `agent-spec-sdd-run-tasks` · 2026-08-10T00:00:00Z

---

## [pre_refinement_decision] Administrador único, sem CRUD de usuários/perfis

**Regra que isto sugere:** não implementar cadastro público de admin, login social, múltiplos usuários, permissões, perfis ou roles administrativas — é sempre um único administrador fixo.

**O que ela faria (simples):** evita que uma task futura adicione RBAC ou multiusuário sem necessidade real do produto.

- Evidência: "Não existe cadastro público de administrador." / "Existe apenas um único administrador." / "Não criar login social, múltiplos usuários, permissões, perfis ou roles administrativas." — pre-refinement.md §11
- Sinal: `pre_refinement_decision` · Origem: `agent-spec-sdd-run-tasks` · 2026-08-10T00:00:00Z

---

## [pre_refinement_decision] Profissional único somente leitura, sem CRUD

**Regra que isto sugere:** não construir CRUD completo de profissionais — há apenas um profissional, tratado como dado somente leitura na UI.

**O que ela faria (simples):** impede expansão especulativa da feature para suportar múltiplos profissionais antes de ser necessário.

- Evidência: "Neste momento é somente um único profissional; não há necessidade de CRUD completo." — pre-refinement.md §11
- Sinal: `pre_refinement_decision` · Origem: `agent-spec-sdd-run-tasks` · 2026-08-10T00:00:00Z

---

## [pre_refinement_decision] Concorrência de reserva — nenhuma dupla ocupação de horário

**Regra que isto sugere:** toda escrita que ocupa um slot de agenda deve usar operação atômica (transação) — dois clientes nunca podem reservar o mesmo horário, e confirmação duplicada é proibida.

**O que ela faria (simples):** força qualquer implementação de reserva a usar transação Firestore em vez de leitura-depois-escrita ingênua.

- Evidência: "Dois clientes nunca poderão reservar o mesmo horário." / "Não permitir confirmação duplicada." — pre-refinement.md §11
- Sinal: `pre_refinement_decision` · Origem: `agent-spec-sdd-run-tasks` · 2026-08-10T00:00:00Z

---

## [pre_refinement_decision] Agendamentos cancelados somem da listagem principal

**Regra que isto sugere:** a query/listagem principal de agendamentos administrativos filtra status cancelado por padrão.

**O que ela faria (simples):** evita que uma implementação futura mostre cancelados misturados com ativos na tela principal.

- Evidência: "Agendamentos cancelados não precisam aparecer na listagem principal." — pre-refinement.md §11
- Sinal: `pre_refinement_decision` · Origem: `agent-spec-sdd-run-tasks` · 2026-08-10T00:00:00Z

---

## [pre_refinement_decision] Mensageria WhatsApp sem API paga

**Regra que isto sugere:** a integração de mensagens usa link/URL (ex.: wa.me) em vez de contratar API paga de WhatsApp Business.

**O que ela faria (simples):** impede que T3 (mensagens WhatsApp) introduza dependência de serviço pago sem necessidade comprovada.

- Evidência: "Não adicionar API paga de WhatsApp sem necessidade." — pre-refinement.md §11
- Sinal: `pre_refinement_decision` · Origem: `agent-spec-sdd-run-tasks` · 2026-08-10T00:00:00Z

---

## [repeated_fixture] Helper de captura de AppError em testes

**Regra que isto sugere:** centralizar o helper de captura de `AppError` num utilitário de teste compartilhado em vez de recopiá-lo por arquivo.

**O que ela faria (simples):** o mesmo helper `captureAppError` de 10 linhas foi escrito duas vezes, idêntico, em dois arquivos de teste diferentes; a regra evita que as cópias divirjam quando a forma de asserir erro de domínio mudar.

- Evidência: helper `captureAppError` duplicado literalmente — `src/shared/time.test.ts:14`, `src/firebase/firestorePaths.test.ts:7`
- Sinal: `repeated_fixture` · Origem: `agent-spec-qa-validator` · 2026-08-10T00:00:00Z

---

## [repeated_assertion_shape] Asserção de código de erro de domínio

**Regra que isto sugere:** padronizar a asserção de erro de domínio numa forma única (matcher/helper que confere `code` e, quando houver, `fieldErrors`).

**O que ela faria (simples):** o par "capturar AppError e conferir `error.code === \"validation\"`" aparece em quatro pontos com formatações diferentes; a regra fixa a forma para o erro de domínio ser sempre verificado do mesmo jeito.

- Evidência: `expect(error.code).toBe("validation")` em 4 pontos — `src/shared/time.test.ts:63,74,99`, `src/firebase/firestorePaths.test.ts:51`
- Sinal: `repeated_assertion_shape` · Origem: `agent-spec-qa-validator` · 2026-08-10T00:00:00Z

---

## [convention_drift] Centralização de textos de UI

**Regra que isto sugere:** todo texto exibível na UI vem de `src/shared/constants/texts.ts`, sem literal em componente.

**O que ela faria (simples):** a task criou o arquivo de textos pt-BR como ponto único, mas dois componentes do mesmo diff escreveram texto direto no JSX; a regra evita que as próximas tasks copiem o padrão errado e a centralização deixe de valer.

- Evidência: textos de UI hardcoded em `app/page.tsx:33` e `src/shared/components/Toast.tsx:75` enquanto os demais arquivos consomem `adminTexts`/`publicTexts`
- Sinal: `convention_drift` · Origem: `staff-review` · 2026-08-10T00:00:00Z

---

## [scope_deviation] Tooling de agentes em task de feature

**Regra que isto sugere:** alterações de configuração do framework de agentes (`.claude`, `.codex`, `_run`) não entram em task de feature.

**O que ela faria (simples):** a task de fundação alterou o ignore do ESLint e o `.gitignore` para acomodar diretórios do framework de agentes, assunto sem relação com a feature; a regra mantém decisões repo-wide fora do commit de produto, facilitando revisão e revert.

- Evidência: ignore de `.claude/**` e `.codex/**` no ESLint (`eslint.config.mjs:17`) e entrada `**/_run/tmp/` no `.gitignore:49`, ambos fora de §5.2
- Sinal: `scope_deviation` · Origem: `staff-review` · 2026-08-10T00:00:00Z

---

## [repeated_assertion_shape] Asserção de bloqueio HTTP para o login

**Regra que isto sugere:** padronizar a checagem de bloqueio administrativo num único helper que asserta status de redirect + destino do Location.

**O que ela faria (simples):** o par "status 307 + Location apontando para /admin/login" é reescrito em três testes diferentes; um helper único evita que uma mudança no status de bloqueio (307 → 302/401) precise ser corrigida em três lugares e que um deles fique esquecido asserindo o valor antigo.

- Evidência: `expect(response.status()).toBe(307)` + verificação do destino do redirect repetida em 3 testes — `tests/e2e/admin-security.spec.ts:115,131,149`
- Sinal: `repeated_assertion_shape` · Origem: `agent-spec-qa-validator` · 2026-08-10T00:00:00Z

---

## [repeated_fixture] Setup de sessão admin verificada em testes

**Regra que isto sugere:** montar sessão administrativa de teste por um único builder (`sessaoDoAdministrador()`) em vez de encadear cookie + claim a cada caso.

**O que ela faria (simples):** o par de chamadas que monta uma sessão verificada do admin é repetido em oito testes; um builder único garante que, quando a forma da sessão mudar, só exista um ponto a ajustar.

- Evidência: `comCookieDeSessao(...)` + `sessaoVerificada(...)` encadeados em 6+ casos — `src/features/admin/auth.test.ts:146,216,226,246,280,293`
- Sinal: `repeated_fixture` · Origem: `agent-spec-qa-validator` · 2026-08-10T00:00:00Z

## [convention_drift] Formato do payload de log estruturado

**Regra que isto sugere:** eventos de log estruturado usam prefixo `[modulo]`, mensagem pt-BR e campos com formato fixo por nome (`missing` sempre lista).

**O que ela faria (simples):** o mesmo evento "configuração ausente" é emitido com o campo `missing` como string em dois módulos e como array em um terceiro, então qualquer filtro ou alerta na ingestão precisa tratar dois schemas para o mesmo nome de campo; a regra fixaria o formato por nome de campo e evitaria que cada módulo novo escolha o seu.

- Evidência: `missing` emitido como string em `src/firebase/admin.ts:78` e `src/features/admin/auth.ts:353`, e como array em `src/firebase/client.ts:63`, todos sob o mesmo evento "configuração ausente"
- Sinal: `convention_drift` · Origem: `staff-review` · 2026-08-11T00:00:00Z

---

## [repeated_fixture] Seed de agendamento e disponibilidade em testes de integração

**Regra que isto sugere:** centralizar o seed de `agendamentos` e `disponibilidade/{data}` num builder compartilhado de testes de integração, em vez de redeclarar por arquivo.

**O que ela faria (simples):** os helpers `seedAppointment`/`seedDay` são declarados localmente e usados 16 vezes no primeiro arquivo de integração do projeto; como as próximas tasks (T3-T7) vão semear os mesmos documentos, um builder compartilhado evita que cada arquivo novo recrie o formato do documento e derive silenciosamente do schema real.

- Evidência: helpers `seedAppointment`/`seedDay` reutilizados em 16 chamadas, definindo o shape completo do documento de agendamento e do mapa `slots` — `tests/integration/bookingService.test.ts:62,127,363,445,461`
- Sinal: `repeated_fixture` · Origem: `agent-spec-qa-validator` · 2026-08-11T00:00:00Z

---

## [repeated_assertion_shape] Asserção de AppError por tipo, código e mensagem

**Regra que isto sugere:** padronizar a verificação de erro de domínio num helper único que asserta instância de `AppError`, `code` e `message` literal de uma vez.

**O que ela faria (simples):** o mesmo trio de asserções (`toBeInstanceOf(AppError)` + `.code` + `.message`) aparece em 6 testes do mesmo arquivo; sem uma forma canônica, um teste novo pode esquecer uma das três verificações e aceitar um erro do tipo errado ou com mensagem que o usuário nunca deveria ver.

- Evidência: trio `toBeInstanceOf(AppError)` + `.code` + `.message` repetido em 6 testes — `tests/integration/bookingService.test.ts:102,146,236,259,373,403`
- Sinal: `repeated_assertion_shape` · Origem: `agent-spec-qa-validator` · 2026-08-11T00:00:00Z

---

## [repeated_fixture] Helper de captura de AppError em testes (validators/time)

**Regra que isto sugere:** centralizar o helper de captura de `AppError` num utilitário de teste compartilhado em vez de recopiá-lo por arquivo.

**O que ela faria (simples):** o mesmo helper `captureAppError` de 10 linhas foi escrito duas vezes, idêntico, em `src/shared/time.test.ts` e `src/shared/validators.test.ts` (arquivos novos desta correção de T2) — sinal recorrente do mesmo padrão já visto em T1; reforça o caso para o utilitário compartilhado.

- Evidência: helper `captureAppError` duplicado — `src/shared/time.test.ts:18`, `src/shared/validators.test.ts:21`
- Sinal: `repeated_fixture` · Origem: `agent-spec-qa-validator` · 2026-08-11T00:00:00Z

---

## [repeated_assertion_shape] Tripla AppError (code/message/fieldErrors) entre suítes de T2

**Regra que isto sugere:** padronizar a verificação de erro de domínio num matcher/helper único que asserta instância de `AppError`, `code`, `message` e `fieldErrors` de uma vez.

**O que ela faria (simples):** o mesmo trio de asserções sobre `AppError` capturado aparece repetido entre a suíte de integração (`bookingService.test.ts`) e a nova suíte `validators.test.ts` — sem forma canônica, um teste novo pode esquecer uma das verificações.

- Evidência: `toBeInstanceOf(AppError)` + `.code` + `.message`/`.fieldErrors` repetido em `tests/integration/bookingService.test.ts:123,167,289,522,552` e `src/shared/validators.test.ts:45,69,96`
- Sinal: `repeated_assertion_shape` · Origem: `agent-spec-qa-validator` · 2026-08-11T00:00:00Z

---

## [convention_drift] Mensagens de erro pt-BR centralizadas

**Regra que isto sugere:** toda mensagem de `AppError` vem de `src/shared/constants/texts.ts`, nunca literal no `throw`.

**O que ela faria (simples):** a convenção existe só no tech_spec da feature (§12.2), que não é lido a cada correção — por isso a mesma falha reaparece em rodadas e arquivos diferentes: 14 mensagens inline foram corrigidas na rodada anterior de T2, 2 sobraram no repository e `src/features/admin/auth.ts` (T1) ainda carrega literais, um deles duplicado de `dominioTexts.servicoIndisponivel`. Uma regra de projeto faria o executor buscar a constante antes de escrever o texto, em vez de descobrir isso só no gate.

- Evidência: `AppError` com mensagem literal em vez de constante — `src/features/agendamentos/repositories/appointmentRepository.ts:306,358`
- Sinal: `convention_drift` · Origem: `staff-review` · 2026-08-11T00:00:00Z

---

## [scope_deviation] Infraestrutura de teste na lista de arquivos da task

**Regra que isto sugere:** arquivos de infraestrutura de teste (config de emulador, ignore, script de suíte) entram nas tabelas §5.1/§5.2 da task, não apenas nas Notas/Observações.

**O que ela faria (simples):** o executor precisou criar config de emulador, ignore de log e script de suíte para os testes de integração de T2, e registrou tudo na §7 em vez das tabelas de arquivos — a checagem automática de escopo (Camada 0 do QA, Tech Review) não enxerga esses arquivos e cada gate precisa reconciliar à mão. A regra faria o gerador de tasks já prever essas linhas quando a task tem teste de integração/E2E.

- Evidência: `.gitignore` modificado fora de §5.1/§5.2, declarado apenas na §7 — `.gitignore:31`
- Sinal: `scope_deviation` · Origem: `staff-review` · 2026-08-11T00:00:00Z

---

## [repeated_assertion_shape] Verificação de AppError de validação repetida

**Regra que isto sugere:** extrair um helper de asserção (ex.: `expectValidationError(fn, campo, mensagem)`) para o padrão try/catch + isAppError + code + fieldErrors.

**O que ela faria (simples):** o mesmo bloco try/catch seguido de checar `isAppError`, `code` e (na maioria) `fieldErrors` se repete em 5 dos 8 testes do arquivo; um helper compartilhado reduziria a duplicação e padronizaria a asserção de erro de validação em toda a suíte — mesma família de sinal já visto em T1/T2, agora numa 3ª suíte diferente.

- Evidência: bloco try/catch + isAppError + code check repetido em 5 testes — `src/features/whatsapp/whatsappService.test.ts:48,67,84,110,131`
- Sinal: `repeated_assertion_shape` · Origem: `agent-spec-qa-validator` · 2026-08-11T00:00:00Z

---

## [repeated_fixture] Builder de agendamento e relógio fixo duplicados entre suites de componente

**Regra que isto sugere:** centralizar `buildAppointment`/relógio fixo de teste de agendamento num helper compartilhado em vez de duplicar por arquivo de teste.

**O que ela faria (simples):** `buildAppointment()` e a constante `AGORA` foram copiados de forma idêntica em dois arquivos de teste de componente da mesma task; um builder único evita que os dois divirjam silenciosamente quando o shape de `Appointment` mudar.

- Evidência: `buildAppointment` idêntico + `AGORA` idêntico em `AppointmentList.test.tsx:33,35` e `AppointmentCardActions.test.tsx:36,43`
- Sinal: `repeated_fixture` · Origem: `agent-spec-qa-validator` · 2026-08-11T00:00:00Z

---

## [convention_drift] Tipo de Server Action na UI

**Regra que isto sugere:** o tipo da Server Action vista pela UI é declarado e exportado pelo componente-folha que a invoca, e importado pelos containers — nunca redeclarado.

**O que ela faria (simples):** o componente que só repassa a Server Action recriou o mesmo tipo em vez de importá-lo do componente que de fato a chama, gerando dois símbolos exportados homônimos na mesma feature; a regra fixa quem é dono do tipo e evita que as cópias divirjam quando o payload mudar.

- Evidência: `RequestPublicAppointmentAction` declarado verbatim em `src/features/agendamentos/components/PublicAvailabilityView.tsx:26` e em `src/features/agendamentos/components/PublicBookingForm.tsx:18`, enquanto `AppointmentActionFn` (mesma feature) é declarado uma vez em `AppointmentCard` e importado por `AppointmentList` — T7 / componentes públicos de disponibilidade e solicitação
- Sinal: `convention_drift` · Origem: `staff-review` · 2026-08-12T00:00:00Z

---

## [scope_deviation] Textos centralizados fora do escopo declarado

**Regra que isto sugere:** task que adiciona tela, componente ou mensagem de erro declara `src/shared/constants/texts.ts` entre os arquivos a modificar.

**O que ela faria (simples):** a task escreveu UI nova e precisou adicionar textos ao arquivo central, que não estava declarado — o executor sai do escopo sem alternativa possível e a checagem de escopo do gate perde o arquivo de vista; a regra alinha a declaração com a convenção de textos centralizados que o projeto já exige.

- Evidência: `publicTexts` (bloco novo) e chaves novas em `feedbackTexts` adicionadas a `src/shared/constants/texts.ts` sem que o arquivo constasse em §5.1/§5.2 da T7 (que lista apenas `app/page.tsx` e `app/globals.css`) — confirmado em 2 rodadas de Tech Review (P3, BAIXO em ambas)
- Sinal: `scope_deviation` · Origem: `staff-review` · 2026-08-12T00:00:00Z

---

## [repeated_fixture] Setup de E2E administrativo autenticado

**Regra que isto sugere:** todo spec E2E que precise de sessão administrativa usa `adminE2ESeed` e fixa `test.use({ baseURL: E2E_EMULATED_SERVER.baseURL })`, nunca o baseURL padrão.

**O que ela faria (simples):** o seed e o pin de baseURL são inseparáveis — o seed só funciona contra o servidor emulado (porta 3101) e falha de forma confusa contra o servidor do CT-21; a regra evita que o próximo autor de E2E descubra o acoplamento pela mensagem de erro.

- Evidência: `adminE2ESeed(page)` usado em 6 testes e `test.use({ baseURL: E2E_EMULATED_SERVER.baseURL })` repetido em `tests/e2e/admin-a11y.spec.ts:37,106` e `tests/e2e/professional-surface.spec.ts:37,56`
- Sinal: `repeated_fixture` · Origem: `agent-spec-qa-validator` · 2026-08-12T00:00:00Z

---

## [scope_deviation] Correção pré-existente fora do escopo declarado

**Regra que isto sugere:** task que precisa corrigir bug pré-existente em arquivo não declarado registra o arquivo em §5.2 antes de tocá-lo.

**O que ela faria (simples):** T8 corrigiu um bug de T1 no módulo de autenticação administrativa sem que o arquivo constasse na lista de arquivos da task, e a alteração só chegou ao revisor por uma nota em texto livre do sumário; a regra faria o desvio virar entrada declarada, que os gates conferem por construção.

- Evidência: `src/features/admin/auth.ts:319` alterado sem constar em §5.1/§5.2 da T8
- Sinal: `scope_deviation` · Origem: `staff-review` · 2026-08-12T00:00:00Z

---

## [scope_deviation] Infra de teste tocada fora do escopo declarado

**Regra que isto sugere:** arquivo de configuração de infraestrutura habilitado por uma task de teste entra na lista de arquivos a modificar da task.

**O que ela faria (simples):** o emulador de Auth precisou ser ligado em `firebase.json` para os E2E de T8 existirem, mas o arquivo não estava declarado; a regra tornaria previsível que pré-requisito de infraestrutura é escopo da task que o consome.

- Evidência: bloco `emulators.auth` adicionado a `firebase.json:10`, ausente de §5.1/§5.2 da T8
- Sinal: `scope_deviation` · Origem: `staff-review` · 2026-08-12T00:00:00Z

---

## [convention_drift] Project id de emulador por suíte

**Regra que isto sugere:** um único project id de emulador por repositório, compartilhado por todas as suítes que sobem a Emulator Suite.

**O que ela faria (simples):** a suíte de integração usa `demo-crosshill` e a de E2E usa `demo-crosshill-e2e` nas mesmas portas, então um emulador deixado de pé por uma é adotado pela outra sem aviso e a falha resultante é difícil de ler; a regra fixaria o nome único e eliminaria essa classe de confusão.

- Evidência: `--project demo-crosshill` em `package.json` vs `--project demo-crosshill-e2e` em `playwright.config.ts:151`, mesmas portas de `firebase.json`
- Sinal: `convention_drift` · Origem: `staff-review` · 2026-08-12T00:00:00Z

---
