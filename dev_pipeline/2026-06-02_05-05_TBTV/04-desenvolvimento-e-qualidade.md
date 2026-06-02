## Branching Strategy

O squad utiliza **feature branch** como estratégia de versionamento.

### Branches de Ambiente

```
main (produção — source of truth)
hml  (homologação)
dev  (desenvolvimento)
```

### Fluxo de Feature

```
1. Feature branch criada a partir de main
2. Merge feature → dev       → Deploy em Dev
3. Merge feature → hml       → Deploy em HML
4. Merge feature → main      → Deploy em Prod
5. Mergeback: main → hml → dev  (equalização das branches)
```

### Convenções

- **Feature branches** são criadas a partir de `main`
- O nome da branch deve ser descritivo e referenciado ao card (ex: `feature/SQUAD-123-login-social`)
- Branches de **hotfix** são criadas a partir de `main` para correções urgentes em produção
- Após merge na main, é feito **mergeback** (main → hml → dev) para manter todas as branches equalizadas
- Após merge, a feature branch é deletada

---

## Code Review

O code review é uma etapa obrigatória antes de qualquer merge. O objetivo é garantir qualidade, compartilhar conhecimento e reduzir riscos.

### Regras

- **Mínimo de 1 aprovação** de outro membro do squad
- O autor do PR deve fazer **self-review** antes de solicitar revisão
- O revisor é preferencialmente alguém do squad, tendendo cada vez mais a reviews **cross-especialidade** (ex: SE especialista Frontend revisando código de backend e vice-versa)

### O que avaliar no review

- Correção funcional (resolve o problema proposto?)
- Qualidade de código (legibilidade, manutenibilidade, padrões do projeto)
- Testes (foram escritos? cobrem os cenários relevantes?)
- Segurança (inputs validados? dados sensíveis protegidos?)
- Performance (consultas otimizadas? sem loops desnecessários?)

### Boas Práticas

- PRs devem ser pequenos e focados — evitar PRs gigantes que são difíceis de revisar
- Descrição do PR deve explicar **o quê**, **por quê** e **como testar**
- Comentários devem ser construtivos — sugestões, não ordens
- Usar ferramentas de sugestão inline quando possível

---

## Testes

### Tipos de Teste

| Tipo | Responsável | Quando | Objetivo |
|---|---|---|---|
| **Unitário** | SE que desenvolveu | Durante o desenvolvimento | Validar unidades isoladas de lógica |
| **Integração** | SE que desenvolveu | Durante o desenvolvimento | Validar interação entre módulos/serviços |
| **E2E (End-to-End)** | SE (qualidade ou teste cruzado) | Fase de testes | Validar fluxos completos do ponto de vista do usuário |
| **Manual** | SE (qualidade ou teste cruzado) | Fase de testes | Validação exploratória e de critérios de aceite |

### Expectativa por Etapa

- **Em Dev:** SE escreve testes unitários e de integração junto com o código
- **Em Testes:** SE especialista em qualidade (ou outro SE em teste cruzado) executa testes manuais, e2e e validação de critérios de aceite
- **Em HML:** Validação final em ambiente próximo a produção

### Testes Cruzados

Testes cruzados são a prática de **um SE testar o trabalho de outro SE**, especialmente quando o squad não possui especialista em qualidade dedicado.

#### Quando aplicar

- Squad sem SE especialista em qualidade dedicado
- SE de qualidade está sobrecarregado e há outro SE disponível
- Fase final de sprint com muitas entregas pendentes de teste
- Como oportunidade deliberada de capacitação (entender regras de negócio de outra frente)

#### Como funciona

1. O SE A finaliza seu desenvolvimento e move para **Pronto para Testes**
2. O SE B (de preferência de outra especialidade) assume o teste
3. SE B valida os critérios de aceite, executa testes manuais e registra bugs encontrados
4. Se aprovado, SE B move para **Pronto para HML**

#### Benefícios

- **Quality gate** mantido mesmo sem especialista em qualidade dedicado
- **Aprendizado cross:** SE especialista backend testando frontend aprende sobre UX e regras de negócio do front, e vice-versa
- **Distribui conhecimento** de regras de negócio pelo time
- **Reduz bus factor** — mais pessoas entendem mais partes do sistema

#### Checklist Mínimo para Testes Cruzados

- [ ] Critérios de aceite do card validados
- [ ] Fluxo principal (happy path) testado
- [ ] Cenários de erro/borda testados
- [ ] Sem regressões visuais ou funcionais identificadas
- [ ] Evidência registrada (screenshot, log, anotação no card)

---

## CI/CD

O squad possui pipeline de CI/CD totalmente automatizado.

### Pipeline de CI (Integração Contínua)

Executado automaticamente a cada push/PR:

```
Push/PR → Lint → Testes Automatizados → SonarQube → Build
```

| Etapa | O que valida |
|---|---|
| **Lint** | Padrões de código e formatação |
| **Testes Automatizados** | Unitários e de integração |
| **SonarQube** | Qualidade de código, code smells, vulnerabilidades, cobertura |
| **Build** | Compilação/build da aplicação |

**Regra:** PR só pode ser mergeado se o pipeline estiver verde (todas as etapas passando).

### Pipeline de CD (Deploy Contínuo)

O deploy é acionado pelo merge da feature branch em cada ambiente:

```
Merge feature → dev   → Deploy em Dev
Merge feature → hml   → Deploy em HML
Merge feature → main  → Deploy em Prod
```

Após o deploy em produção, é feito o **mergeback** para equalizar as branches:

```
main → hml → dev  (equalização)
```

---

## Ambientes

| Ambiente | Propósito | Quem usa |
|---|---|---|
| **Dev** | Desenvolvimento e testes iniciais | SEs durante o desenvolvimento |
| **HML (Homologação)** | Validação final pré-produção | SEs, PM, stakeholders |
| **Prod (Produção)** | Ambiente real de usuários | Usuários finais |

### Boas Práticas por Ambiente

- **Dev:** Pode ser instável, usado para integração e testes. Dados podem ser resetados.
- **HML:** Deve espelhar produção o máximo possível. Dados de teste controlados.
- **Prod:** Deploy com monitoramento ativo. Rollback disponível em caso de problemas.
