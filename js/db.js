// All Supabase database operations

async function dbRequest(path, method = 'GET', body = null, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${path}${params}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
  };
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`DB error: ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Weekly metrics
async function getWeeklyMetrics() {
  return dbRequest('weekly_metrics', 'GET', null, '?order=week_index.asc');
}

async function upsertWeeklyMetric(data) {
  return dbRequest('weekly_metrics', 'POST', data, '');
}

async function updateWeeklyMetric(id, data) {
  return dbRequest(`weekly_metrics?id=eq.${id}`, 'PATCH', data);
}

// Implementations
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

// Escalations
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

// Calls
async function getCalls() {
  return dbRequest('calls', 'GET', null, '?order=date.desc');
}

async function addCall(data) {
  return dbRequest('calls', 'POST', data);
}

async function updateCall(id, data) {
  return dbRequest(`calls?id=eq.${id}`, 'PATCH', data);
}

async function deleteCall(id) {
  return dbRequest(`calls?id=eq.${id}`, 'DELETE');
}

// Docs
async function getDocs() {
  return dbRequest('docs', 'GET', null, '?order=date.desc');
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
