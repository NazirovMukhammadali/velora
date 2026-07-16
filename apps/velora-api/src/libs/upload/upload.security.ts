import { BadRequestException } from '@nestjs/common';
import { createWriteStream, mkdirSync } from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '../enums/common.enum';

/** Targets currently used by the Velora frontend upload flows. */
export const ALLOWED_UPLOAD_TARGETS = ['member', 'article'] as const;
export type AllowedUploadTarget = (typeof ALLOWED_UPLOAD_TARGETS)[number];

export const MAX_UPLOAD_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_UPLOAD_MIME_TYPES = ['image/png', 'image/jpg', 'image/jpeg'] as const;

type DetectedImage = {
	ext: '.jpg' | '.png';
	mime: 'image/jpeg' | 'image/png';
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const isAllowedTarget = (target: string): target is AllowedUploadTarget =>
	(ALLOWED_UPLOAD_TARGETS as readonly string[]).includes(target);

export const normalizeClientMime = (mimetype: string): string =>
	mimetype === 'image/jpg' ? 'image/jpeg' : mimetype;

export const assertSafeUploadTarget = (target: string): AllowedUploadTarget => {
	if (
		!target ||
		typeof target !== 'string' ||
		target.includes('..') ||
		target.includes('/') ||
		target.includes('\\') ||
		target.includes('\0') ||
		!isAllowedTarget(target)
	) {
		throw new BadRequestException(Message.INVALID_UPLOAD_TARGET);
	}

	return target;
};

export const assertSafeClientFilename = (filename: string): void => {
	if (!filename || typeof filename !== 'string') {
		throw new BadRequestException(Message.UPLOAD_FAILED);
	}

	if (filename.includes('..') || filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
		throw new BadRequestException(Message.UNSAFE_FILENAME);
	}
};

export const assertAllowedClientMime = (mimetype: string): void => {
	if (!(ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(mimetype)) {
		throw new BadRequestException(Message.PROVIDE_ALLOWED_FORMAT);
	}
};

export const detectImageFromBuffer = (buffer: Buffer): DetectedImage | null => {
	if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
		return { ext: '.jpg', mime: 'image/jpeg' };
	}

	if (buffer.length >= PNG_SIGNATURE.length && buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
		return { ext: '.png', mime: 'image/png' };
	}

	return null;
};

export const createServerUploadFilename = (ext: DetectedImage['ext']): string => `${uuidv4()}${ext}`;

export const getUploadsRoot = (): string => path.resolve(process.cwd(), 'uploads');

export const resolveSafeUploadPath = (
	target: AllowedUploadTarget,
	filename: string,
): { absolutePath: string; relativeUrl: string } => {
	const uploadsRoot = getUploadsRoot();
	const targetDir = path.resolve(uploadsRoot, target);
	const absolutePath = path.resolve(targetDir, filename);

	if (!targetDir.startsWith(uploadsRoot + path.sep) || !absolutePath.startsWith(targetDir + path.sep)) {
		throw new BadRequestException(Message.INVALID_UPLOAD_TARGET);
	}

	return {
		absolutePath,
		relativeUrl: path.posix.join('uploads', target, filename),
	};
};

export const ensureUploadDirectory = (target: AllowedUploadTarget): string => {
	const uploadsRoot = getUploadsRoot();
	const targetDir = path.resolve(uploadsRoot, target);

	if (!targetDir.startsWith(uploadsRoot + path.sep)) {
		throw new BadRequestException(Message.INVALID_UPLOAD_TARGET);
	}

	mkdirSync(targetDir, { recursive: true });
	return targetDir;
};

export const readUploadToBuffer = (
	createReadStream: () => Readable,
	maxBytes: number = MAX_UPLOAD_FILE_SIZE,
): Promise<Buffer> => {
	const stream = createReadStream();
	const chunks: Buffer[] = [];
	let total = 0;

	return new Promise((resolve, reject) => {
		const fail = (error: Error) => {
			stream.destroy();
			reject(error);
		};

		stream.on('data', (chunk: Buffer | string) => {
			const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
			total += data.length;

			if (total > maxBytes) {
				fail(new BadRequestException(Message.FILE_TOO_LARGE));
				return;
			}

			chunks.push(data);
		});

		stream.on('error', (err: Error) => {
			reject(err instanceof Error ? err : new Error(Message.UPLOAD_FAILED));
		});

		stream.on('end', () => {
			resolve(Buffer.concat(chunks));
		});
	});
};

export const writeBufferToFile = (absolutePath: string, buffer: Buffer): Promise<void> =>
	new Promise((resolve, reject) => {
		const writeStream = createWriteStream(absolutePath);

		writeStream.on('finish', () => resolve());
		writeStream.on('error', (err: Error) => {
			reject(err instanceof Error ? err : new Error(Message.UPLOAD_FAILED));
		});

		writeStream.end(buffer);
	});

export type SecureUploadInput = {
	filename: string;
	mimetype: string;
	createReadStream: () => Readable;
	target: string;
};

/**
 * Validates target, filename, MIME, size, and file signature, then stores with a server-owned name.
 * Returns the relative URL path (e.g. uploads/member/<uuid>.png).
 */
export const saveSecureImageUpload = async (input: SecureUploadInput): Promise<string> => {
	const safeTarget = assertSafeUploadTarget(input.target);
	assertSafeClientFilename(input.filename);
	assertAllowedClientMime(input.mimetype);

	const buffer = await readUploadToBuffer(input.createReadStream, MAX_UPLOAD_FILE_SIZE);
	if (!buffer.length) {
		throw new BadRequestException(Message.UPLOAD_FAILED);
	}

	const detected = detectImageFromBuffer(buffer);
	if (!detected) {
		throw new BadRequestException(Message.PROVIDE_ALLOWED_FORMAT);
	}

	const normalizedMime = normalizeClientMime(input.mimetype);
	if (normalizedMime !== detected.mime) {
		throw new BadRequestException(Message.PROVIDE_ALLOWED_FORMAT);
	}

	ensureUploadDirectory(safeTarget);
	const serverFilename = createServerUploadFilename(detected.ext);
	const { absolutePath, relativeUrl } = resolveSafeUploadPath(safeTarget, serverFilename);
	await writeBufferToFile(absolutePath, buffer);

	return relativeUrl;
};
