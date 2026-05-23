const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

type KeyedSetting = Record<string, unknown> & { key: string };

const isKeyedSetting = (value: unknown): value is KeyedSetting =>
	isRecord(value) && typeof value.key === "string";

const isKeyedSettingsArray = (value: unknown): value is KeyedSetting[] =>
	Array.isArray(value) && value.every(isKeyedSetting);

const mergeKeyedSettings = (
	base: KeyedSetting[],
	override: KeyedSetting[],
): KeyedSetting[] => {
	const result = new Map(base.map((setting) => [setting.key, setting]));
	for (const setting of override) {
		result.set(setting.key, setting);
	}
	return Array.from(result.values());
};

export const mergeSettings = (
	base: Record<string, unknown>,
	override: Record<string, unknown>,
): Record<string, unknown> => {
	const result = { ...base };
	for (const key of Object.keys(override)) {
		const baseValue = result[key];
		const overrideValue = override[key];
		if (
			isKeyedSettingsArray(baseValue) &&
			isKeyedSettingsArray(overrideValue)
		) {
			result[key] = mergeKeyedSettings(baseValue, overrideValue);
		} else if (isRecord(baseValue) && isRecord(overrideValue)) {
			result[key] = mergeSettings(baseValue, overrideValue);
		} else {
			result[key] = overrideValue;
		}
	}
	return result;
};
