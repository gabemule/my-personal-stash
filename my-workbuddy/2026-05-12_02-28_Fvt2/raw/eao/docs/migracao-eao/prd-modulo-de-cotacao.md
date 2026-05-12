---
title: "PRD | Módulo de Cotação do E&O"
source_url: "https://akadseguros.atlassian.net/wiki/spaces/EO/pages/1587937287/PRD+M+dulo+de+Cota+o+do+E+O"
converted_at: "2026-05-12T01:56:35.200Z"
---

# PRD | Módulo de Cotação do E&O

| **Objetivo** | Construir uma jornada de cotação simples para o corretor, escalável para a engenharia e eficiente para a subscrição. |
| --- | --- |
| **Princípios** | <br>-   Uma única jornada E&O, simples de cotar e fácil de evoluir<br> -   Teremos um motor de precificação granular e com autonomia para a subscrição<br> -   Devemos padronizar e simplificar o uso das franquias e fatores<br><br> |
| **Escopo** | <br>-   Profissões, atividades seguradas, fatores de agravo<br> -   Informações necessárias para análise do risco<br> -   Motor de cálculo, suas variáveis e fatores<br> -   Franquias e ISs<br> -   Coberturas e Exclusões<br> -   Carta de Cotação<br> -   Edição da Cotação<br><br> |
> **⚠️ Warning:**
>
> Todos os textos em vermelho indicam pontos em discussão ou dúvidas a serem esclarecidas.

## 01\. Jornada do Usuário, Fluxos e Protótipos

**Visão alto nível da jornada de cotação**

<details>
<summary>Click to expand</summary>

**AS IS:** [https://www.figma.com/design/FNTH0ue6uaEWdEVvXBZtai/E-O?node-id=4164-29627&t=Ezh3Cwi6R26Yj1QT-1](https://www.figma.com/design/FNTH0ue6uaEWdEVvXBZtai/E-O?node-id=4164-29627&t=Ezh3Cwi6R26Yj1QT-1)Pré-visualizar

Open

AS IS

**TO BE:** [https://www.figma.com/design/OIGoGphmyV79rF20Y58aW0/Novo-E-O?node-id=0-1&t=UMbRRfn6a7DqJKbi-1](https://www.figma.com/design/OIGoGphmyV79rF20Y58aW0/Novo-E-O?node-id=0-1&t=UMbRRfn6a7DqJKbi-1)Pré-visualizar

Open

TO BE

#### Fluxograma Alto Nível - Usuário <> Sistemas

**Usuário (Corretor)**
→ Inicia cotação
→ Preenche entrada única
→ Preenche dados da cotação
→ Visualiza prêmio em tempo real
→ Ajusta condições comerciais
→ Gera cotação
→ Avança para proposta

**Sistema**
→ Direciona fluxo
→ Pré-preenche dados
→ Atualiza prêmio conforme alterações
→ Aplica regras de risco e precificação
→ Gera cotação

</details>

<details>
<summary>Click to expand</summary>

Hoje, o corretor inicia uma cotação de E&O por **duas portas de entrada diferentes**:

1.  Pelo menu, selecionando uma atividade já separada entre PF e PJ

2.  Pelo analisador de risco, informando:

    -   Profissão

    -   Tipo de perfil (PF ou PJ)

    -   IS

    -   Faturamento

    -   Indicação de contrato específico


No analisador de risco, caso a IS ultrapasse determinado limite, o faturamento seja acima do permitido ou exista contrato específico, o corretor é direcionado para o fluxo Corporate.

Após a entrada no fluxo de cotação (na maioria das profissões), o corretor percorre o seguinte fluxo:

-   CPF ou CNPJ do segurado

-   Indicação se o seguro é novo ou renovação

    -   Em caso de renovação, nome da seguradora anterior

-   Seleção da atividade segurada dentro da profissão

-   Para PF, dependendo da profissão, documento profissional (OAB, CRECI, CRM etc.)

-   Seleção da atividade exercida dentro da profissão

    -   Em alguns casos, o sistema exibe atividades não aceitas

-   Para PJ, faturamento

-   Para algumas profissões, escolha do prazo da apólice (12 ou 18 meses)

-   Data de início de vigência

    -   Data de fim calculada automaticamente

-   Informação de retroatividade

-   Declaração de sinistros nos últimos 5 anos e valor, quando aplicável

-   Seleção de IS

-   Seleção de franquia

-   Seleção obrigatória de **campanha** (define comissão)

-   Seleção de **grupo de afinidade**, quando aplicável

-   As coberturas são exibidas (não editáveis)


O corretor clica em “**calcular**” para visualizar o valor do prêmio

Após o cálculo, ainda é possível:

-   Aplicar agravo

-   Alterar comissão

-   Editar a cotação


O valor do prêmio **só é conhecido ao final do fluxo**, após o cálculo completo.

</details>

### Jornada Ideal

**Entrada Única**

No fluxo ideal, a cotação de E&O passa a ter **uma única entrada**, com objetivo exclusivo de direcionamento do fluxo.

O corretor inicia a cotação informando apenas:

-   Profissão

-   Tipo de segurado (PF ou PJ)

-   Característica do Risco (Sim/Não)


Após o envio dessas informações, o sistema **direciona** o corretor para:

-   Caso “Não”, o fluxo Corporate (risco alto) que existe atualmente

-   Caso “Sim”, o fluxo de cotação digital


**Cotação Digital**

Na cotação digital, o corretor já entra no fluxo correto e passa a informar:

-   CPF ou CNPJ do segurado

-   Tipo de Seguro

-   Prazo da apólice (12 ou 18 meses)

-   Data de início de vigência

-   Data de fim de vigência

-   Retroatividade

-   Atividade exercida dentro da profissão


Para segurados PJ:

-   O **faturamento** já vem **pré-preenchido** com base


A **IS** também vem **pré-preenchida** conforme informado na entrada, com possibilidade de:

-   Selecionar franquia


> **📝 Note:**
>
> **Desejável**: visualizar até 3 opções de IS e franquia

Na parte de coberturas:

-   O corretor pode **dividir o limite de cobertura** entre cobertura básica e custos de defesa

-   As **exclusões** do seguro são **exibidas para todos os casos**


O **valor do prêmio** passa a ser:

-   Exibido e atualizado conforme o preenchimento e alteração dos dados


Na lateral da tela, abaixo do prêmio, o corretor pode:

-   Editar comissão

-   Aplicar agravo

-   Selecionar uma condição comercial (**substituindo campanha e grupo de afinidade**)


Após finalizar a cotação:

-   O corretor acessa a tela de cotação

-   Pode baixar a carta de cotação

-   Pode enviar a carta de cotação

-   Pode seguir para a proposta


**Proposta**

Na proposta, o corretor:

-   Preenche os dados complementares do segurado (contato, endereço etc.)

-   Informa documento profissional, quando aplicável


Após a geração da proposta:

-   Visualiza a tela para envio do link de checkout ao segurado


---

## 02\. Requisitos Funcionais

**Analisador de Risco**

-   O analisador de risco terá as seguintes informações: Tipo de Segurado (PF/PJ), Profissão e Característica do Risco (`Sim` ou `Não`)

-   Com base na `Característica do Risco` o usuário é levado para o workflow Corporate ou Digital

-   A lista de profissões e suas atividades seguradas estão listadas aqui: [https://docs.google.com/spreadsheets/d/1Ne7hPF9JdcAF3-tJyAo3f-DiB4vBwESNHBCkw1PPynA/edit?usp=sharing](https://docs.google.com/spreadsheets/d/1Ne7hPF9JdcAF3-tJyAo3f-DiB4vBwESNHBCkw1PPynA/edit?usp=sharing)


**Cotação**

-   O corretor preenche as seguintes informações para a cotação:

    -   CPF/CNPJ,

    -   Tipo de Seguro (`Seguro novo` ou `Renovação Congênere`)

    -   Período de cobertura (`12 meses` ou `18 meses`)

    -   Retroatividade (`Sem retroatividade`, `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `10`)

    -   Início da Vigência

    -   Atividade do Segurado + Complemento das Atividades

    -   Faturamento Anual, caso seja PJ

    -   Importância Segurada

    -   Franquia

    -   Co-corretagem

    -   Histórico de Sinistros

    -   Divisão de Cobertura

-   Todas as informações da cotação, com exceção de `CPF/CNPJ`, `Início da Vigência`, `Co-corretagem` e `Divisão de Cobertura`, possuem fatores atrelados a si

-   Sobre o campo `CPF/CNPJ`

    -   O usuário irá informar o CPF ou CNPJ e o sistema deve retornar nome completo ou razão social;

    -   Desejável: Validar se o CPF/CNPJ já possui apólice ativa para o produto em cotação. Caso sim, sinalizar em tela para o corretor.

    -   Desejável: Caso o CPF/CNPJ tenha renovação para fazer, direcionar para o fluxo de cotação de renovação ao invés de manter como seguro novo.

-   Sobre o campo `Início da Vigência`

    -   Caso seja `Seguro Novo`, o início da vigência pode ser em até D+14 da data da cotação

    -   Caso seja `Renovação Congênere`, o início da vigência pode ser em até D+30 da data da cotação

    -   Com base no início da vigência e período de cobertura, o sistema calcula o fim da vigência

-   Sobre o campo `Atividade do Segurado`

    -   As opções de Atividades do Segurado sendo exibidas estão sempre relacionadas à Profissão e ao Tipo de Segurado

    -   O usuário pode selecionar quantas atividades quiser. Para o cálculo, considera-se a atividade com fator mais agravado

-   Sobre a seção de `Complemento das Atividades`

    -   Algumas profissões poderão ter checkbox opcionais para que o corretor informe se o segurado executa alguns tipos de atividades (i.e.: características complementares às atividades seguradas) que podem adicionar agravo ou desconto, em cima do prêmio

-   Sobre o campo `Faturamento Anual`

    -   Este campo deve ser exibido apenas quando o tipo de segurado for `PJ` -   O limite padrão de Faturamento Anual para ser cotado e emitido na ponta é de R$20MM

    -   É possível que sejam configurados limites maiores para profissões ou atividades específicas, cujas cotações deverão passar por moderação

-   Sobre a `Importância Segurada`

    -   O limite padrão de IS para ser cotado e emitido na ponta é de R$5MM.

    -   Limites maiores podem ser configurados para profissões ou atividades específicas; tais cotações devem ser submetidas à moderação.

    -   O usuário deve escolher pelo menos 1 e no máximo 3 importâncias seguradas para criar a cotação.

    -   Cada Importância Segurada está vinculada a uma franquia, determinando as variáveis de uma cotação com múltiplas opções

-   Sobre a `Franquia`

    -   O usuário pode selecionar, no mínimo 1 e no máximo 3, franquias para que a cotação seja criada

    -   Toda franquia está atrelado a profissão, tipo de segurado e especialidade , definindo as variáveis de uma cotações com múltiplas opções

    -   Para toda combinação de profissão + tipo de segurado + especialidade temos 3 opções de tipos de franquia: Padrão, Majorada e Reduzida

    -   O texto e os fatores de cada tipo de franquia varia por profissão + atividade segurada + IS

        -   ex: a Franquia Majorada de Médicos PF Obstetra com IS de 2MM é de 10% com R$2.000. Já para Médicos PF sem cirurgia a majorada é de 5% com R$1.500

-   Sobre a `Co-corretagem`

    -   O padrão é de 100% da comissão para o corretor logado

    -   O usuário pode pesquisa na base de corretores Akad para selecionar o corretor desejado e qual o percentual de comissão que deve ir para ele

    -   A soma da divisão entre os corretores deve ser sempre 100%

-   Sobre o `histórico de Sinistro`

    -   O histórico consiste em 3 perguntas:

        -   (1) Total de sinistros nos últimos 5 anos

            -   opções: `0`, `1`, `2`, `3 ou mais`

        -   (2) Valor total pago em sinistros nos últimos 5 anos

            -   opções: campo aberto com máscara de moeda

        -   (3) Total de sinistros nos últimos 12 meses

            -   opções: exibe opções até o máximo preenchido na pergunta (1)

    -   Caso em (1) o usuário selecione 3 ou mais, o fluxo trava e ele deve ser redirecionado ao workflow corporate

    -   A pergunta (2) só é exibida caso em (1) seja maior ou igual a 1

    -   Caso em (2) o usuário informe mais que R$300k, o fluxo trava e ele deve ser redirecionado ao workflow corporate

    -   Caso em (3) o usuário informe `2` ou `3 ou mais`, o fluxo trava e ele deve ser redirecionado ao workflow corporate

-   Sobre a `Divisão de Cobertura`

    -   O usuário pode escolher o percentual da LMG que será destinada ao bloco de custos de defesa e ao bloco de coberturas básicas

    -   A divisão de LMG não implica em alteração de prêmio

-   O sistema deve exibir as especialidades não elegíveis, de forma dinâmica, para cada profissão

-   Após o cálculo da cotação, o usuário pode:

    -   Baixar o PDF da cotação

    -   Compartilhar ele via e-mail ou WhatsApp

    -   Editar a cotação

    -   Enviar a cotação para análise da subscrição (moderação) para efetivar a proposta, caso esteja fora do limite de emissão sem moderação

    -   Selecionar a opção desejada para efetivar proposta, caso esteja dentro do limite para emissão sem moderação


**Comissão**

-   Todo produto possui um percentual de comissão definido para ele. Para o E&O a comissão base é de 20%

-   Uma condição especial pode fazer override no percentual de comissão considerado na precificação

-   Caso esteja aplicada uma condição especial de comissão, o corretor pode mexer em sua comissão até o valor máximo concedido pela condição especial.

-   A comissão da cotação (% e R$) deve estar visível ao corretor de forma simples via Portal.


**Agravo**

-   O agravo não pode ser aplicado enquanto tiver uma condição especial de desconto aplicada na cotação

-   O valor máximo do agravo é de 35%


**Motor de Cálculo**

-   Cada variável da cotação estará ligado a uma tabela de fatores.

    -   ex: Haverá uma tabela de profissões, cujo fator irá variar entre as possibilidades de profissão. Outra tabela sobre o período de vigência, que informará qual o fator da vigência de 12 meses e qual o fator da vigência de 18 meses.

-   Cada tabela deve ter 2 variações: Uma de preço técnico e outra de preço comercial

    -   A tabela de preço técnico representa os fatores atuariais. Elas definem o menor preço a ser comercializado o produto de forma a garantir rentabilidade para a Akad.

    -   A tabela de preço comercial define fatores, que serão aplicados em cima dos fatores técnicos, para dinamizar a precificação

    -   Para a tabela comercial o valor mínimo é de 1 (ou seja, não pode baratear o fator técnico) e o valor máximo é TBD

-   Toda alteração feita no motor de cálculo e/ou seus fatores devem estar atreladas a uma versão

-   Quando ocorrer uma mudança no motor de cálculo e/ou em seus fatores, as cotações válidas e propostas criadas porém não emitidas devem consumir e refletir a versão ativa no momento de sua criação

-   Um fator pode ser padrão ou pode variar de acordo com a profissão. Isso deve ser flexível.

    -   Ex: A variável `Período de Cobertura` pode ter fatores fixos de acordo com os seus valores (i.e.: `12 meses` com fator x e `18 meses` com fator y) ou pode ter um fator dependendo da profissão em que é selecionado. (i.e.: `12 meses` de médico é A e `12 meses` de advogado é B)

-   Ao realizar a cotação, deverá ser registrado em banco o valor técnico e o valor comercial. O valor técnico é o calculado com base nos fatores técnicos e o valor comercial é o calculado com base nos fatores comerciais configurados pela subscrição.

-   Em definição: Fórmula que irá contemplar os fatores das tabelas, a comissão, o agravo e o desconto.

-   Desejável: A estrutura do motor de cálculo deve ser construído de forma a poder ser reaproveitado em outros produtos que migrarem.

-   Tabelas Necessárias:


| **#**<br><br><br><br><br><br><br> | **Tabela**<br><br><br><br><br><br><br> | **Variáveis**<br><br><br><br><br><br><br> |
| --- | --- | --- |
| **#**<br><br><br><br><br><br><br> | **Tabela**<br><br><br><br><br><br><br> | **Variáveis**<br><br><br><br><br><br><br> |
| --- | --- | --- |
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
**Coberturas**

-   O produto de E&O possui um grupo de coberturas padrão do produto

-   A depender da profissão e do tipo de segurado, existem coberturas específicas dele

-   A relação de coberturas por profissão e tipo de segurado estão [aqui](https://docs.google.com/spreadsheets/d/161ALRJKQHae619kAn-ovZrKFuIWDXUXn61-IqbbdSYw/edit?gid=1311585594#gid=1311585594 "https://docs.google.com/spreadsheets/d/161ALRJKQHae619kAn-ovZrKFuIWDXUXn61-IqbbdSYw/edit?gid=1311585594#gid=1311585594")

-   Toda alteração nas coberturas devem estar atreladas a uma versão

-   Quando ocorrer uma mudança nas coberturas, as cotações válidas e propostas criadas porém não emitidas devem consumir e refletir a versão ativa no momento de sua criação

-   Assim como o sistema deve exibir as coberturas, ele deve também exibir as exclusões, listadas [aqui](https://docs.google.com/spreadsheets/d/1Ne7hPF9JdcAF3-tJyAo3f-DiB4vBwESNHBCkw1PPynA/edit?gid=425039067#gid=425039067 "https://docs.google.com/spreadsheets/d/1Ne7hPF9JdcAF3-tJyAo3f-DiB4vBwESNHBCkw1PPynA/edit?gid=425039067#gid=425039067")

-   Toda cobertura terá uma breve descrição, que será exibida via tooltip em tela

-   Teremos a divisão de prêmio entre coberturas individuais ou bloco de coberturas?


**Edição de Cotação**

-   Quando uma cotação for editada o sistema deve armazenar e disponibilizar as versões anteriores (tanto a carta de cotação quanto os dados) para visão histórica

-   Somente poderá ser gerada proposta a partir da última versão da cotação ativa. As versões anteriores podem ser consultadas, porém não transmitidas como proposta


**Ciclo de Vida da Cotação**

-   Por padrão, a validade de uma cotação é de 15 dias

-   A validade da cotação irá até a data de início de vigência, variando a validade de 1 até 30 dias, dependendo se é Seguro Novo ou Renovação Congênere

-   Sempre que uma cotação for editada, a sua data de validade deve ser recalculada

-   Após o fim da validade de uma cotação, o sistema deve expirá-la e impedir a geração de uma proposta


---

## 03\. Dados e Métricas Relevantes

**Dados a capturar**

**\-**

**Métricas de negócio**

**\-**

---

## 04\. Evoluções e Melhorias

| **Funcionalidade**<br><br><br><br><br><br><br> | **Propósito**<br><br><br><br><br><br><br> | **Prioridade**<br><br><br><br><br><br><br> |
| --- | --- | --- |
| **Funcionalidade**<br><br><br><br><br><br><br> | **Propósito**<br><br><br><br><br><br><br> | **Prioridade**<br><br><br><br><br><br><br> |
| --- | --- | --- |
| \- |  |  |
