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
    /* valor já conhecido: um toque paga (dá para desfazer no aviso) */
    if (it.kind === 'fixed' || it.bill.informed) return act('Pago: ' + it.title + ' · ' + m(it.amount), f => { f.expenses.push({ id: H.id(), budgetId: id, date: H.today(), amount: it.amount, description: 'Pagamento', period, method: 'cash' }); });
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
    const plan = H.monthPlan(f, month), income = H.monthIncome(f, month);
    const list = H.monthChecklist(f, month), open = list.filter(i => !i.paid), openSum = sum(open, i => i.amount || 0);
    const debt = H.debtSummary(f), free = H.debtFreeMonth(f);
    const late = open.filter(i => i.date && i.date < today).length;
    const focus = hz.goals.find(g => g.id === hz.focus && g.status !== 'done'), att = H.attentions(hz);
    let html = head('Início', cap(H.WEEKDAYS[H.parseDate(today).getDay()]) + ', ' + H.dateLabel(today), App.homeButtons ? App.homeButtons() : '');
    const saved = H.savedSummary(f), bills = list.filter(i => i.kind === 'card'), billsOpen = bills.filter(i => !i.paid);
    html += '<section class="hero"><small>Guardado</small>' +
      (saved.count ? '<a class="big-link" href="#/guardado"><strong class="big">' + m(saved.total) + '</strong></a>' : '<a class="btn primary" href="#/guardado">Informar o que tenho guardado</a>') +
      '<div class="hero-grid"><div><small>Faturas de ' + monthName(month) + '</small><b>' + m(plan.cards) + '</b><span>' + (billsOpen.length ? billsOpen.length + (billsOpen.length === 1 ? ' em aberto' : ' em aberto') : 'tudo pago') + '</span></div>' +
      '<div><small>Empréstimos e parcelas</small><b>' + m(debt.remaining) + '</b><span>' + (debt.monthly ? m(debt.monthly) + ' neste mês' : 'falta quitar') + '</span></div></div></section>';
    /* avisos: só o mais importante aparece; o resto fica um toque abaixo */
    const notes = (late ? ['<a class="note warn" href="#/mes">' + icon('alert') + '<p><b>' + late + (late === 1 ? ' conta vencida' : ' contas vencidas') + ' sem baixa.</b> Se já pagou, marque como paga.</p></a>'] : []).concat(App.homeNotes ? App.homeNotes(f, list) : []);
    if (notes.length) html += notes[0] + (notes.length > 1 ? App.fold('avisos', '<span class="row-main">Mais ' + (notes.length - 1) + (notes.length === 2 ? ' aviso' : ' avisos') + '</span>', notes.slice(1).join(''), 'plain') : '');
    html += '<section class="card"><div class="card-h"><h2>Próximos vencimentos</h2><a href="#/mes">Ver todos</a></div>' +
      (open.length ? '<div class="list">' + open.slice(0, 4).map(i => billRow(i, month)).join('') + '</div>' + (open.length > 4 ? '<a class="more" href="#/mes">mais ' + (open.length - 4) + ' em aberto · ' + m(openSum) + ' no total</a>' : '') : App.empty('Nada em aberto em ' + monthName(month) + '.')) + '</section>';
    const link = (href, ic, title, sub, amt) => '<a class="row link" href="' + href + '"><span class="row-ic">' + icon(ic) + '</span><span class="row-main"><b>' + title + '</b><small>' + sub + '</small></span><span class="row-amt">' + amt + '</span></a>';
    html += '<h2 class="sec">Resumo</h2><div class="list card">' +
      link('#/mes', 'calendar', cap(monthName(month)), 'Entra ' + m(income) + ' · sai ' + m(plan.total), '<span class="' + tone(income - plan.total) + '">' + m(income - plan.total) + '</span><small>sobra prevista</small>') +
      link('#/dividas', 'wallet', 'Dívidas', debt.pct + '% pago · ' + debt.pending + ' parcelas restantes', (free ? cap(H.monthShort(free)) : 'Quitadas') + '<small>' + (free ? 'fim das dívidas' : 'nada a pagar') + '</small>') +
      (focus ? link('#/objetivo/' + encodeURIComponent(focus.id), 'star', esc(focus.title), 'Foco do ano · ' + esc(H.goalHeadline(focus, f)), H.goalPercent(focus, f) + '%') : '') +
      (att.length ? link('#/objetivos', 'clock', att.length + (att.length === 1 ? ' pendência nos objetivos' : ' pendências nos objetivos'), esc(att[0].title), '') : '') + '</div>';
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
    let html = head('Mês') + monthNav();
    html += '<section class="hero"><small>Sobra prevista' + (plan.unknown ? ' (parcial)' : '') + '</small><strong class="big ' + tone(left) + '">' + m(left) + '</strong>' +
      '<div class="hero-grid"><div><small>Entradas</small><b>' + m(income) + '</b><span>' + (income ? 'lançadas no mês' : 'nenhuma lançada') + '</span></div><div><small>Comprometido</small><b>' + m(plan.total) + '</b><span>' + paid.length + ' de ' + list.length + ' pagas</span></div></div></section>';
    if (plan.unknown) html += '<div class="note warn">' + icon('alert') + '<p>' + plan.unknown + (plan.unknown === 1 ? ' valor ainda não foi informado' : ' valores ainda não foram informados') + '. A sobra pode ser menor.</p></div>';
    if (!income) html += '<div class="note">' + icon('swap') + '<p>Sem entradas lançadas em ' + monthName(month) + '. ' + '<button class="inline" data-a="addReceipt" data-date="' + month + '-05">Lançar salário previsto</button></p></div>';
    html += '<section class="card"><div class="card-h"><h2>Contas de ' + monthName(month) + '</h2><span class="muted">' + m(sum(list.filter(i => !i.paid), i => i.amount || 0)) + ' em aberto</span></div>' +
      (list.length ? '<div class="list">' + list.map(i => billRow(i, month)).join('') + '</div>' : App.empty('Nenhuma conta neste mês.')) + '</section>';
    const proj = H.projection(f, H.currentMonth(), 14), max = Math.max(1, ...proj.map(p => p.total));
    const sm = (title, sub) => '<span class="row-main"><b>' + title + '</b><small>' + sub + '</small></span>';
    html += '<h2 class="sec">Detalhes</h2><section class="card folds">' +
      App.fold('mes-comp', sm('Para onde vai', 'Contas fixas, cartões e parcelas'), composition(plan)) +
      App.fold('mes-plan', sm('Teto e meta', set.expenseCap === null && set.savingsGoal === null ? 'Não definidos' : 'Teto ' + (set.expenseCap === null ? '—' : m(set.expenseCap)) + ' · guardar ' + (set.savingsGoal === null ? '—' : m(set.savingsGoal))),
        '<div class="trio two"><div><small>Teto de gastos</small><b>' + (set.expenseCap === null ? '—' : m(set.expenseCap)) + '</b>' + (set.expenseCap === null ? '' : '<span class="' + tone(set.expenseCap - plan.total) + '">' + (set.expenseCap >= plan.total ? m(set.expenseCap - plan.total) + ' de folga' : m(plan.total - set.expenseCap) + ' acima') + '</span>') + '</div>' +
        '<div><small>Meta de guardar</small><b>' + (set.savingsGoal === null ? '—' : m(set.savingsGoal)) + '</b>' + (set.savingsGoal === null ? '' : '<span class="' + tone(left - set.savingsGoal) + '">' + (left >= set.savingsGoal ? 'cabe na sobra' : 'faltam ' + m(set.savingsGoal - left)) + '</span>') + '</div></div>' +
        '<button class="btn small" data-a="editPlan">' + icon('edit') + 'Editar teto e meta</button>') +
      App.fold('mes-proj', sm('Próximos meses', 'O que já está comprometido até ' + H.monthShort(proj[proj.length - 1].month)), '<div class="list">' +
        proj.map(p => '<button class="row proj' + (p.month === month ? ' on' : '') + '" data-a="monthSet" data-month="' + p.month + '"><span class="proj-m">' + H.monthShort(p.month) + '</span><span class="row-main">' + bar(p.total / max * 100, 'thin') + '</span><span class="row-amt">' + m(p.total) + (p.income ? '<small class="' + tone(p.left) + '">sobra ' + m(p.left) + '</small>' : '') + '</span></button>').join('') + '</div>') + '</section>';
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
    let html = head('Cartões', '', addBtn('editCard', 'Cartão'), '#/mais') + monthNav();
    if (!cards.length) return html + App.empty('Nenhum cartão cadastrado.');
    const total = sum(cards, b => H.cardBill(f, b, month).amount);
    html += '<section class="hero slim"><small>Faturas de ' + monthName(month) + '</small><strong class="big">' + m(total) + '</strong></section><div class="cols">';
    for (const b of cards) {
      const bill = H.cardBill(f, b, month), used = H.cardUsed(f, b), inst = H.cardInstallments(f, b, month), rec = (b.recurringCharges || []), id = ' data-id="' + esc(b.id) + '"';
      const pct = b.creditLimit ? used / b.creditLimit : 0, n = inst.length + rec.filter(r => r.active).length;
      html += '<section class="card folds">' + App.fold('card-' + b.id,
        '<span class="row-main"><b>' + esc(H.cardName(b)) + '</b><small>' + (b.dueDay ? 'Vence dia ' + b.dueDay + ' · ' : '') + (bill.informed ? 'fatura informada' : 'fatura estimada') + '</small>' + (b.creditLimit ? bar(pct * 100, 'thin' + (pct > 0.85 ? ' hot' : '')) : '') + '</span><span class="row-amt">' + m(bill.amount) + '<small>' + n + (n === 1 ? ' item' : ' itens') + '</small></span>',
        '<div class="btn-row"><button class="btn small" data-a="cardBill"' + id + ' data-month="' + month + '">Informar fatura</button><button class="btn small ghost" data-a="editCard"' + id + '>Editar cartão</button></div>' +
        (b.creditLimit ? '<small class="muted">Limite: usado ' + m(used) + ' · livre ' + m(Math.max(0, b.creditLimit - used)) + ' de ' + m(b.creditLimit) + '</small>' : '') +
        (inst.length ? '<h3>Parcelas neste mês</h3><div class="list">' + inst.map(e => '<button class="row" data-a="debt" data-id="' + esc(e.p.id) + '"><span class="row-main"><b>' + esc(e.p.name) + '</b><small>Parcela ' + (e.i + 1) + ' de ' + e.p.total + '</small></span><span class="row-amt">' + m(e.amount) + '</span></button>').join('') + '</div>' : '') +
        '<h3>Assinaturas</h3><div class="list">' + rec.map(r => '<button class="row' + (r.active ? '' : ' is-off') + '" data-a="editRecurring"' + id + ' data-rid="' + esc(r.id) + '"><span class="row-main"><b>' + esc(r.name) + '</b><small>' + (r.active ? (r.chargeDay ? 'Todo dia ' + r.chargeDay : 'Mensal') : 'Pausada') + '</small></span><span class="row-amt">' + m(r.amount) + '</span></button>').join('') +
        '<button class="row add" data-a="editRecurring"' + id + '>' + icon('plus') + 'Adicionar assinatura</button></div>') + '</section>';
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
    let html = head('Dívidas', '', addBtn('editDebt', 'Nova'));
    html += '<section class="hero"><small>Falta quitar</small><strong class="big">' + m(debt.remaining) + '</strong>' + bar(debt.pct) +
      '<div class="hero-grid"><div><small>Parcelas deste mês</small><b>' + m(debt.monthly) + '</b><span>' + (debt.monthlyPending ? m(debt.monthlyPending) + ' em aberto' : 'tudo pago') + '</span></div><div><small>Livre de dívidas em</small><b>' + (free ? cap(H.monthShort(free)) : 'Já está') + '</b><span>' + debt.pct + '% já pago</span></div></div></section>';
    if (free) html += '<button class="note" data-a="simulate">' + icon('target') + '<p><b>E se eu pagar um extra por mês?</b> Simule em que mês você fica livre das dívidas.</p></button>';
    if (debt.overdue) html += '<div class="note warn">' + icon('alert') + '<p><b>' + m(debt.overdue) + ' em parcelas vencidas sem baixa.</b> Abra a dívida e marque as que já foram pagas.</p></div>';
    html += '<section class="card"><div class="card-h"><h2>Em andamento</h2><span class="muted">' + open.length + '</span></div>' + (open.length ? '<div class="list">' + open.map(debtRow).join('') + '</div>' : App.empty('Nenhuma dívida em aberto.')) + '</section>';
    if (done.length) html += '<section class="card folds">' + App.fold('div-done', '<span class="row-main"><b>Quitados</b><small>' + done.length + (done.length === 1 ? ' dívida encerrada' : ' dívidas encerradas') + '</small></span>', '<div class="list">' + done.map(debtRow).join('') + '</div>') + '</section>';
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
    let html = head('Casa', '', '', '#/mais') + monthNav();
    html += '<section class="card"><div class="card-h"><h2>Contas fixas</h2>' + addBtn('editBudget', 'Conta', ' data-type="fixed"') + '</div>' + (fixed.length ? '<div class="list">' + fixed.map(b => {
      const v = H.limit(b, 'm:' + month), paid = H.spent(f, b, 'm:' + month);
      return '<button class="row" data-a="editBudget" data-id="' + esc(b.id) + '"><span class="row-main"><b>' + esc(b.name) + '</b><small>' + (b.dueDay ? 'Vence dia ' + b.dueDay : 'Sem dia de vencimento') + (paid ? ' · paga em ' + monthName(month) : '') + '</small></span><span class="row-amt">' + (v === null ? '<em>a informar</em>' : m(v)) + '</span></button>';
    }).join('') + '</div>' : App.empty('Nenhuma conta fixa.')) + '</section>';
    html += '<section class="card"><div class="card-h"><h2>Caixinhas</h2>' + addBtn('editBudget', 'Caixinha', ' data-type="envelope"') + '</div>' + (env.length ? '<div class="list">' + env.map(b => {
      const period = H.periodOf(b, month, week), lim = H.limit(b, period), spent = H.spent(f, b, period), id = ' data-id="' + esc(b.id) + '"';
      return '<div class="row env"><button class="row-main" data-a="editBudget"' + id + '><b>' + esc(b.name) + '</b><small>' + (b.frequency === 'weekly' ? 'Semana de ' + H.shortDate(week) : cap(monthName(month))) + ' · gasto ' + m(spent) + (lim === null ? ' · sem limite definido' : ' de ' + m(lim)) + '</small>' + (lim ? bar(spent / lim * 100, 'thin' + (spent > lim ? ' hot' : '')) : '') + '</button><button class="btn small" data-a="spend"' + id + '>' + icon('plus') + 'Gasto</button></div>';
    }).join('') + '</div>' : App.empty('Nenhuma caixinha.')) + '</section>';
    const recent = f.expenses.filter(e => { const b = f.budgets.find(b => b.id === e.budgetId); return b && b.type === 'envelope'; }).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
    const spentRow = e => { const b = f.budgets.find(b => b.id === e.budgetId); return '<button class="row" data-a="delRow" data-source="expense" data-id="' + esc(e.id) + '"><span class="row-main"><b>' + esc(e.description || b.name) + '</b><small>' + H.shortDate(e.date) + ' · ' + esc(b.name) + (e.method === 'credit' ? ' · crédito' : '') + '</small></span><span class="row-amt">' + m(e.amount) + '</span></button>'; };
    if (recent.length) html += '<section class="card"><div class="card-h"><h2>Últimos gastos</h2></div><div class="list">' + recent.slice(0, 5).map(spentRow).join('') + '</div>' +
      (recent.length > 5 ? App.fold('casa-mais', '<span class="row-main">Ver mais ' + (recent.length - 5) + '</span>', '<div class="list">' + recent.slice(5).map(spentRow).join('') + '</div>', 'plain') : '') + '</section>';
    if (off.length) html += '<section class="card folds">' + App.fold('casa-off', '<span class="row-main"><b>Desativadas</b><small>' + off.length + (off.length === 1 ? ' conta ou caixinha' : ' contas ou caixinhas') + '</small></span>', '<div class="list">' + off.map(b => '<button class="row is-off" data-a="editBudget" data-id="' + esc(b.id) + '"><span class="row-main"><b>' + esc(b.name) + '</b></span></button>').join('') + '</div>') + '</section>';
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
    let html = head('Entradas e saídas', 'Opcional', '', '#/mais');
    html += '<section class="hero"><small>Saldo em conta</small><strong class="big ' + tone(cash.balance) + '">' + m(cash.balance) + '</strong>' +
      '<div class="hero-grid"><div><small>Entrou em ' + monthName(month) + '</small><b>' + m(cash.income) + '</b><span>' + (cash.future ? m(cash.future) + ' ainda a receber' : 'até hoje') + '</span></div><div><small>Saiu em ' + monthName(month) + '</small><b>' + m(cash.out) + '</b><span>pagamentos e saídas</span></div></div>' +
      '<div class="btn-row"><button class="btn primary" data-a="addReceipt">' + icon('plus') + 'Entrada</button><button class="btn" data-a="addOutflow">' + icon('plus') + 'Saída</button><button class="btn ghost" data-a="setBalance">Ajustar saldo</button></div></section>';
    if (f.cashOpening) html += '<p class="muted pad">Saldo conferido em ' + H.dateLabel(f.cashOpening.date) + ': ' + m(f.cashOpening.amount) + '. Dali em diante o app soma as entradas e desconta as saídas.</p>';
    const moveRow = r => '<button class="row" data-a="delRow" data-source="' + r.source + '" data-id="' + esc(r.id) + '"><span class="row-ic ' + (r.direction === 'in' ? 'ok' : r.direction === 'credit' ? '' : 'out') + '">' + icon(r.direction === 'credit' ? 'card' : 'swap') + '</span><span class="row-main"><b>' + esc(r.description || 'Sem descrição') + '</b><small>' + H.shortDate(r.date) + ' · ' + esc(r.who) + (r.date > today ? ' · previsto' : '') + (r.direction === 'credit' ? ' · no crédito' : '') + '</small></span><span class="row-amt ' + (r.direction === 'in' ? 'pos' : '') + '">' + (r.direction === 'in' ? '+ ' : r.direction === 'out' ? '− ' : '') + m(r.amount) + '</span></button>';
    const shown = rows.slice(0, 60);
    html += '<section class="card"><div class="card-h"><h2>Movimentações</h2><span class="muted">toque para excluir</span></div>' + (rows.length ? '<div class="list">' + shown.slice(0, 10).map(moveRow).join('') + '</div>' +
      (shown.length > 10 ? App.fold('caixa-mais', '<span class="row-main">Ver mais ' + (shown.length - 10) + '</span>', '<div class="list">' + shown.slice(10).map(moveRow).join('') + '</div>', 'plain') : '') : App.empty('Nenhuma movimentação ainda.')) + '</section>';
    return html;
  };
  A.addReceipt = ({ date }) => {
    const f = F();
    UI.form({ title: 'Nova entrada', fields: [{ name: 'amount', label: 'Valor', type: 'money', required: true }, { name: 'date', label: 'Data', type: 'date', value: date || H.today(), required: true, hint: 'Com data futura, entra como previsto e só soma no saldo quando chegar o dia.' },
      { name: 'description', label: 'Descrição', value: 'Salário', required: true, max: 300 }, { name: 'owner', label: 'De quem', type: 'select', value: 2, options: [[0, f.names[0]], [1, f.names[1]], [2, 'Casal']], required: true }, { name: 'kind', label: 'Tipo', type: 'select', value: 'salary', options: [['salary', 'Salário'], ['other', 'Outra entrada']], required: true }],
      onSubmit: v => { if (!v.amount) return 'Informe o valor.'; act('Entrada lançada', f => { f.receipts.push({ id: H.id(), date: v.date, amount: v.amount, description: v.description, owner: Number(v.owner), kind: v.kind }); }); } });
  };
  A.addOutflow = () => {
    const env = H.envelopes(F());
    UI.form({ title: 'Nova saída', intro: env.length ? 'Pela descrição, o app escolhe a caixinha sozinho. Dá para desfazer.' : 'Para gastos fora das contas, faturas e caixinhas.', fields: [{ name: 'amount', label: 'Valor', type: 'money', required: true }, { name: 'date', label: 'Data', type: 'date', value: H.today(), required: true }, { name: 'description', label: 'Descrição', value: '', required: true, max: 300, hint: env.length ? 'Ex.: Supermercado, Uber, Farmácia' : '' }]
        .concat(env.length ? [{ name: 'cat', label: 'Caixinha', type: 'select', value: 'auto', options: [['auto', 'Escolher sozinho'], ['', 'Nenhuma (saída avulsa)'], ...env.map(b => [b.id, b.name])] }] : []),
      onSubmit: v => {
        if (!v.amount) return 'Informe o valor.';
        const id = v.cat === 'auto' ? H.guessBudget(F(), v.description) : v.cat, b = id && env.find(b => b.id === id);
        if (b) act('Lançado em ' + b.name, f => { f.expenses.push({ id: H.id(), budgetId: b.id, date: v.date, amount: v.amount, description: v.description, period: H.expensePeriod(b, v.date), method: 'cash' }); });
        else act('Saída lançada', f => { f.outflows.push({ id: H.id(), date: v.date, amount: v.amount, description: v.description }); });
      } });
  };
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
