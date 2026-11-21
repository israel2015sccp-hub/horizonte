/* Horizonte — telas do financeiro: Início, Mês, Cartões, Dívidas, Casa, Entradas e saldo. */
(function () {
  'use strict';
  const { esc, icon, bar } = UI, m = H.money, sum = H.sum;
  const V = App.views, A = App.actions, act = App.act, head = App.head;
  const F = () => H.state.finance;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const monthName = key => H.LONG_MONTHS[Number(key.slice(5)) - 1];
  const tone = n => n < 0 ? 'neg' : 'pos';
  const addBtn = (action, label, data) => '<button class="btn small" data-a="' + action + '"' + (data || '') + '>' + icon('plus') + label + '</button>';
  const upsertAllocation = (b, period, amount) => {
    b.allocations = b.allocations.filter(a => a.period !== period);
    if (amount !== null) b.allocations.push({ period, amount });
  };

  /* ---------- linha de conta do mês (fixa, fatura ou parcela) ---------- */
  const billRow = (it, month) => {
    const late = !it.paid && it.date && it.date < H.today();
    const when = it.date ? ' · ' + (it.paid ? H.shortDate(it.date) : H.relative(it.date)) : '';
    return '<button class="row bill' + (it.paid ? ' is-paid' : '') + (late ? ' is-late' : '') + '" data-a="bill" data-key="' + esc(it.key) + '" data-month="' + month + '" aria-pressed="' + it.paid + '">' +
      '<span class="check">' + (it.paid ? icon('check') : '') + '</span><span class="row-main"><b>' + esc(it.title) + '</b><small>' + esc(it.sub) + when + '</small></span>' +
      '<span class="row-amt">' + (it.amount === null ? '<em>a informar</em>' : m(it.amount)) + '</span></button>';
  };
  A.bill = ({ key, month }) => {
    const it = H.monthChecklist(F(), month).find(i => i.key === key);
    if (!it) return;
    if (it.kind === 'installment') {
      const id = it.purchase.id, i = it.index, was = it.paid;
      return act(was ? 'Parcela reaberta' : 'Parcela marcada como paga', f => { const p = f.purchases.find(p => p.id === id); p.paid = was ? p.paid.filter(x => x !== i) : [...p.paid, i].sort((a, b) => a - b); });
    }
    const id = it.budget.id, period = 'm:' + month;
    if (it.paidAmount > 0) return UI.confirm('Desfazer pagamento?', it.title + ' volta a ficar em aberto em ' + monthName(month) + ' e ' + m(it.paidAmount) + ' retorna ao saldo.', 'Desfazer pagamento',
      () => act('Pagamento desfeito', f => { f.expenses = f.expenses.filter(e => !(e.budgetId === id && e.period === period)); }));
    if (it.kind === 'card' && (it.amount === null || it.paid)) return A.cardBill({ id, month });
    if (it.amount === null) return A.editBudget({ id });
    UI.form({ title: 'Pagar ' + it.title, intro: 'Registra a saída e desconta do saldo em conta.', submit: 'Confirmar pagamento',
      fields: [{ name: 'amount', label: 'Valor pago', type: 'money', value: it.amount, required: true }, { name: 'date', label: 'Data do pagamento', type: 'date', value: H.today(), required: true }],
      onSubmit: v => { if (!v.amount) return 'Informe o valor pago.'; act('Pagamento registrado', f => { f.expenses.push({ id: H.id(), budgetId: id, date: v.date, amount: v.amount, description: 'Pagamento', period, method: 'cash' }); }); } });
  };

  const composition = plan => {
    const parts = [['Contas fixas', plan.home, 'c1'], ['Cartões', plan.cards, 'c2'], ['Parcelas e empréstimo', plan.other, 'c3']];
    return '<div class="stack">' + parts.map(p => p[1] > 0 ? '<i class="' + p[2] + '" style="flex:' + p[1] + '"></i>' : '').join('') + '</div>' +
      '<div class="legend">' + parts.map(p => '<span><i class="' + p[2] + '"></i>' + p[0] + '<b>' + m(p[1]) + '</b></span>').join('') + '</div>';
  };

  /* ---------- Início ---------- */
  V.inicio = () => {
    const f = F(), hz = H.state.horizon, month = H.currentMonth(), today = H.today();
    const plan = H.monthPlan(f, month), income = H.monthIncome(f, month), cash = H.cashSummary(f, month);
    const list = H.monthChecklist(f, month), open = list.filter(i => !i.paid), openSum = sum(open, i => i.amount || 0);
    const debt = H.debtSummary(f), free = H.debtFreeMonth(f), after = cash.balance + cash.future - openSum;
    const late = open.filter(i => i.date && i.date < today).length;
    const focus = hz.goals.find(g => g.id === hz.focus && g.status !== 'done'), att = H.attentions(hz).slice(0, 3);
    let html = head('Início', cap(H.WEEKDAYS[H.parseDate(today).getDay()]) + ', ' + H.dateLabel(today));
    html += '<section class="hero"><small>Saldo em conta</small>' +
      (cash.hasBase ? '<strong class="big ' + tone(cash.balance) + '">' + m(cash.balance) + '</strong>' : '<button class="btn primary" data-a="setBalance">Informar meu saldo</button>') +
      '<div class="hero-grid"><div><small>Falta pagar em ' + monthName(month) + '</small><b>' + m(openSum) + '</b><span>' + (open.length ? open.length + (open.length === 1 ? ' conta em aberto' : ' contas em aberto') : 'tudo pago') + '</span></div>' +
      '<div><small>Depois das contas</small><b class="' + tone(after) + '">' + m(after) + '</b><span>' + (cash.future ? 'com ' + m(cash.future) + ' a receber' : 'saldo menos o que falta') + '</span></div></div></section>';
    if (late) html += '<a class="note warn" href="#/mes">' + icon('alert') + '<p><b>' + late + (late === 1 ? ' conta vencida' : ' contas vencidas') + ' sem baixa.</b> Se já pagou, marque como paga.</p></a>';
    html += '<div class="cols"><section class="card"><div class="card-h"><h2>' + cap(monthName(month)) + '</h2><a href="#/mes">Ver mês</a></div>' +
      '<div class="trio"><div><small>Entradas</small><b>' + m(income) + '</b></div><div><small>Comprometido</small><b>' + m(plan.total) + '</b></div><div><small>Sobra prevista</small><b class="' + tone(income - plan.total) + '">' + m(income - plan.total) + '</b></div></div>' +
      composition(plan) + '</section>';
    html += '<section class="card"><div class="card-h"><h2>Dívidas</h2><a href="#/dividas">Ver todas</a></div>' +
      '<div class="trio two"><div><small>Falta quitar</small><b>' + m(debt.remaining) + '</b></div><div><small>Livre de dívidas em</small><b>' + (free ? H.monthShort(free) : 'já está') + '</b></div></div>' +
      bar(debt.pct) + '<small class="muted">' + debt.pct + '% pago · ' + debt.pending + ' parcelas restantes</small></section></div>';
    html += '<section class="card"><div class="card-h"><h2>Próximos vencimentos</h2><a href="#/mes">Ver mês</a></div>' +
      (open.length ? '<div class="list">' + open.slice(0, 6).map(i => billRow(i, month)).join('') + '</div>' + (open.length > 6 ? '<a class="more" href="#/mes">mais ' + (open.length - 6) + ' em aberto</a>' : '') : App.empty('Nada em aberto em ' + monthName(month) + '.')) + '</section>';
    if (focus || att.length) {
      html += '<section class="card"><div class="card-h"><h2>Objetivos</h2><a href="#/objetivos">Ver todos</a></div>';
      if (focus) { const pct = H.goalPercent(focus, f); html += '<a class="row link focus" href="#/objetivo/' + encodeURIComponent(focus.id) + '"><span class="row-ic">' + icon('star') + '</span><span class="row-main"><b>' + esc(focus.title) + '</b><small>Foco do ano · ' + esc(H.goalHeadline(focus, f)) + '</small>' + bar(pct) + '</span><span class="row-amt">' + pct + '%</span></a>'; }
      if (att.length) html += '<div class="list">' + att.map(a => '<a class="row link" href="#/objetivo/' + encodeURIComponent(a.g.id) + '"><span class="row-ic ' + a.severity + '">' + icon(a.severity === 'danger' ? 'alert' : 'clock') + '</span><span class="row-main"><b>' + esc(a.title) + '</b><small>' + esc(a.description) + ' · ' + esc(a.g.title) + '</small></span><span class="row-amt"><small>' + H.relative(a.date) + '</small></span></a>').join('') + '</div>';
      html += '</section>';
    }
    return html;
  };

  /* ---------- Mês ---------- */
  A.monthStep = ({ n }) => { App.month = H.addMonths(App.month, Number(n)); App.render(); };
  A.monthSet = ({ month }) => { App.month = month; App.render(); window.scrollTo(0, 0); };
  const monthNav = () => '<div class="month-nav"><button class="icon-btn" data-a="monthStep" data-n="-1" aria-label="Mês anterior">' + icon('chevL') + '</button><b>' + cap(H.monthLabel(App.month)) + '</b><button class="icon-btn" data-a="monthStep" data-n="1" aria-label="Próximo mês">' + icon('chevR') + '</button></div>' +
    (App.month !== H.currentMonth() ? '<button class="pill center" data-a="monthSet" data-month="' + H.currentMonth() + '">Voltar para ' + monthName(H.currentMonth()) + '</button>' : '');
  V.mes = () => {
    const f = F(), month = App.month, plan = H.monthPlan(f, month), income = H.monthIncome(f, month), set = H.monthSettings(f, month);
    const list = H.monthChecklist(f, month), paid = list.filter(i => i.paid), left = income - plan.total;
    let html = head('Mês', 'O que entra, o que já está comprometido e o que sobra') + monthNav();
    html += '<section class="hero"><small>Sobra prevista' + (plan.unknown ? ' (parcial)' : '') + '</small><strong class="big ' + tone(left) + '">' + m(left) + '</strong>' +
      '<div class="hero-grid"><div><small>Entradas</small><b>' + m(income) + '</b><span>' + (income ? 'lançadas no mês' : 'nenhuma lançada') + '</span></div><div><small>Comprometido</small><b>' + m(plan.total) + '</b><span>' + paid.length + ' de ' + list.length + ' pagas</span></div></div>' + composition(plan) + '</section>';
    if (plan.unknown) html += '<div class="note warn">' + icon('alert') + '<p>' + plan.unknown + (plan.unknown === 1 ? ' valor ainda não foi informado' : ' valores ainda não foram informados') + '. A sobra pode ser menor.</p></div>';
    if (!income) html += '<div class="note">' + icon('swap') + '<p>Sem entradas lançadas em ' + monthName(month) + '. ' + '<button class="inline" data-a="addReceipt" data-date="' + month + '-05">Lançar salário previsto</button></p></div>';
    html += '<section class="card"><div class="card-h"><h2>Teto e meta</h2><button class="link-btn" data-a="editPlan">Editar</button></div><div class="trio two">' +
      '<div><small>Teto de gastos</small><b>' + (set.expenseCap === null ? '—' : m(set.expenseCap)) + '</b>' + (set.expenseCap === null ? '' : '<span class="' + tone(set.expenseCap - plan.total) + '">' + (set.expenseCap >= plan.total ? m(set.expenseCap - plan.total) + ' de folga' : m(plan.total - set.expenseCap) + ' acima') + '</span>') + '</div>' +
      '<div><small>Meta de guardar</small><b>' + (set.savingsGoal === null ? '—' : m(set.savingsGoal)) + '</b>' + (set.savingsGoal === null ? '' : '<span class="' + tone(left - set.savingsGoal) + '">' + (left >= set.savingsGoal ? 'cabe na sobra' : 'faltam ' + m(set.savingsGoal - left)) + '</span>') + '</div></div></section>';
    html += '<section class="card"><div class="card-h"><h2>Contas de ' + monthName(month) + '</h2><span class="muted">' + m(sum(list.filter(i => !i.paid), i => i.amount || 0)) + ' em aberto</span></div>' +
      (list.length ? '<div class="list">' + list.map(i => billRow(i, month)).join('') + '</div>' : App.empty('Nenhuma conta neste mês.')) + '</section>';
    const proj = H.projection(f, H.currentMonth(), 14), max = Math.max(1, ...proj.map(p => p.total));
    html += '<section class="card"><div class="card-h"><h2>Próximos meses</h2><span class="muted">já comprometido</span></div><div class="list">' +
      proj.map(p => '<button class="row proj' + (p.month === month ? ' on' : '') + '" data-a="monthSet" data-month="' + p.month + '"><span class="proj-m">' + H.monthShort(p.month) + '</span><span class="row-main">' + bar(p.total / max * 100, 'thin') + '</span><span class="row-amt">' + m(p.total) + (p.income ? '<small class="' + tone(p.left) + '">sobra ' + m(p.left) + '</small>' : '') + '</span></button>').join('') + '</div></section>';
    return html;
  };
  A.editPlan = () => {
    const month = App.month, set = H.monthSettings(F(), month);
    UI.form({ title: 'Teto e meta de ' + monthName(month), fields: [{ name: 'cap', label: 'Teto de gastos do mês', type: 'money', value: set.expenseCap }, { name: 'goal', label: 'Meta de guardar', type: 'money', value: set.savingsGoal }],
      onSubmit: v => act('Planejamento salvo', f => { f.monthlyPlans = f.monthlyPlans.filter(p => p.month !== month); if (v.cap !== null || v.goal !== null) f.monthlyPlans.push({ month, expenseCap: v.cap, savingsGoal: v.goal }); }) });
  };

  /* ---------- Cartões ---------- */
  V.cartoes = () => {
    const f = F(), month = App.month, cards = f.budgets.filter(b => b.type === 'card' && b.active);
    let html = head('Cartões', 'Faturas, limites e assinaturas', addBtn('editCard', 'Cartão'), '#/mais') + monthNav();
    if (!cards.length) return html + App.empty('Nenhum cartão cadastrado.');
    const total = sum(cards, b => H.cardBill(f, b, month).amount);
    html += '<section class="hero slim"><small>Faturas de ' + monthName(month) + '</small><strong class="big">' + m(total) + '</strong></section><div class="cols">';
    for (const b of cards) {
      const bill = H.cardBill(f, b, month), used = H.cardUsed(f, b), inst = H.cardInstallments(f, b, month), rec = (b.recurringCharges || []), id = ' data-id="' + esc(b.id) + '"';
      html += '<section class="card"><div class="card-h"><h2>' + esc(H.cardName(b)) + '</h2><button class="link-btn" data-a="editCard"' + id + '>Editar</button></div>' +
        '<button class="bill-box" data-a="cardBill"' + id + ' data-month="' + month + '"><span><small>Fatura de ' + monthName(month) + (b.dueDay ? ' · vence dia ' + b.dueDay : '') + '</small><b>' + m(bill.amount) + '</b></span><span class="pill">' + (bill.informed ? 'Informada' : 'Estimada') + '</span></button>';
      if (b.creditLimit) html += '<div class="limit">' + bar(used / b.creditLimit * 100, used / b.creditLimit > 0.85 ? 'hot' : '') + '<small class="muted"><span>Usado ' + m(used) + '</span><span>Livre ' + m(Math.max(0, b.creditLimit - used)) + ' de ' + m(b.creditLimit) + '</span></small></div>';
      if (inst.length) html += '<h3>Parcelas neste mês</h3><div class="list">' + inst.map(e => '<button class="row" data-a="debt" data-id="' + esc(e.p.id) + '"><span class="row-main"><b>' + esc(e.p.name) + '</b><small>Parcela ' + (e.i + 1) + ' de ' + e.p.total + '</small></span><span class="row-amt">' + m(e.amount) + '</span></button>').join('') + '</div>';
      html += '<h3>Assinaturas</h3><div class="list">' + rec.map(r => '<button class="row' + (r.active ? '' : ' is-off') + '" data-a="editRecurring"' + id + ' data-rid="' + esc(r.id) + '"><span class="row-main"><b>' + esc(r.name) + '</b><small>' + (r.active ? (r.chargeDay ? 'Todo dia ' + r.chargeDay : 'Mensal') : 'Pausada') + '</small></span><span class="row-amt">' + m(r.amount) + '</span></button>').join('') +
        '<button class="row add" data-a="editRecurring"' + id + '>' + icon('plus') + 'Adicionar assinatura</button></div></section>';
    }
    return html + '</div>';
  };
  A.cardBill = ({ id, month }) => {
    const b = F().budgets.find(b => b.id === id), bill = H.cardBill(F(), b, month);
    UI.form({ title: 'Fatura ' + H.cardName(b) + ' · ' + H.monthShort(month), intro: 'Informe o valor fechado da fatura. Em branco, o app estima por parcelas e assinaturas (' + m(bill.installments + bill.recurring) + ').',
      fields: [{ name: 'amount', label: 'Valor da fatura', type: 'money', value: bill.informed ? bill.amount : null, hint: 'Use 0,00 se a fatura do mês já está quitada.' }],
      onSubmit: v => act('Fatura atualizada', f => upsertAllocation(f.budgets.find(b => b.id === id), 'm:' + month, v.amount)) });
  };
  A.editCard = ({ id }) => {
    const b = id ? F().budgets.find(b => b.id === id) : null;
    UI.form({ title: b ? 'Editar cartão' : 'Novo cartão',
      fields: [{ name: 'name', label: 'Nome do cartão', value: b ? b.name : '', required: true, max: 80, hint: 'As parcelas entram na fatura quando o banco da compra tem o mesmo nome.' }, { name: 'limit', label: 'Limite total', type: 'money', value: b ? b.creditLimit : null },
        { name: 'used', label: 'Limite usado hoje', type: 'money', value: b ? b.usedNow : null, hint: 'Em branco, o app soma parcelas em aberto e assinaturas.' }, { name: 'due', label: 'Dia do vencimento', type: 'number', value: b ? b.dueDay : null }],
      danger: b ? { label: 'Excluir cartão', onClick: () => A.delBudget({ id }) } : null,
      onSubmit: v => {
        if (v.due !== null && (v.due < 1 || v.due > 31)) return 'O dia do vencimento vai de 1 a 31.';
        if (F().budgets.some(x => x.type === 'card' && x.id !== id && H.canonicalBank(x.name) === H.canonicalBank(v.name))) return 'Já existe um cartão com esse nome.';
        act(b ? 'Cartão atualizado' : 'Cartão criado', f => {
          let c = f.budgets.find(b => b.id === id);
          if (!c) { c = { id: H.id(), type: 'card', frequency: 'monthly', amount: null, active: true, allocations: [], spendingCaps: [], recurringCharges: [] }; f.budgets.push(c); }
          Object.assign(c, { name: v.name, creditLimit: v.limit, usedNow: v.used, dueDay: v.due });
        });
      } });
  };
  A.editRecurring = ({ id, rid }) => {
    const b = F().budgets.find(b => b.id === id), r = rid ? b.recurringCharges.find(r => r.id === rid) : null;
    UI.form({ title: r ? 'Editar assinatura' : 'Nova assinatura', intro: H.cardName(b),
      fields: [{ name: 'name', label: 'Nome', value: r ? r.name : '', required: true, max: 80 }, { name: 'amount', label: 'Valor mensal', type: 'money', value: r ? r.amount : null, required: true }, { name: 'day', label: 'Dia da cobrança', type: 'number', value: r ? r.chargeDay : null },
        { name: 'active', label: 'Situação', type: 'select', value: r && !r.active ? '0' : '1', options: [['1', 'Ativa'], ['0', 'Pausada']], required: true }],
      danger: r ? { label: 'Excluir', onClick: () => act('Assinatura excluída', f => { const c = f.budgets.find(b => b.id === id); c.recurringCharges = c.recurringCharges.filter(x => x.id !== rid); }) } : null,
      onSubmit: v => {
        if (!v.amount) return 'Informe o valor mensal.';
        if (v.day !== null && (v.day < 1 || v.day > 31)) return 'O dia da cobrança vai de 1 a 31.';
        act('Assinatura salva', f => { const c = f.budgets.find(b => b.id === id); c.recurringCharges = c.recurringCharges || []; let x = c.recurringCharges.find(x => x.id === rid); if (!x) { x = { id: H.id() }; c.recurringCharges.push(x); } Object.assign(x, { name: v.name, amount: v.amount, chargeDay: v.day, active: v.active === '1' }); });
      } });
  };

  /* ---------- Dívidas e parcelas ---------- */
  const debtRow = p => {
    const next = H.nextEntry(p), paid = p.paid.length;
    return '<button class="row debt" data-a="debt" data-id="' + esc(p.id) + '"><span class="row-main"><b>' + esc(p.name) + '</b><small>' + esc(p.bank || 'Sem banco') + ' · ' + paid + ' de ' + p.total + ' pagas' + (next ? ' · próxima ' + H.shortDate(next.date) : '') + '</small>' + bar(paid / p.total * 100, 'thin') + '</span>' +
      '<span class="row-amt">' + (next ? m(H.remaining(p)) + '<small>' + m(p.amount) + ' por parcela</small>' : 'Quitado<small>' + m(p.total * p.amount) + '</small>') + '</span></button>';
  };
  V.dividas = () => {
    const f = F(), debt = H.debtSummary(f), free = H.debtFreeMonth(f);
    const nextDate = p => (H.nextEntry(p) || { date: '9999' }).date;
    const open = f.purchases.filter(p => !H.isSettled(p)).sort((a, b) => nextDate(a).localeCompare(nextDate(b))), done = f.purchases.filter(H.isSettled);
    let html = head('Dívidas', 'Parcelamentos e empréstimos', addBtn('editDebt', 'Nova'));
    html += '<section class="hero"><small>Falta quitar</small><strong class="big">' + m(debt.remaining) + '</strong>' + bar(debt.pct) +
      '<div class="hero-grid"><div><small>Parcelas deste mês</small><b>' + m(debt.monthly) + '</b><span>' + (debt.monthlyPending ? m(debt.monthlyPending) + ' em aberto' : 'tudo pago') + '</span></div><div><small>Livre de dívidas em</small><b>' + (free ? cap(H.monthShort(free)) : 'Já está') + '</b><span>' + debt.pct + '% já pago</span></div></div></section>';
    if (debt.overdue) html += '<div class="note warn">' + icon('alert') + '<p><b>' + m(debt.overdue) + ' em parcelas vencidas sem baixa.</b> Abra a dívida e marque as que já foram pagas.</p></div>';
    html += '<section class="card"><div class="card-h"><h2>Em andamento</h2><span class="muted">' + open.length + '</span></div>' + (open.length ? '<div class="list">' + open.map(debtRow).join('') + '</div>' : App.empty('Nenhuma dívida em aberto.')) + '</section>';
    if (done.length) html += '<section class="card"><div class="card-h"><h2>Quitados</h2><span class="muted">' + done.length + '</span></div><div class="list">' + done.map(debtRow).join('') + '</div></section>';
    return html;
  };
  A.debt = ({ id }) => {
    const p0 = F().purchases.find(p => p.id === id);
    if (!p0) return;
    UI.sheet({ title: p0.name, render: () => {
      const f = F(), p = f.purchases.find(p => p.id === id), today = H.today();
      if (!p) return '<p class="muted">Esta dívida foi excluída.</p>';
      const d = ' data-id="' + esc(p.id) + '"';
      return '<div class="trio two"><div><small>Falta</small><b>' + m(H.remaining(p)) + '</b></div><div><small>Total</small><b>' + m(p.total * p.amount) + '</b></div></div>' + bar(p.paid.length / p.total * 100) +
        '<small class="muted">' + esc(p.bank || 'Sem banco') + ' · ' + esc(H.personName(f, p.owner)) + ' · toque na parcela para marcar ou desmarcar</small>' +
        '<div class="list">' + H.entries(p).map(e => '<button class="row bill' + (e.paid ? ' is-paid' : '') + (!e.paid && e.date < today ? ' is-late' : '') + '" data-a="inst"' + d + ' data-i="' + e.i + '" aria-pressed="' + e.paid + '"><span class="check">' + (e.paid ? icon('check') : '') + '</span><span class="row-main"><b>Parcela ' + (e.i + 1) + ' de ' + p.total + '</b><small>' + H.dateLabel(e.date) + '</small></span><span class="row-amt">' + m(e.amount) + '</span></button>').join('') + '</div>' +
        '<div class="form-actions"><button class="btn ghost danger" data-a="delDebt"' + d + '>Excluir</button><button class="btn ghost" data-a="editDebt"' + d + '>Editar</button></div>';
    } });
  };
  A.inst = ({ id, i }) => { const n = Number(i); H.commit(f => { const p = f.purchases.find(p => p.id === id); p.paid = p.paid.includes(n) ? p.paid.filter(x => x !== n) : [...p.paid, n].sort((a, b) => a - b); }); };
  A.delDebt = ({ id }) => { const p = F().purchases.find(p => p.id === id); UI.confirm('Excluir "' + p.name + '"?', 'A dívida e o histórico das parcelas saem do app.', 'Excluir', () => act('Dívida excluída', f => { f.purchases = f.purchases.filter(p => p.id !== id); }), true); };
  A.editDebt = ({ id }) => {
    const f = F(), p = id ? f.purchases.find(p => p.id === id) : null, first = p ? H.dueDate(p, 0) : H.today();
    const banks = [...new Set([...f.budgets.filter(b => b.type === 'card').map(H.cardName), ...f.purchases.map(p => p.bank).filter(Boolean)])];
    UI.form({ title: p ? 'Editar dívida' : 'Nova dívida ou parcelamento',
      fields: [{ name: 'name', label: 'O que é', value: p ? p.name : '', required: true }, { name: 'bank', label: 'Cartão, banco ou pessoa', value: p ? p.bank : '', list: banks, max: 80, hint: 'Com o nome de um cartão, a parcela entra na fatura dele.' },
        { name: 'amount', label: 'Valor de cada parcela', type: 'money', value: p ? p.amount : null, required: true }, { name: 'total', label: 'Número de parcelas', type: 'number', value: p ? p.total : null, required: true },
        { name: 'first', label: 'Vencimento da 1ª parcela', type: 'date', value: first, required: true }, { name: 'paid', label: 'Parcelas já pagas', type: 'number', value: p ? p.paid.length : 0, required: true },
        { name: 'owner', label: 'De quem é', type: 'select', value: p ? p.owner : 2, options: [[0, f.names[0]], [1, f.names[1]], [2, 'Casal']], required: true },
        { name: 'category', label: 'Tipo', type: 'select', value: p ? p.category : 'shopping', options: [['shopping', 'Compra parcelada'], ['loan', 'Empréstimo'], ['other', 'Outro']].concat(p && !['shopping', 'loan', 'other'].includes(p.category) ? [[p.category, p.category]] : []), required: true }],
      onSubmit: v => {
        if (!v.amount) return 'Informe o valor da parcela.';
        if (v.total < 1 || v.total > 600) return 'O número de parcelas vai de 1 a 600.';
        if (v.paid > v.total) return 'As parcelas pagas não podem passar do total.';
        act(p ? 'Dívida atualizada' : 'Dívida criada', f => {
          let x = f.purchases.find(p => p.id === id);
          if (!x) { x = { id: H.id(), paid: [] }; f.purchases.push(x); }
          Object.assign(x, { name: v.name, bank: v.bank, amount: v.amount, total: v.total, owner: Number(v.owner), category: v.category });
          if (!p || v.first !== first) { x.anchor = v.first; x.anchorIndex = 0; x.day = Number(v.first.slice(8)); delete x.schedule; }
          if (!p || v.paid !== p.paid.length) x.paid = Array.from({ length: v.paid }, (_, i) => i);
          x.paid = x.paid.filter(i => i < v.total);
        });
      } });
  };

  /* ---------- Casa: contas fixas e caixinhas ---------- */
  V.casa = () => {
    const f = F(), month = App.month, week = H.weekStart(H.today());
    const fixed = f.budgets.filter(b => b.type === 'fixed' && b.active), env = f.budgets.filter(b => b.type === 'envelope' && b.active), off = f.budgets.filter(b => b.type !== 'card' && !b.active);
    let html = head('Casa', 'Contas fixas e caixinhas do dia a dia', '', '#/mais') + monthNav();
    html += '<section class="card"><div class="card-h"><h2>Contas fixas</h2>' + addBtn('editBudget', 'Conta', ' data-type="fixed"') + '</div>' + (fixed.length ? '<div class="list">' + fixed.map(b => {
      const v = H.limit(b, 'm:' + month), paid = H.spent(f, b, 'm:' + month);
      return '<button class="row" data-a="editBudget" data-id="' + esc(b.id) + '"><span class="row-main"><b>' + esc(b.name) + '</b><small>' + (b.dueDay ? 'Vence dia ' + b.dueDay : 'Sem dia de vencimento') + (paid ? ' · paga em ' + monthName(month) : '') + '</small></span><span class="row-amt">' + (v === null ? '<em>a informar</em>' : m(v)) + '</span></button>';
    }).join('') + '</div>' : App.empty('Nenhuma conta fixa.')) + '</section>';
    html += '<section class="card"><div class="card-h"><h2>Caixinhas</h2>' + addBtn('editBudget', 'Caixinha', ' data-type="envelope"') + '</div>' + (env.length ? '<div class="list">' + env.map(b => {
      const period = H.periodOf(b, month, week), lim = H.limit(b, period), spent = H.spent(f, b, period), id = ' data-id="' + esc(b.id) + '"';
      return '<div class="row env"><button class="row-main" data-a="editBudget"' + id + '><b>' + esc(b.name) + '</b><small>' + (b.frequency === 'weekly' ? 'Semana de ' + H.shortDate(week) : cap(monthName(month))) + ' · gasto ' + m(spent) + (lim === null ? ' · sem limite definido' : ' de ' + m(lim)) + '</small>' + (lim ? bar(spent / lim * 100, 'thin' + (spent > lim ? ' hot' : '')) : '') + '</button><button class="btn small" data-a="spend"' + id + '>' + icon('plus') + 'Gasto</button></div>';
    }).join('') + '</div>' : App.empty('Nenhuma caixinha.')) + '</section>';
    const recent = f.expenses.filter(e => { const b = f.budgets.find(b => b.id === e.budgetId); return b && b.type === 'envelope'; }).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);
    if (recent.length) html += '<section class="card"><div class="card-h"><h2>Últimos gastos</h2></div><div class="list">' + recent.map(e => '<button class="row" data-a="delRow" data-source="expense" data-id="' + esc(e.id) + '"><span class="row-main"><b>' + esc(e.description || f.budgets.find(b => b.id === e.budgetId).name) + '</b><small>' + H.shortDate(e.date) + ' · ' + esc(f.budgets.find(b => b.id === e.budgetId).name) + (e.method === 'credit' ? ' · crédito' : '') + '</small></span><span class="row-amt">' + m(e.amount) + '</span></button>').join('') + '</div></section>';
    if (off.length) html += '<section class="card"><div class="card-h"><h2>Desativadas</h2></div><div class="list">' + off.map(b => '<button class="row is-off" data-a="editBudget" data-id="' + esc(b.id) + '"><span class="row-main"><b>' + esc(b.name) + '</b></span></button>').join('') + '</div></section>';
    return html;
  };
  A.editBudget = ({ id, type }) => {
    const b = id ? F().budgets.find(b => b.id === id) : null, kind = b ? b.type : type, month = App.month;
    if (kind === 'card') return A.editCard({ id });
    const env = kind === 'envelope', period = b ? H.periodOf(b, month, H.weekStart(H.today())) : null, own = b ? b.allocations.find(a => a.period === period) : null;
    const fields = [{ name: 'name', label: 'Nome', value: b ? b.name : '', required: true, max: 80 }, { name: 'amount', label: env ? 'Limite padrão' : 'Valor padrão por mês', type: 'money', value: b ? b.amount : null }];
    if (env) fields.push({ name: 'frequency', label: 'Renova', type: 'select', value: b ? b.frequency : 'monthly', options: [['monthly', 'Todo mês'], ['weekly', 'Toda semana']], required: true });
    else fields.push({ name: 'due', label: 'Dia do vencimento', type: 'number', value: b ? b.dueDay : null });
    if (b) fields.push({ name: 'own', label: env && b.frequency === 'weekly' ? 'Limite só desta semana' : (env ? 'Limite' : 'Valor') + ' só de ' + H.monthShort(month), type: 'money', value: own ? own.amount : null, hint: 'Vale no lugar do padrão.' },
      { name: 'active', label: 'Situação', type: 'select', value: b.active ? '1' : '0', options: [['1', 'Ativa'], ['0', 'Desativada']], required: true });
    UI.form({ title: b ? 'Editar ' + b.name : (env ? 'Nova caixinha' : 'Nova conta fixa'), fields, danger: b ? { label: 'Excluir', onClick: () => A.delBudget({ id }) } : null,
      onSubmit: v => {
        if (!env && v.due !== null && (v.due < 1 || v.due > 31)) return 'O dia do vencimento vai de 1 a 31.';
        act(b ? 'Salvo' : 'Criado', f => {
          let x = f.budgets.find(b => b.id === id);
          if (!x) { x = { id: H.id(), type: kind, frequency: 'monthly', dueDay: null, active: true, allocations: [] }; f.budgets.push(x); }
          Object.assign(x, { name: v.name, amount: v.amount });
          if (env) x.frequency = v.frequency; else x.dueDay = v.due;
          if (b) { upsertAllocation(x, period, v.own); x.active = v.active === '1'; }
        });
      } });
  };
  A.delBudget = ({ id }) => {
    const b = F().budgets.find(b => b.id === id), n = F().expenses.filter(e => e.budgetId === id).length;
    UI.confirm('Excluir "' + b.name + '"?', n ? 'Os ' + n + ' lançamentos ligados a ela também saem, e o saldo é recalculado. Para guardar o histórico, prefira desativar.' : 'Ela sai do planejamento de todos os meses.', 'Excluir',
      () => act('Excluído', f => { f.budgets = f.budgets.filter(b => b.id !== id); f.expenses = f.expenses.filter(e => e.budgetId !== id); }), true);
  };
  A.spend = ({ id }) => {
    const b = F().budgets.find(b => b.id === id);
    UI.form({ title: 'Gasto em ' + b.name, fields: [{ name: 'amount', label: 'Valor', type: 'money', required: true }, { name: 'date', label: 'Data', type: 'date', value: H.today(), required: true }, { name: 'description', label: 'Descrição', value: '', max: 300 },
      { name: 'method', label: 'Como pagou', type: 'select', value: 'cash', options: [['cash', 'Pix, débito ou dinheiro (sai do saldo)'], ['credit', 'Cartão de crédito (entra na fatura)']], required: true }],
      onSubmit: v => { if (!v.amount) return 'Informe o valor.'; act('Gasto lançado', f => { f.expenses.push({ id: H.id(), budgetId: id, date: v.date, amount: v.amount, description: v.description, period: b.frequency === 'weekly' ? 'w:' + H.weekStart(v.date) : 'm:' + v.date.slice(0, 7), method: v.method }); }); } });
  };

  /* ---------- Entradas e saldo ---------- */
  V.caixa = () => {
    const f = F(), month = H.currentMonth(), cash = H.cashSummary(f, month), rows = H.cashRows(f), today = H.today();
    let html = head('Entradas e saldo', 'O que entrou, o que saiu e quanto tem em conta', '', '#/mais');
    html += '<section class="hero"><small>Saldo em conta</small><strong class="big ' + tone(cash.balance) + '">' + m(cash.balance) + '</strong>' +
      '<div class="hero-grid"><div><small>Entrou em ' + monthName(month) + '</small><b>' + m(cash.income) + '</b><span>' + (cash.future ? m(cash.future) + ' ainda a receber' : 'até hoje') + '</span></div><div><small>Saiu em ' + monthName(month) + '</small><b>' + m(cash.out) + '</b><span>pagamentos e saídas</span></div></div>' +
      '<div class="btn-row"><button class="btn primary" data-a="addReceipt">' + icon('plus') + 'Entrada</button><button class="btn" data-a="addOutflow">' + icon('plus') + 'Saída</button><button class="btn ghost" data-a="setBalance">Ajustar saldo</button></div></section>';
    if (f.cashOpening) html += '<p class="muted pad">Saldo conferido em ' + H.dateLabel(f.cashOpening.date) + ': ' + m(f.cashOpening.amount) + '. Dali em diante o app soma as entradas e desconta as saídas.</p>';
    html += '<section class="card"><div class="card-h"><h2>Movimentações</h2><span class="muted">toque para excluir</span></div>' + (rows.length ? '<div class="list">' + rows.slice(0, 60).map(r =>
      '<button class="row" data-a="delRow" data-source="' + r.source + '" data-id="' + esc(r.id) + '"><span class="row-ic ' + (r.direction === 'in' ? 'ok' : r.direction === 'credit' ? '' : 'out') + '">' + icon(r.direction === 'credit' ? 'card' : 'swap') + '</span><span class="row-main"><b>' + esc(r.description || 'Sem descrição') + '</b><small>' + H.shortDate(r.date) + ' · ' + esc(r.who) + (r.date > today ? ' · previsto' : '') + (r.direction === 'credit' ? ' · no crédito' : '') + '</small></span><span class="row-amt ' + (r.direction === 'in' ? 'pos' : '') + '">' + (r.direction === 'in' ? '+ ' : r.direction === 'out' ? '− ' : '') + m(r.amount) + '</span></button>').join('') + '</div>' : App.empty('Nenhuma movimentação ainda.')) + '</section>';
    return html;
  };
  A.addReceipt = ({ date }) => {
    const f = F();
    UI.form({ title: 'Nova entrada', fields: [{ name: 'amount', label: 'Valor', type: 'money', required: true }, { name: 'date', label: 'Data', type: 'date', value: date || H.today(), required: true, hint: 'Com data futura, entra como previsto e só soma no saldo quando chegar o dia.' },
      { name: 'description', label: 'Descrição', value: 'Salário', required: true, max: 300 }, { name: 'owner', label: 'De quem', type: 'select', value: 2, options: [[0, f.names[0]], [1, f.names[1]], [2, 'Casal']], required: true }, { name: 'kind', label: 'Tipo', type: 'select', value: 'salary', options: [['salary', 'Salário'], ['other', 'Outra entrada']], required: true }],
      onSubmit: v => { if (!v.amount) return 'Informe o valor.'; act('Entrada lançada', f => { f.receipts.push({ id: H.id(), date: v.date, amount: v.amount, description: v.description, owner: Number(v.owner), kind: v.kind }); }); } });
  };
  A.addOutflow = () => UI.form({ title: 'Nova saída avulsa', intro: 'Para gastos fora das contas, faturas e caixinhas.', fields: [{ name: 'amount', label: 'Valor', type: 'money', required: true }, { name: 'date', label: 'Data', type: 'date', value: H.today(), required: true }, { name: 'description', label: 'Descrição', value: '', required: true, max: 300 }],
    onSubmit: v => { if (!v.amount) return 'Informe o valor.'; act('Saída lançada', f => { f.outflows.push({ id: H.id(), date: v.date, amount: v.amount, description: v.description }); }); } });
  A.setBalance = () => UI.form({ title: 'Ajustar saldo', intro: 'Informe quanto tem em conta hoje. O app passa a contar a partir deste valor; lançamentos anteriores a hoje deixam de entrar na conta.',
    fields: [{ name: 'amount', label: 'Saldo em conta hoje', type: 'money', value: H.state.finance.cashOpening ? H.cashSummary(F(), H.currentMonth()).balance : null, required: true }],
    onSubmit: v => act('Saldo ajustado', f => {
      const today = H.today(), same = H.sum(H.cashRows(f).filter(r => r.date === today), r => r.direction === 'in' ? r.amount : r.direction === 'out' ? -r.amount : 0);
      f.cashOpening = { date: today, amount: v.amount - same }; // desconta o que já foi lançado hoje, para o saldo bater com o valor informado
    }) });
  A.delRow = ({ source, id }) => {
    const key = { receipt: 'receipts', outflow: 'outflows', expense: 'expenses' }[source], row = F()[key].find(r => r.id === id);
    if (!row) return;
    UI.confirm('Excluir lançamento?', (row.description || 'Lançamento') + ' · ' + m(row.amount) + ' · ' + H.dateLabel(row.date), 'Excluir', () => act('Lançamento excluído', f => { f[key] = f[key].filter(r => r.id !== id); }), true);
  };
})();
