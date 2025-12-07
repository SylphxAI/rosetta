/**
 * Translation adapters for @sylphx/rosetta
 *
 * @example
 * import { OpenRouterAdapter } from '@sylphx/rosetta/adapters';
 *
 * const translator = new OpenRouterAdapter({
 *   apiKey: process.env.OPENROUTER_API_KEY!,
 * });
 */

export type { OpenRouterAdapterOptions } from './openrouter';
export { OpenRouterAdapter } from './openrouter';
