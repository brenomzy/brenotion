/*
 * PROTOTYPE DESCARTÁVEL
 * Três candidatos por superfície, alternáveis por ?screen=ID&variant=A|B|C.
 * Não promover diretamente para produção.
 */

const navLabels = ["Início", "Plano", "Revisar", "Mais"];

function mobileShell(content, active = "Início") {
  return `
    <div class="device mobile">
      <div class="mobile-screen">
        <div class="status-bar"><span>09:41</span><span>● ● ●</span></div>
        <div class="mobile-content">${content}</div>
        <div class="mobile-nav">
          ${navLabels.map((label) => `<div class="nav-item ${label === active ? "active" : ""}">${label}</div>`).join("")}
        </div>
      </div>
    </div>`;
}

function desktopShell(active, title, subtitle, action, content) {
  return `
    <div class="device desktop">
      <div class="desktop-chrome">
        <span class="chrome-dot"></span><span class="chrome-dot"></span><span class="chrome-dot"></span>
        <span style="margin-inline:auto">brenotion.local/prototype</span>
      </div>
      <div class="desktop-body">
        <aside class="desktop-sidebar">
          <strong>Brenotion</strong>
          <span class="${active === "import" ? "active" : ""}">Importar dados</span>
          <span class="${active === "vault" ? "active" : ""}">Cofre Fiscal</span>
          <span>Sair</span>
        </aside>
        <main class="desktop-content">
          <header class="desktop-header">
            <div><h2>${title}</h2><p>${subtitle}</p></div>
            ${action || ""}
          </header>
          ${content}
        </main>
      </div>
    </div>`;
}

const row = (title, meta, value, badge = "") => `
  <div class="row">
    <div class="row-main"><div class="row-title">${title}</div><div class="row-meta">${meta}</div></div>
    <div>${badge}<div class="row-value">${value}</div></div>
  </div>`;

const checkRow = (checked, title, meta, value) => `
  <div class="check-row">
    <span class="checkbox ${checked ? "checked" : ""}">${checked ? "✓" : ""}</span>
    <div><div class="row-title">${title}</div><div class="row-meta">${meta}</div></div>
    <span class="row-value">${value}</span>
  </div>`;

const screens = {
  A02: {
    group: "Android diário",
    name: "Início",
    platform: "mobile",
    purpose: "Entender o Disponível para Gastar, a confiança do retrato e a próxima ação sem transformar saldo em protagonista.",
    refs: [
      ["Ubank · ritmo do ciclo", "https://mobbin.com/screens/9bbc33b2-7e59-49b5-8c8b-fb3da8f1918b"],
      ["YNAB · dinheiro por destinar", "https://mobbin.com/screens/15747c12-b670-42aa-81b9-d9b4d1998c5a"],
      ["Quicken · resumo em cards", "https://mobbin.com/screens/c64ce941-0c91-4a50-9c99-3f43992c05df"],
    ],
    variants: [
      {
        key: "A",
        name: "Decisão empilhada",
        note: "Uma hierarquia editorial: valor principal, próxima ação e resumos do ciclo. É a opção mais próxima do board atual.",
        components: ["AvailableToSpendCard", "DataConfidence", "ProtectedMoneySummary"],
        render: () => mobileShell(`
          <div class="screen-topline"><div><span class="screen-kicker">terça, 14 de julho</span><h2>Bom dia</h2></div><button class="icon-button">＋</button></div>
          <div class="ui-card" style="padding:10px 12px;background:var(--success-soft);border-color:#bedfc6"><span class="badge success">Atualizado há 8 min</span> <span class="row-meta">confiança alta</span></div>
          <div class="ui-card accent-card" style="margin-top:10px">
            <div class="metric-label" style="color:var(--accent-950)">Disponível para Gastar</div>
            <div class="metric-value large">R$ 4.860</div>
            <div class="supporting" style="color:var(--accent-950)">até o próximo recebimento, em 18 dias</div>
          </div>
          <div class="section-title">Próxima ação</div>
          <div class="ui-card">${row("Organizar recebimento", "R$ 24.800 recebidos ontem", "→", '<span class="badge accent">Plano</span>')}</div>
          <div class="section-title">Seu ciclo</div>
          <div class="grid-2">
            <div class="ui-card"><div class="metric-label">Obrigações</div><div class="metric-value" style="font-size:22px">3 próximas</div><div class="supporting">1 requer atenção</div></div>
            <div class="ui-card" style="background:var(--protected)"><div class="metric-label">Protegido</div><div class="metric-value" style="font-size:22px">R$ 18.420</div><div class="supporting">impostos + reservas</div></div>
          </div>`, "Início"),
      },
      {
        key: "B",
        name: "Mapa do ciclo",
        note: "O ciclo financeiro vira o modelo mental principal. O valor disponível aparece como consequência de uma composição visível.",
        components: ["CycleMap", "AvailableToSpend", "ObligationTimeline"],
        render: () => mobileShell(`
          <div class="screen-topline"><div><span class="screen-kicker">ciclo atual · 14 jul–2 ago</span><h2>18 dias pela frente</h2></div><span class="badge success">recente</span></div>
          <div style="padding:10px 0 18px"><div class="metric-label">Disponível para Gastar</div><div class="metric-value large">R$ 4.860</div><div class="supporting">Dados de hoje, 09:33 · Itaú PF completo</div></div>
          <div class="ui-card">
            <div class="split-bar"><span style="width:18%"></span><span style="width:14%"></span><span style="width:23%"></span><span style="width:45%"></span></div>
            <div class="grid-2" style="margin-top:12px">
              <div><div class="metric-label">Comprometido</div><div class="row-value">R$ 1.260</div></div>
              <div><div class="metric-label">Protegido</div><div class="row-value">R$ 18.420</div></div>
            </div>
          </div>
          <div class="section-title">Linha do ciclo</div>
          <div class="timeline">
            <div class="timeline-item"><span class="timeline-dot active">14</span><div class="timeline-copy"><strong>Recebimento identificado</strong><span>Plano Financeiro aguardando revisão</span></div><span class="badge accent">agora</span></div>
            <div class="timeline-item"><span class="timeline-dot">16</span><div class="timeline-copy"><strong>Energia</strong><span>Pagamento ainda não identificado</span></div><span class="row-value">R$ 198</span></div>
            <div class="timeline-item"><span class="timeline-dot">22</span><div class="timeline-copy"><strong>Fatura do cartão</strong><span>Fecha em 8 dias</span></div><span class="row-value">R$ 2.430</span></div>
            <div class="timeline-item"><span class="timeline-dot">02</span><div class="timeline-copy"><strong>Próximo recebimento</strong><span>Data projetada</span></div><span class="badge">estimado</span></div>
          </div>`, "Início"),
      },
      {
        key: "C",
        name: "Painel compacto",
        note: "Menos superfícies e mais linhas densas. Favorece leitura repetida e aproxima a tela de um utilitário financeiro adulto.",
        components: ["DataConfidence", "FinancialSnapshot", "NextActionBar"],
        render: () => mobileShell(`
          <div class="screen-topline"><div><span class="screen-kicker">hoje · dados sintéticos</span><h2>Retrato financeiro</h2></div><button class="icon-button">↻</button></div>
          <div class="ui-card soft-accent"><span class="row-title">R$ 4.860 disponíveis</span><div class="row-meta">até 2 de agosto · confiança alta</div></div>
          <div class="section-title">Agora</div>
          <div class="ui-card">
            ${row("Disponível para Gastar", "Pessoal · após compromissos", "R$ 4.860")}
            ${row("Dinheiro protegido", "Empresa + Pessoal", "R$ 18.420")}
            ${row("Última fatura fechada", "Vence em 8 dias", "R$ 2.430")}
            ${row("Obrigações", "3 próximas · 1 em atenção", "R$ 1.190")}
          </div>
          <div class="section-title">Próxima decisão</div>
          <div class="ui-card">
            <div class="badge company">Empresa</div>
            <div style="margin-top:10px" class="row-title">Organizar Recebimento Empresarial</div>
            <div class="supporting">Separar impostos, pró-labore, reservas e Distribuição Projetada.</div>
            <button class="action-button" style="margin-top:14px">Abrir Plano Financeiro</button>
          </div>`, "Início"),
      },
    ],
  },

  A04: {
    group: "Android diário",
    name: "Organização do recebimento",
    platform: "mobile",
    purpose: "Revisar a separação determinística do Recebimento Empresarial e entender as ações manuais sem sugerir que o app movimentará dinheiro.",
    refs: [
      ["Cash App · distribuição", "https://mobbin.com/screens/a4e663ba-02c5-4f2a-9f88-8176b7659374"],
      ["Kit · Split PayDay", "https://mobbin.com/screens/45fdd48c-05ff-4e44-869f-b61e131e133c"],
      ["Chime · Split your pay", "https://mobbin.com/screens/fc6d46f4-d306-4725-99e7-5b73782e0226"],
    ],
    variants: [
      {
        key: "A",
        name: "Recibo de alocação",
        note: "A proposta é lida como um recibo auditável, com total no topo e categorias em uma lista escaneável.",
        components: ["PlanAllocation", "MoneyScopeBadge", "ManualMoneyAction"],
        render: () => mobileShell(`
          <div class="screen-topline"><div><span class="screen-kicker">Plano Financeiro</span><h2>Organizar recebimento</h2></div><span class="badge success">confirmado</span></div>
          <div class="ui-card accent-card"><span class="badge company">Empresa</span><div class="metric-value large">R$ 24.800</div><div class="supporting" style="color:var(--accent-950)">Recebimento Empresarial · 13 jul</div></div>
          <div class="section-title">Separação proposta</div>
          <div class="ui-card">
            ${row("Impostos e obrigações", "Provisão de Obrigações", "R$ 3.968")}
            ${row("Pró-labore e INSS", "competência jul/2026", "R$ 1.684")}
            ${row("Reserva Operacional", "meta: primeiro mês", "R$ 2.200")}
            ${row("Distribuição Projetada", "Empresa → Pessoal", "R$ 16.948")}
          </div>
          <button class="action-button" style="margin-top:12px">Ver 4 ações manuais</button>
          <div class="supporting" style="text-align:center">O Brenotion não movimenta dinheiro.</div>`, "Plano"),
      },
      {
        key: "B",
        name: "Cascata determinística",
        note: "A ordem das regras vira a interface. Cada passo mostra o saldo remanescente e torna a fórmula fácil de explicar.",
        components: ["AllocationWaterfall", "RuleEvidence", "PlanResult"],
        render: () => mobileShell(`
          <span class="screen-kicker">Recebimento Empresarial · R$ 24.800</span><h2>Como o valor foi separado</h2>
          <div class="timeline" style="margin-top:18px">
            <div class="timeline-item"><span class="timeline-dot active">1</span><div class="timeline-copy"><strong>Provisionar obrigações</strong><span>Impostos e custos conhecidos</span></div><span class="row-value">− R$ 3.968</span></div>
            <div class="timeline-item"><span class="timeline-dot active">2</span><div class="timeline-copy"><strong>Pró-labore e INSS</strong><span>Regra vigente em jul/2026</span></div><span class="row-value">− R$ 1.684</span></div>
            <div class="timeline-item"><span class="timeline-dot active">3</span><div class="timeline-copy"><strong>Proteger operação</strong><span>Primeiro marco da reserva</span></div><span class="row-value">− R$ 2.200</span></div>
            <div class="timeline-item"><span class="timeline-dot active">4</span><div class="timeline-copy"><strong>Projetar retirada</strong><span>Confirmação contábil posterior</span></div><span class="row-value">R$ 16.948</span></div>
          </div>
          <div class="ui-card soft-accent"><div class="metric-label">Distribuição Projetada</div><div class="metric-value">R$ 16.948</div><div class="supporting">Resultado depois das três proteções anteriores.</div></div>
          <div class="grid-2" style="margin-top:10px"><button class="secondary-button">Ver cálculo</button><button class="action-button">Continuar</button></div>`, "Plano"),
      },
      {
        key: "C",
        name: "Lista de execução",
        note: "Começa pelo que o Titular precisa fazer. A composição aparece como contexto secundário de cada ação manual.",
        components: ["ManualMoneyAction", "CloseConfirmation", "PlanSummary"],
        render: () => mobileShell(`
          <div class="screen-topline"><div><span class="screen-kicker">4 ações manuais</span><h2>Executar o plano</h2></div><span class="badge accent">0 de 4</span></div>
          <div class="ui-card soft-accent"><div class="row-title">Plano total · R$ 24.800</div><div class="row-meta">Aguardará confirmação pelo próximo Resumo Empresarial ou fechamento.</div></div>
          <div class="section-title">No aplicativo do banco</div>
          <div class="ui-card">
            ${checkRow(false, "Separar impostos", "Itaú PJ → provisão", "R$ 3.968")}
            ${checkRow(false, "Pagar pró-labore", "Itaú PJ → Itaú PF", "R$ 1.518")}
            ${checkRow(false, "Reforçar reserva", "Itaú PJ → Reserva Operacional", "R$ 2.200")}
            ${checkRow(false, "Fazer retirada", "Itaú PJ → Itaú PF", "R$ 16.948")}
          </div>
          <div class="ui-card" style="margin-top:10px;background:var(--surface-subtle)"><div class="row-title">Confirme somente o que você souber</div><div class="row-meta">O próximo fechamento conciliará os registros informados com o extrato.</div></div>
          <button class="action-button" style="margin-top:12px">Entendi, abrir meu banco</button>`, "Plano"),
      },
    ],
  },

  A07: {
    group: "Android diário",
    name: "Central de Obrigações",
    platform: "mobile",
    purpose: "Priorizar Ocorrências de Obrigação por risco, vencimento, evidência e correspondência com pagamentos.",
    refs: [
      ["Ubank · Bill Planner", "https://mobbin.com/screens/cdb43016-3430-492e-a5b9-f65727f3083b"],
      ["Quicken · Bills & Payments", "https://mobbin.com/screens/aee7a55b-3a8c-4ed8-a062-630d25e0dca6"],
      ["YNAB · Bills", "https://mobbin.com/screens/15747c12-b670-42aa-81b9-d9b4d1998c5a"],
    ],
    variants: [
      {
        key: "A",
        name: "Fila por risco",
        note: "A tela responde primeiro o que exige ação; itens saudáveis aparecem depois e com menor contraste.",
        components: ["ObligationRow", "RiskSummary", "PaymentEvidence"],
        render: () => mobileShell(`
          <div class="screen-topline"><div><span class="screen-kicker">julho de 2026</span><h2>Obrigações</h2></div><button class="icon-button">⌕</button></div>
          <div class="grid-2"><div class="ui-card"><div class="metric-label">Em atenção</div><div class="metric-value">2</div></div><div class="ui-card"><div class="metric-label">Concluídas</div><div class="metric-value">7</div></div></div>
          <div class="section-title">Requer ação</div>
          <div class="ui-card">
            ${row("Energia", "vence em 2 dias · sem pagamento", "R$ 198", '<span class="badge warning">aguardando</span>')}
            ${row("DAS", "vence em 5 dias · documento ausente", "R$ 1.240", '<span class="badge warning">pendente</span>')}
          </div>
          <div class="section-title">No ritmo</div>
          <div class="ui-card">
            ${row("Fatura do cartão", "fecha em 8 dias", "R$ 2.430", '<span class="badge">prevista</span>')}
            ${row("Contabilidade", "pagamento identificado ontem", "R$ 420", '<span class="badge success">paga</span>')}
            ${row("Internet", "vence em 12 dias", "R$ 119", '<span class="badge">prevista</span>')}
          </div>`, "Mais"),
      },
      {
        key: "B",
        name: "Calendário do ciclo",
        note: "Uma faixa temporal ajuda a antecipar vencimentos. Funciona melhor para leitura de datas que para divergências complexas.",
        components: ["CycleCalendar", "ObligationRow", "DueDateMarker"],
        render: () => mobileShell(`
          <div class="screen-topline"><div><span class="screen-kicker">próximos 30 dias</span><h2>Calendário financeiro</h2></div><span class="badge accent">9 itens</span></div>
          <div class="ui-card">
            <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px;text-align:center;font-size:9px;color:var(--muted-foreground)">
              ${[14,15,16,17,18,19,20,21,22,23,24,25,26,27].map((d) => `<span style="padding:8px 2px;border-radius:8px;${d === 16 ? "background:var(--warning-soft);color:#7a4b00;font-weight:800" : d === 22 ? "background:var(--accent-100);color:var(--accent-900);font-weight:800" : ""}">${d}</span>`).join("")}
            </div>
          </div>
          <div class="section-title">16 de julho</div>
          <div class="ui-card">${row("Energia", "Pagamento ainda não identificado", "R$ 198", '<span class="badge warning">em risco</span>')}</div>
          <div class="section-title">22 de julho</div>
          <div class="ui-card">${row("Fatura do cartão", "Fechamento · vencimento em 29 jul", "R$ 2.430", '<span class="badge">projetada</span>')}</div>
          <div class="section-title">Resumo do período</div>
          <div class="grid-2"><div class="ui-card"><div class="metric-label">Pessoal</div><div class="metric-value" style="font-size:20px">R$ 4.310</div></div><div class="ui-card"><div class="metric-label">Empresa</div><div class="metric-value" style="font-size:20px">R$ 2.680</div></div></div>`, "Mais"),
      },
      {
        key: "C",
        name: "Por patrimônio",
        note: "Empresa e Pessoal são a primeira divisão. Ajuda a preservar o perímetro, mas pode esconder urgências entre abas.",
        components: ["MoneyScopeTabs", "ObligationRow", "CompetencySummary"],
        render: () => mobileShell(`
          <span class="screen-kicker">Central de Obrigações</span><h2>Julho de 2026</h2>
          <div class="segmented" style="margin-top:16px"><span class="segment active">Empresa · 4</span><span class="segment">Pessoal · 5</span></div>
          <div class="section-title">Empresa</div>
          <div class="ui-card soft-accent"><div class="metric-label">Total provisionado</div><div class="metric-value">R$ 5.648</div><div class="supporting">DAS, INSS, contabilidade e NFS-e.</div></div>
          <div class="ui-card" style="margin-top:10px">
            ${row("DAS", "vence em 5 dias", "R$ 1.240", '<span class="badge warning">documento</span>')}
            ${row("INSS", "vence em 7 dias", "R$ 166", '<span class="badge">prevista</span>')}
            ${row("Contabilidade", "paga em 13 jul", "R$ 420", '<span class="badge success">evidência</span>')}
            ${row("Emitir NFS-e", "concluída em 13 jul", "—", '<span class="badge success">concluída</span>')}
          </div>
          <button class="secondary-button" style="width:100%;margin-top:12px">Ver Pessoal</button>`, "Mais"),
      },
    ],
  },

  A10: {
    group: "Android diário",
    name: "Revisão semanal",
    platform: "mobile",
    purpose: "Resolver anomalias e no máximo três ações em aproximadamente cinco minutos, sem produzir um dashboard interminável.",
    refs: [
      ["Rocket Money · revisão", "https://mobbin.com/screens/46fd79f9-3b63-4d31-aa48-550d2e05eaec"],
      ["Ubank · visão do período", "https://mobbin.com/screens/cdb43016-3430-492e-a5b9-f65727f3083b"],
      ["Quicken · resumo", "https://mobbin.com/screens/aee7a55b-3a8c-4ed8-a062-630d25e0dca6"],
    ],
    variants: [
      {
        key: "A",
        name: "Revisão guiada",
        note: "Uma tarefa por vez reduz carga cognitiva e torna o tempo prometido verificável.",
        components: ["ReviewProgress", "ReviewTask", "ClassificationDecision"],
        render: () => mobileShell(`
          <div class="screen-topline"><div><span class="screen-kicker">revisão semanal · ~5 min</span><h2>Resolver quatro pontos</h2></div><span class="badge accent">2 de 4</span></div>
          <div class="progress"><span style="width:50%"></span></div>
          <div class="ui-card" style="margin-top:20px;padding:18px">
            <span class="badge warning">classificação</span>
            <div style="margin-top:14px;font-size:18px;font-weight:760">Duas compras precisam de revisão</div>
            <div class="supporting">R$ 320 podem alterar o ritmo do ciclo. Nenhuma sugestão foi confirmada.</div>
            <div class="ui-card" style="margin-top:14px;background:var(--surface-subtle)">${row("Mercado Aurora", "Sugestão: alimentação", "R$ 286")}</div>
            <div class="grid-2" style="margin-top:14px"><button class="secondary-button">Corrigir</button><button class="action-button">Confirmar</button></div>
          </div>
          <div class="section-title">Depois</div>
          <div class="ui-card">${row("Ritmo de gastos", "78% do esperado", "1 min")}${row("Energia", "vence em 2 dias", "1 min")}</div>`, "Revisar"),
      },
      {
        key: "B",
        name: "Caixa de revisão",
        note: "Todas as pendências ficam visíveis como uma inbox. Facilita priorização livre, mas pode incentivar abandono parcial.",
        components: ["ReviewInbox", "ImpactBadge", "ReviewAction"],
        render: () => mobileShell(`
          <div class="screen-topline"><div><span class="screen-kicker">semana 28</span><h2>Caixa de revisão</h2></div><span class="badge">4 pendências</span></div>
          <div class="ui-card soft-accent"><div class="row-title">O ciclo continua saudável</div><div class="row-meta">As pendências abaixo ainda não mudam o Plano Financeiro.</div></div>
          <div class="section-title">Por impacto</div>
          <div class="ui-card">
            ${row("2 compras sem classificação", "Pode alterar gastos essenciais", "R$ 320", '<span class="badge warning">alto</span>')}
            ${row("Energia sem pagamento", "Vence em 2 dias", "R$ 198", '<span class="badge warning">alto</span>')}
            ${row("Ritmo variável", "78% do esperado", "+ 6%", '<span class="badge">médio</span>')}
            ${row("Reserva Familiar", "Sem impacto relevante", "+ R$ 200", '<span class="badge success">baixo</span>')}
          </div>
          <button class="action-button" style="margin-top:12px">Começar pelo maior impacto</button>`, "Revisar"),
      },
      {
        key: "C",
        name: "Resumo e três ações",
        note: "Prioriza explicação e recomendações curtas. É a opção mais adequada se a revisão for recorrente e muito conhecida.",
        components: ["WeeklySummary", "RecommendedAction", "ReserveImpact"],
        render: () => mobileShell(`
          <span class="screen-kicker">8–14 de julho</span><h2>Sua semana em um minuto</h2>
          <div class="grid-2" style="margin-top:16px"><div class="ui-card"><div class="metric-label">Gastos variáveis</div><div class="metric-value" style="font-size:21px">R$ 1.480</div><div class="supporting">+ 6% no ritmo</div></div><div class="ui-card"><div class="metric-label">Obrigações</div><div class="metric-value" style="font-size:21px">7 de 9</div><div class="supporting">2 abertas</div></div></div>
          <div class="ui-card" style="margin-top:10px;background:var(--protected)"><div class="row-title">Reservas preservadas</div><div class="row-meta">Sem impacto relevante nesta semana.</div></div>
          <div class="section-title">Três ações recomendadas</div>
          <div class="ui-card">
            ${checkRow(false, "Revisar duas compras", "maior impacto", "R$ 320")}
            ${checkRow(false, "Conferir energia", "vence em 2 dias", "R$ 198")}
            ${checkRow(false, "Manter o plano", "nenhum ajuste necessário", "—")}
          </div>
          <button class="action-button" style="margin-top:12px">Revisar primeira ação</button>`, "Revisar"),
      },
    ],
  },

  O05: {
    group: "Onboarding histórico",
    name: "Revisão agrupada",
    platform: "mobile",
    purpose: "Classificar movimentações semelhantes em lote, explicitar incerteza e criar uma Regra de Classificação reutilizável.",
    refs: [
      ["Hyundai Card · seleção em lote", "https://mobbin.com/screens/e966d200-e9b0-40bf-8dea-46ae7ff10441"],
      ["Commons · fila de compras", "https://mobbin.com/screens/66a41e49-66c8-4873-b0c7-cea1bdef1702"],
      ["Rocket Money · precisa categorizar", "https://mobbin.com/screens/46fd79f9-3b63-4d31-aa48-550d2e05eaec"],
    ],
    variants: [
      {
        key: "A",
        name: "Grupo primeiro",
        note: "Mostra o conjunto antes da regra. O Titular pode retirar exceções antes de confirmar a classificação em lote.",
        components: ["MerchantGroup", "BulkSelection", "ClassificationRule"],
        render: () => mobileShell(`
          <div class="screen-topline"><div><span class="screen-kicker">classificação · grupo 8 de 24</span><h2>Mercado Aurora</h2></div><span class="badge">12 itens</span></div>
          <div class="ui-card soft-accent"><div class="row-title">Sugestão: alimentação essencial</div><div class="row-meta">Alta semelhança de descrição · revise as exceções.</div></div>
          <div class="section-title">Selecionados · 11 de 12</div>
          <div class="ui-card">
            ${checkRow(true, "Mercado Aurora", "28 jun · Itaú PF", "R$ 286")}
            ${checkRow(true, "Mercado Aurora", "14 jun · Itaú PF", "R$ 194")}
            ${checkRow(true, "Mercado Aurora", "31 mai · Itaú PF", "R$ 312")}
            ${checkRow(false, "Aurora Conveniência", "29 mai · Itaú PF", "R$ 48")}
          </div>
          <div class="ui-card" style="margin-top:10px"><div class="row-title">Criar Regra de Classificação</div><div class="row-meta">Aplicar a movimentações semelhantes futuras.</div></div>
          <button class="action-button" style="margin-top:12px">Confirmar 11 movimentações</button>`, "Revisar"),
      },
      {
        key: "B",
        name: "Decisão focada",
        note: "Uma movimentação representativa ocupa a tela. A escolha é simples, mas o contexto do lote fica secundário.",
        components: ["RepresentativeTransaction", "CategoryChoice", "GroupPreview"],
        render: () => mobileShell(`
          <div class="screen-topline"><div><span class="screen-kicker">12 movimentações semelhantes</span><h2>Como classificar?</h2></div><span class="badge accent">8 de 24</span></div>
          <div class="ui-card" style="padding:20px;text-align:center">
            <div class="metric-label">MERCADO AURORA</div><div class="metric-value">R$ 286</div><div class="supporting">28 jun 2026 · Itaú PF</div>
          </div>
          <div class="section-title">Finalidade financeira</div>
          <div class="choice-grid"><button class="choice active">Alimentação essencial</button><button class="choice">Consumo variável</button><button class="choice">Despesa pessoal</button><button class="choice">Outra finalidade</button></div>
          <div class="section-title">Alcance</div>
          <div class="segmented"><span class="segment">Só esta</span><span class="segment active">12 semelhantes</span></div>
          <div class="ui-card" style="margin-top:12px"><div class="row-title">1 possível exceção</div><div class="row-meta">Aurora Conveniência · R$ 48 ficará fora da regra.</div></div>
          <button class="action-button" style="margin-top:12px">Confirmar classificação</button>`, "Revisar"),
      },
      {
        key: "C",
        name: "Tabela compacta",
        note: "Maximiza velocidade e comparação entre sugestões. Exige mais atenção e funciona melhor depois que o modelo mental já estiver aprendido.",
        components: ["ClassificationTable", "ConfidenceBadge", "BulkActionBar"],
        render: () => mobileShell(`
          <div class="screen-topline"><div><span class="screen-kicker">143 de 812 revisadas</span><h2>Revisar sugestões</h2></div><button class="icon-button">≡</button></div>
          <div class="segmented"><span class="segment active">Impacto</span><span class="segment">Recorrência</span><span class="segment">Incerteza</span></div>
          <div class="section-title">Maior impacto</div>
          <div class="ui-card">
            ${row("Mercado Aurora · 12", "Alimentação essencial", "R$ 2.840", '<span class="badge success">94%</span>')}
            ${row("Posto Horizonte · 8", "Transporte", "R$ 1.960", '<span class="badge warning">76%</span>')}
            ${row("Transferência · 6", "Interna", "R$ 8.400", '<span class="badge warning">68%</span>')}
            ${row("Cloud Service · 5", "Empresa", "R$ 780", '<span class="badge company">83%</span>')}
          </div>
          <div class="ui-card soft-accent" style="margin-top:12px"><div class="row-title">3 grupos selecionados</div><div class="row-meta">Confirmação sempre cria regras separadas.</div></div>
          <button class="action-button" style="margin-top:10px">Revisar seleção</button>`, "Revisar"),
      },
    ],
  },

  W02: {
    group: "Companion web",
    name: "Prévia de importação",
    platform: "desktop",
    purpose: "Conferir arquivo, período, totais, erros e duplicidades antes de criar o Lote de Importação e apagar o bruto.",
    refs: [
      ["Wave · CSV Import", "https://mobbin.com/screens/714b05b4-4793-4bf5-ab6b-f96e2f942a87"],
      ["Dovetail · mapear colunas", "https://mobbin.com/screens/2b45e480-3bd3-46db-95ed-14338a4a8b7b"],
      ["YNAB · Import Transactions", "https://mobbin.com/screens/24c2981b-68e6-4b64-a27e-02a688acf1ce"],
    ],
    variants: [
      {
        key: "A",
        name: "Wizard com tabela",
        note: "Padrão previsível e próximo dos exemplos do Mobbin. A prévia é a evidência central antes da confirmação.",
        components: ["ImportStepper", "ImportPreviewTable", "ImportBatchSummary"],
        render: () => desktopShell("import", "Conferir extrato antes de importar", "itau-pf-junho.ofx · 1–30 jun 2026 · arquivo sintético", '<button class="button primary">Confirmar importação</button>', `
          <div class="segmented" style="max-width:500px"><span class="segment">Arquivo ✓</span><span class="segment">Validar ✓</span><span class="segment active">Confirmar</span></div>
          <div class="desktop-grid" style="margin-top:18px"><div class="ui-card"><div class="metric-label">Movimentações</div><div class="metric-value">148</div></div><div class="ui-card"><div class="metric-label">Entradas</div><div class="metric-value">R$ 27.460</div></div><div class="ui-card" style="background:var(--warning-soft)"><div class="metric-label">Requerem revisão</div><div class="metric-value">3</div></div></div>
          <div class="ui-card" style="margin-top:14px"><table class="data-table"><thead><tr><th>Data</th><th>Descrição normalizada</th><th>Estado</th><th>Valor</th></tr></thead><tbody><tr><td>28 jun</td><td>Supermercado Aurora</td><td><span class="badge success">válido</span></td><td>− R$ 286</td></tr><tr><td>26 jun</td><td>Transferência interna</td><td><span class="badge warning">revisar</span></td><td>R$ 4.200</td></tr><tr><td>24 jun</td><td>Energia</td><td><span class="badge success">válido</span></td><td>− R$ 198</td></tr></tbody></table><div class="supporting">1 possível duplicidade será ignorada na confirmação.</div></div>
          <div class="ui-card" style="margin-top:14px;background:var(--success-soft)"><div class="row-title">Após confirmar</div><div class="row-meta">O bruto será apagado após ingestão validada; hash e auditoria serão preservados.</div></div>`),
      },
      {
        key: "B",
        name: "Validação em duas colunas",
        note: "Separa fatos conhecidos de exceções. Favorece a decisão quando o arquivo tem problemas, sem obrigar leitura de toda a tabela.",
        components: ["FileFacts", "ValidationIssue", "ImportDecision"],
        render: () => desktopShell("import", "Validar lote de importação", "Arquivo reconhecido como OFX · Itaú PF", '<button class="button primary">Importar 147 válidas</button>', `
          <div class="desktop-grid two">
            <div class="stack"><div class="ui-card"><div class="section-title" style="margin-top:0">Arquivo reconhecido</div>${row("Período", "Cobertura declarada", "1–30 jun")}${row("Movimentações", "148 registros", "R$ 27.460")}${row("Hash", "Arquivo bruto", "…8a4f")}</div><div class="ui-card" style="background:var(--success-soft)"><div class="row-title">147 prontas para importar</div><div class="row-meta">Totais e datas válidos.</div></div></div>
            <div class="stack"><div class="ui-card" style="border-color:#eed99a"><div class="section-title" style="margin-top:0">1 decisão necessária</div>${row("Transferência interna", "Correspondência provável com Itaú PJ", "R$ 4.200", '<span class="badge warning">76%</span>')}<div class="choice-grid" style="margin-top:12px"><button class="choice active">Tratar como interna</button><button class="choice">Importar sem regra</button></div></div><div class="ui-card"><div class="row-title">1 duplicidade detectada</div><div class="row-meta">Será ignorada automaticamente pelo hash da Movimentação de Origem.</div></div></div>
          </div>`),
      },
      {
        key: "C",
        name: "Conciliação de totais",
        note: "Começa pela confiança quantitativa: arquivo versus resultado esperado. É mais técnico e adequado para auditoria recorrente.",
        components: ["TotalsReconciliation", "ValidationLog", "RawFilePolicy"],
        render: () => desktopShell("import", "Conciliação do arquivo", "Confira o que entra, o que fica de fora e por quê.", '<button class="button primary">Confirmar lote</button>', `
          <div class="ui-card soft-accent"><div class="desktop-grid"><div><div class="metric-label">Total do arquivo</div><div class="metric-value">R$ 12.418</div></div><div><div class="metric-label">Total importável</div><div class="metric-value">R$ 12.418</div></div><div><div class="metric-label">Diferença</div><div class="metric-value">R$ 0</div></div></div></div>
          <div class="desktop-grid two" style="margin-top:14px"><div class="ui-card"><div class="section-title" style="margin-top:0">Entrará no Livro Financeiro</div>${row("Movimentações válidas", "147 registros", "147")}${row("Transferência interna", "preservada para conciliação", "1")}</div><div class="ui-card"><div class="section-title" style="margin-top:0">Não será criada</div>${row("Duplicidade", "mesmo identificador de origem", "1")}${row("Linhas inválidas", "nenhuma encontrada", "0")}</div></div>
          <div class="ui-card" style="margin-top:14px"><div class="section-title" style="margin-top:0">Política do arquivo bruto</div><div class="row-meta">Processar → validar → criar Movimentações de Origem → apagar bruto → preservar hash e auditoria.</div></div>`),
      },
    ],
  },

  W03: {
    group: "Companion web",
    name: "Cofre Fiscal",
    platform: "desktop",
    purpose: "Encontrar Documentos Fiscais por patrimônio, competência e obrigação sem reduzir o Cofre a uma árvore de pastas.",
    refs: [
      ["Vanta · filtros e status", "https://mobbin.com/screens/d9024cf5-8c64-4b36-a65a-60a5366220e4"],
      ["Origin · documentos por contexto", "https://mobbin.com/screens/6a8614a5-1611-4a27-986c-ecc8a9c80319"],
      ["Origin · estados documentais", "https://mobbin.com/screens/5c2dbbc2-9f78-4b02-ae32-3deb2a595bb0"],
    ],
    variants: [
      {
        key: "A",
        name: "Tabela documental",
        note: "Densa e previsível para busca e filtros. Mantém status escaneáveis, mas precisa evitar aparência de ERP genérico.",
        components: ["DocumentFilters", "FiscalDocumentTable", "DocumentStatus"],
        render: () => desktopShell("vault", "Cofre Fiscal", "Documentos relacionados a competências e Obrigações.", '<button class="button primary">Enviar documento</button>', `
          <div style="display:flex;gap:8px;margin-bottom:14px"><span class="badge company">Empresa · 18</span><span class="badge personal">Pessoal · 9</span><span class="badge">Julho de 2026</span><span class="badge">Todos os tipos</span></div>
          <div class="ui-card"><table class="data-table"><thead><tr><th>Documento</th><th>Competência</th><th>Obrigação</th><th>Status</th><th>Data</th></tr></thead><tbody><tr><td>NFS-e · cliente exterior</td><td>jul/2026</td><td>Emitir NFS-e</td><td><span class="badge success">validado</span></td><td>13 jul</td></tr><tr><td>DAS · julho</td><td>jul/2026</td><td>Pagar DAS</td><td><span class="badge warning">pendente</span></td><td>vence em 5 dias</td></tr><tr><td>Pró-labore</td><td>jul/2026</td><td>Registrar pró-labore</td><td><span class="badge personal">recebido</span></td><td>11 jul</td></tr><tr><td>Relatório contábil</td><td>jun/2026</td><td>Fechamento Mensal</td><td><span class="badge success">validado</span></td><td>4 jul</td></tr></tbody></table></div>
          <div class="ui-card" style="margin-top:14px;background:#141b17;color:white"><div style="display:flex;justify-content:space-between;align-items:center"><div><div class="row-title">Pacote do contador</div><div class="row-meta" style="color:#b8c0bb">Empresa · jul/2026 · 8 documentos</div></div><button class="button">Revisar</button></div></div>`),
      },
      {
        key: "B",
        name: "Por obrigação",
        note: "Documento aparece dentro do trabalho financeiro que comprova. É a opção mais fiel ao modelo de domínio.",
        components: ["ObligationDocumentGroup", "FiscalDocument", "MissingEvidence"],
        render: () => desktopShell("vault", "Cofre Fiscal por Obrigação", "Julho de 2026 · Empresa", '<button class="button primary">Enviar documento</button>', `
          <div class="desktop-grid two">
            <div class="ui-card"><div style="display:flex;justify-content:space-between"><div><span class="badge success">concluída</span><div class="section-title">Emitir NFS-e</div></div><span class="row-value">13 jul</span></div>${row("NFS-e · cliente exterior", "PDF validado · hash …4f2a", "1 arquivo")}</div>
            <div class="ui-card" style="border-color:#eed99a"><div style="display:flex;justify-content:space-between"><div><span class="badge warning">pendente</span><div class="section-title">Pagar DAS</div></div><span class="row-value">19 jul</span></div><div class="row-meta">Documento ainda não recebido.</div><button class="secondary-button" style="width:100%;margin-top:14px">Adicionar DAS</button></div>
            <div class="ui-card"><div style="display:flex;justify-content:space-between"><div><span class="badge success">paga</span><div class="section-title">Pró-labore</div></div><span class="row-value">11 jul</span></div>${row("Demonstrativo de pró-labore", "Recebido do contador", "PDF")}</div>
            <div class="ui-card"><div style="display:flex;justify-content:space-between"><div><span class="badge">prevista</span><div class="section-title">Fechamento Mensal</div></div><span class="row-value">31 jul</span></div><div class="row-meta">Aguardando competência encerrar.</div></div>
          </div>`),
      },
      {
        key: "C",
        name: "Linha por competência",
        note: "Organiza o Cofre como uma narrativa mensal. Facilita fechamento e exportação, mas busca transversal fica menos direta.",
        components: ["CompetencyTimeline", "FiscalDocument", "AccountantPackage"],
        render: () => desktopShell("vault", "Histórico fiscal", "Empresa e Pessoal permanecem separados em cada competência.", '<button class="button primary">Gerar pacote</button>', `
          <div style="display:grid;grid-template-columns:180px minmax(0,1fr);gap:18px">
            <div class="stack"><div class="ui-card soft-accent"><div class="row-title">Julho de 2026</div><div class="row-meta">6 de 8 documentos</div></div><div class="ui-card"><div class="row-title">Junho de 2026</div><div class="row-meta">8 de 8 · fechado</div></div><div class="ui-card"><div class="row-title">Maio de 2026</div><div class="row-meta">7 de 7 · fechado</div></div></div>
            <div><div class="ui-card"><div style="display:flex;justify-content:space-between"><div><span class="badge company">Empresa</span><div class="section-title">Julho de 2026</div></div><span class="badge warning">2 pendências</span></div>${row("NFS-e · cliente exterior", "Emitir NFS-e", "13 jul", '<span class="badge success">validado</span>')}${row("DAS", "Pagar DAS", "—", '<span class="badge warning">ausente</span>')}${row("Pró-labore", "Registrar pró-labore", "11 jul", '<span class="badge success">recebido</span>')}</div><div class="ui-card" style="margin-top:12px;background:var(--surface-subtle)"><div class="row-title">Extratos bancários brutos não entram aqui</div><div class="row-meta">A política do Cofre Fiscal vale apenas para Documentos Fiscais.</div></div></div>
          </div>`),
      },
    ],
  },
};

function readState() {
  const params = new URLSearchParams(window.location.search);
  const screen = screens[params.get("screen")] ? params.get("screen") : "A02";
  const requestedVariant = params.get("variant") || "A";
  const variant = screens[screen].variants.some((item) => item.key === requestedVariant) ? requestedVariant : "A";
  return { screen, variant, compare: params.get("compare") === "1" };
}

function writeState(next) {
  const params = new URLSearchParams(window.location.search);
  params.set("screen", next.screen);
  params.set("variant", next.variant);
  if (next.compare) params.set("compare", "1");
  else params.delete("compare");
  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  render();
}

function renderSidebar(currentScreen) {
  const groups = [...new Set(Object.values(screens).map((screen) => screen.group))];
  return `
    <aside class="catalog-sidebar">
      <div class="brand-lockup"><span class="brand-mark"></span>Brenotion</div>
      <div class="prototype-label">Protótipo descartável</div>
      ${groups.map((group) => `
        <div class="screen-group-label">${group}</div>
        <nav class="screen-nav">
          ${Object.entries(screens).filter(([, screen]) => screen.group === group).map(([code, screen]) => `
            <button type="button" data-screen="${code}" data-active="${code === currentScreen}">
              <span class="screen-code">${code}</span><span class="screen-name">${screen.name}</span>
            </button>`).join("")}
        </nav>`).join("")}
      <p class="sidebar-note">Primeira rodada: sete superfícies P0. O inventário completo permanece em <strong>screen-inventory.md</strong>.</p>
    </aside>`;
}

function renderReferences(refs) {
  return `<div class="reference-strip"><strong>Referências Mobbin</strong>${refs.map(([label, url]) => `<a class="reference-link" href="${url}" target="_blank" rel="noreferrer">${label} ↗</a>`).join("")}</div>`;
}

function renderSingle(screen, variant) {
  return `
    <div class="single-candidate">
      <div class="candidate-preview">${variant.render()}</div>
      <aside class="candidate-notes">
        <div class="note-card"><h2>${variant.key} — ${variant.name}</h2><p>${variant.note}</p></div>
        <div class="note-card"><h3>Componentes de domínio</h3><div class="chip-list">${variant.components.map((item) => `<span class="component-chip">${item}</span>`).join("")}</div></div>
        <div class="note-card"><h3>Como comentar</h3><p>Use manter / adaptar / evitar. Diga qual bloco, hierarquia ou densidade você quer levar para a próxima rodada.</p></div>
      </aside>
    </div>`;
}

function renderCompare(screen) {
  return `<div class="compare-grid">${screen.variants.map((variant) => `
    <article class="compare-item">
      <div class="compare-heading"><h2>${variant.key} — ${variant.name}</h2><span>${variant.components.length} componentes próprios</span></div>
      ${variant.render()}
    </article>`).join("")}</div>`;
}

function renderSwitcher(screen, currentVariant) {
  const index = screen.variants.findIndex((item) => item.key === currentVariant);
  const variant = screen.variants[index];
  return `
    <div class="prototype-switcher" aria-label="Alternar candidato visual">
      <button type="button" data-cycle="-1" aria-label="Candidato anterior">←</button>
      <div class="switcher-label"><strong>${variant.key} — ${variant.name}</strong><span>use ← e → para alternar</span></div>
      <button type="button" data-cycle="1" aria-label="Próximo candidato">→</button>
    </div>`;
}

function bindEvents(state) {
  document.querySelectorAll("[data-screen]").forEach((button) => {
    button.addEventListener("click", () => writeState({ screen: button.dataset.screen, variant: "A", compare: false }));
  });

  document.querySelector("[data-toggle-compare]")?.addEventListener("click", () => writeState({ ...state, compare: !state.compare }));

  const cycle = (direction) => {
    const variants = screens[state.screen].variants;
    const index = variants.findIndex((item) => item.key === state.variant);
    const next = variants[(index + direction + variants.length) % variants.length];
    writeState({ ...state, variant: next.key, compare: false });
  };

  document.querySelectorAll("[data-cycle]").forEach((button) => button.addEventListener("click", () => cycle(Number(button.dataset.cycle))));

  window.onkeydown = (event) => {
    const tag = document.activeElement?.tagName;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(tag) || document.activeElement?.isContentEditable) return;
    if (event.key === "ArrowLeft") cycle(-1);
    if (event.key === "ArrowRight") cycle(1);
  };
}

function render() {
  const state = readState();
  const screen = screens[state.screen];
  const variant = screen.variants.find((item) => item.key === state.variant);
  document.title = `${state.screen} ${screen.name} — Brenotion visual`;
  document.getElementById("app").innerHTML = `
    <div class="prototype-layout">
      ${renderSidebar(state.screen)}
      <main class="catalog-main">
        <header class="catalog-header">
          <div><p class="eyebrow">${state.screen} · ${screen.platform === "mobile" ? "Android" : "Companion web"}</p><h1>${screen.name}</h1><p class="purpose">${screen.purpose}</p></div>
          <div class="header-actions"><button class="button" type="button" data-toggle-compare data-active="${state.compare}">${state.compare ? "Ver uma opção" : "Comparar lado a lado"}</button></div>
        </header>
        ${renderReferences(screen.refs)}
        <section class="candidate-stage">${state.compare ? renderCompare(screen) : renderSingle(screen, variant)}</section>
      </main>
      ${renderSwitcher(screen, state.variant)}
    </div>`;
  bindEvents(state);
}

render();
