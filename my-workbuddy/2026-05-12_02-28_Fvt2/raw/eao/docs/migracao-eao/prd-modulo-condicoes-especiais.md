---
title: "PRD | Módulo de Condições Especiais do E&O"
source_url: "https://akadseguros.atlassian.net/wiki/spaces/EO/pages/1635942401/PRD+M+dulo+de+Condi+es+Especiais+do+E+O"
converted_at: "2026-05-12T01:59:14.001Z"
---

# PRD | Módulo de Condições Especiais do E&O

| **Objetivo** | Construir uma funcionalidade reaproveitável de condições especiais, que engloba as capacidades de campanhas e grupo de afinidade, para viabilizar o uso de alavancas comerciais para crescimento da carteira de E&O e, futuramente, para demais produtos na nova arquitetura. |
| --- | --- |
| **Princípios** | <br>-   Condições especiais são opcionais e flexíveis<br><br> |
| **Escopo** | <br>-   Criação de uma condição especial<br> -   Configurações possíveis de uma condição especial<br> -   Interação da condição especial com o ciclo de vida da cotação<br><br> |
> **⚠️ Warning:**
>
> Todos os textos em vermelho indicam pontos em discussão ou dúvidas a serem esclarecidas.

## 01\. Motivação & Contexto

Este módulo visa permitir que áreas internas ofereçam incentivos via descontos e comissões diferenciadas para impulsionar a carteira de produtos digitais.

Descontos podem ser oferecidos como incentivo de produção, bonificação por desempenho, ajustes para competitividade, campanhas sazonais, entre outros. Exemplos:

-   No mês da Black Friday, todas as cotações têm 10% de desconto.

-   Corretores novos na Akad recebem desconto nas 10 primeiras emissões.

-   Profissões com baixa produção podem ter desconto específico para aumentar a produção.

-   Corretores com bom desempenho podem ser recompensados com desconto nas cotações.

-   Acordos comerciais (“Grupos de Afinidade”) para grandes volumes de apólices podem oferecer desconto pelo volume combinado.


Comissões podem ser usadas como bonificação por desempenho ou para fidelização. Exemplos:

-   Os 5 melhores performers recebem comissão máxima de 30%


---

## 02\. Jornada do Usuário, Fluxos e Protótipos

WIP

---

## 03\. Requisitos Funcionais

**Características de uma condição especial**

-   Uma condição especial pode oferecer:

    -   Desconto, comissão ou ambos

-   A condição especial define o valor máximo que o corretor pode usar.

    -   O corretor pode aplicar a condição especial e reduzir o percentual máximo oferecido, seja de desconto ou comissão

-   Atributos obrigatórios de uma condição especial

    -   Nome: título descritivo da condição especial

    -   Descrição Pública: breve descrição e contexto - para o Corretor - sobre a condição especial

    -   Descrição Interna: descrição da condição especial, contexto e motivação para gestão interna

    -   Responsável: colaborador Akad responsável pela campanha

    -   Produto: Indica quais os produtos poderão ser beneficiados pela condição especial. Por padrão, deixar “Todos” selecionado.

    -   Percentual de desconto (Diminui prêmio net Akad e comissão do corretor)

    -   Percentual de comissão (Aumenta comissão do corretor e prêmio final do segurado)

    -   Data de início

    -   Data de fim

        -   Quando a condição expira, porém há cotações e/ou propostas vigentes com ela aplicada, é esperado que - caso não ocorra edição que implica em alteração do risco precificado - o corretor consiga seguir até a emissão. Caso ele entre no fluxo de edição, avisar que pode perder o benefício caso a condição especial já tenha expirado.

-   A condição especial pode ter as seguintes regras de elegibilidade:

    -   Corretor ou Corretora: estará visível e selecionável apenas para corretores específicos ou o grupo de corretores de uma corretora.

    -   Segurado/Solicitante: A condição especial pode estar atrelada a um segurado específico através de seu documento.

    -   Acúmulo: indica se a condição especial pode ser usada junto com outras

        -   Podemos avaliar a possibilidade de acumulo padrão caso as CEs tenham variáveis que não se sobrepõem. Caso se sobreponham, por padrão não pode selecionar mais de uma.

-   As condições especiais não são cumulativas. O corretor só pode

-   A condição especial pode estar vinculada a um acordo comercial, chamado de Grupo de Afinidade

    -   Quando a Condição Especial for um Grupo de Afinidade ela não pode ser utilizada junto com outros descontos ou comissões diferentes pois todas as emissões do Grupo de Afinidade devem ser emitidas com o mesmo preço.

-   Atributos do “Acordo Comercial”, também chamado de “Grupo de Afinidade”

    -   Dados da organização beneficiada pelo acordo comercial (Nome, Tipo, Endereço, CNPJ e Número de Associados)

    -   Informações de Contato (Nome, Email e Telefone do ponto focal do acordo comercial)

        -   Esse dado é utilizado para quê?

    -   Representante Legal (Nome, Email e Telefone)

        -   Esse dado é utilizado para quê?

    -   Prolabore (“Sim” ou “Não”) > Pouquíssimo utilizado

        -   Se for “Sim”, é aberto campo para informar o percentual

        -   Quando há pro-labore, há repasse mensal direto de um valor para a organização beneficiada pelo Grupo de Afinidade, calculado com base no percentual em relação ao prêmio emitido.

            Há alguma integração existente para esse tipo de pagamento?

    -   Forma de Adesão (“Compulsória” ou “Voluntária”)

    -   Pagamento de Prêmio ( “Entidade” ou “Segurado”)

        -   Se for “Entidade” pode informar o desejo de um “Boleto Agrupado”

        -   O que acontece no checkout quando é “Boleto Agrupado”?


**Cadastro e gestão de uma condição especial**

-   O cadastro deve ser feito em uma interface administrativa (UI Admin), separada do Portal do Corretor, acessível apenas para colaboradores Akad; \[Faremos no Digital reaproveitando o existente ou já levaremos para o UI Admin?\]

-   As ações possíveis são criar, editar e inativar uma condição;

-   Toda ação em uma condição especial deve registrar o usuário e o momento da alteração.

-   Apenas colaboradores da Subscrição e Comercial podem executar ações de gestão das condições especiais.

-   Para cada condição especial, deve estar visível:

    -   Status: Ativa ou Inativa

    -   Atributos obrigatórios preenchidos

    -   Regras de elegibilidade configuradas

    -   \[Desejável\] Quantidade de uso (Cotações, Propostas e Emissões - e # e GWP)

    -   \[Desejável\] Relação de cotações e apólices que usaram a condição especial


**Uso de uma condição especial - Simples**

-   Deve ser possível rastrear pela cotação se usou uma condição especial. Não precisa ser transparente para o segurado.

-   Se aplicar no multi-risco, ela incide sobre o cálculo do prêmio de todas as opções. Ao transmitir proposta, a condição especial será contabilizada apenas na opção geradora da proposta.

-   Se uma condição aplicada tiver regra de elegibilidade que o corretor violar após a criação da cotação, o sistema deve deselecionar a condição especial.

-   Quando uma condição estiver aplicada, ela define o valor máximo configurável nos campos “Desconto” e/ou “Comissão”.

-   Se a condição especial tiver “Desconto”, o campo “Agravo” ficará bloqueado para edição.

-   Sem condição especial aplicada, o corretor pode alterar comissão ou agravo até os limites do produto.

-   Se aplicar condição apenas de desconto, o corretor:

    -   Pode ajustar o desconto até o máximo da condição especial;

    -   Pode ajustar a comissão até o máximo do produto;

    -   Não pode alterar o agravo. Se aplicar agravo, a condição especial é removida.

-   Se aplicar condição apenas de comissão, o corretor:

    -   Pode ajustar a comissão até o máximo da condição especial;

    -   Pode ajustar o agravo até o máximo do produto;

    -   Não pode alterar o desconto, que não estará visível.

-   Se aplicar condição de desconto e comissão, o corretor pode:

    -   Ajustar o desconto até o máximo da condição especial;

    -   Ajustar a comissão até o máximo da condição especial;

    -   Não pode alterar o agravo. Se aplicar agravo, a condição especial é removida.


| <br><br><br><br><br><br><br> | **Comissão**<br><br><br><br><br><br><br> | **Desconto**<br><br><br><br><br><br><br> | **Agravo**<br><br><br><br><br><br><br> |
| --- | --- | --- | --- |
| <br><br><br><br><br><br><br> | **Comissão**<br><br><br><br><br><br><br> | **Desconto**<br><br><br><br><br><br><br> | **Agravo**<br><br><br><br><br><br><br> |
| --- | --- | --- | --- |
| Apenas Comissão | \`ATÉ LIMITE DA C.E.\` | \`OCULTO E TRAVADO\` | \`ATÉ LIMITE DO PRODUTO\` |
| Apenas Desconto | \`ATÉ LIMITE DO PRODUTO\` | \`ATÉ LIMITE DA C.E.\` | \`NÃO PODE\` |
| Comissão + Desconto | \`ATÉ LIMITE DA C.E.\` | \`ATÉ LIMITE DA C.E.\` | \`NÃO PODE\` |
**Extensibilidade do Módulo**

-   No futuro, quando o módulo for usado por outros produtos, uma condição especial poderá estar vinculada a características específicas do risco.

    -   Ex: Tipo de executante no Garantias, tipo de equipamento no RD, etc.

-   O módulo de condições se limita o cadastro e uso dos dados de comissão e desconto e enviá-los ao produto. A responsabilidade de receber os percentuais e utilizar no motor de cálculo é do produto.


---

## 04\. Documentos e Artefatos de Estudo

-   Lorem


---

## 05\. Dados e Métricas Relevantes

**Dados a capturar**

**Configuração da condição especial**

Para cada condição especial criada, e a cada edição subsequente, os seguintes dados devem ser registrados:

-   Tipo de benefício (desconto, comissão ou ambos) e percentuais máximos configurados

-   Indicar se é um Grupo de Afinidade ou não

-   Produto(s) elegível(is) e período de vigência (data início e fim)

-   Responsável pela condição

-   Regras de elegibilidade: limite de usos, corretores ou corretoras específicas, permissão de acúmulo

-   Status (ativa ou inativa)

-   Histórico de alterações: usuário e timestamp de cada ação (criação, edição, inativação)


**Uso da condição especial ao longo do ciclo de vida**

A cada aplicação de uma condição em uma cotação, os seguintes dados devem ser persistidos:

-   Identificação da condição aplicada e da cotação

-   Momento da aplicação

-   Percentuais efetivamente utilizados pelo corretor (desconto e/ou comissão), que podem ser menores que o máximo configurado

-   Prêmio de referência no momento da aplicação - valor que seria cobrado sem a condição, a ser retornado pelo motor de cálculo e armazenado como campo explícito neste momento, não recalculado a posteriori

-   Prêmio final resultante após aplicação da condição


Com esses valores registrados por cotação, é possível calcular o delta em reais - quanto de redução de prêmio para o segurado e quanto de acréscimo de comissão para o corretor - tanto para cotações que evoluíram para emissão quanto para as que não se converteram.

O vínculo entre a condição aplicada e a cotação deve ser preservado em todas as etapas do funil, de forma que a condição que originou a proposta seja rastreável na apólice emitida.

**Controle de limite de usos**

-   Consumo corrente do limite (usos realizados / limite configurado)

-   Registro de cada liberação de uso por expiração de cotação, com identificação da cotação e momento da liberação


**Acordo comercial (Grupo de Afinidade)**

Quando uma condição estiver vinculada a um acordo comercial, devem ser registrados: identificação da organização (nome, CNPJ, tipo), forma de adesão, modalidade de pagamento de prêmio e percentual de pro-labore quando aplicável. A associação entre condição e acordo deve permitir agrupar apólices emitidas por esse vínculo para análise de portfólio.

**Métricas de negócio**

**Funil por condição especial**

Para cada condição, é necessário ter visibilidade do funil completo:

-   Quantidade de cotações com a condição aplicada

-   Quantidade de propostas transmitidas a partir dessas cotações

-   Quantidade de emissões e GWP correspondente

-   Taxas de conversão entre cada etapa (cotação → proposta → emissão)


Essa visão deve ser comparável com o funil de cotações sem condição especial, para que seja possível avaliar o efeito da condição na conversão.

**Uso do benefício em relação ao máximo configurado**

Não basta saber que a condição foi aplicada, é preciso entender como o corretor está usando o espaço disponível. Para isso:

-   Distribuição dos percentuais efetivamente aplicados (mínimo, máximo, média e mediana), separada por desconto e por comissão

-   Proporção de cotações em que o corretor usou o percentual máximo vs. um valor menor


Uma condição de 15% em que a média de uso é 6% sinaliza algo diferente de uma em que a maioria dos corretores vai direto ao teto, e ambos os cenários têm implicações distintas para a calibração do benefício.

**Impacto financeiro**

-   Delta médio de prêmio por cotação (prêmio de referência menos prêmio final), em reais e em percentual

-   Desconto total concedido nas emissões do período, em reais

-   Comissão adicional paga via condição especial nas emissões do período

-   Comparação do prêmio médio emitido com e sem condição especial


O delta deve ser monitorado também para cotações que não se converteram em emissão, pois concessões que não geraram receita são igualmente relevantes para avaliar a eficiência da condição.

**Adoção e saúde operacional das condições**

-   Proporção de cotações e emissões com alguma condição especial aplicada, segmentada por produto, corretor e corretora

-   Condições expiradas com cotações ou propostas ainda vigentes vinculadas a elas


**Efetividade das campanhas**

A produção do período de vigência de uma condição deve ser comparável ao período equivalente sem condição, para distinguir incremento real de antecipação de emissões. Para condições direcionadas a perfis específicos de corretor, também é relevante monitorar se houve ativação de corretores que estavam inativos ou com baixa produção no período anterior.

---

## 06\. Evoluções e Melhorias

| **Funcionalidade**<br><br><br><br><br><br><br> | **Propósito**<br><br><br><br><br><br><br> |
| --- | --- |
| **Funcionalidade**<br><br><br><br><br><br><br> | **Propósito**<br><br><br><br><br><br><br> |
| --- | --- |
| Criar bolsão de descontos | Mudar o controle da Akad na criação de condições especiais e entregar ao corretor a autonomia para gerir um ‘orçamento de descontos’ |
