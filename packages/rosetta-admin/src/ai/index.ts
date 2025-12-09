/**
 * AI translators module
 *
 * Choose the translator that fits your stack:
 * - createAiSdkTranslator: For Vercel AI SDK users (any provider)
 * - createOpenRouterTranslator: Direct OpenRouter API
 * - createAnthropicTranslator: Direct Anthropic API
 */

export { createAiSdkTranslator, type AiSdkTranslatorConfig } from './ai-sdk';
export { createOpenRouterTranslator, type OpenRouterTranslatorConfig } from './openrouter';
export { createAnthropicTranslator, type AnthropicTranslatorConfig } from './anthropic';
