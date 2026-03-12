// Trends tab — week-on-week charts with click-to-pin tooltips

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
  }
};

let _pinnedTooltip = null;

function renderTrends(weeklyMetrics) {
  const weeks = weeklyMetrics.map(w => w.week);
  const escalationsData = weeklyMetrics.map(w => w.escalations || 0);
  const callsData = weeklyMetrics.map(w => w.calls || 0);
  const csatData = weeklyMetrics.map(w => w.csat_score || 0);
  const docsData = weeklyMetrics.map(w => w.docs_completed || 0);

  document.getElementById('trends-content').innerHTML = `
    <div id="chart-tooltip" class="chart-tooltip hidden"></div>
    <div class="chart-grid">
      <div class="chart-card">
        <div class="chart-title">${CHART_CONTEXT.escalations.title}</div>
        <canvas id="chart-esc" height="140"></canvas>
      </div>
      <div class="chart-card">
        <div class="chart-title">${CHART_CONTEXT.calls.title}</div>
        <canvas id="chart-calls" height="140"></canvas>
      </div>
      <div class="chart-card">
        <div class="chart-title">${CHART_CONTEXT.csat.title}</div>
        <canvas id="chart-csat" height="140"></canvas>
      </div>
      <div class="chart-card">
        <div class="chart-title">${CHART_CONTEXT.docs.title}</div>
        <canvas id="chart-docs" height="140"></canvas>
      </div>
    </div>
  `;

  document.getElementById('trends-content').addEventListener('click', (e) => {
    if (!e.target.closest('#chart-tooltip') && !e.target.closest('canvas')) {
      hideTooltip();
    }
  });

  drawBarChart('chart-esc',   weeks, escalationsData, '#1C8EF9', CHART_CONTEXT.escalations);
  drawBarChart('chart-calls', weeks, callsData,        '#36C5B0', CHART_CONTEXT.calls);
  drawLineChart('chart-csat', weeks, csatData,         '#F59E0B', 5, CHART_CONTEXT.csat);
  drawBarChart('chart-docs',  weeks, docsData,         '#8B5CF6', CHART_CONTEXT.docs);
}

function showTooltip(canvas, x, y, week, value, context) {
  const tooltip = document.getElementById('chart-tooltip');
  if (!tooltip) return;

  const rect = canvas.getBoundingClientRect();
  const trendsRect = document.getElementById('trends-content').getBoundingClientRect();

  const absX = rect.left - trendsRect.left + x;
  const absY = rect.top - trendsRect.top + y;

  tooltip.innerHTML = `
    <div class="tt-week">${week}</div>
    <div class="tt-value">${value}</div>
    <div class="tt-signal">${context.good(typeof value === 'string' ? parseFloat(value) : value)}</div>
    <div class="tt-divider"></div>
    <div class="tt-why">${context.why}</div>
    <div class="tt-dismiss">Click elsewhere to dismiss</div>
  `;
  tooltip.classList.remove('hidden');

  const tW = 240;
  const tH = tooltip.offsetHeight;
  let left = absX + 12;
  let top = absY - tH / 2;

  if (left + tW > trendsRect.width - 10) left = absX - tW - 12;
  if (top < 0) top = 4;

  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
  _pinnedTooltip = { week, value };
}

function hideTooltip() {
  const tooltip = document.getElementById('chart-tooltip');
  if (tooltip) tooltip.classList.add('hidden');
  _pinnedTooltip = null;
}

function drawBarChart(id, labels, data, colour, context) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 400;
  const H = canvas.height;
  canvas.width = W;
  const max = Math.max(...data, 1);
  const pad = { top: 10, right: 10, bottom: 30, left: 30 };
  const gap = (W - pad.left - pad.right) / labels.length;
  const barW = gap * 0.6;

  let selectedIdx = null;

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f1923';
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (H - pad.top - pad.bottom) * (1 - i / 4);
      ctx.strokeStyle = '#1e2d3d';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
      ctx.fillStyle = '#4a6278';
      ctx.font = '10px monospace';
      ctx.fillText(Math.round(max * i / 4), 2, y + 4);
    }

    data.forEach((val, i) => {
      const x = pad.left + i * gap + gap / 2 - barW / 2;
      const barH = Math.max(((H - pad.top - pad.bottom) * val) / max, val > 0 ? 2 : 0);
      const y = H - pad.bottom - barH;
      const isSelected = selectedIdx === i;
      ctx.fillStyle = isSelected ? colour : colour + 'cc';
      if (isSelected) { ctx.shadowColor = colour; ctx.shadowBlur = 8; }
      ctx.fillRect(x, y, barW, barH);
      ctx.shadowBlur = 0;
      ctx.fillStyle = isSelected ? '#fff' : '#7a9bb5';
      ctx.font = isSelected ? 'bold 10px monospace' : '10px monospace';
      ctx.fillText(labels[i], pad.left + i * gap + gap / 2 - 10, H - 8);
    });
  };

  draw();

  canvas.style.cursor = 'pointer';
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);

    let clicked = null;
    data.forEach((val, i) => {
      const cx = pad.left + i * gap + gap / 2;
      if (Math.abs(mx - cx) < gap / 2) clicked = i;
    });

    if (clicked !== null && selectedIdx === clicked) {
      selectedIdx = null;
      hideTooltip();
    } else if (clicked !== null) {
      selectedIdx = clicked;
      const barH = Math.max(((H - pad.top - pad.bottom) * data[clicked]) / max, 2);
      const tipY = H - pad.bottom - barH;
      const tipX = pad.left + clicked * gap + gap / 2;
      showTooltip(canvas, tipX, tipY, labels[clicked], data[clicked], context);
    } else {
      selectedIdx = null;
      hideTooltip();
    }
    draw();
  });
}

function drawLineChart(id, labels, data, colour, maxVal, context) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 400;
  const H = canvas.height;
  canvas.width = W;
  const pad = { top: 10, right: 10, bottom: 30, left: 30 };
  const gap = (W - pad.left - pad.right) / (labels.length - 1 || 1);

  let selectedIdx = null;

  const pointX = (i) => pad.left + i * gap;
  const pointY = (v) => pad.top + (H - pad.top - pad.bottom) * (1 - v / maxVal);

  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0f1923';
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i <= 5; i++) {
      const y = pad.top + (H - pad.top - pad.bottom) * (1 - i / 5);
      ctx.strokeStyle = '#1e2d3d';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
      ctx.fillStyle = '#4a6278';
      ctx.font = '10px monospace';
      ctx.fillText((maxVal * i / 5).toFixed(1), 2, y + 4);
    }

    ctx.strokeStyle = colour;
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((val, i) => {
      i === 0 ? ctx.moveTo(pointX(i), pointY(val)) : ctx.lineTo(pointX(i), pointY(val));
    });
    ctx.stroke();

    data.forEach((val, i) => {
      const isSelected = selectedIdx === i;
      ctx.fillStyle = isSelected ? '#fff' : colour;
      ctx.shadowColor = isSelected ? colour : 'transparent';
      ctx.shadowBlur = isSelected ? 10 : 0;
      ctx.beginPath();
      ctx.arc(pointX(i), pointY(val), isSelected ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = isSelected ? '#fff' : '#7a9bb5';
      ctx.font = isSelected ? 'bold 10px monospace' : '10px monospace';
      ctx.fillText(labels[i], pointX(i) - 10, H - 8);
    });
  };

  draw();

  canvas.style.cursor = 'pointer';
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);

    let clicked = null;
    data.forEach((val, i) => {
      const dx = mx - pointX(i);
      const dy = my - pointY(val);
      if (Math.sqrt(dx * dx + dy * dy) < 16) clicked = i;
    });

    if (clicked !== null && selectedIdx === clicked) {
      selectedIdx = null;
      hideTooltip();
    } else if (clicked !== null) {
      selectedIdx = clicked;
      const val = data[clicked];
      showTooltip(canvas, pointX(clicked), pointY(val), labels[clicked], val === 0 ? 'No data' : val.toFixed(1) + '/5', context);
    } else {
      selectedIdx = null;
      hideTooltip();
    }
    draw();
  });
}
