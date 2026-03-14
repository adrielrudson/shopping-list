// ═══════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════
function loadDB() {
  try {
    const parsed = JSON.parse(localStorage.getItem('produtos_db') || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(item =>
        item &&
        typeof item.nome === 'string' &&
        item.nome.trim() !== '' &&
        typeof item.preco === 'number' &&
        !Number.isNaN(item.preco)
      )
      .map(item => ({
        id: item.id ?? (Date.now() + Math.random()),
        nome: item.nome.trim(),
        preco: item.preco,
      }));
  } catch (error) {
    console.warn('Falha ao ler produtos_db do localStorage:', error);
    localStorage.removeItem('produtos_db');
    return [];
  }
}

let db = loadDB();
let mainRowId = 0;

function saveDB() {
  db = db.filter(item =>
    item &&
    typeof item.nome === 'string' &&
    item.nome.trim() !== '' &&
    typeof item.preco === 'number' &&
    !Number.isNaN(item.preco)
  );
  localStorage.setItem('produtos_db', JSON.stringify(db));
  updateBadge();
}

function updateBadge() {
  const badge = document.getElementById('db-badge');
  if (badge) badge.textContent = db.length;
}

function getProductById(productId) {
  return db.find(p => String(p.id) === String(productId));
}

// ═══════════════════════════════════════════════════
//  TABS
// ═══════════════════════════════════════════════════
function showTab(tab) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + tab).classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
  if (tab === 'main') refreshAllSelects();
}

// ═══════════════════════════════════════════════════
//  FORMAT
// ═══════════════════════════════════════════════════
const CURRENCIES = {
  BRL: { locale: 'pt-BR', symbol: 'R$',  code: 'BRL' },
  USD: { locale: 'en-US', symbol: '$',   code: 'USD' },
  EUR: { locale: 'de-DE', symbol: '€',   code: 'EUR' },
  GBP: { locale: 'en-GB', symbol: '£',   code: 'GBP' },
  JPY: { locale: 'ja-JP', symbol: '¥',   code: 'JPY', noDecimals: true },
  CNY: { locale: 'zh-CN', symbol: '元',  code: 'CNY' },
};

let currentCurrency = localStorage.getItem('currency') || 'BRL';

function brl(v) {
  const c = CURRENCIES[currentCurrency] || CURRENCIES.BRL;
  const decimals = c.noDecimals ? 0 : 2;
  return c.symbol + ' ' + parseFloat(v || 0).toLocaleString(c.locale, {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals
  });
}

function setCurrency(code) {
  currentCurrency = code;
  localStorage.setItem('currency', code);
  document.querySelectorAll('[id^="curr-"]').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('curr-' + code);
  if (btn) btn.classList.add('active');
  updatePriceLabel();
  calcMain();
  renderDB();
  closeSettings();
}

function updatePriceLabel() {
  const c = CURRENCIES[currentCurrency] || CURRENCIES.BRL;
  const el = document.getElementById('label-price');
  if (el) {
    const word = (TRANSLATIONS[currentLang] || TRANSLATIONS.pt).labelPrice;
    el.textContent = word + ' (' + c.symbol + ')';
  }
}

// ═══════════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════════
let toastTimer;
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ═══════════════════════════════════════════════════
//  BANCO DE DADOS
// ═══════════════════════════════════════════════════
function salvarProduto() {
  const nome  = document.getElementById('db-nome').value.trim();
  const preco = parseFloat(document.getElementById('db-preco').value);

  if (!nome)        { showToast('⚠ Informe o nome do produto.', true); return; }
  if (isNaN(preco) || preco < 0) { showToast('⚠ Informe um preço válido.', true); return; }

  const dup = db.find(p => p.nome.toLowerCase() === nome.toLowerCase());
  if (dup) { showToast('⚠ Produto já cadastrado.', true); return; }

  db.push({ id: Date.now(), nome, preco });
  saveDB();

  document.getElementById('db-nome').value  = '';
  document.getElementById('db-preco').value = '';
  document.getElementById('db-nome').focus();

  renderDB();
  refreshAllSelects();
  showToast('✓ Produto cadastrado com sucesso!');
}

function deleteProduto(id) {
  if (!confirm('Remover este produto do banco de dados?')) return;
  db = db.filter(p => p.id !== id);
  saveDB();
  renderDB();
  refreshAllSelects();
  showToast('Produto removido.');
}

function startEdit(id) {
  const row = document.getElementById('dbrow-' + id);
  row.classList.add('editing');
  row.querySelector('.edit-nome').value  = row.querySelector('.static-nome').textContent;
  row.querySelector('.edit-preco').value = db.find(p => p.id === id).preco;
  row.querySelector('.edit-nome').focus();
}

function confirmEdit(id) {
  const row   = document.getElementById('dbrow-' + id);
  const nome  = row.querySelector('.edit-nome').value.trim();
  const preco = parseFloat(row.querySelector('.edit-preco').value);

  if (!nome || isNaN(preco)) { showToast('⚠ Preencha nome e preço.', true); return; }

  const dup = db.find(p => p.nome.toLowerCase() === nome.toLowerCase() && p.id !== id);
  if (dup) { showToast('⚠ Já existe produto com esse nome.', true); return; }

  const prod = db.find(p => p.id === id);
  prod.nome  = nome;
  prod.preco = preco;
  saveDB();
  renderDB();
  refreshAllSelects();
  updateMainPrices();
  showToast('✓ Produto atualizado!');
}

function renderDB() {
  const searchInput = document.getElementById('db-search');
  const query = (searchInput?.value || '').toLowerCase();
  const corpo = document.getElementById('db-corpo');
  const filtered = db.filter(p => (p.nome || '').toLowerCase().includes(query));

  if (!corpo) return;

  if (filtered.length === 0) {
    corpo.innerHTML = `<tr class="empty-row"><td colspan="4">${db.length === 0 ? t('emptyDB') : t('emptySearch')}</td></tr>`;
    document.getElementById('db-info').textContent = t('dbInfoEmpty');
    return;
  }

  corpo.innerHTML = filtered.map((p, i) => `
    <tr id="dbrow-${p.id}">
      <td style="color:var(--muted);width:36px">${i + 1}</td>
      <td>
        <span class="static static-nome">${escHtml(p.nome)}</span>
        <input class="cell-input editable edit-nome" type="text" value="${escHtml(p.nome)}" onkeydown="if(event.key==='Enter') confirmEdit(${p.id})">
      </td>
      <td class="r">
        <span class="static static-preco">${brl(p.preco)}</span>
        <input class="cell-input editable edit-preco r" type="number" min="0" step="0.01" value="${p.preco}" onkeydown="if(event.key==='Enter') confirmEdit(${p.id})">
      </td>
      <td class="c">
        <button class="btn-icon edit static" onclick="startEdit(${p.id})" title="Editar"><svg viewBox="0 0 512 512" width="15" height="15" xmlns="http://www.w3.org/2000/svg"><path d="M432.39,116.79l-37.19-37.18c-6.46-6.46-16.93-6.46-23.38,0l-34.67,34.67,60.57,60.57,34.67-34.67c6.46-6.46,6.46-16.92,0-23.38Z" fill="#ed705b"/><path d="M74.77,437.23l65.09-31.67-33.42-33.42-31.67,65.1Z" fill="#434343"/><path d="M304.31,147.11l32.81-32.81,60.56,60.56-32.81,32.81-60.56-60.56Z" fill="#434343"/><path d="M152.58,359.33l3.28-35.99-23.7-4.06-25.72,52.87,33.42,33.42,52.87-25.72-4.15-23.78-36,3.28Z" fill="#fbcb81"/><path d="M304.34,147.09l-172.18,172.18,23.7,4.06-3.28,35.99,182-182-30.24-30.24Z" fill="#e79c19"/><path d="M316.84,159.59l17.74,17.74-30.24-30.24-172.18,172.18,21.34,3.66,163.34-163.34Z" fill="#dd8c1f"/><path d="M334.58,177.33l-182,182,36-3.28,4.15,23.78,172.18-172.18-30.33-30.33Z" fill="#f1ad17"/></svg></button>
        <button class="btn-icon save editable" onclick="confirmEdit(${p.id})" title="Salvar"><svg viewBox="0 0 512 512" width="15" height="15" xmlns="http://www.w3.org/2000/svg"><path d="M459.39,100.31l-47.7-47.7c-10.17-10.17-23.2-16.68-37.53-18.51-2.87-.26-5.73-.52-8.6-.52H72.68c-21.63,0-39.1,17.46-39.1,39.1v365.77c0,21.63,17.46,39.1,39.1,39.1h366.64c21.63,0,39.1-17.46,39.1-39.1V146.44c0-17.46-6.78-33.88-19.03-46.13Z" fill="#495a79"/><path d="M387.19,242.97H124.81c-7.2,0-13.03,5.83-13.03,13.03v66.03h288.45v-66.03c0-7.2-5.83-13.03-13.03-13.03Z" fill="#ed705b"/><rect x="111.78" y="295.97" width="288.45" height="182.45" fill="#d7e0f1"/><path d="M373.64,33.58h-235.8v143.35c0,7.2,5.83,13.03,13.03,13.03h210.25c7.2,0,13.03-5.83,13.03-13.03V34.1c-.2-.2-.32-.32-.52-.52Z" fill="#dae1f1"/><path d="M322.03,163.91h-79.06V33.58h79.06v130.32Z" fill="#495a79"/><path d="M335.06,426.29h-158.12c-7.2,0-13.03-5.83-13.03-13.03s5.83-13.03,13.03-13.03h158.12c7.2,0,13.03,5.83,13.03,13.03s-5.83,13.03-13.03,13.03Z" fill="#939eb2"/><path d="M335.06,374.16h-158.12c-7.2,0-13.03-5.83-13.03-13.03s5.83-13.03,13.03-13.03h158.12c7.2,0,13.03,5.83,13.03,13.03s-5.83,13.03-13.03,13.03Z" fill="#939eb2"/></svg></button>
        <button class="btn-icon del" onclick="deleteProduto(${p.id})" title="Remover">✕</button>
      </td>
    </tr>
  `).join('');

  const total = db.length;
  document.getElementById('db-info').innerHTML =
    `<b>${total}</b> ${total === 1 ? t('dbInfoSingle') : t('dbInfoPlural')}.`;
}

function clearDB() {
  if (!confirm('Remover TODOS os produtos do banco de dados?')) return;
  db = [];
  saveDB();
  renderDB();
  refreshAllSelects();
  showToast('Banco de dados limpo.');
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ═══════════════════════════════════════════════════
//  MAIN TABLE
// ═══════════════════════════════════════════════════
function buildSelectOptions(selectedId = '') {
  const placeholder = `<option value="">— Selecionar produto —</option>`;
  if (db.length === 0) return placeholder + `<option disabled>Nenhum produto no banco de dados</option>`;
  const opts = db.filter(p => p && typeof p.nome === 'string').map(p =>
    `<option value="${p.id}" ${String(p.id) === String(selectedId) ? 'selected' : ''}>${escHtml(p.nome)}</option>`
  ).join('');
  return placeholder + opts;
}

function addMainRow(productId = '', qtd = '') {
  const corpo = document.getElementById('main-corpo');
  const empty = document.getElementById('main-empty');
  if (empty) empty.remove();

  const id = ++mainRowId;
  const tr = document.createElement('tr');
  tr.id = 'mrow-' + id;

  const prod = getProductById(productId);
  const preco = prod ? prod.preco : null;

  tr.innerHTML = `
    <td>
      <select class="prod-select" onchange="onSelectChange(this, ${id})">
        ${buildSelectOptions(productId)}
      </select>
    </td>
    <td class="r">
      <span class="price-display ${preco !== null ? 'filled' : ''}" id="preco-${id}">
        ${preco !== null ? brl(preco) : '—'}
      </span>
    </td>
    <td class="r">
      <input type="number" class="cell-input r" placeholder="0" min="0" step="1"
        value="${qtd}" oninput="calcMain()" style="width:80px">
    </td>
    <td class="r subtotal-val" id="sub-${id}">—</td>
    <td class="c">
      <button class="btn-icon del" onclick="removeMainRow(${id})" title="Remover">✕</button>
    </td>
  `;

  corpo.appendChild(tr);
  calcMain();

  if (!productId) tr.querySelector('.prod-select').focus();
}

function onSelectChange(sel, id) {
  const productId = sel.value;
  const prod  = getProductById(productId);
  const span  = document.getElementById('preco-' + id);

  if (prod) {
    span.textContent = brl(prod.preco);
    span.classList.add('filled');
  } else {
    span.textContent = '—';
    span.classList.remove('filled');
  }
  calcMain();
}

function calcMain() {
  const rows = document.querySelectorAll('#main-corpo tr:not(.empty-row)');
  let total = 0;

  rows.forEach(row => {
    const sel   = row.querySelector('.prod-select');
    const qtdIn = row.querySelector('input[type="number"]');
    const subEl = row.querySelector('[id^="sub-"]');

    const productId = sel ? sel.value : '';
    const prod  = getProductById(productId);
    const preco = prod ? prod.preco : 0;
    const qtd   = parseFloat(qtdIn ? qtdIn.value : 0) || 0;
    const sub   = preco * qtd;
    total += sub;

    if (subEl) {
      subEl.textContent = (prod && qtd > 0) ? brl(sub) : '—';
    }
  });

  document.getElementById('main-total').textContent = brl(total);

  const count = rows.length;
  const info  = document.getElementById('main-info');
  info.innerHTML = count === 0
    ? t('mainInfoEmpty')
    : `<b>${count}</b> ${count === 1 ? t('mainInfoSingle') : t('mainInfoPlural')}.`;
}

function removeMainRow(id) {
  const row = document.getElementById('mrow-' + id);
  if (!row) return;
  row.style.transition = 'opacity 0.18s, transform 0.18s';
  row.style.opacity = '0';
  row.style.transform = 'translateX(10px)';
  setTimeout(() => { row.remove(); calcMain(); checkMainEmpty(); }, 190);
}

function checkMainEmpty() {
  const corpo = document.getElementById('main-corpo');
  if (corpo.children.length === 0) {
    const tr = document.createElement('tr');
    tr.id = 'main-empty';
    tr.className = 'empty-row';
    tr.innerHTML = `<td colspan="5" onclick="addMainRow()">${t('emptyMain')}</td>`;
    corpo.appendChild(tr);
  }
}

function clearMain() {
  if (!confirm('Limpar todos os itens do pedido?')) return;
  document.getElementById('main-corpo').innerHTML = '';
  calcMain();
  checkMainEmpty();
}

// refresh all selects when DB changes
function refreshAllSelects() {
  document.querySelectorAll('#main-corpo .prod-select').forEach(sel => {
    const current = sel.value;
    sel.innerHTML = buildSelectOptions(current);
    // re-trigger price in case product was removed
    const rowId = sel.closest('tr').id.replace('mrow-', '');
    const span  = document.getElementById('preco-' + rowId);
    const prod  = getProductById(current);
    if (span) {
      if (prod) { span.textContent = brl(prod.preco); span.classList.add('filled'); }
      else      { span.textContent = '—'; span.classList.remove('filled'); }
    }
  });
  calcMain();
}

function updateMainPrices() {
  document.querySelectorAll('#main-corpo .prod-select').forEach(sel => {
    const productId = sel.value;
    const prod = getProductById(productId);
    const rowId = sel.closest('tr').id.replace('mrow-', '');
    const span  = document.getElementById('preco-' + rowId);
    if (span && prod) { span.textContent = brl(prod.preco); span.classList.add('filled'); }
  });
  calcMain();
}

// ═══════════════════════════════════════════════════
//  PDF EXPORT
// ═══════════════════════════════════════════════════
function exportarPDF() {
  const rows = document.querySelectorAll('#main-corpo tr:not(.empty-row)');
  if (rows.length === 0) { showToast('⚠ Adicione itens antes de exportar.', true); return; }

  const { jsPDF } = window.jspdf;
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // ── Locale for date ───────────────────────────────
  const localeMap = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };
  const dateLocale = localeMap[currentLang] || 'pt-BR';
  const now = new Date().toLocaleDateString(dateLocale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  // ── Translated labels ─────────────────────────────
  const L = TRANSLATIONS[currentLang] || TRANSLATIONS.pt;
  const labels = {
    pt: { title: 'LISTA DE COMPRAS', generated: 'Gerado em:', product: 'PRODUTO', unitPrice: 'PREÇO UNIT.', qty: 'QTD.', subtotal: 'SUBTOTAL', grandTotal: 'TOTAL GERAL', auto: 'Documento gerado automaticamente', item: 'item', items: 'itens' },
    en: { title: 'SHOPPING LIST',    generated: 'Generated on:', product: 'PRODUCT', unitPrice: 'UNIT PRICE', qty: 'QTY.', subtotal: 'SUBTOTAL', grandTotal: 'GRAND TOTAL', auto: 'Automatically generated document', item: 'item', items: 'items' },
    es: { title: 'LISTA DE COMPRAS', generated: 'Generado el:', product: 'PRODUCTO', unitPrice: 'PRECIO UNIT.', qty: 'CANT.', subtotal: 'SUBTOTAL', grandTotal: 'TOTAL GENERAL', auto: 'Documento generado automáticamente', item: 'artículo', items: 'artículos' },
  };
  const lb = labels[currentLang] || labels.pt;

  // ── Colors (all gray) ─────────────────────────────
  const gray   = [80, 80, 80];
  const mid    = [130, 130, 130];
  const light  = [200, 200, 200];
  const xlight = [225, 225, 225];

  // ── Header ────────────────────────────────────────
  doc.setDrawColor(...light);
  doc.setLineWidth(0.4);
  doc.line(14, 10, pageW - 14, 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...gray);
  doc.text(lb.title, 14, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...mid);
  doc.text(lb.generated + ' ' + now, 14, 27);

  doc.setDrawColor(...xlight);
  doc.setLineWidth(0.3);
  doc.line(14, 31, pageW - 14, 31);

  // ── Table body ────────────────────────────────────
  const body = [];
  let grandTotal = 0;

  rows.forEach((row, i) => {
    const sel   = row.querySelector('.prod-select');
    const qtdIn = row.querySelector('input[type="number"]');
    const productId = sel ? sel.value : '';
    const prod  = getProductById(productId);
    const nome  = sel?.selectedOptions?.[0]?.textContent || '';
    const preco = prod ? prod.preco : 0;
    const qtd   = parseFloat(qtdIn ? qtdIn.value : 0) || 0;
    const sub   = preco * qtd;
    grandTotal += sub;

    body.push([
      { content: String(i + 1), styles: { halign: 'center', textColor: mid } },
      nome || '—',
      { content: brl(preco), styles: { halign: 'right' } },
      { content: qtd % 1 === 0 ? String(qtd) : qtd.toFixed(2), styles: { halign: 'right' } },
      { content: brl(sub), styles: { halign: 'right' } }
    ]);
  });

  doc.autoTable({
    startY: 37,
    head: [[
      { content: '#', styles: { halign: 'center' } },
      lb.product,
      { content: lb.unitPrice, styles: { halign: 'right' } },
      { content: lb.qty,       styles: { halign: 'right' } },
      { content: lb.subtotal,  styles: { halign: 'right' } }
    ]],
    body: [
      ...body,
      [
        { content: lb.grandTotal, colSpan: 4, styles: { fontStyle: 'normal', fontSize: 9, textColor: gray, lineWidth: { top: 0.4, bottom: 0, left: 0, right: 0 }, lineColor: light } },
        { content: brl(grandTotal), styles: { halign: 'right', fontStyle: 'normal', fontSize: 9, textColor: gray, lineWidth: { top: 0.4, bottom: 0, left: 0, right: 0 }, lineColor: light } }
      ]
    ],
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 36 },
      3: { cellWidth: 20 },
      4: { cellWidth: 38 }
    },
    headStyles: {
      fillColor: false,
      textColor: gray,
      fontStyle: 'normal',
      fontSize: 8,
      lineColor: light,
      lineWidth: { bottom: 0.4, top: 0, left: 0, right: 0 }
    },
    bodyStyles: {
      textColor: gray,
      fontSize: 9,
      fontStyle: 'normal',
      lineColor: xlight,
      lineWidth: 0.1,
      fillColor: false
    },
    alternateRowStyles: { fillColor: false },
    margin: { left: 14, right: 14 },
    theme: 'plain',
    tableLineColor: xlight,
    tableLineWidth: 0.1,
  });

  // ── Footer ────────────────────────────────────────
  const finalY = doc.lastAutoTable.finalY;

  // ── Footer ────────────────────────────────────────
  doc.setDrawColor(...xlight);
  doc.setLineWidth(0.3);
  doc.line(14, pageH - 13, pageW - 14, pageH - 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...mid);
  doc.text(lb.auto, 14, pageH - 8);
  const count = rows.length;
  doc.text(count + ' ' + (count === 1 ? lb.item : lb.items), pageW - 14, pageH - 8, { align: 'right' });

  const fileWord = { pt: 'lista', en: 'list', es: 'lista' }[currentLang] || 'lista';
  doc.save(fileWord + '_' + new Date().toISOString().slice(0,10) + '.pdf');
  showToast('✓ PDF gerado com sucesso!');
}

// ═══════════════════════════════════════════════════
//  JSON EXPORT / IMPORT
// ═══════════════════════════════════════════════════
function exportarJSON() {
  if (db.length === 0) { showToast('⚠ ' + t('toastNoProducts'), true); return; }
  openFilenameModal();
}

function openFilenameModal() {
  const modal = document.getElementById('filename-modal');
  const input = document.getElementById('filename-input');
  const label = document.getElementById('filename-label');
  const cancel = document.getElementById('filename-cancel');
  const confirm = document.getElementById('filename-confirm');

  // Apply translations
  label.textContent = t('promptFileName');
  cancel.textContent = t('btnCancel');
  confirm.textContent = t('btnSave');

  input.value = '';
  modal.style.display = 'flex';
  setTimeout(() => input.focus(), 50);
}

function closeFilenameModal() {
  document.getElementById('filename-modal').style.display = 'none';
}

function confirmFilename() {
  const input = document.getElementById('filename-input');
  const nome = input.value;
  closeFilenameModal();

  const nomeLimpo = nome.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_À-ú]/g, '') || 'sem_nome';
  const payload = {
    versao: '1.0',
    exportadoEm: new Date().toISOString(),
    totalProdutos: db.length,
    produtos: db
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  const fileWord = { pt: 'catalogo', en: 'catalog', es: 'catalogo' }[currentLang] || 'catalogo';
  a.download = fileWord + '_' + nomeLimpo + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast(t('toastExported'));
}

function importarJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);

      // aceita tanto o formato com wrapper quanto array puro
      const lista = Array.isArray(parsed) ? parsed : (parsed.produtos || null);

      if (!lista || !Array.isArray(lista)) {
        showToast('⚠ Arquivo JSON inválido.', true); return;
      }

      const validos = lista.filter(p =>
        p && typeof p.nome === 'string' && p.nome.trim() !== '' &&
        typeof p.preco === 'number' && !isNaN(p.preco)
      );

      if (validos.length === 0) {
        showToast('⚠ Nenhum produto válido encontrado.', true); return;
      }

      const modo = db.length > 0
        ? confirm(
            `Você já tem ${db.length} produto(s) no banco.\n\n` +
            `Clique OK para MESCLAR (mantém os existentes + adiciona os novos)\n` +
            `Clique Cancelar para SUBSTITUIR (apaga tudo e importa só os do arquivo)`
          )
        : false; // se banco vazio, apenas importa

      if (modo) {
        // mesclar: adiciona apenas os que não existem pelo nome
        let adicionados = 0;
        validos.forEach(p => {
          const existe = db.find(x => x.nome.toLowerCase() === p.nome.trim().toLowerCase());
          if (!existe) {
            db.push({ id: Date.now() + Math.random(), nome: p.nome.trim(), preco: p.preco });
            adicionados++;
          }
        });
        showToast(`✓ ${adicionados} produto(s) adicionado(s) ao banco.`);
      } else {
        // substituir (ou banco estava vazio)
        db = validos.map(p => ({ id: Date.now() + Math.random(), nome: p.nome.trim(), preco: p.preco }));
        showToast(`✓ ${db.length} produto(s) importado(s) com sucesso!`);
      }

      saveDB();
      renderDB();
      refreshAllSelects();

    } catch(err) {
      showToast('⚠ Erro ao ler o arquivo JSON.', true);
    }

    // limpa o input para permitir reimportar o mesmo arquivo
    event.target.value = '';
  };
  reader.readAsText(file);
}

function toggleImportInfo() {
  const box = document.getElementById('import-info');
  box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

// ═══════════════════════════════════════════════════
//  SPLASH SCREEN
// ═══════════════════════════════════════════════════
function closeSplash() {
  const splash = document.getElementById('splash');
  splash.classList.add('hiding');
  setTimeout(() => { splash.style.display = 'none'; splash.classList.remove('hiding'); }, 460);
}

function showSplash() {
  const splash = document.getElementById('splash');
  splash.style.display = '';
  splash.classList.remove('hiding');
  updateSplashText();
}

function splashSetLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  document.querySelectorAll('[id^="splash-lang-"]').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('splash-lang-' + lang);
  if (btn) btn.classList.add('active');
  // also sync main settings lang buttons
  document.querySelectorAll('.lang-btn[id^="lang-"]').forEach(b => b.classList.remove('active'));
  const mainBtn = document.getElementById('lang-' + lang);
  if (mainBtn) mainBtn.classList.add('active');
  updateSplashText();
  applyLang();
}

function splashSetCurrency(code) {
  currentCurrency = code;
  localStorage.setItem('currency', code);
  document.querySelectorAll('[id^="splash-curr-"]').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('splash-curr-' + code);
  if (btn) btn.classList.add('active');
  // also sync main settings currency buttons
  document.querySelectorAll('[id^="curr-"]').forEach(b => b.classList.remove('active'));
  const mainBtn = document.getElementById('curr-' + code);
  if (mainBtn) mainBtn.classList.add('active');
  updatePriceLabel();
}

function updateSplashText() {
  const L = TRANSLATIONS[currentLang] || TRANSLATIONS.pt;
  const set = (id, key) => { const el = document.getElementById(id); if (el) el.textContent = L[key] || ''; };
  set('splash-title',        'splashWelcome');
  set('splash-subtitle',     'splashSubtitle2');
  set('splash-label-lang',   'splashLangLabel');
  set('splash-label-currency','splashCurrLabel');
  set('splash-new-title',    'splashNewTitle');
  set('splash-new-desc',     'splashNewDesc2');
  set('splash-or',           'splashOr');
  set('splash-import-title', 'splashImportTitle');
  // import desc has <code> inside, handle separately
  const descEl = document.getElementById('splash-import-desc');
  if (descEl) descEl.innerHTML = L.splashImportDesc2.replace('.json', '<code style="color:var(--accent)">.json</code>');
}

function splashNovo() {
  db = [];
  saveDB();
  applyLang();
  updatePriceLabel();
  renderDB();
  updateBadge();
  checkMainEmpty();
  calcMain();
  closeSplash();
  showToast(t('toastNewDB'));
}

function splashImportar(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      const lista  = Array.isArray(parsed) ? parsed : (parsed.produtos || null);

      if (!lista || !Array.isArray(lista)) {
        alert('Arquivo JSON inválido. Tente outro arquivo.'); return;
      }

      const validos = lista.filter(p =>
        p && typeof p.nome === 'string' && p.nome.trim() !== '' &&
        typeof p.preco === 'number' && !isNaN(p.preco)
      );

      if (validos.length === 0) {
        alert('Nenhum produto válido encontrado no arquivo.'); return;
      }

      db = validos.map(p => ({ id: Date.now() + Math.random(), nome: p.nome.trim(), preco: p.preco }));
      saveDB();
      applyLang();
      updatePriceLabel();
      renderDB();
      refreshAllSelects();
      updateBadge();
      checkMainEmpty();
      calcMain();
      closeSplash();
      showToast(`✓ ${db.length} produto(s) importado(s) com sucesso!`);

    } catch(err) {
      alert('Erro ao ler o arquivo. Verifique se é um JSON válido.');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

// ═══════════════════════════════════════════════════
//  SETTINGS — DARK MODE + LANGUAGE
// ═══════════════════════════════════════════════════
const TRANSLATIONS = {
  pt: {
    appName:          'Lista de Compras',
    backBtn:          'Voltar',
    tabList:          'Lista',
    tabCatalog:       'Catálogo',
    listSubtitle:     'Selecione o produto, digite a quantidade — o preço é preenchido automaticamente.',
    colProduct:       'Produto',
    colPrice:         'Preço Unit.',
    colQty:           'Qtd.',
    colSubtotal:      'Subtotal',
    totalLabel:       'Total Geral',
    btnAddItem:       '+ Adicionar item',
    btnExportPDF:     'Exportar PDF',
    btnClearAll:      'Limpar tudo',
    catalogSubtitle:  'Cadastre produtos e preços. Os dados ficam salvos no navegador.',
    newProductTitle:  'NOVO PRODUTO',
    labelName:        'Nome do produto',
    labelPrice:       'Preço',
    btnRegister:      'Cadastrar',
    searchPlaceholder:'Buscar produto...',
    btnExportCat:     'Exportar catálogo',
    btnImportCat:     'Importar catálogo',
    btnClearDB:       'Limpar catálogo',
    emptyMain:        'Nenhum item. Clique aqui ou em "+ Adicionar item" para começar.',
    mainInfoEmpty:    'Nenhum item adicionado.',
    mainInfoSingle:   'item',
    mainInfoPlural:   'itens na lista',
    emptyDB:          'Nenhum produto cadastrado ainda.',
    emptySearch:      'Nenhum resultado para a busca.',
    dbInfoEmpty:      'Nenhum produto.',
    dbInfoSingle:     'produto cadastrado',
    dbInfoPlural:     'produtos cadastrados',
    settingsAppearance:'Aparência',
    settingsDark:     'Modo escuro',
    settingsLanguage: 'Idioma',
    productPlaceholder:'Ex: Arroz Parboilizado 1 kg',
    splashTitle:      'Bem‑vindo de volta.',
    splashSubtitle:   'Como deseja começar esta sessão?\nEscolha uma das opções abaixo para continuar.',
    splashNew:        'Novo banco de dados',
    splashNewDesc:    'Começa do zero com banco vazio. Você poderá cadastrar produtos na aba "Catálogo".',
    splashImport:     'Importar banco existente',
    splashImportDesc: 'Carrega um arquivo .json salvo anteriormente.',
    howToBackup:      'Como fazer backup do catálogo?',
    infoTitle:        'Como usar o catálogo',
    infoStep1:        '1. Clique em Exportar catálogo para baixar o arquivo .json',
    infoStep2:        '2. Guarde em local seguro (pasta, pendrive, Google Drive…)',
    infoStep3:        '3. Para restaurar, clique em Importar catálogo e selecione o arquivo',
    toastExported:    '✓ Catálogo exportado com sucesso!',
    toastNewDB:       'Catálogo limpo. Cadastre seus produtos!',
    promptName:       'Digite seu nome para salvar o catálogo:',
    promptFileName:   'Escreva o nome do arquivo:',
    btnCancel:        'Cancelar',
    btnSave:          'Salvar',
    toastNoProducts:  'Nenhum produto para exportar.',
    splashWelcome:    'Seja bem-vindo.',
    splashSubtitle2:  'Configure suas preferências e escolha como começar.',
    splashLangLabel:  'Idioma',
    splashCurrLabel:  'Moeda',
    splashNewTitle:   'Novo catálogo',
    splashNewDesc2:   'Começa do zero com catálogo vazio.',
    splashOr:         'ou',
    splashImportTitle:'Importar catálogo existente',
    splashImportDesc2:'Carrega um arquivo .json salvo anteriormente.',
  },
  en: {
    appName:          'Shopping List',
    backBtn:          'Back',
    tabList:          'List',
    tabCatalog:       'Catalog',
    listSubtitle:     'Select the product, enter the quantity — price is filled automatically.',
    colProduct:       'Product',
    colPrice:         'Unit Price',
    colQty:           'Qty.',
    colSubtotal:      'Subtotal',
    totalLabel:       'Grand Total',
    btnAddItem:       '+ Add item',
    btnExportPDF:     'Export PDF',
    btnClearAll:      'Clear all',
    catalogSubtitle:  'Register products and prices. Data is saved in the browser.',
    newProductTitle:  'NEW PRODUCT',
    labelName:        'Product name',
    labelPrice:       'Price',
    btnRegister:      'Add',
    searchPlaceholder:'Search product...',
    btnExportCat:     'Export catalog',
    btnImportCat:     'Import catalog',
    btnClearDB:       'Clear catalog',
    emptyMain:        'No items. Click here or "+ Add item" to start.',
    mainInfoEmpty:    'No items added.',
    mainInfoSingle:   'item',
    mainInfoPlural:   'items in the list',
    emptyDB:          'No products registered yet.',
    emptySearch:      'No search results found.',
    dbInfoEmpty:      'No products.',
    dbInfoSingle:     'registered product',
    dbInfoPlural:     'registered products',
    settingsAppearance:'Appearance',
    settingsDark:     'Dark mode',
    settingsLanguage: 'Language',
    productPlaceholder:'Ex: Whole Milk 1 gallon',
    splashTitle:      'Welcome back.',
    splashSubtitle:   'How would you like to start this session?\nChoose one of the options below.',
    splashNew:        'New database',
    splashNewDesc:    'Start fresh with an empty database. Register products in the "Catalog" tab.',
    splashImport:     'Import existing database',
    splashImportDesc: 'Load a previously saved .json file.',
    howToBackup:      'How to back up the catalog?',
    infoTitle:        'How to use the catalog',
    infoStep1:        '1. Click Export catalog to download the .json file',
    infoStep2:        '2. Save it somewhere safe (folder, USB drive, Google Drive…)',
    infoStep3:        '3. To restore, click Import catalog and select the file',
    toastExported:    '✓ Catalog exported successfully!',
    toastNewDB:       'Database cleared. Register your products!',
    promptName:       'Enter your name to save the catalog:',
    promptFileName:   'Write the file name:',
    btnCancel:        'Cancel',
    btnSave:          'Save',
    toastNoProducts:  'No products to export.',
    splashWelcome:    'Welcome.',
    splashSubtitle2:  'Set your preferences and choose how to start.',
    splashLangLabel:  'Language',
    splashCurrLabel:  'Currency',
    splashNewTitle:   'New catalog',
    splashNewDesc2:   'Start fresh with an empty catalog.',
    splashOr:         'or',
    splashImportTitle:'Import existing catalog',
    splashImportDesc2:'Load a previously saved .json file.',
  },
  es: {
    appName:          'Lista de Compras',
    backBtn:          'Volver',
    tabList:          'Lista',
    tabCatalog:       'Catálogo',
    listSubtitle:     'Selecciona el producto, ingresa la cantidad — el precio se completa automáticamente.',
    colProduct:       'Producto',
    colPrice:         'Precio Unit.',
    colQty:           'Cant.',
    colSubtotal:      'Subtotal',
    totalLabel:       'Total General',
    btnAddItem:       '+ Agregar artículo',
    btnExportPDF:     'Exportar PDF',
    btnClearAll:      'Limpiar todo',
    catalogSubtitle:  'Registra productos y precios. Los datos se guardan en el navegador.',
    newProductTitle:  'NUEVO PRODUCTO',
    labelName:        'Nombre del producto',
    labelPrice:       'Precio',
    btnRegister:      'Agregar',
    searchPlaceholder:'Buscar producto...',
    btnExportCat:     'Exportar catálogo',
    btnImportCat:     'Importar catálogo',
    btnClearDB:       'Limpiar catálogo',
    emptyMain:        'Sin artículos. Haz clic aquí o en "+ Agregar artículo" para empezar.',
    mainInfoEmpty:    'No hay artículos agregados.',
    mainInfoSingle:   'artículo',
    mainInfoPlural:   'artículos en la lista',
    emptyDB:          'Aún no hay productos registrados.',
    emptySearch:      'No se encontraron resultados.',
    dbInfoEmpty:      'Sin productos.',
    dbInfoSingle:     'producto registrado',
    dbInfoPlural:     'productos registrados',
    settingsAppearance:'Apariencia',
    settingsDark:     'Modo oscuro',
    settingsLanguage: 'Idioma',
    productPlaceholder:'Ej: Aceite de oliva 750 ml',
    splashTitle:      'Bienvenido de vuelta.',
    splashSubtitle:   '¿Cómo desea comenzar esta sesión?\nElige una de las opciones a continuación.',
    splashNew:        'Nueva base de datos',
    splashNewDesc:    'Comienza desde cero. Podrás registrar productos en la pestaña "Catálogo".',
    splashImport:     'Importar base existente',
    splashImportDesc: 'Carga un archivo .json guardado anteriormente.',
    howToBackup:      '¿Cómo hacer copia de seguridad?',
    infoTitle:        'Cómo usar el catálogo',
    infoStep1:        '1. Haz clic en Exportar catálogo para descargar el archivo .json',
    infoStep2:        '2. Guárdalo en un lugar seguro (carpeta, USB, Google Drive…)',
    infoStep3:        '3. Para restaurar, haz clic en Importar catálogo y selecciona el archivo',
    toastExported:    '✓ ¡Catálogo exportado con éxito!',
    toastNewDB:       'Base de datos limpiada. ¡Registra tus productos!',
    promptName:       'Escribe tu nombre para guardar el catálogo:',
    promptFileName:   'Escribe el nombre del archivo:',
    btnCancel:        'Cancelar',
    btnSave:          'Guardar',
    toastNoProducts:  'No hay productos para exportar.',
    splashWelcome:    'Bienvenido.',
    splashSubtitle2:  'Configura tus preferencias y elige cómo empezar.',
    splashLangLabel:  'Idioma',
    splashCurrLabel:  'Moneda',
    splashNewTitle:   'Nuevo catálogo',
    splashNewDesc2:   'Comienza desde cero con un catálogo vacío.',
    splashOr:         'o',
    splashImportTitle:'Importar catálogo existente',
    splashImportDesc2:'Carga un archivo .json guardado anteriormente.',
  }
};

let currentLang = localStorage.getItem('lang') || 'pt';

function t(key) {
  return (TRANSLATIONS[currentLang] || TRANSLATIONS.pt)[key] || key;
}

function buildInfoStepHTML(lang, step) {
  const exportLabel = t('btnExportCat');
  const importLabel = t('btnImportCat');

  if (step === 'infoStep1') {
    if (lang === 'en') {
      return `1. Click <strong style="color:var(--text2)">${exportLabel}</strong> to download the <code style="color:var(--accent);background:rgba(35,131,226,0.1);padding:1px 4px;border-radius:3px">.json</code> file`;
    }
    if (lang === 'es') {
      return `1. Haz clic en <strong style="color:var(--text2)">${exportLabel}</strong> para descargar el archivo <code style="color:var(--accent);background:rgba(35,131,226,0.1);padding:1px 4px;border-radius:3px">.json</code>`;
    }
    return `1. Clique em <strong style="color:var(--text2)">${exportLabel}</strong> para baixar o arquivo <code style="color:var(--accent);background:rgba(35,131,226,0.1);padding:1px 4px;border-radius:3px">.json</code>`;
  }

  if (step === 'infoStep3') {
    if (lang === 'en') {
      return `3. To restore, click <strong style="color:var(--text2)">${importLabel}</strong> and select the file`;
    }
    if (lang === 'es') {
      return `3. Para restaurar, haz clic en <strong style="color:var(--text2)">${importLabel}</strong> y selecciona el archivo`;
    }
    return `3. Para restaurar, clique em <strong style="color:var(--text2)">${importLabel}</strong> e selecione o arquivo`;
  }

  return '';
}

function applyLang() {
  const lang = currentLang;
  const messages = TRANSLATIONS[lang] || TRANSLATIONS.pt;
  // Update all data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (messages[key] === undefined) return;
    if (key === 'infoStep1' || key === 'infoStep3') {
      el.innerHTML = buildInfoStepHTML(lang, key);
      return;
    }
    el.textContent = messages[key];
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (messages[key] !== undefined) el.innerHTML = messages[key];
  });
  // Placeholder for product name input
  const inp = document.getElementById('db-nome');
  if (inp) inp.placeholder = t('productPlaceholder');
  // Search placeholder
  const srch = document.getElementById('db-search');
  if (srch) srch.placeholder = t('searchPlaceholder');
  // Empty row text
  const emptyRow = document.querySelector('#main-corpo .empty-row td');
  if (emptyRow) emptyRow.textContent = t('emptyMain');
  // Update lang button states
  document.querySelectorAll('[id^="lang-"], [id^="splash-lang-"]').forEach(b => b.classList.remove('active'));
  const activeBtn = document.getElementById('lang-' + lang);
  if (activeBtn) activeBtn.classList.add('active');
  const splashBtn = document.getElementById('splash-lang-' + lang);
  if (splashBtn) splashBtn.classList.add('active');
  // html lang attribute
  document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang;
  // Re-render DB to update empty state text
  renderDB();
  calcMain();
  updatePriceLabel();
  updateSplashText();
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
  applyLang();
  closeSettings();
}

function toggleDark(on) {
  document.body.classList.toggle('dark', on);
  localStorage.setItem('darkMode', on ? '1' : '0');
}

function toggleSettings(e) {
  e.stopPropagation();
  const panel = document.getElementById('settings-panel');
  panel.classList.toggle('open');
}

function closeSettings() {
  document.getElementById('settings-panel').classList.remove('open');
}

// Close panel when clicking outside
document.addEventListener('click', (e) => {
  const panel = document.getElementById('settings-panel');
  const btn   = document.querySelector('.settings-btn');
  if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
    panel.classList.remove('open');
  }
});

// ═══════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════
(function init() {
  // Dark mode ON by default
  const savedDark = localStorage.getItem('darkMode');
  const darkOn = savedDark === null ? true : savedDark === '1';
  if (darkOn) document.body.classList.add('dark');
  const tog = document.getElementById('dark-toggle');
  if (tog) tog.checked = darkOn;
  if (savedDark === null) localStorage.setItem('darkMode', '1');

  // Restore currency FIRST (applyLang calls updatePriceLabel which needs it)
  currentCurrency = localStorage.getItem('currency') || 'BRL';
  document.querySelectorAll('[id^="curr-"]').forEach(b => b.classList.remove('active'));
  const currBtn = document.getElementById('curr-' + currentCurrency);
  if (currBtn) currBtn.classList.add('active');

  // Restore language
  currentLang = localStorage.getItem('lang') || 'pt';
  applyLang();
  updatePriceLabel();

  // Sync splash buttons
  document.querySelectorAll('[id^="splash-lang-"]').forEach(b => b.classList.remove('active'));
  const slb = document.getElementById('splash-lang-' + currentLang);
  if (slb) slb.classList.add('active');
  document.querySelectorAll('[id^="splash-curr-"]').forEach(b => b.classList.remove('active'));
  const scb = document.getElementById('splash-curr-' + currentCurrency);
  if (scb) scb.classList.add('active');
  updateSplashText();

  renderDB();
  updateBadge();
  checkMainEmpty();
  calcMain();
})();
