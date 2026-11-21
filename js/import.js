/* Horizonte — importar extrato da conta ou fatura do cartão (OFX ou CSV). O arquivo é lido só neste aparelho. */
(function () {
  'use strict';
  const { esc, icon } = UI, m = H.money;
  const V = App.views, A = App.actions, head = App.head;
  const F = () => H.state.finance;

  /* ---------- leitura dos arquivos ---------- */
  const toCents = raw => {
    let s = String(raw == null ? '' : raw).replace(/[R$\s "]/g, '');
    if (!/\d/.test(s)) return null;
    const neg = /^\(.*\)$/.test(s) || s.includes('-') || /D$/i.test(s);
    s = s.replace(/[^\d.,]/g, '');
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/,/g, '');
    const n = Math.round(parseFloat(s) * 100);
    return Number.isFinite(n) ? (neg ? -n : n) : null;
  };
  const toDate = raw => {
    const s = String(raw || '').trim();
    let x = s.match(/^(\d{4})-(\d{2})-(\d{2})/) || s.match(/^(\d{4})(\d{2})(\d{2})/);
    if (x) return H.validDate(x[1] + '-' + x[2] + '-' + x[3]) ? x[1] + '-' + x[2] + '-' + x[3] : null;
    x = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
    if (!x) return null;
    const d = (x[3].length === 2 ? '20' + x[3] : x[3]) + '-' + x[2].padStart(2, '0') + '-' + x[1].padStart(2, '0');
    return H.validDate(d) ? d : null;
  };
  const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); };
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 300);

  const parseOFX = text => {
    const rows = [], tag = (block, name) => { const x = block.match(new RegExp('<' + name + '>([^<\\r\\n]*)', 'i')); return x ? x[1].trim() : ''; };
    for (const block of text.split(/<STMTTRN>/i).slice(1)) {
      const date = toDate(tag(block, 'DTPOSTED')), amount = toCents(tag(block, 'TRNAMT').replace(',', '.'));
      if (date && amount) rows.push({ date, amount, description: clean(tag(block, 'MEMO') || tag(block, 'NAME')) || 'Lançamento', ref: tag(block, 'FITID') });
    }
    /* a "chave" da conta é um resumo embaralhado de banco + conta: reconhece o extrato sem guardar o número */
    const acct = tag(text, 'ACCTID');
    return { rows, card: /<CREDITCARDMSGSRSV1>|<CCSTMTRS>/i.test(text), acct: acct ? hash(tag(text, 'BANKID') + '|' + acct) : '', org: clean(tag(text, 'ORG')).slice(0, 60) };
  };
  const splitCSV = (text, sep) => {
    const out = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === sep) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some(x => x.trim())) out.push(row); row = []; }
      else cell += c;
    }
    row.push(cell); if (row.some(x => x.trim())) out.push(row);
    return out;
  };
  const parseCSV = text => {
    const first = text.split(/\r?\n/).slice(0, 5).join('\n');
    const sep = [';', '\t', ','].map(s => [s, first.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
    const lines = splitCSV(text, sep), norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
    let hi = lines.slice(0, 15).findIndex(l => l.some(c => /^(data|date)/.test(norm(c))) && l.length > 1);
    let col = { date: -1, amount: -1, desc: -1, cred: -1, deb: -1, ref: -1 };
    if (hi >= 0) lines[hi].forEach((c, i) => {
      const n = norm(c);
      if (col.date < 0 && /^(data|date)/.test(n)) col.date = i;
      else if (col.cred < 0 && /(credito|entrada)/.test(n)) col.cred = i;
      else if (col.deb < 0 && /(debito|saida)/.test(n)) col.deb = i;
      else if (col.amount < 0 && /(valor|amount|montante|quantia)/.test(n)) col.amount = i;
      else if (col.desc < 0 && /(descri|title|titulo|hist|lancamento|estabelecimento|memo|detalhe)/.test(n)) col.desc = i;
      else if (col.ref < 0 && /(identificador|^id$|documento)/.test(n)) col.ref = i;
    });
    else { /* sem cabeçalho: descobre pelas células */
      const sample = lines.find(l => l.some(toDate)) || [];
      col.date = sample.findIndex(c => toDate(c));
      col.amount = sample.findIndex((c, i) => i !== col.date && /\d[.,]\d{2}\s*$/.test(c) && toCents(c) !== null);
      col.desc = sample.findIndex((c, i) => i !== col.date && i !== col.amount && /[a-zA-Z]{3}/.test(c));
    }
    const rows = [];
    for (const l of lines.slice(hi + 1)) {
      const date = toDate(l[col.date]);
      let amount = col.amount >= 0 ? toCents(l[col.amount]) : null;
      if (amount === null && (col.cred >= 0 || col.deb >= 0)) { const c = Math.abs(toCents(l[col.cred]) || 0), d = Math.abs(toCents(l[col.deb]) || 0); amount = c - d; }
      if (date && amount) rows.push({ date, amount, description: clean(l[col.desc]) || 'Lançamento', ref: col.ref >= 0 ? clean(l[col.ref]) : '' });
    }
    return { rows, card: false };
  };
  /* devolve { rows: [{date, amount (centavos; + entrou, − saiu), description, ref}], card } */
  H.parseStatement = text => /<OFX>|<STMTTRN>/i.test(text) ? parseOFX(text) : parseCSV(text);

  /* ---------- tela ---------- */
  let S = null; /* { kind: 'account'|'card', name, rows: [{..., id, on, dup}] } */
  const days = (a, b) => Math.abs(Date.parse(a) - Date.parse(b)) / 864e5;
  const prepare = (kind, name, parsed) => {
    const f = F(), existing = H.cashRows(f), ids = new Set(existing.map(r => r.id)), seen = {};
    /* parcelas em aberto fora dos cartões (empréstimos etc.): a saída com o mesmo valor marca a parcela como paga */
    const cards = H.activeCards(f), taken = new Set();
    const open = kind === 'account' ? H.allEntries(f.purchases).filter(e => !e.paid && !cards.some(b => H.cardMatches(e.p, b))) : [];
    const matchInst = r => {
      if (r.amount >= 0) return null;
      const e = open.find(e => e.amount === -r.amount && !taken.has(e.p.id + ':' + e.i) && days(e.date, r.date) <= 45);
      if (!e) return null;
      taken.add(e.p.id + ':' + e.i);
      return { id: e.p.id, i: e.i, label: 'parcela ' + (e.i + 1) + ' de ' + e.p.total + ' · ' + e.p.name };
    };
    const rows = [...parsed.rows].sort((a, b) => a.date.localeCompare(b.date)).map(r => {
      /* na fatura, gasto vem positivo; no extrato, gasto vem negativo */
      const amount = kind === 'card' ? r.amount : r.amount, key = r.ref || r.date + '|' + amount + '|' + r.description;
      seen[key] = (seen[key] || 0) + 1;
      const id = 'imp:' + hash(kind + '|' + (parsed.acct || '') + '|' + key + '|' + seen[key]);
      let dup = '';
      if (kind === 'account') {
        if (ids.has(id)) dup = 'já importado';
        else if (existing.some(e => e.amount === Math.abs(amount) && (e.direction === 'in') === (amount > 0) && e.direction !== 'credit' && days(e.date, r.date) <= 3)) dup = 'parece já lançado';
      } else if (/pagamento|payment/i.test(r.description)) dup = 'pagamento da fatura';
      return { ...r, amount, id, dup, on: !dup, inst: dup === 'já importado' ? null : matchInst(r) };
    }).sort((a, b) => b.date.localeCompare(a.date));
    const known = kind === 'account' && parsed.acct ? f.accounts.find(a => a.keys.includes(parsed.acct)) : null;
    S = { kind, name, rows, acct: parsed.acct || '', org: parsed.org || '', account: known ? known.id : null, auto: !!known };
  };

  /* ---------- contas ---------- */
  const accountForm = (acc, done) => {
    const f = F();
    UI.form({ title: acc ? 'Editar conta' : 'Nova conta', intro: 'Só o nome do banco e de quem é. Nada de número de conta ou senha.',
      fields: [{ name: 'bank', label: 'Banco', value: acc ? acc.bank : (S && S.org) || '', max: 60, required: true, list: ['Nubank', 'Itaú', 'Santander', 'Mercado Pago', 'Bradesco', 'Caixa', 'Banco do Brasil', 'Inter', 'C6 Bank'] },
        { name: 'owner', label: 'De quem é', value: acc ? acc.owner : '', max: 60, required: true, list: [...f.names, 'Casal'] },
        { name: 'type', label: 'Tipo', type: 'select', value: acc ? acc.type : 'pf', options: [['pf', 'CPF (pessoal)'], ['pj', 'CNPJ (empresa)']] }],
      danger: acc ? { label: 'Excluir conta', onClick: () => UI.confirm('Excluir conta?', 'Os lançamentos já importados continuam no Caixa, só perdem o nome da conta.', 'Excluir', () => App.act('Conta excluída', f => { f.accounts = f.accounts.filter(a => a.id !== acc.id); }), true) } : null,
      onSubmit: v => {
        const id = acc ? acc.id : H.id();
        App.act(acc ? 'Conta atualizada' : 'Conta criada', f => {
          const a = f.accounts.find(a => a.id === id);
          if (a) Object.assign(a, { bank: v.bank, owner: v.owner, type: v.type }); else f.accounts.push({ id, bank: v.bank, owner: v.owner, type: v.type, keys: [] });
        });
        if (done) setTimeout(() => done(id), 0);
      } });
  };
  A.newAccount = () => accountForm(null);
  A.editAccount = ({ id }) => { const a = F().accounts.find(a => a.id === id); if (a) accountForm(a); };
  const chooseAccount = done => {
    const f = F(), pick = id => { S.account = id; S.auto = false; App.render(); if (done) done(); };
    if (!f.accounts.length) return accountForm(null, pick);
    UI.form({ title: 'De qual conta é este extrato?', intro: S.acct ? 'Na próxima vez o app reconhece esta conta sozinho.' : '', submit: 'Continuar',
      fields: [{ name: 'account', label: 'Conta', type: 'select', value: S.account || f.accounts[0].id, options: [...f.accounts.map(a => [a.id, H.accountName(f, a.id)]), ['__new', 'Nova conta…']], required: true }],
      onSubmit: v => { if (v.account === '__new') setTimeout(() => accountForm(null, pick), 0); else setTimeout(() => pick(v.account), 0); } });
  };
  A.importAccount = () => chooseAccount();

  V.importar = () => {
    let html = head('Importar extrato', 'O arquivo é lido só neste aparelho', '', '#/mais');
    const f0 = F(), accounts = '<section class="card"><div class="card-h"><h2>Suas contas</h2><button class="btn small" data-a="newAccount">' + icon('plus') + 'Nova conta</button></div>' +
      (f0.accounts.length ? '<div class="list">' + f0.accounts.map(a => '<button class="row" data-a="editAccount" data-id="' + esc(a.id) + '"><span class="row-main"><b>' + esc(a.bank) + '</b><small>' + esc(a.owner) + ' · ' + (a.type === 'pj' ? 'CNPJ' : 'CPF') + (a.keys.length ? ' · extrato reconhecido sozinho' : '') + '</small></span>' + icon('chevR', 'dim') + '</button>').join('') + '</div>'
        : '<p class="muted">Cadastre cada conta (banco, de quem é, CPF ou CNPJ). Ao importar, você diz de qual conta é o extrato; arquivos OFX passam a ser reconhecidos sozinhos.</p>') + '</section>';
    if (!S) return html +
      '<section class="card"><h2>Como funciona</h2><p class="muted">No app ou site do banco, exporte o extrato ou a fatura em <b>OFX</b> ou <b>CSV</b> e escolha o arquivo aqui. Você confere tudo antes de entrar. Nenhuma senha, nenhuma conexão com o banco.</p>' +
      '<div class="btn-row"><button class="btn primary" data-a="pickStatement" data-kind="account">' + icon('swap') + 'Extrato da conta</button><button class="btn" data-a="pickStatement" data-kind="card">' + icon('card') + 'Fatura do cartão</button></div></section>' +
      '<div class="note">' + icon('alert') + '<p><b>Extrato da conta</b> lança entradas e saídas no saldo. <b>Fatura do cartão</b> preenche o valor da fatura do mês.</p></div>' + accounts;
    const on = S.rows.filter(r => r.on);
    if (!S.rows.length) return html + '<section class="card">' + App.empty('Não encontrei lançamentos em "' + S.name + '". Confira se o arquivo é OFX ou CSV.', '<button class="btn" data-a="importCancel">Escolher outro arquivo</button>') + '</section>';
    const list = '<div class="list">' + S.rows.map((r, i) => '<button class="row bill' + (r.on ? ' is-on' : '') + '" data-a="importToggle" data-i="' + i + '" aria-pressed="' + r.on + '"><span class="check">' + (r.on ? icon('check') : '') + '</span><span class="row-main"><b>' + esc(r.description) + '</b><small>' + H.shortDate(r.date) + (r.dup ? ' · ' + r.dup : '') + '</small>' + (r.inst ? '<small class="pos">marca paga: ' + esc(r.inst.label) + '</small>' : '') + '</span><span class="row-amt' + (S.kind === 'account' && r.amount > 0 ? ' pos' : '') + '">' + (S.kind === 'account' ? (r.amount > 0 ? '+ ' : '− ') : (r.amount < 0 ? '− ' : '')) + m(Math.abs(r.amount)) + '</span></button>').join('') + '</div>';
    if (S.kind === 'account') {
      const ins = H.sum(on.filter(r => r.amount > 0), r => r.amount), outs = H.sum(on.filter(r => r.amount < 0), r => -r.amount);
      html += '<section class="hero slim"><small>' + esc(S.name) + '</small><strong class="big">' + on.length + ' de ' + S.rows.length + ' lançamentos</strong><div class="hero-grid"><div><small>Entradas</small><b class="pos">' + m(ins) + '</b></div><div><small>Saídas</small><b>' + m(outs) + '</b></div></div></section>' +
        '<section class="card"><div class="list"><button class="row" data-a="importAccount"><span class="row-main"><b>' + (S.account ? esc(H.accountName(F(), S.account)) : 'De qual conta é este extrato?') + '</b><small>' + (S.account ? (S.auto ? 'Conta reconhecida pelo arquivo' : 'Conta escolhida') + ' · toque para trocar' : 'Toque para escolher') + '</small></span>' + icon('chevR', 'dim') + '</button></div></section>' +
        '<div class="note warn">' + icon('alert') + '<p>Desmarquei o que parece repetido. Desmarque também pagamentos de contas e faturas que você já marcou como pagas no Mês, para não contar duas vezes. Saída com o valor exato de uma parcela em aberto marca essa parcela como paga.</p></div>';
    } else {
      const total = H.sum(on, r => r.amount);
      html += '<section class="hero slim"><small>' + esc(S.name) + '</small><strong class="big">' + m(total) + '</strong><small>Soma de ' + on.length + ' lançamentos marcados</small></section>';
    }
    return html + '<section class="card"><div class="card-h"><h2>Conferir</h2><span class="muted">toque para marcar ou desmarcar</span></div>' + list + '</section>' +
      '<div class="btn-row sticky"><button class="btn ghost" data-a="importCancel">Cancelar</button><button class="btn primary" data-a="importApply"' + (on.length ? '' : ' disabled') + '>' + (S.kind === 'account' ? 'Importar ' + on.length : 'Usar como fatura') + '</button></div>';
  };

  App.importText = (kind, name, text) => { try { prepare(kind, name, H.parseStatement(text)); } catch (e) { S = { kind, name, rows: [] }; } App.render(); };
  A.pickStatement = ({ kind }) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.ofx,.csv,.txt,text/csv,application/x-ofx';
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      if (/\.pdf$/i.test(file.name)) return UI.toast('PDF ainda não é lido aqui. Exporte em OFX ou CSV.');
      const buf = await file.arrayBuffer();
      let text;
      try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { text = new TextDecoder('windows-1252').decode(buf); }
      App.importText(kind, file.name, text);
    });
    input.click();
  };
  A.importToggle = ({ i }) => { S.rows[i].on = !S.rows[i].on; App.render(); };
  A.importCancel = () => { S = null; App.render(); };
  A.importApply = () => {
    const on = S.rows.filter(r => r.on);
    if (!on.length) return;
    if (S.kind === 'account') {
      if (!S.account || !F().accounts.some(a => a.id === S.account)) return chooseAccount(() => A.importApply());
      const account = S.account, key = S.acct;
      App.act(on.length + ' lançamentos importados', f => {
        const have = new Set([...f.receipts, ...f.outflows].map(r => r.id)), acc = f.accounts.find(a => a.id === account);
        if (key && !acc.keys.includes(key)) acc.keys.push(key);
        for (const r of on) {
          if (have.has(r.id)) continue;
          if (r.amount > 0) f.receipts.push({ id: r.id, date: r.date, amount: r.amount, description: r.description, owner: 2, kind: 'other', account });
          else f.outflows.push({ id: r.id, date: r.date, amount: -r.amount, description: r.description, account });
        }
        for (const r of on) {
          const p = r.inst && f.purchases.find(p => p.id === r.inst.id);
          if (p && !p.paid.includes(r.inst.i)) p.paid = [...p.paid, r.inst.i].sort((a, b) => a - b);
        }
      });
      S = null; App.go('#/caixa');
      return;
    }
    const cards = H.activeCards(F());
    if (!cards.length) return UI.toast('Cadastre um cartão primeiro, em Cartões.');
    const total = H.sum(on, r => r.amount), last = H.monthOf(S.rows[0].date), months = [-1, 0, 1, 2].map(n => H.addMonths(last, n));
    UI.form({ title: 'Fatura do cartão', intro: 'O valor entra como fatura fechada do mês escolhido.',
      fields: [{ name: 'card', label: 'Cartão', type: 'select', value: cards[0].id, options: cards.map(b => [b.id, H.cardName(b)]), required: true },
        { name: 'month', label: 'Mês em que a fatura vence', type: 'select', value: months.includes(H.currentMonth()) ? H.currentMonth() : months[2], options: months.map(k => [k, H.monthLabel(k)]), required: true },
        { name: 'amount', label: 'Valor da fatura', type: 'money', value: Math.max(0, total), required: true }],
      onSubmit: v => {
        App.act('Fatura atualizada', f => {
          const b = f.budgets.find(b => b.id === v.card), period = 'm:' + v.month, a = b.allocations.find(a => a.period === period);
          if (a) a.amount = v.amount || 0; else b.allocations.push({ period, amount: v.amount || 0 });
        });
        S = null; App.go('#/cartoes');
      } });
  };
})();
