import { registerEnumType } from '@nestjs/graphql';

export enum Message {
	SOMETHING_WENT_WRONG = 'Something went wrong!',
	NO_DATA_FOUND = 'No data is found!',
	CREATE_FAILED = 'Create is failed!',
	UPDATE_FAILED = 'Update is failed!',
	REMOVE_FAILED = 'Remove failed!',
	UPLOAD_FAILED = 'Upload failed',
	INVALID_UPLOAD_TARGET = 'Invalid upload target!',
	FILE_TOO_LARGE = 'File is too large! Maximum size is 5MB.',
	UNSAFE_FILENAME = 'Unsafe filename is not allowed!',
	BAD_REQUEST = 'BAD_REQUEST!',

	USED_MEMBER_NICK_OR_PHONE = 'Already used member nick or phone!',
	NO_MEMBER_NICK = 'No member with that member nick!',
	BLOCKED_USER = 'You have been blocked, contact the restaurant!',
	WRONG_PASSWORD = 'Wrong password, please try again!',
	NOT_AUTHENTICATED = 'You are not authenticated, Please login first!',
	TOKEN_NOT_EXIST = 'Bearer Token is not provided!',
	ONLY_SPECIFIC_ROLES_ALLOWED = 'Allowed only for members with specific roles!',
	NOT_ALLOWED_REQUEST = 'Not Allowed Request!',
	ONLY_USER_OR_AGENT_SIGNUP = 'Public signup allows only USER or AGENT!',
	PASSWORD_UPDATE_NOT_ALLOWED = 'Password cannot be updated here. Use changePassword instead!',
	PROVIDE_ALLOWED_FORMAT = 'Please provide jpg, jpeg or png images!',
	SELF_SUBSCRIPTION_DENIED = 'Self subscription is denied!',
}

export enum Direction {
	ASC = 1,
	DESC = -1,
}
registerEnumType(Direction, { name: 'Direction' });
