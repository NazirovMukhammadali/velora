import { Injectable } from '@nestjs/common';
import { ChatbotReply } from '../../libs/dto/chatbot/chatbot';

type ChatRule = {
	category: string;
	keywords: string[];
	answer: string;
};

@Injectable()
export class ChatbotService {
	private readonly rules: ChatRule[] = [
		{
			category: 'booking',
			keywords: ['booking', 'book', 'confirm', 'status', 'pending'],
			answer:
				'Booking flow is simple: createTourBooking creates a PENDING booking, getMyTourBookings lists user bookings, and admins confirm with confirmTourBookingByAdmin.',
		},
		{
			category: 'tours',
			keywords: ['tour', 'agent', 'package'],
			answer:
				'Tours are agent-centered in Velora. Start from getAgents, open agent detail, fetch getAgentTours, then create a booking from a selected package.',
		},
		{
			category: 'domains',
			keywords: ['flight', 'hotel', 'rentcar', 'domain', 'tabs'],
			answer:
				'Current core domains are flights, hotels, rentcar, tours, and bookings. Primary search tabs are flights, hotels, and rentcar.',
		},
		{
			category: 'scope',
			keywords: ['payment', 'chatbot', 'microservice', 'integration', 'mvp'],
			answer:
				'This project follows portfolio MVP scope: no real payment integration, no microservices, and no external production integrations.',
		},
		{
			category: 'auth',
			keywords: ['auth', 'login', 'signup', 'jwt', 'token'],
			answer:
				'Authentication is JWT-based. Use signup/login mutations to get an access token and pass it as Bearer token for protected operations.',
		},
	];

	public ask(prompt: string): ChatbotReply {
		const normalizedPrompt = prompt.toLowerCase().trim();
		const matchedRule = this.rules.find((rule) =>
			rule.keywords.some((keyword) => normalizedPrompt.includes(keyword)),
		);

		if (matchedRule) {
			return {
				answer: matchedRule.answer,
				category: matchedRule.category,
			};
		}

		return {
			category: 'general',
			answer:
				'I can help with Velora API basics: auth, flights/hotels/rentcar, tours, and minimal booking flow. Ask a specific question for a precise answer.',
		};
	}
}
