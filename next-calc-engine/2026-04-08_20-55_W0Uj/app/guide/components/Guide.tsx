"use client"

import { useState, useEffect, useRef } from "react"
import { PageHeader } from "@/components/PageHeader"

const sections = [
  { id: "visao-geral",   label: "O que é esta ferramenta?" },
  { id: "organizacao",   label: "Projetos e Motores" },
  { id: "variaveis",     label: "Variáveis" },
  { id: "tabelas",       label: "Tabelas de Tarifas" },
  { id: "importacao",    label: "Importando Dados em Tabelas" },
  { id: "tabelas-parametrizadas", label: "Tabelas Parametrizadas" },
  { id: "etapas",        label: "Etapas de Cálculo" },
  { id: "expressoes",    label: "Construindo Fórmulas" },
  { id: "condicionais",  label: "Regras Condicionais (IF)" },
  { id: "configuracao",  label: "Configurações do Motor" },
  { id: "testando",      label: "Testando o Motor" },
  { id: "fluxo",         label: "Fluxo Completo de Trabalho" },
]

type TokenVariant = "number" | "varRef" | "stepRef" | "tableRef" | "conditional" | "op" | "paren" | "default"

const tokenStyles: Record<TokenVariant, string> = {
  number:      "border-[var(--color-token-number-border)]      bg-[var(--color-token-number-bg)]      text-[var(--color-token-number)]",
  varRef:      "border-[var(--color-token-varref-border)]      bg-[var(--color-token-varref-bg)]      text-[var(--color-token-varref)]",
  stepRef:     "border-[var(--color-token-stepref-border)]     bg-[var(--color-token-stepref-bg)]     text-[var(--color-token-stepref)]",
  tableRef:    "border-[var(--color-token-tableref-border)]    bg-[var(--color-token-tableref-bg)]    text-[var(--color-token-tableref)]",
  conditional: "border-[var(--color-token-conditional-border)] bg-[var(--color-token-conditional-bg)] text-[var(--color-token-conditional)]",
  op:          "border-[var(--color-border)]                   bg-[var(--color-surface)]              text-[var(--color-token-op)]",
  paren:       "border-[var(--color-border)]                   bg-[var(--color-input)]                text-[var(--color-token-paren)]",
  default:     "border-[var(--color-border)]                   bg-[var(--color-surface)]              text-[var(--color-text)]",
}

function Btn({ children, token = "default" }: { children: React.ReactNode; token?: TokenVariant }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border font-mono leading-none ${tokenStyles[token]}`}>
      {children}
    </span>
  )
}

function Badge({ children, color = "muted" }: { children: React.ReactNode; color?: "accent" | "green" | "yellow" | "blue" | "red" | "muted" | "purple" }) {
  const styles: Record<string, string> = {
    accent:  "border-[var(--color-accent)]/60  text-[var(--color-accent)]  bg-[var(--color-accent)]/10",
    green:   "border-[var(--color-green)]/60   text-[var(--color-green)]   bg-[var(--color-green-bg)]",
    yellow:  "border-[var(--color-yellow)]/60  text-[var(--color-yellow)]  bg-[var(--color-yellow-bg)]",
    blue:    "border-[var(--color-blue)]/60    text-[var(--color-blue)]    bg-[var(--color-blue-bg)]",
    red:     "border-[var(--color-red)]/50     text-[var(--color-red)]     bg-transparent",
    muted:   "border-[var(--color-border)]     text-[var(--color-muted)]   bg-transparent",
    purple:  "border-[var(--color-purple)]/60  text-[var(--color-purple)]  bg-[var(--color-purple)]/10",
  }
  return (
    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded border leading-none ${styles[color]}`}>
      {children}
    </span>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 flex flex-col gap-5">
      <div className="border-b border-[var(--color-border)] pb-3">
        <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-[var(--color-blue-bg)] border border-[var(--color-blue)]/30 text-sm text-[var(--color-text-secondary)]">
      <span className="text-[var(--color-blue)] shrink-0 mt-0.5">ℹ</span>
      <div className="leading-relaxed">{children}</div>
    </div>
  )
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-[var(--color-yellow-bg)] border border-[var(--color-yellow)]/30 text-sm text-[var(--color-text-secondary)]">
      <span className="text-[var(--color-yellow)] shrink-0 mt-0.5">⚠</span>
      <div className="leading-relaxed">{children}</div>
    </div>
  )
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm text-[var(--color-text-secondary)]">
          <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--color-accent)]/15 text-[var(--color-accent)] text-[10px] font-bold flex items-center justify-center mt-0.5">
            {i + 1}
          </span>
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ol>
  )
}

function TableComp({ headers, rows }: { headers: (string | React.ReactNode)[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            {headers.map((h, i) => (
              <th key={i} className="text-left px-4 py-2 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface)]">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2.5 text-[var(--color-text-secondary)] align-top">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Example({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
      <div className="px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Exemplo — {title}</span>
      </div>
      <div className="px-4 py-3 text-sm text-[var(--color-text-secondary)] leading-relaxed flex flex-col gap-2">
        {children}
      </div>
    </div>
  )
}

export function Guide() {
  const [activeSection, setActiveSection] = useState("visao-geral")
  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        }
      },
      { rootMargin: "-10% 0px -80% 0px" }
    )
    document.querySelectorAll("section[id]").forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col">
      {/* Header */}
      <PageHeader sticky>
        <div>
          <h1 className="text-base font-semibold">Guia de Uso</h1>
          <p className="text-[10px] text-[var(--color-muted)]">Calc Engine Builder — Para times atuarial e operacional</p>
        </div>
      </PageHeader>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar TOC */}
        <aside className="w-56 shrink-0 border-r border-[var(--color-border)] overflow-y-auto py-6 px-3 hidden md:block">
          <p className="text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-wider px-2 mb-3">Seções</p>
          <nav className="flex flex-col gap-0.5">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`text-xs px-2 py-1.5 rounded transition-colors ${
                  activeSection === s.id
                    ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-medium"
                    : "text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]"
                }`}
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main ref={mainRef} className="flex-1 overflow-y-auto py-10 px-10">
          <div className="flex flex-col gap-14">

            {/* ── Visão Geral ── */}
            <Section id="visao-geral" title="O que é esta ferramenta?">
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                O <strong>Calc Engine Builder</strong> é uma ferramenta para criar e testar
                <strong> motores de cálculo</strong> — modelos matemáticos que automatizam a apuração
                de prêmios, tarifas, coeficientes e outros valores derivados de regras de negócio.
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Com ela, o time atuarial e operacional pode montar e validar a lógica de precificação
                de forma visual, sem depender de planilhas isoladas ou de desenvolvimento de software a cada ajuste.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: "①", title: "Defina as entradas",    desc: "Faturamento, classe de risco, segmento, anos sem sinistro — qualquer dado que varia por cliente." },
                  { icon: "②", title: "Monte as tabelas",      desc: "Tarifas por faixa de faturamento, coeficientes por segmento, descontos por sinistralidade." },
                  { icon: "③", title: "Crie as etapas",        desc: "Prêmio bruto, ajustes, descontos, IOF — cada passo do cálculo em sequência." },
                  { icon: "④", title: "Teste e valide",        desc: "Insira valores reais e confira cada resultado intermediário antes de publicar." },
                ].map((c) => (
                  <div key={c.title} className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--color-accent)] font-bold">{c.icon}</span>
                      <span className="text-sm font-semibold">{c.title}</span>
                    </div>
                    <p className="text-xs text-[var(--color-muted)]">{c.desc}</p>
                  </div>
                ))}
              </div>
              <Tip>
                Todos os cálculos usam <strong>precisão decimal exata</strong> — sem erros de arredondamento
                de ponto flutuante. O resultado que você vê no teste é idêntico ao que será produzido em produção.
              </Tip>
            </Section>

            {/* ── Organização ── */}
            <Section id="organizacao" title="Projetos e Motores">
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                A ferramenta organiza o trabalho em dois níveis:
              </p>
              <div className="flex flex-col gap-3">
                <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] flex flex-col gap-1.5">
                  <span className="text-sm font-semibold">Projeto</span>
                  <p className="text-xs text-[var(--color-muted)]">
                    Um contêiner organizacional — por exemplo, <em>&ldquo;RC Operações&rdquo;</em>, <em>&ldquo;Responsabilidade Civil Produtos&rdquo;</em>
                    ou <em>&ldquo;Seguro de Vida&rdquo;</em>. Um projeto pode ter vários motores.
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] flex flex-col gap-1.5">
                  <span className="text-sm font-semibold">Motor de Cálculo</span>
                  <p className="text-xs text-[var(--color-muted)]">
                    A lógica completa de um produto ou modalidade: variáveis, tabelas de tarifas e fórmulas de cálculo.
                    Um motor resulta no prêmio final (ou qualquer valor calculado) para um conjunto de entradas.
                  </p>
                </div>
              </div>

              <h3 className="text-sm font-semibold mt-1">Como criar um projeto</h3>
              <Steps items={[
                <>No menu <Btn>☰</Btn> (canto superior esquerdo), clique em <Btn>Projetos</Btn>.</>,
                <>Clique no botão <Btn>+ Novo Projeto</Btn>.</>,
                <>Digite o nome do projeto e pressione <Btn>Enter</Btn>.</>,
              ]} />

              <h3 className="text-sm font-semibold mt-1">Como criar um motor</h3>
              <Steps items={[
                <>No menu <Btn>☰</Btn>, clique em <Btn>Motores</Btn>.</>,
                <>Verifique que o projeto correto está selecionado no topo da tela.</>,
                <>Clique em <Btn>+ Novo Motor</Btn>. Um motor em branco será criado e aberto no builder.</>,
                <>Renomeie o motor clicando no nome na barra superior e digitando o novo nome.</>,
                <>Clique em <Btn>Salvar</Btn> para guardar as alterações.</>,
              ]} />

              <Warn>
                Ao excluir um projeto, <strong>todos os motores dentro dele são removidos</strong>.
                Essa operação não pode ser desfeita.
              </Warn>
            </Section>

            {/* ── Variáveis ── */}
            <Section id="variaveis" title="Variáveis">
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Variáveis são os <strong>dados de entrada</strong> do motor — as informações que mudam de cliente para
                cliente ou de apólice para apólice. Elas ficam no painel esquerdo do builder.
              </p>

              <TableComp
                headers={["Tipo", "Descrição", "Exemplos"]}
                rows={[
                  [
                    <Badge key="i" color="green">Entrada (input)</Badge>,
                    "Preenchida pelo usuário ao calcular. Aparece como campo editável na Calculadora.",
                    "Faturamento anual, classe de risco, segmento de atividade, anos sem sinistro",
                  ],
                  [
                    <Badge key="c" color="muted">Constante (constant)</Badge>,
                    "Valor fixo definido pelo atuário. Não aparece como campo na Calculadora — é usada internamente.",
                    "Alíquota IOF (7,38%), fator de ajuste fixo, taxa mínima regulatória",
                  ],
                  [
                    <Badge key="t" color="purple">Texto (text)</Badge>,
                    <>Valor textual — usado apenas em condições (<code>==</code> / <code>!=</code>). Não participa de cálculos aritméticos. Ative o toggle <strong>#→T</strong> na variável.</>,
                    <>Gênero: <code>&quot;M&quot;</code>, <code>&quot;F&quot;</code> · Segmento: <code>&quot;residencial&quot;</code>, <code>&quot;comercial&quot;</code> · Opção: <code>&quot;opcao_a&quot;</code></>,
                  ],
                ]}
              />

              <h3 className="text-sm font-semibold mt-1">Como adicionar uma variável</h3>
              <Steps items={[
                <>No painel esquerdo, clique em <strong>+ Adicionar</strong> e escolha <strong>Input</strong> (entrada) ou <strong>Constante</strong>.</>,
                <>Clique no nome gerado automaticamente e renomeie (ex: <em>faturamento</em>, <em>iof_pct</em>).</>,
                <>Defina o <strong>valor padrão</strong> — será usado nos testes e na Calculadora como sugestão.</>,
                <>Opcionalmente, defina a <strong>unidade</strong> que aparece ao lado do campo (ex: R$, %, anos).</>,
                <>Para variáveis <Badge color="purple">Texto</Badge>, clique no toggle <strong>#</strong> → <strong>T</strong> ao lado do nome. O campo de unidade some e o valor padrão passa a ser uma string (ex: <code>M</code>, <code>residencial</code>).</>,
              ]} />

              <Example title="Motor de RC Operações">
                <TableComp
                  headers={["Nome", "Tipo", "Valor padrão", "Unidade"]}
                  rows={[
                    [<Btn key="v1" token="varRef">faturamento</Btn>,       <Badge key="b1" color="green">Entrada</Badge>,   <Btn key="d1" token="number">75.000</Btn>,  "R$"],
                    [<Btn key="v2" token="varRef">classe</Btn>,            <Badge key="b2" color="green">Entrada</Badge>,   <Btn key="d2" token="number">2</Btn>,       "—"],
                    [<Btn key="v3" token="varRef">segmento</Btn>,          <Badge key="b3" color="green">Entrada</Badge>,   <Btn key="d3" token="number">1</Btn>,       "—"],
                    [<Btn key="v4" token="varRef">anos_sem_sinistro</Btn>, <Badge key="b4" color="green">Entrada</Badge>,   <Btn key="d4" token="number">3</Btn>,       "anos"],
                    [<Btn key="v5" token="varRef">iof_pct</Btn>,           <Badge key="b5" color="muted">Constante</Badge>, <Btn key="d5" token="number">7,38</Btn>,    "%"],
                    [<Btn key="v6" token="varRef">genero</Btn>,            <Badge key="b6" color="purple">Texto</Badge>,    <code key="d6">M</code>,                   "—"],
                  ]}
                />
              </Example>

              <Tip>
                Use nomes sem espaços e sem acentos nas variáveis (ex: <em>faturamento</em>, <em>anos_sem_sinistro</em>).
                Isso evita problemas ao referenciar a variável nas fórmulas.
              </Tip>
            </Section>

            {/* ── Tabelas ── */}
            <Section id="tabelas" title="Tabelas de Tarifas">
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Tabelas de tarifas funcionam como as tabelas atuariais que o time já conhece: dado um conjunto
                de condições, retornam um ou mais valores. A ferramenta avalia as linhas <strong>de cima para baixo</strong>
                e usa a <strong>primeira linha cuja condição for verdadeira</strong>.
              </p>

              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Colunas</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    Cada coluna representa um valor que pode ser retornado (ex: Prêmio Classe 1, Prêmio Classe 2, Coeficiente).
                    Uma etapa de cálculo pode buscar o valor de qualquer coluna da tabela.
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mt-2">
                    Por padrão, a coluna é <strong>fixa</strong> — o autor do motor escolhe qual coluna usar na fórmula.
                    Ativando o toggle <strong>&ldquo;Condicional&rdquo;</strong> no cabeçalho da coluna, ela passa a ter uma
                    condição de seleção: a ferramenta resolve qual coluna usar em tempo de cálculo, da mesma forma
                    que faz com as linhas. Isso permite <strong>lookup 2D</strong> — interseção de linha × coluna.
                  </p>
                  <TableComp
                    headers={["Modo da coluna", "Como configurar", "Como usar na fórmula"]}
                    rows={[
                      [
                        <span key="1d" className="font-medium">Fixa (1D)</span>,
                        <>Toggle <strong>Condicional</strong> desativado (padrão)</>,
                        "Seletor de coluna aparece ao inserir o token Tabela",
                      ],
                      [
                        <span key="2d" className="font-medium">Condicional (2D)</span>,
                        <>Toggle <strong>Condicional</strong> ativado + condição definida</>,
                        <>Ao inserir o token, escolha <strong>Runtime (2D)</strong> — linha e coluna são resolvidas automaticamente</>,
                      ],
                      [
                        <span key="else" className="font-medium">Padrão/else (2D)</span>,
                        <>Toggle <strong>Condicional</strong> ativado + checkbox <strong>Padrão (else)</strong></>,
                        "Captura todos os casos não cobertos pelas outras colunas condicionais",
                      ],
                    ]}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Linhas e condições</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                    Cada linha tem uma <strong>condição de seleção</strong> e os valores correspondentes por coluna.
                    A condição compara uma variável ou resultado de etapa com um número usando um operador.
                  </p>
                </div>

                <TableComp
                  headers={["Operador", "Leitura", "Quando usar"]}
                  rows={[
                    [<Btn key="eq"  token="op">==</Btn>,  "igual a",           "Faixa exata (ex: segmento == 1)"],
                    [<Btn key="neq" token="op">!=</Btn>,  "diferente de",      "Excluir um valor específico"],
                    [<Btn key="lt"  token="op">&lt;</Btn>, "menor que",        "Limite superior exclusivo"],
                    [<Btn key="lte" token="op">&lt;=</Btn>,"menor ou igual a", "Limite superior inclusivo (faixas de faturamento)"],
                    [<Btn key="gt"  token="op">&gt;</Btn>, "maior que",        "Limite inferior exclusivo"],
                    [<Btn key="gte" token="op">&gt;=</Btn>,"maior ou igual a", "Limite inferior inclusivo (anos sem sinistro ≥ 5)"],
                    ["—",  "sem condição (else)", "Linha padrão — captura todos os casos não cobertos acima"],
                  ]}
                />
              </div>

              <Example title="Tabela de Prêmio Bruto por Faturamento (RC Operações)">
                <TableComp
                  headers={["Linha", "Condição", "Classe 1", "Classe 2", "Classe 3"]}
                  rows={[
                    ["Faixa 1 (até 1M)",    <span key="c1" className="flex items-center gap-1"><Btn token="stepRef">Faixa de Faturamento</Btn> <Btn token="op">==</Btn> <Btn token="number">1</Btn></span>,   "23,09", "34,63", "103,89"],
                    ["Faixa 2 (1M a 2M)",   <span key="c2" className="flex items-center gap-1"><Btn token="stepRef">Faixa de Faturamento</Btn> <Btn token="op">==</Btn> <Btn token="number">2</Btn></span>,   "30,12", "45,16", "135,48"],
                    ["Faixa 3 (acima 2M)",  "sem condição (padrão)",        "35,50", "53,21", "159,63"],
                  ]}
                />
                <p className="text-xs text-[var(--color-muted)]">
                  A condição usa o resultado da etapa &ldquo;Faixa de Faturamento&rdquo; (que classifica o faturamento em 1, 2 ou 3).
                </p>
              </Example>

              <Example title="Tabela 2D — Prêmio por Faixa de Renda × Gênero">
                <TableComp
                  headers={["Linha", "Condição", <span key="h1" className="flex flex-col gap-0.5"><span>Masculino</span><span className="text-[10px] font-normal text-[var(--color-muted)]">cond: genero == 1</span></span>, <span key="h2" className="flex flex-col gap-0.5"><span>Feminino</span><span className="text-[10px] font-normal text-[var(--color-muted)]">padrão (else)</span></span>]}
                  rows={[
                    ["Faixa 1", <span key="c1" className="flex items-center gap-1"><Btn token="varRef">renda</Btn> <Btn token="op">&lt;</Btn> <Btn token="number">1.000</Btn></span>, "120", "110"],
                    ["Faixa 2", <span key="c2" className="flex items-center gap-1"><Btn token="varRef">renda</Btn> <Btn token="op">&lt;</Btn> <Btn token="number">5.000</Btn></span>, "200", "180"],
                    ["Padrão",  "sem condição (else)", "350", "310"],
                  ]}
                />
                <p className="text-xs text-[var(--color-muted)]">
                  Ao usar esta tabela com <strong>Runtime (2D)</strong>, a linha é resolvida pela renda e a coluna pelo gênero —
                  retornando a célula na interseção. Um único token <Btn token="tableRef">Tabela</Btn> substitui o que antes exigiria múltiplas colunas fixas ou condicionais (IF).
                </p>
              </Example>

              <h3 className="text-sm font-semibold mt-1">Como criar uma tabela</h3>
              <Steps items={[
                <>No painel esquerdo, clique em <Btn token="tableRef">+ Tabela</Btn>.</>,
                <>Renomeie a tabela clicando no título.</>,
                <>Adicione colunas com <Btn token="tableRef">+ Coluna</Btn> e defina o nome de cada uma.</>,
                <>Para tabelas 2D, ative o toggle <strong>&ldquo;Condicional&rdquo;</strong> no cabeçalho de cada coluna e configure a condição de seleção. A última coluna condicional deve ter <strong>&ldquo;Padrão (else)&rdquo;</strong> marcado.</>,
                <>Adicione linhas com <Btn token="tableRef">+ Linha</Btn>. Para cada linha, configure a condição e os valores por coluna.</>,
                <>A <strong>última linha</strong> deve ter condição <em>&ldquo;sem condição (padrão)&rdquo;</em> para capturar casos não previstos.</>,
              ]} />

              <Tip>
                Em tabelas 2D, ao escolher <strong>Coluna fixa</strong> você pode selecionar qualquer coluna —
                incluindo colunas condicionais. Isso permite criar lógicas customizadas: por exemplo, usar uma
                coluna condicional &ldquo;Masculino&rdquo; dentro de um IF para aplicar descontos VIP específicos,
                enquanto deixa a tabela resolver automaticamente em outros casos com <strong>Runtime (2D)</strong>.
              </Tip>

              <Warn>
                A ordem das linhas importa. Coloque as condições mais específicas no topo e o caso padrão
                (sem condição) sempre na última linha. A ferramenta avalia linha a linha e para na primeira que for verdadeira.
              </Warn>
            </Section>

            {/* ── Importação de Tabelas ── */}
            <Section id="importacao" title="Importando Dados em Tabelas">
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Além de criar tabelas manualmente (linha por linha), você pode <strong>importar dados</strong> diretamente
                de uma planilha — ideal para tabelas grandes ou quando os dados já existem em Excel ou Google Sheets.
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Basta copiar e colar os dados ou carregar um arquivo CSV/TSV. A ferramenta detecta as colunas,
                as linhas e os valores automaticamente, e exibe um preview antes de aplicar.
              </p>

              <h3 className="text-sm font-semibold mt-1">Quando usar importação vs edição manual</h3>
              <TableComp
                headers={["Cenário", "Recomendação"]}
                rows={[
                  [
                    "Tabela com poucas linhas (3–5) e valores simples",
                    "Edição manual — mais rápido e direto",
                  ],
                  [
                    "Tabela grande (10+ linhas) com muitas colunas",
                    "Importação — copie da planilha e cole de uma vez",
                  ],
                  [
                    "Dados já existem em planilha Excel / Google Sheets",
                    "Importação — evita redigitação e erros de transcrição",
                  ],
                  [
                    "Atualização periódica de tarifas com novos valores",
                    "Importação com substituição — atualiza tudo de uma vez",
                  ],
                ]}
              />

              <h3 className="text-sm font-semibold mt-1">Como importar dados</h3>
              <Steps items={[
                <>Clique no nome da tabela no painel esquerdo para abrir o <strong>modal de edição</strong>.</>,
                <>No modal, clique na aba <Btn>Importar</Btn> (ao lado de &ldquo;Editar&rdquo;).</>,
                <>Copie os dados da planilha (selecione as células no Excel/Sheets e pressione <Btn>Ctrl+C</Btn>) e cole na área de texto. Ou clique em <Btn>📂 Carregar arquivo</Btn> para selecionar um arquivo <code>.csv</code>, <code>.tsv</code> ou <code>.txt</code>.</>,
                <>Selecione o <strong>delimitador</strong> correto no seletor (Tab é o padrão quando se copia do Excel).</>,
                <>Configure como interpretar headers e labels (veja abaixo).</>,
                <>Confira o <strong>Preview</strong> — ele mostra exatamente como os dados serão importados, com contagem de linhas × colunas.</>,
                <>Escolha o modo: <strong>Substituir dados existentes</strong> (padrão) ou desmarcar para <strong>adicionar</strong> ao início ou final da tabela.</>,
                <>Clique em <Btn>Importar</Btn> para aplicar.</>,
              ]} />

              <h3 className="text-sm font-semibold mt-1">Formatos suportados</h3>
              <TableComp
                headers={["Delimitador", "Quando usar", "Como obter os dados"]}
                rows={[
                  [
                    <span key="tab" className="font-medium">Tab (padrão)</span>,
                    "Copiar direto do Excel ou Google Sheets",
                    <>Selecione as células → <Btn>Ctrl+C</Btn> → cole na aba Importar</>,
                  ],
                  [
                    <span key="comma" className="font-medium">Vírgula</span>,
                    "Arquivos .csv exportados",
                    "Exporte como CSV e carregue o arquivo, ou abra e copie o conteúdo",
                  ],
                  [
                    <span key="semi" className="font-medium">Ponto-e-vírgula</span>,
                    "Excel regional (pt-BR) ou exports com separador ;",
                    "Algumas configurações de Excel usam ; em vez de , como separador CSV",
                  ],
                ]}
              />

              <h3 className="text-sm font-semibold mt-1">Configuração de headers e labels</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                A aba de importação tem dois checkboxes que controlam como os dados são interpretados:
              </p>
              <div className="flex flex-col gap-3">
                <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] flex flex-col gap-1.5">
                  <span className="text-sm font-semibold">✓ 1ª linha = headers</span>
                  <p className="text-xs text-[var(--color-muted)]">
                    Quando ativado (padrão), a primeira linha dos dados colados vira o <strong>nome das colunas</strong> da tabela.
                    Desmarque se seus dados não têm uma linha de cabeçalho — nesse caso, as colunas receberão nomes genéricos
                    e você pode informar manualmente qual linha contém os nomes.
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] flex flex-col gap-1.5">
                  <span className="text-sm font-semibold">✓ 1ª coluna = labels</span>
                  <p className="text-xs text-[var(--color-muted)]">
                    Quando ativado (padrão), a primeira coluna dos dados colados vira o <strong>nome (label) de cada linha</strong>.
                    Desmarque se seus dados não têm uma coluna de rótulos — nesse caso, as linhas receberão labels genéricos
                    e você pode informar manualmente qual coluna contém os rótulos.
                  </p>
                </div>
              </div>

              <h3 className="text-sm font-semibold mt-1">Modo de importação</h3>
              <TableComp
                headers={["Modo", "Comportamento"]}
                rows={[
                  [
                    <span key="replace" className="font-medium">Substituir (padrão)</span>,
                    "Remove todas as linhas e colunas existentes na tabela e importa os novos dados do zero.",
                  ],
                  [
                    <span key="add-end" className="font-medium">Adicionar ao final</span>,
                    "Mantém os dados existentes e acrescenta as novas linhas no final da tabela.",
                  ],
                  [
                    <span key="add-start" className="font-medium">Adicionar ao início</span>,
                    "Mantém os dados existentes e insere as novas linhas no topo da tabela.",
                  ],
                ]}
              />

              <Example title="Importando uma tabela de coeficientes">
                <p className="text-xs text-[var(--color-muted)] mb-2">
                  Suponha que você tem a seguinte tabela em uma planilha:
                </p>
                <div className="bg-[var(--color-input)] border border-[var(--color-border)] rounded p-3 font-mono text-xs leading-relaxed">
                  <div className="text-[var(--color-muted)] mb-1">{/* Dados copiados do Excel (delimitados por Tab): */}</div>
                  <div>Categoria{"\t"}Fator A{"\t"}Fator B{"\t"}Fator C</div>
                  <div>Baixo risco{"\t"}1.00{"\t"}0.95{"\t"}0.90</div>
                  <div>Médio risco{"\t"}1.50{"\t"}1.40{"\t"}1.30</div>
                  <div>Alto risco{"\t"}2.20{"\t"}2.00{"\t"}1.85</div>
                </div>
                <p className="text-xs text-[var(--color-muted)] mt-2 mb-1">
                  Ao colar na aba Importar com delimitador <strong>Tab</strong>, checkboxes ativados e clicar Importar:
                </p>
                <TableComp
                  headers={["Label da linha", "Fator A", "Fator B", "Fator C"]}
                  rows={[
                    ["Baixo risco", "1.00", "0.95", "0.90"],
                    ["Médio risco", "1.50", "1.40", "1.30"],
                    ["Alto risco",  "2.20", "2.00", "1.85"],
                  ]}
                />
                <p className="text-xs text-[var(--color-muted)]">
                  A primeira linha (<em>Categoria / Fator A / Fator B / Fator C</em>) virou o nome das colunas.
                  A primeira coluna (<em>Baixo risco / Médio risco / Alto risco</em>) virou o label de cada linha.
                  As condições de cada linha precisam ser configuradas manualmente depois da importação.
                </p>
              </Example>

              <Tip>
                Use <strong>Tab</strong> como delimitador quando copiar dados do Excel ou Google Sheets —
                é o formato mais confiável, pois vírgulas e pontos-e-vírgulas podem aparecer dentro dos próprios valores numéricos
                dependendo da configuração regional.
              </Tip>

              <Warn>
                O modo <strong>Substituir</strong> apaga todas as linhas e colunas existentes na tabela antes
                de importar. Essa operação não pode ser desfeita — sempre confira o <strong>Preview</strong> antes de clicar em Importar.
                As <strong>condições das linhas</strong> (operador e valor de comparação) não são importadas — apenas os valores.
                Configure as condições manualmente após a importação.
              </Warn>
            </Section>

            {/* ── Tabelas Parametrizadas ── */}
            <Section id="tabelas-parametrizadas" title="Tabelas Parametrizadas">
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Tabelas parametrizadas funcionam como <strong>funções reutilizáveis</strong>: você define uma tabela uma única vez
                e pode usá-la em várias etapas com <strong>argumentos diferentes</strong>. Em vez de criar múltiplas tabelas similares
                com faixas ou limites ligeiramente diferentes, você cria uma tabela com parâmetros e passa os valores específicos ao usá-la.
              </p>

              <h3 className="text-sm font-semibold mt-1">Quando usar tabelas parametrizadas</h3>
              <TableComp
                headers={["Cenário", "Solução sem parâmetros", "Solução com parâmetros"]}
                rows={[
                  [
                    "Mesma tabela de coeficientes usada com diferentes limites de faturamento",
                    "Criar 3 tabelas: COEF_650K, COEF_400K, COEF_200K",
                    "1 tabela COEFICIENTES com parâmetro LIMITE, usar 3x com argumentos diferentes",
                  ],
                  [
                    "Tabela de desconto progressivo com threshold variável",
                    "Criar 1 tabela por threshold ou usar IF complexos",
                    "1 tabela DESCONTO_PROGRESSIVO com parâmetro BASE, passar valor dinâmico",
                  ],
                  [
                    "Tabela de impostos com base de cálculo que muda por produto",
                    "Duplicar a tabela para cada produto",
                    "1 tabela IMPOSTOS com parâmetro BASE_CALCULO, reutilizar",
                  ],
                ]}
              />

              <h3 className="text-sm font-semibold mt-1">Como criar parâmetros em uma tabela</h3>
              <Steps items={[
                <>Abra a tabela no modal de edição (clique no nome da tabela no painel esquerdo).</>,
                <>Na aba <Btn>Editar</Btn>, clique no botão <Btn>+ Adicionar Parâmetro</Btn>.</>,
                <>Digite o nome do parâmetro (ex: <code>LIMITE</code>, <code>BASE</code>, <code>THRESHOLD</code>) e pressione Enter.</>,
                <>Repita para adicionar mais parâmetros se necessário.</>,
                <>Os parâmetros agora aparecem como uma opção ao definir condições de linhas/colunas.</>,
              ]} />

              <h3 className="text-sm font-semibold mt-1">Como usar parâmetros nas condições</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Ao definir a condição de uma linha ou coluna, você pode escolher <strong>&ldquo;Parâmetro&rdquo;</strong> no dropdown
                e selecionar qual parâmetro usar. A condição será avaliada com o valor do argumento passado no momento do cálculo.
              </p>

              <Example title="Tabela COEFICIENTES com parâmetro LIMITE">
                <p className="text-xs text-[var(--color-muted)] mb-2">
                  Estrutura da tabela:
                </p>
                <TableComp
                  headers={["Linha", "Condição", "Coeficiente"]}
                  rows={[
                    ["Faixa 1", <span key="c1" className="flex items-center gap-1"><Badge color="purple">LIMITE</Badge> <Btn token="op">&lt;=</Btn> <Btn token="number">100.000</Btn></span>, "21.23"],
                    ["Faixa 2", <span key="c2" className="flex items-center gap-1"><Badge color="purple">LIMITE</Badge> <Btn token="op">&lt;=</Btn> <Btn token="number">500.000</Btn></span>, "12.81"],
                    ["Faixa 3", "sem condição (padrão)", "8.45"],
                  ]}
                />
                <p className="text-xs text-[var(--color-muted)] mt-2">
                  <Badge color="purple">LIMITE</Badge> é um parâmetro — seu valor vem do argumento passado ao usar a tabela.
                </p>
              </Example>

              <h3 className="text-sm font-semibold mt-1">Como referenciar tabelas parametrizadas nas fórmulas</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Ao adicionar o token <Btn token="tableRef">+ Tabela</Btn> em uma etapa, se a tabela tiver parâmetros,
                uma seção <strong>&ldquo;Argumentos&rdquo;</strong> aparecerá no editor. Para cada parâmetro, você deve
                escolher o valor: pode ser um número fixo, uma variável, ou o resultado de uma etapa anterior.
              </p>

              <Steps items={[
                <>Em uma etapa, clique em <Btn token="tableRef">+ Tabela</Btn>.</>,
                <>Selecione a tabela parametrizada no dropdown.</>,
                <>Escolha o modo de seleção (Coluna fixa, Runtime 2D, etc.) normalmente.</>,
                <>Na seção <strong>Argumentos</strong> que aparece, configure cada parâmetro:</>,
                <>  • Escolha o tipo: Número, Texto, Variável, ou Etapa</>,
                <>  • Defina o valor correspondente</>,
                <>Clique em <Btn>OK</Btn> para adicionar o token à fórmula.</>,
              ]} />

              <Example title="Usando a tabela COEFICIENTES com diferentes argumentos">
                <p className="text-xs text-[var(--color-muted)] mb-2">
                  Imagine dois steps usando a mesma tabela COEFICIENTES:
                </p>
                <TableComp
                  headers={["Etapa", "Argumento LIMITE", "Resultado esperado"]}
                  rows={[
                    [
                      <Btn key="s1" token="stepRef">COEFICIENTE by LIMITE</Btn>,
                      <span key="a1" className="flex items-center gap-1"><Btn token="varRef">limite</Btn> = 650.000</span>,
                      <Btn key="r1" token="number">21.23</Btn>,
                    ],
                    [
                      <Btn key="s2" token="stepRef">COEFICIENTE DE AGRAVAÇÃO</Btn>,
                      <span key="a2" className="flex items-center gap-1"><Btn token="stepRef">LIMITE x AGRAVO</Btn> = 130.000</span>,
                      <Btn key="r2" token="number">12.81</Btn>,
                    ],
                  ]}
                />
                <p className="text-xs text-[var(--color-muted)]">
                  A mesma tabela COEFICIENTES retorna valores diferentes porque os argumentos LIMITE são diferentes.
                  No primeiro caso, LIMITE=650.000 cai na Faixa 3 (padrão) → 8.45. No segundo, LIMITE=130.000 cai na Faixa 2 → 12.81.
                  (Nota: os valores do exemplo podem variar conforme a estrutura exata da tabela)
                </p>
              </Example>

              <h3 className="text-sm font-semibold mt-1">Casos de uso comuns</h3>
              <div className="flex flex-col gap-3">
                {[
                  {
                    title: "Coeficientes reutilizáveis com diferentes bases",
                    desc: "Uma tabela COEFICIENTES com parâmetro BASE pode ser usada para calcular coeficientes sobre faturamento, sobre importância segurada, ou sobre qualquer outra base — basta passar o valor correto como argumento.",
                  },
                  {
                    title: "Tabelas progressivas com threshold dinâmico",
                    desc: "Uma tabela de alíquotas progressivas com parâmetro RENDA_BASE permite aplicar a mesma lógica de progressão para diferentes tipos de renda (bruta, líquida, ajustada) passando o valor apropriado.",
                  },
                  {
                    title: "Descontos condicionados a múltiplos critérios",
                    desc: "Uma tabela DESCONTO com parâmetros ANOS_CLIENTE e SINISTROS permite calcular descontos personalizados combinando tempo de relacionamento e histórico de sinistros sem criar dezenas de tabelas.",
                  },
                ].map((useCase, i) => (
                  <div key={i} className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] flex flex-col gap-1.5">
                    <span className="text-sm font-semibold">{useCase.title}</span>
                    <p className="text-xs text-[var(--color-muted)]">{useCase.desc}</p>
                  </div>
                ))}
              </div>

              <Tip>
                Tabelas parametrizadas <strong>eliminam duplicação</strong> — em vez de criar 5 tabelas similares com faixas
                diferentes, crie 1 tabela com parâmetro e use 5 vezes com argumentos diferentes. Isso torna o motor mais
                fácil de manter: qualquer ajuste na lógica da tabela se aplica automaticamente a todos os usos.
              </Tip>

              <Warn>
                Ao referenciar uma tabela parametrizada, <strong>TODOS os parâmetros devem ser preenchidos</strong>.
                Se você esquecer de configurar um argumento, haverá erro no cálculo. O botão OK só fica habilitado
                quando todos os parâmetros obrigatórios estão preenchidos.
              </Warn>
            </Section>

            {/* ── Etapas ── */}
            <Section id="etapas" title="Etapas de Cálculo">
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                As etapas são os <strong>passos do cálculo</strong>, executados em sequência do primeiro ao último.
                Cada etapa produz um valor numérico que pode ser usado nas etapas seguintes.
              </p>

              <TableComp
                headers={["Tipo de etapa", "Descrição", "Quando usar"]}
                rows={[
                  [
                    <Badge key="o" color="accent">output</Badge>,
                    "Resultado final relevante. Aparece em destaque no painel de Resultados.",
                    "Prêmio Bruto, Prêmio Líquido, Prêmio Final com IOF — valores que o usuário precisa ver.",
                  ],
                  [
                    <Badge key="i" color="muted">internal</Badge>,
                    "Cálculo intermediário. Aparece na seção Internos (para conferência), mas não como resultado principal.",
                    "Faixa de Faturamento (1/2/3), Valor do Desconto, Coeficiente de Ajuste.",
                  ],
                ]}
              />

              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold">Controles de cada etapa</h3>
                <div className="flex flex-col gap-2">
                  {[
                    { badge: <Badge color="yellow">min/max</Badge>, desc: "Quando ativo (amarelo), aplica o valor mínimo e máximo definidos na configuração do motor ao resultado desta etapa. Use na etapa do prêmio final para garantir pisos e tetos." },
                    { badge: <><Badge color="accent">output</Badge> / <Badge color="muted">internal</Badge></>, desc: "Alterna entre etapa de resultado (visível na calculadora) e etapa interna (auxiliar). Clique para alternar." },
                    { badge: <><Badge color="green">ON</Badge> / <Badge color="red">OFF</Badge></>, desc: "Habilita ou desabilita a etapa. Uma etapa desativada é ignorada no cálculo — útil para testar variações sem excluir a lógica." },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-[var(--color-border)]">
                      <div className="shrink-0 flex items-center gap-1 mt-0.5">{item.badge}</div>
                      <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Example title="Sequência de etapas — RC Operações">
                <TableComp
                  headers={["Etapa", "Tipo", "O que calcula"]}
                  rows={[
                    [<Btn key="s1" token="stepRef">Faixa de Faturamento</Btn>,    <Badge key="b1" color="muted">internal</Badge>, "Classifica o faturamento em 1 (< 1M), 2 (1M–2M) ou 3 (> 2M)"],
                    [<Btn key="s2" token="stepRef">Segmento Normalizado</Btn>,    <Badge key="b2" color="muted">internal</Badge>, "Garante que segmento nunca seja 0 (fallback para 1)"],
                    [<Btn key="s3" token="stepRef">Prêmio Bruto por Classe</Btn>, <Badge key="b3" color="muted">internal</Badge>, <span key="d3" className="flex items-center gap-1 flex-wrap"><Btn token="tableRef">tabela t1</Btn> conforme a classe</span>],
                    [<Btn key="s4" token="stepRef">Coeficiente de Ajuste</Btn>,   <Badge key="b4" color="muted">internal</Badge>, <span key="d4" className="flex items-center gap-1 flex-wrap"><Btn token="tableRef">tabela t2</Btn> por segmento</span>],
                    [<Btn key="s5" token="stepRef">Prêmio Bruto</Btn>,            <Badge key="b5" color="accent">output</Badge>,  <span key="d5" className="flex items-center gap-1 flex-wrap"><Btn token="stepRef">Prêmio Bruto por Classe</Btn> <Btn token="op">×</Btn> <Btn token="stepRef">Coeficiente de Ajuste</Btn></span>],
                    [<Btn key="s6" token="stepRef">Percentual de Desconto</Btn>,  <Badge key="b6" color="muted">internal</Badge>, <span key="d6" className="flex items-center gap-1 flex-wrap"><Btn token="tableRef">tabela t3</Btn> por sinistralidade</span>],
                    [<Btn key="s7" token="stepRef">Valor do Desconto</Btn>,       <Badge key="b7" color="muted">internal</Badge>, <span key="d7" className="flex items-center gap-1 flex-wrap"><Btn token="stepRef">Prêmio Bruto</Btn> <Btn token="op">×</Btn> <Btn token="stepRef">% Desconto</Btn> <Btn token="op">÷</Btn> <Btn token="number">100</Btn></span>],
                    [<Btn key="s8" token="stepRef">Prêmio Líquido</Btn>,          <Badge key="b8" color="accent">output</Badge>,  <span key="d8" className="flex items-center gap-1 flex-wrap"><Btn token="stepRef">Prêmio Bruto</Btn> <Btn token="op">−</Btn> <Btn token="stepRef">Valor do Desconto</Btn></span>],
                    [<span key="s9" className="flex items-center gap-1"><Btn token="stepRef">Prêmio Final com IOF</Btn> <span className="text-[var(--color-yellow)]">✦</span></span>, <Badge key="b9" color="accent">output</Badge>, <span key="d9" className="flex items-center gap-1 flex-wrap"><Btn token="stepRef">Prêmio Líquido</Btn> <Btn token="op">×</Btn> <Btn token="paren">(</Btn><Btn token="number">100</Btn> <Btn token="op">+</Btn> <Btn token="varRef">IOF%</Btn><Btn token="paren">)</Btn> <Btn token="op">÷</Btn> <Btn token="number">100</Btn></span>],
                  ]}
                />
                <p className="text-xs text-[var(--color-muted)]">✦ Esta etapa tem o botão <strong>min/max</strong> ativado, aplicando o piso mínimo de prêmio.</p>
              </Example>
            </Section>

            {/* ── Expressões ── */}
            <Section id="expressoes" title="Construindo Fórmulas">
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Cada etapa possui uma <strong>fórmula</strong> construída clicando nos botões disponíveis no card.
                A fórmula é montada como uma sequência de peças — você adiciona cada elemento em ordem.
              </p>

              <TableComp
                headers={["Botão", "O que insere", "Exemplo de uso"]}
                rows={[
                  [<Btn key="n" token="number">+ Número</Btn>,      "Um valor numérico fixo.",                         "Dividir por 100, multiplicar por fator fixo"],
                  [<Btn key="v" token="varRef">+ Variável</Btn>,    "O valor de uma variável (entrada ou constante).", "Usar o faturamento, a alíquota IOF"],
                  [<Btn key="e" token="stepRef">+ Etapa</Btn>,      "O resultado calculado de uma etapa anterior.",    "Multiplicar Prêmio Bruto pelo Coeficiente"],
                  [<Btn key="t" token="tableRef">+ Tabela</Btn>,    <>Busca um valor em uma tabela. Em tabelas com colunas condicionais, o modo <strong>Runtime (2D)</strong> resolve linha e coluna automaticamente.</>,  "Buscar prêmio por faixa (1D) ou por faixa × segmento (2D)"],
                  [<Btn key="i" token="conditional">+ IF</Btn>,     "Uma regra condicional (SE / SENÃO).",             "Classificar faturamento em faixas"],
                  [<Btn key="op" token="op">+ − × ÷ %</Btn>,       "Operadores aritméticos.",                         "Somar, subtrair, multiplicar, dividir"],
                  [<Btn key="p" token="paren">( )</Btn>,            "Parênteses para agrupar operações.",              "Calcular (100 + IOF%) antes de multiplicar"],
                ]}
              />

              <Example title="Fórmula — Prêmio Final com IOF">
                <p className="flex items-center gap-1 flex-wrap">
                  <Btn token="stepRef">Prêmio Líquido</Btn>
                  <Btn token="op">×</Btn>
                  <Btn token="paren">(</Btn>
                  <Btn token="number">100</Btn>
                  <Btn token="op">+</Btn>
                  <Btn token="varRef">iof_pct</Btn>
                  <Btn token="paren">)</Btn>
                  <Btn token="op">÷</Btn>
                  <Btn token="number">100</Btn>
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  Os parênteses garantem que o IOF seja somado a 100 antes de multiplicar pelo prêmio.
                  Sem eles, a ordem de operações daria um resultado diferente.
                </p>
              </Example>

              <Example title="Fórmula — Valor do Desconto">
                <p className="flex items-center gap-1 flex-wrap">
                  <Btn token="stepRef">Prêmio Bruto</Btn>
                  <Btn token="op">×</Btn>
                  <Btn token="stepRef">Percentual de Desconto</Btn>
                  <Btn token="op">÷</Btn>
                  <Btn token="number">100</Btn>
                </p>
              </Example>

              <Tip>
                Após montar a fórmula, o campo de preview da etapa mostra a fórmula em linguagem legível. Ex:{" "}
                <Btn token="conditional">IF</Btn>{" "}
                <Btn token="varRef">faturamento</Btn>{" "}
                <Btn token="op">&lt;</Btn>{" "}
                <Btn token="number">1000000</Btn>{" "}
                → <Btn token="number">1</Btn>.{" "}
                Use para confirmar que a lógica está correta antes de testar.
              </Tip>
            </Section>

            {/* ── Condicionais ── */}
            <Section id="condicionais" title="Regras Condicionais (IF)">
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                O botão <Btn token="conditional">+ IF</Btn> insere uma <strong>regra condicional</strong> dentro de uma etapa.
                Funciona como um <em>SE / SENÃO SE / SENÃO</em>: a regra avalia cada condição em sequência
                e retorna o valor do primeiro branch verdadeiro. Se nenhum for verdadeiro, retorna o valor do <em>Senão</em>.
              </p>

              <Example title="Classificação de Faixa de Faturamento">
                <TableComp
                  headers={["Condição", "Resultado"]}
                  rows={[
                    [<span key="c1" className="flex items-center gap-1 flex-wrap"><Btn token="conditional">SE</Btn> <Btn token="varRef">faturamento</Btn> <Btn token="op">&lt;</Btn> <Btn token="number">1.000.000</Btn></span>,  <span key="r1" className="flex items-center gap-1">→ retorna <Btn token="number">1</Btn> (Faixa 1)</span>],
                    [<span key="c2" className="flex items-center gap-1 flex-wrap"><Btn token="conditional">SENÃO SE</Btn> <Btn token="varRef">faturamento</Btn> <Btn token="op">&lt;=</Btn> <Btn token="number">2.000.000</Btn></span>, <span key="r2" className="flex items-center gap-1">→ retorna <Btn token="number">2</Btn> (Faixa 2)</span>],
                    [<span key="c3"><Btn token="conditional">SENÃO</Btn></span>, <span key="r3" className="flex items-center gap-1">→ retorna <Btn token="number">3</Btn> (Faixa 3)</span>],
                  ]}
                />
                <p className="text-xs text-[var(--color-muted)]">
                  Este resultado (1, 2 ou 3) é usado como condição na tabela de Prêmio Bruto por Faturamento.
                </p>
              </Example>

              <Example title="Normalização de Segmento">
                <TableComp
                  headers={["Condição", "Resultado"]}
                  rows={[
                    [<span key="c1" className="flex items-center gap-1"><Btn token="conditional">SE</Btn> <Btn token="varRef">segmento</Btn> <Btn token="op">!=</Btn> <Btn token="number">0</Btn></span>, <span key="r1" className="flex items-center gap-1">→ usa o valor de <Btn token="varRef">segmento</Btn></span>],
                    [<span key="c2"><Btn token="conditional">SENÃO</Btn></span>, <span key="r2" className="flex items-center gap-1">→ retorna <Btn token="number">1</Btn> (valor padrão)</span>],
                  ]}
                />
                <p className="text-xs text-[var(--color-muted)]">
                  Garante que um segmento não preenchido (0) seja tratado como segmento 1 em vez de gerar erro.
                </p>
              </Example>

              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Como montar um IF no builder</h3>
                <Steps items={[
                  <>Clique em <Btn token="conditional">+ IF</Btn> no card da etapa. Um bloco condicional será adicionado à fórmula.</>,
                  <>No primeiro branch, defina a <strong>condição</strong>: lado esquerdo (<Btn token="varRef">variável</Btn> ou <Btn token="stepRef">etapa</Btn>), operador, e lado direito (<Btn token="number">número</Btn>).</>,
                  <>Defina o <strong>valor retornado</strong> quando a condição for verdadeira (<Btn token="number">número</Btn>, <Btn token="varRef">variável</Btn>, <Btn token="stepRef">etapa</Btn> ou <Btn token="tableRef">tabela</Btn>).</>,
                  <>Clique em <Btn token="conditional">+ Branch</Btn> para adicionar mais condições (SENÃO SE).</>,
                  <>Defina o <strong>valor do Senão</strong> — obrigatório, é o que retorna quando nenhuma condição for satisfeita.</>,
                ]} />
              </div>

              <Tip>
                Assim como nas tabelas, a ordem dos branches importa. O primeiro branch verdadeiro vence.
                Coloque as condições mais restritivas primeiro.
              </Tip>
            </Section>

            {/* ── Configuração ── */}
            <Section id="configuracao" title="Configurações do Motor">
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Cada motor tem configurações que controlam como os números são calculados e apresentados.
                Acesse pelo botão <Btn>Config</Btn> na barra superior do builder.
              </p>

              <TableComp
                headers={["Configuração", "O que controla", "Valor típico"]}
                rows={[
                  [
                    "Casas decimais (precision)",
                    "Quantas casas decimais são exibidas nos resultados.",
                    "2 — para valores monetários (R$ 79,65)",
                  ],
                  [
                    "Arredondamento (rounding)",
                    "Como o número é arredondado na última casa decimal.",
                    "ROUND_HALF_UP — padrão comercial (0,5 arredonda para cima)",
                  ],
                  [
                    "Prêmio mínimo (min)",
                    "Piso de prêmio. Qualquer resultado abaixo deste valor é substituído por ele.",
                    "R$ 5.000,00 — somente nas etapas com min/max ativado",
                  ],
                  [
                    "Prêmio máximo (max)",
                    "Teto de prêmio. Qualquer resultado acima é substituído por este valor.",
                    "Deixar em branco se não houver teto",
                  ],
                ]}
              />

              <Warn>
                O prêmio mínimo e máximo só é aplicado nas etapas onde o botão <Badge color="yellow">min/max</Badge> está
                ativo (amarelo). Etapas intermediárias como &ldquo;Prêmio Bruto&rdquo; ou &ldquo;Prêmio Líquido&rdquo; não devem ter
                min/max ativo — caso contrário, os cálculos subsequentes serão afetados pelo valor clampeado.
                Ative apenas na etapa do <strong>prêmio final</strong>.
              </Warn>
            </Section>

            {/* ── Testando ── */}
            <Section id="testando" title="Testando o Motor">
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Existem dois ambientes de teste: o <strong>Painel de Teste</strong> dentro do builder
                (para o time técnico validar durante a construção) e a <strong>Calculadora</strong>
                (interface limpa para uso operacional e demonstrações).
              </p>

              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Painel de Teste — dentro do builder</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                    O painel fica à direita da tela do builder.
                  </p>
                  <Steps items={[
                    "Preencha os valores das variáveis de entrada no painel direito.",
                    <>Clique em <Btn>Calcular</Btn> ou pressione Enter em qualquer campo.</>,
                    <>Veja os <strong>Resultados</strong> (etapas output) e os <strong>Internos</strong> (etapas auxiliares).</>,
                    "O resultado de cada etapa também aparece no canto direito do card da etapa (= valor).",
                    "Use os Internos para conferir se cada etapa intermediária está retornando o valor esperado.",
                  ]} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Calculadora — interface simplificada</h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                    Acesse pelo menu <Btn>☰</Btn> → <Btn>Calculadora</Btn>.
                  </p>
                  <Steps items={[
                    "Preencha apenas os campos de entrada (variáveis input).",
                    <>Clique em <Btn>Calcular</Btn> ou pressione Enter.</>,
                    "Os resultados das etapas output são exibidos em destaque.",
                    "Ideal para apresentações ao cliente ou uso pelo time operacional.",
                  ]} />
                </div>
              </div>

              <Example title="Conferindo o cálculo de RC Operações (valores padrão)">
                <TableComp
                  headers={["Etapa", "Valor esperado", "Como conferir"]}
                  rows={[
                    [<Btn key="t1" token="stepRef">Faixa de Faturamento</Btn>,    <Btn key="v1" token="number">1</Btn>,         <span key="d1" className="flex items-center gap-1 flex-wrap"><Btn token="varRef">faturamento</Btn> <Btn token="number">75.000</Btn> <Btn token="op">&lt;</Btn> <Btn token="number">1.000.000</Btn> → Faixa 1</span>],
                    [<Btn key="t2" token="stepRef">Segmento Normalizado</Btn>,    <Btn key="v2" token="number">1</Btn>,         <span key="d2" className="flex items-center gap-1"><Btn token="varRef">segmento</Btn> <Btn token="number">1</Btn> <Btn token="op">!=</Btn> <Btn token="number">0</Btn> → retorna 1</span>],
                    [<Btn key="t3" token="stepRef">Prêmio Bruto por Classe</Btn>, <Btn key="v3" token="number">34,63</Btn>,     <span key="d3" className="flex items-center gap-1"><Btn token="tableRef">tabela t1</Btn>, Faixa 1, Classe 2</span>],
                    [<Btn key="t4" token="stepRef">Coeficiente de Ajuste</Btn>,   <Btn key="v4" token="number">2,30</Btn>,      <span key="d4" className="flex items-center gap-1"><Btn token="tableRef">tabela t2</Btn>, Segmento 1 (Operações)</span>],
                    [<Btn key="t5" token="stepRef">Prêmio Bruto</Btn>,            <Btn key="v5" token="number">79,65</Btn>,     <span key="d5" className="flex items-center gap-1"><Btn token="number">34,63</Btn> <Btn token="op">×</Btn> <Btn token="number">2,30</Btn></span>],
                    [<Btn key="t6" token="stepRef">Percentual de Desconto</Btn>,  <Btn key="v6" token="number">23</Btn>,        <span key="d6" className="flex items-center gap-1"><Btn token="tableRef">tabela t3</Btn>, <Btn token="varRef">anos_sem_sinistro</Btn> = 3 → 23%</span>],
                    [<Btn key="t7" token="stepRef">Valor do Desconto</Btn>,       <Btn key="v7" token="number">18,32</Btn>,     <span key="d7" className="flex items-center gap-1"><Btn token="number">79,65</Btn> <Btn token="op">×</Btn> <Btn token="number">23</Btn> <Btn token="op">÷</Btn> <Btn token="number">100</Btn></span>],
                    [<Btn key="t8" token="stepRef">Prêmio Líquido</Btn>,          <Btn key="v8" token="number">61,33</Btn>,     <span key="d8" className="flex items-center gap-1"><Btn token="number">79,65</Btn> <Btn token="op">−</Btn> <Btn token="number">18,32</Btn></span>],
                    [<Btn key="t9" token="stepRef">Prêmio Final com IOF</Btn>,    <Btn key="v9" token="number">5.000,00</Btn>,  "61,33 × 1,0738 = 65,86 → piso 5.000 ativo"],
                  ]}
                />
              </Example>

              <Tip>
                Se um resultado vier como <strong>erro</strong> (em vermelho), verifique: a condição da tabela
                cobrindo aquele valor existe? A etapa referenciada está habilitada (ON)? Os parênteses da fórmula
                estão balanceados?
              </Tip>
            </Section>

            {/* ── Fluxo ── */}
            <Section id="fluxo" title="Fluxo Completo de Trabalho">
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                Resumo do processo recomendado para criar um novo motor do zero:
              </p>

              <ol className="flex flex-col gap-4">
                {[
                  { n: "1", t: "Crie o projeto e o motor", d: "Menu ☰ → Projetos → Novo Projeto. Menu ☰ → Motores → Novo Motor. Renomeie o motor." },
                  { n: "2", t: "Defina as variáveis", d: "Adicione todas as entradas (faturamento, classe, segmento...) e constantes (IOF, taxas fixas). Defina valores padrão representativos para facilitar os testes." },
                  { n: "3", t: "Monte as tabelas de tarifas", d: "Crie uma tabela para cada grupo de tarifas. Para tabelas simples (1D), defina colunas fixas e linhas com condição. Para tabelas 2D (ex: prêmio por faixa × segmento), ative o toggle 'Condicional' nas colunas e marque a última como 'Padrão (else)'. Sempre termine as linhas com uma linha sem condição (padrão)." },
                  { n: "4", t: "Crie as etapas de classificação", d: "Primeiro crie as etapas que classificam entradas em faixas/categorias usando IF. Ex: 'Faixa de Faturamento' transforma o valor numérico em 1, 2 ou 3." },
                  { n: "5", t: "Crie as etapas de busca em tabela", d: "Use o botão + Tabela para buscar os valores das tarifas conforme a classificação calculada nas etapas anteriores." },
                  { n: "6", t: "Monte as fórmulas de cálculo", d: "Combine os resultados das etapas anteriores com operadores aritméticos e parênteses para chegar ao prêmio bruto, desconto, prêmio líquido e prêmio final." },
                  { n: "7", t: "Configure min/max e precision", d: "No botão Config, defina as casas decimais, o arredondamento e o prêmio mínimo/máximo. Ative o botão min/max apenas na etapa do prêmio final." },
                  { n: "8", t: "Teste com casos conhecidos", d: "Use o Painel de Teste com valores para os quais você já conhece o resultado esperado. Confira cada etapa interna para garantir que a lógica está correta." },
                  { n: "9", t: "Salve e compartilhe", d: "Clique em Salvar. O motor fica disponível no projeto para toda a equipe." },
                ].map((item) => (
                  <li key={item.n} className="flex gap-4 p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)]">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-[var(--color-accent)] text-white text-xs font-bold flex items-center justify-center">
                      {item.n}
                    </span>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold">{item.t}</span>
                      <p className="text-xs text-[var(--color-muted)] leading-relaxed">{item.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Section>

          </div>
        </main>
      </div>
    </div>
  )
}
