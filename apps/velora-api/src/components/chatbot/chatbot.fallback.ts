import { ChatbotReply } from '../../libs/dto/chatbot/chatbot';
import { suggestionsFor } from './chatbot.suggestions';

/** Keyword FAQ used when the AI provider is not configured or unavailable, so the widget never dead-ends. */
type FallbackRule = { category: string; keywords: string[]; answer: string };

const RULES: FallbackRule[] = [
	{
		category: 'booking',
		keywords: ['booking', 'book', 'reserve', 'confirm', 'cancel', 'bron'],
		answer:
			'Open any tour or hotel on Velora and pick your dates to book. Your bookings appear under "My Bookings" once you are signed in; new tour bookings start as pending until the agent confirms them.',
	},
	{
		category: 'tours',
		keywords: ['tour', 'agent', 'package', 'guide', 'tur'],
		answer:
			'Browse the Tours page or the Agents directory — every tour is run by a verified local agent you can contact before booking.',
	},
	{
		category: 'hotels',
		keywords: ['hotel', 'stay', 'room', 'mehmonxona'],
		answer: 'Use the Hotel tab in the search on the home page: enter a city, your dates and the number of guests.',
	},
	{
		category: 'flights',
		keywords: ['flight', 'fly', 'airport', 'ticket', 'reys', 'aviabilet'],
		answer: 'Use the Flights tab on the home page: choose departure and destination, dates and passengers.',
	},
	{
		category: 'rentcar',
		keywords: ['car', 'rent', 'drive', 'mashina'],
		answer: 'Use the Rent a Car tab: pick a city and your pick-up / drop-off dates; the price is per day.',
	},
	{
		category: 'account',
		keywords: ['login', 'sign', 'register', 'password', 'account'],
		answer: 'Use Login / Register in the top right corner. If you forgot your password, contact us via the CS page.',
	},
];

export const fallbackReply = (prompt: string): ChatbotReply => {
	const text = prompt.toLowerCase();
	const rule = RULES.find((r) => r.keywords.some((k) => text.includes(k)));
	return {
		category: rule?.category ?? 'general',
		answer:
			rule?.answer ??
			'I can help you find tours, hotels, rental cars and flights on Velora. Try asking, for example, "hotels in Seoul under $150".',
		sources: [],
		aiPowered: false,
		suggestions: suggestionsFor(rule ? [rule.category] : []),
	};
};
