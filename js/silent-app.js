// Silent App Implementations Tab

// Simple markdown → HTML for activity notes
function formatNote(text) {
  if (!text) return '';
  // Escape HTML first
  var s = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // **bold**
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // *italic*
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Newlines → <br>
  s = s.replace(/\n/g, '<br>');
  return s;
}

// Returns today's date as YYYY-MM-DD in LOCAL timezone (not UTC)
function localDateStr() {
  var d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

const DEFAULT_CHECKLISTS = {
  'Pre-Deployment': [
    { id: 'pd1',  text: 'Confirm Silent App plan is active (Enterprise or Team + add-on)' },
    { id: 'pd2',  text: 'Confirm OS(es) in scope (Windows / macOS / Linux)' },
    { id: 'pd3',  text: 'Confirm deployment method (MDM / Individual / Script)' },
    { id: 'pd4',  text: 'Confirm MDM tool if applicable (Intune, Jamf, etc.)' },
    { id: 'pd5',  text: 'Confirm number of devices in scope' },
    { id: 'pd6',  text: 'Create automatic tracking policy in Hubstaff' },
    { id: 'pd7',  text: '"Automatically add new members to this policy" toggled ON' },
    { id: 'pd8',  text: 'Set as default auto-add policy for the organisation' },
    { id: 'pd9',  text: 'Distribute .mobileconfig to devices (macOS only — required for all macOS deployments)' },
    { id: 'pd10', text: 'Confirm customer has admin access to their MDM tool' },
    { id: 'pd11', text: 'Agree on pilot group (1-2 machines) before full rollout' },
  ],
  'Deployment': [
    { id: 'dp1', text: 'Download correct installer for OS (.pkg / .msi / .sh)' },
    { id: 'dp1b', text: 'macOS/Linux: do NOT rename the installer — wrap it if a custom name is needed for MDM' },
    { id: 'dp2', text: 'Deploy to pilot group (1-2 machines)' },
    { id: 'dp3', text: 'Confirm members auto-provisioned in Hubstaff after pilot' },
    { id: 'dp4', text: 'Expand to larger pilot group (3-4 machines)' },
    { id: 'dp5', text: 'Full rollout to all target devices' },
    { id: 'dp6', text: 'Merge any duplicate members if needed' },
  ],
  'Validation': [
    { id: 'vl1', text: 'Time tracking data appearing in dashboard (within 10-15 mins)' },
    { id: 'vl2', text: 'Correct members created (names and OS usernames match)' },
    { id: 'vl3', text: 'Automatic tracking policy applying correctly to new members' },
    { id: 'vl4', text: 'Screenshots / app / URL tracking working (if permissions granted)' },
    { id: 'vl5', text: 'All devices visible on the Computers page in Hubstaff' },
    { id: 'vl6', text: 'Force restart on any devices not reporting (sign out/in or reboot)' },
  ],
  'Stability': [
    { id: 'st1', text: 'Customer confirmed all devices reporting consistently' },
    { id: 'st2', text: 'No duplicate member issues outstanding' },
    { id: 'st3b', text: 'SCIM/UPN matching confirmed if SCIM is active (Windows only — macOS/Linux support planned)' },
    { id: 'st4', text: 'Implementation notes documented and closed' },
  ]
};

let _viewMode = 'kanban';
let _viewingImpl = null;
let _showArchived = false;
let _returnToEscalation = null; // { id, tab } — set when navigating from an escalation to a deployment

// ── Main render ───────────────────────────────────────────────────────────────

function renderSilentApp(implementations) {
  if (_viewingImpl) {
    const impl = implementations.find(i => i.id === _viewingImpl);
    if (impl) { renderImplDetail(impl, implementations); return; }
    _viewingImpl = null;
  }

  const archived = implementations.filter(i => i.stage === 'Archived');
  const active   = implementations.filter(i => i.stage !== 'Archived');
  const display  = _showArchived ? archived : active;
  const total    = active.length;
  const byStage  = {};
  STAGES.forEach(s => byStage[s] = active.filter(i => i.stage === s));
  const stable   = byStage['Stability'] ? byStage['Stability'].length : 0;
  const atRisk   = active.filter(i => i.rag === 'Red').length;
  const amber    = active.filter(i => i.rag === 'Amber').length;

  // Needs Attention banner — stale + Red + urgent SE escalations
  var staleImpls = active.filter(function(i) {
    if (i.stage === 'Stability') return false;
    var act = Array.isArray(i.activity) ? i.activity : [];
    var lastDate = act.length > 0 ? new Date(act[act.length - 1].date) : (i.created_date ? new Date(i.created_date) : null);
    return lastDate && Math.floor((new Date() - lastDate) / (1000*60*60*24)) >= 14;
  });
  var urgentSeEscs = (window._seEscalations || []).filter(function(e) {
    return e.priority === 'Urgent' && e.stage !== 'Resolved' && e.stage !== 'Escalated';
  });
  var attentionItems = [];
  if (atRisk > 0) attentionItems.push('<span class="att-red">' + atRisk + ' Red</span>');
  if (staleImpls.length > 0) attentionItems.push('<span class="att-amber">' + staleImpls.length + ' stale (14d+ no activity)</span>');
  if (urgentSeEscs.length > 0) attentionItems.push('<span class="att-red">' + urgentSeEscs.length + ' urgent SE escalation' + (urgentSeEscs.length > 1 ? 's' : '') + '</span>');
  var attentionBanner = attentionItems.length > 0
    ? '<div class="attention-banner">' +
        '<span class="attention-label">NEEDS ATTENTION</span>' +
        attentionItems.join('<span class="att-sep">&middot;</span>') +
      '</div>'
    : '';

  document.getElementById('silent-app-content').innerHTML =
    '<div class="sa-header">' +
      '<div class="sa-stats">' +
        '<div class="sa-stat"><span class="sa-stat-num">' + total  + '</span><span class="sa-stat-label">Total</span></div>' +
        '<div class="sa-stat"><span class="sa-stat-num">' + stable + '</span><span class="sa-stat-label">Stable</span></div>' +
        '<div class="sa-stat amber"><span class="sa-stat-num">' + amber  + '</span><span class="sa-stat-label">Amber</span></div>' +
        '<div class="sa-stat red"><span class="sa-stat-num">'   + atRisk + '</span><span class="sa-stat-label">At Risk</span></div>' +
      '</div>' +
      '<div class="sa-toolbar">' +
        '<div class="view-toggle">' +
          '<button class="view-btn ' + (!_showArchived && _viewMode==='kanban'?'active':'') + '" onclick="setShowArchived(false);setViewMode(\'kanban\')">&#9646; Kanban</button>' +
          '<button class="view-btn ' + (!_showArchived && _viewMode==='table' ?'active':'') + '" onclick="setShowArchived(false);setViewMode(\'table\')">&#9776; Table</button>' +
          '<button class="view-btn ' + (_showArchived?'active':'') + '" onclick="_showArchived?setShowArchived(false):setShowArchived(true)">&#128452; Archived (' + archived.length + ')</button>' +
        '</div>' +
        '<button class="btn-primary" onclick="showAddImplModal()" style="' + (_showArchived ? 'visibility:hidden' : '') + '">+ Add Implementation</button>' +
      '</div>' +
    '</div>' +
    (!_showArchived ? attentionBanner : '') +
    (_showArchived
      ? (archived.length === 0
          ? '<div class="empty-state">No archived implementations.</div>'
          : renderTable(archived))
      : (active.length === 0
          ? '<div class="empty-state">No implementations tracked yet. Add your first one above.</div>'
          : _viewMode === 'kanban' ? renderKanban(byStage) : renderTable(active))) +
    renderImplModal(null);
}

// ── Modal HTML ────────────────────────────────────────────────────────────────

function renderUnarchiveModal() {
  var opts = STAGES.map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join('');
  return '<div id="unarchive-modal" class="modal hidden">' +
    '<div class="modal-box">' +
      '<h3>Restore Implementation</h3>' +
      '<p style="margin:0 0 12px;color:var(--muted);font-size:13px">Where should this go back to, and why?</p>' +
      '<select id="unarchive-stage" class="input-field" style="margin-bottom:10px">' + opts + '</select>' +
      '<textarea id="unarchive-note" placeholder="Reason for restoring (required)" class="input-field" rows="3" style="margin-bottom:12px"></textarea>' +
      '<div class="modal-actions">' +
        '<button class="btn-secondary" onclick="closeUnarchiveModal()">Cancel</button>' +
        '<button class="btn-primary" onclick="confirmUnarchive()">Restore</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function renderImplModal(impl) {
  const os = impl && Array.isArray(impl.os) ? impl.os : [];
  return '<div id="impl-modal" class="modal hidden">' +
    '<div class="modal-box modal-wide">' +
      '<h3 id="impl-modal-title">' + (impl ? 'Edit' : 'Add') + ' Implementation</h3>' +
      '<div class="modal-grid">' +
        '<input id="impl-org" placeholder="Organisation name" class="input-field" style="grid-column:1/-1" value="' + (impl ? impl.org || '' : '') + '" />' +
        '<input id="impl-contact-name" placeholder="Contact name" class="input-field" value="' + (impl ? impl.contact_name || '' : '') + '" />' +
        '<input id="impl-contact-email" placeholder="Contact email" class="input-field" value="' + (impl ? impl.contact_email || '' : '') + '" />' +
        '<input id="impl-org-size" placeholder="Number of devices" type="number" class="input-field" value="' + (impl ? impl.org_size || '' : '') + '" />' +
        '<input id="impl-mdm" placeholder="MDM tool (e.g. Intune, Jamf, GPO, None)" class="input-field" value="' + (impl ? impl.mdm_type || '' : '') + '" />' +
        '<select id="impl-plan" class="input-field">' +
          '<option value="">Plan tier...</option>' +
          ['Enterprise', 'Teams + Silent App add-on', 'Starter'].map(function(p) {
            return '<option value="' + p + '"' + (impl && impl.plan === p ? ' selected' : '') + '>' + p + '</option>';
          }).join('') +
        '</select>' +
        '<input id="impl-app-version" placeholder="App version (e.g. 1.7.10)" class="input-field" value="' + (impl ? impl.app_version || '' : '') + '" />' +
        '<label class="os-check" style="margin-top:8px">' +
          '<input type="checkbox" id="impl-large-deployment" ' + (impl && impl.large_deployment ? 'checked' : '') + ' />' +
          ' 50+ users — involve Lucas Mocellin' +
        '</label>' +
        '<div style="grid-column:1/-1"><label class="field-label">Operating Systems</label>' +
          '<div class="os-checkboxes">' +
            ['Windows','macOS','Linux'].map(function(o) {
              return '<label class="os-check"><input type="checkbox" class="impl-os-cb" value="' + o + '" ' + (os.includes(o)?'checked':'') + '/> ' + o + '</label>';
            }).join('') +
          '</div></div>' +
        '<select id="impl-deploy-method" class="input-field">' +
          '<option value="">Deployment method...</option>' +
          ['Individual Install','MDM / Group Deploy','Script / Terminal','Mixed'].map(function(m) {
            return '<option' + (impl && impl.deployment_method===m?' selected':'') + '>' + m + '</option>';
          }).join('') +
        '</select>' +
        '<select id="impl-stage" class="input-field">' +
          STAGES.map(function(s) { return '<option' + (impl && impl.stage===s?' selected':'') + '>' + s + '</option>'; }).join('') +
        '</select>' +
        '<select id="impl-rag" class="input-field">' +
          '<option value="Green"' + (impl && impl.rag==='Green'?' selected':'') + '>Green - On Track</option>' +
          '<option value="Amber"' + (impl && impl.rag==='Amber'?' selected':'') + '>Amber - Needs Attention</option>' +
          '<option value="Red"'   + (impl && impl.rag==='Red'  ?' selected':'') + '>Red - At Risk</option>' +
        '</select>' +
        '<input id="impl-hubspot-url" placeholder="HubSpot URL (optional)" class="input-field" value="' + (impl ? impl.hubspot_url || '' : '') + '" />' +
        '<input id="impl-slack-url" placeholder="Slack URL (optional)" class="input-field" value="' + (impl ? impl.slack_url || '' : '') + '" />' +
        '<textarea id="impl-notes" placeholder="Notes" class="input-field" rows="3" style="grid-column:1/-1">' + (impl ? impl.notes || '' : '') + '</textarea>' +
      '</div>' +
      '<input type="hidden" id="impl-edit-id" value="' + (impl ? impl.id : '') + '" />' +
      '<div class="modal-actions">' +
        '<button class="btn-secondary" onclick="closeImplModal()">Cancel</button>' +
        '<button class="btn-primary" onclick="saveImpl()">Save</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

// ── Kanban ────────────────────────────────────────────────────────────────────

function renderKanban(byStage) {
  return '<div class="kanban-board">' +
    STAGES.map(function(stage) {
      var cards = byStage[stage] || [];
      return '<div class="kanban-col" data-stage="' + stage + '"' +
        ' ondragover="kanbanDragOver(event)" ondrop="kanbanDrop(event,\'' + stage + '\')" ondragleave="kanbanDragLeave(event)">' +
        '<div class="kanban-col-header">' +
          '<span class="kanban-col-title">' + stage + '</span>' +
          '<span class="kanban-col-count">' + cards.length + '</span>' +
        '</div>' +
        '<div class="kanban-cards">' +
          (cards.length === 0
            ? '<div class="kanban-empty kanban-drop-hint">None</div>'
            : cards.map(renderKanbanCard).join('')) +
        '</div>' +
      '</div>';
    }).join('') +
  '</div>';
}

function renderKanbanCard(impl) {
  var checklist  = impl.checklist || {};
  var stageItems = DEFAULT_CHECKLISTS[impl.stage] || [];
  var completed  = stageItems.filter(function(item) { return checklist[item.id]; }).length;
  var total      = stageItems.length;
  var pct        = total > 0 ? Math.round((completed / total) * 100) : 0;
  var ragColour  = { Green: 'var(--green)', Amber: 'var(--amber)', Red: 'var(--red)' }[impl.rag] || 'var(--muted)';
  var os         = Array.isArray(impl.os) ? impl.os.join(', ') : (impl.os || '');
  var fillColour = pct === 100 ? 'var(--green)' : 'var(--blue)';

  // Stale detection: no activity in 14+ days, not Stability/Archived
  var isStale = false;
  var staleDays = 0;
  if (impl.stage !== 'Stability' && impl.stage !== 'Archived') {
    var activity = Array.isArray(impl.activity) ? impl.activity : [];
    var lastActivityDate = activity.length > 0 ? new Date(activity[activity.length - 1].date) : (impl.created_date ? new Date(impl.created_date) : null);
    if (lastActivityDate) {
      staleDays = Math.floor((new Date() - lastActivityDate) / (1000*60*60*24));
      isStale = staleDays >= 14;
    }
  }

  // Linked escalation count
  var pendingEscs = (window._escalations || []).filter(function(e) {
    return e.implementation_id === impl.id && e.outcome === 'Pending';
  });

  return '<div class="kanban-card' + (isStale ? ' kanban-card-stale' : '') + '" draggable="true"' +
    ' ondragstart="kanbanDragStart(event,\'' + impl.id + '\')" ondragend="kanbanDragEnd(event)"' +
    ' onclick="openImplDetail(\'' + impl.id + '\')">' +
    (isStale ? '<div class="kanban-stale-badge">' + staleDays + 'd no activity</div>' : '') +
    '<div class="kanban-card-top">' +
      '<div class="kanban-card-org">' + impl.org + '</div>' +
      (pendingEscs.length > 0 ? '<span class="kanban-esc-badge" title="' + pendingEscs.length + ' pending escalation' + (pendingEscs.length > 1 ? 's' : '') + '">' + pendingEscs.length + ' esc</span>' : '') +
      '<div class="rag-dot" style="background:' + ragColour + '" title="' + impl.rag + '"></div>' +
    '</div>' +
    '<div class="kanban-card-meta">' + (impl.contact_name || '') + (impl.org_size ? ' &nbsp;·&nbsp; ' + impl.org_size + ' devices' : '') + (impl.large_deployment ? ' &nbsp;<span style="color:var(--amber);font-size:10px;font-weight:600">50+</span>' : '') + '</div>' +
    (os ? '<div class="kanban-card-meta">' + os + (impl.mdm_type ? ' &nbsp;·&nbsp; ' + impl.mdm_type : '') + (impl.deployment_method ? ' (' + impl.deployment_method + ')' : '') + '</div>' : '') +
    ((impl.plan || impl.app_version) ? '<div class="kanban-card-meta" style="color:var(--muted)">' + (impl.plan || '') + (impl.plan && impl.app_version ? ' &nbsp;·&nbsp; ' : '') + (impl.app_version ? 'v' + impl.app_version : '') + '</div>' : '') +
    '<div class="checklist-progress">' +
      '<div class="progress-bar-track">' +
        '<div class="progress-bar-fill" style="width:' + pct + '%;background:' + fillColour + '"></div>' +
      '</div>' +
      '<span class="progress-label">' + completed + '/' + total + '</span>' +
    '</div>' +
    (function() {
      var nextItem = stageItems.find(function(item) { return !checklist[item.id]; });
      return nextItem
        ? '<div class="kanban-next-action">→ ' + nextItem.text + '</div>'
        : (pct === 100 ? '<div class="kanban-next-action kanban-next-done">✓ Ready to advance</div>' : '');
    })() +
    '<button class="kanban-quick-add" onclick="event.stopPropagation();showQuickActivityModal(\'' + impl.id + '\')" title="Quick add activity note">+</button>' +
  '</div>';
}


// ── Drag and drop ─────────────────────────────────────────────────────────────

var _draggingId = null;

function kanbanDragStart(event, id) {
  _draggingId = id;
  event.dataTransfer.effectAllowed = 'move';
  setTimeout(function() { event.target.classList.add('dragging'); }, 0);
}

function kanbanDragEnd(event) {
  event.target.classList.remove('dragging');
  document.querySelectorAll('.kanban-col').forEach(function(col) { col.classList.remove('drag-over'); });
}

function kanbanDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('.kanban-col').forEach(function(c) { c.classList.remove('drag-over'); });
  event.currentTarget.classList.add('drag-over');
}

function kanbanDragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    event.currentTarget.classList.remove('drag-over');
  }
}

async function kanbanDrop(event, newStage) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  if (!_draggingId) return;
  var impl = window._implementations.find(function(i) { return i.id === _draggingId; });
  _draggingId = null;
  if (!impl || impl.stage === newStage) return;
  var stageEnteredAt = Object.assign({}, impl.stage_entered_at || {});
  stageEnteredAt[newStage] = localDateStr();
  var activity = (Array.isArray(impl.activity) ? impl.activity : []).concat([{
    stage: newStage,
    date: localDateStr(),
    note: 'Moved from ' + impl.stage + ' to ' + newStage
  }]);
  try {
    await updateImplementation(impl.id, { stage: newStage, stage_entered_at: stageEnteredAt, activity: activity });
    await reloadAll();
    showToast(impl.org + ' moved to ' + newStage, 'success');
  } catch(e) {
    showToast('Move failed', 'error');
  }
}

// ── Table ─────────────────────────────────────────────────────────────────────

function renderTable(implementations) {
  return '<table class="data-table">' +
    '<thead><tr>' +
      '<th>Organisation</th><th>Contact</th><th>Devices</th><th>OS</th>' +
      '<th>MDM</th><th>Stage</th><th>RAG</th><th>Progress</th><th></th>' +
    '</tr></thead>' +
    '<tbody>' +
    implementations.map(function(impl) {
      var checklist  = impl.checklist || {};
      var stageItems = DEFAULT_CHECKLISTS[impl.stage] || [];
      var completed  = stageItems.filter(function(item) { return checklist[item.id]; }).length;
      var total      = stageItems.length;
      var pct        = total > 0 ? Math.round((completed / total) * 100) : 0;
      var ragColour  = { Green: 'var(--green)', Amber: 'var(--amber)', Red: 'var(--red)' }[impl.rag] || 'var(--muted)';
      var os         = Array.isArray(impl.os) ? impl.os.join(', ') : (impl.os || '');
      var fillColour = pct === 100 ? 'var(--green)' : 'var(--blue)';
      return '<tr class="clickable-row" onclick="openImplDetail(\'' + impl.id + '\')">' +
        '<td><strong>' + impl.org + '</strong></td>' +
        '<td>' + (impl.contact_name || '&mdash;') + '</td>' +
        '<td>' + (impl.org_size || '&mdash;') + '</td>' +
        '<td>' + (os || '&mdash;') + '</td>' +
        '<td>' + (impl.mdm_type || '&mdash;') + '</td>' +
        '<td><span class="tag">' + impl.stage + '</span></td>' +
        '<td><span style="color:' + ragColour + ';font-weight:600">' + impl.rag + '</span></td>' +
        '<td><div style="display:flex;align-items:center;gap:6px">' +
          '<div class="progress-bar-track" style="width:80px"><div class="progress-bar-fill" style="width:' + pct + '%;background:' + fillColour + '"></div></div>' +
          '<span class="progress-label">' + pct + '%</span>' +
        '</div></td>' +
        '<td onclick="event.stopPropagation()">' +
          '<button class="icon-btn" onclick="editImpl(\'' + impl.id + '\')">&#9998;</button>' +
          '<button class="icon-btn" onclick="removeImpl(\'' + impl.id + '\')">&#128465;</button>' +
        '</td>' +
      '</tr>';
    }).join('') +
    '</tbody></table>';
}

// ── Detail View ───────────────────────────────────────────────────────────────

function openImplDetail(id) {
  _viewingImpl = id;
  renderSilentApp(window._implementations);
}

function closeImplDetail() {
  _viewingImpl = null;
  _returnToEscalation = null;
  renderSilentApp(window._implementations);
}

function returnToEscalation() {
  var ret = _returnToEscalation;
  _returnToEscalation = null;
  _viewingImpl = null;
  if (ret && ret.tab === 'deployment-escalations') {
    _viewingEscalation = ret.id;
    switchTab('deployment-escalations');
  }
}

function renderImplDetail(impl, allImpls) {
  var checklist      = impl.checklist || {};
  var activity       = Array.isArray(impl.activity) ? impl.activity : [];
  var os             = Array.isArray(impl.os) ? impl.os : (impl.os ? [impl.os] : []);
  var ragColour      = { Green: 'var(--green)', Amber: 'var(--amber)', Red: 'var(--red)' }[impl.rag] || 'var(--muted)';
  var ragEmoji       = impl.rag === 'Green' ? '🟢' : impl.rag === 'Amber' ? '🟡' : '🔴';
  var linkedEscs     = (window._escalations || []).filter(function(e) { return e.implementation_id === impl.id; });
  var stageEnteredAt = impl.stage_entered_at || {};
  var stageIdx       = STAGES.indexOf(impl.stage);

  // Pipeline with time-in-stage durations
  var pipelineHtml = '<div class="stage-pipeline">';
  STAGES.forEach(function(s, i) {
    var isDone   = i < stageIdx;
    var isActive = i === stageIdx;
    var cls      = 'pipeline-step' + (isDone?' done':'') + (isActive?' active':'');
    var daysInStage = '';
    if (stageEnteredAt[s]) {
      var enteredDate = new Date(stageEnteredAt[s]);
      var exitDate;
      if (isDone && STAGES[i+1] && stageEnteredAt[STAGES[i+1]]) {
        exitDate = new Date(stageEnteredAt[STAGES[i+1]]);
      } else if (isActive) {
        exitDate = new Date();
      }
      if (exitDate) {
        var days = Math.floor((exitDate - enteredDate) / (1000*60*60*24));
        daysInStage = '<div class="pipeline-days">' + days + 'd</div>';
      }
    }
    pipelineHtml +=
      '<div class="' + cls + '">' +
        '<div class="pipeline-dot"></div>' +
        '<div class="pipeline-label">' + s + '</div>' +
        (stageEnteredAt[s] ? '<div class="pipeline-date">' + stageEnteredAt[s] + '</div>' : '') +
        daysInStage +
      '</div>' +
      (i < STAGES.length-1 ? '<div class="pipeline-line' + (isDone?' done':'') + '"></div>' : '');
  });
  pipelineHtml += '</div>';

  // Next action — first unchecked item in current stage
  var currentStageItems = DEFAULT_CHECKLISTS[impl.stage] || [];
  var nextAction = currentStageItems.find(function(item) { return !checklist[item.id]; });
  var nextActionHtml = nextAction
    ? '<div class="next-action-banner">' +
        '<span class="next-action-label">NEXT ACTION</span>' +
        '<span class="next-action-text">' + nextAction.text + '</span>' +
      '</div>'
    : (impl.stage !== 'Archived' ? '<div class="next-action-banner next-action-done">' +
        '<span class="next-action-label">STAGE COMPLETE</span>' +
        '<span class="next-action-text">All ' + impl.stage + ' checklist items done — ready to advance</span>' +
      '</div>' : '');

  // Checklists
  var checklistsHtml = STAGES.map(function(stage) {
    var items     = DEFAULT_CHECKLISTS[stage] || [];
    var completed = items.filter(function(item) { return checklist[item.id]; }).length;
    var isCurrent = impl.stage === stage;
    return '<div class="checklist-card' + (isCurrent?' checklist-active':'') + '">' +
      '<div class="checklist-header">' +
        '<span class="checklist-stage-title">' + stage + '</span>' +
        '<span class="checklist-count' + (completed===items.length?' complete':'') + '">' + completed + '/' + items.length + '</span>' +
      '</div>' +
      '<div class="checklist-items">' +
        items.map(function(item) {
          var done = checklist[item.id];
          return '<label class="checklist-item">' +
            '<input type="checkbox" ' + (done?'checked':'') + ' onchange="toggleChecklistItem(\'' + impl.id + '\',\'' + item.id + '\',this.checked)" />' +
            '<span class="' + (done?'checked-text':'') + '">' + item.text + '</span>' +
          '</label>';
        }).join('') +
      '</div>' +
    '</div>';
  }).join('');

  // Linked escalations
  var linkedHtml = '<div class="checklist-card">' +
    '<div class="checklist-header">' +
      '<span class="checklist-stage-title">Deployment Escalations</span>' +
      '<span class="checklist-count">' + linkedEscs.length + '</span>' +
      '<button class="btn-secondary btn-sm" onclick="logEscForDeployment(\'' + impl.id + '\')">+ Log Escalation</button>' +
    '</div>' +
    (linkedEscs.length === 0
      ? '<div class="checklist-empty">No escalations logged for this deployment yet.</div>'
      : linkedEscs.map(function(e) {
          var outcomeClass = e.outcome.toLowerCase().replace(/ /g, '-');
          var daysInfo = '';
          if (e.days_to_resolve != null) {
            daysInfo = '<span class="linked-esc-days">' + e.days_to_resolve + 'd to resolve</span>';
          } else if (e.outcome === 'Pending' && e.date) {
            var daysOpen = Math.floor((new Date() - new Date(e.date)) / (86400000));
            daysInfo = '<span class="linked-esc-days linked-esc-open">' + daysOpen + 'd open</span>';
          }
          return '<div class="linked-esc" onclick="(function(){_returnToEscalation={id:\'' + e.id + '\',tab:\'deployment-escalations\'};_viewingImpl=null;switchTab(\'deployment-escalations\');setTimeout(function(){openEscalationDetail(\'' + e.id + '\')},200)})()">' +
            '<div class="linked-esc-top">' +
              '<span class="tag" style="font-size:0.75rem">' + e.type + (e.other_desc ? ': ' + e.other_desc : '') + '</span>' +
              '<span class="outcome ' + outcomeClass + '" style="font-size:0.75rem">' + e.outcome + '</span>' +
            '</div>' +
            '<div class="linked-esc-bottom">' +
              '<span class="linked-esc-date">' + (e.date || '—') + '</span>' +
              daysInfo +
            '</div>' +
          '</div>';
        }).join('')) +
  '</div>';

  // Activity timeline — collapsed by default, expand on click
  function truncateNote(text, max) {
    if (!text) return '';
    var plain = text.replace(/\*\*/g, '').replace(/\*/g, '');
    if (plain.length <= max) return plain;
    return plain.substring(0, max) + '…';
  }

  function renderLinkPills(entry) {
    var urls = entry.urls || (entry.url ? [entry.url] : []);
    if (!urls.length) return '';
    return urls.map(function(u, i) {
      if (typeof u === 'string') return '<a href="' + u + '" target="_blank" class="tl-link-pill" onclick="event.stopPropagation()">Link' + (urls.length > 1 ? ' ' + (i+1) : '') + '</a>';
      return '<a href="' + u.url + '" target="_blank" class="tl-link-pill" onclick="event.stopPropagation()">' + (u.label || 'Link') + '</a>';
    }).join('');
  }

  var timelineHtml = activity.length === 0
    ? '<div class="checklist-empty">No activity logged yet</div>'
    : [...activity].reverse().map(function(entry, ri) {
        var realIndex = activity.length - 1 - ri;
        var rc = { Green: 'var(--green)', Amber: 'var(--amber)', Red: 'var(--red)' }[entry.rag] || '';
        var ragDot = entry.rag ? '<span class="tl-rag-dot" style="background:' + rc + '"></span>' : '';
        var preview = truncateNote(entry.note, 120);
        var linkPills = renderLinkPills(entry);
        var entryId = 'act-entry-' + realIndex;

        return '<div class="tl-entry" id="' + entryId + '">' +
          // Collapsed summary row — always visible
          '<div class="tl-summary" onclick="toggleActivityEntry(\'' + entryId + '\')">' +
            '<span class="tl-date">' + (entry.date||'') + '</span>' +
            '<span class="activity-stage-tag">' + (entry.stage||'Note') + '</span>' +
            ragDot +
            '<span class="tl-preview">' + preview + '</span>' +
            '<span class="tl-pills">' + linkPills + '</span>' +
            '<span class="tl-actions">' +
              '<button class="tl-menu-btn" onclick="event.stopPropagation();toggleTlMenu(\'' + entryId + '\')" title="Actions">...</button>' +
              '<span class="tl-menu hidden" id="' + entryId + '-menu">' +
                '<button onclick="event.stopPropagation();closeTlMenus();showEditActivityModal(\'' + impl.id + '\',' + realIndex + ')">Edit</button>' +
                '<button onclick="event.stopPropagation();closeTlMenus();deleteActivityEntry(\'' + impl.id + '\',' + realIndex + ')">Delete</button>' +
              '</span>' +
            '</span>' +
          '</div>' +
          // Expanded body — hidden by default
          '<div class="tl-body hidden">' +
            '<div class="activity-note">' + formatNote(entry.note) + '</div>' +
            (linkPills ? '<div class="tl-body-links">' +
              (entry.urls || (entry.url ? [entry.url] : [])).map(function(u, i) {
                if (typeof u === 'string') return '<a href="' + u + '" target="_blank" class="activity-link">🔗 Link' + ((entry.urls||[]).length > 1 ? ' ' + (i+1) : '') + '</a>';
                return '<a href="' + u.url + '" target="_blank" class="activity-link">🔗 ' + (u.label || 'Link') + '</a>';
              }).join('') +
            '</div>' : '') +
          '</div>' +
        '</div>';
      }).join('');

  var returnLink = _returnToEscalation
    ? '<div class="detail-back detail-back-return" onclick="returnToEscalation()">&#8592; Back to escalation</div>'
    : '';

  document.getElementById('silent-app-content').innerHTML =
    returnLink +
    '<div class="detail-back" onclick="closeImplDetail()">&#8592; Back to implementations</div>' +
    '<div class="detail-single">' +

      // Header card
      '<div class="detail-card">' +
        '<div class="detail-card-header">' +
          '<div>' +
            '<div class="detail-org">' + impl.org + '</div>' +
            '<div class="detail-meta">' + (impl.contact_name||'') + (impl.contact_email?' &nbsp;·&nbsp; <a href="mailto:'+impl.contact_email+'" style="color:var(--blue)">'+impl.contact_email+'</a>':'') + '</div>' +
            '<div class="detail-meta" style="margin-top:4px">' +
              (impl.org_size ? impl.org_size + ' devices' : '') +
              (impl.large_deployment ? ' &nbsp;<span style="background:rgba(245,158,11,0.15);color:var(--amber);border:1px solid rgba(245,158,11,0.3);border-radius:3px;padding:1px 5px;font-size:10px;font-weight:600">50+ — Involve Lucas</span>' : '') +
              (os.length ? ' &nbsp;·&nbsp; ' + os.join(', ') : '') +
              (impl.deployment_method ? ' &nbsp;·&nbsp; ' + impl.deployment_method : '') +
              (impl.mdm_type ? ' &nbsp;·&nbsp; MDM: ' + impl.mdm_type : '') +
            '</div>' +
            ((impl.plan || impl.app_version) ? '<div class="detail-meta" style="margin-top:4px;color:var(--muted)">' +
              (impl.plan ? impl.plan : '') +
              (impl.plan && impl.app_version ? ' &nbsp;·&nbsp; ' : '') +
              (impl.app_version ? 'v' + impl.app_version : '') +
            '</div>' : '') +
            ((impl.hubspot_url || impl.slack_url) ? '<div class="detail-meta" style="margin-top:6px">' +
              (impl.hubspot_url ? '<a href="' + impl.hubspot_url + '" target="_blank" class="activity-link">🔗 HubSpot</a>' : '') +
              (impl.hubspot_url && impl.slack_url ? ' &nbsp;' : '') +
              (impl.slack_url ? '<a href="' + impl.slack_url + '" target="_blank" class="activity-link">💬 Slack</a>' : '') +
            '</div>' : '') +
          '</div>' +
          '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">' +
            '<span class="rag-badge-lg" style="background:' + ragColour + '22;color:' + ragColour + ';border:1px solid ' + ragColour + '66">' + ragEmoji + ' ' + impl.rag + '</span>' +
            '<button class="btn-secondary btn-sm" onclick="editImpl(\'' + impl.id + '\')">Edit</button>' +
            (impl.stage === 'Stability' ? '<button class="btn-archive btn-sm" onclick="archiveImpl(\'' + impl.id + '\')">🗄 Archive</button>' : '') +
            (impl.stage === 'Archived'  ? '<button class="btn-secondary btn-sm" onclick="unarchiveImpl(\'' + impl.id + '\')">↩ Unarchive</button>' : '') +
          '</div>' +
        '</div>' +
        pipelineHtml +
        nextActionHtml +
        (impl.notes ? '<div class="detail-notes">' + impl.notes + '</div>' : '') +
      '</div>' +

      // Activity log — form card
      '<div class="activity-card">' +
        '<div class="activity-header">Add Activity</div>' +
        '<div class="activity-form">' +
          '<select id="act-stage" class="input-field input-sm">' +
            STAGES.map(function(s){ return '<option value="'+s+'"'+(impl.stage===s?' selected':'')+'>'+s+'</option>'; }).join('') +
            '<option value="Note">Note only</option>' +
          '</select>' +
          '<select id="act-rag" class="input-field input-sm">' +
            '<option value="">RAG unchanged</option>' +
            '<option value="Green">Green</option>' +
            '<option value="Amber">Amber</option>' +
            '<option value="Red">Red</option>' +
          '</select>' +
          '<textarea id="act-note" placeholder="What happened? What\'s next?  Use **bold** and *italic*" class="input-field" rows="3"></textarea>' +
          '<div id="act-urls-container"></div>' +
          '<button type="button" class="btn-secondary btn-sm" style="width:100%;margin-bottom:4px" onclick="addUrlField()">+ Add Link</button>' +
          '<button class="btn-primary btn-sm" style="width:100%" onclick="addActivityEntry(\'' + impl.id + '\')">Add Entry</button>' +
        '</div>' +
      '</div>' +

      // Timeline card — separate, scannable
      '<div class="activity-card">' +
        '<div class="activity-header">Timeline <span class="tl-count">' + activity.length + ' entries</span></div>' +
        '<div class="activity-timeline">' + timelineHtml + '</div>' +
      '</div>' +

      // Checklists + linked escalations
      checklistsHtml +
      linkedHtml +

    '</div>' +
    renderImplModal(impl) +
    renderUnarchiveModal();
}

// ── Checklist toggle ──────────────────────────────────────────────────────────

async function toggleChecklistItem(implId, itemId, checked) {
  var impl = window._implementations.find(function(i){ return i.id === implId; });
  if (!impl) return;
  var checklist = Object.assign({}, impl.checklist || {});
  checklist[itemId] = checked;
  try {
    await updateImplementation(implId, { checklist: checklist });
    await reloadAll();
    var updated = window._implementations.find(function(i){ return i.id === implId; });
    if (updated) renderImplDetail(updated, window._implementations);
  } catch(e) {
    showToast('Failed to save checklist', 'error');
  }
}

// ── Activity log ──────────────────────────────────────────────────────────────

function addUrlField() {
  var container = document.getElementById('act-urls-container');
  if (!container) return;
  var row = document.createElement('div');
  row.className = 'url-row';
  row.innerHTML =
    '<input class="input-field input-sm act-url-label" placeholder="Label (e.g. Slack thread, HubSpot ticket…)" />' +
    '<input class="input-field input-sm act-url-input" placeholder="https://..." />' +
    '<button type="button" class="url-remove-btn" onclick="this.parentElement.remove()" title="Remove">✕</button>';
  container.appendChild(row);
}

async function addActivityEntry(implId) {
  var impl = window._implementations.find(function(i){ return i.id === implId; });
  if (!impl) return;

  var stage       = document.getElementById('act-stage').value;
  var rag         = document.getElementById('act-rag').value;
  var note        = document.getElementById('act-note').value.trim();
  var urlRows = Array.from(document.querySelectorAll('#act-urls-container .url-row'));
  var urls = urlRows.map(function(row) {
    var urlVal = row.querySelector('.act-url-input').value.trim();
    var labelVal = row.querySelector('.act-url-label');
    var label = labelVal ? labelVal.value.trim() : '';
    return urlVal ? { label: label || null, url: urlVal } : null;
  }).filter(Boolean);

  if (!note) { showToast('Please add a note', 'error'); return; }

  var entry = { stage: stage, date: localDateStr(), note: note };
  if (rag)         entry.rag         = rag;
  if (urls.length) entry.urls = urls;

  var activity = (Array.isArray(impl.activity) ? impl.activity : []).concat([entry]);
  var update   = { activity: activity };

  if (stage !== 'Note' && stage !== impl.stage) {
    update.stage = stage;
    var stageEnteredAt = Object.assign({}, impl.stage_entered_at || {});
    stageEnteredAt[stage] = entry.date;
    update.stage_entered_at = stageEnteredAt;
  }
  if (rag && rag !== impl.rag) update.rag = rag;

  showToast('Saving...', 'info');
  try {
    await updateImplementation(implId, update);
    await reloadAll();
    showToast('Entry added!', 'success');
    var updated = window._implementations.find(function(i){ return i.id === implId; });
    if (updated) renderImplDetail(updated, window._implementations);
  } catch(e) {
    showToast('Save failed', 'error');
  }
}

// ── Timeline expand/collapse ──────────────────────────────────────────────────

function toggleActivityEntry(entryId) {
  var el = document.getElementById(entryId);
  if (!el) return;
  var body = el.querySelector('.tl-body');
  var preview = el.querySelector('.tl-preview');
  if (!body) return;
  var isExpanded = !body.classList.contains('hidden');
  body.classList.toggle('hidden');
  el.classList.toggle('tl-expanded');
  if (preview) preview.classList.toggle('hidden', !isExpanded);
}

function closeTlMenus() {
  document.querySelectorAll('.tl-menu').forEach(function(m) { m.classList.add('hidden'); });
}

function toggleTlMenu(entryId, evt) {
  if (evt) evt.stopPropagation();
  var menu = document.getElementById(entryId + '-menu');
  var wasOpen = menu && !menu.classList.contains('hidden');
  // Close all menus first
  document.querySelectorAll('.tl-menu').forEach(function(m) { m.classList.add('hidden'); });
  // Toggle the target
  if (menu && !wasOpen) menu.classList.remove('hidden');
}

// Close menus on click outside
document.addEventListener('click', function() {
  document.querySelectorAll('.tl-menu').forEach(function(m) { m.classList.add('hidden'); });
});

// ── Edit / delete activity entries ────────────────────────────────────────────

function showEditActivityModal(implId, index) {
  var impl = window._implementations.find(function(i){ return i.id === implId; });
  if (!impl) return;
  var activity = Array.isArray(impl.activity) ? impl.activity : [];
  var entry = activity[index];
  if (!entry) return;
  // Normalize URLs to {label, url} format (backward compat with plain strings)
  var rawUrls = entry.urls || (entry.url ? [entry.url] : []);
  var urls = rawUrls.map(function(u) {
    if (typeof u === 'string') return { label: '', url: u };
    return { label: u.label || '', url: u.url || '' };
  });

  var existing = document.getElementById('edit-act-modal');
  if (existing) existing.remove();

  var urlRowsHtml = urls.map(function(u) {
    return '<div class="url-row">' +
      '<input class="input-field input-sm edit-act-url-label" placeholder="Label" value="' + (u.label || '') + '" />' +
      '<input class="input-field input-sm edit-act-url-input" placeholder="https://..." value="' + u.url + '" />' +
      '<button type="button" class="url-remove-btn" onclick="this.parentElement.remove()">✕</button>' +
    '</div>';
  }).join('');

  var html =
    '<div id="edit-act-modal" class="modal" onclick="if(event.target===this)closeEditActivityModal()">' +
      '<div class="modal-box" style="max-width:520px">' +
        '<h3>Edit Activity Entry</h3>' +
        '<label class="field-label">Date</label>' +
        '<input id="edit-act-date" type="date" class="input-field" value="' + (entry.date || '') + '" />' +
        '<label class="field-label">Stage</label>' +
        '<select id="edit-act-stage" class="input-field">' +
          STAGES.map(function(s){ return '<option value="'+s+'"'+(entry.stage===s?' selected':'')+'>'+s+'</option>'; }).join('') +
          '<option value="Note"' + (entry.stage==='Note'?' selected':'') + '>Note only</option>' +
        '</select>' +
        '<label class="field-label">RAG</label>' +
        '<select id="edit-act-rag" class="input-field">' +
          '<option value="">No RAG</option>' +
          '<option value="Green"' + (entry.rag==='Green'?' selected':'') + '>Green</option>' +
          '<option value="Amber"' + (entry.rag==='Amber'?' selected':'') + '>Amber</option>' +
          '<option value="Red"' + (entry.rag==='Red'?' selected':'') + '>Red</option>' +
        '</select>' +
        '<label class="field-label">Note <span class="field-hint">Use **bold** and *italic*</span></label>' +
        '<textarea id="edit-act-note" class="input-field" rows="4">' + (entry.note || '') + '</textarea>' +
        '<label class="field-label">Links</label>' +
        '<div id="edit-act-urls-container">' + urlRowsHtml + '</div>' +
        '<button type="button" class="btn-secondary btn-sm" style="width:100%;margin-top:4px" onclick="addEditUrlField()">+ Add Link</button>' +
        '<div class="modal-actions">' +
          '<button class="btn-secondary" onclick="closeEditActivityModal()">Cancel</button>' +
          '<button class="btn-primary" onclick="saveEditedActivity(\'' + implId + '\',' + index + ')">Save</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.getElementById('silent-app-content').insertAdjacentHTML('beforeend', html);
}

function addEditUrlField() {
  var container = document.getElementById('edit-act-urls-container');
  if (!container) return;
  var row = document.createElement('div');
  row.className = 'url-row';
  row.innerHTML =
    '<input class="input-field input-sm edit-act-url-label" placeholder="Label" />' +
    '<input class="input-field input-sm edit-act-url-input" placeholder="https://..." />' +
    '<button type="button" class="url-remove-btn" onclick="this.parentElement.remove()">✕</button>';
  container.appendChild(row);
}

function closeEditActivityModal() {
  var m = document.getElementById('edit-act-modal');
  if (m) m.remove();
}

async function saveEditedActivity(implId, index) {
  var impl = window._implementations.find(function(i){ return i.id === implId; });
  if (!impl) return;
  var activity = Array.isArray(impl.activity) ? impl.activity.slice() : [];
  if (!activity[index]) return;

  var note = document.getElementById('edit-act-note').value.trim();
  if (!note) { showToast('Note cannot be empty', 'error'); return; }

  var urlRows = Array.from(document.querySelectorAll('#edit-act-urls-container .url-row'));
  var urls = urlRows.map(function(row) {
    var urlVal = row.querySelector('.edit-act-url-input').value.trim();
    var labelEl = row.querySelector('.edit-act-url-label');
    var label = labelEl ? labelEl.value.trim() : '';
    return urlVal ? { label: label || null, url: urlVal } : null;
  }).filter(Boolean);

  activity[index] = {
    date:  document.getElementById('edit-act-date').value,
    stage: document.getElementById('edit-act-stage').value,
    rag:   document.getElementById('edit-act-rag').value || undefined,
    note:  note,
    urls:  urls.length ? urls : undefined
  };

  showToast('Saving...', 'info');
  try {
    await updateImplementation(implId, { activity: activity });
    closeEditActivityModal();
    await reloadAll();
    showToast('Entry updated', 'success');
    var updated = window._implementations.find(function(i){ return i.id === implId; });
    if (updated) renderImplDetail(updated, window._implementations);
  } catch(e) {
    showToast('Save failed', 'error');
  }
}

async function deleteActivityEntry(implId, index) {
  if (!confirm('Delete this activity entry?')) return;
  var impl = window._implementations.find(function(i){ return i.id === implId; });
  if (!impl) return;
  var activity = Array.isArray(impl.activity) ? impl.activity.slice() : [];
  activity.splice(index, 1);

  showToast('Deleting...', 'info');
  try {
    await updateImplementation(implId, { activity: activity });
    await reloadAll();
    showToast('Entry deleted', 'success');
    var updated = window._implementations.find(function(i){ return i.id === implId; });
    if (updated) renderImplDetail(updated, window._implementations);
  } catch(e) {
    showToast('Delete failed', 'error');
  }
}

// ── Quick activity from kanban ────────────────────────────────────────────────

function showQuickActivityModal(implId) {
  var existing = document.getElementById('quick-act-modal');
  if (existing) existing.remove();
  var impl = window._implementations.find(function(i){ return i.id === implId; });
  if (!impl) return;
  var html =
    '<div id="quick-act-modal" class="modal" onclick="if(event.target===this)closeQuickActivityModal()">' +
      '<div class="modal-box" style="max-width:420px">' +
        '<h3>Quick Note — ' + impl.org + '</h3>' +
        '<textarea id="quick-act-note" placeholder="What happened? What\'s next?" class="input-field" rows="3"></textarea>' +
        '<div class="modal-actions">' +
          '<button class="btn-secondary" onclick="closeQuickActivityModal()">Cancel</button>' +
          '<button class="btn-primary" onclick="saveQuickActivity(\'' + implId + '\')">Add Note</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.getElementById('silent-app-content').insertAdjacentHTML('beforeend', html);
}

function closeQuickActivityModal() {
  var m = document.getElementById('quick-act-modal');
  if (m) m.remove();
}

async function saveQuickActivity(implId) {
  var note = document.getElementById('quick-act-note').value.trim();
  if (!note) { showToast('Please add a note', 'error'); return; }
  var impl = window._implementations.find(function(i){ return i.id === implId; });
  if (!impl) return;
  var entry = { stage: 'Note', date: localDateStr(), note: note };
  var activity = (Array.isArray(impl.activity) ? impl.activity : []).concat([entry]);
  showToast('Saving...', 'info');
  try {
    await updateImplementation(implId, { activity: activity });
    closeQuickActivityModal();
    await reloadAll();
    showToast('Note added!', 'success');
  } catch(e) {
    showToast('Save failed', 'error');
  }
}

// ── View mode ─────────────────────────────────────────────────────────────────

function setShowArchived(val) {
  _showArchived = val;
  renderSilentApp(window._implementations);
}

async function archiveImpl(id) {
  if (!confirm('Archive this implementation? It will be hidden from the main view but can be restored.')) return;
  showToast('Archiving...', 'info');
  try {
    await updateImplementation(id, { stage: 'Archived' });
    _viewingImpl = null;
    await reloadAll();
    showToast('Implementation archived', 'success');
  } catch(e) {
    showToast('Archive failed', 'error');
  }
}

function unarchiveImpl(id) {
  window._unarchiveTargetId = id;
  var modal = document.getElementById('unarchive-modal');
  if (modal) {
    document.getElementById('unarchive-note').value = '';
    document.getElementById('unarchive-stage').value = 'Stability';
    modal.classList.remove('hidden');
  }
}

function closeUnarchiveModal() {
  var modal = document.getElementById('unarchive-modal');
  if (modal) modal.classList.add('hidden');
}

async function confirmUnarchive() {
  var id    = window._unarchiveTargetId;
  var stage = document.getElementById('unarchive-stage').value;
  var note  = document.getElementById('unarchive-note').value.trim();
  if (!note) { showToast('Please add a reason for restoring', 'error'); return; }
  closeUnarchiveModal();
  showToast('Restoring...', 'info');
  try {
    var impl = window._implementations.find(function(i){ return i.id === id; });
    var entry = {
      stage: stage,
      date: localDateStr(),
      note: 'Restored from archive: ' + note
    };
    var activity = (Array.isArray(impl.activity) ? impl.activity : []).concat([entry]);
    var stageEnteredAt = Object.assign({}, impl.stage_entered_at || {});
    stageEnteredAt[stage] = entry.date;
    await updateImplementation(id, {
      stage: stage,
      activity: activity,
      stage_entered_at: stageEnteredAt
    });
    await reloadAll();
    var updated = window._implementations.find(function(i){ return i.id === id; });
    if (updated) renderImplDetail(updated, window._implementations);
    showToast('Restored to ' + stage, 'success');
  } catch(e) {
    showToast('Restore failed', 'error');
  }
}

function setViewMode(mode) {
  _viewMode = mode;
  renderSilentApp(window._implementations);
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function showAddImplModal() {
  document.getElementById('impl-modal-title').textContent = 'Add Implementation';
  document.getElementById('impl-edit-id').value = '';
  ['impl-org','impl-contact-name','impl-contact-email','impl-org-size','impl-mdm','impl-app-version','impl-notes','impl-hubspot-url','impl-slack-url'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.value = '';
  });
  document.querySelectorAll('.impl-os-cb').forEach(function(cb){ cb.checked = false; });
  document.getElementById('impl-stage').value = STAGES[0];
  document.getElementById('impl-plan').value = '';
  document.getElementById('impl-large-deployment').checked = false;
  document.getElementById('impl-rag').value = 'Green';
  document.getElementById('impl-deploy-method').value = '';
  document.getElementById('impl-modal').classList.remove('hidden');
}

function closeImplModal() {
  document.getElementById('impl-modal').classList.add('hidden');
}

function editImpl(id) {
  var impl = window._implementations.find(function(i){ return i.id === id; });
  if (!impl) return;
  document.getElementById('impl-modal-title').textContent = 'Edit Implementation';
  document.getElementById('impl-edit-id').value   = id;
  document.getElementById('impl-org').value        = impl.org || '';
  document.getElementById('impl-contact-name').value  = impl.contact_name || '';
  document.getElementById('impl-contact-email').value = impl.contact_email || '';
  document.getElementById('impl-org-size').value   = impl.org_size || '';
  document.getElementById('impl-mdm').value              = impl.mdm_type || '';
  document.getElementById('impl-plan').value                 = impl.plan || '';
  document.getElementById('impl-app-version').value          = impl.app_version || '';
  document.getElementById('impl-large-deployment').checked   = impl.large_deployment === true;
  document.getElementById('impl-deploy-method').value = impl.deployment_method || '';
  document.getElementById('impl-stage').value      = impl.stage || STAGES[0];
  document.getElementById('impl-rag').value         = impl.rag || 'Green';
  document.getElementById('impl-hubspot-url').value = impl.hubspot_url || '';
  document.getElementById('impl-slack-url').value   = impl.slack_url || '';
  document.getElementById('impl-notes').value       = impl.notes || '';
  var osArr = Array.isArray(impl.os) ? impl.os : [];
  document.querySelectorAll('.impl-os-cb').forEach(function(cb){ cb.checked = osArr.includes(cb.value); });
  document.getElementById('impl-modal').classList.remove('hidden');
}

async function saveImpl() {
  var id = document.getElementById('impl-edit-id').value;
  var os = Array.from(document.querySelectorAll('.impl-os-cb:checked')).map(function(cb){ return cb.value; });
  var data = {
    org:               document.getElementById('impl-org').value.trim(),
    contact_name:      document.getElementById('impl-contact-name').value.trim(),
    contact_email:     document.getElementById('impl-contact-email').value.trim(),
    org_size:          parseInt(document.getElementById('impl-org-size').value) || null,
    mdm_type:          document.getElementById('impl-mdm').value.trim(),
    deployment_method: document.getElementById('impl-deploy-method').value,
    stage:             document.getElementById('impl-stage').value,
    rag:               document.getElementById('impl-rag').value,
    hubspot_url:       document.getElementById('impl-hubspot-url').value.trim() || null,
    slack_url:         document.getElementById('impl-slack-url').value.trim() || null,
    notes:             document.getElementById('impl-notes').value.trim(),
    os:                os.length ? os : null,
    plan:              document.getElementById('impl-plan').value || null,
    app_version:       document.getElementById('impl-app-version').value.trim() || null,
    large_deployment:  document.getElementById('impl-large-deployment').checked,
  };
  if (!data.org) { showToast('Organisation name is required', 'error'); return; }
  if (!id) {
    data.stage_entered_at = {};
    data.stage_entered_at[data.stage] = localDateStr();
    data.created_date = localDateStr();
    data.checklist = {};
    data.activity  = [];
  }
  showToast('Saving...', 'info');
  try {
    if (id) { await updateImplementation(id, data); } else { await addImplementation(data); }
    closeImplModal();
    await reloadAll();
    showToast('Saved!', 'success');
    if (_viewingImpl) {
      var updated = window._implementations.find(function(i){ return i.id === (_viewingImpl||id); });
      if (updated) renderImplDetail(updated, window._implementations);
    }
  } catch(e) {
    showToast('Save failed', 'error');
  }
}

async function removeImpl(id) {
  if (!confirm('Delete this implementation?')) return;
  try {
    await deleteImplementation(id);
    _viewingImpl = null;
    await reloadAll();
    showToast('Deleted', 'success');
  } catch(e) {
    showToast('Delete failed', 'error');
  }
}
