// Supabase configuration
const SUPABASE_URL = 'https://izcfxxcmqldzljsxzrlk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6Y2Z4eGNtcWxkemxqc3h6cmxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyOTg0MjUsImV4cCI6MjA4ODg3NDQyNX0.a8pgLAqth8KHZ2lPFSUPjhjiUxg1fkH3C1FKFS4Bg_c';

// Silent App deployment stages
const STAGES = ['Pre-Deployment', 'Deployment', 'Validation', 'Stability'];

// RAG status options
const RAG_OPTIONS = ['Green', 'Amber', 'Red'];

// Deployment escalation types
const ESCALATION_TYPES = ['Silent App', 'MDM/RDS', 'Network', 'API', 'Billing', 'Other'];

// Deployment escalation outcomes
const ESCALATION_OUTCOMES = ['Resolved by SE', 'Escalated to Engineering', 'Pending'];

// SE escalation stages
const SE_ESC_STAGES = ['Open', 'Pending', 'Blocked', 'Resolved'];

// SE escalation priorities
const SE_ESC_PRIORITIES = ['Normal', 'High', 'Urgent'];
