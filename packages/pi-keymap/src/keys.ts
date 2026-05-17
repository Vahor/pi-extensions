// TODO: check if pi has a method to do this

/** Set of valid named/special keys (non-letter, non-digit KeyId values) */
const NAMED_KEYS = new Set([
	"escape",
	"esc",
	"enter",
	"return",
	"tab",
	"space",
	"backspace",
	"delete",
	"insert",
	"clear",
	"home",
	"end",
	"pageUp",
	"pageDown",
	"up",
	"down",
	"left",
	"right",
	"f1",
	"f2",
	"f3",
	"f4",
	"f5",
	"f6",
	"f7",
	"f8",
	"f9",
	"f10",
	"f11",
	"f12",
	"`",
	"-",
	"=",
	"[",
	"]",
	"\\",
	";",
	"'",
	",",
	".",
	"/",
	"!",
	"@",
	"#",
	"$",
	"%",
	"^",
	"&",
	"*",
	"(",
	")",
	"_",
	"+",
	"|",
	"~",
	"{",
	"}",
	":",
	"<",
	">",
	"?",
]);

const VALID_MODIFIERS = new Set(["ctrl", "shift", "alt", "super"]);
const SHIFT_PREFIX = "shift+";

function isLowercaseLetter(value: string | undefined): value is string {
	if (value === undefined) return false;
	const code = value.charCodeAt(0);
	return code >= 97 && code <= 122;
}

export function parseLeaderKeySegments(key: string): string[] {
	const segments: string[] = [];

	for (let i = 0; i < key.length; ) {
		const shiftedLetterIndex = i + SHIFT_PREFIX.length;
		const shiftedLetter = key[shiftedLetterIndex];
		if (key.startsWith(SHIFT_PREFIX, i) && isLowercaseLetter(shiftedLetter)) {
			segments.push(`${SHIFT_PREFIX}${shiftedLetter}`);
			i = shiftedLetterIndex + 1;
			continue;
		}

		const segment = key[i];
		if (segment !== undefined) segments.push(segment);
		i++;
	}

	return segments;
}

export function formatLeaderKeySegment(segment: string): string {
	if (segment.length !== SHIFT_PREFIX.length + 1) return segment;
	if (!segment.startsWith(SHIFT_PREFIX)) return segment;

	const letter = segment[SHIFT_PREFIX.length];
	return isLowercaseLetter(letter) ? letter.toUpperCase() : segment;
}

export function formatLeaderKeyPath(path: string): string {
	return parseLeaderKeySegments(path).map(formatLeaderKeySegment).join("");
}

/**
 * Check if a key string is a valid KeyId.
 * Accepts: single letters (a-z), digits (0-9), named keys (enter, space, f1-f12...),
 * symbol keys, and modifier combos (ctrl+x, shift+tab, ctrl+shift+p).
 */
export function isValidKey(key: string): boolean {
	if (key.length === 0) return false;

	if (key.length === 1) {
		const code = key.charCodeAt(0);
		if ((code >= 97 && code <= 122) || (code >= 48 && code <= 57)) return true;
		return NAMED_KEYS.has(key);
	}

	if (!key.includes("+")) return NAMED_KEYS.has(key);

	const parts = key.split("+");
	const lastIdx = parts.length - 1;
	if (lastIdx < 1 || lastIdx > 3) return false;

	for (let i = 0; i < lastIdx; i++) {
		const mod = parts[i];
		if (!mod || !VALID_MODIFIERS.has(mod)) return false;
	}

	const base = parts[lastIdx];
	return base !== undefined && isValidKey(base);
}
