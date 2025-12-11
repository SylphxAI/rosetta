/**
 * Anthropic translator for @sylphx/rosetta-admin
 *
 * Uses @anthropic-ai/sdk with tool use for structured output.
 *
 * @example
 * ```ts
 * import { createAnthropicTranslator } from '@sylphx/rosetta-translator-anthropic';
 *
 * const translator = createAnthropicTranslator({
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   model: process.env.ANTHROPIC_MODEL!,
 * });
 * ```
 */

import Anthropic from '@anthropic-ai/sdk';

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

export interface AnthropicTranslatorConfig {
	/** Anthropic API key */
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

const translationTool: Anthropic.Tool = {
	name: 'batch_translation',
	description: 'Batch translation result',
	input_schema: {
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
				},
			},
		},
		required: ['translations'],
	},
};

interface TranslationResponse {
	translations: Array<{ sourceHash: string; translatedText: string }>;
}

/**
 * Create an Anthropic-based translator
 */
export function createAnthropicTranslator(config: AnthropicTranslatorConfig): TranslateFunction {
	const {
		apiKey,
		model,
		batchSize = DEFAULT_BATCH_SIZE,
		systemPrompt = defaultSystemPrompt,
	} = config;

	const anthropic = new Anthropic({ apiKey });

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

			const response = await anthropic.messages.create({
				model,
				max_tokens: 4096,
				system: systemPrompt(targetLocale, localeName),
				tools: [translationTool],
				tool_choice: { type: 'tool', name: 'batch_translation' },
				messages: [
					{
						role: 'user',
						content: `Translate these UI strings to ${localeName}:\n\n${JSON.stringify(itemsJson, null, 2)}`,
					},
				],
			});

			const toolUse = response.content.find((c) => c.type === 'tool_use');
			if (!toolUse || toolUse.type !== 'tool_use') {
				throw new Error('No tool use in Anthropic response');
			}

			const parsed = toolUse.input as TranslationResponse;

			if (parsed.translations && Array.isArray(parsed.translations)) {
				results.push(...parsed.translations);
			}
		}

		return results;
	};
}
