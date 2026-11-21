/* Horizonte — casca do app: navegação, renderização, backup e ajustes. */
(function () {
  'use strict';
  const { esc, icon } = UI;
  const App = window.App = { views: {}, actions: {}, month: null, route: '', param: '' };
  const NAV = [['inicio', 'Início', 'home'], ['mes', 'Mês', 'calendar'], ['cartoes', 'Cartões', 'card'], ['dividas', 'Dívidas', 'wallet'], ['casa', 'Casa', 'basket'], ['guardado', 'Guardado', 'piggy'], ['caixa', 'Entradas e saídas', 'swap'],['importar', 'Importar extrato', 'upload'], ['buscar', 'Buscar', 'search'], ['ajustes', 'Ajustes', 'settings']];
  const TABS = [['inicio', 'Início', 'home'], ['mes', 'Mês', 'calendar'], ['guardado', 'Guardado', 'piggy'], ['dividas', 'Dívidas', 'wallet'], ['mais', 'Mais', 'grid']];
  const TAB_OF = { buscar: 'mais', importar: 'mais', cartoes: 'mais', casa: 'mais', caixa: 'mais', ajustes: 'mais' };
  const V = App.views, A = App.actions;

  /* aplica uma mudança, salva e avisa (com Desfazer) */
  App.act = (msg, fn) => { const ok = H.commit(fn); UI.toast(ok ? msg : msg + ' (o navegador não deixou salvar)', { undo: true }); };
  App.go = hash => { if (location.hash === hash) App.render(); else location.hash = hash; };
  App.head = (title, sub, right, back) => '<header class="head">' + (back ? '<a class="icon-btn" href="' + back + '" aria-label="Voltar">' + icon('chevL') + '</a>' : '') +
    '<div class="head-t"><h1>' + esc(title) + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div><div class="head-r">' + (right || '') + '</div></header>';
  /* bloco que abre e fecha: o que é detalhe fica um toque abaixo. Lembra se estava aberto ao redesenhar a tela. */
  const OPEN = new Set();
  App.fold = (key, summary, body, cls) => '<details class="fold' + (cls ? ' ' + cls : '') + '" data-k="' + esc(key) + '"' + (OPEN.has(key) ? ' open' : '') + '><summary>' + summary + icon('chevR', 'dim') + '</summary><div class="fold-b">' + body + '</div></details>';
  document.addEventListener('toggle', e => { const k = e.target.dataset && e.target.dataset.k; if (k) OPEN[e.target.open ? 'add' : 'delete'](k); }, true);
  App.empty = (text, button) => '<div class="empty"><p>' + esc(text) + '</p>' + (button || '') + '</div>';

  App.render = () => {
    const view = document.getElementById('view');
    if (!H.state) { document.body.classList.add('no-data'); view.innerHTML = V.bemvindo(); return; }
    document.body.classList.remove('no-data');
    const dark = H.state.finance.dark;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name=theme-color]').content = dark ? '#0b0f0d' : '#f3f5f2';
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    const route = V[parts[0]] && parts[0] !== 'bemvindo' ? parts[0] : 'inicio', param = parts[1] ? decodeURIComponent(parts[1]) : '';
    const changed = route !== App.route || param !== App.param;
    App.route = route; App.param = param;
    view.innerHTML = V[route](param);
    const tab = TAB_OF[route] || route;
    for (const a of document.querySelectorAll('[data-r]')) {
      const on = a.closest('.tabs') ? a.dataset.r === tab : a.dataset.r === route;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    }
    if (changed) window.scrollTo(0, 0);
    UI.refresh();
  };

  /* ---------- boas-vindas (sem dados) ---------- */
  V.bemvindo = () => '<div class="welcome"><img src="icons/icon-192.png" alt="" width="84" height="84"><h1>Horizonte</h1><p>Contas, cartões e parcelas do casal em um só lugar. Os dados ficam guardados neste aparelho.</p>' +
    '<button class="btn primary big" data-a="importBackup">' + icon('upload') + 'Importar meu backup</button>' +
    '<button class="btn ghost big" data-a="pasteBackup">Colar o texto do backup</button>' +
    '<button class="btn ghost big" data-a="startBlank">Começar do zero</button>' +
    '<small>O backup é o arquivo .json exportado pelo Horizonte antigo.</small></div>';
  A.startBlank = () => { H.state = H.blankState(); H.persist(); App.go('#/inicio'); };

  /* ---------- menu "Mais" (celular) ---------- */
  const MAIS = [['Dinheiro do dia a dia', [['cartoes', 'Cartões', 'card', 'Faturas, limites e assinaturas'], ['casa', 'Casa', 'basket', 'Contas fixas e caixinhas'], ['caixa', 'Entradas e saídas', 'swap', 'Saldo em conta (opcional)']]],
    ['Ferramentas', [['importar', 'Importar extrato', 'upload', 'Ler fatura ou extrato em PDF'], ['buscar', 'Buscar', 'search', 'Achar qualquer lançamento']]],
    ['App', [['ajustes', 'Ajustes', 'settings', 'Backup, segurança e tema']]]];
  V.mais = () => App.head('Mais') + MAIS.map(([title, items]) => '<h2 class="sec">' + title + '</h2><div class="list card">' +
    items.map(([r, label, ic, sub]) => '<a class="row link" href="#/' + r + '"><span class="row-ic">' + icon(ic) + '</span><span class="row-main"><b>' + label + '</b><small>' + sub + '</small></span>' + icon('chevR', 'dim') + '</a>').join('') + '</div>').join('');

  /* ---------- ajustes e backup ---------- */
  V.ajustes = () => {
    const f = H.state.finance; let last = null; try { last = localStorage.getItem('horizonte.backupAt'); } catch (e) {}
    return App.head('Ajustes') +
      (H.storageOk ? '' : '<div class="note danger">' + icon('alert') + '<p>Este navegador não está deixando salvar. Exporte um backup antes de fechar.</p></div>') +
      '<section class="card"><h2>Backup</h2><p class="muted">Seus dados ficam só neste aparelho. Salve uma cópia de vez em quando.</p>' +
      '<button class="btn primary" data-a="exportBackup">' + icon('download') + 'Salvar backup</button>' +
      '<small class="muted">' + (last ? 'Último backup: ' + H.dateLabel(last) + '.' : 'Nenhum backup salvo neste aparelho ainda.') + '</small>' +
      App.fold('aj-import', '<b>Trazer dados de outro aparelho</b>', '<p class="muted">O backup entra no lugar do que está no app agora.</p><div class="btn-row"><button class="btn" data-a="importBackup">' + icon('upload') + 'Abrir arquivo</button><button class="btn" data-a="pasteBackup">Colar texto</button></div>') + '</section>' +
      (App.settingsExtra ? App.settingsExtra() : '') +
      '<section class="card"><h2>Aparência</h2><div class="list">' +
      '<button class="row link" data-a="toggleTheme"><span class="row-ic">' + icon('sun') + '</span><span class="row-main"><b>Tema</b><small>' + (f.dark ? 'Escuro' : 'Claro') + '</small></span><span class="pill">Trocar</span></button>' +
      '<button class="row link" data-a="editNames"><span class="row-ic">' + icon('edit') + '</span><span class="row-main"><b>Nomes</b><small>' + esc(f.names.join(' e ')) + '</small></span>' + icon('chevR', 'dim') + '</button>' +
      '</div></section>' +
      '<section class="card"><h2>Ajuda</h2><div class="list">' +
      '<button class="row link" data-a="tour"><span class="row-ic">' + icon('book') + '</span><span class="row-main"><b>Como usar</b><small>Resumo em 5 passos</small></span>' + icon('chevR', 'dim') + '</button></div>' +
      App.fold('aj-cel', '<b>Instalar no celular</b>', '<p class="muted">Abra este endereço no navegador do celular e use "Adicionar à tela de início". Para levar os dados, salve o backup em um aparelho e traga no outro.</p>') + '</section>';
  };
  A.toggleTheme = () => { H.commit((f, h) => { f.dark = !f.dark; h.dark = f.dark; }); };
  A.editNames = () => {
    const f = H.state.finance;
    UI.form({ title: 'Nomes', fields: [{ name: 'a', label: 'Seu nome', value: f.names[0], required: true, max: 40 }, { name: 'b', label: 'Nome do seu par', value: f.names[1], required: true, max: 40 }],
      onSubmit: v => App.act('Nomes atualizados', f => { f.names = [v.a, v.b]; }) });
  };
  A.exportBackup = () => {
    const blob = new Blob([JSON.stringify(H.toBackup(H.state), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'horizonte-completo-' + H.today() + '.json';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    UI.toast('Backup exportado para a pasta de downloads');
  };
  A.importBackup = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json';
    input.addEventListener('change', async () => {
      if (!input.files[0]) return;
      App.applyBackupText(await input.files[0].text());
    });
    input.click();
  };
  App.applyBackupText = text => {
    let st;
    try { st = H.fromBackup(JSON.parse(String(text).trim())); }
    catch (e) { return UI.toast(e instanceof SyntaxError ? 'Isso não é um backup válido.' : (e.message || 'Não consegui ler este backup.')); }
    const apply = () => { H._undo = H.state ? JSON.stringify(H.state) : null; H.state = st; H.persist(); UI.toast('Backup importado', { undo: !!H._undo }); App.go('#/inicio'); };
    if (H.state) UI.confirm('Substituir os dados atuais?', 'O backup tem ' + st.finance.purchases.length + ' parcelamentos e ' + st.finance.budgets.length + ' contas e cartões. Ele entra no lugar do que está no app agora.', 'Substituir', apply);
    else apply();
  };
  /* sem arquivo: o backup também pode ser colado como texto (útil no iPhone) */
  A.pasteBackup = () => UI.form({ title: 'Colar backup', submit: 'Importar',
    intro: 'Abra o texto do backup (por exemplo, a mensagem do WhatsApp), copie tudo e cole aqui.',
    fields: [{ name: 't', label: 'Texto do backup', type: 'textarea', rows: 8, value: '', required: true, max: 400000 }],
    onSubmit: v => { setTimeout(() => App.applyBackupText(v.t), 0); } });

  /* ---------- início ---------- */
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-a]');
    if (!el) return;
    const fn = A[el.dataset.a];
    if (fn) { e.preventDefault(); fn(el.dataset, el); }
  });
  document.addEventListener('DOMContentLoaded', () => {
    App.month = H.currentMonth();
    H.load();
    H.listeners.push(App.render);
    const link = ([r, label, ic]) => '<a href="#/' + r + '" data-r="' + r + '">' + icon(ic) + '<span>' + label + '</span></a>';
    document.getElementById('side-nav').innerHTML = NAV.map(link).join('');
    document.getElementById('tabs').innerHTML = TABS.map(link).join('');
    window.addEventListener('hashchange', () => { UI.close(); App.render(); });
    App.render();
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  });
})();
