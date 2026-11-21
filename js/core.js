/* Horizonte — núcleo: datas, dinheiro, dados e cálculos.
   Sem dependências. Funciona no navegador (window.H) e no Node (module.exports) para testes.
   O formato dos dados é o mesmo do backup "adois-horizonte" v1, para importar e exportar sem perda. */
(function (root) {
  'use strict';
  const H = {};

  /* ---------- datas ---------- */
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  H.iso = iso;
  H._today = null; // os testes podem fixar a data
  H.today = () => H._today || iso(new Date());
  H.parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  H.addDays = (s, n) => { const d = H.parseDate(s); d.setDate(d.getDate() + n); return iso(d); };
  H.diffDays = s => Math.round((H.parseDate(s) - H.parseDate(H.today())) / 86400000);
  H.daysInMonth = (y, m) => new Date(y, m, 0).getDate();
  H.validDate = s => {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const d = H.parseDate(s);
    return iso(d) === s && d.getFullYear() >= 1900 && d.getFullYear() <= 2200;
  };
  H.validMonth = s => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
  /* desloca n meses mantendo o dia (ou dayOverride), limitado ao fim do mês */
  H.shiftMonth = (s, n, dayOverride) => {
    let [y, m, d] = s.split('-').map(Number);
    const serial = y * 12 + m - 1 + n;
    y = Math.floor(serial / 12); m = serial - y * 12 + 1;
    d = Math.min(dayOverride || d, H.daysInMonth(y, m));
    return String(y).padStart(4, '0') + '-' + pad(m) + '-' + pad(d);
  };
  H.monthOf = s => s.slice(0, 7);
  H.currentMonth = () => H.today().slice(0, 7);
  H.addMonths = (key, n) => H.shiftMonth(key + '-01', n).slice(0, 7);
  H.dayInMonth = (key, day) => {
    const [y, m] = key.split('-').map(Number);
    return key + '-' + pad(Math.min(day, H.daysInMonth(y, m)));
  };
  H.weekStart = date => {
    const v = H.parseDate(date);
    v.setDate(v.getDate() - ((v.getDay() + 6) % 7));
    return iso(v);
  };
  const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const LONG_MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  H.MONTHS = MONTHS; H.LONG_MONTHS = LONG_MONTHS; H.WEEKDAYS = WEEKDAYS;
  H.monthLabel = key => { const [y, m] = key.split('-').map(Number); return LONG_MONTHS[m - 1] + ' de ' + y; };
  H.monthShort = key => { const [y, m] = key.split('-').map(Number); return MONTHS[m - 1] + '/' + String(y).slice(2); };
  H.dateLabel = s => { if (!s) return 'Sem data'; const d = H.parseDate(s); return d.getDate() + ' de ' + LONG_MONTHS[d.getMonth()] + ' de ' + d.getFullYear(); };
  H.shortDate = s => { if (!s) return 'Sem data'; const d = H.parseDate(s); return d.getDate() + ' ' + MONTHS[d.getMonth()]; };
  H.relative = s => {
    if (!s) return 'Sem prazo';
    const n = H.diffDays(s);
    if (n < -1) return 'Atrasado ' + (-n) + ' dias';
    if (n === -1) return 'Venceu ontem';
    if (n === 0) return 'Hoje';
    if (n === 1) return 'Amanhã';
    if (n <= 30) return 'Em ' + n + ' dias';
    return H.shortDate(s);
  };

  /* ---------- dinheiro (sempre em centavos inteiros) ---------- */
  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const usdFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' });
  const numFmt = new Intl.NumberFormat('pt-BR');
  H.money = c => brl.format((c || 0) / 100).replace(/ /g, ' ');
  H.usd = c => usdFmt.format((c || 0) / 100).replace(/ /g, ' ');
  H.number = n => numFmt.format(n);
  H.moneyInput = c => (c === null || c === undefined) ? '' : (c / 100).toFixed(2).replace('.', ',');
  /* aceita "1.234,56", "1234,5", "1234.56", "R$ 10" → centavos; devolve NaN se inválido */
  H.parseMoney = str => {
    let t = String(str === null || str === undefined ? '' : str).replace(/[^\d.,-]/g, '');
    if (!t || t === '-') return NaN;
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    const v = Number(t);
    return Number.isFinite(v) ? Math.round(v * 100) : NaN;
  };
  H.id = () => (root.crypto && root.crypto.randomUUID) ? root.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  const sum = (list, f) => list.reduce((n, x) => n + f(x), 0);

  /* ---------- parcelas / dívidas ---------- */
  H.dueDate = (p, i) => (Array.isArray(p.schedule) && p.schedule[i]) ? p.schedule[i] : H.shiftMonth(p.anchor, i - p.anchorIndex, p.day);
  H.entries = p => { const paid = new Set(p.paid); return Array.from({ length: p.total }, (_, i) => ({ p, i, date: H.dueDate(p, i), paid: paid.has(i), amount: p.amount })); };
  H.allEntries = list => list.flatMap(H.entries).sort((a, b) => a.date.localeCompare(b.date));
  H.remaining = p => (p.total - p.paid.length) * p.amount;
  H.isSettled = p => p.paid.length >= p.total;
  H.nextEntry = p => H.entries(p).find(e => !e.paid) || null;
  H.debtSummary = f => {
    const today = H.today(), month = today.slice(0, 7);
    let total = 0, paid = 0, pending = 0, monthly = 0, monthlyPending = 0, overdue = 0;
    for (const p of f.purchases) {
      total += p.total * p.amount; paid += p.paid.length * p.amount; pending += p.total - p.paid.length;
      for (const e of H.entries(p)) {
        if (e.date.startsWith(month)) { monthly += p.amount; if (!e.paid) monthlyPending += p.amount; }
        if (!e.paid && e.date < today) overdue += p.amount;
      }
    }
    return { total, paid, remaining: total - paid, pending, monthly, monthlyPending, overdue, pct: total ? Math.round(paid / total * 100) : 0 };
  };
  /* mês em que a última parcela em aberto vence */
  H.debtFreeMonth = f => {
    const open = H.allEntries(f.purchases).filter(e => !e.paid);
    return open.length ? open[open.length - 1].date.slice(0, 7) : null;
  };

  /* com um extra por mês adiantando as últimas parcelas, em que mês as dívidas acabam */
  H.payoffWithExtra = (f, extra) => {
    let open = H.allEntries(f.purchases).filter(e => !e.paid), month = H.currentMonth(), pot = 0;
    if (!open.length) return null;
    for (let n = 0; n < 720; n++) {
      open = open.filter(e => e.date.slice(0, 7) > month);
      pot += extra;
      while (open.length && pot >= open[open.length - 1].amount) pot -= open.pop().amount;
      if (!open.length) return month;
      month = H.addMonths(month, 1);
    }
    return null;
  };
  /* faturas informadas que vieram bem acima da média dos 3 meses anteriores */
  H.cardAlerts = (f, month) => H.activeCards(f).map(b => {
    const now = H.limit(b, 'm:' + month);
    const prev = [1, 2, 3].map(n => (b.allocations.find(a => a.period === 'm:' + H.addMonths(month, -n)) || {}).amount).filter(v => v > 0);
    if (!b.allocations.some(a => a.period === 'm:' + month) || prev.length < 2) return null;
    const avg = Math.round(sum(prev, v => v) / prev.length), pct = Math.round((now / avg - 1) * 100);
    return pct >= 30 ? { name: H.cardName(b), amount: now, avg, pct } : null;
  }).filter(Boolean);

  /* ---------- categoria automática: em qual caixinha um gasto cai ---------- */
  const plain = s => ' ' + String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
  const NOISE = new Set('compra compras debito credito pix enviado enviada recebido transferencia pagamento pagto pag cartao no na de do da em via para loja ltda sa me eireli'.split(' '));
  /* "nome" do lugar: as duas primeiras palavras úteis da descrição */
  H.merchantKey = d => plain(d).split(' ').filter(w => w.length > 1 && !/^\d+$/.test(w) && !NOISE.has(w)).slice(0, 2).join(' ');
  /* [nomes de caixinha que servem, palavras que aparecem na descrição do gasto] */
  const GROUPS = [
    [['mercado', 'supermercado', 'feira', 'compras do mes'], [' mercado ', 'supermerc', 'atacad', ' assai ', 'carrefour', 'hortifruti', 'sacolao', 'acougue', 'padaria', 'pao de acucar', 'mercearia', 'emporio', ' feira ']],
    [['restaurante', 'ifood', 'delivery', 'lanche', 'comer fora', 'alimentacao', 'comida'], ['ifood', 'restaurante', 'lanch', 'pizza', 'burger', 'mcdonald', 'mc donald', 'rappi', ' cafe', 'churrasc', 'sushi', 'pastel', 'sorvet', 'acai']],
    [['transporte', 'combustivel', 'gasolina', 'carro', 'uber', 'moto'], [' uber', ' 99 ', '99app', '99 pop', ' posto ', 'combust', 'gasolina', 'estacion', 'pedagio', 'sem parar', ' shell ', 'ipiranga', 'metro ', 'onibus', 'bilhete unico']],
    [['farmacia', 'saude', 'remedio'], ['farmac', 'drogaria', 'drogasil', 'droga raia', 'pague menos', 'clinica', 'laborat', 'hospital', 'dentista', 'odonto']],
    [['lazer', 'diversao', 'passeio', 'assinatura'], ['cinema', 'netflix', 'spotify', 'ingresso', 'steam', 'disney', 'prime video', 'youtube', 'hbo', 'playstation', 'xbox', ' bar ']],
    [['pet', 'cachorro', 'gato'], [' pet', 'veterin', 'racao', 'petz', 'cobasi']],
    [['beleza', 'cabelo', 'salao', 'barbearia'], ['barbearia', 'salao', 'cabeleireir', 'manicure', 'boticario', 'estetica']]
  ];
  H.envelopes = f => f.budgets.filter(b => b.type === 'envelope' && b.active);
  H.expensePeriod = (b, date) => b.frequency === 'weekly' ? 'w:' + H.weekStart(date) : 'm:' + date.slice(0, 7);
  /* 1º o que você já lançou antes no mesmo lugar; 2º o nome da caixinha na descrição; 3º palavras conhecidas */
  H.guessBudget = (f, description) => {
    const env = H.envelopes(f);
    if (!env.length) return null;
    const key = H.merchantKey(description), text = plain(description).replace(/ mercado (pago|livre) /g, ' ').replace(/ (mercadopago|mercadolivre) /g, ' ');
    if (key) {
      const past = f.expenses.filter(e => e.description && env.some(b => b.id === e.budgetId) && H.merchantKey(e.description) === key).sort((a, b) => b.date.localeCompare(a.date))[0];
      if (past) return past.budgetId;
    }
    const named = env.find(b => { const n = plain(b.name).trim(); return n.length >= 4 && text.includes(' ' + n + ' '); });
    if (named) return named.id;
    for (const [names, words] of GROUPS) {
      if (!words.some(w => text.includes(w))) continue;
      const b = env.find(b => { const n = plain(b.name); return names.some(a => n.includes(' ' + a)); });
      if (b) return b.id;
    }
    return null;
  };

  /* ---------- contas, caixinhas e cartões ---------- */
  H.canonicalBank = name => String(name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '').replace(/^fatura/, '').replace(/^cartao/, '').replace(/^credito/, '');
  H.cardMatches = (p, b) => H.canonicalBank(p.bank) === H.canonicalBank(b.name);
  H.cardName = b => b.name.replace(/^fatura\s+/i, '');
  H.activeCards = f => f.budgets.filter(b => b.active && b.type === 'card')
    .filter((b, i, all) => all.findIndex(x => H.canonicalBank(x.name) === H.canonicalBank(b.name)) === i);
  H.limit = (b, period) => { const a = b.allocations.find(a => a.period === period); return a ? a.amount : b.amount; };
  H.spent = (f, b, period) => sum(f.expenses.filter(e => e.budgetId === b.id && e.period === period), e => e.amount);
  H.periodOf = (b, month, week) => b.frequency === 'weekly' ? 'w:' + week : 'm:' + month;
  H.recurringTotal = b => sum((b.recurringCharges || []).filter(r => r.active), r => r.amount);
  H.cardPurchases = (f, b) => f.purchases.filter(p => H.cardMatches(p, b));
  H.cardInstallments = (f, b, month) => H.allEntries(H.cardPurchases(f, b)).filter(e => e.date.slice(0, 7) === month);
  /* fatura do mês: o valor informado manda; sem ele, parcelas do cartão + assinaturas */
  H.cardBill = (f, b, month) => {
    const informed = H.limit(b, 'm:' + month);
    const installments = sum(H.cardInstallments(f, b, month), e => e.amount), recurring = H.recurringTotal(b);
    return { amount: informed === null ? installments + recurring : informed, informed: informed !== null, installments, recurring };
  };
  H.cardCap = (b, month) => { const c = (b.spendingCaps || []).find(c => c.month === month); return c ? c.amount : null; };
  /* limite comprometido: valor informado pelo usuário ou, na falta, parcelas em aberto + assinaturas */
  H.cardUsed = (f, b) => (b.usedNow !== null && b.usedNow !== undefined) ? b.usedNow
    : sum(H.cardPurchases(f, b), H.remaining) + H.recurringTotal(b);

  /* ---------- planejamento do mês ----------
     total = contas fixas + faturas dos cartões + parcelas fora dos cartões.
     A fatura informada substitui as parcelas daquele cartão. Caixinhas não entram no total comprometido. */
  H.monthPlan = (f, month) => {
    const es = H.allEntries(f.purchases).filter(e => e.date.slice(0, 7) === month);
    const fixed = f.budgets.filter(b => b.active && b.type === 'fixed'), cards = H.activeCards(f);
    let home = 0, cardTotal = 0, unknown = 0;
    for (const b of fixed) { const v = H.limit(b, 'm:' + month); if (v === null) unknown++; else home += v; }
    for (const b of cards) { const bill = H.cardBill(f, b, month); if (!bill.informed && !bill.amount) unknown++; cardTotal += bill.amount; }
    const otherEntries = es.filter(e => !cards.some(b => H.cardMatches(e.p, b)));
    const other = sum(otherEntries, e => e.amount);
    return { total: home + cardTotal + other, home, cards: cardTotal, other, unknown, installments: sum(es, e => e.amount) };
  };
  H.monthIncome = (f, month) => sum(f.receipts.filter(r => r.date.slice(0, 7) === month), r => r.amount);
  H.monthSettings = (f, month) => f.monthlyPlans.find(p => p.month === month) || { month, expenseCap: null, savingsGoal: null };

  /* lista de tudo o que vence no mês, com situação (pago / aberto) */
  H.monthChecklist = (f, month) => {
    const items = [], cards = H.activeCards(f), period = 'm:' + month;
    for (const b of f.budgets.filter(b => b.active && b.type === 'fixed')) {
      const amount = H.limit(b, period), paidAmount = H.spent(f, b, period);
      items.push({ kind: 'fixed', key: 'b:' + b.id, budget: b, title: b.name, sub: 'Conta fixa', amount, date: b.dueDay ? H.dayInMonth(month, b.dueDay) : null, paid: paidAmount > 0, paidAmount });
    }
    for (const b of cards) {
      const bill = H.cardBill(f, b, month), paidAmount = H.spent(f, b, period);
      items.push({ kind: 'card', key: 'b:' + b.id, budget: b, title: H.cardName(b), sub: bill.informed ? 'Fatura informada' : (bill.amount ? 'Fatura estimada' : 'Fatura a informar'), amount: (bill.informed || bill.amount) ? bill.amount : null, date: b.dueDay ? H.dayInMonth(month, b.dueDay) : null, paid: paidAmount > 0 || (bill.informed && bill.amount === 0), paidAmount, bill });
    }
    for (const e of H.allEntries(f.purchases).filter(e => e.date.slice(0, 7) === month)) {
      if (cards.some(b => H.cardMatches(e.p, b))) continue;
      items.push({ kind: 'installment', key: 'p:' + e.p.id + ':' + e.i, purchase: e.p, index: e.i, title: e.p.name, sub: 'Parcela ' + (e.i + 1) + ' de ' + e.p.total + (e.p.bank ? ' · ' + e.p.bank : ''), amount: e.amount, date: e.date, paid: e.paid });
    }
    return items.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  };

  /* ---------- entradas, saídas e saldo ---------- */
  H.personName = (f, owner) => owner === 2 ? 'Casal' : (f.names[owner] || 'Você');
  H.savedSummary = f => { const s = f.savings || [], box = sum(s.filter(x => x.kind !== 'invest'), x => x.amount), invest = sum(s.filter(x => x.kind === 'invest'), x => x.amount); return { box, invest, total: box + invest, count: s.length }; };
  H.accountName = (f, id) => { const a = id && (f.accounts || []).find(a => a.id === id); return a ? [a.bank, a.owner, a.type === 'pj' ? 'CNPJ' : 'CPF'].filter(Boolean).join(' · ') : ''; };
  H.cashRows = f => [
    ...f.receipts.map(r => ({ ...r, kind: r.kind || 'salary', direction: 'in', source: 'receipt', who: H.accountName(f, r.account) || H.personName(f, r.owner) })),
    ...f.outflows.map(r => ({ ...r, direction: 'out', source: 'outflow', who: H.accountName(f, r.account) || 'Saída avulsa' })),
    ...f.expenses.map(e => {
      const b = f.budgets.find(b => b.id === e.budgetId);
      return { ...e, direction: e.method === 'credit' ? 'credit' : 'out', source: 'expense', description: e.description || (b ? b.name : 'Pagamento'), who: b ? b.name : 'Casa' };
    })
  ].sort((a, b) => b.date.localeCompare(a.date));
  /* saldo = saldo inicial + entradas − saídas, entre a data do saldo inicial e hoje. Crédito não sai do saldo. */
  H.cashSummary = (f, month) => {
    const today = H.today(), rows = H.cashRows(f), open = f.cashOpening;
    const posted = rows.filter(r => r.date <= today && (!open || r.date >= open.date));
    const ins = sum(posted.filter(r => r.direction === 'in'), r => r.amount), outs = sum(posted.filter(r => r.direction === 'out'), r => r.amount);
    const inMonth = rows.filter(r => r.date.slice(0, 7) === month), done = inMonth.filter(r => r.date <= today);
    return {
      balance: (open ? open.amount : 0) + ins - outs, hasBase: !!open,
      income: sum(done.filter(r => r.direction === 'in'), r => r.amount),
      monthIncome: sum(inMonth.filter(r => r.direction === 'in'), r => r.amount),
      out: sum(done.filter(r => r.direction === 'out'), r => r.amount),
      future: sum(inMonth.filter(r => r.direction === 'in' && r.date > today), r => r.amount)
    };
  };
  /* próximos n meses: entradas previstas, comprometido e sobra */
  H.projection = (f, from, n) => Array.from({ length: n }, (_, i) => {
    const month = H.addMonths(from, i), plan = H.monthPlan(f, month), income = H.monthIncome(f, month);
    return { month, income, total: plan.total, home: plan.home, cards: plan.cards, other: plan.other, left: income - plan.total, unknown: plan.unknown };
  });

  /* ---------- objetivos ---------- */
  H.GOAL_TYPES = {
    migration: ['Mudança de país', 'plane'], tax: ['Vida tributária', 'file'], language: ['Idioma e cursos', 'book'],
    money: ['Reserva financeira', 'piggy'], career: ['Profissão e renda em dólar', 'briefcase'], debt: ['Quitar dívidas', 'wallet'],
    miles: ['Milhas e pontos', 'plane'], custom: ['Outro objetivo', 'flag']
  };
  H.blankGoal = (type, title) => ({ id: H.id(), type: type || 'custom', title: title || 'Novo objetivo', summary: '', deadline: '', status: 'active', contact: '', destination: '', currentLevel: '', targetLevel: '', target: 0, initial: 0, initialKnown: false, incomeTarget: 0, incomeActual: null, notes: '', tasks: [], courses: [], deposits: [], lots: [], promos: [] });
  H.goalBalance = g => g.initial + sum(g.deposits.filter(d => d.date <= H.today()), d => d.amount);
  H.knownBalance = g => g.initialKnown === true || g.initial > 0 || g.deposits.length > 0;
  H.goalPercent = (g, f) => {
    if (g.status === 'done') return 100;
    if (g.type === 'debt') return H.debtSummary(f).pct;
    if (g.type === 'career' && g.incomeTarget) return Math.min(100, Math.round((g.incomeActual || 0) / g.incomeTarget * 100));
    if (g.type === 'money') return g.target ? Math.max(0, Math.min(100, Math.round(H.goalBalance(g) / g.target * 100))) : 0;
    if (g.type === 'language' && g.courses.length) { const t = sum(g.courses, c => c.total), d = sum(g.courses, c => c.done); return t ? Math.round(d / t * 100) : 0; }
    return g.tasks.length ? Math.round(g.tasks.filter(t => t.status === 'done').length / g.tasks.length * 100) : 0;
  };
  /* quanto guardar por mês para chegar na meta até o prazo */
  H.savingPlan = g => {
    if (!g.target || !g.deadline) return null;
    const left = Math.max(0, g.target - H.goalBalance(g));
    if (!left) return { amount: 0, months: 0, overdue: false };
    const now = H.parseDate(H.today()), end = H.parseDate(g.deadline);
    if (end < now) return { amount: left, months: 0, overdue: true };
    const months = (end.getFullYear() - now.getFullYear()) * 12 + end.getMonth() - now.getMonth() + 1;
    return { amount: Math.ceil(left / months), months, overdue: false };
  };
  H.goalHeadline = (g, f) => {
    if (g.type === 'debt') { const d = H.debtSummary(f); return d.remaining ? H.money(d.remaining) + ' para quitar' : 'Tudo quitado'; }
    if (g.type === 'money') return H.money(H.goalBalance(g)) + ' de ' + H.money(g.target);
    if (g.type === 'career') return (g.incomeActual !== null ? H.usd(g.incomeActual) + ' de ' : 'Meta ') + H.usd(g.incomeTarget) + '/mês';
    if (g.type === 'language' && g.courses.length) return sum(g.courses, c => c.done) + ' de ' + sum(g.courses, c => c.total) + ' aulas';
    if (g.type === 'miles' && g.lots.length) return H.number(sum(g.lots, l => l.amount)) + ' pontos e milhas';
    const open = g.tasks.filter(t => t.status !== 'done').length;
    return g.tasks.length ? (open ? open + (open === 1 ? ' pendência' : ' pendências') : 'Tudo em dia') : 'Sem pendências';
  };
  /* lembretes: pedidos de documento, tarefas com prazo em até 7 dias, milhas vencendo, promoções acabando */
  H.attentions = h => {
    const out = [];
    for (const g of h.goals.filter(g => g.status !== 'done')) {
      for (const t of g.tasks.filter(t => t.status !== 'done')) {
        if (t.kind === 'document' || (t.due && H.diffDays(t.due) <= 7))
          out.push({ g, task: t, title: t.title, description: (t.kind === 'document' ? 'Pedido de documento' : 'Pendência') + (t.from ? ' · ' + t.from : ''), date: t.due, severity: t.due && H.diffDays(t.due) < 0 ? 'danger' : 'warn' });
      }
      for (const l of g.lots) if (l.expires && H.diffDays(l.expires) <= 60)
        out.push({ g, lot: l, title: H.number(l.amount) + ' ' + l.unit + ' · ' + l.program, description: H.diffDays(l.expires) < 0 ? 'Validade encerrada' : 'Milhas vencendo', date: l.expires, severity: H.diffDays(l.expires) <= 7 ? 'danger' : 'warn' });
      for (const p of g.promos) if (p.expires && H.diffDays(p.expires) >= 0 && H.diffDays(p.expires) <= 7)
        out.push({ g, promo: p, title: p.title, description: 'Oportunidade terminando', date: p.expires, severity: 'warn' });
    }
    return out.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  };
  /* agenda dos próximos dias: tarefas, aulas semanais, milhas e também as contas do financeiro */
  H.agenda = (state, from, days) => {
    const until = H.addDays(from, days), ev = [], f = state.finance;
    for (const g of state.horizon.goals.filter(g => g.status === 'active')) {
      for (const t of g.tasks) if (t.status !== 'done' && t.due && t.due >= from && t.due <= until)
        ev.push({ date: t.due, time: '', title: t.title, type: t.kind === 'document' ? 'Documento' : t.kind === 'appointment' ? 'Compromisso' : 'Pendência', goal: g });
      for (const c of g.courses) {
        if (c.done >= c.total) continue;
        let date = from > c.start ? from : c.start;
        date = H.addDays(date, (c.weekday - H.parseDate(date).getDay() + 7) % 7);
        let count = 0;
        while (date <= until && date <= c.end && count < Math.min(c.total - c.done, 52)) { ev.push({ date, time: c.time, title: c.title, type: 'Aula', goal: g }); date = H.addDays(date, 7); count++; }
      }
      for (const l of g.lots) if (l.expires && l.expires >= from && l.expires <= until)
        ev.push({ date: l.expires, time: '', title: 'Vencem ' + H.number(l.amount) + ' ' + l.unit, type: l.program, goal: g });
    }
    for (const month of new Set([from.slice(0, 7), until.slice(0, 7)]))
      for (const it of H.monthChecklist(f, month)) if (it.date && !it.paid && it.date >= from && it.date <= until)
        ev.push({ date: it.date, time: '', title: it.title, type: it.kind === 'installment' ? it.sub : it.kind === 'card' ? 'Fatura' : 'Conta fixa', amount: it.amount, bill: it });
    return ev.sort((a, b) => (a.date + (a.time || '00:00')).localeCompare(b.date + (b.time || '00:00')));
  };

  /* ---------- estado, validação, backup ---------- */
  H.KEY = 'horizonte.app.v2';
  H.defaultBudgets = () => [
    ['casa-agua', 'Água', 'fixed', 'monthly'], ['casa-luz', 'Luz', 'fixed', 'monthly'], ['casa-internet', 'Internet', 'fixed', 'monthly'], ['casa-aluguel', 'Aluguel', 'fixed', 'monthly'],
    ['casa-mercado', 'Mercado e limpeza', 'envelope', 'monthly'], ['casa-carne', 'Carne / mistura', 'envelope', 'weekly'], ['casa-hortifruti', 'Hortifruti / feira', 'envelope', 'weekly']
  ].map(([id, name, type, frequency]) => ({ id, name, type, frequency, amount: null, dueDay: null, active: true, allocations: [] }));
  H.blankState = () => ({
    finance: { version: 1, monthlyPlans: [], budgets: H.defaultBudgets(), expenses: [], receipts: [], outflows: [], cashOpening: null, demo: false, dark: true, names: ['Você', 'Meu par'], purchases: [] },
    horizon: { version: 1, demo: false, year: new Date().getFullYear() + 1, name: '', reflection: '', focus: '', dark: true, goals: [] },
    meta: { updatedAt: null }
  });
  const cents = n => Number.isSafeInteger(n) && n >= 0 && n <= 100000000000;
  const str = (v, max) => typeof v === 'string' && v.length <= max;
  const fail = msg => { throw new Error(msg); };

  H.normalizeFinance = src => {
    if (!src || typeof src !== 'object' || !Array.isArray(src.purchases)) fail('Este arquivo não tem dados financeiros do Horizonte.');
    const f = JSON.parse(JSON.stringify(src));
    f.version = 1;
    f.names = Array.isArray(f.names) && f.names.length === 2 && f.names.every(n => str(n, 40) && n.trim()) ? f.names : ['Você', 'Meu par'];
    f.dark = f.dark !== false; f.demo = false;
    for (const k of ['monthlyPlans', 'expenses', 'receipts', 'outflows']) if (!Array.isArray(f[k])) f[k] = [];
    if (!Array.isArray(f.budgets)) f.budgets = H.defaultBudgets();
    const ids = new Set(), unique = v => { if (!str(v, 100) || !v || ids.has(v)) fail('Há identificadores repetidos ou inválidos no backup.'); ids.add(v); };
    for (const p of f.purchases) {
      unique(p.id);
      if (!str(p.name, 120) || !p.name.trim() || !cents(p.amount) || !Number.isInteger(p.total) || p.total < 1 || p.total > 600 || !H.validDate(p.anchor) || !Number.isInteger(p.anchorIndex) || !Array.isArray(p.paid)) fail('Uma compra parcelada tem dados inválidos.');
      p.bank = str(p.bank, 80) ? p.bank : ''; p.owner = [0, 1, 2].includes(p.owner) ? p.owner : 0; p.category = str(p.category, 30) ? p.category : 'shopping';
      p.day = Number.isInteger(p.day) && p.day >= 1 && p.day <= 31 ? p.day : Number(p.anchor.slice(8));
      p.paid = [...new Set(p.paid.filter(i => Number.isInteger(i) && i >= 0 && i < p.total))].sort((a, b) => a - b);
      if (p.schedule !== undefined && (!Array.isArray(p.schedule) || p.schedule.some(d => !H.validDate(d)))) delete p.schedule;
    }
    const budgetIds = new Set();
    for (const b of f.budgets) {
      unique(b.id); budgetIds.add(b.id);
      if (!str(b.name, 80) || !b.name.trim() || !['fixed', 'envelope', 'card'].includes(b.type) || !['monthly', 'weekly'].includes(b.frequency) || (b.amount !== null && !cents(b.amount))) fail('Uma conta, caixinha ou cartão tem dados inválidos.');
      if (b.type !== 'envelope') b.frequency = 'monthly';
      b.dueDay = Number.isInteger(b.dueDay) && b.dueDay >= 1 && b.dueDay <= 31 ? b.dueDay : null;
      b.active = b.active !== false;
      b.allocations = (Array.isArray(b.allocations) ? b.allocations : []).filter(a => a && str(a.period, 12) && /^[mw]:\d{4}-\d{2}(-\d{2})?$/.test(a.period) && cents(a.amount));
      if (b.type === 'card') {
        b.creditLimit = cents(b.creditLimit) ? b.creditLimit : null;
        b.usedNow = cents(b.usedNow) ? b.usedNow : null;
        b.spendingCaps = (Array.isArray(b.spendingCaps) ? b.spendingCaps : []).filter(c => c && H.validMonth(c.month) && cents(c.amount));
        b.recurringCharges = (Array.isArray(b.recurringCharges) ? b.recurringCharges : []).filter(r => r && str(r.id, 100) && str(r.name, 80) && r.name.trim() && cents(r.amount) && r.amount > 0)
          .map(r => ({ ...r, active: r.active !== false, chargeDay: Number.isInteger(r.chargeDay) && r.chargeDay >= 1 && r.chargeDay <= 31 ? r.chargeDay : null }));
      }
    }
    f.expenses = f.expenses.filter(e => e && str(e.id, 100) && budgetIds.has(e.budgetId) && H.validDate(e.date) && cents(e.amount) && e.amount > 0 && str(e.period, 12))
      .map(e => ({ ...e, description: str(e.description, 300) ? e.description : '', method: e.method === 'credit' ? 'credit' : 'cash' }));
    for (const [k, income] of [['receipts', true], ['outflows', false]])
      f[k] = f[k].filter(r => r && str(r.id, 100) && H.validDate(r.date) && cents(r.amount) && r.amount > 0 && str(r.description, 300))
        .map(r => income ? { ...r, owner: [0, 1, 2].includes(r.owner) ? r.owner : 0, kind: r.kind === 'other' ? 'other' : 'salary' } : { ...r });
    /* contas bancárias: banco, dono, CPF/CNPJ e as "chaves" que reconhecem o extrato (nunca o número da conta) */
    f.accounts = (Array.isArray(f.accounts) ? f.accounts : []).filter(a => a && str(a.id, 100) && a.id && str(a.bank, 60) && a.bank.trim() && str(a.owner, 60))
      .map(a => ({ id: a.id, bank: a.bank.trim(), owner: a.owner.trim(), type: a.type === 'pj' ? 'pj' : 'pf', keys: (Array.isArray(a.keys) ? a.keys : []).filter(k => str(k, 40) && k).slice(0, 20) }));
    /* guardado: caixinhas e investimentos, com o valor informado por último */
    f.savings = (Array.isArray(f.savings) ? f.savings : []).filter(x => x && str(x.id, 100) && x.id && str(x.name, 60) && x.name.trim() && Number.isSafeInteger(x.amount) && x.amount >= 0)
      .map(x => ({ id: x.id, name: x.name.trim(), amount: x.amount, kind: x.kind === 'invest' ? 'invest' : 'box', goal: cents(x.goal) && x.goal > 0 ? x.goal : null, place: str(x.place, 60) ? x.place : '', updated: H.validDate(x.updated) ? x.updated : H.today() }));
    f.savedLog = (Array.isArray(f.savedLog) ? f.savedLog : []).filter(x => x && H.validMonth(x.month) && cents(x.total)).map(x => ({ month: x.month, total: x.total })).slice(-36);
    const o = f.cashOpening;
    f.cashOpening = (o && H.validDate(o.date) && Number.isSafeInteger(o.amount)) ? { date: o.date, amount: o.amount } : null;
    f.monthlyPlans = f.monthlyPlans.filter(p => p && H.validMonth(p.month)).map(p => ({ month: p.month, expenseCap: cents(p.expenseCap) ? p.expenseCap : null, savingsGoal: cents(p.savingsGoal) ? p.savingsGoal : null }));
    return f;
  };
  H.normalizeHorizon = src => {
    const base = H.blankState().horizon;
    if (!src || typeof src !== 'object') return base;
    const h = JSON.parse(JSON.stringify(src));
    delete h.financeSnapshot; // o financeiro agora mora no mesmo app
    h.version = 1; h.demo = false; h.dark = h.dark !== false;
    h.year = Number.isInteger(h.year) && h.year >= 1900 && h.year <= 2200 ? h.year : base.year;
    h.name = str(h.name, 50) ? h.name : ''; h.reflection = str(h.reflection, 4000) ? h.reflection : ''; h.focus = str(h.focus, 100) ? h.focus : '';
    h.goals = (Array.isArray(h.goals) ? h.goals : []).filter(g => g && str(g.id, 100) && str(g.title, 100) && g.title.trim()).map(g => {
      const n = { ...H.blankGoal(), ...g };
      if (!H.GOAL_TYPES[n.type]) n.type = 'custom';
      if (!['active', 'paused', 'done'].includes(n.status)) n.status = 'active';
      for (const k of ['tasks', 'courses', 'deposits', 'lots', 'promos']) if (!Array.isArray(n[k])) n[k] = [];
      for (const k of ['target', 'initial', 'incomeTarget']) if (!cents(n[k])) n[k] = 0;
      if (n.incomeActual !== null && !cents(n.incomeActual)) n.incomeActual = null;
      if (n.deadline && !H.validDate(n.deadline)) n.deadline = '';
      return n;
    });
    return h;
  };
  /* aceita o backup completo ("adois-horizonte") ou só o financeiro do "A dois" */
  H.fromBackup = obj => {
    if (!obj || typeof obj !== 'object') fail('Arquivo de backup inválido.');
    const st = H.blankState();
    if (obj.finance) { st.finance = H.normalizeFinance(obj.finance); st.horizon = H.normalizeHorizon(obj.horizon); }
    else if (Array.isArray(obj.purchases)) st.finance = H.normalizeFinance(obj);
    else fail('Este arquivo não é um backup do Horizonte.');
    st.meta = { updatedAt: new Date().toISOString(), importedFrom: obj.exportedAt || null };
    return st;
  };
  H.toBackup = st => ({ format: 'adois-horizonte', version: 1, exportedAt: new Date().toISOString(), finance: st.finance, horizon: st.horizon });

  /* ---------- armazenamento local ---------- */
  H.state = null;
  H.listeners = [];
  H.storageOk = true;
  H.load = () => {
    let raw = null;
    try { raw = root.localStorage.getItem(H.KEY); } catch (e) { H.storageOk = false; }
    if (raw) { try { const st = JSON.parse(raw); st.finance = H.normalizeFinance(st.finance); st.horizon = H.normalizeHorizon(st.horizon); st.meta = st.meta || {}; H.state = st; return 'saved'; } catch (e) { /* cai para o início */ } }
    if (root.HORIZONTE_SEED) { try { H.state = H.fromBackup(root.HORIZONTE_SEED); H.persist(); return 'seed'; } catch (e) { /* ignora */ } }
    H.state = null; return 'empty';
  };
  H.persist = () => {
    H.state.meta.updatedAt = new Date().toISOString();
    try { root.localStorage.setItem(H.KEY, JSON.stringify(H.state)); H.storageOk = true; } catch (e) { H.storageOk = false; }
    for (const fn of H.listeners) fn(H.state);
    return H.storageOk;
  };
  H._undo = null;
  /* aplica uma mudança guardando o estado anterior para "Desfazer" */
  /* anota o total guardado do mês, para o gráfico de evolução */
  H.logSaved = f => {
    if (!Array.isArray(f.savedLog)) f.savedLog = [];
    if (!(f.savings || []).length && !f.savedLog.length) return;
    const month = H.currentMonth(), total = H.savedSummary(f).total, cur = f.savedLog.find(x => x.month === month);
    if (cur) cur.total = total; else f.savedLog.push({ month, total });
    f.savedLog.sort((a, b) => a.month.localeCompare(b.month)); f.savedLog = f.savedLog.slice(-36);
  };
  H.commit = fn => { H._undo = JSON.stringify(H.state); fn(H.state.finance, H.state.horizon); H.logSaved(H.state.finance); return H.persist(); };
  H.undo = () => { if (!H._undo) return false; H.state = JSON.parse(H._undo); H._undo = null; H.persist(); return true; };

  H.sum = sum;
  if (typeof module !== 'undefined' && module.exports) module.exports = H; else root.H = H;
})(typeof window !== 'undefined' ? window : globalThis);
