import { BadRequestException } from '@nestjs/common';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';
import { Message } from '../enums/common.enum';
import {
	MAX_UPLOAD_FILE_SIZE,
	assertSafeClientFilename,
	assertSafeUploadTarget,
	detectImageFromBuffer,
	saveSecureImageUpload,
} from './upload.security';

jest.mock('uuid', () => ({
	v4: jest.fn(() => '11111111-2222-3333-4444-555555555555'),
}));

const PNG_BUFFER = Buffer.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00,
	0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49,
	0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xfe, 0xd4,
	0xef, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

const JPEG_BUFFER = Buffer.from([
	0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
	0x00, 0xff, 0xd9,
]);

const createMemoryStream = (buffer: Buffer) => () => Readable.from(buffer);

describe('upload.security', () => {
	let tempRoot: string;
	let previousCwd: string;

	beforeEach(() => {
		previousCwd = process.cwd();
		tempRoot = mkdtempSync(path.join(os.tmpdir(), 'velora-upload-'));
		process.chdir(tempRoot);
		mkdirSync(path.join(tempRoot, 'uploads'), { recursive: true });
	});

	afterEach(() => {
		process.chdir(previousCwd);
		rmSync(tempRoot, { recursive: true, force: true });
	});

	it('rejects invalid upload target', async () => {
		expect(() => assertSafeUploadTarget('../etc')).toThrow(BadRequestException);
		expect(() => assertSafeUploadTarget('property')).toThrow(BadRequestException);

		await expect(
			saveSecureImageUpload({
				filename: 'avatar.png',
				mimetype: 'image/png',
				createReadStream: createMemoryStream(PNG_BUFFER),
				target: 'admin',
			}),
		).rejects.toEqual(new BadRequestException(Message.INVALID_UPLOAD_TARGET));
	});

	it('rejects path traversal and unsafe filenames', () => {
		expect(() => assertSafeClientFilename('../secret.png')).toThrow(
			new BadRequestException(Message.UNSAFE_FILENAME),
		);
		expect(() => assertSafeClientFilename('folder/file.png')).toThrow(
			new BadRequestException(Message.UNSAFE_FILENAME),
		);
		expect(() => assertSafeUploadTarget('member/../article')).toThrow(
			new BadRequestException(Message.INVALID_UPLOAD_TARGET),
		);
	});

	it('rejects oversized files', async () => {
		const oversized = Buffer.concat([JPEG_BUFFER, Buffer.alloc(MAX_UPLOAD_FILE_SIZE)]);

		await expect(
			saveSecureImageUpload({
				filename: 'huge.jpg',
				mimetype: 'image/jpeg',
				createReadStream: createMemoryStream(oversized),
				target: 'member',
			}),
		).rejects.toEqual(new BadRequestException(Message.FILE_TOO_LARGE));
	});

	it('rejects fake MIME when content signature does not match', async () => {
		const textPosingAsPng = Buffer.from('not-an-image');

		await expect(
			saveSecureImageUpload({
				filename: 'fake.png',
				mimetype: 'image/png',
				createReadStream: createMemoryStream(textPosingAsPng),
				target: 'article',
			}),
		).rejects.toEqual(new BadRequestException(Message.PROVIDE_ALLOWED_FORMAT));

		// Client claims PNG but bytes are JPEG.
		await expect(
			saveSecureImageUpload({
				filename: 'mismatch.png',
				mimetype: 'image/png',
				createReadStream: createMemoryStream(JPEG_BUFFER),
				target: 'article',
			}),
		).rejects.toEqual(new BadRequestException(Message.PROVIDE_ALLOWED_FORMAT));
	});

	it('accepts a valid PNG image with server-owned filename', async () => {
		expect(detectImageFromBuffer(PNG_BUFFER)).toEqual({ ext: '.png', mime: 'image/png' });

		const relativeUrl = await saveSecureImageUpload({
			filename: 'client-name.png',
			mimetype: 'image/png',
			createReadStream: createMemoryStream(PNG_BUFFER),
			target: 'member',
		});

		expect(relativeUrl).toBe('uploads/member/11111111-2222-3333-4444-555555555555.png');
		const absolutePath = path.join(tempRoot, relativeUrl);
		expect(readFileSync(absolutePath)).toEqual(PNG_BUFFER);
	});

	it('accepts a valid JPEG image', async () => {
		const relativeUrl = await saveSecureImageUpload({
			filename: 'photo.jpg',
			mimetype: 'image/jpeg',
			createReadStream: createMemoryStream(JPEG_BUFFER),
			target: 'article',
		});

		expect(relativeUrl).toBe('uploads/article/11111111-2222-3333-4444-555555555555.jpg');
		expect(readFileSync(path.join(tempRoot, relativeUrl))).toEqual(JPEG_BUFFER);
	});

	it('creates target directories safely under uploads root', async () => {
		await saveSecureImageUpload({
			filename: 'ok.png',
			mimetype: 'image/png',
			createReadStream: createMemoryStream(PNG_BUFFER),
			target: 'member',
		});

		const marker = path.join(tempRoot, 'uploads', 'member', '.keep');
		writeFileSync(marker, 'ok');
		expect(readFileSync(marker, 'utf8')).toBe('ok');
	});
});
