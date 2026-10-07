// Compiles contracts/GuntherToken.sol with solc-js into contracts/artifacts/GuntherToken.json.
// Usage: node scripts/token/compile.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const solc = require('solc');
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCE = 'contracts/GuntherToken.sol';

const input = {
  language: 'Solidity',
  sources: { [SOURCE]: { content: readFileSync(join(root, SOURCE), 'utf8') } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: 'cancun',
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'metadata'] } },
  },
};

const findImports = (path) => {
  try {
    return { contents: readFileSync(require.resolve(path), 'utf8') };
  } catch {
    return { error: `not found: ${path}` };
  }
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
const errors = (output.errors ?? []).filter((e) => e.severity === 'error');
if (errors.length) {
  for (const e of errors) console.error(e.formattedMessage);
  process.exit(1);
}

// Embed all resolved sources so the artifact is self-contained for Sourcify verification.
const metadata = JSON.parse(output.contracts[SOURCE].GuntherToken.metadata);
const sources = {};
for (const path of Object.keys(metadata.sources)) {
  sources[path] = path === SOURCE ? input.sources[SOURCE].content : findImports(path).contents;
}

const c = output.contracts[SOURCE].GuntherToken;
mkdirSync(join(root, 'contracts', 'artifacts'), { recursive: true });
writeFileSync(
  join(root, 'contracts', 'artifacts', 'GuntherToken.json'),
  JSON.stringify(
    { compiler: solc.version(), abi: c.abi, bytecode: `0x${c.evm.bytecode.object}`, metadata: c.metadata, sources },
    null,
    2,
  ),
);
console.log(JSON.stringify({ compiler: solc.version(), bytecodeBytes: c.evm.bytecode.object.length / 2, sources: Object.keys(sources).length }));
