/**
 * Rosetta Plugin Tests
 *
 * Tests withRosetta Next.js plugin configuration.
 */

import { describe, expect, test } from 'bun:test';
import { withRosetta } from '../sync';

// ============================================
// withRosetta Tests
// ============================================

describe('withRosetta', () => {
	test('adds turbopack rules', () => {
		const config = withRosetta({});

		expect(config.turbopack).toBeDefined();
		expect(config.turbopack.rules['*.tsx']).toBeDefined();
		expect(config.turbopack.rules['*.ts']).toBeDefined();
	});

	test('preserves existing config', () => {
		const config = withRosetta({
			reactStrictMode: true,
			experimental: { foo: true },
		});

		expect(config.reactStrictMode).toBe(true);
		expect(config.experimental.foo).toBe(true);
	});

	test('preserves existing turbopack rules', () => {
		const config = withRosetta({
			turbopack: {
				rules: {
					'*.svg': { loaders: ['svg-loader'] },
				},
			},
		});

		expect(config.turbopack.rules['*.svg']).toBeDefined();
		expect(config.turbopack.rules['*.tsx']).toBeDefined();
	});

	test('adds webpack loader', () => {
		const config = withRosetta({});
		const mockConfig = { module: { rules: [] as unknown[] } };

		config.webpack(mockConfig, {});

		expect(mockConfig.module.rules.length).toBe(1);
		expect((mockConfig.module.rules[0] as any).test.toString()).toContain('tsx');
	});

	test('calls existing webpack config', () => {
		let existingWebpackCalled = false;
		const config = withRosetta({
			webpack: (cfg: unknown) => {
				existingWebpackCalled = true;
				return cfg;
			},
		});

		const mockConfig = { module: { rules: [] as unknown[] } };
		config.webpack(mockConfig, {});

		expect(existingWebpackCalled).toBe(true);
	});
});
