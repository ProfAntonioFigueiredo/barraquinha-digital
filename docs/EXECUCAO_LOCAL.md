# Execução local e adaptação por alunos

## Preparar

Node.js 22, npm eGit. Não é necessário instalar banco local ou contratar IA. Não use credenciais da demonstração.

```bash
git clone https://github.com/ProfAntonioFigueiredo/barraquinha-digital.git
cd barraquinha-digital
npm ci
npm run setup:local
npm run dev -- --hostname 127.0.0.1
```

Abra http://127.0.0.1:3000/barraquinha e a operação em outra aba. Leia o valor de`DISCOVERY_ADMIN_KEY` em`.env.local` para o login. O comando não sobrescreve um arquivo já existente. Use um editor local para consultar o código; não poste seu conteúdo em issue ou vídeo público.

## Configuração

| Variável | Local | Azure |
|---|---|---|
| DISCOVERY_ORIGIN | http://127.0.0.1:3000 | OrigemHTTPS exata da aplicação |
| DISCOVERY_LOCAL_STORAGE | true | Ausente/false |
| DISCOVERY_DATA_DIR | Opcional; padrão data/discovery | Não configurar para fallback |
| DISCOVERY_ADMIN_KEY | Aleatório, pelo menos32 caracteres | Segredo da aplicação, fora doGit |
| DISCOVERY_SESSION_SECRET | Aleatório, pelo menos32 caracteres | SegredoHMAC separado |
| DISCOVERY_SECURE_COOKIE | false | true |
| DISCOVERY_COSMOS_ENDPOINT | Vazio | EndpointCosmos com identidade gerenciada |
| DISCOVERY_PORTAL | true | true |

A origem deve coincidir com a URL usada no navegador: trocar127.0.0.1 porlocalhost sem ajustar configuração causa403 nas mutações. Em produção, nunca habilite armazenamento local para contornar uma falha de banco. Nunca use prefixoNEXT_PUBLIC em credenciais.

## Preencher o modelo fictício

Com o servidor local rodando, em outro terminal:

```bash
npm run seed:model
```

Esse comando acessa apenaslocalhost/127.0.0.1, autentica com seu código local, importa o caso, guarda um snapshot em`build/`, preenche13 respostas/11 documentos e adiciona3 pedidos de exemplo. Rodar novamente substitui os documentos do caso acadêmico: use para reiniciar seu exemplo, não para preservar uma análise própria. O snapshot permite consultar o conteúdo anterior. Não altera entrevistas reais.

No Admin, abra Barraquinha Digital → documentos e prompts. Todos estarão atuais/revisados como exemplo. Alterar Business Case, notas ou respostas pode desatualizar documentos dependentes; revisar não significa que teste ou implantação foram executados.

## Testar e empacotar

```bash
npm run build
npm run test:discovery
npm run discovery:package
```

A suíte cria diretório temporário e credenciais próprias, sobe servidor na3117 e remove somente os registros criados por ela. Não usa seu banco local nem a demonstração remota por padrão. As suítes podem ser direcionadas a produção por variáveisTEST_DISCOVERY_*, mas isso não é necessário para o aluno e não deve ser feito contra terceiros.

Para executar o pacote com assets:

```bash
node --env-file=.env.local build/discovery-runtime/server.js
```

O pacote inclui`.next/static` e`public`; executar diretamente`.next/standalone/server.js` sem copiar assets pode servir a API semCSS. `npm start` usa o servidor padrão doNext e não é a forma recomendada para o artefato standalone.

## Capturas e teste visual automatizado

```bash
npm run discovery:package
npm run test:ui
```

O teste visual atual usa Google Chrome instalado no caminho padrão do macOS, perfil temporário, portas3118/9224 e backend local isolado. EmWindows/Linux, adapte o caminho do executável antes de rodar. Essa dependência não é necessária para as suítesHTTP nem para usar a aplicação. As capturas ficam em`build/beach-*.png`; não são enviadas automaticamente a nenhum serviço.

## Adaptar o exercício

1. Mantenha requisitos essenciais e explique as escolhas.
2. Altere catálogo em`src/lib/beach/model.ts`; valores são centavos.
3. Preserve validação de preço no servidor, transições e consulta privada.
4. Use entrevistas reais apenas com autorização; nunca as publique como exemplo.
5. Registre os prompts realmente enviados e suas correções, não um histórico reconstruído.
6. Se adicionarML, defina objetivo/dados/baseline/teste antes de treinar.
7. Valide os limites de cloud antes de implantar. Rodar localmente não exige Azure.
