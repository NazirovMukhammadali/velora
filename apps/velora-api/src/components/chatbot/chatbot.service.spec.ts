import { ChatbotService } from './chatbot.service';

describe('ChatbotService', () => {
	let service: ChatbotService;

	beforeEach(() => {
		service = new ChatbotService();
	});

	it('returns booking category answer for booking prompt', () => {
		const result = service.ask('How do I confirm booking status?');
		expect(result.category).toBe('booking');
		expect(result.answer).toContain('createTourBooking');
	});

	it('returns fallback answer for unrelated prompt', () => {
		const result = service.ask('Tell me something random');
		expect(result.category).toBe('general');
		expect(result.answer).toContain('Velora API basics');
	});
});
