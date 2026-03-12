// Week log tab — enter weekly numbers

function renderWeekLog(weeklyMetrics) {
  document.getElementById('week-log-content').innerHTML = `
    <div class="week-log-form">
      <div class="section-title">Log This Week's Numbers</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Week</label>
          <select id="wl-week" class="input-field" onchange="populateWeekForm()">
            ${weeklyMetrics.map(w => `<option value="${w.id}" data-idx="${w.week_index}">${w.week}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Escalations Handled</label>
          <input id="wl-escalations" type="number" class="input-field" placeholder="0" />
        </div>
        <div class="form-group">
          <label>Calls Joined</label>
          <input id="wl-calls" type="number" class="input-field" placeholder="0" />
        </div>
        <div class="form-group">
          <label>Docs Completed</label>
          <input id="wl-docs" type="number" class="input-field" placeholder="0" />
        </div>
        <div class="form-group">
          <label>CSAT Score (out of 5)</label>
          <input id="wl-csat" type="number" step="0.1" min="0" max="5" class="input-field" placeholder="e.g. 4.5" />
        </div>
      </div>
      <div class="section-title" style="margin-top:20px">Time Distribution — Actuals (%)</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Escalations & Investigations <span class="target-hint">(target ${TIME_TARGETS.escalations}%)</span></label>
          <input id="wl-t-esc" type="number" class="input-field" placeholder="${TIME_TARGETS.escalations}" />
        </div>
        <div class="form-group">
          <label>Calls <span class="target-hint">(target ${TIME_TARGETS.calls}%)</span></label>
          <input id="wl-t-calls" type="number" class="input-field" placeholder="${TIME_TARGETS.calls}" />
        </div>
        <div class="form-group">
          <label>Documentation <span class="target-hint">(target ${TIME_TARGETS.docs}%)</span></label>
          <input id="wl-t-docs" type="number" class="input-field" placeholder="${TIME_TARGETS.docs}" />
        </div>
        <div class="form-group">
          <label>Cross-team Async <span class="target-hint">(target ${TIME_TARGETS.async}%)</span></label>
          <input id="wl-t-async" type="number" class="input-field" placeholder="${TIME_TARGETS.async}" />
        </div>
        <div class="form-group">
          <label>Special Projects <span class="target-hint">(target ${TIME_TARGETS.projects}%)</span></label>
          <input id="wl-t-projects" type="number" class="input-field" placeholder="${TIME_TARGETS.projects}" />
        </div>
      </div>
      <button class="btn-primary" style="margin-top:20px" onclick="saveWeekLog()">Save Week</button>
    </div>
    <script>setTimeout(populateWeekForm, 0);</script>
    <div class="section-title" style="margin-top:32px">All Weekly Data</div>
    <table class="data-table">
      <thead><tr>
        <th>Week</th><th>Escalations</th><th>Calls</th><th>Docs</th><th>CSAT</th>
        <th>Esc %</th><th>Calls %</th><th>Docs %</th><th>Async %</th><th>Projects %</th>
      </tr></thead>
      <tbody>
        ${weeklyMetrics.map(w => `
          <tr>
            <td>${w.week}</td>
            <td>${w.escalations ?? 0}</td>
            <td>${w.calls ?? 0}</td>
            <td>${w.docs_completed ?? 0}</td>
            <td>${w.csat_score ?? '—'}</td>
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

function populateWeekForm() {
  const id = document.getElementById('wl-week').value;
  const w = window._weeklyMetrics.find(m => m.id === id);
  if (!w) return;
  document.getElementById('wl-escalations').value = w.escalations ?? '';
  document.getElementById('wl-calls').value = w.calls ?? '';
  document.getElementById('wl-docs').value = w.docs_completed ?? '';
  document.getElementById('wl-csat').value = w.csat_score ?? '';
  document.getElementById('wl-t-esc').value = w.time_escalations ?? '';
  document.getElementById('wl-t-calls').value = w.time_calls ?? '';
  document.getElementById('wl-t-docs').value = w.time_docs ?? '';
  document.getElementById('wl-t-async').value = w.time_async ?? '';
  document.getElementById('wl-t-projects').value = w.time_projects ?? '';
}

async function saveWeekLog() {
  const id = document.getElementById('wl-week').value;
  const existing = window._weeklyMetrics.find(m => m.id === id) || {};

  const parseNum = (elId, fallback) => {
    const val = document.getElementById(elId).value;
    return val !== '' ? parseInt(val) : fallback;
  };
  const parseFloat2 = (elId, fallback) => {
    const val = document.getElementById(elId).value;
    return val !== '' ? parseFloat(val) : fallback;
  };

  const data = {
    escalations:      parseNum('wl-escalations', existing.escalations ?? 0),
    calls:            parseNum('wl-calls',        existing.calls ?? 0),
    docs_completed:   parseNum('wl-docs',         existing.docs_completed ?? 0),
    csat_score:       parseFloat2('wl-csat',      existing.csat_score ?? null),
    time_escalations: parseNum('wl-t-esc',        existing.time_escalations ?? 0),
    time_calls:       parseNum('wl-t-calls',      existing.time_calls ?? 0),
    time_docs:        parseNum('wl-t-docs',       existing.time_docs ?? 0),
    time_async:       parseNum('wl-t-async',      existing.time_async ?? 0),
    time_projects:    parseNum('wl-t-projects',   existing.time_projects ?? 0),
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
