import { defineConfig } from 'vitepress';

const SITE_URL = 'https://rosetta.sylphx.com';
const TITLE = 'Rosetta';
const DESCRIPTION =
	'LLM-powered i18n for Next.js App Router. Write English in code, generate translations with AI.';

export default defineConfig({
	title: TITLE,
	description: DESCRIPTION,
	lang: 'en-US',
	cleanUrls: true,

	sitemap: {
		hostname: SITE_URL,
	},

	head: [
		// Favicon
		['link', { rel: 'icon', href: '/logo.svg', type: 'image/svg+xml' }],
		['link', { rel: 'icon', href: '/favicon-32.png', type: 'image/png', sizes: '32x32' }],
		['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],

		// SEO
		['meta', { name: 'theme-color', content: '#10b981' }],
		['meta', { name: 'author', content: 'Sylphx' }],
		[
			'meta',
			{
				name: 'keywords',
				content:
					'i18n, internationalization, Next.js, React, TypeScript, LLM, AI translation, localization',
			},
		],

		// Open Graph
		['meta', { property: 'og:type', content: 'website' }],
		['meta', { property: 'og:site_name', content: TITLE }],
		['meta', { property: 'og:title', content: TITLE }],
		['meta', { property: 'og:description', content: DESCRIPTION }],
		['meta', { property: 'og:image', content: `${SITE_URL}/og-image.png` }],
		['meta', { property: 'og:url', content: SITE_URL }],
		['meta', { property: 'og:locale', content: 'en_US' }],

		// Twitter Card
		['meta', { name: 'twitter:card', content: 'summary_large_image' }],
		['meta', { name: 'twitter:title', content: TITLE }],
		['meta', { name: 'twitter:description', content: DESCRIPTION }],
		['meta', { name: 'twitter:image', content: `${SITE_URL}/og-image.png` }],
		['meta', { name: 'twitter:site', content: '@sylphxai' }],
	],

	themeConfig: {
		logo: '/logo.svg',

		nav: [
			{ text: 'Guide', link: '/guide/' },
			{ text: 'Packages', link: '/packages/rosetta' },
			{ text: 'API', link: '/api/rosetta-class' },
			{
				text: 'Links',
				items: [
					{ text: 'GitHub', link: 'https://github.com/sylphxai/rosetta' },
					{ text: 'npm', link: 'https://www.npmjs.com/package/@sylphx/rosetta' },
				],
			},
		],

		sidebar: {
			'/guide/': [
				{
					text: 'Getting Started',
					items: [
						{ text: 'Introduction', link: '/guide/' },
						{ text: 'Quick Start', link: '/guide/quick-start' },
						{ text: 'How It Works', link: '/guide/how-it-works' },
					],
				},
				{
					text: 'Integration',
					items: [
						{ text: 'Next.js', link: '/guide/next-js' },
						{ text: 'Deployment', link: '/guide/deployment' },
					],
				},
			],
			'/packages/': [
				{
					text: 'Packages',
					items: [
						{ text: '@sylphx/rosetta', link: '/packages/rosetta' },
						{ text: '@sylphx/rosetta-next', link: '/packages/rosetta-next' },
						{ text: '@sylphx/rosetta-admin', link: '/packages/rosetta-admin' },
						{ text: '@sylphx/rosetta-drizzle', link: '/packages/rosetta-drizzle' },
						{ text: 'AI Translators', link: '/packages/translators' },
					],
				},
			],
			'/advanced/': [
				{
					text: 'Advanced',
					items: [
						{ text: 'Storage Adapter', link: '/advanced/storage-adapter' },
						{ text: 'Translate Adapter', link: '/advanced/translate-adapter' },
						{ text: 'Caching', link: '/advanced/caching' },
						{ text: 'ICU Format', link: '/advanced/icu-format' },
					],
				},
			],
			'/api/': [
				{
					text: 'API Reference',
					items: [
						{ text: 'Rosetta Class', link: '/api/rosetta-class' },
						{ text: 't() Function', link: '/api/t-function' },
						{ text: 'React Hooks', link: '/api/hooks' },
						{ text: 'Types', link: '/api/types' },
					],
				},
			],
			'/examples/': [
				{
					text: 'Examples',
					items: [
						{ text: 'Basic Setup', link: '/examples/basic' },
						{ text: 'Admin Dashboard', link: '/examples/admin-dashboard' },
						{ text: 'Custom Storage', link: '/examples/custom-storage' },
					],
				},
			],
		},

		socialLinks: [{ icon: 'github', link: 'https://github.com/sylphxai/rosetta' }],

		search: {
			provider: 'local',
		},

		editLink: {
			pattern: 'https://github.com/sylphxai/rosetta/edit/main/docs/:path',
			text: 'Edit this page on GitHub',
		},

		footer: {
			message: 'Released under the MIT License.',
			copyright: 'Copyright © 2024 Sylphx',
		},
	},
});
