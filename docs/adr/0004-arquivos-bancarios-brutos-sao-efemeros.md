---
status: accepted
---

# Arquivos bancários brutos são efêmeros

Extratos e faturas usados na importação serão mantidos somente durante extração e validação. O bruto é apagado antes de persistir ou devolver a prévia; confirmação e descarte operam apenas sobre dados estruturados. Em rejeições, o bruto também é apagado antes de registrar o resultado. Permanecem somente dados estruturados, hash e metadados de auditoria. O Cofre Fiscal retém documentos fiscais deliberadamente, mas não funciona como arquivo permanente de dados bancários brutos, reduzindo o impacto de uma exposição sem impedir reimportação a partir dos originais mantidos pelo Titular.
