/* Horizonte — casca do app: navegação, renderização, backup e ajustes. */
(function () {
  'use strict';
  const { esc, icon } = UI;
  const App = window.App = { views: {}, actions: {}, month: null, route: '', param: '' };
  const NAV = [['inicio', 'Início', 'home'], ['mes', 'Mês', 'calendar'], ['cartoes', 'Cartões', 'card'], ['dividas', 'Dívidas', 'wallet'], ['casa', 'Casa', 'basket'], ['guardado', 'Guardado', 'piggy'], ['caixa', 'Entradas e saídas', 'swap'], ['objetivos', 'Objetivos', 'target'], ['importar', 'Importar extrato', 'upload'], ['buscar', 'Buscar', 'search'], ['ajustes', 'Ajustes', 'settings']];
  const TABS = [['inicio', 'Início', 'home'], ['mes', 'Mês', 'calendar'], ['dividas', 'Dívidas', 'wallet'], ['objetivos', 'Objetivos', 'target'], ['mais', 'Mais', 'grid']];
  const TAB_OF = { buscar: 'mais', guardado: 'mais', importar: 'mais', cartoes: 'mais', casa: 'mais', caixa: 'mais', ajustes: 'mais', objetivo: 'objetivos' };
  const V = App.views, A = App.actions;

  /* aplica uma mudança, salva e avisa (com Desfazer) */
  App.act = (msg, fn) => { const ok = H.commit(fn); UI.toast(ok ? msg : msg + ' (o navegador não deixou salvar)', { undo: true }); };
  App.go = hash => { if (location.hash === hash) App.render(); else location.hash = hash; };
  App.head = (title, sub, right, back) => '<header class="head">' + (back ? '<a class="icon-btn" href="' + back + '" aria-label="Voltar">' + icon('chevL') + '</a>' : '') +
    '<div class="head-t"><h1>' + esc(title) + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div><div class="head-r">' + (right || '') + '</div></header>';
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
      const on = a.closest('.tabs') ? a.dataset.r === tab : a.dataset.r === (route === 'objetivo' ? 'objetivos' : route);
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    }
    if (changed) window.scrollTo(0, 0);
    UI.refresh();
  };

  /* ---------- boas-vindas (sem dados) ---------- */
  V.bemvindo = () => '<div class="welcome"><img src="icons/icon-192.png" alt="" width="84" height="84"><h1>Horizonte</h1><p>Seu dinheiro e seus objetivos em um só lugar. Os dados ficam guardados neste aparelho.</p>' +
    '<button class="btn primary big" data-a="importBackup">' + icon('upload') + 'Importar meu backup</button>' +
    '<button class="btn ghost big" data-a="startBlank">Começar do zero</button>' +
    '<small>O backup é o arquivo .json exportado pelo Horizonte antigo.</small></div>';
  A.startBlank = () => { H.state = H.blankState(); H.persist(); App.go('#/inicio'); };

  /* ---------- menu "Mais" (celular) ---------- */
  V.mais = () => App.head('Mais') + '<div class="list card">' + NAV.filter(n => ['guardado', 'cartoes', 'casa', 'caixa', 'importar', 'buscar', 'ajustes'].includes(n[0]))
    .map(([r, label, ic]) => '<a class="row link" href="#/' + r + '"><span class="row-ic">' + icon(ic) + '</span><span class="row-main"><b>' + label + '</b></span>' + icon('chevR', 'dim') + '</a>').join('') + '</div>';

  /* ---------- ajustes e backup ---------- */
  V.ajustes = () => {
    const f = H.state.finance, when = H.state.meta.updatedAt;
    return App.head('Ajustes') +
      (H.storageOk ? '' : '<div class="note danger">' + icon('alert') + '<p>Este navegador não está deixando salvar. Exporte um backup antes de fechar.</p></div>') +
      '<section class="card"><h2>Backup</h2><p class="muted">Seus dados ficam só neste aparelho. Exporte um backup de vez em quando — é ele que leva tudo para outro aparelho.</p>' +
      '<div class="btn-row"><button class="btn primary" data-a="exportBackup">' + icon('download') + 'Exportar backup</button><button class="btn ghost" data-a="importBackup">' + icon('upload') + 'Importar backup</button></div>' +
      (when ? '<small class="muted">Última alteração: ' + new Date(when).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) + '</small>' : '') + '</section>' +
      (App.settingsExtra ? App.settingsExtra() : '') +
      '<section class="card"><h2>Preferências</h2><div class="list">' +
      '<button class="row link" data-a="editNames"><span class="row-ic">' + icon('edit') + '</span><span class="row-main"><b>Nomes</b><small>' + esc(f.names.join(' e ')) + '</small></span>' + icon('chevR', 'dim') + '</button>' +
      '<button class="row link" data-a="toggleTheme"><span class="row-ic">' + icon('sun') + '</span><span class="row-main"><b>Tema</b><small>' + (f.dark ? 'Escuro' : 'Claro') + '</small></span><span class="pill">Trocar</span></button>' +
      '</div></section>' +
      '<section class="card"><h2>No celular</h2><p class="muted">Abra este endereço no navegador do celular e use "Adicionar à tela de início" para instalar como aplicativo. Para levar os dados de um aparelho para outro, exporte o backup em um e importe no outro.</p></section>';
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
      let st;
      try { st = H.fromBackup(JSON.parse(await input.files[0].text())); }
      catch (e) { return UI.toast(e instanceof SyntaxError ? 'Este arquivo não é um backup válido.' : (e.message || 'Não consegui ler este arquivo.')); }
      const apply = () => { H._undo = H.state ? JSON.stringify(H.state) : null; H.state = st; H.persist(); UI.toast('Backup importado', { undo: !!H._undo }); App.go('#/inicio'); };
      if (H.state) UI.confirm('Substituir os dados atuais?', 'O backup tem ' + st.finance.purchases.length + ' parcelamentos e ' + st.horizon.goals.length + ' objetivos. Ele entra no lugar do que está no app agora.', 'Substituir', apply);
      else apply();
    });
    input.click();
  };

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
