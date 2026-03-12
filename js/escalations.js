// Escalations tab

function getKnownOrgs() {
  const orgs = window._escalations.map(e => e.org).filter(Boolean);
  return [...new Set(orgs)].sort();
}

function renderEscalations(escalations) {
  const total = escalations.length;
  const resolved = escalations.filter(e => e.outcome === 'Resolved by SE').length;
  const escalatedEng = escalations.filter(e => e.outcome === 'Escalated to Engineering').length;

  document.getElementById('escalations-content').innerHTML = `
    <div class="toolbar">
      <div class="kpi-row">
        <div class="kpi-small"><span class="kpi-num">${total}</span> Total</div>
        <div class="kpi-small"><span class="kpi-num green">${resolved}</span> Resolved by SE</div>
        <div class="kpi-small"><span class="kpi-num amber">${escalatedEng}</span> To Engineering</div>
      </div>
      <button class="btn-primary" onclick="showAddEscModal()">+ Log Escalation</button>
    </div>
    <table class="data-table">
      <thead><tr>
        <th>Date</th><th>Org</th><th>Type</th><th>Outcome</th><th>Days</th><th>Notes</th><th></th>
      </tr></thead>
      <tbody>
        ${escalations.length === 0
          ? '<tr><td colspan="7" class="empty-cell">No escalations logged yet.</td></tr>'
          : escalations.map(e => `
            <tr>
              <td>${e.date || '—'}</td>
              <td>${e.org}</td>
              <td><span class="tag">${e.type}</span></td>
              <td><span class="outcome ${e.outcome.toLowerCase().replace(/ /g,'-')}">${e.outcome}</span></td>
              <td>${e.days_to_resolve ?? '—'}</td>
              <td class="notes-cell">${e.notes || '—'}</td>
              <td><button class="icon-btn" onclick="removeEscalation('${e.id}')">🗑</button></td>
            </tr>`).join('')}
      </tbody>
    </table>
    <div id="esc-modal" class="modal hidden">
      <div class="modal-box">
        <h3>Log Escalation</h3>
        <div class="autocomplete-wrap">
          <input id="esc-org" placeholder="Organisation" class="input-field" autocomplete="off" oninput="filterOrgSuggestions()" onkeydown="orgKeydown(event)" />
          <div id="org-suggestions" class="autocomplete-list hidden"></div>
        </div>
        <input id="esc-date" placeholder="Date (e.g. 2026-03-16)" class="input-field" />
        <select id="esc-type" class="input-field" onchange="toggleOtherField()">
          ${ESCALATION_TYPES.map(t => `<option>${t}</option>`).join('')}
        </select>
        <input id="esc-other-desc" placeholder="Describe the issue type…" class="input-field hidden" />
        <select id="esc-outcome" class="input-field">
          ${ESCALATION_OUTCOMES.map(o => `<option>${o}</option>`).join('')}
        </select>
        <input id="esc-days" placeholder="Days to resolve" type="number" class="input-field" />
        <textarea id="esc-notes" placeholder="Notes" class="input-field" rows="3"></textarea>
        <div class="modal-actions">
          <button class="btn-secondary" onclick="closeEscModal()">Cancel</button>
          <button class="btn-primary" onclick="saveEscalation()">Save</button>
        </div>
      </div>
    </div>
  `;
}

function filterOrgSuggestions() {
  const input = document.getElementById('esc-org');
  const list = document.getElementById('org-suggestions');
  const val = input.value.trim().toLowerCase();
  const orgs = getKnownOrgs();

  if (!val) { list.classList.add('hidden'); return; }

  const matches = orgs.filter(o => o.toLowerCase().includes(val));
  if (matches.length === 0) { list.classList.add('hidden'); return; }

  list.innerHTML = matches.map((o, i) =>
    `<div class="autocomplete-item" data-idx="${i}" onclick="selectOrg('${o.replace(/'/g, "\\'")}')">${o}</div>`
  ).join('');
  list.classList.remove('hidden');
}

function selectOrg(org) {
  document.getElementById('esc-org').value = org;
  document.getElementById('org-suggestions').classList.add('hidden');
}

function orgKeydown(e) {
  const list = document.getElementById('org-suggestions');
  const items = list.querySelectorAll('.autocomplete-item');
  const active = list.querySelector('.autocomplete-item.active');

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (!active) items[0]?.classList.add('active');
    else { active.classList.remove('active'); (active.nextElementSibling || items[0]).classList.add('active'); }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (!active) items[items.length - 1]?.classList.add('active');
    else { active.classList.remove('active'); (active.previousElementSibling || items[items.length - 1]).classList.add('active'); }
  } else if (e.key === 'Enter') {
    const activeItem = list.querySelector('.autocomplete-item.active');
    if (activeItem) { e.preventDefault(); selectOrg(activeItem.textContent); }
  } else if (e.key === 'Escape') {
    list.classList.add('hidden');
  }
}

function toggleOtherField() {
  const type = document.getElementById('esc-type').value;
  const field = document.getElementById('esc-other-desc');
  if (type === 'Other') {
    field.classList.remove('hidden');
    field.focus();
  } else {
    field.classList.add('hidden');
    field.value = '';
  }
}

function showAddEscModal() {
  ['esc-org', 'esc-date', 'esc-days', 'esc-notes', 'esc-other-desc'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('esc-other-desc').classList.add('hidden');
  document.getElementById('org-suggestions')?.classList.add('hidden');
  document.getElementById('esc-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('esc-org').focus(), 50);
}

function closeEscModal() {
  document.getElementById('esc-modal').classList.add('hidden');
  document.getElementById('org-suggestions')?.classList.add('hidden');
  document.getElementById('esc-other-desc').classList.add('hidden');
}

async function saveEscalation() {
  const rawType = document.getElementById('esc-type').value;
  const otherDesc = document.getElementById('esc-other-desc').value.trim();
  const type = rawType === 'Other' && otherDesc ? `Other: ${otherDesc}` : rawType;

  const data = {
    org: document.getElementById('esc-org').value.trim(),
    date: document.getElementById('esc-date').value.trim(),
    type,
    outcome: document.getElementById('esc-outcome').value,
    days_to_resolve: parseInt(document.getElementById('esc-days').value) || null,
    notes: document.getElementById('esc-notes').value.trim()
  };
  if (!data.org) { showToast('Organisation is required', 'error'); return; }
  showToast('Saving…', 'info');
  try {
    await addEscalation(data);
    closeEscModal();
    await reloadAll();
    showToast('Escalation logged!', 'success');
  } catch (e) {
    showToast('Save failed', 'error');
  }
}

async function removeEscalation(id) {
  if (!confirm('Delete this escalation?')) return;
  try {
    await deleteEscalation(id);
    await reloadAll();
    showToast('Deleted', 'success');
  } catch (e) {
    showToast('Delete failed', 'error');
  }
}
