# Produto, requisitos e rastreabilidade

## Business Case de exemplo

Problema hipotético: pedidos dispersos e pouco acompanhamento da fila em barracas de praia. Não foi entrevistada uma barraca real para preencher este modelo. Alternativas: organizar processo manual, contratar uma ferramenta pronta ou testar o protótipo. Valores financeiros e ROI não foram medidos.

Objetivo técnico: cliente→pedido persistido→fila→estado→acompanhamento. O piloto mede funcionamento; pesquisas reais e comparação de tempos continuam necessárias para validar valor comercial.

## PRD implementado

Cliente sem cadastro escolhe itens e quantidades, informa guarda-sol/cadeira e recebe uma consulta privada. Equipe autenticada recebe e atualiza pedidos. Professor consulta a API e a documentação. MVP inclui catálogo, carrinho, confirmação, consulta, operação, filtros, exemplos e estúdio. Pagamento, estoque, catálogo editável e multi-barracas ficam fora.

| ID gerado na análise | Requisito | Código | Verificação |
|---|---|---|---|
| RF01 | Oito itens/duas categorias | beach/model.ts; Customer | Captura/inspeção e testeUI |
| RF02 | Local e quantidades válidos | POST orders |400 para entrada inválida |
| RF03 | Total calculado no servidor | POST orders | Corpo adulterado não mudaR$24/2 cocos |
| RF04 | Confirmação persistida | store; Customer | HTTP e fluxoUI |
| RF05 | Consulta200/404 com chave | api/pedido | Suíte de chave válida/inválida |
| RF06 | Operação e fila cronológica | Operations | Captura e pedidoUI aparece na fila |
| RF07 | Máquina de estados/histórico | NEXT; PATCH orders | Teste de transição/terminal |
| RF08 | Tela de testeAPI | ApiTester | CapturaHTTP200 e teste404 |
| RF09 | Três exemplos | POST action=seed | Semeadura administrativa idempotente |
| RF10 | Filtros/contadores | Operations | Interface disponível; validação manual pelo avaliador |
| RNF01 | Concorrência | ETag/updatedAt | Duas alterações:200 e409 |
| RNF02 | Reenvio seguro | requestId/key/requestHash | Repetição200 sem duplicar |
| RNF03 | Persistência/privacidade | Cosmos; publicOrder | Leituras persistidas e campos internos ausentes |
| RNF04 | Mobile | CSS/Customer |390 pxsem overflow; aparelho físico pendente |
| RNF05 | Separação de pesquisa/pedidos | kind/filtro | IDs de pesquisa não mudam ao criar pedidos |

Os IDs acima são da análise deste projeto, não códigos originais do professor.

## PSS — mapa de produtos/serviços

Atores: cliente, equipe e responsável acadêmico. Produtos: cardápio, acompanhamento, painel, testeAPI e estúdio. Serviços: receber, preparar, atualizar e entregar. Informação flui de itens/local paraAPI/Cosmos/fila e volta porstatus. Sem fluxo financeiro real, parceiro de entrega ou acordo comercial confirmado.

## Service Blueprint

| Etapa | Cliente / frontstage | Backstage / suporte | Exceção |
|---|---|---|---|
| Consultar | Cardápio/categorias/preço | Catálogo versionado no código | Estado de erro/rede |
| Selecionar | Quantidade/local/carrinho | Validações e preço servidor |400 sem local/item válido |
| Confirmar | Número/chave/total | Escrita e idempotência | Repetir tentativa sem duplicar |
| Preparar | Acompanhamento | Operação autenticada eETag |409 em atualização concorrente |
| Encerrar | Entregue/cancelado | Estados terminais e histórico | Não reabrir terminal |

## Kernel e Design System

Dinheiro em centavos, quantidades inteiras,UTC persistido ept-BR na apresentação. Chaves criptográficas e hash, dados mínimos, TTL e acesso gerenciado aoCosmos. TipografiaManrope/Newsreader, areia/verde-petróleo, foco visível, estado explícito e layouts responsivos. Isso são decisões deste modelo, não padrões impostos a todo projeto de aluno.

## ML e agentes

Não há modelo treinado. Futuro objetivo possível: estimar tempo até pronto com eventos reais autorizados, baseline e divisão temporal. Três exemplos e texto sintético não bastam para treinamento. Não use o horário futuro de conclusão comofeature.

O estúdio guarda documentos e gera prompts; não chama umLLM. Hash das entradas detecta documento desatualizado, mas não analisa conflitos semânticos. A ignição exige pelo menosPRD/PSS/Blueprint e todos os documentos presentes revisados/atuais. O contador de versão não arquiva revisões antigas.

## Fontes e diferenças acadêmicas

Referências fornecidas pelo responsável: aulas01/02 deDiscovery/VibeCoding/PRD/PSS/Blueprint, aulas03 debackend/frontend, aulas04 deML, InterpretadorMestre e enunciadoBarraquinha de Praia Digital. Originais e extrações integrais não estão nesteGit.

O enunciado pede Lovable e memória. Esta versão usa Azure/Cosmos por solicitação explícita. Persistência, autorização, consulta privada e controle de concorrência são aprimoramentos do projeto; não são apresentados como exigências originais. Use a matriz para discutir aderência com o professor.
