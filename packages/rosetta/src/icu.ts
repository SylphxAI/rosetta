/**
 * Shared ICU MessageFormat implementation
 *
 * Used by both server and client for consistent behavior.
 * Tree-shakeable: only import what you need.
 *
 * @example
 * ```ts
 * import { formatMessage, createPluralRulesCache } from '@sylphx/rosetta/icu';
 *
 * const cache = createPluralRulesCache({ maxSize: 20 });
 * const result = formatMessage(text, params, { locale: 'zh-TW', pluralRulesCache: cache });
 * ```
 */

import { interpolate } from './interpolate';

// ============================================
// Constants
// ============================================

/** Maximum ICU nesting depth (prevents DoS via deeply nested patterns) */
export const MAX_ICU_NESTING_DEPTH = 5;

/** Maximum text length in characters */
export const MAX_TEXT_LENGTH = 50_000;

/** Maximum iterations for ICU parsing loop */
export const MAX_ICU_ITERATIONS = 100;

// ============================================
// Types
// ============================================

export interface PluralRulesCache {
	get(locale: string): Intl.PluralRules | undefined;
	set(locale: string, rules: Intl.PluralRules): void;
	clear(): void;
	readonly size: number;
}

export interface FormatMessageOptions {
	/** Current locale for plural rules */
	locale?: string;
	/** Optional PluralRules cache for performance */
	pluralRulesCache?: PluralRulesCache;
	/** Custom error handler (default: console.error) */
	onError?: (error: Error, context: string) => void;
}

export interface PluralRulesCacheOptions {
	/** Maximum cache size (default: 20) */
	maxSize?: number;
}

// ============================================
// PluralRules Cache Factory
// ============================================

/**
 * Create a PluralRules cache with LRU eviction
 *
 * @example
 * ```ts
 * // Server: larger cache, shared across requests
 * const serverCache = createPluralRulesCache({ maxSize: 50 });
 *
 * // Client: smaller cache, per-session
 * const clientCache = createPluralRulesCache({ maxSize: 10 });
 * ```
 */
export function createPluralRulesCache(options?: PluralRulesCacheOptions): PluralRulesCache {
	const maxSize = options?.maxSize ?? 20;
	const cache = new Map<string, Intl.PluralRules>();

	return {
		get(locale: string): Intl.PluralRules | undefined {
			const rules = cache.get(locale);
			if (rules) {
				// LRU: move to end (most recently used)
				cache.delete(locale);
				cache.set(locale, rules);
			}
			return rules;
		},

		set(locale: string, rules: Intl.PluralRules): void {
			// Evict oldest if at capacity
			if (cache.size >= maxSize && !cache.has(locale)) {
				const oldest = cache.keys().next().value;
				if (oldest) cache.delete(oldest);
			}
			cache.set(locale, rules);
		},

		clear(): void {
			cache.clear();
		},

		get size(): number {
			return cache.size;
		},
	};
}

// ============================================
// Plural Category
// ============================================

/**
 * Get CLDR plural category for a number
 *
 * Uses Intl.PluralRules with optional caching.
 * Falls back to simple one/other for environments without Intl.
 */
export function getPluralCategory(
	count: number,
	locale: string = 'en',
	cache?: PluralRulesCache
): Intl.LDMLPluralRule {
	// Fallback for environments without Intl
	if (typeof Intl === 'undefined' || !Intl.PluralRules) {
		return count === 1 ? 'one' : 'other';
	}

	// Try cache first
	let rules = cache?.get(locale);

	if (!rules) {
		try {
			rules = new Intl.PluralRules(locale);
			cache?.set(locale, rules);
		} catch {
			// Invalid locale - fallback to 'en'
			rules = cache?.get('en');
			if (!rules) {
				rules = new Intl.PluralRules('en');
				cache?.set('en', rules);
			}
		}
	}

	return rules.select(count);
}

// ============================================
// ICU MessageFormat Parser
// ============================================

/**
 * Format message with ICU MessageFormat support
 *
 * Supports:
 * - Simple interpolation: `{name}`
 * - Pluralization: `{count, plural, one {# item} other {# items}}`
 * - Selection: `{gender, select, male {He} female {She} other {They}}`
 *
 * Security features:
 * - Depth limiting (max 5 levels)
 * - Iteration limiting (max 100 iterations)
 * - Text length limiting (max 50KB)
 *
 * @example
 * ```ts
 * formatMessage("Hello {name}", { name: "World" });
 * // → "Hello World"
 *
 * formatMessage("{count, plural, one {# item} other {# items}}", { count: 5 }, { locale: 'en' });
 * // → "5 items"
 * ```
 */
export function formatMessage(
	text: string,
	params?: Record<string, string | number>,
	options?: FormatMessageOptions
): string {
	if (!params) return text;

	// Safety: Limit text length
	if (text.length > MAX_TEXT_LENGTH) {
		options?.onError?.(
			new Error(`Text exceeds ${MAX_TEXT_LENGTH} characters`),
			'formatMessage'
		);
		text = text.slice(0, MAX_TEXT_LENGTH);
	}

	// Check for ICU patterns
	if (text.includes(', plural,') || text.includes(', select,')) {
		try {
			return formatICU(text, params, 0, options);
		} catch (error) {
			options?.onError?.(error as Error, 'formatICU');
			// Fallback to simple interpolation
			return interpolate(text, params);
		}
	}

	// Simple interpolation
	return interpolate(text, params);
}

/**
 * Parse and format ICU MessageFormat patterns
 *
 * @internal
 */
function formatICU(
	text: string,
	params: Record<string, string | number>,
	depth: number,
	options?: FormatMessageOptions
): string {
	// Security: Prevent deeply nested patterns
	if (depth > MAX_ICU_NESTING_DEPTH) {
		throw new Error(`Max ICU nesting depth (${MAX_ICU_NESTING_DEPTH}) exceeded`);
	}

	let result = text;
	let startIndex = 0;
	let iterations = 0;

	while (startIndex < result.length && iterations < MAX_ICU_ITERATIONS) {
		iterations++;

		// Find pattern: {varName, plural/select,
		const patternMatch = result.slice(startIndex).match(/\{(\w+),\s*(plural|select),\s*/);
		if (!patternMatch || patternMatch.index === undefined) break;

		const matchStart = startIndex + patternMatch.index;
		const varName = patternMatch[1]!;
		const type = patternMatch[2] as 'plural' | 'select';
		const optionsStart = matchStart + patternMatch[0].length;

		// Find matching closing brace
		const matchEnd = findClosingBrace(result, optionsStart, depth);
		if (matchEnd === -1) {
			startIndex = matchStart + 1;
			continue;
		}

		const optionsStr = result.slice(optionsStart, matchEnd - 1);
		const value = params[varName];

		if (value === undefined) {
			startIndex = matchEnd;
			continue;
		}

		// Parse and select appropriate option
		const optionMap = parseICUOptions(optionsStr);
		let replacement: string;

		if (type === 'plural') {
			replacement = selectPluralOption(optionMap, Number(value), options);
		} else {
			replacement = selectOption(optionMap, String(value));
		}

		// Fallback to original if no match
		if (replacement === undefined) {
			startIndex = matchEnd;
			continue;
		}

		// Recursively format nested patterns
		if (replacement.includes(', plural,') || replacement.includes(', select,')) {
			replacement = formatICU(replacement, params, depth + 1, options);
		}

		// Replace and continue
		result = result.slice(0, matchStart) + replacement + result.slice(matchEnd);
		startIndex = matchStart + replacement.length;
	}

	// Final simple interpolation for remaining {var} patterns
	return interpolate(result, params);
}

/**
 * Find the closing brace for an ICU pattern
 *
 * @internal
 */
function findClosingBrace(text: string, start: number, depth: number): number {
	let braceCount = 1;
	let braceDepth = 1;
	let i = start;

	while (i < text.length && braceCount > 0) {
		if (text[i] === '{') {
			braceCount++;
			braceDepth++;
			// Security: Check nesting depth during parsing
			if (braceDepth > MAX_ICU_NESTING_DEPTH) {
				return -1; // Signal too deep
			}
		} else if (text[i] === '}') {
			braceCount--;
			braceDepth--;
		}
		i++;
	}

	return braceCount === 0 ? i : -1;
}

/**
 * Parse ICU options string into a map
 *
 * Handles: `one {text} other {text}` or `=0 {text} =1 {text}`
 *
 * @internal
 */
function parseICUOptions(options: string): Record<string, string> {
	const result: Record<string, string> = {};
	let i = 0;

	while (i < options.length) {
		// Skip whitespace
		while (i < options.length && /\s/.test(options[i]!)) i++;
		if (i >= options.length) break;

		// Find key (word or =N)
		const keyMatch = options.slice(i).match(/^([\w=]+)\s*\{/);
		if (!keyMatch) break;

		const key = keyMatch[1]!;
		i += keyMatch[0].length;

		// Find matching closing brace
		let braceCount = 1;
		const valueStart = i;
		while (i < options.length && braceCount > 0) {
			if (options[i] === '{') braceCount++;
			else if (options[i] === '}') braceCount--;
			i++;
		}

		if (braceCount === 0) {
			result[key] = options.slice(valueStart, i - 1);
		}
	}

	return result;
}

/**
 * Select plural option based on count
 *
 * @internal
 */
function selectPluralOption(
	optionMap: Record<string, string>,
	count: number,
	options?: FormatMessageOptions
): string {
	// Try exact match first (=0, =1, etc.)
	const exactKey = `=${count}`;
	if (optionMap[exactKey]) {
		return replaceHash(optionMap[exactKey]!, count);
	}

	// Then try plural category
	const category = getPluralCategory(
		count,
		options?.locale ?? 'en',
		options?.pluralRulesCache
	);

	const template = optionMap[category] ?? optionMap.other;
	return template ? replaceHash(template, count) : '';
}

/**
 * Select option for select patterns
 *
 * @internal
 */
function selectOption(optionMap: Record<string, string>, value: string): string {
	return optionMap[value] ?? optionMap.other ?? '';
}

/**
 * Replace # with count in plural templates
 *
 * Uses replacer function to avoid $ interpretation security issue.
 *
 * @internal
 */
function replaceHash(template: string, count: number): string {
	return template.replace(/#/g, () => String(count));
}
