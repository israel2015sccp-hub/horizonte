/* Horizonte — Guardado: caixinhas (reservas) e investimentos. Você só atualiza o valor quando ele muda. */
(function () {
  'use strict';
  const { esc, icon, bar } = UI, m = H.money;
  const V = App.views, A = App.actions;
  const F = () => H.state.finance;
  const KIND = { box: 'Caixinha', invest: 'Investimento' };

  /* evolução do total guardado, mês a mês (o app anota sozinho a cada alteração) */
  const chart = f => {
    const log = f.savedLog.slice(-6);
    if (log.length < 2) return '<p class="muted">O gráfico aparece a partir do segundo mês: o app anota o total sozinho.</p>';
    const max = Math.max(1, ...log.map(x => x.total)), first = log[0].total, last = log[log.length - 1].total, diff = last - first;
    return '<div class="chart">' + log.map(x => '<div><span class="chart-v">' + m(x.total).replace(/,\d\d$/, '') + '</span><i style="height:' + Math.max(4, Math.round(x.total / max * 100)) + '%"></i><small>' + H.monthShort(x.month) + '</small></div>').join('') + '</div>' +
      '<small class="' + (diff < 0 ? 'neg' : 'pos') + '">' + (diff < 0 ? '− ' + m(-diff) : '+ ' + m(diff)) + ' desde ' + H.monthShort(log[0].month) + '</small>';
  };

  V.guardado = () => {
    const f = F(), s = H.savedSummary(f);
    let html = App.head('Guardado', 'Caixinhas e investimentos');
    html += '<section class="hero"><small>Total guardado</small><strong class="big">' + m(s.total) + '</strong>' +
      '<div class="hero-grid"><div><small>Em caixinhas</small><b>' + m(s.box) + '</b></div><div><small>Investido</small><b>' + m(s.invest) + '</b></div></div>' +
      '<div class="btn-row"><button class="btn primary" data-a="editSaved">' + icon('plus') + 'Novo</button></div></section>';
    html += '<section class="card"><div class="card-h"><h2>Onde está</h2><span class="muted">toque para atualizar</span></div>' +
      (f.savings.length ? '<div class="list">' + [...f.savings].sort((a, b) => b.amount - a.amount).map(x =>
        '<button class="row" data-a="editSaved" data-id="' + esc(x.id) + '"><span class="row-ic">' + icon(x.kind === 'invest' ? 'target' : 'piggy') + '</span><span class="row-main"><b>' + esc(x.name) + '</b><small>' + KIND[x.kind] + (x.place ? ' · ' + esc(x.place) : '') + ' · ' + (x.goal ? 'meta ' + m(x.goal) : 'atualizado em ' + H.shortDate(x.updated)) + '</small>' + (x.goal ? bar(x.amount / x.goal * 100, 'thin') : '') + '</span><span class="row-amt">' + m(x.amount) + (x.goal ? '<small>' + Math.min(100, Math.floor(x.amount / x.goal * 100)) + '%</small>' : '') + '</span></button>').join('') + '</div>'
        : App.empty('Cadastre cada caixinha ou investimento com o valor de hoje. Depois é só atualizar o número quando mudar.')) + '</section>';
    if (f.savings.length) html += '<section class="card"><div class="card-h"><h2>Evolução</h2><span class="muted">últimos meses</span></div>' + chart(f) + '</section>';
    return html;
  };

  A.editSaved = ({ id }) => {
    const x = id ? F().savings.find(s => s.id === id) : null;
    UI.form({ title: x ? 'Atualizar valor' : 'Novo guardado', intro: x ? '' : 'Só o nome e quanto tem hoje. Nada de senha ou número de conta.',
      fields: [{ name: 'name', label: 'Nome', value: x ? x.name : '', max: 60, required: true, hint: 'Ex.: Reserva de emergência, Viagem, CDB' },
        { name: 'amount', label: 'Quanto tem hoje', type: 'money', value: x ? x.amount : null, required: true },
        { name: 'kind', label: 'Tipo', type: 'select', value: x ? x.kind : 'box', options: [['box', 'Caixinha / reserva'], ['invest', 'Investimento']], required: true },
        { name: 'goal', label: 'Meta', type: 'money', value: x ? x.goal : null, hint: 'Quanto você quer juntar aqui. Mostra uma barra de progresso.' },
        { name: 'place', label: 'Onde fica', value: x ? x.place : '', max: 60, list: ['Nubank', 'Itaú', 'Santander', 'Mercado Pago', 'Inter', 'Corretora'] }],
      danger: x ? { label: 'Excluir', onClick: () => UI.confirm('Excluir "' + x.name + '"?', 'Sai do total guardado.', 'Excluir', () => App.act('Excluído', f => { f.savings = f.savings.filter(s => s.id !== x.id); }), true) } : null,
      onSubmit: v => {
        if (v.amount === null) return 'Informe o valor.';
        App.act(x ? 'Valor atualizado' : 'Guardado criado', f => {
          const data = { name: v.name, amount: v.amount, kind: v.kind, goal: v.goal || null, place: v.place, updated: H.today() }, cur = x && f.savings.find(s => s.id === x.id);
          if (cur) Object.assign(cur, data); else f.savings.push({ id: H.id(), ...data });
        });
      } });
  };
})();
