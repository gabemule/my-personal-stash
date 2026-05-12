---
title: Cotação E&O
tags:
  - eao
  - cotacao
  - jornada
  - motor-calculo
sources:
  - raw/eao/docs/migracao-eao/prd-modulo-de-moderacoes.md
related:
  - "[[motor-calculo-eao]]"
  - "[[coberturas-eao]]"
  - "[[condicoes-especiais-eao]]"
  - "[[moderacao-eao]]"
  - "[[geracao-proposta-eao]]"
---

# Cotação E&O

Módulo de cotação do produto E&O (Erros & Omissões) para corretores.

## Objetivo

Construir uma jornada de cotação simples para o corretor, escalável para a engenharia e eficiente para a subscrição.

## Princípios

- Uma única jornada E&O, simples de cotar e fácil de evoluir
- Motor de precificação granular com autonomia para subscrição
- Padronização e simplificação de franquias e fatores

## Jornada Atual (AS IS)

Duas portas de entrada:
1. **Menu**: seleção de atividade separada entre PF/PJ
2. **Analisador de risco**: profissão, tipo de perfil, IS, faturamento, contrato específico

### Fluxo Atual

1. CPF/CNPJ do segurado
2. Indicação seguro novo ou renovação
3. Seleção da atividade segurada
4. Documento profissional (PF, algumas profissões)
5. Seleção da atividade exercida
6. Faturamento (PJ)
7. Prazo da apólice (12 ou 18 meses)
8. Data início/fim vigência
9. Retroatividade
10. Declaração de sinistros (últimos 5 anos)
11. Seleção IS e franquia
12. Seleção campanha e grupo de afinidade
13. Exibição coberturas (não editáveis)
14. **Cálculo** → valor do prêmio só conhecido ao final

## Jornada Ideal (TO BE)

### Entrada Única

Objetivo: direcionamento do fluxo apenas.

**Campos:**
- Profissão
- Tipo de segurado (PF/PJ)
- Característica do Risco (Sim/Não)

**Direcionamento:**
- "Não" → fluxo Corporate (risco alto)
- "Sim" → cotação digital

### Cotação Digital

**Campos obrigatórios:**
- CPF/CNPJ
- Tipo de Seguro (novo/renovação)
- Prazo (12 ou 18 meses)
- Datas de vigência
- Retroatividade
- Atividade exercida
- Faturamento (PJ - pré-preenchido)
- IS (pré-preenchida, até 3 opções)
- Franquia (até 3 opções)

**Coberturas:**
- Divisão de limite entre cobertura básica e custos de defesa
- Exibição de exclusões para todos os casos

**Prêmio:**
- Exibido e atualizado em tempo real
- Lateral da tela: edição de comissão, agravo, condição comercial

### Validações e Limites

| Campo | Limite Digital | Acima → Corporate |
|-------|----------------|-------------------|
| Faturamento Anual (PJ) | R$ 20MM | Moderação |
| IS | R$ 5MM | Moderação |
| Sinistros 5 anos | < 3 | ≥ 3 → Corporate |
| Valor sinistros | R$ 300k | > R$ 300k → Corporate |
| Sinistros 12 meses | < 2 | ≥ 2 → Corporate |

### Vigência

| Tipo | Início máximo |
|------|---------------|
| Seguro Novo | D+14 |
| Renovação Congênere | D+30 |

## Comissão

- Base E&O: 20%
- Condição especial pode fazer override
- Agravo máximo: 35% (incompatível com desconto)

## Ciclo de Vida

- Validade padrão: 15 dias
- Validade real: até data início vigência (1-30 dias)
- Edição recalcula validade
- Expiração impede geração de proposta
- Versionamento de edições (histórico consultável)

## Recursos de Saída

- Download PDF da cotação
- Compartilhamento (e-mail/WhatsApp)
- Edição da cotação
- Envio para moderação (se necessário)
- Geração de proposta (se dentro dos limites)

## Links

- [Figma AS IS](https://www.figma.com/design/FNTH0ue6uaEWdEVvXBZtai/E-O?node-id=4164-29627)
- [Figma TO BE](https://www.figma.com/design/OIGoGphmyV79rF20Y58aW0/Novo-E-O?node-id=0-1)
- [Planilha Profissões/Atividades](https://docs.google.com/spreadsheets/d/1Ne7hPF9JdcAF3-tJyAo3f-DiB4vBwESNHBCkw1PPynA/edit)