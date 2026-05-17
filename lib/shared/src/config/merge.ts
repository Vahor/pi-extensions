const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

type KeyedSetting = Record<string, unknown> & { key: string };

const isKeyedSetting = (value: unknown): value is KeyedSetting =>
	isRecord(value) && typeof value.key === "string";

const isKeyedSettingsArray = (value: unknown): value is KeyedSetting[] =>
	Array.isArray(value) && value.every(isKeyedSetting);

const mergeKeyedSettings = (
	a: KeyedSetting[],
	b: KeyedSetting[],
): KeyedSetting[] => {
	const result = new Map(a.map((setting) => [setting.key, setting]));
	for (const setting of b) {
		result.set(setting.key, setting);
	}
	return Array.from(result.values());
};

export const mergeSettings = (
	a: Record<string, unknown>,
	b: Record<string, unknown>,
): Record<string, unknown> => {
	const result = { ...a };
	for (const key of Object.keys(b)) {
		const aVal = result[key];
		const bVal = b[key];
		if (
			key === "keymaps" &&
			isKeyedSettingsArray(aVal) &&
			isKeyedSettingsArray(bVal)
		) {
			result[key] = mergeKeyedSettings(aVal, bVal);
		} else if (isRecord(aVal) && isRecord(bVal)) {
			result[key] = mergeSettings(aVal, bVal);
		} else {
			result[key] = bVal;
		}
	}
	return result;
};
