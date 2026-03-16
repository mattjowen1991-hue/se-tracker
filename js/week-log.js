// Week log tab — aggregation view with hardcoded weeks

// ── Hardcoded weeks: Mon 16 Mar 2026 → Sun 27 Dec 2026 ───────────────────

function generateWeeks() {
  const weeks = [];
  const start = new Date('2026-03-16'); // Monday
  const end   = new Date('2026-12-27'); // Last Sunday
  let cur = new Date(start);
  let num = 1;
  while (cur <= end) {
    const mon = new Date(cur);
    const sun = new Date(cur);
    sun.setDate(mon.getDate() + 6);
    weeks.push({
      label:      `W${num}`,
      week_start: fmtDate(mon),
      week_end:   fmtDate(sun),
      month:      mon.toLocaleString('en-GB', { month: 'long', year: 'numeric' }),
    });
    cur.setDate(cur.getDate() + 7);
    num++;
  }
  return weeks;
}

function fmtDate(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function fmtShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ── State ─────────────────────────────────────────────────────────────────

let _wlSelectedWeekStart = null;
let _wlOpenMonths = new Set();

// ── Main render ───────────────────────────────────────────────────────────

function renderWeekLog(weeklyMetrics) {
  const weeks    = generateWeeks();
  const escData  = window._escalations || [];
  const callData = window._calls || [];
  const docData  = window._docs  || [];

  // Default to current week
  const todayStr = fmtDate(new Date());
  const currentWeek = weeks.find(w => todayStr >= w.week_start && todayStr <= w.week_end) || weeks[0];
  if (!_wlSelectedWeekStart) _wlSelectedWeekStart = currentWeek.week_start;

  // Auto-open the month of the selected week
  const selWeek = weeks.find(w => w.week_start === _wlSelectedWeekStart) || currentWeek;
  _wlOpenMonths.add(selWeek.month);

  // Merge saved time data keyed by week_start
  const savedByStart = {};
  (weeklyMetrics || []).forEach(m => {
    if (m.week_start) savedByStart[m.week_start] = m;
  });

  // Group weeks by month
  const byMonth = [];
  let lastMonth = null;
  weeks.forEach(w => {
    if (w.month !== lastMonth) {
      byMonth.push({ month: w.month, weeks: [] });
      lastMonth = w.month;
    }
    byMonth[byMonth.length - 1].weeks.push(w);
  });

  // Stats for selected week
  const saved     = savedByStart[_wlSelectedWeekStart] || {};
  const formWeek  = selWeek;
  const escCount  = escData.filter(e  => e.date  >= formWeek.week_start && e.date  <= formWeek.week_end).length;
  const callCount = callData.filter(c => c.date >= formWeek.week_start && c.date <= formWeek.week_end).length;
  const docCount  = docData.filter(d  => d.date  >= formWeek.week_start && d.date  <= formWeek.week_end).length;

  document.getElementById('week-log-content').innerHTML = `

    <div class="wl-section">
      <div class="wl-section-header">
        <span class="wl-section-title">Time Distribution</span>
        <span class="wl-section-meta">${formWeek.label} · ${fmtShort(formWeek.week_start)} – ${fmtShort(formWeek.week_end)}</span>
      </div>

      <div class="wl-auto-stats">
        <div class="wl-stat"><span class="wl-stat-val">${escCount}</span><span class="wl-stat-label">Escalations</span></div>
        <div class="wl-stat"><span class="wl-stat-val">${callCount}</span><span class="wl-stat-label">Calls</span></div>
        <div class="wl-stat"><span class="wl-stat-val">${docCount}</span><span class="wl-stat-label">Docs</span></div>
      </div>

      <div class="form-grid-5" style="margin-top:16px">
        <div class="form-group">
          <label>Escalations <span class="target-hint">target ${TIME_TARGETS.escalations}%</span></label>
          <input id="wl-t-esc" type="number" class="input-field" placeholder="${TIME_TARGETS.escalations}" value="${saved.time_escalations ?? ''}" oninput="wlUpdateTimeTotal()" />
        </div>
        <div class="form-group">
          <label>Calls <span class="target-hint">target ${TIME_TARGETS.calls}%</span></label>
          <input id="wl-t-calls" type="number" class="input-field" placeholder="${TIME_TARGETS.calls}" value="${saved.time_calls ?? ''}" oninput="wlUpdateTimeTotal()" />
        </div>
        <div class="form-group">
          <label>Documentation <span class="target-hint">target ${TIME_TARGETS.docs}%</span></label>
          <input id="wl-t-docs" type="number" class="input-field" placeholder="${TIME_TARGETS.docs}" value="${saved.time_docs ?? ''}" oninput="wlUpdateTimeTotal()" />
        </div>
        <div class="form-group">
          <label>Cross-team <span class="target-hint">target ${TIME_TARGETS.async}%</span></label>
          <input id="wl-t-async" type="number" class="input-field" placeholder="${TIME_TARGETS.async}" value="${saved.time_async ?? ''}" oninput="wlUpdateTimeTotal()" />
        </div>
        <div class="form-group">
          <label>Projects <span class="target-hint">target ${TIME_TARGETS.projects}%</span></label>
          <input id="wl-t-projects" type="number" class="input-field" placeholder="${TIME_TARGETS.projects}" value="${saved.time_projects ?? ''}" oninput="wlUpdateTimeTotal()" />
        </div>
      </div>
      <div class="wl-time-total">
        <div class="wl-time-bar"><div class="wl-time-bar-fill" id="wl-time-bar-fill" style="width:0%"></div></div>
        <span id="wl-time-pct">0%</span>
      </div>
      <div class="wl-save-row">
        <button class="btn-primary" onclick="saveWeekLog()">Save Time Distribution</button>
      </div>
    </div>

    <div class="section-title" style="margin-top:32px">All Weekly Data</div>
    <div class="wl-month-list">
      ${byMonth.map(group => {
        const isOpen = _wlOpenMonths.has(group.month);
        return `
          <div class="wl-month-group">
            <div class="wl-month-header ${isOpen ? 'open' : ''}" onclick="wlToggleMonth('${group.month}')">
              <span>${group.month}</span>
              <span class="wl-month-chevron">${isOpen ? '▾' : '▸'}</span>
            </div>
            <div class="wl-month-body ${isOpen ? '' : 'hidden'}">
              <table class="data-table">
                <thead><tr>
                  <th>Week</th><th>Dates</th><th>Escalations</th><th>Calls</th><th>Docs</th>
                  <th>Esc %</th><th>Calls %</th><th>Docs %</th><th>Async %</th><th>Projects %</th>
                  <th></th>
                </tr></thead>
                <tbody>
                  ${group.weeks.map(w => {
                    const s    = savedByStart[w.week_start] || {};
                    const esc  = escData.filter(e  => e.date  >= w.week_start && e.date  <= w.week_end).length;
                    const call = callData.filter(c => c.date >= w.week_start && c.date <= w.week_end).length;
                    const doc  = docData.filter(d  => d.date  >= w.week_start && d.date  <= w.week_end).length;
                    const isSel = w.week_start === _wlSelectedWeekStart;
                    return `<tr class="${isSel ? 'wl-selected-row' : ''} clickable-row" onclick="wlSelectWeek('${w.week_start}')">
                      <td>${w.label}</td>
                      <td>${fmtShort(w.week_start)} – ${fmtShort(w.week_end)}</td>
                      <td>${esc}</td>
                      <td>${call}</td>
                      <td>${doc}</td>
                      <td>${s.time_escalations != null ? s.time_escalations + '%' : '—'}</td>
                      <td>${s.time_calls       != null ? s.time_calls       + '%' : '—'}</td>
                      <td>${s.time_docs        != null ? s.time_docs        + '%' : '—'}</td>
                      <td>${s.time_async       != null ? s.time_async       + '%' : '—'}</td>
                      <td>${s.time_projects    != null ? s.time_projects    + '%' : '—'}</td>
                      <td><span class="wl-edit-hint">${isSel ? '✏️ editing' : 'click to edit'}</span></td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>`;
      }).join('')}
    </div>
  `;

  wlUpdateTimeTotal();
}

// ── Week selection ─────────────────────────────────────────────────────────

function wlSelectWeek(weekStart) {
  _wlSelectedWeekStart = weekStart;
  renderWeekLog(window._weeklyMetrics);
  const section = document.querySelector('.wl-section');
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function wlToggleMonth(month) {
  if (_wlOpenMonths.has(month)) {
    _wlOpenMonths.delete(month);
  } else {
    _wlOpenMonths.clear();
    _wlOpenMonths.add(month);
  }
  renderWeekLog(window._weeklyMetrics);
}

// ── Time total indicator ───────────────────────────────────────────────────

function wlUpdateTimeTotal() {
  const ids = ['wl-t-esc', 'wl-t-calls', 'wl-t-docs', 'wl-t-async', 'wl-t-projects'];
  const total = ids.reduce((sum, id) => {
    const el = document.getElementById(id);
    return sum + (el && el.value !== '' ? parseInt(el.value) || 0 : 0);
  }, 0);
  const fill   = document.getElementById('wl-time-bar-fill');
  const pct    = document.getElementById('wl-time-pct');
  const capped = Math.min(total, 100);
  if (fill) {
    fill.style.width      = capped + '%';
    fill.style.background = total > 100 ? 'var(--red)' : total === 100 ? 'var(--green)' : 'var(--blue)';
  }
  if (pct) pct.textContent = total + '%';
}

// ── Save ───────────────────────────────────────────────────────────────────

async function saveWeekLog() {
  if (!_wlSelectedWeekStart) { showToast('No week selected', 'error'); return; }

  const weeks = generateWeeks();
  const week  = weeks.find(w => w.week_start === _wlSelectedWeekStart);
  if (!week) { showToast('Week not found', 'error'); return; }

  const parseNum = id => {
    const el = document.getElementById(id);
    return el && el.value !== '' ? parseInt(el.value) : null;
  };

  const existing = (window._weeklyMetrics || []).find(m => m.week_start === _wlSelectedWeekStart);

  const data = {
    week:             week.label,
    week_index:       parseInt(week.label.replace('W', '')),
    week_start:       week.week_start,
    week_end:         week.week_end,
    time_escalations: parseNum('wl-t-esc'),
    time_calls:       parseNum('wl-t-calls'),
    time_docs:        parseNum('wl-t-docs'),
    time_async:       parseNum('wl-t-async'),
    time_projects:    parseNum('wl-t-projects'),
  };

  showToast('Saving…', 'info');
  try {
    if (existing) {
      await updateWeeklyMetric(existing.id, data);
    } else {
      await upsertWeeklyMetric(data);
    }
    await reloadAll();
    showToast('Week saved!', 'success');
  } catch (e) {
    showToast('Save failed', 'error');
  }
}

// ── Called from app.js tab switch ─────────────────────────────────────────

function populateWeekForm() {
  // No-op — week-log self-initialises in renderWeekLog
}
