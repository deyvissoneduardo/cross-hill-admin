# TASKCARD - Execução Rápida (com Guardrails LLM)

## 1. Identificação
- **ID**: TC-001
- **Nome da Task**: Mascarar inputs de data/hora e travar formatação fora do padrão pt-BR/24h
- **model**: sonnet
- **risk**: medium
- **gates**: [qa, tech_review]   <!-- tipo=refactor_cross_module: Field.tsx é compartilhado por múltiplas features (login, agenda, configurações, vitrine pública); a mudança também toca eslint.config.mjs e CLAUDE.md, fora do módulo de UI -->
- **Variante**: web
- **mode**: standard
- **source**: recommended
- **source_note**: N/A
- **Responsável**: agente executor (via `/agent-spec-taskcard-run`)
- **Data**: 2026-08-12
- **Status**: A Fazer
- **Dependências**: Nenhuma
- **Símbolos públicos criados**: `parseTypedDatePtBr`, `parseTypedTimeOfDay` (novas funções em `src/shared/time.ts` — nomes sugeridos, mantenha a intenção se renomear)
- **Símbolos consumidos de outras tasks**: N/A
- **Relacionados**: `docs/specs/features/padronizacao-data-hora/v1/pre-refinement.md`

---

## 2. Contexto
O projeto já formata e valida data/hora corretamente (dd/mm/aaaa · 24h) em toda a camada de domínio (`src/shared/time.ts`), confirmado por varredura completa do código. O único ponto onde o formato pode escapar do controle do app são os 3 `<input type="date">`/`<input type="time">` nativos do HTML: o **valor** é sempre canônico, mas a **UI do seletor** desenhada pelo navegador segue o locale do SO/navegador de quem usa o sistema — podendo mostrar 12h/AM-PM ou ordem de data americana para um usuário brasileiro com navegador em inglês. Esta task blinda esses 3 pontos e trava reintrodução futura do problema.

---

## 3. Objetivo da Task
Substituir os 3 inputs nativos de data/hora por um campo de texto mascarado (dentro do componente compartilhado `Field.tsx`) cujo valor exibido e submetido é sempre dd/mm/aaaa (data) ou HH:mm 24h (hora), independentemente do navegador/SO do usuário; adicionar uma regra de lint que bloqueia reintrodução de formatação dependente de locale fora de `src/shared/time.ts`; e registrar a convenção no `CLAUDE.md`.

---

## 4. Escopo

### 4.1 Inclui
- [ ] Estender `src/shared/components/Field.tsx` para renderizar um input de texto mascarado quando `type === "date"` ou `type === "time"`, em vez do widget nativo do navegador.
- [ ] Adicionar a `src/shared/time.ts` as funções de parsing incremental necessárias para a máscara (ver §6).
- [ ] Substituir o `<label>`+`<input type="time">` manual de `src/features/agenda/components/ScheduleSlotGrid.tsx` (linhas ~184-204) pelo uso de `Field`.
- [ ] Verificar que `app/admin/agenda/page.tsx` (uso não-controlado, `next/form` GET, `name="data"`) e `src/features/agendamentos/components/PublicAvailabilityView.tsx` (uso controlado, `min`/`onChange`) continuam funcionando sem alteração de código, dado que a API pública de `Field` (props) não muda.
- [ ] Adicionar regra de lint em `eslint.config.mjs` proibindo `toLocaleDateString`/`toLocaleTimeString`/`toLocaleString`/`Intl.DateTimeFormat` fora de `src/shared/time.ts`, severidade `error`.
- [ ] Registrar a convenção "data/hora exibida usa `src/shared/time.ts`; 24h e dd/mm/aaaa obrigatórios" na seção Convenções do `CLAUDE.md`.

### 4.2 Fora do escopo
- [ ] Affordance visual de calendário/relógio (ícone clicável abrindo mini-picker customizado) — decidido no pré-refinamento: texto puro com placeholder é suficiente.
- [ ] Biblioteca de máscara de input (ex.: `react-imask`) — decidido no pré-refinamento: implementação manual, sem dependência nova.
- [ ] Mudar o formato de **persistência** interna (Firestore já usa `YYYY-MM-DD`/`HH:mm` e instantes ISO-8601 UTC) — o pedido é sobre exibição, não armazenamento.
- [ ] Qualquer refatoração de `Field.tsx`/`time.ts` não relacionada a data/hora (ex.: outros tipos de input).

---

## 5. Arquivos Envolvidos

### 5.0 Visão em Árvore

```
app/
└── admin/
    └── agenda/
        └── page.tsx                                    [R]
src/
├── shared/
│   ├── time.ts                                          [M]
│   └── components/
│       ├── Field.tsx                                    [M]
│       └── Field.test.tsx                               [M]
└── features/
    ├── agenda/
    │   └── components/
    │       ├── ScheduleSlotGrid.tsx                      [M]
    │       └── ScheduleSlotGrid.test.tsx                 [M]
    └── agendamentos/
        └── components/
            └── PublicAvailabilityView.tsx                [R]
eslint.config.mjs                                          [M]
CLAUDE.md                                                  [M]
```

Legenda: `[N]` Novo &nbsp; `[M]` Modificado &nbsp; `[R]` Referência

---

### 5.1 Arquivos Existentes (leitura/referência)
- `src/shared/time.ts` — funções canônicas já existentes (`isIsoDate`, `isTimeOfDay`, `formatDatePtBr`, `formatTimePtBr`, `normalizeTimeOfDay`) que a máscara reusa; entender o estilo de JSDoc/decisão de determinismo antes de adicionar as novas funções.
- `src/shared/components/Field.test.tsx` — padrão de teste do componente (`render` + `screen.getByLabelText`), a seguir nos novos testes.
- `app/admin/agenda/page.tsx` — 1º ponto de uso de `Field type="date"`: **não-controlado**, `name="data"`, `defaultValue`, submetido via `next/form` com método GET (query string `?data=`). É o caso que exige o espelho em input oculto (ver §6).
- `src/features/agendamentos/components/PublicAvailabilityView.tsx` — 2º ponto de uso de `Field type="date"`: **controlado** (`value`/`onChange`/`min`), sem `name`, sem submissão nativa de formulário.
- `docs/specs/features/painel-admin-agendamentos/v1/design.md` — contrato visual/acessibilidade (§9) já referenciado pelo JSDoc de `Field.tsx`; consulte se a máscara precisar de algum ajuste de foco/mensagem de erro.

### 5.2 Arquivos a Criar
Nenhum — toda a mudança estende arquivos existentes.

### 5.3 Arquivos a Modificar
- `src/shared/time.ts` — adicionar `parseTypedDatePtBr(texto: string): string | null` (converte dígitos digitados em dd/mm/aaaa, completo ou parcial, para `YYYY-MM-DD` quando válido e completo; `null` caso contrário) e `parseTypedTimeOfDay(texto: string): string | null` (idem para `HH:mm`). Ver §6 para o comportamento exato exigido.
- `src/shared/components/Field.tsx` — quando `type === "date"` ou `type === "time"`, renderizar o input mascarado em vez do nativo (ver §6 para a especificação completa: modo controlado vs. não-controlado, `min`/`max`).
- `src/shared/components/Field.test.tsx` — testes novos cobrindo os dois modos (controlado/não-controlado) para `type="date"` e `type="time"`.
- `src/features/agenda/components/ScheduleSlotGrid.tsx` — trocar o bloco manual de `<label>`+`<input type="time">` por `<Field id="agenda-novo-horario" type="time" label={agendaTexts.novoHorarioLabel} value={novoHorario} onChange={(event) => setNovoHorario(event.target.value)} disabled={pending} />`. `event.target.value` já chega no formato canônico `HH:mm` (ver §6) — nenhuma mudança na lógica de `setNovoHorario`/`adicionarHorario`.
- `src/features/agenda/components/ScheduleSlotGrid.test.tsx` — ajustar os testes que hoje disparam `fireEvent.change` no input nativo de horário, se o seletor/interação mudar de forma.
- `eslint.config.mjs` — nova regra `no-restricted-syntax` (ver §6).
- `CLAUDE.md` — nova linha na seção `## Convenções` (ver §6).

---

## 6. Descrição de Execução (COMO fazer)

### 6.1 Máscara de data/hora em `Field.tsx` — especificação exata

`Field` recebe hoje `type` como parte de `ComponentProps<"input">` e o repassa direto ao `<input>` nativo (`Field.tsx:14,34-45`). A mudança:

**Quando `type === "date"` ou `type === "time"`**, `Field` NÃO renderiza mais um `<input type={type}>` nativo. Em vez disso:

1. Mantém um **estado interno de texto de exibição** (`displayText`) — o que o usuário está digitando, sempre no formato de exibição (`dd/mm/aaaa` para data; `HH:mm` para hora — hora não muda de ORDEM, só precisa da máscara de dígitos/dois-pontos).
2. A cada tecla digitada, formata incrementalmente inserindo `/` (data) ou `:` (hora) automaticamente conforme os dígitos são digitados (aceita estado parcial, ex.: `"15/0"`), usando `parseTypedDatePtBr`/`parseTypedTimeOfDay` de `time.ts` para validar completude — essas funções devolvem a string canônica (`YYYY-MM-DD`/`HH:mm`) quando o texto representa uma data/hora **completa e válida**, ou `null` caso contrário (incompleto ou inválido).
3. **Modo controlado** (props `value` + `onChange` presentes, como em `PublicAvailabilityView`): `displayText` é derivado do `value` canônico recebido (via as funções inversas já existentes — `formatDatePtBr`/`formatTimePtBr` de `time.ts`, adaptando para não lançar quando `value` estiver vazio). Enquanto o usuário digita, `Field` atualiza `displayText` livremente SEM chamar o `onChange` do consumidor. Só quando `parseTypedDatePtBr`/`parseTypedTimeOfDay` devolve um valor não-nulo (completo e válido), `Field` dispara o `onChange` do consumidor com um evento cujo `target.value` é a string CANÔNICA — nunca o texto de exibição. Isso preserva o contrato atual: quem consome `Field` continua recebendo `YYYY-MM-DD`/`HH:mm` em `event.target.value`, exatamente como hoje.
4. **Modo não-controlado com `name`** (como em `app/admin/agenda/page.tsx`, submetido via `next/form` GET nativo): além do input de texto visível (que NÃO tem o atributo `name` — não deve ser submetido), `Field` renderiza um `<input type="hidden" name={name} value={valorCanonicoAtual} />`. O `valorCanonicoAtual` começa a partir de `defaultValue` (se fornecido) e se atualiza a cada digitação completa/válida do usuário. É esse input oculto que a submissão do formulário GET de fato usa — garantindo que a query string (`?data=...`) sempre receba o formato canônico, nunca o texto de exibição.
5. **`min`/`max`** (usado por `PublicAvailabilityView` com `min={isoDateInicial}`): como o input visível passa a ser `type="text"`, o atributo HTML nativo `min`/`max` não tem efeito. Implemente a validação manualmente dentro de `Field`: quando o valor completo digitado violar `min`/`max` (comparação de string ISO — `YYYY-MM-DD` ordena lexicograficamente igual à ordem cronológica), trate como inválido (não dispare `onChange`, e opcionalmente mostre o `error` já suportado pelo componente).
6. Mantenha o `placeholder` visível (`dd/mm/aaaa` para data, `hh:mm` para hora) e toda a wiring de acessibilidade já existente (`aria-invalid`, `aria-describedby`, `label`/`htmlFor`) — nada disso muda.

### 6.2 Novas funções em `time.ts`

- `parseTypedDatePtBr(texto: string): string | null` — recebe o texto de exibição tal como o usuário digitou (com ou sem as barras já inseridas) e devolve `YYYY-MM-DD` se representar uma data completa e válida (reusando `isIsoDate` após a conversão de ordem), ou `null` caso contrário (incompleto, formato errado, ou data inexistente como `31/02`).
- `parseTypedTimeOfDay(texto: string): string | null` — idem para `HH:mm`, reusando `isTimeOfDay`.
- Ambas seguem o mesmo princípio de determinismo já documentado no topo de `time.ts` (manipulação de string, sem `Intl`/`Date` na saída).

### 6.3 `ScheduleSlotGrid.tsx`

Troque o bloco manual (linhas ~184-204: `<div><label htmlFor="agenda-novo-horario">...</label><input id="agenda-novo-horario" type="time" .../></div>`) por:

```tsx
<Field
  id="agenda-novo-horario"
  type="time"
  label={agendaTexts.novoHorarioLabel}
  value={novoHorario}
  onChange={(event) => setNovoHorario(event.target.value)}
  disabled={pending}
/>
```

`novoHorario`/`setNovoHorario`/`adicionarHorario` continuam recebendo `HH:mm` exatamente como hoje — nenhuma mudança na lógica de estado ou no handler do botão "Adicionar horário".

### 6.4 Regra de lint em `eslint.config.mjs`

Adicione um bloco de configuração (ESLint 9, flat config) aplicado a `src/**/*.{ts,tsx}` e `app/**/*.{ts,tsx}`, com `ignores: ["src/shared/time.ts"]`, usando `no-restricted-syntax` com seletores esquery cobrindo:
- chamadas a `.toLocaleDateString(`, `.toLocaleTimeString(`, `.toLocaleString(` em qualquer objeto;
- `new Intl.DateTimeFormat(` e `Intl.DateTimeFormat(` (com e sem `new`).

Severidade `error`. Mensagem da regra deve apontar para `src/shared/time.ts` como alternativa. Verifique a regra funcionando de fato (rode `npm run lint` após adicionar um uso de teste temporário de `toLocaleDateString` fora de `time.ts`, confirme que falha, remova o uso de teste) antes de considerar a task concluída — "funciona" só com evidência.

### 6.5 `CLAUDE.md`

Na seção `## Convenções` (já existe), adicione a linha:

```
- Data/hora exibida ao usuário usa `src/shared/time.ts`; 24h e dd/mm/aaaa são obrigatórios — NÃO use `toLocaleDateString`/`toLocaleTimeString`/`Intl.DateTimeFormat` (bloqueado por lint).
```

### 6.6 Exemplo de Payload
N/A — sem payload parcial (não é endpoint HTTP).

---

## 7. Guardrails de Execução (LLM) - DEVE / NÃO DEVE

### 7.1 DEVE
- Seguir o padrão de determinismo já documentado em `src/shared/time.ts` (manipulação de string, sem `Intl`/`Date` na formatação de saída).
- Manter a API pública de `Field` (todas as props existentes: `id`, `label`, `error`, `hint`, e o restante de `ComponentProps<"input">`) funcionando para os tipos NÃO afetados (`email`, `password`, `text`, etc.) exatamente como antes — nenhuma regressão nos outros usos de `Field` no projeto (login, configurações).
- Garantir que o valor emitido via `onChange`/submissão de formulário para `type="date"`/`type="time"` seja SEMPRE a string canônica (`YYYY-MM-DD`/`HH:mm`), nunca o texto de exibição — isso é o critério de aceite central da task.
- Alterar apenas os arquivos listados em §5.3.
- Rodar `npm test`, `npm run lint` e `npx tsc --noEmit` antes de reportar a task concluída.

### 7.2 NÃO DEVE
- Não adicionar nenhuma dependência nova (biblioteca de máscara) — decisão já tomada no pré-refinamento.
- Não implementar affordance visual de calendário/relógio (ícone/mini-picker) — fora do escopo.
- Não alterar o formato de persistência no Firestore nem qualquer lógica de negócio de `bookingService`/`availabilityService`.
- Não modificar `PublicAvailabilityView.tsx` nem `app/admin/agenda/page.tsx` a menos que a verificação da §4.1 revele quebra real de comportamento — se revelar, registre a causa-raiz antes de tocar.
- Não enfraquecer nenhum teste existente de `Field.test.tsx`/`ScheduleSlotGrid.test.tsx` para fazer a suíte passar — se um teste existente quebrar, ajuste a implementação ou o teste com justificativa explícita (`SUT_IS_CORRECT_BECAUSE:`), nunca apenas para "ficar verde".

---

## 8. Passos Sugeridos (checklist executável)
- [ ] Ler `src/shared/time.ts`, `Field.tsx`, `Field.test.tsx` e os 3 pontos de uso (§5.1) por completo.
- [ ] Implementar `parseTypedDatePtBr`/`parseTypedTimeOfDay` em `time.ts`.
- [ ] Implementar a lógica de mascaramento em `Field.tsx` (modo controlado, modo não-controlado com `name`, `min`/`max` manual).
- [ ] Atualizar `Field.test.tsx` com os novos casos (ver seção 10).
- [ ] Trocar o input manual de `ScheduleSlotGrid.tsx` por `Field type="time"`; ajustar `ScheduleSlotGrid.test.tsx` se necessário.
- [ ] Rodar a suíte completa (`npm test`) e confirmar zero regressão nos usos existentes de `Field` (login, configurações, agenda, vitrine pública).
- [ ] Adicionar e validar a regra de lint em `eslint.config.mjs` (com teste manual de que ela de fato bloqueia).
- [ ] Adicionar a linha de convenção no `CLAUDE.md`.
- [ ] Rodar `npm run lint`, `npx tsc --noEmit`, `npm test` uma última vez antes de concluir.

---

## 9. Aceite Técnico (critérios objetivos)
A task estará concluída quando:
- [ ] Os 3 pontos de input de data/hora (`app/admin/agenda/page.tsx`, `PublicAvailabilityView.tsx`, `ScheduleSlotGrid.tsx`) exibem um campo de texto mascarado (não o widget nativo do navegador), com placeholder `dd/mm/aaaa` ou `hh:mm`.
- [ ] O valor emitido por `onChange` (modo controlado) e o valor submetido via formulário nativo (modo não-controlado com `name`) são sempre a string canônica (`YYYY-MM-DD`/`HH:mm`), nunca o texto de exibição digitado.
- [ ] Digitação parcial/incompleta não dispara `onChange` do consumidor nem corrompe o estado controlado do pai.
- [ ] `min`/`max` continuam sendo respeitados em `PublicAvailabilityView` (validação manual, já que o input não é mais `type="date"` nativo).
- [ ] `npm run lint` falha com uma chamada de teste temporária a `toLocaleDateString` fora de `time.ts`, e passa limpo sem ela.
- [ ] `CLAUDE.md` tem a nova linha de convenção na seção Convenções.
- [ ] Nenhum uso existente de `Field` (`type="email"`, `type="password"`, etc.) regride.
- [ ] `npm test`, `npm run lint` e `npx tsc --noEmit` passam sem erros.

---

## 10. Testes

<!-- preenchido pelo agent-spec-qa-test-generator -->

---

## 11. Notas / Observações
Esta TaskCard nasceu do pré-refinamento `docs/specs/features/padronizacao-data-hora/v1/pre-refinement.md` (Ramos A, B e D — Ramo C foi uma investigação que não gerou entregável, confirmando ausência de outros pontos cegos). Decisões já fechadas no pré-refinamento e não abertas para reconsideração nesta task: sem biblioteca de máscara, sem affordance visual de picker, lint com severidade `error`.

### ADRs Aplicáveis nesta Feature
- Nenhuma (`docs/adr/INDEX.md` não existe neste projeto).
