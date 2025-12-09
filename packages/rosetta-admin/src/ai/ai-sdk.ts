/**
 * AI SDK translator
 *
 * Uses Vercel AI SDK's generateObject for structured translation output.
 * Works with any AI SDK provider (OpenRouter, Anthropic, OpenAI, Google, etc.)
 *
 * @example
 * ```ts
 * import { createAiSdkTranslator } from '@sylphx/rosetta-admin/ai';
 * import { createOpenRouter } from '@openrouter/ai-sdk-provider';
 *
 * const openrouter = createOpenRouter({
 *   apiKey: process.env.OPENROUTER_API_KEY!,
 * });
 *
 * const translator = createAiSdkTranslator({
 *   model: openrouter('anthropic/claude-sonnet-4'),
 * });
 * ```
 *
 * @example
 * ```ts
 * // With Anthropic directly
 * import { createAiSdkTranslator } from '@sylphx/rosetta-admin/ai';
 * import { anthropic } from '@ai-sdk/anthropic';
 *
 * const translator = createAiSdkTranslator({
 *   model: anthropic('claude-sonnet-4-20250514'),
 * });
 * ```
 */

import type { BatchTranslationItem, TranslateFunction } from '../core/types';

// Import types only - ai is a peer dependency
type LanguageModel = Parameters<typeof import('ai').generateObject>[0]['model'];

export interface AiSdkTranslatorConfig {
	/** AI SDK model instance */
	model: LanguageModel;
	/** Max items per batch (default: 30) */
	batchSize?: number;
	/** Custom system prompt (optional) */
	systemPrompt?: (locale: string, localeName: string) => string;
}

const DEFAULT_BATCH_SIZE = 30;

/**
 * Locale code to display name mapping (common languages)
 */
const LOCALE_NAMES: Record<string, string> = {
	en: 'English',
	'zh-TW': 'Traditional Chinese',
	'zh-CN': 'Simplified Chinese',
	zh: 'Chinese',
	ja: 'Japanese',
	ko: 'Korean',
	es: 'Spanish',
	fr: 'French',
	de: 'German',
	it: 'Italian',
	pt: 'Portuguese',
	'pt-BR': 'Brazilian Portuguese',
	ru: 'Russian',
	ar: 'Arabic',
	hi: 'Hindi',
	th: 'Thai',
	vi: 'Vietnamese',
	id: 'Indonesian',
	ms: 'Malay',
	nl: 'Dutch',
	pl: 'Polish',
	tr: 'Turkish',
	uk: 'Ukrainian',
	cs: 'Czech',
	el: 'Greek',
	he: 'Hebrew',
	sv: 'Swedish',
	da: 'Danish',
	fi: 'Finnish',
	no: 'Norwegian',
	hu: 'Hungarian',
	ro: 'Romanian',
};

function getLocaleName(code: string): string {
	return LOCALE_NAMES[code] || LOCALE_NAMES[code.split('-')[0]] || code;
}

function defaultSystemPrompt(locale: string, localeName: string): string {
	return `You are a professional translator. You translate UI strings to ${localeName} (${locale}).

RULES:
- Translate to natural, native-sounding ${localeName}
- Keep the same tone and formality level
- Preserve any placeholders like {name}, {{count}}, %s, %d exactly as-is
- For technical terms, use standard local terminology
- Use context (if provided) to disambiguate meaning`;
}

/**
 * Create an AI SDK-based translator
 *
 * Requires `ai` package as a peer dependency.
 */
export function createAiSdkTranslator(config: AiSdkTranslatorConfig): TranslateFunction {
	const { model, batchSize = DEFAULT_BATCH_SIZE, systemPrompt = defaultSystemPrompt } = config;

	return async (items: BatchTranslationItem[], targetLocale: string) => {
		if (items.length === 0) {
			return [];
		}

		// Dynamic import to avoid requiring ai as a hard dependency
		const { generateObject } = await import('ai');
		const { z } = await import('zod');

		const localeName = getLocaleName(targetLocale);
		const results: Array<{ sourceHash: string; translatedText: string }> = [];

		// Schema for batch translation response
		const BatchTranslationSchema = z.object({
			translations: z.array(
				z.object({
					sourceHash: z.string().describe('The original source hash'),
					translatedText: z.string().describe('The translated text'),
				})
			),
		});

		// Process in batches
		for (let i = 0; i < items.length; i += batchSize) {
			const batch = items.slice(i, i + batchSize);

			const itemsJson = batch.map((item) => ({
				sourceHash: item.sourceHash,
				sourceText: item.sourceText,
				...(item.context && { context: item.context }),
			}));

			const result = await generateObject({
				model,
				schema: BatchTranslationSchema,
				mode: 'json',
				system: systemPrompt(targetLocale, localeName),
				prompt: `Translate these UI strings to ${localeName}:

${JSON.stringify(itemsJson, null, 2)}`,
				temperature: 0.3,
			});

			if (result.object.translations && Array.isArray(result.object.translations)) {
				results.push(...result.object.translations);
			}
		}

		return results;
	};
}
