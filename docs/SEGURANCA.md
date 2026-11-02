# Acessos, dados e limites

## Quem acessa o quê

Cliente: cria pedido de teste e consulta apenas com número/chave privados. Não tem login administrativo. Operação/estúdio: cookieHttpOnlyassinado; o mesmo código do pesquisador atende ambos no piloto. Não há contas individuais nem isolamento porfuncionário/barraca.

A chave do pedido é gerada no navegador comWeb Crypto e enviada no cabeçalhox-order-key para consulta. SóSHA256 é persistido. Quem possuir número/chave pode ler localização e itens; trate a referência como credencial. Última consulta e tentativa pendente ficam nolocalStorage, sem nome ou pagamento. Em dispositivo compartilhado, limpe os dados do site ao terminar.

O código administrativo real não pode ser colocado emREADME, imagem, issue ou histórico de comandos publicado. Na demonstração, peça ao responsável por canal privado. No seu clone,`setup:local`gera segredos únicos. Nenhum arquivo.env,backupdecliente ou extração de aula faz parte desteGit.

## Controles implementados

- MutaçõesJSONcomOriginvalidada; cookieSameSiteStrict,HttpOnlyeSecureemprodução.
- Validação no backend, dinheiro em centavos e catálogo autoritativo.
- Consulta privada com404 indistinto para inexistente/chave inválida.
- ETag/updatedAt em mudança de estado; proteção contra sobrescrita.
- Idempotência para reenvio do mesmo pedido.
- Respostas sem hashes/segredos/metadadosCosmos;Cache-Controlno-store.
- ProduçãoCosmoscomidentidadegerenciada; sem fallback silencioso para arquivos.
- Separação lógica por tipo eTTL7/90 dias.
- Limites porprocesso para login/cadastro/criação e teto do piloto.

Esses controles não substituem auditoria independente, proteção distribuída contra abuso ou revisão de segurança de uma aplicação comercial.

## Antes de uso comercial

Adicionar identidades individuais e escopos de operador, isolamento por estabelecimento, recuperação/revogação de credenciais, controles distribuídos de abuso, gestão do catálogo/estoque, observabilidade adequada, testes físicos/mobile/rede/carga, procedimentos de backup/restore e política de dados compatível com operação real. Não habilitar pagamentos por apenas retirar o aviso de demonstração.

## Itens não publicados

Segredos administrativos/HMAC, arquivos.env, dados/exportsCosmos, carteirasOracle, materiais integraisFIAP/OneDrive, históricoGitdo siteinstitucional e credenciais deGitHub/Azure. Capturas usam base temporária fictícia e chave mascarada.

Relatos reais de clientes nunca devem ser commitados neste exemplo público. O modelo acadêmico preenchido é explícito e não equivale aConsentimentoouentrevista real.
