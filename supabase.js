// supabase.js - Связь с сервером
const SUPABASE_URL = 'https://waaofmqficovjagypktq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhYW9mbXFmaWNvdmphZ3lwa3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNTg5ODYsImV4cCI6MjA4ODkzNDk4Nn0.5en2CN47H5H91HrsSrfYCfLEWztxsHp6eM6uAFpl6SQ';

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
