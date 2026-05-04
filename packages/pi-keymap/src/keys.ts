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
