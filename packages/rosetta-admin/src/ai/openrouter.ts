/**
 * OpenRouter AI translator
 *
 * @example
 * ```ts
 * import { createOpenRouterTranslator } from '@sylphx/rosetta-admin/ai';
 *
 * const translator = createOpenRouterTranslator({
 *   apiKey: process.env.OPENROUTER_API_KEY!,
 *   model: 'anthropic/claude-sonnet-4',
 * });
 *
 * export const adminRouter = createAdminRouter({
 *   storage,
 *   translator,
 * });
 * ```
 */

import type { BatchTranslationItem, TranslateFunction } from '../core/types';

export interface OpenRouterTranslatorConfig {
	/** OpenRouter API key */
	apiKey: string;
	/** Model to use (default: anthropic/claude-sonnet-4) */
	model?: string;
	/** Max items per batch (default: 50) */
	batchSize?: number;
	/** Custom system prompt (optional) */
	systemPrompt?: (locale: string, localeName: string) => string;
}

interface Message {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

interface OpenRouterResponse {
	choices: Array<{
		message: {
			content: string;
		};
	}>;
}

const DEFAULT_MODEL = 'anthropic/claude-sonnet-4';
const DEFAULT_BATCH_SIZE = 50;

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
	sk: 'Slovak',
	bg: 'Bulgarian',
	hr: 'Croatian',
	sl: 'Slovenian',
	et: 'Estonian',
	lv: 'Latvian',
	lt: 'Lithuanian',
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
- Use context (if provided) to disambiguate meaning
- Return ONLY valid JSON`;
}

/**
 * Create an OpenRouter-based translator
 */
export function createOpenRouterTranslator(config: OpenRouterTranslatorConfig): TranslateFunction {
	const {
		apiKey,
		model = DEFAULT_MODEL,
		batchSize = DEFAULT_BATCH_SIZE,
		systemPrompt = defaultSystemPrompt,
	} = config;

	return async (items: BatchTranslationItem[], targetLocale: string) => {
		if (items.length === 0) {
			return [];
		}

		const localeName = getLocaleName(targetLocale);
		const results: Array<{ sourceHash: string; translatedText: string }> = [];

		// Process in batches
		for (let i = 0; i < items.length; i += batchSize) {
			const batch = items.slice(i, i + batchSize);

			const itemsJson = batch.map((item) => ({
				sourceHash: item.sourceHash,
				sourceText: item.sourceText,
				...(item.context && { context: item.context }),
			}));

			const messages: Message[] = [
				{
					role: 'system',
					content: systemPrompt(targetLocale, localeName),
				},
				{
					role: 'user',
					content: `Translate these UI strings to ${localeName}:

${JSON.stringify(itemsJson, null, 2)}

Return a JSON object with "translations" array containing objects with "sourceHash" and "translatedText" for each item.`,
				},
			];

			const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					model,
					messages,
					temperature: 0.3,
					response_format: { type: 'json_object' },
				}),
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
			}

			const data = (await response.json()) as OpenRouterResponse;
			const rawContent = data.choices[0]?.message?.content;

			if (!rawContent) {
				throw new Error('No response content from OpenRouter');
			}

			// Strip markdown code fences if present (some models ignore response_format)
			let content = rawContent.trim();
			if (content.startsWith('```')) {
				// Remove opening fence (```json or ```)
				content = content.replace(/^```(?:json)?\s*\n?/, '');
				// Remove closing fence
				content = content.replace(/\n?```\s*$/, '');
			}

			// Parse JSON response
			const parsed = JSON.parse(content) as { translations: Array<{ sourceHash: string; translatedText: string }> };

			if (parsed.translations && Array.isArray(parsed.translations)) {
				results.push(...parsed.translations);
			}
		}

		return results;
	};
}
