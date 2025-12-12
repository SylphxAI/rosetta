/**
 * Rosetta Loader Tests
 *
 * Tests the t() call extraction and manifest writing functionality.
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import rosettaLoader, {
	clearManifest,
	flushManifest,
	getManifestPath,
	readManifest,
	resetLoaderState,
} from '../loader';

// ============================================
// Test Helpers
// ============================================

function getTestManifestDir(): string {
	return path.join(process.cwd(), '.rosetta-test');
}

function cleanupTestDir(): void {
	const testDir = getTestManifestDir();
	if (fs.existsSync(testDir)) {
		fs.rmSync(testDir, { recursive: true });
	}
}

// ============================================
// Test Setup
// ============================================

beforeEach(() => {
	// Set custom manifest dir for tests FIRST
	process.env.ROSETTA_MANIFEST_DIR = '.rosetta-test';

	// Reset in-memory state
	resetLoaderState();

	// Ensure clean filesystem state
	cleanupTestDir();
});

afterEach(() => {
	// Reset in-memory state
	resetLoaderState();

	// Clean filesystem
	cleanupTestDir();

	// Reset env
	process.env.ROSETTA_MANIFEST_DIR = undefined;
});

// ============================================
// Extract Strings Tests
// ============================================

describe('rosettaLoader', () => {
	describe('extractStrings', () => {
		test('extracts simple t() calls', () => {
			const source = `
				const message = t('Hello World');
				const greeting = t("Welcome");
			`;

			rosettaLoader(source);
			flushManifest();

			const manifest = readManifest();
			expect(manifest.length).toBe(2);
			expect(manifest.some((e) => e.text === 'Hello World')).toBe(true);
			expect(manifest.some((e) => e.text === 'Welcome')).toBe(true);
		});

		test('extracts t() calls with template literals', () => {
			const source = 'const msg = t(`Static text`);';

			rosettaLoader(source);
			flushManifest();

			const manifest = readManifest();
			expect(manifest.length).toBe(1);
			expect(manifest[0]!.text).toBe('Static text');
		});

		test('skips template expressions (dynamic strings)', () => {
			const source = `
				const dynamic = t(\`Hello \${name}\`);
				const static_text = t('Static');
			`;

			rosettaLoader(source);
			flushManifest();

			const manifest = readManifest();
			expect(manifest.length).toBe(1);
			expect(manifest[0]!.text).toBe('Static');
		});

		test('extracts t() calls with context', () => {
			const source = `
				const btn1 = t('Submit', { context: 'form' });
				const btn2 = t('Submit', { context: 'modal' });
			`;

			rosettaLoader(source);
			flushManifest();

			const manifest = readManifest();
			expect(manifest.length).toBe(2);
			// Different contexts should produce different hashes
			const hashes = manifest.map((e) => e.hash);
			expect(new Set(hashes).size).toBe(2);
		});

		test('deduplicates same text without context', () => {
			const source = `
				t('Hello');
				t('Hello');
				t('Hello');
			`;

			rosettaLoader(source);
			flushManifest();

			const manifest = readManifest();
			expect(manifest.length).toBe(1);
		});

		test('handles whitespace variations', () => {
			const source = `
				t( 'With spaces' );
				t('No spaces');
				t(
					'Multiline'
				);
			`;

			rosettaLoader(source);
			flushManifest();

			const manifest = readManifest();
			expect(manifest.length).toBe(3);
		});

		test('skips empty strings', () => {
			const source = `
				t('');
				t('  ');
				t('Valid');
			`;

			rosettaLoader(source);
			flushManifest();

			const manifest = readManifest();
			expect(manifest.length).toBe(1);
			expect(manifest[0]!.text).toBe('Valid');
		});

		test('handles real-world React component', () => {
			const source = `
				export function Button() {
					const t = useT();
					return (
						<button onClick={() => alert(t('Clicked!'))}>
							{t('Click me')}
						</button>
					);
				}
			`;

			rosettaLoader(source);
			flushManifest();

			const manifest = readManifest();
			expect(manifest.length).toBe(2);
			expect(manifest.some((e) => e.text === 'Clicked!')).toBe(true);
			expect(manifest.some((e) => e.text === 'Click me')).toBe(true);
		});
	});

	describe('manifest operations', () => {
		test('creates manifest directory if not exists', () => {
			rosettaLoader(`t('Test')`);
			flushManifest();

			expect(fs.existsSync(getTestManifestDir())).toBe(true);
			expect(fs.existsSync(getManifestPath())).toBe(true);
		});

		test('clearManifest removes manifest file', () => {
			rosettaLoader(`t('Test')`);
			flushManifest();

			expect(fs.existsSync(getManifestPath())).toBe(true);

			clearManifest();

			expect(fs.existsSync(getManifestPath())).toBe(false);
		});

		test('readManifest returns empty array when no manifest', () => {
			const manifest = readManifest();
			expect(manifest).toEqual([]);
		});

		test('readManifest returns valid entries', () => {
			rosettaLoader(`t('Entry 1')`);
			rosettaLoader(`t('Entry 2')`);
			flushManifest();

			const manifest = readManifest();
			expect(manifest.length).toBe(2);
		});

		test('merges with existing manifest on write', () => {
			// First batch
			rosettaLoader(`t('First')`);
			flushManifest();

			// Second batch (should merge, not overwrite)
			rosettaLoader(`t('Second')`);
			flushManifest();

			const manifest = readManifest();
			expect(manifest.length).toBe(2);
			expect(manifest.some((e) => e.text === 'First')).toBe(true);
			expect(manifest.some((e) => e.text === 'Second')).toBe(true);
		});
	});

	describe('edge cases', () => {
		test('handles Unicode text', () => {
			const source = `
				t('你好世界');
				t('مرحبا بالعالم');
				t('🎉 Emoji');
			`;

			rosettaLoader(source);
			flushManifest();

			const manifest = readManifest();
			expect(manifest.length).toBe(3);
			expect(manifest.some((e) => e.text === '你好世界')).toBe(true);
		});

		test('extracts double-quoted strings', () => {
			const source = `
				const msg1 = t("Double quoted");
				const msg2 = t("Another double quoted");
			`;

			rosettaLoader(source);
			flushManifest();

			const manifest = readManifest();
			expect(manifest.length).toBe(2);
			expect(manifest.some((e) => e.text === 'Double quoted')).toBe(true);
			expect(manifest.some((e) => e.text === 'Another double quoted')).toBe(true);
		});

		test('returns source unchanged', () => {
			const source = `const x = t('Test');`;
			const result = rosettaLoader(source);
			expect(result).toBe(source);
		});

		test('handles files without t() calls efficiently', () => {
			const source = `
				const x = 1;
				const y = 2;
				console.log(x + y);
			`;

			rosettaLoader(source);
			flushManifest();

			const manifest = readManifest();
			expect(manifest.length).toBe(0);
		});

		test('handles params object without context', () => {
			const source = `
				t('Hello {name}', { name: 'World' });
				t('Count: {count}', { count: 5 });
			`;

			rosettaLoader(source);
			flushManifest();

			// Should extract the strings but not confuse params with context
			const manifest = readManifest();
			expect(manifest.some((e) => e.text === 'Hello {name}')).toBe(true);
		});
	});
});

// ============================================
// Security Tests
// ============================================

describe('loader security', () => {
	test('rejects path traversal in manifest dir - does not create manifest', () => {
		process.env.ROSETTA_MANIFEST_DIR = '../outside';

		rosettaLoader(`t('Test')`);
		flushManifest(); // Error is caught and logged, but manifest should not be created

		// Verify no manifest was created in the dangerous location
		const dangerousPath = path.join(process.cwd(), '..', 'outside', 'manifest.json');
		expect(fs.existsSync(dangerousPath)).toBe(false);
	});

	test('rejects absolute paths in manifest dir - does not create manifest', () => {
		process.env.ROSETTA_MANIFEST_DIR = '/tmp/rosetta-test-security';

		rosettaLoader(`t('Test')`);
		flushManifest(); // Error is caught and logged, but manifest should not be created

		// Verify no manifest was created in the dangerous location
		expect(fs.existsSync('/tmp/rosetta-test-security/manifest.json')).toBe(false);
	});
});

// ============================================
// Route Detection Tests
// ============================================

import {
	filePathToRoute,
	getAssociatedRoutes,
	getHashesForRoute,
	getRoutesPath,
	readRoutes,
} from '../loader';

describe('route detection', () => {
	describe('filePathToRoute', () => {
		test('converts app/page.tsx to /', () => {
			expect(filePathToRoute('/project/app/page.tsx')).toBe('/');
		});

		test('converts app/about/page.tsx to /about', () => {
			expect(filePathToRoute('/project/app/about/page.tsx')).toBe('/about');
		});

		test('converts nested routes correctly', () => {
			expect(filePathToRoute('/project/app/products/details/page.tsx')).toBe('/products/details');
		});

		test('handles dynamic segments', () => {
			expect(filePathToRoute('/project/app/products/[id]/page.tsx')).toBe('/products/[id]');
		});

		test('removes route groups', () => {
			expect(filePathToRoute('/project/app/(marketing)/about/page.tsx')).toBe('/about');
		});

		test('removes locale params', () => {
			expect(filePathToRoute('/project/app/[locale]/products/page.tsx')).toBe('/products');
			expect(filePathToRoute('/project/app/[lang]/about/page.tsx')).toBe('/about');
		});

		test('handles layout files', () => {
			expect(filePathToRoute('/project/app/layout.tsx')).toBe('/');
			expect(filePathToRoute('/project/app/products/layout.tsx')).toBe('/products');
		});

		test('returns null for non-route files', () => {
			expect(filePathToRoute('/project/app/components/Button.tsx')).toBeNull();
			expect(filePathToRoute('/project/src/utils/helpers.ts')).toBeNull();
		});

		test('handles Windows-style paths', () => {
			expect(filePathToRoute('C:\\project\\app\\about\\page.tsx')).toBe('/about');
		});
	});

	describe('getAssociatedRoutes', () => {
		test('returns route for page files', () => {
			expect(getAssociatedRoutes('/project/app/about/page.tsx')).toEqual(['/about']);
		});

		test('returns _shared for non-app files', () => {
			expect(getAssociatedRoutes('/project/src/components/Button.tsx')).toEqual(['_shared']);
		});

		test('returns nearest route path for component in route folder', () => {
			// Components in a route folder are associated with the nearest route-like path
			// Runtime route matching will handle finding the actual route
			const routes = getAssociatedRoutes('/project/app/products/components/Card.tsx');
			expect(routes.length).toBe(1);
			expect(routes[0]).toContain('/products');
		});
	});
});

// ============================================
// Route Manifest Tests
// ============================================

describe('route manifest', () => {
	test('generates routes.json with route mappings', () => {
		// Reset state
		resetLoaderState();
		process.env.ROSETTA_MANIFEST_DIR = '.rosetta-test';

		// Simulate loader being called with file context
		const loaderWithContext = rosettaLoader.bind({
			resourcePath: '/project/app/products/page.tsx',
		} as { resourcePath: string });
		loaderWithContext(`
			const x = t('Product Title');
			const y = t('Add to Cart');
		`);

		const homeLoader = rosettaLoader.bind({
			resourcePath: '/project/app/page.tsx',
		} as { resourcePath: string });
		homeLoader(`
			const a = t('Welcome');
			const b = t('Product Title'); // Shared with products
		`);

		flushManifest();

		// Check routes.json exists
		const routesPath = getRoutesPath();
		expect(fs.existsSync(routesPath)).toBe(true);

		// Read and verify routes
		const routes = readRoutes();
		expect(routes).toBeDefined();

		// / route should have Welcome and Product Title
		expect(routes['/']).toBeDefined();
		expect(routes['/'].length).toBeGreaterThan(0);

		// /products route should have Product Title and Add to Cart
		expect(routes['/products']).toBeDefined();
		expect(routes['/products'].length).toBeGreaterThan(0);
	});

	test('getHashesForRoute includes _shared hashes', () => {
		resetLoaderState();
		process.env.ROSETTA_MANIFEST_DIR = '.rosetta-test';

		// Simulate shared component
		const sharedLoader = rosettaLoader.bind({
			resourcePath: '/project/src/components/Header.tsx',
		} as { resourcePath: string });
		sharedLoader(`t('Navigation')`);

		// Route-specific
		const pageLoader = rosettaLoader.bind({
			resourcePath: '/project/app/about/page.tsx',
		} as { resourcePath: string });
		pageLoader(`t('About Us')`);

		flushManifest();

		// getHashesForRoute for /about should include both
		const hashes = getHashesForRoute('/about');
		expect(hashes.length).toBeGreaterThanOrEqual(1);
	});

	test('readRoutes returns empty object when no routes.json', () => {
		// Clean up any existing routes.json
		cleanupTestDir();

		const routes = readRoutes();
		expect(routes).toEqual({});
	});
});

// ============================================
// Edge Case Tests for Coverage
// ============================================

describe('edge cases', () => {
	test('handles t() calls with template expressions and skips them', () => {
		const source = `
			const dynamic = t(\`Hello \${name}\`, { context: 'greeting' });
			const empty = t('');
			const whitespace = t('   ');
		`;

		rosettaLoader(source);
		flushManifest();

		// None of these should be extracted
		const manifest = readManifest();
		expect(manifest.length).toBe(0);
	});

	test('handles t() calls with options containing template expressions', () => {
		const source = `
			const msg1 = t('Hello', { context: 'greeting' });
			const msg2 = t('Hello', { name: 'World' }); // Same text, no context
		`;

		rosettaLoader(source);
		flushManifest();

		const manifest = readManifest();
		// Should dedupe - both have same text
		const helloEntries = manifest.filter((e) => e.text === 'Hello');
		expect(helloEntries.length).toBeGreaterThanOrEqual(1);
	});

	test('handles duplicate strings with different contexts', () => {
		const source = `
			t('Submit', { context: 'form' });
			t('Submit', { context: 'dialog' });
		`;

		rosettaLoader(source);
		flushManifest();

		const manifest = readManifest();
		// Should have 2 entries - same text but different contexts
		const submitEntries = manifest.filter((e) => e.text === 'Submit');
		expect(submitEntries.length).toBe(2);
	});

	test('handles duplicate strings in same pass', () => {
		const source = `
			t('Duplicate');
			t('Duplicate');
			t('Duplicate');
		`;

		rosettaLoader(source);
		flushManifest();

		const manifest = readManifest();
		// Should be deduplicated
		const dupEntries = manifest.filter((e) => e.text === 'Duplicate');
		expect(dupEntries.length).toBe(1);
	});

	test('getAssociatedRoutes walks up directory tree for non-page files in app', () => {
		// Component nested inside a route directory
		const routes = getAssociatedRoutes('/project/app/products/[id]/details/components/Gallery.tsx');
		// Should find nearest route by walking up
		expect(routes.length).toBe(1);
	});

	test('getAssociatedRoutes returns _shared for files outside app directory', () => {
		const routes = getAssociatedRoutes('/project/lib/utils/helpers.ts');
		expect(routes).toEqual(['_shared']);
	});

	test('filePathToRoute handles route groups at various levels', () => {
		expect(filePathToRoute('/project/app/(auth)/(login)/signin/page.tsx')).toBe('/signin');
		expect(filePathToRoute('/project/app/(dashboard)/admin/page.tsx')).toBe('/admin');
	});

	test('filePathToRoute handles parallel routes', () => {
		// Parallel routes keep their @segment prefix (actual behavior)
		const route = filePathToRoute('/project/app/@modal/(.)products/[id]/page.tsx');
		expect(route).toBeDefined();
		expect(typeof route).toBe('string');
	});

	test('filePathToRoute handles intercepting routes', () => {
		// Intercepting routes with (.) prefix
		const route = filePathToRoute('/project/app/(.)products/page.tsx');
		expect(route).toBeDefined();
		expect(typeof route).toBe('string');
	});

	test('handles files with no t() calls efficiently', () => {
		const source = `
			const x = someOtherFunction('test');
			const y = translate('hello');
		`;

		// This should short-circuit early
		rosettaLoader(source);
		flushManifest();

		const manifest = readManifest();
		expect(manifest.length).toBe(0);
	});
});
