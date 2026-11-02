# Implantação Azure e operação

Clonar, executar testes ou abrir a demonstração não cria recursos. Os passos abaixo só provisionam quando o aluno executa o script em sua própria assinatura.

## BoM de referência

| Componente | Configuração da demonstração | Observação |
|---|---|---|
| Aplicação | App ServiceLinux/Node 22,SKU F1/Free | Um plano já existente; semAlwaysOn |
| Banco | Cosmos DBforNoSQL,Free Tier=true | Uma conta, uma região, sem autenticação local por chaves |
| Throughput |400 RU/smanual no contêiner | Teto da conta400; não há escala automática paga |
| Dados | discovery/interviews,/id | Pedidos e pesquisas no mesmo contêiner, separados logicamente |
| Índices | createdAt e kind | Busca/ordenação do piloto |
| Acesso | Identidade gerenciada + papel de dados | Sem chave de banco no navegador |
| Recuperação | Backup periódico local da conta |4 h de intervalo,8 h de retenção conformeIaC |
| Retenção | Pedidos7 dias;pesquisa90 dias | Desde última alteração do item |
| Endereço | azurewebsites.net | Sem mudançaDNS ou domínio personalizado neste modelo |

A implantação existente usaSouth Central US paraF1 eBrazil South paraCosmos. Quotas/condições podem variar: o script não escolheSKU pago como fallback. Não se afirma queFree Tier esteja disponível em toda conta, nem que a arquitetura tenhaSLA ou suporte à carga comercial de uma praia.

## Provisionar em conta própria

Pré-requisitos: AzureCLI autenticada, Bicep e permissão para criar recursos/identidade/papel de dados. O proprietário deve verificar Free Tier disponível na assinatura e quotaF1 da região. Se já houverCosmosFree Tier em outro grupo, o script para, em vez de criar conta paga.

```bash
az login
az account set --subscription SEU_ID_DE_ASSINATURA
npm ci
npm run build
npm run test:discovery
npm run discovery:package
python3 infra/discovery/deploy-free.py --app-name NOME_GLOBAL_UNICO --app-location southcentralus
```

A assinatura padrão vem de`az account show`; pode ser definida em`AZURE_SUBSCRIPTION_ID`. Grupo padrão`rg-barraquinha-free`, substituível por`AZURE_RESOURCE_GROUP`. O nome doApp é globalmente único. ReviseBicep antes de executar; não use assinatura ou identificadores do responsável.

O script gera adminKey/sessionSecret em`build/discovery-free-secrets.json`, permissões600, e guarda código de acesso em`build/discovery-free-admin-access.txt`. Esses arquivos não pertencem aoGit. Ele valida/provisionaF1/CosmosFree, configura origemHTTPS e publicaZIP. Não imprime segredos e não alteraDNS.

O script é uma base para conta própria; não foi executado para provisionar uma segunda conta durante a publicação do repositório. A aplicação live original usa os recursos já existentes do responsável.

## Após implantação

1. Verifique`/api/discovery/health`200.
2. Abra as três telas; entre na operação com seu código.
3. Crie pedido e consulte com número/chave.
4. Mude status e confira cliente; recarregue ambas as telas.
5. ConsulteData Explorer comMicrosoft Entra e papel de dados adequado; não habilite chaves só para leitura.
6. RegistreURL,commit,data,região e testes reais. Não trate retorno do comando deploy como prova de fluxo completo.

## Consultar Cosmos sem alterar dados

Data Explorer→discovery→interviews→NewSQL Query. A identidade humana pode precisar deCosmos DBBuilt-in Data Reader;Ownerdeinfraestrutura não equivale automaticamente a papel de dados. Não conceda acesso amplo ao aluno apenas para avaliar o site.

```sql
SELECT c.number,c.location,c.status,c.total,c.createdAt
FROM c WHERE c.kind = 'beach_order'
ORDER BY c.createdAt DESC
```

```sql
SELECT c.id,c.company,c.status
FROM c WHERE NOT IS_DEFINED(c.kind)
ORDER BY c.createdAt DESC
```

Não publique chaves, respostas reais, exports ou documentos integrais do banco. PrefiraAPI para mutações, pois ela valida estados e concorrência.

## Falhas, custo e rollback

-503: confira identidade gerenciada, papel de dados, endpoint e configuração. Nunca habilite fallback local em produção.
-429: respeite limites do app/RUs; reduza polling/carga e aguarde. Não escale para pago sem decisão.
-409: recarregue o pedido/registro e repita sobre a versão atual.
-403: confiraOriginexata eJSON.
-401: refaça login; cookie expira após8 h.

Rollback: mantenhaZIPvalidado anterior, republique sem apagar banco e execute testes funcionais. Trocar código não desfaz automaticamente edições de dados. Não existe rollback de banco implementado no estúdio; snapshots/backup exigem procedimento próprio.

O repositório forneceCIdebuild/teste, sem deploy automático para a conta do responsável. Não adicione credenciaisAzure a umfork público. Alertas de orçamento não são garantia de bloqueio de cobrança; monitore consumo e pare o piloto se os limites gratuitos deixarem de ser atendidos.
