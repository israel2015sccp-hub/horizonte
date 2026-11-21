/* Horizonte — ler extrato ou fatura em PDF. O arquivo é aberto só neste aparelho (leitor pdf.js, da Mozilla, guardado junto do app). */
(function () {
  'use strict';
  const MON = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
  const MONS = 'jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez';
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const pad = n => String(n).padStart(2, '0');
  const iso = (y, mo, d) => { const s = y + '-' + pad(mo) + '-' + pad(d); return H.validDate(s) ? s : null; };
  /* data no começo da linha: 12/11, 12/11/2026, 12 nov, 12 de novembro de 2026 */
  const DATE = new RegExp('^(?:(\\d{1,2})[/.](\\d{1,2})(?:[/.](\\d{4}|\\d{2}))?|(\\d{1,2}) (?:de )?(' + MONS + ')[a-z]*\\.?(?: (?:de )?(\\d{4}))?)(?= |$)');
  const FULL = new RegExp('(\\d{1,2})/(\\d{1,2})/(\\d{4})|(\\d{1,2}) (?:de )?(' + MONS + ')[a-z]*\\.? (?:de )?(\\d{4})', 'g');
  const AMT = /(-\s*)?(?:R\$\s*)?(-\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})(?!\d)(\s*-|\s*[DC]\b)?/g;
  const SKIP = /^(total|subtotal|saldo|limite|vencimento|pagamento minimo|valor minimo|fatura anterior|resumo|juros|encargos|iof total|credito rotativo|parcelamento da fatura|valor total)/;
  const INFLOW = /recebid|salario|deposito|credito|estorno|rendimento|resgate|reembolso|devolucao/;

  /* linhas de texto do PDF -> { rows: [{date, amount (centavos; conta: + entrou, − saiu; fatura: + gasto), description, ref}] } */
  H.parsePdfLines = (lines, kind) => {
    const clean = lines.map(l => String(l || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
    /* ano de referência: a data completa mais recente escrita no documento */
    let ref = null;
    for (const l of clean) for (const x of norm(l).matchAll(FULL)) {
      const d = x[1] ? iso(x[3], +x[2], +x[1]) : iso(x[6], MON[x[5]], +x[4]);
      if (d && (!ref || d > ref)) ref = d;
    }
    ref = ref || H.today();
    const ry = +ref.slice(0, 4), rm = +ref.slice(5, 7);
    const rows = [];
    let cur = null, sign = 0;
    for (const line of clean) {
      const n = norm(line);
      if (kind === 'account' && n.length < 60) {
        if (/\b(saidas|debitos)\b/.test(n)) sign = -1; else if (/\b(entradas|creditos)\b/.test(n)) sign = 1;
      }
      const d = DATE.exec(n);
      let rest = line, date = null;
      if (d) {
        const day = +(d[1] || d[4]), mo = d[1] ? +d[2] : MON[d[5]], yr = d[3] || d[6];
        date = iso(yr ? (yr.length === 2 ? 2000 + +yr : +yr) : (mo > rm + 1 ? ry - 1 : ry), mo, day);
        if (date) { cur = date; rest = line.slice(d[0].length).trim(); }
      }
      if (SKIP.test(norm(rest))) continue;
      if (!date && (kind === 'card' || !cur)) continue;
      const found = [...rest.matchAll(AMT)];
      if (!found.length) continue;
      /* extrato costuma trazer "valor  saldo": vale o primeiro. Fatura pode trazer valor em dólar antes: vale o último. */
      const a = kind === 'account' ? found[0] : found[found.length - 1], before = rest.slice(0, found[0].index);
      const value = Math.round(parseFloat(a[3].replace(/\./g, '').replace(',', '.')) * 100);
      const description = before.replace(/(R\$|US\$|[-+])\s*$/g, '').replace(/\s+/g, ' ').trim().slice(0, 300);
      if (!value || !/[a-zA-Z]{2}/.test(norm(description))) continue;
      const neg = !!(a[1] || a[2] || (a[4] && /-|D/.test(a[4]))), plus = /\+\s*$/.test(rest.slice(0, a.index)) || !!(a[4] && /C/.test(a[4]));
      let amount;
      if (kind === 'card') amount = neg ? -value : value;
      else amount = neg ? -value : plus ? value : sign ? sign * value : INFLOW.test(norm(description)) ? value : -value;
      rows.push({ date: date || cur, amount, description, ref: '' });
    }
    return { rows, card: kind === 'card' };
  };

  /* ---------- abrir o PDF ---------- */
  const load = () => window.pdfjsLib ? Promise.resolve() : new Promise((ok, no) => {
    const s = document.createElement('script');
    s.src = 'js/vendor/pdf.min.js';
    s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'js/vendor/pdf.worker.min.js'; ok(); };
    s.onerror = no;
    document.head.appendChild(s);
  });
  H.pdfLines = async (buf, password) => {
    await load();
    const doc = await window.pdfjsLib.getDocument({ data: buf.slice(0), password, isEvalSupported: false }).promise, lines = [];
    for (let p = 1; p <= Math.min(doc.numPages, 60); p++) {
      const items = (await (await doc.getPage(p)).getTextContent()).items.filter(i => i.str && i.str.trim()).map(i => ({ s: i.str, x: i.transform[4], y: i.transform[5] }));
      items.sort((a, b) => b.y - a.y || a.x - b.x);
      let row = [], y = null;
      const flush = () => { if (row.length) lines.push(row.sort((a, b) => a.x - b.x).map(i => i.s).join(' ')); row = []; };
      for (const i of items) { if (y === null || Math.abs(i.y - y) > 3) { flush(); y = i.y; } row.push(i); }
      flush();
    }
    doc.destroy();
    return lines;
  };
  App.readPdf = async (file, kind, password) => {
    UI.toast('Lendo o PDF…');
    let lines;
    try { lines = await H.pdfLines(await file.arrayBuffer(), password); }
    catch (e) {
      if (e && e.name === 'PasswordException') return UI.form({ title: 'Este PDF tem senha', submit: 'Abrir',
        intro: (password !== undefined ? 'Senha incorreta. ' : '') + 'Alguns bancos protegem o arquivo. A senha é usada só para abrir o PDF neste aparelho e não fica guardada.',
        fields: [{ name: 'pw', label: 'Senha do PDF', value: '', required: true, max: 60 }],
        onSubmit: v => { setTimeout(() => App.readPdf(file, kind, v.pw), 0); } });
      return UI.toast('Não consegui abrir este PDF.');
    }
    App.importParsed(kind, file.name, H.parsePdfLines(lines, kind));
  };
})();
