/**
 * OpenRouter translator for @sylphx/rosetta-admin
 *
 * Uses @openrouter/sdk for structured JSON output.
 *
 * @example
 * ```ts
 * import { createOpenRouterTranslator } from '@sylphx/rosetta-translator-openrouter';
 *
 * const translator = createOpenRouterTranslator({
 *   apiKey: process.env.OPENROUTER_API_KEY!,
 *   model: process.env.LLM_MODEL!,
 * });
 * ```
 */

import { OpenRouter } from '@openrouter/sdk';

// Types (inline to avoid dependency on rosetta-admin)
export interface BatchTranslationItem {
	sourceHash: string;
	sourceText: string;
	context?: string | null;
}

export type TranslateFunction = (
	items: BatchTranslationItem[],
	targetLocale: string
) => Promise<Array<{ sourceHash: string; translatedText: string }>>;

export interface OpenRouterTranslatorConfig {
	/** OpenRouter API key */
	apiKey: string;
	/** Model to use */
	model: string;
	/** Max items per batch (default: 30) */
	batchSize?: number;
	/** Custom system prompt (optional) */
	systemPrompt?: (locale: string, localeName: string) => string;
}

const DEFAULT_BATCH_SIZE = 30;

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
};

function getLocaleName(code: string): string {
	const baseCode = code.split('-')[0];
	return LOCALE_NAMES[code] || (baseCode ? LOCALE_NAMES[baseCode] : undefined) || code;
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

const translationResponseSchema = {
	name: 'batch_translation',
	strict: true,
	schema: {
		type: 'object',
		properties: {
			translations: {
				type: 'array',
				description: 'Array of translated strings',
				items: {
					type: 'object',
					properties: {
						sourceHash: { type: 'string', description: 'The original source hash' },
						translatedText: { type: 'string', description: 'The translated text' },
					},
					required: ['sourceHash', 'translatedText'],
					additionalProperties: false,
				},
			},
		},
		required: ['translations'],
		additionalProperties: false,
	},
} as const;

interface TranslationResponse {
	translations: Array<{ sourceHash: string; translatedText: string }>;
}

/**
 * Create an OpenRouter-based translator
 */
export function createOpenRouterTranslator(config: OpenRouterTranslatorConfig): TranslateFunction {
	const {
		apiKey,
		model,
		batchSize = DEFAULT_BATCH_SIZE,
		systemPrompt = defaultSystemPrompt,
	} = config;

	const openRouter = new OpenRouter({ apiKey });

	return async (items: BatchTranslationItem[], targetLocale: string) => {
		if (items.length === 0) {
			return [];
		}

		const localeName = getLocaleName(targetLocale);
		const results: Array<{ sourceHash: string; translatedText: string }> = [];

		for (let i = 0; i < items.length; i += batchSize) {
			const batch = items.slice(i, i + batchSize);

			const itemsJson = batch.map((item) => ({
				sourceHash: item.sourceHash,
				sourceText: item.sourceText,
				...(item.context && { context: item.context }),
			}));

			const response = await openRouter.chat.send({
				model,
				messages: [
					{ role: 'system', content: systemPrompt(targetLocale, localeName) },
					{
						role: 'user',
						content: `Translate these UI strings to ${localeName}:\n\n${JSON.stringify(itemsJson, null, 2)}`,
					},
				],
				temperature: 0.3,
				responseFormat: {
					type: 'json_schema',
					jsonSchema: translationResponseSchema,
				},
				stream: false,
			});

			const rawContent = response.choices[0]?.message?.content;
			if (!rawContent) {
				throw new Error('No response content from OpenRouter');
			}

			const firstContent = typeof rawContent === 'string' ? rawContent : rawContent[0];
			if (!firstContent) {
				throw new Error('Empty response content from OpenRouter');
			}
			const text =
				typeof firstContent === 'string'
					? firstContent
					: 'text' in firstContent
						? firstContent.text
						: '';

			const parsed = JSON.parse(text) as TranslationResponse;

			if (parsed.translations && Array.isArray(parsed.translations)) {
				results.push(...parsed.translations);
			}
		}

		return results;
	};
}
