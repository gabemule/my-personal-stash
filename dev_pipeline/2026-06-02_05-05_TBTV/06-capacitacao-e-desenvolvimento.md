## Filosofia

O squad investe deliberadamente na formação de **Software Engineers com especialidade profunda e amplitude progressiva**. O objetivo não é eliminar especialidades, mas construir um time onde cada SE consiga contribuir além da sua área principal quando necessário.

```
Especialista puro → Especialista com visão cross → SE capaz de contribuir em múltiplas frentes
```

Essa evolução é gradual, apoiada por mecanismos estruturados e não por expectativa implícita.

---

## PDI — Plano de Desenvolvimento Individual

Cada SE do squad possui um PDI com **dois objetivos complementares** que formam um ciclo de ensinar e aprender:

### Objetivo 1: Workshop de Especialidade

> **"Ensine algo da sua rotina ao time."**

Cada SE prepara e apresenta um workshop sobre algum aspecto da sua especialidade que seja relevante para o squad.

**Exemplos:**
- SE especialista Backend apresenta como funciona a autenticação do sistema, o fluxo de APIs, ou a estrutura de banco de dados
- SE especialista Frontend mostra como o design system funciona, como é o fluxo de estado, ou como são feitas as integrações com APIs
- SE especialista Qualidade demonstra como monta cenários de teste, como funciona a automação de testes, ou como validar critérios de aceite
- SE especialista AI/Dados mostra como funciona o pipeline de dados, como são feitas integrações com LLMs, ou como validar outputs de modelos

**Objetivos do workshop:**
- Transmitir conhecimento da especialidade para o restante do time
- Documentar informalmente processos e decisões que geralmente ficam apenas na cabeça do especialista
- Criar base para que outros SEs possam atuar nessa área no futuro

**Formato sugerido:**
- Apresentação prática (live coding, demo, walkthrough de código)
- Duração: 30–60 minutos
- Aberto para perguntas e discussão
- Material pode ser gravado ou documentado para referência futura

---

### Objetivo 2: Aplicação de Conhecimento Cross

> **"Demonstre que aprendeu algo de outra área."**

Cada SE demonstra a aplicação prática de algum conhecimento absorvido em um workshop de outra especialidade.

**Exemplos:**
- SE especialista Frontend que assistiu workshop de backend cria um teste de integração para uma API
- SE especialista Backend que assistiu workshop de frontend implementa uma tela simples ou corrige um bug de UI
- SE especialista Qualidade que assistiu workshop de backend cria seeds de dados ou scripts auxiliares
- SE especialista Backend que assistiu workshop de AI/Dados implementa uma integração com LLM ou pipeline de embeddings
- SE especialista AI/Dados que assistiu workshop de qualidade cria testes de validação de outputs de modelos

**Objetivos da aplicação:**
- Reforçar o conhecimento absorvido através da prática
- Demonstrar que o ciclo de aprendizado está funcionando
- Contribuir com entrega real para o squad (não é exercício acadêmico)

**Formato sugerido:**
- Pode ser uma tarefa real do sprint ou uma contribuição técnica identificada
- Apresentação breve ao time mostrando o que foi feito e o que aprendeu
- Feedback do especialista da área sobre a qualidade da entrega

---

## Ciclo de Aprendizado

O ciclo completo de capacitação cross funciona assim:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   Workshop        Absorção        Aplicação       Feedback  │
│   (ensinar)  →  (aprender)   →   (praticar)  →  (avaliar)  │
│                                                             │
│   SE ensina      Time assiste    SE aplica o      Especialista│
│   sobre sua      e aprende       conhecimento    dá feedback │
│   especialidade  cross           em tarefa real  sobre a     │
│                                                  entrega     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Como os PDIs se conectam ao ciclo

| Etapa do Ciclo | Quem faz | Mecanismo |
|---|---|---|
| **Workshop** | Cada SE sobre sua área | PDI Objetivo 1 |
| **Absorção** | Time que assiste | Participação nos workshops |
| **Aplicação** | Cada SE em outra área | PDI Objetivo 2 |
| **Feedback** | Especialista da área | Review da entrega + 1:1 com EM |

---

## Testes Cruzados como Ferramenta de Capacitação

Além do papel de quality gate (descrito em [04 - Desenvolvimento e Qualidade](./04-desenvolvimento-e-qualidade.md)), os testes cruzados são uma ferramenta poderosa de capacitação:

### Como os testes cruzados capacitam

- **SE especialista Backend testando frontend** → aprende sobre fluxos de usuário, UX, regras de negócio do ponto de vista do front
- **SE especialista Frontend testando backend** → aprende sobre APIs, validações, fluxos de dados, regras de negócio do ponto de vista do back
- **SE especialista AI/Dados testando backend ou frontend** → entende como suas integrações impactam o produto final
- **Qualquer SE testando qualquer área** → entende o contexto completo da feature, não apenas a sua parte

### Progressão natural

Os testes cruzados preparam o terreno para a atuação cross-funcional:

```
Testa a outra área → Entende as regras de negócio → Começa a contribuir com código → Atua com autonomia crescente
```

---

## Pair Programming

O squad incentiva a prática de pair programming como ferramenta complementar de aprendizado, sem processo formal obrigatório.

### Quando faz sentido

- SE trabalhando em área nova (ex: especialista backend fazendo frontend pela primeira vez)
- Demanda complexa que se beneficia de duas cabeças
- Onboarding de novo membro — pair com SE experiente no projeto
- Resolução de bugs difíceis de reproduzir ou diagnosticar

### Como funciona

- Um SE pilota (escreve o código), o outro navega (revisa, sugere, questiona)
- Alternar papéis periodicamente
- Não precisa ser sessão inteira — 30–60 minutos focados são efetivos
- Pode ser presencial ou remoto (screen share)

---

## Roadmap de Capacitação

A capacitação é progressiva e não acontece de uma vez. O roadmap natural de um SE no squad é:

| Fase | O que acontece | Duração estimada |
|---|---|---|
| **1. Onboarding** | Entender o produto, a arquitetura e os processos do squad | Primeiras semanas |
| **2. Especialidade** | Entregar com consistência na sua área principal | Primeiros meses |
| **3. Workshops** | Participar de workshops de outras áreas e apresentar o seu (PDI) | Contínuo |
| **4. Testes cruzados** | Começar a testar trabalho de outras especialidades | Após familiarização |
| **5. Contribuições cross** | Realizar tarefas pontuais em outras áreas (PDI Objetivo 2) | Progressivo |
| **6. Atuação cross** | Atuar com autonomia em múltiplas frentes quando necessário | Longo prazo |

> **Nota:** Cada SE evolui gradualmente. O objetivo não é que todos cheguem à fase 6 ao mesmo tempo, mas que o time como um todo vá ampliando sua capacidade de contribuição cross ao longo do tempo.

---

## Acompanhamento

O progresso de capacitação é acompanhado através de:

- **1:1s quinzenais** entre EM e cada SE — espaço para discutir PDI, desafios e oportunidades
- **Workshops realizados** — registro de quem apresentou e sobre o que
- **Aplicações práticas** — registro de contribuições cross realizadas
- **Feedback de testes cruzados** — qualidade e aprendizado percebido

O EM usa essas informações para calibrar oportunidades de capacitação e distribuir demandas que acelerem o desenvolvimento de cada pessoa.
