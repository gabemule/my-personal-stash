---
title: Grupos de Afinidade E&O
tags: [eao, comercial, acordos]
sources:
  - raw/eao/docs/migracao-eao/prd-modulo-condicoes-especiais.md
---

# Grupos de Afinidade E&O

Acordos comerciais para grandes volumes de apólices com condições padronizadas.

## Conceito

Grupo de Afinidade (GA) é um tipo especial de [[condicoes-especiais-eao|Condição Especial]] vinculada a um acordo comercial. A principal característica é que **todas as emissões do GA devem ter o mesmo preço**.

## Atributos do Acordo

### Organização Beneficiada
- Nome
- Tipo
- Endereço
- CNPJ
- Número de associados

### Contato
- Nome, email e telefone do ponto focal

### Representante Legal
- Nome, email e telefone

### Configurações Comerciais

| Atributo | Opções | Observação |
|----------|--------|------------|
| Pro-labore | Sim/Não | Se Sim, informa percentual. Gera repasse mensal para a organização |
| Forma de Adesão | Compulsória / Voluntária | - |
| Pagamento de Prêmio | Entidade / Segurado | Se Entidade, pode solicitar boleto agrupado |

## Restrições

- Condição vinculada a GA **não pode** ser usada com outros descontos ou comissões
- Garante uniformidade de preço em todo o grupo

## Questões em Aberto

- Para que são utilizados os dados de contato e representante legal?
- Existe integração para pagamento de pro-labore?
- Qual o comportamento do checkout com boleto agrupado?