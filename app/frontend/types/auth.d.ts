export type User = {
	id: number;
	email: string;
	lastOnlineAt: string | null;
	lastSignInAt: string | null;
	currentSignInIp: string | null;
	lastSignInIp: string | null;
	"isOnline?": boolean;
};
