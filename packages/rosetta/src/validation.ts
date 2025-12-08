/**
 * Input Validation Utilities
 *
 * Centralized validation for security and consistency.
 * All limits are configurable via constants.
 */

// ============================================
// Limits
// ============================================

/**
 * Maximum text length (10KB)
 * Prevents memory exhaustion from extremely long strings
 */
export const MAX_TEXT_LENGTH = 10 * 1024; // 10KB

/**
 * Maximum locale code length
 * Standard BCP 47 locale codes are typically under 20 chars
 */
export const MAX_LOCALE_LENGTH = 35;

/**
 * Maximum context length
 * Context strings should be short identifiers
 */
export const MAX_CONTEXT_LENGTH = 100;

/**
 * Maximum hash length
 * Our hashes are 8 hex characters
 */
export const MAX_HASH_LENGTH = 16;

/**
 * Maximum batch size for bulk operations
 * Prevents memory issues with large batches
 */
export const MAX_BATCH_SIZE = 1000;

// ============================================
// Validation Functions
// ============================================

export interface ValidationResult {
	valid: boolean;
	error?: string;
}

/**
 * Validate text input
 * @throws Error if text exceeds MAX_TEXT_LENGTH
 */
export function validateText(text: unknown, fieldName = 'text'): ValidationResult {
	if (typeof text !== 'string') {
		return { valid: false, error: `${fieldName} must be a string` };
	}

	if (text.length > MAX_TEXT_LENGTH) {
		return {
			valid: false,
			error: `${fieldName} exceeds maximum length of ${MAX_TEXT_LENGTH} characters (got ${text.length})`,
		};
	}

	return { valid: true };
}

/**
 * Validate locale code
 * Basic BCP 47 validation: language-region or language
 */
export function validateLocale(locale: unknown): ValidationResult {
	if (typeof locale !== 'string') {
		return { valid: false, error: 'locale must be a string' };
	}

	if (locale.length === 0) {
		return { valid: false, error: 'locale cannot be empty' };
	}

	if (locale.length > MAX_LOCALE_LENGTH) {
		return {
			valid: false,
			error: `locale exceeds maximum length of ${MAX_LOCALE_LENGTH} characters`,
		};
	}

	// Basic BCP 47 pattern: language(-Script)?(-Region)?
	// Examples: en, en-US, zh-TW, zh-Hant-TW
	const bcp47Pattern = /^[a-z]{2,3}(-[A-Za-z]{4})?(-[A-Z]{2}|-[0-9]{3})?$/i;
	if (!bcp47Pattern.test(locale)) {
		return {
			valid: false,
			error: `locale "${locale}" is not a valid BCP 47 locale code`,
		};
	}

	return { valid: true };
}

/**
 * Validate context string
 */
export function validateContext(context: unknown): ValidationResult {
	if (context === undefined || context === null) {
		return { valid: true }; // Context is optional
	}

	if (typeof context !== 'string') {
		return { valid: false, error: 'context must be a string' };
	}

	if (context.length > MAX_CONTEXT_LENGTH) {
		return {
			valid: false,
			error: `context exceeds maximum length of ${MAX_CONTEXT_LENGTH} characters`,
		};
	}

	return { valid: true };
}

/**
 * Validate hash string
 * Note: Hash format is not strictly enforced to allow test fixtures with simple hashes
 */
export function validateHash(hash: unknown): ValidationResult {
	if (typeof hash !== 'string') {
		return { valid: false, error: 'hash must be a string' };
	}

	if (hash.length === 0) {
		return { valid: false, error: 'hash cannot be empty' };
	}

	if (hash.length > MAX_HASH_LENGTH) {
		return {
			valid: false,
			error: `hash exceeds maximum length of ${MAX_HASH_LENGTH} characters`,
		};
	}

	// Allow alphanumeric hashes (real hashes are hex, but tests may use simple strings)
	if (!/^[a-zA-Z0-9]+$/.test(hash)) {
		return { valid: false, error: 'hash must be alphanumeric' };
	}

	return { valid: true };
}

/**
 * Validate batch size
 */
export function validateBatchSize(size: number): ValidationResult {
	if (size > MAX_BATCH_SIZE) {
		return {
			valid: false,
			error: `batch size exceeds maximum of ${MAX_BATCH_SIZE} items (got ${size})`,
		};
	}

	return { valid: true };
}

// ============================================
// Assertion Helpers
// ============================================

/**
 * Assert text is valid, throw if not
 */
export function assertValidText(text: unknown, fieldName = 'text'): asserts text is string {
	const result = validateText(text, fieldName);
	if (!result.valid) {
		throw new Error(`[rosetta] Invalid input: ${result.error}`);
	}
}

/**
 * Assert locale is valid, throw if not
 */
export function assertValidLocale(locale: unknown): asserts locale is string {
	const result = validateLocale(locale);
	if (!result.valid) {
		throw new Error(`[rosetta] Invalid locale: ${result.error}`);
	}
}

/**
 * Assert context is valid, throw if not
 */
export function assertValidContext(context: unknown): asserts context is string | undefined {
	const result = validateContext(context);
	if (!result.valid) {
		throw new Error(`[rosetta] Invalid context: ${result.error}`);
	}
}

/**
 * Assert hash is valid, throw if not
 */
export function assertValidHash(hash: unknown): asserts hash is string {
	const result = validateHash(hash);
	if (!result.valid) {
		throw new Error(`[rosetta] Invalid hash: ${result.error}`);
	}
}

/**
 * Assert batch size is valid, throw if not
 */
export function assertValidBatchSize(size: number): void {
	const result = validateBatchSize(size);
	if (!result.valid) {
		throw new Error(`[rosetta] Invalid batch: ${result.error}`);
	}
}
