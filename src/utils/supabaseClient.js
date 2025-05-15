import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://swoxrmhukrhvssyynyzv.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3b3hybWh1a3JodnNzeXlueXp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxNDgyMDUsImV4cCI6MjA2MjcyNDIwNX0.c4pPDmlRp40uZ2zi5rkuIVHBJrJ2Wz-jKX2d6c2qNAw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
