---
title: Motor de Cálculo E&O
tags:
  - eao
  - motor-calculo
  - precificacao
  - tecnico
sources:
  - raw/eao/docs/migracao-eao/prd-modulo-de-moderacoes.md
related:
  - "[[cotacao-eao]]"
  - "[[coberturas-eao]]"
---

# Motor de Cálculo E&O

Sistema de precificação do produto E&O baseado em tabelas de fatores.

## Arquitetura

### Tabelas de Fatores

Cada variável da cotação está ligada a uma tabela de fatores com duas variações:

| Tipo | Descrição |
|------|-----------|
| **Preço Técnico** | Fatores atuariais - define menor preço para rentabilidade |
| **Preço Comercial** | Aplicado sobre técnico - dinamiza precificação (mínimo: 1) |

### Tabelas Necessárias

| # | Tabela | Variáveis |
|---|--------|-----------|
| 01 | Prêmio Base | Profissão, Tipo de Segurado |
| 02 | Especialidade | Profissão, Tipo de Segurado |
| 03 | Complemento Especialidade | Profissão, Tipo de Segurado, Especialidade |
| 04 | IS | Profissão, Tipo de Segurado |
| 05 | Faturamento | Profissão, Tipo de Segurado |
| 06 | Franquia | Profissão, Tipo de Segurado, Especialidade |
| 07 | Retroatividade | Profissão, Tipo de Segurado, Tipo de Apólice |
| 08 | Vigência | Profissão, Tipo de Segurado |
| 09 | Sinistro 5 anos | Profissão, Tipo de Segurado |
| 10 | Sinistro 12 meses | Profissão, Tipo de Segurado |

## Versionamento

- Toda alteração no motor/fatores deve estar atrelada a uma versão
- Cotações válidas e propostas não emitidas consomem a versão ativa no momento da criação
- Registrar em banco: valor técnico e valor comercial

## Flexibilidade de Fatores

Fatores podem ser:
- **Padrão**: valor fixo por variável
- **Por profissão**: valor varia conforme profissão selecionada

**Exemplo:**
- `Período 12 meses` pode ter fator fixo X
- Ou `12 meses médico` = A e `12 meses advogado` = B

## Franquias

Para cada combinação de `profissão + tipo segurado + especialidade`:

| Tipo | Descrição |
|------|-----------|
| Padrão | Franquia base |
| Majorada | Franquia aumentada (desconto no prêmio) |
| Reduzida | Franquia diminuída (agravo no prêmio) |

Texto e fatores variam por `profissão + atividade segurada + IS`.

## Requisitos Desejáveis

- Estrutura reaproveitável para outros produtos
- Fórmula contemplando: fatores das tabelas, comissão, agravo, desconto

## Em Definição

- Fórmula completa do cálculo
- Valor máximo para tabela comercial