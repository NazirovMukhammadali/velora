/** Follow-up prompts offered as chips under an answer (kept short; the UI sends them verbatim). */

const BY_TOPIC: Record<string, string[]> = {
	hotel: ['Show cheaper hotels', 'Only 5-star hotels', 'Flights to this city'],
	tour: ['Tours under $500', 'Shorter tours (3 days or less)', 'Hotels near this tour'],
	rentcar: ['Cheapest SUVs', 'Automatic cars only', 'Hotels in this city'],
	flight: ['Business class options', 'Flights next week', 'Hotels at the destination'],
	booking: ['Show my bookings', 'How do I cancel a booking?'],
	general: ['Hotels in Seoul under $150', 'Tours in Samarkand', 'Flights from Tashkent to Istanbul'],
};

/** FAQ categories → suggestion topic. */
const CATEGORY_TOPIC: Record<string, string> = {
	hotels: 'hotel',
	tours: 'tour',
	rentcar: 'rentcar',
	flights: 'flight',
	booking: 'booking',
};

export const suggestionsFor = (topics: string[], max = 3): string[] => {
	const picked = new Set<string>();
	for (const topic of topics.length ? topics : ['general']) {
		for (const prompt of BY_TOPIC[CATEGORY_TOPIC[topic] ?? topic] ?? BY_TOPIC.general) picked.add(prompt);
	}
	return Array.from(picked).slice(0, max);
};
