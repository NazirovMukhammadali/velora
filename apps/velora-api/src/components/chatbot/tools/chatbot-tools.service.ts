import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Model, Types } from 'mongoose';
import { escapeRegex } from '../../../libs/config';
import { FlightStatus } from '../../../libs/enums/flight.enum';
import { HotelStatus } from '../../../libs/enums/hotel.enum';
import { RentcarStatus } from '../../../libs/enums/rentcar.enum';
import { TourStatus } from '../../../libs/enums/tour.enum';
import { FlightCabinClass } from '../../../libs/enums/flight.enum';
import { RentcarCategory } from '../../../libs/enums/rentcar.enum';
import { AiToolDefinition } from '../ai/ai-provider.interface';
import {
	GetMyBookingsArgs,
	SearchFlightsArgs,
	SearchHotelsArgs,
	SearchRentcarsArgs,
	SearchToursArgs,
	TOOL_DEFAULT_LIMIT,
	TOOL_MAX_LIMIT,
} from './tool-args.dto';
import { toSafeBooking, toSafeFlight, toSafeHotel, toSafeRentcar, toSafeTour } from './safe-mappers';

/** Who is asking — resolved from the verified JWT by the resolver, never from model output. */
export type ToolContext = { memberId: Types.ObjectId | null };

/** A catalog item surfaced to the UI as a clickable card next to the answer. */
export type ToolSource = {
	type: 'hotel' | 'tour' | 'rentcar' | 'flight';
	title: string;
	url: string;
	priceUsd: number;
	/** For the UI card only; images are not part of the model-facing output. */
	image?: string | null;
};

export type ToolExecution = { output: Record<string, unknown>; sources: ToolSource[] };

/** IATA code → city so "Seoul" finds flights stored as ICN. */
const AIRPORT_CITIES: Record<string, string> = {
	AUH: 'Abu Dhabi',
	BCN: 'Barcelona',
	CDG: 'Paris',
	DOH: 'Doha',
	DXB: 'Dubai',
	FCO: 'Rome',
	FRA: 'Frankfurt',
	ICN: 'Seoul',
	IST: 'Istanbul',
	JFK: 'New York',
	LHR: 'London',
	NRT: 'Tokyo',
	SFO: 'San Francisco',
	SIN: 'Singapore',
	SYD: 'Sydney',
	TAS: 'Tashkent',
};

const limitParam = {
	type: 'integer' as const,
	description: `How many results to return (1-${TOOL_MAX_LIMIT}, default ${TOOL_DEFAULT_LIMIT}).`,
	minimum: 1,
	maximum: TOOL_MAX_LIMIT,
};

export const CHATBOT_TOOLS: AiToolDefinition[] = [
	{
		name: 'search_hotels',
		description: 'Search active Velora hotels by city, budget per night and minimum star rating.',
		parameters: {
			type: 'object',
			properties: {
				city: { type: 'string', description: 'City name, e.g. "Seoul".' },
				maxPrice: { type: 'number', description: 'Maximum price per night in USD.', minimum: 0 },
				minStars: { type: 'integer', description: 'Minimum hotel stars (1-5).', minimum: 1, maximum: 5 },
				limit: limitParam,
			},
		},
	},
	{
		name: 'search_tours',
		description: 'Search active guided tour packages by destination, budget and length.',
		parameters: {
			type: 'object',
			properties: {
				location: { type: 'string', description: 'City or region, e.g. "Samarkand".' },
				maxPrice: { type: 'number', description: 'Maximum tour price per person in USD.', minimum: 0 },
				maxDays: { type: 'integer', description: 'Maximum tour length in days.', minimum: 1, maximum: 60 },
				limit: limitParam,
			},
		},
	},
	{
		name: 'search_rentcars',
		description: 'Search rental cars by city, category and daily budget.',
		parameters: {
			type: 'object',
			properties: {
				city: { type: 'string', description: 'Pick-up city.' },
				category: { type: 'string', description: 'Car category.', enum: Object.values(RentcarCategory) },
				maxPricePerDay: { type: 'number', description: 'Maximum daily price in USD.', minimum: 0 },
				limit: limitParam,
			},
		},
	},
	{
		name: 'search_flights',
		description: 'Search upcoming flights. "from"/"to" accept a city name or a 3-letter IATA airport code.',
		parameters: {
			type: 'object',
			properties: {
				from: { type: 'string', description: 'Departure city or IATA code, e.g. "Tashkent" or "TAS".' },
				to: { type: 'string', description: 'Arrival city or IATA code.' },
				date: { type: 'string', description: 'Departure date as YYYY-MM-DD.' },
				cabinClass: { type: 'string', description: 'Cabin class.', enum: Object.values(FlightCabinClass) },
				maxPrice: { type: 'number', description: 'Maximum fare in USD.', minimum: 0 },
				limit: limitParam,
			},
		},
	},
	{
		name: 'get_my_bookings',
		description: "List the signed-in traveller's own tour and hotel bookings. Requires the user to be logged in.",
		parameters: { type: 'object', properties: { limit: limitParam } },
	},
];

@Injectable()
export class ChatbotToolsService {
	private readonly logger = new Logger(ChatbotToolsService.name);

	constructor(
		@InjectModel('Hotel') private readonly hotelModel: Model<any>,
		@InjectModel('Tour') private readonly tourModel: Model<any>,
		@InjectModel('Rentcar') private readonly rentcarModel: Model<any>,
		@InjectModel('Flight') private readonly flightModel: Model<any>,
		@InjectModel('Booking') private readonly bookingModel: Model<any>,
	) {}

	/** Validates the model's arguments, runs the matching read-only query and returns safe DTOs. */
	public async execute(name: string, rawArgs: unknown, context: ToolContext): Promise<ToolExecution> {
		try {
			switch (name) {
				case 'search_hotels':
					return await this.searchHotels(await this.parse(SearchHotelsArgs, rawArgs));
				case 'search_tours':
					return await this.searchTours(await this.parse(SearchToursArgs, rawArgs));
				case 'search_rentcars':
					return await this.searchRentcars(await this.parse(SearchRentcarsArgs, rawArgs));
				case 'search_flights':
					return await this.searchFlights(await this.parse(SearchFlightsArgs, rawArgs));
				case 'get_my_bookings':
					return await this.getMyBookings(await this.parse(GetMyBookingsArgs, rawArgs), context);
				default:
					return { output: { error: 'unknown_tool' }, sources: [] };
			}
		} catch (err) {
			if (err instanceof ToolArgumentError)
				return { output: { error: 'invalid_arguments', details: err.issues }, sources: [] };
			this.logger.error(`Tool ${name} failed`, err as Error);
			return { output: { error: 'tool_failed' }, sources: [] };
		}
	}

	private async parse<T extends object>(cls: new () => T, raw: unknown): Promise<T> {
		const plain = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
		const instance = plainToInstance(cls, plain);
		const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
		if (errors.length) {
			throw new ToolArgumentError(errors.map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`));
		}
		return instance;
	}

	private async searchHotels(args: SearchHotelsArgs): Promise<ToolExecution> {
		const base: Filter = { hotelStatus: HotelStatus.ACTIVE };
		const place = textMatch(args.city);
		const located: Filter = place ? { ...base, hotelLocation: place } : base;
		const strict: Filter = { ...located };
		if (args.maxPrice !== undefined) strict.hotelPrice = { $lte: args.maxPrice };
		if (args.minStars !== undefined) strict.hotelStars = { $gte: args.minStars };

		const limit = args.limit ?? TOOL_DEFAULT_LIMIT;
		const run = (match: Filter, sort: SortSpec) =>
			this.hotelModel
				.find(match)
				.sort(sort)
				.limit(limit)
				.select('hotelName hotelLocation hotelAddress hotelStars hotelPrice availableRooms hotelImages')
				.lean()
				.exec();
		const { docs, match } = await searchWithFallback([
			{ filter: strict, run: () => run(strict, { hotelRank: -1, hotelPrice: 1 }) },
			{ filter: located, run: () => run(located, { hotelRank: -1, hotelPrice: 1 }) },
			{ filter: base, run: () => run(base, { hotelRank: -1, hotelLikes: -1, hotelViews: -1 }) },
		]);
		const results = docs.map(toSafeHotel);
		return {
			output: describeResults(match, results),
			sources: results.map((h, i) => ({
				type: 'hotel',
				title: h.name,
				url: h.url,
				priceUsd: h.pricePerNightUsd,
				image: firstImage(docs[i].hotelImages),
			})),
		};
	}

	private async searchTours(args: SearchToursArgs): Promise<ToolExecution> {
		const base: Filter = { tourStatus: TourStatus.ACTIVE };
		const place = textMatch(args.location);
		const located: Filter = place ? { ...base, $or: [{ tourLocation: place }, { tourTitle: place }] } : base;
		const strict: Filter = { ...located };
		if (args.maxPrice !== undefined) strict.tourPrice = { $lte: args.maxPrice };
		if (args.maxDays !== undefined) strict.tourDays = { $lte: args.maxDays };

		const limit = args.limit ?? TOOL_DEFAULT_LIMIT;
		const run = (match: Filter, sort: SortSpec) =>
			this.tourModel
				.aggregate([
					{ $match: match },
					{ $sort: sort },
					{ $limit: limit },
					// Only the agent's public display name is joined — never phone, password or tokens.
					{
						$lookup: {
							from: 'members',
							localField: 'memberId',
							foreignField: '_id',
							as: 'agent',
							pipeline: [{ $project: { memberFullName: 1, memberNick: 1 } }],
						},
					},
					{
						$project: {
							tourTitle: 1,
							tourLocation: 1,
							tourDays: 1,
							tourNights: 1,
							tourPrice: 1,
							tourImages: { $slice: ['$tourImages', 1] },
							agentName: { $ifNull: [{ $first: '$agent.memberFullName' }, { $first: '$agent.memberNick' }] },
						},
					},
				])
				.exec();
		const { docs, match } = await searchWithFallback([
			{ filter: strict, run: () => run(strict, { tourSoldCount: -1, tourPrice: 1 }) },
			{ filter: located, run: () => run(located, { tourSoldCount: -1, tourPrice: 1 }) },
			{ filter: base, run: () => run(base, { tourSoldCount: -1, tourRank: -1, tourLikes: -1 }) },
		]);
		const results = docs.map(toSafeTour);
		return {
			output: describeResults(match, results),
			sources: results.map((t, i) => ({
				type: 'tour',
				title: t.title,
				url: t.url,
				priceUsd: t.priceUsd,
				image: firstImage(docs[i].tourImages),
			})),
		};
	}

	private async searchRentcars(args: SearchRentcarsArgs): Promise<ToolExecution> {
		const base: Filter = { rentcarStatus: RentcarStatus.ACTIVE };
		const place = textMatch(args.city);
		const located: Filter = place ? { ...base, carLocation: place } : base;
		const strict: Filter = { ...located };
		if (args.category) strict.carCategory = args.category;
		if (args.maxPricePerDay !== undefined) strict.dailyPrice = { $lte: args.maxPricePerDay };

		const limit = args.limit ?? TOOL_DEFAULT_LIMIT;
		const run = (match: Filter, sort: SortSpec) =>
			this.rentcarModel
				.find(match)
				.sort(sort)
				.limit(limit)
				.select('carTitle carLocation carCategory transmission seats dailyPrice carImages')
				.lean()
				.exec();
		const { docs, match } = await searchWithFallback([
			{ filter: strict, run: () => run(strict, { dailyPrice: 1 }) },
			{ filter: located, run: () => run(located, { dailyPrice: 1 }) },
			{ filter: base, run: () => run(base, { rentcarRank: -1, rentcarLikes: -1, dailyPrice: 1 }) },
		]);
		const results = docs.map(toSafeRentcar);
		return {
			output: describeResults(match, results),
			sources: results.map((c, i) => ({
				type: 'rentcar',
				title: c.model,
				url: c.url,
				priceUsd: c.pricePerDayUsd,
				image: firstImage(docs[i].carImages),
			})),
		};
	}

	private async searchFlights(args: SearchFlightsArgs): Promise<ToolExecution> {
		const now = new Date();
		const base: Filter = { flightStatus: FlightStatus.ACTIVE, departureTime: { $gt: now } };
		const from = airportCodes(args.from);
		const to = airportCodes(args.to);
		const routed: Filter = { ...base };
		if (from) routed.departureAirport = { $in: from };
		if (to) routed.arrivalAirport = { $in: to };
		const strict: Filter = { ...routed };
		if (args.cabinClass) strict.cabinClass = args.cabinClass;
		if (args.maxPrice !== undefined) strict.basePrice = { $lte: args.maxPrice };
		if (args.date) {
			const start = new Date(`${args.date}T00:00:00Z`);
			const end = new Date(`${args.date}T23:59:59.999Z`);
			if (Number.isNaN(start.getTime())) throw new ToolArgumentError(['date: must be a real YYYY-MM-DD date']);
			strict.departureTime = { $gte: start > now ? start : now, $lte: end };
		}
		// No exact route: the return leg first, then any upcoming flight touching one of the requested airports.
		const reverse: Filter | null =
			from && to ? { ...base, departureAirport: { $in: to }, arrivalAirport: { $in: from } } : null;
		const nearby = [...(from ?? []), ...(to ?? [])];
		const touching: Filter | null = nearby.length
			? { ...base, $or: [{ departureAirport: { $in: nearby } }, { arrivalAirport: { $in: nearby } }] }
			: null;

		const limit = args.limit ?? TOOL_DEFAULT_LIMIT;
		const run = (match: Filter, sort: SortSpec) =>
			this.flightModel
				.find(match)
				.sort(sort)
				.limit(limit)
				.select(
					'airline flightNumber departureAirport arrivalAirport departureTime arrivalTime cabinClass availableSeats basePrice',
				)
				.lean()
				.exec();
		const { docs, match } = await searchWithFallback([
			{ filter: strict, run: () => run(strict, { departureTime: 1 }) },
			{ filter: routed, run: () => run(routed, { departureTime: 1 }) },
			...(reverse ? [{ filter: reverse, run: () => run(reverse, { departureTime: 1 }) }] : []),
			...(touching ? [{ filter: touching, run: () => run(touching, { departureTime: 1 }) }] : []),
			{ filter: base, run: () => run(base, { flightRank: -1, departureTime: 1 }) },
		]);
		const results = docs.map(toSafeFlight);
		return {
			output: describeResults(match, results),
			sources: results.map((f) => ({
				type: 'flight',
				title: `${f.flightNumber} ${f.from} → ${f.to}`,
				url: f.url,
				priceUsd: f.priceUsd,
			})),
		};
	}

	private async getMyBookings(args: GetMyBookingsArgs, context: ToolContext): Promise<ToolExecution> {
		// Identity comes only from the verified JWT; the tool takes no member id argument at all.
		if (!context.memberId) return { output: { error: 'login_required' }, sources: [] };
		const docs = await this.bookingModel
			.find({ memberId: context.memberId })
			.sort({ createdAt: -1 })
			.limit(args.limit ?? TOOL_DEFAULT_LIMIT)
			.select('bookingType bookingTitle bookingStatus bookingPrice checkInDate checkOutDate quantity createdAt')
			.lean()
			.exec();
		const results = docs.map(toSafeBooking);
		return { output: { count: results.length, results }, sources: [] };
	}
}

type Filter = Record<string, unknown>;
type SortSpec = Record<string, 1 | -1>;

/** How closely the returned listings match the request (the model must tell the user when it is not exact). */
export type MatchLevel = 'exact' | 'relaxed' | 'popular';

/** One query in a fallback chain: the filter (used to skip duplicates) and how to run it. */
type FallbackStep<T> = { filter: Filter; run: () => Promise<T[]> };

/**
 * Runs the queries from most to least specific and returns the first non-empty result, so a too-narrow
 * request (unknown city, tiny budget) still yields real listings instead of an empty answer.
 * Order: [strict filters, location only, …, popular]. A step whose filter equals an earlier one is skipped.
 */
export const searchWithFallback = async <T>(steps: FallbackStep<T>[]): Promise<{ docs: T[]; match: MatchLevel }> => {
	const tried = new Set<string>();
	let docs: T[] = [];
	for (let i = 0; i < steps.length; i++) {
		const key = JSON.stringify(steps[i].filter);
		if (tried.has(key)) continue;
		tried.add(key);
		docs = await steps[i].run();
		if (docs.length) return { docs, match: i === 0 ? 'exact' : i === steps.length - 1 ? 'popular' : 'relaxed' };
	}
	return { docs, match: 'exact' };
};

const MATCH_NOTES: Record<MatchLevel, string | undefined> = {
	exact: undefined,
	relaxed: 'No listing matched every filter; these match the place but not all other filters.',
	popular: 'Nothing matched the request; these are popular alternatives.',
};

const describeResults = (match: MatchLevel, results: unknown[]): Record<string, unknown> => {
	const note = MATCH_NOTES[match];
	return note ? { match, note, count: results.length, results } : { match, count: results.length, results };
};

/**
 * Trimmed, case-insensitive and whitespace-tolerant text filter: "  new   york, USA " matches "New York".
 * Only the part before a comma is used (models often append the country). Blank → null (no filter).
 */
export const textMatch = (value?: string): { $regex: string; $options: 'i' } | null => {
	const words = (value ?? '').split(',')[0].trim().split(/\s+/).filter(Boolean);
	if (!words.length) return null;
	return { $regex: words.map(escapeRegex).join('\\s+'), $options: 'i' };
};

const firstImage = (images: unknown): string | null =>
	Array.isArray(images) && typeof images[0] === 'string' && images[0] ? images[0] : null;

class ToolArgumentError extends Error {
	constructor(public readonly issues: string[]) {
		super('Invalid tool arguments');
	}
}

/** "TAS" → ["TAS"]; "seoul" → ["ICN"]; empty → null (no filter); unknown place → [] (matches nothing). */
const airportCodes = (value?: string): string[] | null => {
	const text = textMatch(value);
	if (!text) return null;
	const query = (value ?? '').split(',')[0].trim();
	if (/^[a-z]{3}$/i.test(query) && AIRPORT_CITIES[query.toUpperCase()]) return [query.toUpperCase()];
	const regex = new RegExp(text.$regex, text.$options);
	return Object.entries(AIRPORT_CITIES)
		.filter(([, city]) => regex.test(city))
		.map(([code]) => code);
};
