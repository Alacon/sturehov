import { supabase } from '$lib/supabaseClient';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => {
    if (params.day == 'today') {
        const today = new Date();
        params.day = today.toISOString().split('T')[0];
    }

    console.log(params);
    const { data } = await supabase.from('days').select().eq('date', params.day).limit(1).single();
console.log(data);

    return { day: params.day, data: data };
}) satisfies PageServerLoad;