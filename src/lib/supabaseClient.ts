import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ncfqkcybnfncsklfdevj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZnFrY3libmZuY3NrbGZkZXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyODAxMDgsImV4cCI6MjA3NDg1NjEwOH0.DY2U6yEGxPG0fy9NPYuZc84kqer6GjgWYX7lPKo6rdg';

export const supabase = createClient(supabaseUrl, supabaseKey);
