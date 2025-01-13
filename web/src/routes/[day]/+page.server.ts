import type { Days } from '$lib/models/days';
import { supabase } from '$lib/supabaseClient';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => {
    const today = new Date();
    if (params.day == 'today') {
        params.day = today.toISOString().split('T')[0];
    }

    const { data } = await supabase.from('days').select().eq('date', params.day).limit(1).single<Days>();



    // Parse the provided day into a Date object
    const currentDay = new Date(params.day);

    // Calculate the previous and next days
    const previousDay = new Date(currentDay);
    previousDay.setDate(currentDay.getDate() - 1);

    const nextDay = new Date(currentDay);
    nextDay.setDate(currentDay.getDate() + 1);

    // Convert back to ISO date format (YYYY-MM-DD)
    const previous = previousDay.toISOString().split('T')[0];
    const next = nextDay.toISOString().split('T')[0];

    return { day: params.day, ...data, hour: today.getHours(), next, previous };
}) satisfies PageServerLoad;