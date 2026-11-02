# Endpoints e contrato

Referência legível; contrato estruturado em[openapi.json](openapi.json). Servidor local:http://127.0.0.1:3000. Demonstração:https://wise-discovery-v1.azurewebsites.net. Dados enviados devem serJSON; mutações exigem cabeçalhoOrigin igual à origem configurada.

## Pedidos

| Método e rota | Acesso | Resultado |
|---|---|---|
| POST /api/discovery/beach/orders | Público para criar | 201 novo pedido;200 repetição idêntica |
| POST /api/discovery/beach/orders com action=seed | Administração | Adiciona até3 exemplos sem sobrescrever |
| GET /api/discovery/beach/orders | Administração | Lista últimos200, flagtruncated; UI ordena ativos por chegada |
| PATCH /api/discovery/beach/orders | Administração | Transição comnumber/status/updatedAt;200 ou409 |
| DELETE /api/discovery/beach/orders | Administração | Exclui pelo number/updatedAt atual;200 ou409 |
| GET /api/pedido/:numero | Chave do pedido no x-order-key | 200{order};404 ausente/chave inválida |

`number` é um códigohexadecimal de24 caracteres (ouIDDEMO reservado para exemplos do painel). A consulta pública de umDEMO sem sua chave também retorna404; crie seu próprio pedido para testar200.

### Criar: exemplo de corpo, não credenciais de demonstração

```json
{
  "requestId": "00000000000000000000000000000001",
  "key": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  "location": "Guarda-sol 15",
  "items": [{"id":"coco","quantity":2}]
}
```

O exemplo dekey é apenas um placeholder público: não o reutilize em pedidos reais. A interface gera requestId16 byteshex e chave32 bytesbase64 url comWeb Crypto. Repetir mesmoID/chave/corpo devolve o mesmo pedido; alterar o corpo da mesma tentativa retorna409. Se perder a resposta, repita com as mesmas credenciais.

O servidor aceita de1 a8 itens únicos do catálogo e quantidades inteiras1 a20. Localização deve ter2 a100 caracteres. Ignora preços/totais sugeridos pelo navegador e calcula pelo catálogo. Duas águas de coco totalizam2400 centavos.

Resposta de sucesso:

```json
{"order":{"number":"EXEMPLO_DO_NUMERO","location":"Guarda-sol 15","items":[{"id":"coco","name":"Água de coco","quantity":2,"unitPrice":1200}],"total":2400,"status":"recebido","createdAt":"DATA_ISO_UTC","updatedAt":"DATA_ISO_UTC","history":[{"status":"recebido","at":"DATA_ISO_UTC"}],"demo":true}}
```

Os placeholders acima não são uma resposta executada. Campo`demo=true` identifica o ambiente de teste. Chave original, hash e metadadosCosmos não são retornados.

### Consultar

```bash
curl -i "$BASE/api/pedido/$NUMERO" -H "x-order-key: $CHAVE_DO_PEDIDO"
```

DefinaBASE,NUMERO eCHAVE_DO_PEDIDO no seu ambiente. O código administrativo não substitui a chave de consulta. Não coloque a chave emURL,issueouREADME. Resposta usaCache-Control:no-store.

### Atualizar

```json
{"number":"NUMERO_ATUAL","status":"em preparo","updatedAt":"VALOR_DA_ULTIMA_LEITURA"}
```

O cookie administrativo deve acompanhar a chamada. Recebido→em preparo→pronto→entregue; cancelamento antes da entrega. Terminal não reabre. Timestampantigo/ETagconcorrente retorna409; transição inválida400.

## Sessão administrativa

| Método | Rota | Resultado |
|---|---|---|
| GET | /api/discovery/session | authenticated:boolean |
| POST | /api/discovery/session | keyválida cria cookie;logout:true limpa cookie |

Cookie`wise_discovery_admin`,HttpOnly,SameSiteStrict,path`/api/discovery`,8 horas,Secure emprodução. Não fica disponível noJavaScript. O código do piloto é compartilhado entre Admin e operação; não há papéis individuais.

## Discovery e documentos

| Método/rota | Acesso e comportamento |
|---|---|
| POST /api/discovery/register | Público: name/email/consent; cria sessão independente e retorna tokenprivado |
| GET /api/discovery/invitations | Admin: resumos, sem respostas |
| POST /api/discovery/invitations | Admin: company/segment; retorna convite individual |
| POST /api/discovery/respond | Token: open/draft/submit; consentimento obrigatório para salvar/enviar |
| GET /api/discovery/records/:id | Admin: record eetag |
| GET mesmo caminho?format=markdown | Admin: exporta entrevista |
| GET mesmo caminho?format=pipeline | Admin: roteiro de prompts |
| PATCH /api/discovery/records/:id | Admin eetag: notes/nextStep ouaction=revoke |
| DELETE /api/discovery/records/:id | Admin eetag: exclui registro |
| POST /api/discovery/projects | Admin: project=barraquinha; importação idempotente |
| POST mesma rota +action=complete-test-model/etag | Admin: substitui somente o caso acadêmico pelo modelo fictício; faça snapshot antes |
| GET /api/discovery/records/:id/studio | Admin: documentos, estados eetag |
| PATCH mesma rota | Admin: etag/stage/content/reviewed;10 a12.000 caracteres |
| GET mesma rota?format=prompt&stage=prd | Admin: prompt da etapa |
| GET mesma rota?format=ignition | Admin: compilação;409 seausente/nãorevisado/desatualizado |
| GET /api/discovery/health | Público: verificação de configuração e armazenamento;200/503 |

O token de convite permite acessar um rascunho; o original não é persistido. Caso acadêmico não pode ser respondido pela rota pública. Após envio, o token retorna apenas confirmação/protocolo, não todas as respostas. GETadministrativo de pesquisa não lista pedidos kind=beach_order.

## Erros e limites

400 validação;401 sessão administrativa ausente;403 origem não autorizada;404 inexistente/chave inválida;409 concorrência/limite/conflito;410 convite expirado;413 corpo muito grande;415 tipo nãoJSON;429 limite de tentativas;503 indisponibilidade. Nem todo código se aplica a todas as rotas: vejaOpenAPI.

Pedidos:30 tentativas/minuto/processo e200 retidos. Cadastro:10/minuto/processo e200 entrevistas. Login:10/minuto/processo. Esses limites locais não são defesa distribuída contra abuso. Não execute carga na demonstração compartilhada.
