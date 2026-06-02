# 01 - Estrutura do Squad

## Composição Padrão

O squad é composto por:

| Papel                    | Quantidade | Descrição                                                     |
| ------------------------ | ---------- | ------------------------------------------------------------- |
| Software Engineer (SE)   | ~4–6       | Desenvolve, mantém e garante qualidade de software            |
| Engineering Manager (EM) | 1          | Lidera pessoas e garante entrega consistente de valor pelo squad |
| Product Manager (PM)     | 1          | Gestão de produto, priorização e alinhamento com stakeholders |

### Especialidades dos SEs

Cada SE possui uma **especialidade dominante**, mas atua onde o squad precisar:

| Especialidade | Foco Principal |
|---|---|
| Backend | APIs, serviços, integrações e infraestrutura de dados |
| Frontend | Interfaces, experiência do usuário e integrações com APIs |
| Qualidade (QA) | Testes manuais e automatizados, validação de critérios de aceite, observabilidade |
| AI/Dados | Pipelines de dados, modelos de IA, integrações com LLMs, embeddings |

A composição típica varia por squad (ex: ~2 Backend, ~2 Frontend, 1 QA), e nem todo squad terá todas as especialidades representadas. Quando uma especialidade não tem representante dedicado, a responsabilidade é distribuída entre os SEs (ver seção de testes cruzados em [04 - Desenvolvimento e Qualidade](./04-desenvolvimento-e-qualidade.md)).

---

## Papéis e Responsabilidades

### Software Engineer (SE)

> *Desenvolve e evolui software com foco em impacto.*

- Desenvolver e evoluir software com foco em impacto para cliente e negócio
- Garantir qualidade (testes, revisões, observabilidade e confiabilidade, etc)
- Manter e operar sistemas em produção (incidentes, performance, custos, etc)
- Atuar em todas as especialidades e camadas da stack (back, front, qualidade, dados, IA, etc) e sem distinção de linguagens/frameworks
- Tomar decisões técnicas no contexto do squad
- Colaborar com produto e design dentro do squad para entregar valor de ponta a ponta
- Contribuir para melhoria contínua de código, arquitetura e práticas

### Engineering Manager (EM)

> *Lidera Software Engineers e entrega técnica*

- Formar e desenvolver times de alta performance (contratação, feedback, coaching)
- Evoluir e capacitar os SEs
- Garantir entrega consistente de valor pelos squads
- Desdobrar objetivos do negócio em metas claras para o time
- Remover impedimentos e melhorar a eficiência do time
- Promover boas práticas de engenharia e qualidade
- Alinhar engenharia com produto, design e stakeholders no nível de squads
- Colaborar com PM para influenciar priorização e roadmap, principalmente considerando aspectos técnicos

### Product Manager (PM)

> *Garante que o squad entregue o produto certo para o cliente e o negócio.*

- Definir e priorizar o backlog com base em impacto para cliente e negócio
- Traduzir necessidades de stakeholders em requisitos claros e acionáveis
- Garantir que toda demanda tenha contexto de negócio e critérios de aceite antes de entrar em desenvolvimento
- Acompanhar métricas de produto e usar dados para guiar decisões
- Atuar como par de EM e Design para entregar valor de ponta a ponta
- Comunicar roadmap, progresso e trade-offs para stakeholders
- Participar ativamente das cerimônias do squad (planning, refinamento, review)

---

## Filosofia: Especialistas com Mentalidade Generalista

O squad opera com uma filosofia de **especialistas que atuam onde o squad precisar**.

### O que isso significa

- **As especialidades não morrem.** Um especialista executa com mais profundidade e qualidade na sua área. SE especialista Backend continua dominando backend, SE especialista Frontend continua dominando frontend.
- **Mas o foco é o squad, não a especialidade.** Cada SE vai progressivamente ampliando seu conhecimento para poder contribuir em outras frentes quando necessário.
- **O objetivo é um time que se auto-organiza.** Quando há gargalo em uma frente, outros SEs conseguem desafogar, sem depender exclusivamente de uma especialidade.

### Como funciona na prática

A atuação cross-funcional acontece **quando necessário e possível**, sempre respeitando a senioridade e capacidade de cada pessoa:

| Quem                          | Pode ajudar em    | Exemplos                                                              |
| ----------------------------- | ----------------- | --------------------------------------------------------------------- |
| **SE especialista Frontend**  | Backend, QA       | Criar testes de integração, resolver incidentes de menor complexidade |
| **SE especialista Backend**   | Frontend, QA      | Implementar demandas de frontend, criar automações de testes          |
| **SE especialista Qualidade** | Backend, Frontend | Criar massa de dados, seeds, scripts auxiliares                       |
| **Qualquer SE**               | Qualquer área     | Testes cruzados, resolução de incidentes, pair programming            |

### Quando atuar fora da especialidade

✅ **Faz sentido quando:**
- Há gargalo evidente em uma frente e capacidade ociosa em outra
- A tarefa está dentro do nível de conhecimento do SE (ou é uma oportunidade de aprendizado com suporte)
- Estamos em fase final de entrega e precisamos desafogar uma frente
- É uma oportunidade deliberada de capacitação cross

❌ **Não faz sentido quando:**
- A tarefa exige profundidade técnica que o SE ainda não possui e não há tempo para aprendizado
- Vai gerar mais retrabalho do que economia
- A própria especialidade do SE está com demandas pendentes

### Evolução progressiva

O caminho de cada SE é:

```
Especialista → Especialista com visão cross → SE capaz de contribuir em múltiplas frentes
```

Essa evolução é deliberada e apoiada por:
- [PDIs com workshops e aplicação prática](./06-capacitacao-e-desenvolvimento.md)
- Testes cruzados como ferramenta de aprendizado
- Exposição progressiva a tarefas de outras especialidades
