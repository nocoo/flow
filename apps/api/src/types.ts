export interface ProviderConfig {
	baseURL: string;
	apiKey: string;
	modelId: string;
}

export interface Settings {
	activeProvider: "local" | "cloud";
	local: ProviderConfig;
	cloud: ProviderConfig;
}

export const DEFAULT_SETTINGS: Settings = {
	activeProvider: "local",
	local: {
		baseURL: "http://localhost:8000/v1",
		apiKey: "tongji",
		modelId: "Qwen3.5-2B-6bit",
	},
	cloud: {
		baseURL: "https://aihubmix.com/v1",
		apiKey: "",
		modelId: "gpt-4o-mini",
	},
};

export type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
