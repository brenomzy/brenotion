---
status: accepted
---

# Fatura do Itaú em XLSX usa adapter Node isolado

A fatura do cartão Itaú PF será importada pelo mesmo pipeline temporário,
auditável e idempotente do extrato OFX, com um adapter Node isolado baseado em
`read-excel-file` `9.3.2`. O lote registra formato, conta de origem e versão do
parser; compras, créditos/estornos e Liquidação do Cartão recebem sinais e tipos
explícitos. O total da fatura é reconciliado em centavos somente com compras,
créditos e estornos, excluindo o pagamento. Colunas de titularidade e cartão são
ignoradas na fronteira, e o bruto é apagado antes da prévia persistida.
