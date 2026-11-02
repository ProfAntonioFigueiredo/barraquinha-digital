# Guia de avaliação — professor e aluno

Data da referência:02/11/2026. Esta é uma demonstração funcional com dados fictícios.

## Acessos

| Perfil | URL | Acesso |
|---|---|---|
| Cliente | https://wise-discovery-v1.azurewebsites.net/barraquinha | Público, sem cadastro |
| Operação/totem | https://wise-discovery-v1.azurewebsites.net/barraquinha/operacao | Código privado do responsável |
| Teste de API | https://wise-discovery-v1.azurewebsites.net/barraquinha/api | Página pública; consulta existente exige número/chave do pedido |
| Pesquisa | https://wise-discovery-v1.azurewebsites.net/discovery | Cadastro/consentimento ou convite |
| Admin/estúdio | https://wise-discovery-v1.azurewebsites.net/discovery/admin | Código privado do responsável |

O responsável fornece o código administrativo ao avaliador por canal privado. Não publicar esse código em formulário público, issue, README ou gravação. Para avaliação independente, clone e execute com credenciais próprias; o código local é gerado por `npm run setup:local`. Não há senha universal de aluno.

O código administrativo atual concede acesso ao Discovery e à operação. Não o distribua entre clientes. Não há contas individuais de professores/funcionários ou ambiente isolado por avaliador neste piloto. A permissão Azure do professor não precisa ser alterada para testar a interface.

## Roteiro com duas telas

1. Entre na operação no computador. Observe contadores e filtros. Se necessário, carregue os3 exemplos; os identificadores DEMO-0001/2/3 indicam origem demonstrativa.
2. No celular ou em outra aba, abra o cliente. Há8 produtos e2 categorias. Adicione2 águas de coco: o total esperado éR$24,00. Esse é um preço de exemplo.
3. Tente enviar sem localização: deve exigir referência. Informe “Guarda-sol avaliação15”, sem nome/telefone, e envie.
4. Anote número e chave privada (a chave fica no detalhe da confirmação). A confirmação só aparece após gravação real.
5. Na operação, atualize ou aguarde até15 s; encontre o mesmo pedido/local/itens/total. Verifique ordem de chegada.
6. Inicie preparo, marque pronto e entregue. No cliente, observe a mudança em até15 s enquanto a aba estiver visível. Entregue/cancelado sai do filtro ativos, permanecendo em todos/histórico.
7. Recarregue e retome pelo botão de último pedido. O navegador conserva somente a referência privada; a fonte do estado é a API/Cosmos.
8. Abra a telaAPI no mesmo navegador do cliente. Número/chave são preenchidos pelo último pedido. Consulte e veja200/JSON. Use número inexistente e veja404. Chave errada também retorna404.
9. No Admin, abra Barraquinha Digital e o Estúdio. O exemplo preenchido contém13 respostas e11 documentos fictícios. Inspecione fontes, decisões, limitações, estados e prompt de ignição. Não edite o modelo compartilhado apenas para explorar; alterações podem desatualizar documentos dependentes.
10. Para testar alterações, concorrência ou exclusão sem afetar terceiros, use execução local e as suítes automatizadas.

## O que avaliar com evidência

| Requisito do caso | Onde observar | Evidência técnica |
|---|---|---|
| Cardápio8 itens/2 categorias | Cliente | `src/lib/beach/model.ts` |
| Pedido/quantidades/local/confirmação | Cliente e painel | Validação noPOST e total no servidor |
| API existente/inexistente | TelaAPI | `tests/discovery/beach.test.mjs` |
| Operação conectada ao cliente | Painel/totem | Atualização persistida e consulta do mesmo pedido |
| Estados e ordem de chegada | Painel e filtros | `NEXT` e ordenação crescente na interface |
| Exemplos e opcional | DEMO e filtros/contadores | Semeadura administrativa idempotente |
| Persistência/concorrência | Recarregar e testes | Cosmos/ETag; conflitos409 |
| Mobile | Capturas e aparelho do avaliador | Teste automatizado em390 px e verificação física pendente |
| Raciocínio de produto | Estúdio e `prompts/` | PRD/PSS/Blueprint e critérios de aceite |

Esta matriz organiza evidências; não cria uma rubrica oficial nem garante nota. A referência original exige Lovable e histórico completo de prompts. Esta implementação é Azure por decisão do responsável; o histórico disponível não é o histórico integral de uma construção no Lovable.

## Resultado esperado e limites

O fluxo técnico funciona com dados de teste. Não se declara escala de200 clientes simultâneos, SLA, disponibilidade comercial, treinamento deML ou validação de demanda. Limite do piloto:200 pedidos retidos e30 tentativas de criação/minuto/processo. Evite teste de carga no ambiente gratuito compartilhado.
