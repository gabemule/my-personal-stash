---
title: Coberturas E&O
tags:
  - eao
  - coberturas
  - exclusoes
sources:
  - raw/eao/docs/migracao-eao/prd-modulo-de-moderacoes.md
related:
  - "[[cotacao-eao]]"
  - "[[motor-calculo-eao]]"
---

# Coberturas E&O

Estrutura de coberturas e exclusões do produto E&O.

## Estrutura

### Tipos de Cobertura

1. **Coberturas padrão**: comuns a todo produto E&O
2. **Coberturas específicas**: variam por profissão e tipo de segurado (PF/PJ)

### Divisão de LMG

O usuário pode dividir o percentual da LMG entre:
- Bloco de **Custos de Defesa**
- Bloco de **Coberturas Básicas**

> A divisão de LMG **não altera o prêmio**.

## Versionamento

- Toda alteração nas coberturas deve estar atrelada a uma versão
- Cotações válidas e propostas não emitidas consomem a versão ativa no momento da criação

## Exibição

- Coberturas são exibidas na tela de cotação
- Cada cobertura possui breve descrição (tooltip)
- **Exclusões** devem ser exibidas para todos os casos

## Especialidades Não Elegíveis

Sistema deve exibir dinamicamente as especialidades não elegíveis para cada profissão.

## Documentação

- [Planilha de Coberturas por Profissão](https://docs.google.com/spreadsheets/d/161ALRJKQHae619kAn-ovZrKFuIWDXUXn61-IqbbdSYw/edit?gid=1311585594#gid=1311585594)
- [Planilha de Exclusões](https://docs.google.com/spreadsheets/d/1Ne7hPF9JdcAF3-tJyAo3f-DiB4vBwESNHBCkw1PPynA/edit?gid=425039067#gid=425039067)

## Em Definição

- Divisão de prêmio entre coberturas individuais ou bloco de coberturas