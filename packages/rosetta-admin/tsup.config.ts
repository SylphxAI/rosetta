import { defineConfig } from 'tsup';

export default defineConfig({
	entry: {
		index: 'src/index.ts',
		'react/index': 'src/react/index.ts',
		'server/index': 'src/server/index.ts',
		'server/trpc': 'src/server/trpc.ts',
	},
	format: ['esm'],
	dts: true,
	clean: true,
	external: ['react', '@sylphx/rosetta', '@trpc/server', 'zod'],
	splitting: false,
	treeshake: true,
});
