// Trends tab — week-on-week charts + Silent App implementation metrics + drill-down panels

const CHART_CONTEXT = {
  escalations: {
    title: 'Escalations per Week',
    why: 'Tracks how many complex cases you took ownership of. Rising numbers show growing demand for SE involvement — useful evidence for headcount or scope conversations with Michael.',
    good: (v) => v === 0 ? 'No escalations this week.' : v <= 5 ? `${v} — solid, manageable volume.` : v <= 10 ? `${v} — busy week, worth noting in your 1-on-1.` : `${v} — high volume. Flag capacity if this continues.`
  },
  calls: {
    title: 'Calls Joined per Week',
    why: 'Measures your direct involvement in Sales and Success conversations. Shows the breadth of your impact beyond async support work.',
    good: (v) => v === 0 ? 'No calls this week.' : v <= 3 ? `${v} — light call week.` : v <= 8 ? `${v} — good engagement with Sales and Success.` : `${v} — heavy call load. Check time distribution balance.`
  },
  csat: {
    title: 'CSAT Score (out of 5)',
    why: 'Customer satisfaction score from post-interaction surveys. Reflects the quality of your technical communication and resolution, not just whether the issue was fixed.',
    good: (v) => v === 0 ? 'No CSAT data this week.' : v >= 4.5 ? `${v}/5 — excellent. Strong signal of clear, high-quality resolutions.` : v >= 4 ? `${v}/5 — good. Room to push toward 4.5+.` : v >= 3 ? `${v}/5 — worth reviewing what drove lower scores.` : `${v}/5 — flag for review with Michael.`
  },
  docs: {
    title: 'Docs Completed per Week',
    why: 'Tracks documentation output — guides, runbooks, Outline pages. Reduces repeat escalations over time and builds the knowledge base for the wider Support team.',
    good: (v) => v === 0 ? 'No docs completed this week.' : v === 1 ? '1 doc — steady contribution.' : v <= 3 ? `${v} docs — strong output.` : `${v} docs — excellent. High documentation weeks compound over time.`
  },
  saStage: {
    title: 'Implementations by Stage',
    why: 'Snapshot of where all active Silent App implementations currently sit in the pipeline. A healthy pipeline should have orgs moving through steadily with few stuck in Pre-Deployment.',
    good: (v) => `${v} implementation${v !== 1 ? 's' : ''} in this stage.`
  },
  saNew: {
    title: 'New Implementations per Week',
    why: 'Tracks how many new Silent App deployments were kicked off each week. Rising trend shows growing adoption and demand for the SE role.',
    good: (v) => v === 0 ? 'No new implementations this week.' : v === 1 ? '1 new implementation started.' : `${v} new implementations — strong week.`
  },
  saStable: {
    title: 'Implementations Reached Stability per Week',
    why: 'How many deployments completed successfully each week. This is the key output metric for the Silent App workstream — each stable implementation is a fully delivered deployment.',
    good: (v) => v === 0 ? 'No implementations reached Stability this week.' : v === 1 ? '1 deployment completed — solid.' : `${v} deployments completed — excellent week.`
  },
  saTime: {
    title: 'Avg. Days to Stability',
    why: 'Average time from Pre-Deployment to Stability across all completed implementations. Lower is better, but complex MDM environments take longer — use this to spot outliers and set realistic expectations.',
    good: (v) => v === 0 ? 'No completed implementations yet.' : v <= 14 ? `${v} days avg — fast deployment.` : v <= 30 ? `${v} days avg — typical range.` : `${v} days avg — longer than usual. Check for blockers.`
  }
};

let _activeDrillChart = null;
let _drillData = {};

function renderTrends(weeklyMetrics, implementations) {
  const impls = (implementations || []).filter(i => i.stage !== 'Archived');
  const weeks = weeklyMetrics.map(w => w.week);
  const escalationsData = weeklyMetrics.map(w => w.escalations || 0);
  const callsData       = weeklyMetrics.map(w => w.calls || 0);
  const csatData        = weeklyMetrics.map(w => w.csat_score || 0);
  const docsData        = weeklyMetrics.map(w => w.docs_completed || 0);

  const stageLabels = ['Pre-Dep', 'Deploy', 'Validation', 'Stability'];
  const stageKeys   = ['Pre-Deployment', 'Deployment', 'Validation', 'Stability'];
  const stageCounts = stageKeys.map(s => impls.filter(i => i.stage === s).length);

  const today = new Date();
  const dayOfWeek = today.getDay();
  const thisMon = new Date(today);
  thisMon.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  thisMon.setHours(0,0,0,0);

  // week_index is DESCENDING: 1 = current week, 2 = last week, etc.
  // Normalise any date value to YYYY-MM-DD using LOCAL date parts, not UTC
  // This prevents timezone shifts (e.g. 2026-01-26T00:30Z reading as Jan 25 locally)
  function toDateStr(val) {
    if (!val) return null;
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const d = new Date(val);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function weekBounds(wIdx) {
    // wIdx=1 is current week, wIdx=2 is last week, etc.
    const weeksAgo = wIdx - 1;
    const mon = new Date(thisMon);
    mon.setDate(thisMon.getDate() - weeksAgo * 7);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const fmt = d => d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
    return { start: fmt(mon), end: fmt(sun) };
  }

  const saNewData = weeklyMetrics.map(w => {
    const { start, end } = weekBounds(w.week_index || 1);
    return impls.filter(i => {
      const d = toDateStr(i.created_at);
      if (!d) return false;
      return d >= start && d <= end;
    }).length;
  });

  const saStableData = weeklyMetrics.map(w => {
    const { start, end } = weekBounds(w.week_index || 1);
    return impls.filter(i => {
      const entered = toDateStr((i.stage_entered_at || {})['Stability']);
      if (!entered) return false;
      return entered >= start && entered <= end;
    }).length;
  });

  const completed = impls.filter(i => {
    const sea = i.stage_entered_at || {};
    return sea['Pre-Deployment'] && sea['Stability'];
  });

  let avgDaysData = [];
  if (weeks.length > 0) {
    avgDaysData = weeklyMetrics.map(w => {
      const { end } = weekBounds(w.week_index || 1);
      const done = completed.filter(i => {
        const stab = toDateStr((i.stage_entered_at || {})['Stability']);
        return stab && stab <= end;
      });
      if (!done.length) return 0;
      const total = done.reduce((sum, i) => {
        const s = new Date((i.stage_entered_at || {})['Pre-Deployment']);
        const e = new Date((i.stage_entered_at || {})['Stability']);
        return sum + Math.round((e - s) / 86400000);
      }, 0);
      return Math.round(total / done.length);
    });
  }

  const ragGreen = impls.filter(i => i.rag === 'Green').length;
  const ragAmber = impls.filter(i => i.rag === 'Amber').length;
  const ragRed   = impls.filter(i => i.rag === 'Red').length;
  const totalActive = impls.length;

  _drillData = {
    'chart-esc':       { type: 'weekly-escalations', weeks: weeklyMetrics, weekBounds },
    'chart-calls':     { type: 'weekly-calls',        weeks: weeklyMetrics },
    'chart-csat':      { type: 'weekly-csat',          weeks: weeklyMetrics },
    'chart-docs':      { type: 'weekly-docs',          weeks: weeklyMetrics },
    'chart-sa-stage':  { type: 'sa-stage',  stageKeys, stageLabels, impls },
    'chart-sa-new':    { type: 'sa-new',    weeks: weeklyMetrics, impls, weekBounds },
    'chart-sa-stable': { type: 'sa-stable', weeks: weeklyMetrics, impls, weekBounds },
    'chart-sa-time':   { type: 'sa-time',   weeks: weeklyMetrics, completed, weekBounds }
  };

  document.getElementById('trends-content').innerHTML = `
    <div class="trends-section-label">📊 Weekly Activity</div>
    <div class="chart-grid">
      <div class="chart-card" id="wrap-chart-esc">
        <div class="chart-title">${CHART_CONTEXT.escalations.title}</div>
        <canvas id="chart-esc" height="220"></canvas>
        <div class="drill-panel hidden" id="drill-chart-esc"></div>
      </div>
      <div class="chart-card" id="wrap-chart-calls">
        <div class="chart-title">${CHART_CONTEXT.calls.title}</div>
        <canvas id="chart-calls" height="220"></canvas>
        <div class="drill-panel hidden" id="drill-chart-calls"></div>
      </div>
      <div class="chart-card" id="wrap-chart-csat">
        <div class="chart-title">${CHART_CONTEXT.csat.title}</div>
        <canvas id="chart-csat" height="220"></canvas>
        <div class="drill-panel hidden" id="drill-chart-csat"></div>
      </div>
      <div class="chart-card" id="wrap-chart-docs">
        <div class="chart-title">${CHART_CONTEXT.docs.title}</div>
        <canvas id="chart-docs" height="220"></canvas>
        <div class="drill-panel hidden" id="drill-chart-docs"></div>
      </div>
    </div>

    <div class="trends-section-label">🤫 Silent App</div>
    <div class="sa-rag-summary">
      <div class="rag-stat green"><span class="rag-stat-num">${ragGreen}</span><span class="rag-stat-lbl">🟢 On Track</span></div>
      <div class="rag-stat amber"><span class="rag-stat-num">${ragAmber}</span><span class="rag-stat-lbl">🟡 Needs Attention</span></div>
      <div class="rag-stat red"><span class="rag-stat-num">${ragRed}</span><span class="rag-stat-lbl">🔴 At Risk</span></div>
      <div class="rag-stat neutral"><span class="rag-stat-num">${totalActive}</span><span class="rag-stat-lbl">Active Total</span></div>
    </div>
    <div class="chart-grid">
      <div class="chart-card" id="wrap-chart-sa-stage">
        <div class="chart-title">${CHART_CONTEXT.saStage.title}</div>
        <canvas id="chart-sa-stage" height="220"></canvas>
        <div class="drill-panel hidden" id="drill-chart-sa-stage"></div>
      </div>
      <div class="chart-card" id="wrap-chart-sa-new">
        <div class="chart-title">${CHART_CONTEXT.saNew.title}</div>
        <canvas id="chart-sa-new" height="220"></canvas>
        <div class="drill-panel hidden" id="drill-chart-sa-new"></div>
      </div>
      <div class="chart-card" id="wrap-chart-sa-stable">
        <div class="chart-title">${CHART_CONTEXT.saStable.title}</div>
        <canvas id="chart-sa-stable" height="220"></canvas>
        <div class="drill-panel hidden" id="drill-chart-sa-stable"></div>
      </div>
      <div class="chart-card" id="wrap-chart-sa-time">
        <div class="chart-title">${CHART_CONTEXT.saTime.title}</div>
        <canvas id="chart-sa-time" height="220"></canvas>
        <div class="drill-panel hidden" id="drill-chart-sa-time"></div>
      </div>
    </div>
  `;

  drawBarChart('chart-esc',        weeks,       escalationsData, '#1C8EF9', CHART_CONTEXT.escalations);
  drawBarChart('chart-calls',      weeks,       callsData,       '#36C5B0', CHART_CONTEXT.calls);
  drawLineChart('chart-csat',      weeks,       csatData,        '#F59E0B', 5, CHART_CONTEXT.csat);
  drawBarChart('chart-docs',       weeks,       docsData,        '#8B5CF6', CHART_CONTEXT.docs);
  drawBarChart('chart-sa-stage',   stageLabels, stageCounts,     '#36C5B0', CHART_CONTEXT.saStage);
  drawBarChart('chart-sa-new',     weeks,       saNewData,       '#1C8EF9', CHART_CONTEXT.saNew);
  drawBarChart('chart-sa-stable',  weeks,       saStableData,    '#22c55e', CHART_CONTEXT.saStable);
  drawLineChart('chart-sa-time',   weeks,       avgDaysData,     '#F59E0B', Math.max(...avgDaysData, 30), CHART_CONTEXT.saTime);
}

// ── Drill-down logic ──────────────────────────────────────────────────────────

function openDrillPanel(chartId, idx, label) {
  if (_activeDrillChart && _activeDrillChart !== chartId) {
    const prev = document.getElementById('drill-' + _activeDrillChart);
    if (prev) prev.classList.add('hidden');
  }
  const panel = document.getElementById('drill-' + chartId);
  if (!panel) return;
  if (_activeDrillChart === chartId && !panel.classList.contains('hidden') && panel.dataset.idx == idx) {
    panel.classList.add('hidden');
    _activeDrillChart = null;
    return;
  }
  _activeDrillChart = chartId;
  panel.dataset.idx = idx;
  panel.innerHTML = buildDrillContent(chartId, idx, label);
  panel.classList.remove('hidden');
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function buildDrillContent(chartId, idx, label) {
  const d = _drillData[chartId];
  if (!d) return drillEmpty(chartId, label);

  if (d.type === 'weekly-escalations') {
    const week = d.weeks[idx];
    if (!week) return drillEmpty(chartId, label);
    const { start, end } = d.weekBounds(week.week_index || 1);
    const escs = (window._escalations || []).filter(e => { const ed = toDateStr(e.date); return ed && ed >= start && ed <= end; });
    if (!escs.length) return drillEmpty(chartId, label, 'No escalations logged for this week.');
    return `
      <div class="drill-header">
        <span class="drill-title">📋 ${label} — Escalations (${escs.length})</span>
        <button class="drill-close" onclick="closeDrillById('${chartId}')">✕ Close</button>
      </div>
      <div class="drill-table-wrap">
        <table class="drill-table">
          <thead><tr><th>Date</th><th>Org</th><th>Type</th><th>Outcome</th><th>Days</th><th>Notes</th></tr></thead>
          <tbody>
            ${escs.map(e => `<tr>
              <td>${e.date || '—'}</td>
              <td>${e.org || '—'}</td>
              <td><span class="tag">${e.type || '—'}</span></td>
              <td><span class="outcome ${(e.outcome||'').toLowerCase().replace(/ /g,'-')}">${e.outcome || '—'}</span></td>
              <td>${e.days_to_resolve ?? '—'}</td>
              <td class="drill-notes">${e.notes || '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  if (d.type === 'weekly-calls') {
    const week = d.weeks[idx];
    if (!week) return drillEmpty(chartId, label);
    return `
      <div class="drill-header">
        <span class="drill-title">📞 ${label} — Calls (${week.calls || 0})</span>
        <button class="drill-close" onclick="closeDrillById('${chartId}')">✕ Close</button>
      </div>
      <div class="drill-detail-grid">
        ${drillStat('Calls Joined', week.calls || 0)}
      </div>
      ${week.call_notes ? `<div class="drill-note-block"><strong>Notes:</strong> ${week.call_notes}</div>` : '<div class="drill-no-detail">No call notes for this week. Add them in the Week Log tab.</div>'}`;
  }

  if (d.type === 'weekly-csat') {
    const week = d.weeks[idx];
    if (!week) return drillEmpty(chartId, label);
    const score = week.csat_score || 0;
    const colour = score >= 4.5 ? 'var(--green)' : score >= 3.5 ? 'var(--amber)' : score > 0 ? 'var(--red)' : '#444';
    return `
      <div class="drill-header">
        <span class="drill-title">⭐ ${label} — CSAT</span>
        <button class="drill-close" onclick="closeDrillById('${chartId}')">✕ Close</button>
      </div>
      <div class="drill-detail-grid">
        ${drillStat('CSAT Score', score > 0 ? score.toFixed(1) + ' / 5' : 'No data')}
        ${drillStat('Signal', score >= 4.5 ? '🟢 Excellent' : score >= 4 ? '🟡 Good' : score >= 3 ? '🟠 Review' : score > 0 ? '🔴 Flag' : '—')}
      </div>
      ${score > 0 ? `<div class="drill-score-bar-wrap"><div class="drill-score-bar"><div class="drill-score-fill" style="width:${(score/5)*100}%;background:${colour}"></div></div><span class="drill-score-label">${score.toFixed(1)}/5</span></div>` : ''}
      ${week.csat_notes ? `<div class="drill-note-block"><strong>Notes:</strong> ${week.csat_notes}</div>` : '<div class="drill-no-detail">No CSAT notes. Add context in the Week Log tab.</div>'}`;
  }

  if (d.type === 'weekly-docs') {
    const week = d.weeks[idx];
    if (!week) return drillEmpty(chartId, label);
    return `
      <div class="drill-header">
        <span class="drill-title">📄 ${label} — Documentation (${week.docs_completed || 0})</span>
        <button class="drill-close" onclick="closeDrillById('${chartId}')">✕ Close</button>
      </div>
      <div class="drill-detail-grid">
        ${drillStat('Docs Completed', week.docs_completed || 0)}
      </div>
      ${week.docs_notes ? `<div class="drill-note-block"><strong>Notes:</strong> ${week.docs_notes}</div>` : '<div class="drill-no-detail">No doc notes. Add them in the Week Log tab.</div>'}`;
  }

  if (d.type === 'sa-stage') {
    const stageKey = d.stageKeys[idx];
    const stageLbl = d.stageLabels[idx];
    const orgs = d.impls.filter(i => i.stage === stageKey);
    if (!orgs.length) return drillEmpty(chartId, stageLbl, 'No active implementations in ' + stageKey + '.');
    return `
      <div class="drill-header">
        <span class="drill-title">📍 ${stageLbl} — ${orgs.length} Org${orgs.length !== 1 ? 's' : ''}</span>
        <button class="drill-close" onclick="closeDrillById('${chartId}')">✕ Close</button>
      </div>
      <div class="drill-impl-list">${orgs.map(i => implCard(i, false)).join('')}</div>`;
  }

  if (d.type === 'sa-new') {
    const week = d.weeks[idx];
    if (!week) return drillEmpty(chartId, label);
    const { start, end } = d.weekBounds(week.week_index || 1);
    const orgs = d.impls.filter(i => { const d2 = toDateStr(i.created_at); return d2 && d2 >= start && d2 <= end; });
    if (!orgs.length) return drillEmpty(chartId, label, 'No implementations started this week.');
    return `
      <div class="drill-header">
        <span class="drill-title">🚀 ${label} — ${orgs.length} New Implementation${orgs.length !== 1 ? 's' : ''}</span>
        <button class="drill-close" onclick="closeDrillById('${chartId}')">✕ Close</button>
      </div>
      <div class="drill-impl-list">${orgs.map(i => implCard(i, false)).join('')}</div>`;
  }

  if (d.type === 'sa-stable') {
    const week = d.weeks[idx];
    if (!week) return drillEmpty(chartId, label);
    const { start, end } = d.weekBounds(week.week_index || 1);
    const orgs = d.impls.filter(i => {
      const entered = toDateStr((i.stage_entered_at || {})['Stability']);
      return entered && entered >= start && entered <= end;
    });
    if (!orgs.length) return drillEmpty(chartId, label, 'No implementations reached Stability this week.');
    return `
      <div class="drill-header">
        <span class="drill-title">✅ ${label} — ${orgs.length} Deployment${orgs.length !== 1 ? 's' : ''} Completed</span>
        <button class="drill-close" onclick="closeDrillById('${chartId}')">✕ Close</button>
      </div>
      <div class="drill-impl-list">${orgs.map(i => implCard(i, true)).join('')}</div>`;
  }

  if (d.type === 'sa-time') {
    const week = d.weeks[idx];
    if (!week) return drillEmpty(chartId, label);
    const { end } = d.weekBounds(week.week_index || 1);
    const done = d.completed.filter(i => {
      const stab = toDateStr((i.stage_entered_at || {})['Stability']);
      return stab && stab <= end;
    });
    if (!done.length) return drillEmpty(chartId, label, 'No completed implementations by this point.');
    const withDays = done.map(i => {
      const s = new Date((i.stage_entered_at)['Pre-Deployment']);
      const e = new Date((i.stage_entered_at)['Stability']);
      return { ...i, _days: Math.round((e - s) / 86400000) };
    }).sort((a, b) => a._days - b._days);
    const avg = Math.round(withDays.reduce((s, i) => s + i._days, 0) / withDays.length);
    return `
      <div class="drill-header">
        <span class="drill-title">⏱ ${label} — Time to Stability (${done.length} completed)</span>
        <button class="drill-close" onclick="closeDrillById('${chartId}')">✕ Close</button>
      </div>
      <div class="drill-detail-grid">
        ${drillStat('Average', avg + ' days')}
        ${drillStat('Fastest', withDays[0]._days + 'd — ' + (withDays[0].org_name || withDays[0].org || '?'))}
        ${drillStat('Slowest', withDays[withDays.length-1]._days + 'd — ' + (withDays[withDays.length-1].org_name || withDays[withDays.length-1].org || '?'))}
        ${drillStat('Total Orgs', done.length)}
      </div>
      <div class="drill-table-wrap">
        <table class="drill-table">
          <thead><tr><th>Org</th><th>Device / OS</th><th>Days</th><th>vs Avg</th><th>Pre-Dep</th><th>Stability</th></tr></thead>
          <tbody>
            ${withDays.map(i => {
              const diff = i._days - avg;
              const vs = diff === 0 ? '= avg' : diff > 0 ? '+' + diff + 'd' : diff + 'd';
              const cls = diff > 7 ? 'drill-slow' : diff < -7 ? 'drill-fast' : '';
              return '<tr><td>' + (i.org_name || i.org || '—') + '</td><td>' +
                ([i.device, i.os].filter(Boolean).join(' / ') || '—') + '</td><td><strong>' +
                i._days + '</strong></td><td class="' + cls + '">' + vs + '</td><td>' +
                ((i.stage_entered_at||{})['Pre-Deployment'] || '—') + '</td><td>' +
                ((i.stage_entered_at||{})['Stability'] || '—') + '</td></tr>';
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  return drillEmpty(chartId, label);
}

function implCard(i, showTotalDays) {
  const ragEmoji = { Green: '🟢', Amber: '🟡', Red: '🔴' }[i.rag] || '⚪';
  const CHECKLISTS = window.STAGE_CHECKLISTS || {};
  const items = CHECKLISTS[i.stage] || [];
  const checklist = i.checklist || {};
  const done = items.filter(it => checklist[it.id]).length;
  const total = items.length;

  let daysStr = '';
  if (showTotalDays && i.stage_entered_at) {
    const pre  = (i.stage_entered_at)['Pre-Deployment'];
    const stab = (i.stage_entered_at)['Stability'];
    if (pre && stab) {
      const days = Math.round((new Date(stab) - new Date(pre)) / 86400000);
      daysStr = '<span class="drill-days-badge">' + days + ' days total</span>';
    }
  } else if (i.stage_entered_at && i.stage_entered_at[i.stage]) {
    const daysIn = Math.round((new Date() - new Date(i.stage_entered_at[i.stage])) / 86400000);
    daysStr = '<span class="drill-days-badge">' + daysIn + 'd in stage</span>';
  }

  const links = [];
  if (i.hubspot_url) links.push('<a href="' + i.hubspot_url + '" target="_blank" class="drill-link">HubSpot ↗</a>');
  if (i.slack_url)   links.push('<a href="' + i.slack_url   + '" target="_blank" class="drill-link">Slack ↗</a>');

  return '<div class="drill-impl-card">' +
    '<div class="drill-impl-header">' +
      '<span class="drill-impl-name">' + (i.org_name || i.org || 'Unknown') + '</span>' +
      '<span class="drill-impl-meta">' + ragEmoji + ' ' + (i.rag||'—') + ' &nbsp;·&nbsp; ' + i.stage + '</span>' +
      daysStr +
    '</div>' +
    '<div class="drill-impl-detail">' +
      [i.device, i.os, i.mdm].filter(Boolean).map(v => '<span class="tag">' + v + '</span>').join(' ') +
      (total > 0 ? ' <span class="drill-checklist-badge">' + done + '/' + total + ' checklist</span>' : '') +
      (links.length ? ' <span class="drill-links">' + links.join(' ') + '</span>' : '') +
    '</div>' +
  '</div>';
}

function drillStat(label, value) {
  return '<div class="drill-stat-card"><div class="drill-stat-val">' + value + '</div><div class="drill-stat-lbl">' + label + '</div></div>';
}

function drillEmpty(chartId, label, msg) {
  return '<div class="drill-header"><span class="drill-title">' + label + '</span>' +
    '<button class="drill-close" onclick="closeDrillById(\'' + chartId + '\')">✕ Close</button></div>' +
    '<div class="drill-empty">' + (msg || 'No data available for this period.') + '</div>';
}

function closeDrillById(chartId) {
  const panel = document.getElementById('drill-' + chartId);
  if (panel) panel.classList.add('hidden');
  if (_activeDrillChart === chartId) _activeDrillChart = null;
}

// ── Chart drawing ─────────────────────────────────────────────────────────────

function drawBarChart(id, labels, data, colour, context) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 400;
  const H = canvas.height;
  canvas.width = W;
  const max = Math.max(...data, 1);
  const pad = { top: 24, right: 10, bottom: 30, left: 30 };
  const gap = (W - pad.left - pad.right) / labels.length;
  const barW = gap * 0.6;
  let selectedIdx = null;

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f1923';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (H - pad.top - pad.bottom) * (1 - i / 4);
      ctx.strokeStyle = '#1e2d3d'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
      ctx.fillStyle = '#4a6278'; ctx.font = '10px monospace';
      ctx.fillText(Math.round(max * i / 4), 2, y + 4);
    }
    if (selectedIdx !== null) {
      ctx.fillStyle = colour;
      ctx.font = 'bold 10px monospace';
      ctx.fillText('▼ see details below', pad.left, 16);
    }
    data.forEach((val, i) => {
      const x    = pad.left + i * gap + gap / 2 - barW / 2;
      const barH = Math.max(((H - pad.top - pad.bottom) * val) / max, val > 0 ? 2 : 0);
      const y    = H - pad.bottom - barH;
      const isSel = selectedIdx === i;
      ctx.fillStyle = isSel ? colour : colour + 'bb';
      if (isSel) { ctx.shadowColor = colour; ctx.shadowBlur = 10; }
      ctx.fillRect(x, y, barW, barH);
      ctx.shadowBlur = 0;
      if (isSel) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, barW, barH);
      }
      ctx.fillStyle = isSel ? '#fff' : '#7a9bb5';
      ctx.font = isSel ? 'bold 10px monospace' : '10px monospace';
      const lbl = labels[i];
      const lblW = ctx.measureText(lbl).width;
      ctx.fillText(lbl, pad.left + i * gap + gap / 2 - lblW / 2, H - 8);
    });
  };
  draw();

  canvas.style.cursor = 'pointer';
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    let clicked = null;
    data.forEach((val, i) => {
      const x = pad.left + i * gap + gap / 2 - barW / 2;
      if (mx >= x - 4 && mx <= x + barW + 4) clicked = i;
    });
    if (clicked !== null) {
      const wasSelected = selectedIdx === clicked;
      selectedIdx = wasSelected ? null : clicked;
      draw();
      if (!wasSelected) openDrillPanel(id, clicked, labels[clicked]);
      else closeDrillById(id);
    } else {
      selectedIdx = null; draw();
    }
  });
}

function drawLineChart(id, labels, data, colour, maxVal, context) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 400;
  const H = canvas.height;
  canvas.width = W;
  const pad = { top: 24, right: 10, bottom: 30, left: 30 };
  const gap = (W - pad.left - pad.right) / (labels.length - 1 || 1);
  let selectedIdx = null;
  const pointX = (i) => pad.left + i * gap;
  const pointY = (v) => pad.top + (H - pad.top - pad.bottom) * (1 - v / (maxVal || 1));

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f1923';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + (H - pad.top - pad.bottom) * (1 - i / 5);
      ctx.strokeStyle = '#1e2d3d'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
      ctx.fillStyle = '#4a6278'; ctx.font = '10px monospace';
      ctx.fillText((maxVal * i / 5).toFixed(maxVal <= 10 ? 1 : 0), 2, y + 4);
    }
    if (selectedIdx !== null) {
      ctx.fillStyle = colour;
      ctx.font = 'bold 10px monospace';
      ctx.fillText('▼ see details below', pad.left, 16);
    }
    ctx.strokeStyle = colour; ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((val, i) => i === 0 ? ctx.moveTo(pointX(i), pointY(val)) : ctx.lineTo(pointX(i), pointY(val)));
    ctx.stroke();
    data.forEach((val, i) => {
      const isSel = selectedIdx === i;
      ctx.fillStyle = isSel ? '#fff' : colour;
      ctx.shadowColor = isSel ? colour : 'transparent'; ctx.shadowBlur = isSel ? 10 : 0;
      ctx.beginPath(); ctx.arc(pointX(i), pointY(val), isSel ? 6 : 3, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = isSel ? '#fff' : '#7a9bb5'; ctx.font = isSel ? 'bold 10px monospace' : '10px monospace';
      const lbl = labels[i];
      ctx.fillText(lbl, pointX(i) - ctx.measureText(lbl).width / 2, H - 8);
    });
  };
  draw();

  canvas.style.cursor = 'pointer';
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top)  * (H / rect.height);
    let clicked = null;
    data.forEach((val, i) => {
      const dx = mx - pointX(i); const dy = my - pointY(val);
      if (Math.sqrt(dx * dx + dy * dy) < 20) clicked = i;
    });
    if (clicked !== null) {
      const wasSelected = selectedIdx === clicked;
      selectedIdx = wasSelected ? null : clicked;
      draw();
      if (!wasSelected) openDrillPanel(id, clicked, labels[clicked]);
      else closeDrillById(id);
    } else {
      selectedIdx = null; draw();
    }
  });
}
