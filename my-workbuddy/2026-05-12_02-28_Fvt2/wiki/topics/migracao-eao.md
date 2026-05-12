---
title: Migração E&O
tags:
  - eao
  - migracao
  - projeto
sources:
  - raw/eao/docs/migracao-eao/prd-modulo-de-moderacoes.md
related:
  - "[[cotacao-eao]]"
  - "[[motor-calculo-eao]]"
  - "[[coberturas-eao]]"
  - "[[moderacao-eao]]"
---

# Migração E&O

Projeto de migração e modernização do produto E&O.

## Escopo do Projeto

### Módulo de Cotação

- Profissões e atividades seguradas
- Fatores de agravo
- Informações para análise de risco
- Motor de cálculo (variáveis e fatores)
- Franquias e ISs
- Coberturas e Exclusões
- Carta de Cotação
- Edição de Cotação

## Principais Mudanças

### Jornada

| Aspecto | AS IS | TO BE |
|---------|-------|-------|
| Entrada | Duas portas (menu + analisador) | Entrada única |
| Prêmio | Só conhecido ao final | Tempo real |
| Condições | Campanha + Grupo Afinidade | Condição comercial única |

### Técnico

- Motor de cálculo com tabelas de fatores (técnico + comercial)
- Versionamento de regras e coberturas
- Estrutura reaproveitável para outros produtos

## Status

Em desenvolvimento - PRD documentado.

## Pontos em Discussão

> ⚠️ Textos em vermelho no PRD indicam pontos em discussão ou dúvidas a serem esclarecidas.

- Fórmula completa do motor de cálculo
- Valor máximo para tabela comercial
- Divisão de prêmio entre coberturas individuais ou bloco