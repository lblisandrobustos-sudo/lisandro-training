// ── CARD BUILDER ──
// Archivo separado — sin \u escapes en strings de comillas simples (Chrome los rechaza)

function getLastSeries(bdg) {
  if (!bdg) return null;
  var seriesM = String(bdg).match(/x\s*\d+\s*series.*/i);
  if (!seriesM) return null;
  var loadStr = String(bdg).replace(/\s*x\s*\d+\s*series.*/i, '').trim();
  var clean = loadStr.replace(/\([^)]*\)/g, function(m) { return m.replace(/-/g, '‒'); });
  var parts = clean.split(/\s+-\s+/);
  if (parts.length < 2) return null;
  var last = parts[parts.length - 1].replace(/‒/g, '-').trim();
  return last + ' ' + seriesM[0];
}

function _h(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&' + 'quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function card(e, isW) {
  var sv = ls()[e.id] || {};
  var isDone = !!sv.done;
  if (isDone) done.add(e.id);
  var hasSaved = sv.series || sv.reps || sv.carga;
  var lastSeries = getLastSeries(e.bdg);
  var hint = lastSeries
    ? '<div class="inline-reg-hint">solo registrar las últimas series: <strong>' + _h(lastSeries) + '</strong></div>'
    : '';
  var id = e.id;

  var inlineReg = (!isW && e.se)
    ? '<div class="inline-reg" onclick="event.stopPropagation()">' +
        '<div class="inline-reg-lbl">Mi registro</div>' + hint +
        '<div class="inline-reg-row">' +
          '<div class="ireg-f"><label>Series</label><input type="number" id="rs-' + id + '" value="' + _h(sv.series || '') + '" placeholder="' + _h(e.se || '—') + '" min="0" class="' + (sv.series ? 'has-value' : '') + '" data-fid="' + id + '" data-fn="dirty"></div>' +
          '<div class="ireg-f"><label>Reps</label><input type="number" id="rr-' + id + '" value="' + _h(sv.reps || '') + '" placeholder="—" class="' + (sv.reps ? 'has-value' : '') + '" data-fid="' + id + '" data-fn="dirty"></div>' +
          '<div class="ireg-f"><label>Carga</label><input type="text" id="rc-' + id + '" value="' + _h(sv.carga || '') + '" placeholder="kg" class="' + (sv.carga ? 'has-value' : '') + '" data-fid="' + id + '" data-fn="dirty"></div>' +
        '</div>' +
        '<div class="inline-reg-row two-col">' +
          '<div class="ireg-f"><label>Sensación</label><input type="text" id="rf-' + id + '" value="' + _h(sv.feeling || '') + '" placeholder="bien / pesado..." data-fid="' + id + '" data-fn="dirty"></div>' +
          '<div class="ireg-f"><label>Comentarios</label><input type="text" id="rn-' + id + '" value="' + _h(sv.comments || '') + '" placeholder="notas..." data-fid="' + id + '" data-fn="dirty"></div>' +
        '</div>' +
        '<button class="btn-ireg-save" data-fid="' + id + '" data-fn="save">💾 Guardar</button>' +
        '<div class="ireg-fb" id="sfb-' + id + '"></div>' +
      '</div>'
    : '';

  var tmr = e.rs > 0
    ? '<button class="btn-tmr" data-rs="' + e.rs + '" data-nm="' + _h(e.nm) + '" data-fn="tmr">⏱ Descanso ' + _h(e.pa) + '</button>'
    : '';

  var notaExpand = e.nt
    ? '<div class="ex-nota-expand">💡 ' + _h(e.nt) + '</div>'
    : '';

  return '<div class="ex-card ' + (isDone ? 'done-card' : '') + '" id="card-' + id + '">' +
    '<div class="ex-row" data-fid="' + id + '" data-fn="toggle">' +
      '<div class="ex-num">' + _h(e.n) + '</div>' +
      '<div class="ex-info">' +
        '<div class="ex-name">' + _h(e.nm) + '</div>' +
        '<div><span class="ex-badge">' + _h(e.bdg) + '</span><span class="reg-saved-dot ' + (hasSaved ? 'visible' : '') + '" id="dot-' + id + '"></span></div>' +
        '<div class="ex-pause">Pausa: ' + _h(e.pa) + '</div>' +
        inlineReg +
      '</div>' +
      '<div class="ex-right">' +
        '<a href="' + _h(e.yt) + '" target="_blank" rel="noopener" class="btn-vid" onclick="event.stopPropagation()">Ver video</a>' +
        '<div class="ex-chk ' + (isDone ? 'checked' : '') + '" id="chk-' + id + '" data-fid="' + id + '" data-fn="chk">' + (isDone ? '✓' : '') + '</div>' +
      '</div>' +
    '</div>' +
    ((tmr || notaExpand)
      ? '<div class="ex-body" id="body-' + id + '"><div class="ex-body-in">' + tmr + notaExpand + '</div></div>'
      : '<div id="body-' + id + '"></div>') +
  '</div>';
}

document.addEventListener('click', function(ev) {
  var el = ev.target.closest('[data-fn]');
  if (!el) return;
  var fn = el.dataset.fn, id = el.dataset.fid;
  if (fn === 'toggle') { ev.stopPropagation(); toggle(id); }
  else if (fn === 'chk') { ev.stopPropagation(); chkToggle(id); }
  else if (fn === 'save') { ev.stopPropagation(); saveReg(id); }
  else if (fn === 'tmr') { ev.stopPropagation(); startTmr(parseInt(el.dataset.rs), el.dataset.nm); }
});

document.addEventListener('input', function(ev) {
  var el = ev.target.closest('[data-fn="dirty"]');
  if (el) markDirty(el.dataset.fid);
});
