/* Horizonte — extras: avisos do Início, ocultar valores, lembrete de backup, busca, simulador, PIN e "como usar". */
(function () {
  'use strict';
  const { esc, icon } = UI, m = H.money;
  const V = App.views, A = App.actions;
  const F = () => H.state.finance;
  /* preferências deste aparelho (ficam fora do backup) */
  const get = k => { try { return localStorage.getItem('horizonte.' + k); } catch (e) { return null; } };
  const set = (k, v) => { try { if (v === null) localStorage.removeItem('horizonte.' + k); else localStorage.setItem('horizonte.' + k, v); } catch (e) { /* sem armazenamento */ } };

  /* ---------- ocultar valores ---------- */
  const applyHide = () => document.body.classList.toggle('hide-values', get('hide') === '1');
  A.toggleHide = () => { set('hide', get('hide') === '1' ? null : '1'); applyHide(); UI.toast(get('hide') === '1' ? 'Valores ocultos' : 'Valores visíveis'); };
  App.homeButtons = () => '<a class="icon-btn keep" href="#/buscar" aria-label="Buscar">' + icon('search') + '</a><button class="icon-btn keep" data-a="toggleHide" aria-label="Ocultar ou mostrar valores">' + icon('eye') + '</button>';

  /* ---------- lembrete de backup ---------- */
  const exportBackup = A.exportBackup;
  A.exportBackup = () => { exportBackup(); set('backupAt', H.today()); App.render(); };
  const hasData = f => f.purchases.length + f.savings.length + f.receipts.length + f.expenses.length > 0;

  /* ---------- avisos do Início ---------- */
  App.homeNotes = (f, list) => {
    const today = H.today(), limit = H.addDays(today, 3), month = H.currentMonth();
    let html = '';
    const soon = list.filter(i => !i.paid && i.date && i.date >= today && i.date <= limit);
    if (soon.length) html += '<a class="note" href="#/mes">' + icon('clock') + '<p><b>' + (soon.length === 1 ? esc(soon[0].title) + ' vence ' + H.relative(soon[0].date) : soon.length + ' contas vencem nos próximos 3 dias') + '.</b> ' +
      m(H.sum(soon, i => i.amount || 0)) + ' no total.</p></a>';
    for (const a of H.cardAlerts(f, month)) html += '<a class="note warn" href="#/cartoes">' + icon('alert') + '<p><b>Fatura ' + esc(a.name) + ' veio ' + a.pct + '% acima do normal.</b> ' + m(a.amount) + ' agora, contra ' + m(a.avg) + ' de média.</p></a>';
    const last = get('backupAt'), age = last && H.validDate(last) ? -H.diffDays(last) : null;
    if (hasData(f) && (age === null || age > 30)) html += '<button class="note" data-a="exportBackup">' + icon('download') + '<p><b>' + (age === null ? 'Você ainda não salvou um backup neste aparelho.' : 'Faz ' + age + ' dias que você não salva um backup.') + '</b> Toque aqui para salvar uma cópia agora.</p></button>';
    return html;
  };

  /* ---------- busca ---------- */
  let query = '';
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const hit = (a, sub, amt, extra) => '<' + (extra.startsWith('href') ? 'a' : 'button') + ' class="row link" ' + extra + '><span class="row-main"><b>' + esc(a) + '</b><small>' + esc(sub) + '</small></span><span class="row-amt">' + amt + '</span></' + (extra.startsWith('href') ? 'a' : 'button') + '>';
  const results = () => {
    const q = norm(query.trim());
    if (q.length < 2) return '<p class="muted pad">Digite pelo menos 2 letras: nome de uma compra, conta, cartão, caixinha ou objetivo.</p>';
    const f = F(), out = [], ok = (...t) => t.some(x => norm(x).includes(q));
    for (const p of f.purchases) if (ok(p.name, p.bank)) out.push(hit(p.name, 'Dívida · ' + p.paid.length + ' de ' + p.total + ' pagas' + (p.bank ? ' · ' + p.bank : ''), m(H.remaining(p)), 'data-a="debt" data-id="' + esc(p.id) + '"'));
    for (const b of f.budgets) if (b.active && ok(b.name)) out.push(hit(b.name, b.type === 'card' ? 'Cartão' : b.type === 'fixed' ? 'Conta fixa' : 'Caixinha de gasto', b.amount === null ? '' : m(b.amount), 'href="#/' + (b.type === 'card' ? 'cartoes' : 'casa') + '"'));
    for (const s of f.savings) if (ok(s.name, s.place)) out.push(hit(s.name, 'Guardado' + (s.place ? ' · ' + s.place : ''), m(s.amount), 'data-a="editSaved" data-id="' + esc(s.id) + '"'));
    for (const g of H.state.horizon.goals) if (ok(g.title, g.summary)) out.push(hit(g.title, 'Objetivo', '', 'href="#/objetivo/' + encodeURIComponent(g.id) + '"'));
    const rows = H.cashRows(f).filter(r => ok(r.description, r.who)).slice(0, 40);
    for (const r of rows) out.push(hit(r.description || r.who, H.shortDate(r.date) + ' · ' + r.who, (r.direction === 'in' ? '+ ' : '− ') + m(r.amount), 'href="#/caixa"'));
    return out.length ? '<div class="list">' + out.join('') + '</div>' : '<p class="muted pad">Nada encontrado para "' + esc(query.trim()) + '".</p>';
  };
  V.buscar = () => App.head('Buscar', 'Compras, contas, cartões, caixinhas e objetivos', '', '#/inicio') +
    '<section class="card"><label class="field" for="q"><input id="q" type="search" autocomplete="off" placeholder="O que você procura?" value="' + esc(query) + '"></label><div id="q-out">' + results() + '</div></section>';
  document.addEventListener('input', e => { if (e.target.id !== 'q') return; query = e.target.value; const out = document.getElementById('q-out'); if (out) out.innerHTML = results(); });

  /* ---------- simulador: pagar um extra por mês ---------- */
  A.simulate = () => UI.form({ title: 'Simular pagamento extra', intro: 'Quanto a mais por mês você conseguiria colocar nas dívidas? O extra adianta as últimas parcelas.', submit: 'Simular',
    fields: [{ name: 'extra', label: 'Extra por mês', type: 'money', value: null, required: true }],
    onSubmit: v => {
      if (!v.extra) return 'Informe um valor maior que zero.';
      const f = F(), base = H.debtFreeMonth(f), sim = H.payoffWithExtra(f, v.extra);
      if (!base || !sim) return 'Não há parcelas em aberto.';
      const [y1, m1] = base.split('-').map(Number), [y2, m2] = sim.split('-').map(Number), gain = (y1 - y2) * 12 + (m1 - m2);
      setTimeout(() => UI.sheet({ title: 'Resultado da simulação', html: '<div class="trio two"><div><small>Hoje termina em</small><b>' + H.monthShort(base) + '</b></div><div><small>Com ' + m(v.extra) + ' a mais</small><b class="pos">' + H.monthShort(sim) + '</b></div></div>' +
        '<p class="muted">' + (gain > 0 ? 'Você termina <b>' + gain + (gain === 1 ? ' mês' : ' meses') + ' antes</b>. ' : 'Esse valor ainda não adianta nenhum mês. ') + 'A conta considera o valor cheio das parcelas; se o banco der desconto de juros ao adiantar, o ganho é maior.</p>' +
        '<div class="form-actions"><button class="btn primary" type="button" data-close>Entendi</button></div>' }), 220);
    } });

  /* ---------- PIN (trava simples deste aparelho) ---------- */
  const sha = async text => { const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''); };
  const canPin = () => !!(window.crypto && crypto.subtle);
  const pinOk = async pin => { const [salt, h] = (get('pin') || ':').split(':'); return (await sha(salt + pin)) === h; };
  const lock = () => {
    if (!get('pin') || !canPin()) return;
    document.body.classList.add('locked');
    const el = document.createElement('div');
    el.className = 'lock';
    el.innerHTML = '<form><img src="icons/icon-192.png" alt="" width="72" height="72"><h1>Horizonte</h1><label for="pin-in">Digite seu PIN</label><input id="pin-in" type="password" inputmode="numeric" autocomplete="off" maxlength="8"><p class="form-error" role="alert" hidden>PIN incorreto.</p><button class="btn primary big" type="submit">Abrir</button><button class="link-btn" type="button" data-forgot>Esqueci o PIN</button></form>';
    document.body.append(el);
    const input = el.querySelector('input');
    el.querySelector('form').addEventListener('submit', async e => {
      e.preventDefault();
      if (await pinOk(input.value)) { el.remove(); document.body.classList.remove('locked'); }
      else { el.querySelector('.form-error').hidden = false; input.value = ''; input.focus(); }
    });
    el.querySelector('[data-forgot]').addEventListener('click', () => {
      if (!confirm('Sem o PIN, a única saída é apagar os dados do app NESTE aparelho e depois importar seu backup.\n\nApagar tudo deste aparelho?')) return;
      if (!confirm('Tem certeza? Sem um backup salvo, os dados se perdem para sempre.')) return;
      try { localStorage.removeItem(H.KEY); } catch (e) { /* nada */ }
      set('pin', null); location.reload();
    });
    input.focus();
  };
  A.setPin = () => {
    if (!canPin()) return UI.toast('Este navegador não permite criar PIN aqui.');
    const has = !!get('pin');
    UI.form({ title: has ? 'Trocar ou remover PIN' : 'Criar PIN', intro: 'Pede um PIN ao abrir o app neste aparelho. Guarde bem: sem ele, só apagando os dados e importando o backup.', submit: has ? 'Trocar PIN' : 'Criar PIN',
      fields: [{ name: 'pin', label: 'PIN (4 a 8 números)', type: 'password', value: '', required: true, max: 8 }, { name: 'again', label: 'Repita o PIN', type: 'password', value: '', required: true, max: 8 }],
      danger: has ? { label: 'Remover PIN', onClick: () => { set('pin', null); UI.toast('PIN removido'); App.render(); } } : null,
      onSubmit: v => {
        if (!/^\d{4,8}$/.test(v.pin)) return 'Use de 4 a 8 números.';
        if (v.pin !== v.again) return 'Os dois PINs não são iguais.';
        const salt = H.id().slice(0, 8);
        sha(salt + v.pin).then(h => { set('pin', salt + ':' + h); UI.toast('PIN criado'); App.render(); });
      } });
  };

  /* ---------- como usar ---------- */
  A.tour = () => UI.sheet({ title: 'Como usar', html: '<div class="list">' + [
    ['piggy', 'Guardado', 'Cadastre caixinhas e investimentos. Só atualize o valor quando ele mudar.'],
    ['calendar', 'Mês', 'Toque numa conta ou fatura para marcar como paga. Dá para desfazer.'],
    ['wallet', 'Dívidas', 'Empréstimos e parcelas, com a data em que você fica livre.'],
    ['upload', 'Importar extrato', 'O arquivo do banco marca sozinho as parcelas pagas. Sem senha, sem ligar ao banco.'],
    ['download', 'Backup', 'Seus dados ficam só neste aparelho. Salve uma cópia em Ajustes de vez em quando.']
  ].map(([ic, t, s]) => '<div class="row"><span class="row-ic">' + icon(ic) + '</span><span class="row-main"><b>' + t + '</b><small>' + s + '</small></span></div>').join('') + '</div><div class="form-actions"><button class="btn primary" type="button" data-close>Começar</button></div>' });
  const startBlank = A.startBlank;
  A.startBlank = () => { startBlank(); setTimeout(A.tour, 300); };

  /* ---------- seção em Ajustes ---------- */
  App.settingsExtra = () => {
    const last = get('backupAt');
    return '<section class="card"><h2>Segurança</h2><div class="list">' +
      '<button class="row link" data-a="setPin"><span class="row-ic">' + icon('lock') + '</span><span class="row-main"><b>PIN para abrir</b><small>' + (get('pin') ? 'Ligado neste aparelho' : 'Desligado') + '</small></span>' + icon('chevR', 'dim') + '</button>' +
      '<button class="row link" data-a="toggleHide"><span class="row-ic">' + icon('eye') + '</span><span class="row-main"><b>Ocultar valores</b><small>Para abrir o app perto de outras pessoas</small></span><span class="pill">Trocar</span></button>' +
      '<button class="row link" data-a="tour"><span class="row-ic">' + icon('book') + '</span><span class="row-main"><b>Como usar</b><small>Resumo em 5 passos</small></span>' + icon('chevR', 'dim') + '</button>' +
      '</div><small class="muted">' + (last ? 'Último backup neste aparelho: ' + H.dateLabel(last) + '.' : 'Nenhum backup salvo neste aparelho ainda.') + ' O PIN é uma trava simples, não substitui o bloqueio do celular.</small></section>';
  };

  applyHide();
  lock();
})();
