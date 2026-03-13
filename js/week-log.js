// Week log tab — enter weekly numbers

// ── State for dynamic lists ────────────────────────────────────────────────
let _wlCallsLog = [];   // [{ org, notes, esc_id, impl_id }]
let _wlDocsLog  = [];   // [{ title, url, notes }]

function renderWeekLog(weeklyMetrics) {
  document.getElementById('week-log-content').innerHTML = `
    <div class="week-log-form">

      <div class="wl-section">
        <div class="wl-section-header">
          <span class="wl-section-title">This week</span>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Week</label>
            <select id="wl-week" class="input-field" onchange="populateWeekForm()">
              ${weeklyMetrics.map(w => `<option value="${w.id}" data-idx="${w.week_index}">${w.week}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Week Start</label>
            <input id="wl-week-start" type="date" class="input-field" onchange="wlUpdateEscalationCount(this.value, document.getElementById('wl-week-end').value)" />
          </div>
          <div class="form-group">
            <label>Week End</label>
            <input id="wl-week-end" type="date" class="input-field" onchange="wlUpdateEscalationCount(document.getElementById('wl-week-start').value, this.value)" />
          </div>
          <div class="form-group">
            <label>Escalations Handled <span class="target-hint" id="wl-esc-hint"></span></label>
            <input id="wl-escalations" type="number" class="input-field" placeholder="0" readonly style="background:var(--bg-secondary);cursor:default;opacity:0.8" />
          </div>

        </div>
      </div>

      <div class="wl-section">
        <div class="wl-section-header">
          <span class="wl-section-title">Calls Joined</span>
          <span class="wl-section-meta" id="wl-calls-count"></span>
        </div>
        <div id="wl-calls-list" class="wl-item-list"></div>
        <button class="wl-add-btn" onclick="wlAddCall()">+ Add Call</button>
      </div>

      <div class="wl-section">
        <div class="wl-section-header">
          <span class="wl-section-title">Docs Completed</span>
          <span class="wl-section-meta" id="wl-docs-count"></span>
        </div>
        <div id="wl-docs-list" class="wl-item-list"></div>
        <button class="wl-add-btn" onclick="wlAddDoc()">+ Add Doc</button>
      </div>

      <div class="wl-section">
        <div class="wl-section-header">
          <span class="wl-section-title">Time Distribution <span style="font-weight:400;text-transform:none;letter-spacing:0">— Actuals %</span></span>
          <span class="wl-section-meta" id="wl-time-total-label">0% of 100%</span>
        </div>
        <div class="form-grid-5">
          <div class="form-group">
            <label>Escalations <span class="target-hint">target ${TIME_TARGETS.escalations}%</span></label>
            <input id="wl-t-esc" type="number" class="input-field" placeholder="${TIME_TARGETS.escalations}" oninput="wlUpdateTimeTotal()" />
          </div>
          <div class="form-group">
            <label>Calls <span class="target-hint">target ${TIME_TARGETS.calls}%</span></label>
            <input id="wl-t-calls" type="number" class="input-field" placeholder="${TIME_TARGETS.calls}" oninput="wlUpdateTimeTotal()" />
          </div>
          <div class="form-group">
            <label>Documentation <span class="target-hint">target ${TIME_TARGETS.docs}%</span></label>
            <input id="wl-t-docs" type="number" class="input-field" placeholder="${TIME_TARGETS.docs}" oninput="wlUpdateTimeTotal()" />
          </div>
          <div class="form-group">
            <label>Cross-team <span class="target-hint">target ${TIME_TARGETS.async}%</span></label>
            <input id="wl-t-async" type="number" class="input-field" placeholder="${TIME_TARGETS.async}" oninput="wlUpdateTimeTotal()" />
          </div>
          <div class="form-group">
            <label>Projects <span class="target-hint">target ${TIME_TARGETS.projects}%</span></label>
            <input id="wl-t-projects" type="number" class="input-field" placeholder="${TIME_TARGETS.projects}" oninput="wlUpdateTimeTotal()" />
          </div>
        </div>
        <div class="wl-time-total">
          <div class="wl-time-bar"><div class="wl-time-bar-fill" id="wl-time-bar-fill" style="width:0%"></div></div>
          <span id="wl-time-pct">0%</span>
        </div>
      </div>

      <div class="wl-save-row">
        <button class="btn-primary" onclick="saveWeekLog()">Save Week</button>
      </div>
    </div>

    <div class="section-title" style="margin-top:32px">All Weekly Data</div>
    <table class="data-table">
      <thead><tr>
        <th>Week</th><th>Dates</th><th>Escalations</th><th>Calls</th><th>Docs</th>
        <th>Esc %</th><th>Calls %</th><th>Docs %</th><th>Async %</th><th>Projects %</th>
      </tr></thead>
      <tbody>
        ${weeklyMetrics.map(w => `
          <tr>
            <td>${w.week}</td>
            <td>${w.week_start && w.week_end ? `${w.week_start} – ${w.week_end}` : '—'}</td>
            <td>${w.escalations ?? 0}</td>
            <td>${(w.calls_log || []).length || w.calls || 0}</td>
            <td>${(w.docs_log || []).length || w.docs_completed || 0}</td>
            <td>${w.time_escalations ?? 0}%</td>
            <td>${w.time_calls ?? 0}%</td>
            <td>${w.time_docs ?? 0}%</td>
            <td>${w.time_async ?? 0}%</td>
            <td>${w.time_projects ?? 0}%</td>
          </tr>`).join('')}
      </tbody>
    </table>
  `;
}

// ── Dynamic list renderers ─────────────────────────────────────────────────

function wlRenderCalls() {
  const escs  = window._escalations || [];
  const impls = window._implementations || [];
  const container = document.getElementById('wl-calls-list');
  if (!container) return;

  const countEl = document.getElementById('wl-calls-count');
  if (countEl) countEl.textContent = _wlCallsLog.length ? `${_wlCallsLog.length} logged` : '';

  if (!_wlCallsLog.length) {
    container.innerHTML = '<div class="wl-empty">No calls logged yet.</div>';
    return;
  }

  container.innerHTML = _wlCallsLog.map((call, i) => `
    <div class="wl-item">
      <div class="wl-item-row">
        <input class="input-field wl-field-wide" placeholder="Org / company name"
          value="${call.org || ''}"
          oninput="_wlCallsLog[${i}].org = this.value" />
        <button class="wl-remove-btn" onclick="wlRemoveCall(${i})">✕</button>
      </div>
      <div class="wl-item-row">
        <textarea class="input-field wl-field-wide" rows="2" placeholder="Notes / outcome"
          oninput="_wlCallsLog[${i}].notes = this.value">${call.notes || ''}</textarea>
      </div>
      <div class="wl-item-row wl-link-row">
        <div class="wl-link-group">
          <label class="wl-link-label">Related Escalation</label>
          <select class="input-field wl-field-link" onchange="_wlCallsLog[${i}].esc_id = this.value">
            <option value="">— None —</option>
            ${escs.map(e => `<option value="${e.id}" ${call.esc_id === e.id ? 'selected' : ''}>${e.org} · ${e.type} · ${e.date}</option>`).join('')}
          </select>
        </div>
        <div class="wl-link-group">
          <label class="wl-link-label">Related Implementation</label>
          <select class="input-field wl-field-link" onchange="_wlCallsLog[${i}].impl_id = this.value">
            <option value="">— None —</option>
            ${impls.map(im => `<option value="${im.id}" ${call.impl_id === im.id ? 'selected' : ''}>${im.org} · ${im.stage}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
  `).join('');
}

function wlRenderDocs() {
  const container = document.getElementById('wl-docs-list');
  if (!container) return;

  const countEl = document.getElementById('wl-docs-count');
  if (countEl) countEl.textContent = _wlDocsLog.length ? `${_wlDocsLog.length} logged` : '';

  if (!_wlDocsLog.length) {
    container.innerHTML = '<div class="wl-empty">No docs logged yet.</div>';
    return;
  }

  container.innerHTML = _wlDocsLog.map((doc, i) => `
    <div class="wl-item">
      <div class="wl-item-row">
        <input class="input-field wl-field-wide" placeholder="Document title"
          value="${doc.title || ''}"
          oninput="_wlDocsLog[${i}].title = this.value" />
        <button class="wl-remove-btn" onclick="wlRemoveDoc(${i})">✕</button>
      </div>
      <div class="wl-item-row">
        <input class="input-field wl-field-wide" placeholder="URL (optional)"
          value="${doc.url || ''}"
          oninput="_wlDocsLog[${i}].url = this.value" />
      </div>
      <div class="wl-item-row">
        <textarea class="input-field wl-field-wide" rows="2" placeholder="Notes (optional)"
          oninput="_wlDocsLog[${i}].notes = this.value">${doc.notes || ''}</textarea>
      </div>
    </div>
  `).join('');
}

function wlAddCall() {
  _wlCallsLog.push({ org: '', notes: '', esc_id: '', impl_id: '' });
  wlRenderCalls();
}

function wlAddDoc() {
  _wlDocsLog.push({ title: '', url: '', notes: '' });
  wlRenderDocs();
}

function wlRemoveCall(i) {
  _wlCallsLog.splice(i, 1);
  wlRenderCalls();
}

function wlRemoveDoc(i) {
  _wlDocsLog.splice(i, 1);
  wlRenderDocs();
}

// ── Escalation auto-count ──────────────────────────────────────────────────

function wlUpdateEscalationCount(weekStart, weekEnd) {
  const el   = document.getElementById('wl-escalations');
  const hint = document.getElementById('wl-esc-hint');
  if (!weekStart || !weekEnd) {
    el.value = 0;
    if (hint) hint.textContent = 'set date range to auto-count';
    return;
  }
  const escs = (window._escalations || []).filter(e => {
    if (!e.date) return false;
    return e.date >= weekStart && e.date <= weekEnd;
  });
  el.value = escs.length;
  if (hint) hint.textContent = `auto-counted from escalations tab`;
}

// ── Form population ────────────────────────────────────────────────────────

function populateWeekForm() {
  const id = document.getElementById('wl-week').value;
  const w = window._weeklyMetrics.find(m => m.id === id);
  if (!w) return;

  document.getElementById('wl-week-start').value  = w.week_start ?? '';
  document.getElementById('wl-week-end').value    = w.week_end ?? '';
  wlUpdateEscalationCount(w.week_start, w.week_end);
  document.getElementById('wl-t-esc').value       = w.time_escalations ?? '';
  document.getElementById('wl-t-calls').value     = w.time_calls ?? '';
  document.getElementById('wl-t-docs').value      = w.time_docs ?? '';
  document.getElementById('wl-t-async').value     = w.time_async ?? '';
  document.getElementById('wl-t-projects').value  = w.time_projects ?? '';

  _wlCallsLog = Array.isArray(w.calls_log) ? JSON.parse(JSON.stringify(w.calls_log)) : [];
  _wlDocsLog  = Array.isArray(w.docs_log)  ? JSON.parse(JSON.stringify(w.docs_log))  : [];
  wlRenderCalls();
  wlRenderDocs();
  wlUpdateTimeTotal();
}

// ── Time total indicator ───────────────────────────────────────────────────

function wlUpdateTimeTotal() {
  const ids = ['wl-t-esc', 'wl-t-calls', 'wl-t-docs', 'wl-t-async', 'wl-t-projects'];
  const total = ids.reduce((sum, id) => {
    const el = document.getElementById(id);
    return sum + (el && el.value !== '' ? parseInt(el.value) || 0 : 0);
  }, 0);
  const fill = document.getElementById('wl-time-bar-fill');
  const pct  = document.getElementById('wl-time-pct');
  const lbl  = document.getElementById('wl-time-total-label');
  const capped = Math.min(total, 100);
  if (fill) {
    fill.style.width = capped + '%';
    fill.style.background = total > 100 ? 'var(--red)' : total === 100 ? 'var(--green)' : 'var(--blue)';
  }
  if (pct) pct.textContent = total + '%';
  if (lbl) {
    lbl.textContent = total + '% of 100%';
    lbl.className = 'wl-section-meta' + (total > 100 ? ' over' : total === 100 ? ' exact' : '');
  }
}

// ── Save ───────────────────────────────────────────────────────────────────

async function saveWeekLog() {
  const id = document.getElementById('wl-week').value;
  const existing = window._weeklyMetrics.find(m => m.id === id) || {};

  const parseNum = (elId, fallback) => {
    const val = document.getElementById(elId).value;
    return val !== '' ? parseInt(val) : fallback;
  };
  const parseFloat2 = (elId, fallback) => {
    const val = document.getElementById(elId).value;
    if (val === '') return fallback;
    const num = parseFloat(val);
    return Math.min(5, Math.max(0.1, num));
  };

  const cleanCalls = _wlCallsLog.map(c => ({
    org:     c.org || '',
    notes:   c.notes || '',
    esc_id:  c.esc_id  || null,
    impl_id: c.impl_id || null,
  }));
  const cleanDocs = _wlDocsLog.map(d => ({
    title: d.title || '',
    url:   d.url   || '',
    notes: d.notes || '',
  }));

  const data = {
    week_start:       document.getElementById('wl-week-start').value || null,
    week_end:         document.getElementById('wl-week-end').value || null,
    escalations:      parseInt(document.getElementById('wl-escalations').value) || 0,
    calls:            cleanCalls.length,
    calls_log:        cleanCalls,
    docs_completed:   cleanDocs.length,
    docs_log:         cleanDocs,
    time_escalations: parseNum('wl-t-esc',      existing.time_escalations ?? 0),
    time_calls:       parseNum('wl-t-calls',    existing.time_calls ?? 0),
    time_docs:        parseNum('wl-t-docs',     existing.time_docs ?? 0),
    time_async:       parseNum('wl-t-async',    existing.time_async ?? 0),
    time_projects:    parseNum('wl-t-projects', existing.time_projects ?? 0),
  };

  showToast('Saving…', 'info');
  try {
    await updateWeeklyMetric(id, data);
    await reloadAll();
    showToast('Week saved!', 'success');
  } catch (e) {
    showToast('Save failed', 'error');
  }
}
