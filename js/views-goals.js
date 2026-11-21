/* Horizonte — telas de objetivos. */
(function () {
  'use strict';
  const { esc, icon, bar } = UI, m = H.money;
  const V = App.views, A = App.actions, act = App.act, head = App.head;
  const HZ = () => H.state.horizon, F = () => H.state.finance;
  const goalOf = id => HZ().goals.find(g => g.id === id);
  const STATUS = { active: 'Em andamento', paused: 'Pausado', done: 'Concluído' };
  const link = g => '#/objetivo/' + encodeURIComponent(g.id);
  const d = (id, extra) => ' data-id="' + esc(id) + '"' + (extra || '');

  const goalCard = (g, f, focus) => {
    const pct = H.goalPercent(g, f), t = H.GOAL_TYPES[g.type];
    return '<a class="goal' + (g.status !== 'active' ? ' is-off' : '') + '" href="' + link(g) + '"><span class="row-ic">' + icon(t[1]) + '</span><span class="goal-main"><small>' + esc(t[0]) + (focus ? ' · foco do ano' : '') + (g.status !== 'active' ? ' · ' + STATUS[g.status] : '') + '</small><b>' + esc(g.title) + '</b><span>' + esc(H.goalHeadline(g, f)) + '</span>' + bar(pct, 'thin') + '</span><span class="goal-pct">' + pct + '%</span></a>';
  };

  V.objetivos = () => {
    const hz = HZ(), f = F(), today = H.today();
    const goals = [...hz.goals].sort((a, b) => (a.status === 'done') - (b.status === 'done') || (b.id === hz.focus) - (a.id === hz.focus));
    const att = H.attentions(hz), agenda = H.agenda(H.state, today, 14);
    let html = head('Objetivos', 'Plano de ' + hz.year, '<button class="btn small" data-a="newGoal">' + icon('plus') + 'Objetivo</button>', '#/mais');
    html += '<button class="card quote" data-a="editReflection"><small>Nosso norte para ' + hz.year + '</small><p>' + (hz.reflection ? esc(hz.reflection) : 'Toque para escrever, em uma frase, onde vocês querem chegar.') + '</p></button>';
    if (att.length) html += '<section class="card"><div class="card-h"><h2>Pede atenção</h2><span class="muted">' + att.length + '</span></div><div class="list">' + att.map(a => '<a class="row link" href="' + link(a.g) + '"><span class="row-ic ' + a.severity + '">' + icon(a.severity === 'danger' ? 'alert' : 'clock') + '</span><span class="row-main"><b>' + esc(a.title) + '</b><small>' + esc(a.description) + ' · ' + esc(a.g.title) + '</small></span><span class="row-amt"><small>' + (a.date ? H.relative(a.date) : 'sem prazo') + '</small></span></a>').join('') + '</div></section>';
    html += goals.length ? '<div class="goals">' + goals.map(g => goalCard(g, f, g.id === hz.focus)).join('') + '</div>' : App.empty('Nenhum objetivo ainda.');
    html += '<section class="card"><div class="card-h"><h2>Próximos 14 dias</h2></div>' + (agenda.length ? '<div class="list">' + agenda.map(e => {
      const inner = '<span class="date-chip"><b>' + e.date.slice(8) + '</b>' + H.MONTHS[Number(e.date.slice(5, 7)) - 1] + '</span><span class="row-main"><b>' + esc(e.title) + '</b><small>' + esc(e.type) + (e.time ? ' · ' + e.time : '') + (e.goal ? ' · ' + esc(e.goal.title) : '') + '</small></span>' + (e.amount ? '<span class="row-amt">' + m(e.amount) + '</span>' : '');
      return e.goal ? '<a class="row link" href="' + link(e.goal) + '">' + inner + '</a>' : '<a class="row link" href="#/mes">' + inner + '</a>';
    }).join('') + '</div>' : App.empty('Nada marcado para os próximos dias.')) + '</section>';
    return html;
  };
  A.editReflection = () => UI.form({ title: 'Nosso norte', fields: [{ name: 'text', label: 'Onde queremos chegar', type: 'textarea', value: HZ().reflection, max: 4000 }, { name: 'year', label: 'Ano do plano', type: 'number', value: HZ().year, required: true }],
    onSubmit: v => { if (v.year < 2000 || v.year > 2200) return 'Informe um ano válido.'; act('Salvo', (f, h) => { h.reflection = v.text; h.year = v.year; }); } });
  A.newGoal = () => UI.form({ title: 'Novo objetivo', fields: [{ name: 'title', label: 'Nome', value: '', required: true, max: 100 }, { name: 'type', label: 'Tipo', type: 'select', value: 'custom', options: Object.entries(H.GOAL_TYPES).map(([k, v]) => [k, v[0]]), required: true }, { name: 'deadline', label: 'Prazo', type: 'date', value: '' }],
    onSubmit: v => { const g = H.blankGoal(v.type, v.title); g.deadline = v.deadline; act('Objetivo criado', (f, h) => { h.goals.push(g); }); App.go('#/objetivo/' + encodeURIComponent(g.id)); } });

  /* ---------- um objetivo ---------- */
  const section = (title, action, body) => '<section class="card"><div class="card-h"><h2>' + title + '</h2>' + (action || '') + '</div>' + body + '</section>';
  const add = (a, id, label) => '<button class="btn small" data-a="' + a + '"' + d(id) + '>' + icon('plus') + label + '</button>';
  V.objetivo = id => {
    const g = goalOf(id), f = F(), hz = HZ();
    if (!g) return head('Objetivo', '', '', '#/objetivos') + App.empty('Este objetivo não existe mais.');
    const t = H.GOAL_TYPES[g.type], pct = H.goalPercent(g, f), today = H.today();
    let html = head(g.title, esc(t[0]) + ' · ' + STATUS[g.status], '<button class="btn small" data-a="editGoal"' + d(g.id) + '>' + icon('edit') + 'Editar</button>', '#/objetivos');
    html += '<section class="hero"><small>' + (g.deadline ? 'Prazo: ' + H.dateLabel(g.deadline) + ' · ' + H.relative(g.deadline) : 'Sem prazo definido') + '</small><strong class="big">' + esc(H.goalHeadline(g, f)) + '</strong>' + bar(pct) + '<small>' + pct + '% do caminho</small>' + (g.summary ? '<p>' + esc(g.summary) + '</p>' : '') +
      '<div class="btn-row">' + (hz.focus === g.id ? '<span class="pill on">' + icon('star') + 'Foco do ano</span>' : '<button class="btn ghost" data-a="setFocus"' + d(g.id) + '>' + icon('star') + 'Tornar foco do ano</button>') + '</div></section>';

    if (g.type === 'debt') { const s = H.debtSummary(f), free = H.debtFreeMonth(f); html += section('Dívidas', '<a href="#/dividas">Abrir</a>', '<div class="trio"><div><small>Falta</small><b>' + m(s.remaining) + '</b></div><div><small>Já pago</small><b>' + m(s.paid) + '</b></div><div><small>Livre em</small><b>' + (free ? H.monthShort(free) : 'já está') + '</b></div></div>'); }
    if (g.type === 'money') {
      const plan = H.savingPlan(g), dep = [...g.deposits].sort((a, b) => b.date.localeCompare(a.date));
      html += section('Reserva', add('addDeposit', g.id, 'Depósito'), '<div class="trio two"><div><small>Guardado</small><b>' + (H.knownBalance(g) ? m(H.goalBalance(g)) : 'não informado') + '</b></div><div><small>Meta</small><b>' + m(g.target) + '</b></div></div>' +
        (plan ? '<div class="note">' + icon('piggy') + '<p>' + (plan.overdue ? 'O prazo passou e faltam ' + m(plan.amount) + '.' : plan.amount ? 'Guardando <b>' + m(plan.amount) + ' por mês</b> durante ' + plan.months + (plan.months === 1 ? ' mês' : ' meses') + ', a meta fecha no prazo.' : 'Meta alcançada.') + '</p></div>' : '<p class="muted">Defina meta e prazo em Editar para ver quanto guardar por mês.</p>') +
        (dep.length ? '<div class="list">' + dep.map(x => '<button class="row" data-a="delItem"' + d(g.id, ' data-list="deposits" data-item="' + esc(x.id) + '"') + '><span class="row-main"><b>' + esc(x.note || 'Depósito') + '</b><small>' + H.dateLabel(x.date) + (x.date > today ? ' · previsto' : '') + '</small></span><span class="row-amt pos">+ ' + m(x.amount) + '</span></button>').join('') + '</div>' : ''));
    }
    if (g.type === 'career') html += section('Renda', '', '<div class="trio two"><div><small>Renda atual</small><b>' + (g.incomeActual === null ? 'não informada' : H.usd(g.incomeActual)) + '</b></div><div><small>Meta por mês</small><b>' + H.usd(g.incomeTarget) + '</b></div></div>' + (g.contact ? '<small class="muted">Quem: ' + esc(g.contact) + '</small>' : ''));
    if (g.type === 'language' || g.courses.length) html += section('Cursos', add('editCourse', g.id, 'Curso'), g.courses.length ? '<div class="list">' + g.courses.map(c => '<div class="row env"><button class="row-main" data-a="editCourse"' + d(g.id, ' data-item="' + esc(c.id) + '"') + '><b>' + esc(c.title) + '</b><small>' + c.done + ' de ' + c.total + ' aulas · ' + H.WEEKDAYS[c.weekday] + (c.time ? ' às ' + c.time : '') + '</small>' + bar(c.total ? c.done / c.total * 100 : 0, 'thin') + '</button>' + (c.done < c.total ? '<button class="btn small" data-a="lessonDone"' + d(g.id, ' data-item="' + esc(c.id) + '"') + '>' + icon('check') + 'Aula feita</button>' : '') + '</div>').join('') + '</div>' : App.empty('Nenhum curso cadastrado.'));
    if (g.type === 'miles' || g.lots.length) html += section('Pontos e milhas', add('editLot', g.id, 'Saldo'), g.lots.length ? '<div class="list">' + g.lots.map(l => '<button class="row" data-a="editLot"' + d(g.id, ' data-item="' + esc(l.id) + '"') + '><span class="row-main"><b>' + esc(l.program) + '</b><small>' + (l.expires ? 'Vence em ' + H.dateLabel(l.expires) : 'Sem validade informada') + '</small></span><span class="row-amt">' + H.number(l.amount) + '<small>' + esc(l.unit) + '</small></span></button>').join('') + '</div>' : App.empty('Nenhum saldo cadastrado.'));
    if (g.type === 'miles' || g.promos.length) html += section('Oportunidades', add('editPromo', g.id, 'Oportunidade'), g.promos.length ? '<div class="list">' + g.promos.map(p => '<button class="row" data-a="editPromo"' + d(g.id, ' data-item="' + esc(p.id) + '"') + '><span class="row-main"><b>' + esc(p.title) + '</b><small>' + (p.expires ? 'Até ' + H.dateLabel(p.expires) : 'Sem data') + '</small></span></button>').join('') + '</div>' : App.empty('Nenhuma oportunidade anotada.'));

    const tasks = [...g.tasks].sort((a, b) => (a.status === 'done') - (b.status === 'done') || (a.due || '9999').localeCompare(b.due || '9999'));
    html += section('Pendências', add('editTask', g.id, 'Pendência'), tasks.length ? '<div class="list">' + tasks.map(t => {
      const done = t.status === 'done', late = !done && t.due && t.due < today;
      return '<div class="row bill split' + (done ? ' is-paid' : '') + (late ? ' is-late' : '') + '"><button class="check" data-a="toggleTask"' + d(g.id, ' data-item="' + esc(t.id) + '"') + ' aria-pressed="' + done + '" aria-label="Concluir">' + (done ? icon('check') : '') + '</button><button class="row-main" data-a="editTask"' + d(g.id, ' data-item="' + esc(t.id) + '"') + '><b>' + esc(t.title) + '</b><small>' + (t.kind === 'document' ? 'Documento' : t.kind === 'appointment' ? 'Compromisso' : 'Pendência') + (t.from ? ' · ' + esc(t.from) : '') + (t.due ? ' · ' + H.relative(t.due) : '') + '</small></button></div>';
    }).join('') + '</div>' : App.empty('Nenhuma pendência. Anote o próximo passo.'));
    html += '<button class="card quote" data-a="editNotes"' + d(g.id) + '><small>Anotações</small><p>' + (g.notes ? esc(g.notes) : 'Toque para anotar.') + '</p></button>';
    return html;
  };
  const mut = (id, msg, fn) => act(msg, (f, h) => fn(h.goals.find(g => g.id === id), h));
  const saveItem = (id, list, item, msg, values) => mut(id, msg, g => { let x = g[list].find(x => x.id === item); if (!x) { x = { id: H.id() }; g[list].push(x); } Object.assign(x, values); });
  const removeBtn = (id, list, item) => item ? { label: 'Excluir', onClick: () => mut(id, 'Excluído', g => { g[list] = g[list].filter(x => x.id !== item); }) } : null;

  A.setFocus = ({ id }) => act('Foco do ano definido', (f, h) => { h.focus = id; });
  A.editNotes = ({ id }) => UI.form({ title: 'Anotações', fields: [{ name: 'notes', label: 'Anotações', type: 'textarea', value: goalOf(id).notes, rows: 8, max: 4000 }], onSubmit: v => mut(id, 'Anotações salvas', g => { g.notes = v.notes; }) });
  A.editGoal = ({ id }) => {
    const g = goalOf(id), fields = [{ name: 'title', label: 'Nome', value: g.title, required: true, max: 100 }, { name: 'summary', label: 'Resumo', value: g.summary, max: 300 }, { name: 'deadline', label: 'Prazo', type: 'date', value: g.deadline },
      { name: 'status', label: 'Situação', type: 'select', value: g.status, options: Object.entries(STATUS), required: true }];
    if (g.type === 'money') fields.push({ name: 'target', label: 'Meta', type: 'money', value: g.target || null }, { name: 'initial', label: 'Quanto já tem guardado', type: 'money', value: g.initialKnown || g.initial ? g.initial : null, hint: 'Sem contar os depósitos lançados aqui.' });
    if (g.type === 'career') fields.push({ name: 'incomeTarget', label: 'Meta de renda por mês', type: 'money', prefix: 'US$', value: g.incomeTarget || null }, { name: 'incomeActual', label: 'Renda atual por mês', type: 'money', prefix: 'US$', value: g.incomeActual }, { name: 'contact', label: 'Quem', value: g.contact, max: 80 });
    if (g.type === 'migration') fields.push({ name: 'destination', label: 'Destino', value: g.destination, max: 80 });
    UI.form({ title: 'Editar objetivo', fields,
      danger: { label: 'Excluir objetivo', onClick: () => UI.confirm('Excluir "' + g.title + '"?', 'O objetivo e tudo o que está dentro dele saem do app.', 'Excluir', () => { act('Objetivo excluído', (f, h) => { h.goals = h.goals.filter(x => x.id !== id); if (h.focus === id) h.focus = ''; }); App.go('#/objetivos'); }, true) },
      onSubmit: v => mut(id, 'Objetivo atualizado', x => {
        Object.assign(x, { title: v.title, summary: v.summary, deadline: v.deadline, status: v.status });
        if (x.type === 'money') { x.target = v.target || 0; x.initial = v.initial || 0; x.initialKnown = v.initial !== null; }
        if (x.type === 'career') { x.incomeTarget = v.incomeTarget || 0; x.incomeActual = v.incomeActual; x.contact = v.contact; }
        if (x.type === 'migration') x.destination = v.destination;
      }) });
  };
  A.toggleTask = ({ id, item }) => H.commit((f, h) => { const t = h.goals.find(g => g.id === id).tasks.find(t => t.id === item); t.status = t.status === 'done' ? 'open' : 'done'; });
  A.editTask = ({ id, item }) => {
    const t = item ? goalOf(id).tasks.find(t => t.id === item) : null;
    UI.form({ title: t ? 'Editar pendência' : 'Nova pendência', fields: [{ name: 'title', label: 'O que precisa ser feito', value: t ? t.title : '', required: true, max: 200 }, { name: 'kind', label: 'Tipo', type: 'select', value: t ? t.kind || 'task' : 'task', options: [['task', 'Pendência'], ['document', 'Pedido de documento'], ['appointment', 'Compromisso']], required: true },
      { name: 'due', label: 'Prazo', type: 'date', value: t ? t.due || '' : '' }, { name: 'from', label: 'Quem pediu ou com quem', value: t ? t.from || '' : '', max: 80 }],
      danger: removeBtn(id, 'tasks', item), onSubmit: v => saveItem(id, 'tasks', item, 'Pendência salva', { title: v.title, kind: v.kind, due: v.due, from: v.from, status: t ? t.status : 'open' }) });
  };
  A.addDeposit = ({ id }) => UI.form({ title: 'Novo depósito', intro: 'Registra quanto foi guardado para este objetivo. Não mexe no saldo em conta.', fields: [{ name: 'amount', label: 'Valor', type: 'money', required: true }, { name: 'date', label: 'Data', type: 'date', value: H.today(), required: true }, { name: 'note', label: 'Descrição', value: '', max: 120 }],
    onSubmit: v => { if (!v.amount) return 'Informe o valor.'; saveItem(id, 'deposits', null, 'Depósito lançado', { amount: v.amount, date: v.date, note: v.note }); } });
  A.delItem = ({ id, list, item }) => UI.confirm('Excluir este lançamento?', 'Ele sai do objetivo.', 'Excluir', () => mut(id, 'Excluído', g => { g[list] = g[list].filter(x => x.id !== item); }), true);
  A.lessonDone = ({ id, item }) => mut(id, 'Aula registrada', g => { const c = g.courses.find(c => c.id === item); c.done = Math.min(c.total, c.done + 1); });
  A.editCourse = ({ id, item }) => {
    const c = item ? goalOf(id).courses.find(c => c.id === item) : null, today = H.today();
    UI.form({ title: c ? 'Editar curso' : 'Novo curso', fields: [{ name: 'title', label: 'Nome do curso', value: c ? c.title : '', required: true, max: 120 }, { name: 'total', label: 'Total de aulas', type: 'number', value: c ? c.total : null, required: true }, { name: 'done', label: 'Aulas feitas', type: 'number', value: c ? c.done : 0, required: true },
      { name: 'weekday', label: 'Dia da semana', type: 'select', value: c ? c.weekday : 1, options: H.WEEKDAYS.map((w, i) => [i, w]), required: true }, { name: 'time', label: 'Horário', type: 'time', value: c ? c.time : '' },
      { name: 'start', label: 'Começa em', type: 'date', value: c ? c.start : today, required: true }, { name: 'end', label: 'Termina em', type: 'date', value: c ? c.end : H.shiftMonth(today, 6), required: true }],
      danger: removeBtn(id, 'courses', item),
      onSubmit: v => { if (v.total < 1) return 'Informe o total de aulas.'; if (v.done > v.total) return 'As aulas feitas não podem passar do total.'; if (v.end < v.start) return 'O fim precisa ser depois do começo.';
        saveItem(id, 'courses', item, 'Curso salvo', { title: v.title, total: v.total, done: v.done, weekday: Number(v.weekday), time: v.time, start: v.start, end: v.end }); } });
  };
  A.editLot = ({ id, item }) => {
    const l = item ? goalOf(id).lots.find(l => l.id === item) : null;
    UI.form({ title: l ? 'Editar saldo' : 'Novo saldo de pontos', fields: [{ name: 'program', label: 'Programa', value: l ? l.program : '', required: true, max: 80 }, { name: 'amount', label: 'Quantidade', type: 'number', value: l ? l.amount : null, required: true }, { name: 'unit', label: 'Unidade', type: 'select', value: l ? l.unit : 'milhas', options: [['milhas', 'milhas'], ['pontos', 'pontos']], required: true }, { name: 'expires', label: 'Validade', type: 'date', value: l ? l.expires || '' : '' }],
      danger: removeBtn(id, 'lots', item), onSubmit: v => saveItem(id, 'lots', item, 'Saldo salvo', { program: v.program, amount: v.amount, unit: v.unit, expires: v.expires }) });
  };
  A.editPromo = ({ id, item }) => {
    const p = item ? goalOf(id).promos.find(p => p.id === item) : null;
    UI.form({ title: p ? 'Editar oportunidade' : 'Nova oportunidade', fields: [{ name: 'title', label: 'O que é', value: p ? p.title : '', required: true, max: 200 }, { name: 'expires', label: 'Vale até', type: 'date', value: p ? p.expires || '' : '' }],
      danger: removeBtn(id, 'promos', item), onSubmit: v => saveItem(id, 'promos', item, 'Oportunidade salva', { title: v.title, expires: v.expires }) });
  };
})();
