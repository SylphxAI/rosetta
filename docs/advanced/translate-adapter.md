# Custom Translate Adapter

Implement your own translation provider for Rosetta.

## TranslateFunction Interface

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

## Basic Implementation

```ts
const myTranslator: TranslateFunction = async (items, targetLocale) => {
  const results: Array<{ sourceHash: string; translatedText: string }> = [];

  for (const item of items) {
    try {
      const translated = await translateText(item.sourceText, targetLocale);
      results.push({
        sourceHash: item.sourceHash,
        translatedText: translated,
      });
    } catch (error) {
      console.error(`Failed to translate ${item.sourceHash}:`, error);
      // Skip failed items
    }
  }

  return results;
};
```

## Example: DeepL API

```ts
import type { TranslateFunction } from '@sylphx/rosetta-admin';

interface DeepLTranslatorConfig {
  apiKey: string;
  batchSize?: number;
}

export function createDeepLTranslator(
  config: DeepLTranslatorConfig
): TranslateFunction {
  const { apiKey, batchSize = 50 } = config;

  return async (items, targetLocale) => {
    const results: Array<{ sourceHash: string; translatedText: string }> = [];

    // DeepL supports batch requests
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      const response = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: batch.map(item => item.sourceText),
          target_lang: mapLocale(targetLocale),
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepL API error: ${response.status}`);
      }

      const data = await response.json();

      batch.forEach((item, index) => {
        results.push({
          sourceHash: item.sourceHash,
          translatedText: data.translations[index].text,
        });
      });
    }

    return results;
  };
}

function mapLocale(locale: string): string {
  const map: Record<string, string> = {
    'en': 'EN',
    'zh-TW': 'ZH',
    'zh-CN': 'ZH',
    'ja': 'JA',
    'ko': 'KO',
    'de': 'DE',
    'fr': 'FR',
    'es': 'ES',
    'pt': 'PT-PT',
    'pt-BR': 'PT-BR',
  };
  return map[locale] || locale.toUpperCase();
}
```

## Example: Google Cloud Translation

```ts
import { TranslationServiceClient } from '@google-cloud/translate';
import type { TranslateFunction } from '@sylphx/rosetta-admin';

interface GoogleTranslatorConfig {
  projectId: string;
  location?: string;
}

export function createGoogleTranslator(
  config: GoogleTranslatorConfig
): TranslateFunction {
  const { projectId, location = 'global' } = config;
  const client = new TranslationServiceClient();

  return async (items, targetLocale) => {
    const texts = items.map(item => item.sourceText);

    const [response] = await client.translateText({
      parent: `projects/${projectId}/locations/${location}`,
      contents: texts,
      targetLanguageCode: targetLocale,
      sourceLanguageCode: 'en',
    });

    return items.map((item, index) => ({
      sourceHash: item.sourceHash,
      translatedText: response.translations![index].translatedText!,
    }));
  };
}
```

## Example: Custom LLM API

```ts
import type { TranslateFunction } from '@sylphx/rosetta-admin';

interface CustomLLMConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  batchSize?: number;
}

export function createCustomLLMTranslator(
  config: CustomLLMConfig
): TranslateFunction {
  const { apiUrl, apiKey, model, batchSize = 20 } = config;

  return async (items, targetLocale) => {
    const results: Array<{ sourceHash: string; translatedText: string }> = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      const prompt = buildTranslationPrompt(batch, targetLocale);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate UI strings to ${targetLocale}.`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      const data = await response.json();
      const translations = JSON.parse(data.choices[0].message.content);

      for (const item of batch) {
        const translated = translations[item.sourceHash];
        if (translated) {
          results.push({
            sourceHash: item.sourceHash,
            translatedText: translated,
          });
        }
      }
    }

    return results;
  };
}

function buildTranslationPrompt(
  items: BatchTranslationItem[],
  locale: string
): string {
  const entries = items.map(item => {
    const contextHint = item.context ? ` (context: ${item.context})` : '';
    return `"${item.sourceHash}": "${item.sourceText}"${contextHint}`;
  });

  return `Translate these UI strings to ${locale}. Return JSON with the same keys:

{
${entries.join(',\n')}
}

Return only the JSON object with translated values.`;
}
```

## Using Context for Better Translations

The `context` field helps disambiguate strings:

```ts
// Without context, "Post" could mean:
// - Noun: a blog post
// - Verb: to post something

// With context:
{ sourceHash: 'abc123', sourceText: 'Post', context: 'noun.blog' }
{ sourceHash: 'def456', sourceText: 'Post', context: 'verb.action' }
```

Include context in your prompts:

```ts
function buildPromptWithContext(items: BatchTranslationItem[]): string {
  return items.map(item => {
    if (item.context) {
      return `- "${item.sourceText}" (${item.context})`;
    }
    return `- "${item.sourceText}"`;
  }).join('\n');
}
```

## Error Handling

### Graceful Degradation

```ts
const translator: TranslateFunction = async (items, locale) => {
  const results: Array<{ sourceHash: string; translatedText: string }> = [];

  for (const item of items) {
    try {
      const translated = await translate(item.sourceText, locale);
      results.push({
        sourceHash: item.sourceHash,
        translatedText: translated,
      });
    } catch (error) {
      // Log but don't throw - return partial results
      console.error(`Translation failed for ${item.sourceHash}:`, error);
    }
  }

  return results;  // May be partial
};
```

### Retry Logic

```ts
async function translateWithRetry(
  text: string,
  locale: string,
  maxRetries = 3
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await translate(text, locale);
    } catch (error) {
      lastError = error as Error;
      // Exponential backoff
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }

  throw lastError;
}
```

### Rate Limiting

```ts
import pLimit from 'p-limit';

const limit = pLimit(5);  // Max 5 concurrent requests

const translator: TranslateFunction = async (items, locale) => {
  const results = await Promise.all(
    items.map(item =>
      limit(async () => {
        const translated = await translate(item.sourceText, locale);
        return {
          sourceHash: item.sourceHash,
          translatedText: translated,
        };
      })
    )
  );

  return results;
};
```

## Testing Your Translator

```ts
import { describe, it, expect, mock } from 'bun:test';

describe('myTranslator', () => {
  it('should translate all items', async () => {
    const items = [
      { sourceHash: 'abc123', sourceText: 'Hello' },
      { sourceHash: 'def456', sourceText: 'World' },
    ];

    const translator = createMyTranslator({ apiKey: 'test' });
    const results = await translator(items, 'zh-TW');

    expect(results).toHaveLength(2);
    expect(results[0].sourceHash).toBe('abc123');
    expect(results[1].sourceHash).toBe('def456');
  });

  it('should handle partial failures', async () => {
    // Mock API to fail on second item
    const translator = createMyTranslator({ apiKey: 'test' });

    const items = [
      { sourceHash: 'abc123', sourceText: 'Hello' },
      { sourceHash: 'def456', sourceText: 'FAIL_TRIGGER' },
    ];

    const results = await translator(items, 'zh-TW');

    // Should return partial results
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.sourceHash === 'abc123')).toBe(true);
  });
});
```

## Performance Tips

1. **Batch efficiently** - Group multiple strings in one API call
2. **Cache translations** - Don't re-translate unchanged strings
3. **Use streaming** - For progress UI, yield results as they complete
4. **Parallelize carefully** - Respect rate limits

## Next Steps

- [AI Translators](/packages/translators) - Pre-built implementations
- [Admin Dashboard](/packages/rosetta-admin) - Use translators
- [Storage Adapter](/advanced/storage-adapter) - Store translations
