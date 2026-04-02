// SE Escalations tab — inbound org-level issues routed to the SE

let _seEscView = 'active';
let _viewingSeEsc = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function localSeDate() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function priorityClass(p) {
  if (p === 'Urgent') return 'priority-urgent';
  if (p === 'High')   return 'priority-high';
  return 'priority-normal';
}

function stageClass(s) {
  if (s === 'Blocked')  return 'stage-blocked';
  if (s === 'Pending')  return 'stage-pending';
  if (s === 'Resolved') return 'stage-resolved';
  return 'stage-open';
}

function formatMrr(val) {
  if (!val && val !== 0) return '—';
  return '$' + Number(val).toLocaleString();
}

// ── Shared modal HTML ─────────────────────────────────────────────────────────

function seEscModalHtml(esc) {
  const e = esc || {};
  return `
    <div id="se-esc-modal" class="modal hidden">
      <div class="modal-box">
        <h3 id="se-esc-modal-title">${esc ? 'Edit SE Escalation' : 'Log SE Escalation'}</h3>
        <input id="se-esc-editing-id" type="hidden" value="${e.id || ''}" />

        <label class="field-label">Org name</label>
        <input id="se-esc-org" placeholder="e.g. Alutal" class="input-field" value="${e.org || ''}" />

        <label class="field-label">Date logged</label>
        <input id="se-esc-date" type="date" class="input-field" value="${e.date || localSeDate()}" />

        <label class="field-label">Priority</label>
        <select id="se-esc-priority" class="input-field">
          ${SE_ESC_PRIORITIES.map(p => `<option ${e.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>

        <label class="field-label">Stage</label>
        <select id="se-esc-stage" class="input-field">
          ${SE_ESC_STAGES.map(s => `<option ${e.stage === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>

        <label class="field-label">MRR <span class="field-hint">(optional)</span></label>
        <input id="se-esc-mrr" type="number" placeholder="e.g. 750" class="input-field" value="${e.mrr ?? ''}" />

        <label class="field-label">HubSpot ticket URL <span class="field-hint">(optional)</span></label>
        <input id="se-esc-hubspot" placeholder="https://app.hubspot.com/..." class="input-field" value="${e.hubspot_url || ''}" />

        <label class="field-label">Slack thread URL <span class="field-hint">(optional)</span></label>
        <input id="se-esc-slack" placeholder="https://hubstaff.slack.com/..." class="input-field" value="${e.slack_url || ''}" />

        <label class="field-label">Notes</label>
        <textarea id="se-esc-notes" placeholder="Brief summary of the issue and current status…" class="input-field" rows="4">${e.notes || ''}</textarea>

        <div class="modal-actions">
          <button class="btn-secondary" onclick="closeSeEscModal()">Cancel</button>
          <button class="btn-primary" onclick="saveSeEscalation()">Save</button>
        </div>
      </div>
    </div>`;
}

// ── Main render ───────────────────────────────────────────────────────────────

function renderSeEscalations(escalations) {
  if (_viewingSeEsc) {
    const esc = escalations.find(e => e.id === _viewingSeEsc);
    if (esc) { renderSeEscDetail(esc); return; }
    _viewingSeEsc = null;
  }

  const active   = escalations.filter(e => e.stage !== 'Resolved');
  const resolved = escalations.filter(e => e.stage === 'Resolved');
  const display  = _seEscView === 'active' ? active : resolved;

  const urgentCount  = active.filter(e => e.priority === 'Urgent').length;
  const highCount    = active.filter(e => e.priority === 'High').length;
  const blockedCount = active.filter(e => e.stage === 'Blocked').length;

  document.getElementById('se-escalations-content').innerHTML = `
    <div class="toolbar">
      <div class="kpi-row">
        <div class="kpi-small"><span class="kpi-num">${active.length}</span> Active</div>
        <div class="kpi-small"><span class="kpi-num priority-urgent">${urgentCount}</span> Urgent</div>
        <div class="kpi-small"><span class="kpi-num priority-high">${highCount}</span> High</div>
        <div class="kpi-small"><span class="kpi-num stage-blocked">${blockedCount}</span> Blocked</div>
      </div>
      <button class="btn-primary" onclick="showAddSeEscModal()">+ Log Escalation</button>
    </div>

    <div class="view-toggle">
      <button class="toggle-btn ${_seEscView === 'active' ? 'active' : ''}"
        onclick="setSeEscView('active')">Active (${active.length})</button>
      <button class="toggle-btn ${_seEscView === 'resolved' ? 'active' : ''}"
        onclick="setSeEscView('resolved')">Resolved (${resolved.length})</button>
    </div>

    <table class="data-table">
      <thead><tr>
        <th>Date</th><th>Org</th><th>Priority</th><th>Stage</th><th>MRR</th><th>Notes</th><th></th>
      </tr></thead>
      <tbody>
        ${display.length === 0
          ? `<tr><td colspan="7" class="empty-cell">No ${_seEscView === 'active' ? 'active' : 'resolved'} escalations.</td></tr>`
          : display.map(e => `
            <tr class="clickable-row" onclick="openSeEscDetail('${e.id}')">
              <td>${e.date || '—'}</td>
              <td><strong>${e.org}</strong></td>
              <td><span class="priority-badge ${priorityClass(e.priority)}">${e.priority}</span></td>
              <td><span class="stage-badge ${stageClass(e.stage)}">${e.stage}</span></td>
              <td>${formatMrr(e.mrr)}</td>
              <td class="notes-cell">${e.notes || '—'}</td>
              <td><button class="icon-btn" onclick="event.stopPropagation();removeSeEscalation('${e.id}')">🗑</button></td>
            </tr>`).join('')}
      </tbody>
    </table>

    ${seEscModalHtml(null)}
  `;

  document.getElementById('se-esc-modal').addEventListener('click', function(e) {
    if (e.target === this) closeSeEscModal();
  });
}

// ── View toggle ───────────────────────────────────────────────────────────────

function setSeEscView(view) {
  _seEscView = view;
  renderSeEscalations(window._seEscalations);
}

// ── Add modal ─────────────────────────────────────────────────────────────────

function showAddSeEscModal() {
  // Re-render with blank modal
  const container = document.getElementById('se-escalations-content');
  const existing = document.getElementById('se-esc-modal');
  if (existing) existing.remove();
  container.insertAdjacentHTML('beforeend', seEscModalHtml(null));
  document.getElementById('se-esc-modal').addEventListener('click', function(e) {
    if (e.target === this) closeSeEscModal();
  });
  document.getElementById('se-esc-modal').classList.remove('hidden');
  // Set defaults
  document.getElementById('se-esc-priority').value = 'High';
  document.getElementById('se-esc-stage').value = 'Open';
}

function closeSeEscModal() {
  const m = document.getElementById('se-esc-modal');
  if (m) m.classList.add('hidden');
}

async function saveSeEscalation() {
  const editingId = document.getElementById('se-esc-editing-id').value;
  const org = document.getElementById('se-esc-org').value.trim();
  if (!org) { showToast('Org name is required', 'error'); return; }

  const data = {
    org,
    date:        document.getElementById('se-esc-date').value,
    priority:    document.getElementById('se-esc-priority').value,
    stage:       document.getElementById('se-esc-stage').value,
    mrr:         document.getElementById('se-esc-mrr').value ? parseFloat(document.getElementById('se-esc-mrr').value) : null,
    hubspot_url: document.getElementById('se-esc-hubspot').value.trim() || null,
    slack_url:   document.getElementById('se-esc-slack').value.trim() || null,
    notes:       document.getElementById('se-esc-notes').value.trim() || null,
  };

  try {
    if (editingId) {
      await updateSeEscalation(editingId, data);
      showToast('Escalation updated', 'success');
      closeSeEscModal();
      await reloadAll();
      _viewingSeEsc = editingId;
    } else {
      await addSeEscalation(data);
      showToast('Escalation logged', 'success');
      closeSeEscModal();
      await reloadAll();
    }
  } catch(e) {
    showToast('Save failed: ' + e.message, 'error');
  }
}

async function removeSeEscalation(id) {
  if (!confirm('Delete this escalation? This cannot be undone.')) return;
  try {
    await deleteSeEscalation(id);
    if (_viewingSeEsc === id) _viewingSeEsc = null;
    showToast('Escalation deleted', 'success');
    await reloadAll();
  } catch(e) {
    showToast('Delete failed: ' + e.message, 'error');
  }
}

// ── Detail view ───────────────────────────────────────────────────────────────

function openSeEscDetail(id) {
  _viewingSeEsc = id;
  renderSeEscalations(window._seEscalations);
}

function renderSeEscDetail(esc) {
  const isResolved = esc.stage === 'Resolved';
  const otherStages = SE_ESC_STAGES.filter(s => s !== esc.stage);
  const timeline = Array.isArray(esc.timeline) ? esc.timeline : [];

  document.getElementById('se-escalations-content').innerHTML = `
    <div class="detail-header">
      <button class="btn-back" onclick="backToSeEscList()">← Back to SE escalations</button>
      <div class="detail-header-actions">
        <button class="btn-secondary" onclick="showEditSeEscModal('${esc.id}')">Edit</button>
        <button class="btn-danger" onclick="removeSeEscalation('${esc.id}')">Delete</button>
      </div>
    </div>

    <div class="detail-main">
      <div class="detail-title-row">
        <h2 class="detail-title">${esc.org}</h2>
        <span class="priority-badge ${priorityClass(esc.priority)}">${esc.priority}</span>
        <span class="stage-badge ${stageClass(esc.stage)}">${esc.stage}</span>
      </div>

      <div class="detail-meta-grid">
        <div class="meta-item">
          <span class="meta-label">Date logged</span>
          <span>${esc.date || '—'}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">MRR</span>
          <span>${formatMrr(esc.mrr)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">HubSpot ticket</span>
          ${esc.hubspot_url
            ? `<a href="${esc.hubspot_url}" target="_blank" class="detail-link">Open ticket ↗</a>`
            : '<span class="muted">—</span>'}
        </div>
        <div class="meta-item">
          <span class="meta-label">Slack thread</span>
          ${esc.slack_url
            ? `<a href="${esc.slack_url}" target="_blank" class="detail-link">Open thread ↗</a>`
            : '<span class="muted">—</span>'}
        </div>
      </div>

      ${esc.notes ? `
        <div class="detail-notes">
          <div class="detail-notes-label">Notes</div>
          <p>${esc.notes}</p>
        </div>` : ''}

      <div class="stage-actions">
        <div class="stage-actions-label">Move to stage</div>
        <div class="stage-action-btns">
          ${otherStages.map(s => `
            <button class="stage-move-btn ${stageClass(s)}" onclick="moveSeEscStage('${esc.id}', '${s}', '')">
              ${s}
            </button>`).join('')}
        </div>
      </div>

      ${isResolved ? `
        <div class="resolved-banner">
          ✅ This escalation is resolved. Move it back to <strong>Open</strong> above if it resurfaces.
        </div>` : ''}

      <div class="timeline-section">
        <div class="timeline-header">
          <h3>Stage History &amp; Notes</h3>
          <button class="btn-secondary btn-sm" onclick="showSeEscTimelineModal('${esc.id}')">+ Add note</button>
        </div>
        <div id="se-timeline-list">
          ${timeline.length === 0
            ? '<p class="empty-msg">No notes yet. Add one each time the stage changes or something significant happens.</p>'
            : [...timeline].reverse().map((entry, i) => `
              <div class="timeline-entry">
                <div class="timeline-entry-header">
                  <span class="timeline-date">${entry.date || '—'}</span>
                  ${entry.stage_change ? `<span class="stage-badge ${stageClass(entry.stage_change)}">${entry.stage_change}</span>` : ''}
                  <button class="icon-btn" style="margin-left:auto" onclick="deleteSeEscTimelineEntry('${esc.id}', ${timeline.length - 1 - i})">🗑</button>
                </div>
                <p class="timeline-note">${entry.note}</p>
              </div>`).join('')}
        </div>
      </div>
    </div>

    <div id="se-timeline-modal" class="modal hidden">
      <div class="modal-box">
        <h3>Add Note</h3>
        <label class="field-label">Date</label>
        <input id="se-tl-date" type="date" class="input-field" value="${localSeDate()}" />
        <label class="field-label">Note</label>
        <textarea id="se-tl-note" placeholder="What happened? Why is the stage changing? What's blocking progress?" class="input-field" rows="4"></textarea>
        <label class="field-label">Record a stage change <span class="field-hint">(optional)</span></label>
        <select id="se-tl-stage" class="input-field">
          <option value="">— No stage change —</option>
          ${SE_ESC_STAGES.map(s => `<option>${s}</option>`).join('')}
        </select>
        <div class="modal-actions">
          <button class="btn-secondary" onclick="closeSeEscTimelineModal()">Cancel</button>
          <button class="btn-primary" onclick="saveSeEscTimelineEntry('${esc.id}')">Add Note</button>
        </div>
      </div>
    </div>

    ${seEscModalHtml(esc)}
  `;

  document.getElementById('se-timeline-modal').addEventListener('click', function(e) {
    if (e.target === this) closeSeEscTimelineModal();
  });
  document.getElementById('se-esc-modal').addEventListener('click', function(e) {
    if (e.target === this) closeSeEscModal();
  });
}

function backToSeEscList() {
  _viewingSeEsc = null;
  renderSeEscalations(window._seEscalations);
}

function showEditSeEscModal(idOrEsc) {
  const esc = typeof idOrEsc === 'string'
    ? window._seEscalations.find(e => e.id === idOrEsc)
    : idOrEsc;
  if (!esc) return;
  // Remove existing modal and re-render with data pre-filled
  const existing = document.getElementById('se-esc-modal');
  if (existing) existing.remove();
  document.getElementById('se-escalations-content').insertAdjacentHTML('beforeend', seEscModalHtml(esc));
  document.getElementById('se-esc-modal').addEventListener('click', function(e) {
    if (e.target === this) closeSeEscModal();
  });
  document.getElementById('se-esc-modal').classList.remove('hidden');
}

async function moveSeEscStage(id, newStage, note) {
  try {
    const esc = window._seEscalations.find(e => e.id === id);
    const updates = { stage: newStage };
    // Auto-log the stage change in timeline
    if (esc) {
      const entry = { date: localSeDate(), note: note || `Moved to ${newStage}`, stage_change: newStage };
      updates.timeline = Array.isArray(esc.timeline) ? [...esc.timeline, entry] : [entry];
    }
    await updateSeEscalation(id, updates);
    showToast(`Moved to ${newStage}`, 'success');
    await reloadAll();
    _seEscView = newStage === 'Resolved' ? 'resolved' : 'active';
    _viewingSeEsc = id;
    renderSeEscalations(window._seEscalations);
  } catch(e) {
    showToast('Failed to update stage: ' + e.message, 'error');
  }
}

// ── Timeline ──────────────────────────────────────────────────────────────────

function showSeEscTimelineModal(escId) {
  document.getElementById('se-tl-date').value = localSeDate();
  document.getElementById('se-tl-note').value = '';
  document.getElementById('se-tl-stage').value = '';
  document.getElementById('se-timeline-modal').classList.remove('hidden');
}

function closeSeEscTimelineModal() {
  const m = document.getElementById('se-timeline-modal');
  if (m) m.classList.add('hidden');
}

async function saveSeEscTimelineEntry(escId) {
  const note = document.getElementById('se-tl-note').value.trim();
  if (!note) { showToast('Please add a note', 'error'); return; }

  const esc = window._seEscalations.find(e => e.id === escId);
  if (!esc) return;

  const stageChange = document.getElementById('se-tl-stage').value || null;
  const entry = { date: document.getElementById('se-tl-date').value, note, stage_change: stageChange };
  const timeline = Array.isArray(esc.timeline) ? [...esc.timeline, entry] : [entry];
  const updates = { timeline };
  if (stageChange) {
    updates.stage = stageChange;
    _seEscView = stageChange === 'Resolved' ? 'resolved' : 'active';
  }

  try {
    await updateSeEscalation(escId, updates);
    closeSeEscTimelineModal();
    showToast('Note added', 'success');
    await reloadAll();
    _viewingSeEsc = escId;
    renderSeEscalations(window._seEscalations);
  } catch(e) {
    showToast('Failed: ' + e.message, 'error');
  }
}

async function deleteSeEscTimelineEntry(escId, index) {
  if (!confirm('Delete this note?')) return;
  const esc = window._seEscalations.find(e => e.id === escId);
  if (!esc) return;
  const timeline = [...(esc.timeline || [])];
  timeline.splice(index, 1);
  try {
    await updateSeEscalation(escId, { timeline });
    showToast('Note deleted', 'success');
    await reloadAll();
    _viewingSeEsc = escId;
    renderSeEscalations(window._seEscalations);
  } catch(e) {
    showToast('Failed: ' + e.message, 'error');
  }
}
