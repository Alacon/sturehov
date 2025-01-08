import { createClient } from '@supabase/supabase-js';

const supabase = process.env.PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
}) : null;

export const supabaseAdmin = supabase!;