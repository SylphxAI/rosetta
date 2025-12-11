# AI Translators

Rosetta provides multiple AI translator packages for generating translations.

## Available Packages

| Package | Provider | Best For |
|---------|----------|----------|
| `@sylphx/rosetta-translator-ai-sdk` | Any AI SDK provider | Flexibility, multiple providers |
| `@sylphx/rosetta-translator-openrouter` | OpenRouter | Simple setup, model variety |
| `@sylphx/rosetta-translator-anthropic` | Anthropic Claude | Direct API, tool use |

## AI SDK Translator (Recommended)

Works with any Vercel AI SDK provider.

### Installation

```bash
bun add @sylphx/rosetta-translator-ai-sdk ai

# Choose a provider
bun add @openrouter/ai-sdk-provider  # OpenRouter
bun add @ai-sdk/anthropic            # Anthropic
bun add @ai-sdk/openai               # OpenAI
bun add @ai-sdk/google               # Google AI
```

### Usage

```ts
import { createAiSdkTranslator } from '@sylphx/rosetta-translator-ai-sdk';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const translator = createAiSdkTranslator({
  model: openrouter('anthropic/claude-sonnet-4'),
  batchSize: 30,  // Optional: items per API call
});
```

### With Different Providers

::: code-group

```ts [OpenRouter]
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const translator = createAiSdkTranslator({
  model: openrouter('anthropic/claude-sonnet-4'),
});
```

```ts [Anthropic]
import { anthropic } from '@ai-sdk/anthropic';

const translator = createAiSdkTranslator({
  model: anthropic('claude-sonnet-4-20250514'),
});
```

```ts [OpenAI]
import { openai } from '@ai-sdk/openai';

const translator = createAiSdkTranslator({
  model: openai('gpt-4o'),
});
```

```ts [Google]
import { google } from '@ai-sdk/google';

const translator = createAiSdkTranslator({
  model: google('gemini-1.5-pro'),
});
```

:::

### Configuration

```ts
interface AiSdkTranslatorConfig {
  /** AI SDK model instance */
  model: LanguageModel;

  /** Max items per batch (default: 30) */
  batchSize?: number;

  /** Custom system prompt */
  systemPrompt?: (locale: string, localeName: string) => string;
}
```

### Custom System Prompt

```ts
const translator = createAiSdkTranslator({
  model,
  systemPrompt: (locale, localeName) => `
You are a professional translator specializing in ${localeName}.

RULES:
- Use natural, native-sounding ${localeName}
- Keep the same tone (formal/informal)
- Preserve placeholders like {name}, {{count}} exactly
- Use standard technical terminology
- Context hints help disambiguate meaning
  `.trim(),
});
```

## OpenRouter Translator

Direct OpenRouter API integration without AI SDK.

### Installation

```bash
bun add @sylphx/rosetta-translator-openrouter
```

### Usage

```ts
import { createOpenRouterTranslator } from '@sylphx/rosetta-translator-openrouter';

const translator = createOpenRouterTranslator({
  apiKey: process.env.OPENROUTER_API_KEY!,
  model: 'anthropic/claude-sonnet-4',  // Optional, has default
  batchSize: 30,
});
```

### Configuration

```ts
interface OpenRouterTranslatorConfig {
  /** OpenRouter API key */
  apiKey: string;

  /** Model ID (default: 'anthropic/claude-sonnet-4') */
  model?: string;

  /** Max items per batch (default: 30) */
  batchSize?: number;

  /** Custom system prompt */
  systemPrompt?: (locale: string, localeName: string) => string;
}
```

## Anthropic Translator

Direct Anthropic API with tool use for structured output.

### Installation

```bash
bun add @sylphx/rosetta-translator-anthropic @anthropic-ai/sdk
```

### Usage

```ts
import { createAnthropicTranslator } from '@sylphx/rosetta-translator-anthropic';

const translator = createAnthropicTranslator({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model: 'claude-sonnet-4-20250514',  // Optional
  batchSize: 30,
});
```

### Configuration

```ts
interface AnthropicTranslatorConfig {
  /** Anthropic API key */
  apiKey: string;

  /** Model ID (default: 'claude-sonnet-4-20250514') */
  model?: string;

  /** Max items per batch (default: 30) */
  batchSize?: number;

  /** Custom system prompt */
  systemPrompt?: (locale: string, localeName: string) => string;
}
```

## TranslateFunction Interface

All translators implement this interface:

```ts
type TranslateFunction = (
  items: BatchTranslationItem[],
  targetLocale: string
) => Promise<Array<{ sourceHash: string; translatedText: string }>>;

interface BatchTranslationItem {
  sourceHash: string;
  sourceText: string;
  context?: string | null;
}
```

## Custom Translator

Implement your own translator:

```ts
import type { TranslateFunction } from '@sylphx/rosetta-admin';

const myTranslator: TranslateFunction = async (items, locale) => {
  const results = [];

  for (const item of items) {
    const response = await fetch('https://my-api.com/translate', {
      method: 'POST',
      body: JSON.stringify({
        text: item.sourceText,
        context: item.context,
        targetLocale: locale,
      }),
    });

    const data = await response.json();

    results.push({
      sourceHash: item.sourceHash,
      translatedText: data.translation,
    });
  }

  return results;
};
```

## Supported Locales

The translators support these locale codes:

```ts
const LOCALE_NAMES = {
  'en': 'English',
  'zh-TW': 'Traditional Chinese',
  'zh-CN': 'Simplified Chinese',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'pt-BR': 'Brazilian Portuguese',
  'ru': 'Russian',
  'ar': 'Arabic',
  'hi': 'Hindi',
  'th': 'Thai',
  'vi': 'Vietnamese',
  'id': 'Indonesian',
  'ms': 'Malay',
  'nl': 'Dutch',
  'pl': 'Polish',
  'tr': 'Turkish',
  'uk': 'Ukrainian',
};
```

Unknown locales fall back to the locale code itself.

## Batch Size Optimization

**Smaller batches (10-20):**
- Faster individual responses
- Better for progress UI
- More API calls

**Larger batches (30-50):**
- More efficient token usage
- Fewer API calls
- Longer wait between updates

**Recommendation:** Start with 30, adjust based on your needs.

## Cost Optimization

### Model Selection

| Model | Quality | Speed | Cost |
|-------|---------|-------|------|
| Claude Sonnet | Excellent | Fast | Medium |
| GPT-4o | Excellent | Fast | Medium |
| Claude Haiku | Good | Very Fast | Low |
| GPT-4o-mini | Good | Very Fast | Low |

### Tips

1. **Use smaller models for initial passes** - Haiku/4o-mini for first translation
2. **Use better models for review** - Sonnet/4o for refinement
3. **Batch efficiently** - Larger batches = fewer API calls
4. **Cache aggressively** - Don't re-translate unchanged strings

## Error Handling

```ts
const translator = createAiSdkTranslator({
  model,
  // Errors are logged, not thrown
  // Failed items are skipped
});

// In admin service
const results = await translator(items, locale);
// results.length may be < items.length if some failed
```

## Next Steps

- [Admin Dashboard](/packages/rosetta-admin) - Use translators in admin
- [Translate Adapter](/advanced/translate-adapter) - Custom implementations
- [Quick Start](/guide/quick-start) - Full setup guide
