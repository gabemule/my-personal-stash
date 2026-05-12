---
title: Condições Especiais E&O
tags: [eao, pricing, comercial, campanhas]
sources:
  - raw/eao/docs/migracao-eao/prd-modulo-condicoes-especiais.md
---

# Condições Especiais E&O

Módulo reaproveitável para aplicação de alavancas comerciais (descontos e comissões diferenciadas) no produto E&O, com extensibilidade planejada para outros produtos da nova arquitetura.

## Conceito

Condições especiais são benefícios opcionais e flexíveis que podem oferecer:
- **Desconto**: reduz prêmio net Akad e comissão do corretor
- **Comissão diferenciada**: aumenta comissão do corretor e prêmio final do segurado
- **Ambos** simultaneamente

O corretor pode aplicar até o valor máximo configurado, mas tem flexibilidade para usar percentuais menores.

## Casos de Uso

### Descontos
- Campanhas sazonais (ex: Black Friday com 10% off)
- Incentivo para corretores novos (ex: desconto nas 10 primeiras emissões)
- Ajuste de competitividade por profissão com baixa produção
- Bonificação por desempenho

### Comissões
- Recompensa para top performers (ex: comissão máxima de 30%)
- Fidelização de corretores

## Atributos Obrigatórios

| Atributo | Descrição |
|----------|-----------|
| Nome | Título descritivo |
| Descrição Pública | Contexto para o corretor |
| Descrição Interna | Motivação para gestão interna |
| Responsável | Colaborador Akad responsável |
| Produto | Produtos elegíveis (padrão: todos) |
| % Desconto | Percentual máximo de desconto |
| % Comissão | Percentual máximo de comissão |
| Data início/fim | Período de vigência |

## Regras de Elegibilidade

- **Corretor/Corretora**: visível apenas para corretores específicos ou grupo
- **Segurado/Solicitante**: atrelada a documento específico
- **Acúmulo**: se pode ser usada com outras condições (não por padrão)

## Comportamento na Cotação

| Tipo de Condição | Comissão | Desconto | Agravo |
|------------------|----------|----------|--------|
| Apenas Comissão | Até limite da CE | Oculto e travado | Até limite do produto |
| Apenas Desconto | Até limite do produto | Até limite da CE | Bloqueado |
| Comissão + Desconto | Até limite da CE | Até limite da CE | Bloqueado |

### Regras Importantes
- Ao aplicar no multi-risco, incide em todas as opções; contabiliza apenas na opção transmitida
- Se corretor violar regra de elegibilidade após criar cotação, sistema desseleciona a condição
- Cotações com condição expirada podem seguir até emissão se não houver edição que altere o risco

## Administração

Gestão via UI Admin (não no Portal do Corretor):
- **Ações**: criar, editar, inativar
- **Acesso**: apenas Subscrição e Comercial
- **Auditoria**: registra usuário e timestamp de cada alteração

### Visualização por Condição
- Status (Ativa/Inativa)
- Atributos e regras configuradas
- [Desejável] Quantidade de uso (cotações, propostas, emissões + GWP)
- [Desejável] Relação de cotações/apólices vinculadas

## Relação com Grupos de Afinidade

Condições especiais podem estar vinculadas a [[grupos-afinidade-eao|Grupos de Afinidade]]. Quando vinculada:
- Não pode ser usada com outros descontos/comissões
- Todas as emissões do GA devem ter o mesmo preço

## Métricas

### Funil por Condição
- Cotações → Propostas → Emissões (quantidade e GWP)
- Taxas de conversão por etapa
- Comparativo com funil sem condição especial

### Uso do Benefício
- Distribuição de percentuais aplicados (mín, máx, média, mediana)
- Proporção de uso do máximo vs. valor menor

### Impacto Financeiro
- Delta de prêmio (referência vs. final) em R$ e %
- Desconto total concedido no período
- Comissão adicional paga via condição
- Prêmio médio com vs. sem condição

## Extensibilidade

Planejado para suportar:
- Outros produtos da nova arquitetura
- Regras vinculadas a características do risco (ex: tipo de executante em Garantias)
- Responsabilidade de cálculo permanece com cada produto

## Evoluções Futuras

| Funcionalidade | Propósito |
|----------------|-----------|
| Bolsão de descontos | Dar autonomia ao corretor para gerir orçamento próprio de descontos |

## Questões em Aberto

- Interface de cadastro: reaproveitar Digital ou já levar para UI Admin?
- Dados de contato e representante legal do GA: para que são utilizados?
- Integração para pagamento de pro-labore
- Comportamento do checkout com boleto agrupado