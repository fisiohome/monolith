export type FeatureFlagEnv = "DEV" | "STAGING" | "PROD";

export interface FeatureFlag {
	key: string;
	env: FeatureFlagEnv;
	isEnabled: boolean;
	createdAt: string;
	updatedAt: string;
}
