/* Horizonte — peças de interface: ícones, folhas (sheets), formulários, avisos. */
(function () {
  'use strict';
  const UI = window.UI = {};
  const esc = UI.esc = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>',
    wallet: '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18v3"/><path d="M3 7.5V17a2.5 2.5 0 0 0 2.5 2.5H20a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H5.5A2.5 2.5 0 0 1 3 7.5z"/><circle cx="16.5" cy="13.8" r="1.1"/>',
    basket: '<path d="M5 9h14l-1.4 10a1.5 1.5 0 0 1-1.5 1.3H7.9A1.5 1.5 0 0 1 6.4 19z"/><path d="M3 9h18M9 9l3-5.5L15 9"/>',
    swap: '<path d="M7 20V4M7 4 3.5 7.5M7 4l3.5 3.5M17 4v16M17 20l-3.5-3.5M17 20l3.5-3.5"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    chevR: '<path d="m9 5 7 7-7 7"/>',
    chevL: '<path d="m15 5-7 7 7 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    plane: '<path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5z"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z"/><path d="M4 20a2 2 0 0 0 2 2h13v-4"/>',
    piggy: '<circle cx="12" cy="12" r="9"/><path d="M14.8 9.2c-.5-.9-1.5-1.4-2.8-1.4-1.7 0-2.9.9-2.9 2.1 0 3 5.8 1.3 5.8 4.2 0 1.2-1.2 2.1-2.9 2.1-1.400 0-2.500-.600-3-1.500M12 6v1.800M12 16.200V18"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
    flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
    trash: '<path d="M4 7h16M9 7V4.500h6V7M6.500 7l.800 12a1.500 1.500 0 0 0 1.500 1.400h6.400a1.500 1.500 0 0 0 1.500-1.400l.800-12"/>',
    edit: '<path d="M4 20h4L19.500 8.500a2.100 2.100 0 0 0-3-3L5 17z"/>',
    download: '<path d="M12 4v11M7.500 11l4.500 4.500 4.500-4.500M5 20h14"/>',
    upload: '<path d="M12 16V5M7.500 9 12 4.500 16.500 9M5 20h14"/>',
    alert: '<path d="M12 4 2.800 19.500h18.400z"/><path d="M12 10v4.500M12 17.200v.100"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.200 2"/>',
    repeat: '<path d="M4 11V9.500A3.500 3.500 0 0 1 7.500 6H19M19 6l-3-3M19 6l-3 3M20 13v1.500a3.500 3.500 0 0 1-3.500 3.500H5M5 18l3 3M5 18l3-3"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.500v2.500M12 19v2.500M2.500 12H5M19 12h2.500M5.300 5.300 7 7M17 17l1.700 1.700M18.700 5.300 17 7M7 17l-1.700 1.700"/>',
    phone: '<rect x="6.500" y="2.500" width="11" height="19" rx="2.500"/><path d="M11 18h2"/>',
    star: '<path d="m12 3.500 2.600 5.400 5.900.800-4.300 4.100 1 5.900L12 16.900l-5.200 2.800 1-5.900-4.300-4.100 5.900-.800z"/>',
    dot: '<circle cx="12" cy="12" r="2"/>'
  };
  UI.icon = (name, cls) => '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.dot) + '</svg>';
  UI.bar = (pct, cls) => '<span class="bar ' + (cls || '') + '"><i style="width:' + Math.max(0, Math.min(100, pct || 0)) + '%"></i></span>';

  /* ---------- folha (modal) ---------- */
  let current = null;
  const layer = () => document.getElementById('layer');
  UI.close = () => {
    if (!current) return;
    const el = current.el; current = null;
    el.classList.add('closing');
    setTimeout(() => el.remove(), 180);
    document.body.classList.remove('sheet-open');
  };
  /* opts: { title, html } para conteúdo fixo, ou { title, render } para conteúdo que acompanha os dados */
  UI.sheet = opts => {
    if (current) { current.el.remove(); current = null; }
    const el = document.createElement('div');
    el.className = 'overlay';
    el.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(opts.title) + '"><header class="sheet-head"><h2>' + esc(opts.title) + '</h2><button class="icon-btn" type="button" data-close aria-label="Fechar">' + UI.icon('x') + '</button></header><div class="sheet-body"></div></div>';
    el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-close]')) UI.close(); });
    layer().append(el);
    current = { el, render: opts.render || null };
    el.querySelector('.sheet-body').innerHTML = opts.render ? opts.render() : opts.html;
    document.body.classList.add('sheet-open');
    if (opts.onOpen) opts.onOpen(el);
    return el;
  };
  UI.refresh = () => {
    if (!current || !current.render) return;
    const body = current.el.querySelector('.sheet-body'), top = body.scrollTop;
    body.innerHTML = current.render(); body.scrollTop = top;
  };
  document.addEventListener('keydown', e => { if (e.key === 'Escape') UI.close(); });

  /* ---------- formulário ----------
     fields: [{ name, label, type: text|money|number|date|time|select|textarea, value, required, hint, options: [[valor, rótulo]], list: [sugestões], prefix }] */
  const fieldHtml = f => {
    const id = 'f-' + f.name, req = f.required ? ' required' : '';
    let input;
    if (f.type === 'select') input = '<select id="' + id + '" name="' + f.name + '">' + f.options.map(([v, l]) => '<option value="' + esc(v) + '"' + (String(v) === String(f.value) ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select>';
    else if (f.type === 'textarea') input = '<textarea id="' + id + '" name="' + f.name + '" rows="' + (f.rows || 4) + '" maxlength="' + (f.max || 4000) + '">' + esc(f.value) + '</textarea>';
    else if (f.type === 'money') input = '<span class="money-in"><em>' + (f.prefix || 'R$') + '</em><input id="' + id + '" name="' + f.name + '" inputmode="decimal" autocomplete="off" placeholder="0,00" value="' + esc(H.moneyInput(f.value)) + '"' + req + '></span>';
    else if (f.type === 'number') input = '<input id="' + id + '" name="' + f.name + '" inputmode="numeric" autocomplete="off" value="' + esc(f.value === null || f.value === undefined ? '' : f.value) + '"' + req + '>';
    else {
      const dl = f.list ? ' list="' + id + '-l"' : '';
      input = '<input id="' + id + '" name="' + f.name + '" type="' + (f.type || 'text') + '" autocomplete="off" maxlength="' + (f.max || 120) + '" value="' + esc(f.value) + '"' + req + dl + '>';
      if (f.list) input += '<datalist id="' + id + '-l">' + f.list.map(v => '<option value="' + esc(v) + '">').join('') + '</datalist>';
    }
    return '<label class="field" for="' + id + '"><span>' + esc(f.label) + (f.required ? '' : ' <i>opcional</i>') + '</span>' + input + (f.hint ? '<small>' + esc(f.hint) + '</small>' : '') + '</label>';
  };
  UI.form = opts => {
    const html = '<form class="form" novalidate>' + (opts.intro ? '<p class="muted">' + esc(opts.intro) + '</p>' : '') + opts.fields.map(fieldHtml).join('') +
      '<p class="form-error" role="alert" hidden></p><div class="form-actions">' +
      (opts.danger ? '<button type="button" class="btn ghost danger" data-danger>' + esc(opts.danger.label) + '</button>' : '') +
      '<button class="btn primary" type="submit">' + esc(opts.submit || 'Salvar') + '</button></div></form>';
    const el = UI.sheet({ title: opts.title, html });
    const form = el.querySelector('form'), err = el.querySelector('.form-error');
    const showError = msg => { err.textContent = msg; err.hidden = false; };
    form.addEventListener('submit', e => {
      e.preventDefault();
      const v = {};
      for (const f of opts.fields) {
        const raw = form.elements[f.name].value.trim();
        if (f.required && !raw) return showError('Preencha "' + f.label + '".');
        if (f.type === 'money') {
          if (!raw) v[f.name] = null;
          else { const c = H.parseMoney(raw); if (Number.isNaN(c) || c < 0) return showError('"' + f.label + '" precisa ser um valor em reais, como 1.250,00.'); v[f.name] = c; }
        } else if (f.type === 'number') {
          if (!raw) v[f.name] = null;
          else { const n = Number(raw.replace(/\./g, '')); if (!Number.isInteger(n) || n < 0) return showError('"' + f.label + '" precisa ser um número inteiro.'); v[f.name] = n; }
        } else if (f.type === 'date') {
          if (raw && !H.validDate(raw)) return showError('"' + f.label + '" não é uma data válida.');
          v[f.name] = raw;
        } else v[f.name] = raw;
      }
      const problem = opts.onSubmit(v);
      if (typeof problem === 'string') return showError(problem);
      if (current && current.el === el) UI.close();
    });
    if (opts.danger) el.querySelector('[data-danger]').addEventListener('click', () => { UI.close(); opts.danger.onClick(); });
    const first = form.querySelector('input,select,textarea');
    if (first && window.matchMedia('(min-width: 900px)').matches) first.focus();
  };
  UI.confirm = (title, text, label, onYes, danger) => {
    const el = UI.sheet({ title, html: '<p class="muted">' + esc(text) + '</p><div class="form-actions"><button class="btn ghost" type="button" data-close>Cancelar</button><button class="btn ' + (danger ? 'danger' : 'primary') + '" type="button" data-yes>' + esc(label) + '</button></div>' });
    el.querySelector('[data-yes]').addEventListener('click', () => { UI.close(); onYes(); });
  };

  /* ---------- aviso rápido, com "Desfazer" ---------- */
  let toastTimer = null;
  UI.toast = (msg, opts) => {
    const box = document.getElementById('toasts');
    box.innerHTML = '<div class="toast" role="status"><span>' + esc(msg) + '</span>' + (opts && opts.undo ? '<button type="button">Desfazer</button>' : '') + '</div>';
    const btn = box.querySelector('button');
    if (btn) btn.addEventListener('click', () => { if (H.undo()) UI.toast('Desfeito'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { box.innerHTML = ''; }, opts && opts.undo ? 6000 : 3200);
  };
})();
