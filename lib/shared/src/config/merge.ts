const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

export const mergeSettings = (
	a: Record<string, unknown>,
	b: Record<string, unknown>,
): Record<string, unknown> => {
	const result = { ...a };
	for (const key of Object.keys(b)) {
		const aVal = result[key];
		const bVal = b[key];
		if (isRecord(aVal) && isRecord(bVal)) {
			result[key] = mergeSettings(aVal, bVal);
		} else {
			result[key] = bVal;
		}
	}
	return result;
};
