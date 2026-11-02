# Testes e evidências

Referência:02/11/2026. A aplicação original emAzurefoi testada comHTTPeCosmosreais; a cópia educacional será verificada pelaCIa cada push. Não invente um resultado se aCIou seu ambiente não concluir.

## Suites

| Comando/arquivo | Cobertura |
|---|---|
| npm run build | TypeScript, rotas e artefatoNext |
| npm run lint | RegrasESLint/React |
| npm run test:discovery | Servidor temporário e ambas as suítesHTTP |
| portal.test.mjs | Auth/origem/consentimento, convites, rascunhos, envio, concorrência, exports, legado, estúdio, caso acadêmico e modelo completo |
| beach.test.mjs | Criação/validação, preço adulterado, consulta privada200/404, reenvio, autorização, disputa200/409, estados/histórico, paralelismo e isolamento |
| npm run test:ui | Chrome headless isolado: pedido pelaUI390 px, fila1440 px, preparo,APIeestúdio/capturas |

As suítesHTTPemprodução original passaram e removeram somente dados sintéticos de sua propriedade. O modelo acadêmico definitivo e os3 exemplos foram criados depois desses testes. Não se declara que testes executados no banco local comprovam sozinhosCosmos; houve execução separada contra a demonstração.

Capturas revisadas estão em[images](images/). A interação automatizada confirmou que o pedido feito pelaUI aparece no painel e que a mudança de estado pelaUI chega àpersistência. Também verificou ausência de overflow horizontal nas duas larguras.

## Pendente de avaliação adicional

Aparelho físico, rede4 Gfraca, leitor de tela, alta concorrência/sustentação de carga, recuperação de desastre, disponibilidade prolongada, papéis individuais, pesquisa de demanda e métricas comerciais. Não há resultado deML, pois não houve treinamento.

## CI

GitHub Actions usaNode 22,`npm ci`,`npm run lint`,`npm run build`e`npm run test:discovery`, sem credenciaisAzure ou dados de produção. O smokevisualmacOSnão é requisito dessaCIUbuntu. Build usaGoogle Fonts emtempo decompilação e pode falhar se a rede não permitir acesso; isso não deve ser mascarado como testeaprovado.
