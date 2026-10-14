import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { RentcarCategory } from '../../../libs/enums/rentcar.enum';
import { FlightCabinClass } from '../../../libs/enums/flight.enum';

/**
 * Arguments the model may pass to each tool. They are validated with class-validator
 * (unknown keys rejected) before any database query runs — the model is untrusted input.
 */

export const TOOL_MAX_LIMIT = 20;
export const TOOL_DEFAULT_LIMIT = 5;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

class LimitedArgs {
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(TOOL_MAX_LIMIT)
	limit?: number;
}

export class SearchHotelsArgs extends LimitedArgs {
	@IsOptional()
	@IsString()
	@MaxLength(60)
	@Transform(trim)
	city?: string;

	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(100_000)
	maxPrice?: number;

	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(5)
	minStars?: number;
}

export class SearchToursArgs extends LimitedArgs {
	@IsOptional()
	@IsString()
	@MaxLength(60)
	@Transform(trim)
	location?: string;

	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(100_000)
	maxPrice?: number;

	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(60)
	maxDays?: number;
}

export class SearchRentcarsArgs extends LimitedArgs {
	@IsOptional()
	@IsString()
	@MaxLength(60)
	@Transform(trim)
	city?: string;

	@IsOptional()
	@IsIn(Object.values(RentcarCategory))
	category?: RentcarCategory;

	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(100_000)
	maxPricePerDay?: number;
}

export class SearchFlightsArgs extends LimitedArgs {
	@IsOptional()
	@IsString()
	@MaxLength(60)
	@Transform(trim)
	from?: string;

	@IsOptional()
	@IsString()
	@MaxLength(60)
	@Transform(trim)
	to?: string;

	/** YYYY-MM-DD */
	@IsOptional()
	@Matches(/^\d{4}-\d{2}-\d{2}$/)
	date?: string;

	@IsOptional()
	@IsIn(Object.values(FlightCabinClass))
	cabinClass?: FlightCabinClass;

	@IsOptional()
	@IsNumber()
	@Min(0)
	@Max(100_000)
	maxPrice?: number;
}

export class GetMyBookingsArgs extends LimitedArgs {}
