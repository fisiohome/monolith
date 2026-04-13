export interface FormData {
	[key: string]: any;
}

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
	status?: string;
	statusReason?: string;
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
	formData: FormData;
	patientRecordSource?: string;
	patientContactSource?: string;
}
