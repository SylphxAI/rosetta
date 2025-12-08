#!/usr/bin/env bun
/**
 * Rosetta CLI
 *
 * Commands:
 *   extract - Extract t() strings from source files
 */

import { extract, formatResult } from './extract';
import type { StorageAdapter, PendingSourceString } from '../types';

interface CLIOptions {
	/** Root directory to scan */
	root?: string;
	/** Output format: 'json' | 'table' | 'silent' */
	format?: 'json' | 'table' | 'silent';
	/** Verbose output */
	verbose?: boolean;
	/** Dry run (don't save to storage) */
	dryRun?: boolean;
	/** Include patterns */
	include?: string[];
	/** Exclude patterns */
	exclude?: string[];
	/** Output file for JSON */
	output?: string;
}

function parseArgs(args: string[]): { command: string; options: CLIOptions } {
	const command = args[0] || 'help';
	const options: CLIOptions = {};

	for (let i = 1; i < args.length; i++) {
		const arg = args[i];

		if (arg === '--root' || arg === '-r') {
			options.root = args[++i];
		} else if (arg === '--format' || arg === '-f') {
			options.format = args[++i] as CLIOptions['format'];
		} else if (arg === '--verbose' || arg === '-v') {
			options.verbose = true;
		} else if (arg === '--dry-run' || arg === '-d') {
			options.dryRun = true;
		} else if (arg === '--include' || arg === '-i') {
			options.include = options.include || [];
			options.include.push(args[++i]);
		} else if (arg === '--exclude' || arg === '-e') {
			options.exclude = options.exclude || [];
			options.exclude.push(args[++i]);
		} else if (arg === '--output' || arg === '-o') {
			options.output = args[++i];
		}
	}

	return { command, options };
}

function printHelp(): void {
	console.log(`
rosetta - Compile-time i18n string extraction

Usage:
  rosetta <command> [options]

Commands:
  extract    Extract t() strings from source files
  help       Show this help message

Options:
  --root, -r <path>      Root directory to scan (default: cwd)
  --format, -f <format>  Output format: json, table, silent (default: table)
  --output, -o <file>    Output JSON to file (implies --format json)
  --verbose, -v          Show verbose output
  --dry-run, -d          Don't save to storage, just show results
  --include, -i <glob>   Include pattern (can be used multiple times)
  --exclude, -e <glob>   Exclude pattern (can be used multiple times)

Examples:
  rosetta extract
  rosetta extract --root ./src --verbose
  rosetta extract --format json > strings.json
  rosetta extract -o strings.json
`);
}

async function runExtract(options: CLIOptions): Promise<void> {
	const { root, verbose, dryRun, include, exclude, output } = options;
	let { format = 'table' } = options;

	// --output implies JSON format
	if (output) {
		format = 'json';
	}

	if (verbose) {
		console.log('Extracting strings...\n');
	}

	const result = await extract({
		root: root || process.cwd(),
		verbose,
		include,
		exclude,
	});

	const jsonOutput = JSON.stringify(result.strings, null, 2);

	if (output) {
		// Write to file
		await Bun.write(output, jsonOutput);
		console.log(`Extracted ${result.strings.length} strings to ${output}`);
	} else if (format === 'json') {
		console.log(jsonOutput);
	} else if (format === 'table') {
		console.log(formatResult(result));

		if (result.strings.length > 0 && verbose) {
			console.log('\nStrings:');
			for (const str of result.strings) {
				console.log(`  [${str.hash}] ${str.text.substring(0, 60)}${str.text.length > 60 ? '...' : ''}`);
			}
		}
	}
	// silent format: no output
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const { command, options } = parseArgs(args);

	switch (command) {
		case 'extract':
			await runExtract(options);
			break;
		case 'help':
		case '--help':
		case '-h':
			printHelp();
			break;
		default:
			console.error(`Unknown command: ${command}`);
			printHelp();
			process.exit(1);
	}
}

main().catch((error) => {
	console.error('Error:', error);
	process.exit(1);
});

export { extract, formatResult } from './extract';
export type { ExtractOptions, ExtractResult } from './extract';
export type { CLIOptions };
