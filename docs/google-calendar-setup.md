/# Ativação da integração com Google Calendar

Este guia descreve como ativar, validar, renovar e desativar a integração do
Crosshill Admin com o Google Calendar.

## 1. O que a integração faz

Depois do vínculo com a conta Google:

- agendamentos ativos já existentes são enviados ao calendário;
- cada novo agendamento cria um evento amarelo com o status **Aguardando confirmação**;
- confirmar no painel muda o evento para **Confirmado**, na cor verde;
- cancelar no painel mantém o evento como histórico, com o status **Cancelado** e cor vermelha;
- a descrição contém links do WhatsApp com textos de confirmação e cancelamento;
- o evento usa `America/Sao_Paulo` e duração padrão de 60 minutos;
- o mesmo agendamento nunca deve gerar eventos duplicados, pois seu ID externo é determinístico.

A sincronização é unilateral: **Crosshill Admin → Google Calendar**. Alterar ou
apagar um evento manualmente no Google não altera o Firestore nem o agendamento
do painel.

## 2. Pré-requisitos

Tenha em mãos:

- acesso de proprietário ou editor ao projeto no Google Cloud;
- acesso ao ambiente onde a aplicação está publicada;
- a URL HTTPS pública da aplicação, sem barra final;
- acesso à conta Google cujo calendário será vinculado;
- OpenSSL para gerar a chave de criptografia, ou outro gerador seguro de 32 bytes.

O projeto precisa estar acessível por HTTPS em produção. Para desenvolvimento,
o Google aceita uma URI de redirecionamento em `http://localhost`.

## 3. Preparar o projeto no Google Cloud

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Selecione o projeto que será usado pela aplicação ou crie um projeto dedicado.
3. Abra **APIs e serviços → Biblioteca**.
4. Procure por **Google Calendar API**.
5. Abra a API e clique em **Ativar**.

Não é necessário criar uma API key. Esta integração usa OAuth 2.0 no servidor.

## 4. Configurar a tela de consentimento

No Google Cloud, abra **Google Auth Platform**. Dependendo da interface da conta,
as mesmas opções podem aparecer em **APIs e serviços → Tela de consentimento OAuth**.

1. Em **Branding**, informe:
   - nome do app, por exemplo `Crosshill Admin`;
   - e-mail de suporte;
   - e-mail de contato do desenvolvedor;
   - domínio e links exigidos pelo Google, caso o app seja publicado externamente.
2. Em **Audience/Público**, escolha:
   - **Interno**, somente se a conta pertencer a uma organização Google Workspace
     e o calendário estiver na mesma organização; ou
   - **Externo**, para contas Gmail ou usuários fora da organização.
3. Em **Data Access/Acesso a dados**, adicione somente o escopo:

   ```text
   https://www.googleapis.com/auth/calendar.events
   ```

4. Se o app externo estiver em modo **Testing/Teste**, adicione a conta que será
   vinculada em **Test users/Usuários de teste**.

### Atenção ao modo de teste

Para aplicativos externos em teste, o Google pode expirar o refresh token após
sete dias. Isso faz a sincronização parar até um novo vínculo. Para uso contínuo
em produção, publique o aplicativo OAuth e conclua qualquer verificação solicitada
pelo Google. Aplicativos internos do mesmo Workspace não passam pelo mesmo fluxo
de publicação externa.

## 5. Criar o cliente OAuth

1. Abra **Google Auth Platform → Clients/Clientes** ou **APIs e serviços → Credenciais**.
2. Clique em **Criar cliente OAuth**.
3. Selecione **Aplicativo da Web**.
4. Dê um nome identificável, como `Crosshill Admin Web`.
5. Em **URIs de redirecionamento autorizados**, cadastre as URIs exatas.

Para desenvolvimento local:

```text
http://localhost:3000/admin/integracoes/google-calendar/callback
```

Para produção, substitua pelo domínio real:

```text
https://SEU-DOMINIO/admin/integracoes/google-calendar/callback
```

Exemplo:

```text
https://agenda.exemplo.com/admin/integracoes/google-calendar/callback
```

A URI diferencia HTTP/HTTPS, domínio, porta, caminho e barra final. Não coloque
uma barra depois de `callback`. Uma diferença mínima causa `redirect_uri_mismatch`.

6. Salve e copie:
   - **Client ID**;
   - **Client secret**.

Nunca coloque o Client secret em variável `NEXT_PUBLIC_*`, no Git ou em código
enviado ao navegador.

## 6. Gerar a chave de criptografia

O refresh token é salvo no Firestore criptografado com AES-256-GCM. Gere uma
chave aleatória de 32 bytes:

```bash
openssl rand -base64 32
```

Guarde o resultado no gerenciador de segredos do ambiente. Não commite essa
chave e não a envie por mensagem ou ticket.

Importante: depois que uma conta estiver vinculada, trocar a chave sem refazer o
vínculo torna o token existente impossível de descriptografar. Consulte a seção
“Rotação da chave”.

## 7. Configurar as variáveis de ambiente

Consulte também [`.env.example`](../.env.example). As variáveis necessárias são:

| Variável | Obrigatória | Exemplo/descrição |
|---|---:|---|
| `GOOGLE_CALENDAR_CLIENT_ID` | Sim | Client ID criado no Google Cloud. |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Sim | Client secret; somente no servidor. |
| `GOOGLE_CALENDAR_REDIRECT_URI` | Sim | URI exata cadastrada no cliente OAuth. |
| `GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY` | Sim | Saída de `openssl rand -base64 32`. |
| `GOOGLE_CALENDAR_EVENT_DURATION_MINUTES` | Não | Inteiro entre 5 e 1440; padrão `60`. |

### Ambiente local

Adicione ao `.env.local`:

```dotenv
GOOGLE_CALENDAR_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=seu-client-secret
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/admin/integracoes/google-calendar/callback
GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY=sua-chave-base64-de-32-bytes
GOOGLE_CALENDAR_EVENT_DURATION_MINUTES=60
```

Reinicie `npm run dev` depois de alterar o arquivo.

### Produção

Cadastre as mesmas variáveis no gerenciador de ambiente/segredos da plataforma
que executa o Next.js. Em produção, use a URL HTTPS pública:

```dotenv
GOOGLE_CALENDAR_REDIRECT_URI=https://SEU-DOMINIO/admin/integracoes/google-calendar/callback
```

Faça um novo build/deploy depois de definir as variáveis. Este repositório não
declara atualmente um destino de hosting no `firebase.json`; portanto, configure
os segredos na plataforma que efetivamente hospeda o Next.js, e não apenas no
Firebase Console.

## 8. Verificações antes do vínculo

Rode:

```bash
npm test
npx tsc --noEmit
npm run build
```

Confirme também:

- a Google Calendar API está habilitada;
- a conta está autorizada como usuário de teste, quando aplicável;
- a URI cadastrada no Google é idêntica à variável do ambiente;
- a chave de criptografia decodifica para exatamente 32 bytes;
- o relógio do servidor está sincronizado;
- a aplicação consegue acessar `accounts.google.com`, `oauth2.googleapis.com`
  e `www.googleapis.com` por HTTPS.

Para validar o tamanho da chave sem imprimi-la:

```bash
node -e 'const k=process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY||""; console.log(Buffer.from(k,"base64").length === 32 ? "chave válida" : "chave inválida")'
```

Execute esse comando no ambiente em que a variável está disponível. Ele imprime
somente o resultado da validação, nunca a chave.

## 9. Vincular a conta

1. Inicie ou publique a aplicação com as variáveis configuradas.
2. Entre em `/admin` com o administrador autorizado.
3. Abra **Agenda**.
4. Clique em **Vincular ao Google Calendar**.
5. Escolha a conta Google dona do calendário desejado.
6. Revise o acesso solicitado e aceite.
7. Aguarde o retorno para `/admin/agenda`.
8. Confirme a mensagem **Google Calendar vinculado e agendamentos sincronizados**.

O vínculo usa o calendário principal (`primary`) da conta escolhida. Ao concluir,
o servidor cria automaticamente o documento abaixo no Firestore:

```text
configuracoes/google-calendar
```

Esse documento contém apenas o token criptografado, IV, tag de autenticação,
identificador do calendário e data do vínculo. Não edite seus campos manualmente.

## 10. Validar o comportamento completo

Faça o teste com um horário futuro e, preferencialmente, um telefone controlado
pela equipe:

1. Disponibilize um horário no painel.
2. Pela página pública, crie um agendamento nesse horário.
3. No Google Calendar, confirme que surgiu um evento:
   - amarelo;
   - com título contendo `Aguardando confirmação`;
   - no dia e horário corretos;
   - com duração configurada;
   - com os dois links do WhatsApp na descrição.
4. Abra os links e confira os textos pré-preenchidos, sem necessariamente enviá-los.
5. Confirme o agendamento no painel.
6. Atualize o Google Calendar e confira título/status verde de **Confirmado**.
7. Crie outro agendamento de teste e cancele-o.
8. Confira que o evento permaneceu no calendário, agora vermelho e como **Cancelado**.
9. Confirme no painel que o horário cancelado voltou a ficar disponível.

Também valide em um celular, pois o aplicativo do Google Calendar pode transformar
URLs na descrição em links de maneira diferente da versão web.

## 11. Reconectar ou trocar a conta

O botão passa a exibir **Google Calendar vinculado** depois do primeiro vínculo.
Ele continua clicável: use-o para autorizar novamente ou trocar a conta Google.

Ao reconectar:

- o novo refresh token substitui o anterior;
- o calendário principal passa a ser o da nova conta;
- os agendamentos ativos são sincronizados na nova conta;
- eventos criados anteriormente na conta antiga não são apagados automaticamente.

Se trocar de conta, remova manualmente os eventos antigos caso não devam permanecer.

## 12. Desativar a integração

Ainda não existe botão de desconexão na interface. Para desativar com segurança:

1. No Firestore, faça backup e depois exclua somente o documento:

   ```text
   configuracoes/google-calendar
   ```

2. Na [página de conexões da Conta Google](https://myaccount.google.com/connections),
   remova o acesso do aplicativo.
3. Opcionalmente, remova as quatro variáveis obrigatórias do ambiente e faça
   um novo deploy.

Não exclua a coleção inteira `configuracoes`, pois ela contém outras definições
do produto.

## 13. Rotação da chave de criptografia

Para trocar `GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY`:

1. Remova o acesso do aplicativo na Conta Google.
2. Exclua somente `configuracoes/google-calendar` no Firestore.
3. Gere e configure a nova chave.
4. Faça o deploy/reinicie a aplicação.
5. Vincule novamente a conta pela Agenda.
6. Valide a criação e atualização de um evento.

Não troque a variável mantendo o documento antigo: a aplicação registrará a
integração como inválida porque a autenticação AES-GCM impedirá a leitura.

## 14. Solução de problemas

### `redirect_uri_mismatch`

- Compare a URI do Google Cloud com `GOOGLE_CALENDAR_REDIRECT_URI` caractere por caractere.
- Confira protocolo, domínio, porta, caminho e ausência de barra final.
- Verifique se a aplicação reiniciou após a alteração.

### “Acesso bloqueado” ou usuário não autorizado

- Confirme que a conta está em **Usuários de teste**.
- Confira se o aplicativo é Interno ou Externo de acordo com a conta usada.
- Verifique se o escopo `calendar.events` foi adicionado.

### O vínculo funcionou e parou após alguns dias

- Verifique se o app externo continua em modo Testing.
- Faça o vínculo novamente.
- Para operação contínua, publique o app OAuth e cumpra a verificação solicitada.

### O botão continua mostrando “Vincular”

- Confirme se `configuracoes/google-calendar` foi criado.
- Verifique se as quatro variáveis obrigatórias existem no processo do servidor.
- Confira nos logs mensagens iniciadas por `[google-calendar]`.
- Valide se a chave configurada é a mesma usada quando o vínculo foi criado.

### O agendamento existe, mas o evento não apareceu ou não atualizou

- Verifique conectividade do servidor com as APIs do Google.
- Procure por `[google-calendar] falha ao sincronizar agendamento` nos logs.
- Confirme que a Calendar API continua habilitada e que o acesso não foi revogado.
- Clique novamente no botão de vínculo; ao concluir o OAuth, os agendamentos
  ativos são reconciliados sem duplicação.

A criação/confirmação/cancelamento no Firestore é a operação principal. Uma falha
temporária no Google é registrada, mas não desfaz a operação do painel.

### Horário ou duração incorretos

- O evento usa `America/Sao_Paulo`.
- Confira o fuso da conta/calendário no Google.
- Confira `GOOGLE_CALENDAR_EVENT_DURATION_MINUTES`.
- Valores inválidos de duração voltam automaticamente para 60 minutos.

### Links do WhatsApp não abrem

- Confirme que o telefone persistido tem DDD e número válidos.
- Teste na versão web e no aplicativo do Google Calendar.
- Alguns clientes de calendário podem exibir a URL como texto; copie e cole no navegador.

## 15. Segurança e operação

- Nunca registre Client secret, refresh token ou chave de criptografia em logs.
- Restrinja o acesso ao documento `configuracoes/google-calendar` e aos segredos de produção.
- Não use variáveis `NEXT_PUBLIC_*` para nenhum segredo do Google.
- Mantenha ambientes de desenvolvimento e produção com clientes OAuth e chaves separados.
- Revogue imediatamente o acesso se houver suspeita de vazamento.
- Monitore mensagens `[google-calendar]` nos logs do servidor.
- A sincronização atual é best-effort; para garantia operacional com SLA, o passo
  seguinte recomendado é adicionar uma fila/outbox com repetição automática.

## 16. Referências oficiais

- [OAuth 2.0 para aplicações web no servidor](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Criar eventos no Google Calendar](https://developers.google.com/workspace/calendar/api/guides/create-events)
- [Referência de Events](https://developers.google.com/workspace/calendar/api/v3/reference/events)
- [Escopos da Google Calendar API](https://developers.google.com/workspace/calendar/api/auth)
- [Políticas de OAuth 2.0](https://developers.google.com/identity/protocols/oauth2/policies)
