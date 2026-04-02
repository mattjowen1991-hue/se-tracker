// All Supabase database operations

async function dbRequest(path, method = 'GET', body = null, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${path}${params}`;
  const prefer = method === 'POST' ? 'return=representation'
               : method === 'PATCH' ? 'return=representation'
               : 'return=minimal';
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': prefer
  };
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`DB error ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Implementations ───────────────────────────────────────────────────────────

async function getImplementations() {
  return dbRequest('implementations', 'GET', null, '?order=created_at.desc');
}

async function addImplementation(data) {
  return dbRequest('implementations', 'POST', data);
}

async function updateImplementation(id, data) {
  return dbRequest(`implementations?id=eq.${id}`, 'PATCH', data);
}

async function deleteImplementation(id) {
  return dbRequest(`implementations?id=eq.${id}`, 'DELETE');
}

// ── Deployment Escalations ────────────────────────────────────────────────────

async function getEscalations() {
  return dbRequest('escalations', 'GET', null, '?order=created_at.desc');
}

async function addEscalation(data) {
  return dbRequest('escalations', 'POST', data);
}

async function updateEscalation(id, data) {
  return dbRequest(`escalations?id=eq.${id}`, 'PATCH', data);
}

async function deleteEscalation(id) {
  return dbRequest(`escalations?id=eq.${id}`, 'DELETE');
}

// ── SE Escalations ────────────────────────────────────────────────────────────

async function getSeEscalations() {
  return dbRequest('se_escalations', 'GET', null, '?order=created_at.desc');
}

async function addSeEscalation(data) {
  return dbRequest('se_escalations', 'POST', data);
}

async function updateSeEscalation(id, data) {
  return dbRequest(`se_escalations?id=eq.${id}`, 'PATCH', data);
}

async function deleteSeEscalation(id) {
  return dbRequest(`se_escalations?id=eq.${id}`, 'DELETE');
}

// ── Docs ──────────────────────────────────────────────────────────────────────

async function getDocs() {
  return dbRequest('docs', 'GET', null, '?order=created_at.desc');
}

async function addDoc(data) {
  return dbRequest('docs', 'POST', data);
}

async function updateDoc(id, data) {
  return dbRequest(`docs?id=eq.${id}`, 'PATCH', data);
}

async function deleteDoc(id) {
  return dbRequest(`docs?id=eq.${id}`, 'DELETE');
}
