# Histórico disponível e evidência do processo

Este arquivo registra pedidos do responsável presentes na conversa de desenvolvimento e sua ligação com os artefatos. **Não é o histórico integral da conversa, dos comandos internos ou de uma execução noLovable.** Não deve ser apresentado como cumprimento do histórico integral exigido pelo enunciado. Para essa exigência, preserve/exporte a conversa e os prompts efetivamente usados na ferramenta correspondente, sem filtrar falhas.

## Registros disponíveis

1. Pedido para cadastro simples com nome/e-mail e questionário aberto: originou o cadastro direto, consentimento e sessões independentes.
2. Pedido para estudar os materiais e estruturarBusiness Case→PRD→PSS/Blueprint→requisitos→implementação→validação→implantação: originou o estúdio e os prompts por etapa.
3. Correção informada pelo responsável: Barraquinha não aparecia noAdmin; originou importação idempotente, identificação acadêmica e botão de acesso.
4. Pedido literal do responsável,02/11/2026:

> A titulo de Teste complete todas as respostas para que eu possa utilizar de modelo e cosntruia a aplicação tanto a versão token ( que irão ser executado na Barraca para receber os pedidos e fazer toda a gestão dos pedidos) quando a versão do cliente que ira rodar na celular.. consequentemente tudo ba azure salvando no banco de Dados Cosmo DB

Foi explicitada a interpretação de“token”como“totem/painel”. O modelo foi preenchido como fictício; a implementaçãoAzurepreservou o limite gratuito e adicionou persistência, consulta privada e concorrência. Houve testesHTTP,UIisolada eCosmosdeprodução. Não houveMLtreinado.

5. Pedido para documentação completa, arquitetura, telas, endpoints/acessos eGitpúblico para alunos: originou este repositório independente, manuais,OpenAPI,diagrama,capturas eCI. Originais de aulas e dados de clientes foram excluídos.

## Prompts reutilizáveis

A pasta`prompts/`contém instruções de trabalho e a ignição do modelo, não um histórico executado. Para seu projeto, registre:

- Data/ferramenta e prompt exato enviado.
- Resultado e arquivos alterados.
- O que falhou e prompt de correção, sem apagar tentativas anteriores.
- Testes realmente executados e evidências.
- Versão/URLdeimplantação quando existir.

Não reconstrua retrospectivamente uma sequência “perfeita” de prompts que não foi enviada. O históricoGitdocumenta a entrega da cópia educacional; ele não contém o histórico privado anterior do siteinstitucional.
