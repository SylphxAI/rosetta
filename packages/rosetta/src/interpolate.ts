/**
 * Replace {key} placeholders with values
 *
 * Uses single-pass regex replacement for O(n) performance.
 * Previous implementation used replaceAll in loop which was O(m×n).
 *
 * @param text - Text with placeholders
 * @param params - Key-value pairs to interpolate
 * @returns Text with placeholders replaced
 *
 * @example
 * interpolate("Hello {name}", { name: "World" }) // "Hello World"
 * interpolate("You have {count} items", { count: 5 }) // "You have 5 items"
 */
export function interpolate(text: string, params?: Record<string, string | number>): string {
	if (!params) return text;

	// Single-pass replacement: O(n) instead of O(m×n)
	return text.replace(/\{([^}]+)\}/g, (match, key: string) => {
		const value = params[key];
		return value !== undefined ? String(value) : match;
	});
}
