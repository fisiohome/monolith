export interface AppointmentDraft {
	id: string;
	createdByAdmin: {
		id: string;
		name: string;
		email: string | null;
	};
	currentStep: string;
	stepIndex: number;
	nextStep: string | null;
	expiresAt: string;
	createdAt: string;
	updatedAt: string;
	adminPic?: {
		id: string;
		name: string;
		email: string | null;
	};
	admins?: Array<{
		id: string;
		name: string;
		email: string | null;
		isPrimary: boolean;
	}>;
}
