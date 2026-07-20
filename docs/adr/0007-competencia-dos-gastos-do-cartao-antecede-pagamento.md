---
status: accepted
---

# Competência dos gastos do cartão antecede o pagamento da fatura

No XLSX atual do Itaú, o mês informado no título da fatura representa quando ela
é paga. Para o fluxo mensal do Brenotion, os gastos pertencem ao mês
imediatamente anterior. Assim, uma fatura paga em julho completa a fonte do
cartão de junho.

O Lote de Importação continua preservando `statementCompetence` como metadado
original do pagamento. Uma regra determinística compartilhada deriva a
Competência dos Gastos do Cartão para cobertura, Início, classificação, Revisão
e Fechamento Mensal. Datas individuais das Movimentações de Origem não são
reescritas.

Essa regra descreve o cartão Itaú e a cadência atuais do único Titular. Uma futura
fonte com fechamento, vencimento ou ciclo diferente deve tornar a competência
dos gastos explícita em seu adapter, sem alterar silenciosamente esta decisão.
