// Deploys GuntherToken to Base using the server wallet from .env. Key never leaves the process.
// Usage (on server): MODE=dry|deploy node --env-file=.env scripts/token/deploy.mjs <artifact.json>
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createPublicClient, createWalletClient, http, encodeDeployData, formatEther, getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';

const ZERO = '0x0000000000000000000000000000000000000000';
const mode = process.env.MODE ?? 'dry';
const artifact = JSON.parse(readFileSync(process.argv[2] ?? 'contracts/artifacts/GuntherToken.json', 'utf8'));

const existing = process.env.GUNTER_TOKEN_ADDRESS ?? ZERO;
if (existing.toLowerCase() !== ZERO) throw new Error(`GUNTER_TOKEN_ADDRESS already set (${existing}); refusing to deploy twice`);

const chain = process.env.BASE_NETWORK_ID === 'base' ? base : baseSepolia;
// Idempotency: the record is written BEFORE broadcasting; any rerun aborts instead of deploying again.
const RECORD = `contracts/deployments/${process.env.BASE_NETWORK_ID ?? 'base-sepolia'}.json`;
if (existsSync(RECORD)) throw new Error(`deployment record exists (${RECORD}); check it on-chain instead of redeploying`);
const record = (data) => {
  mkdirSync(dirname(RECORD), { recursive: true });
  writeFileSync(RECORD, JSON.stringify({ updatedAt: new Date().toISOString(), ...data }, null, 2));
};
// Public RPC nodes behind a load balancer can lag a few blocks behind the receipt.
const withRetry = async (fn, attempts = 6) => {
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (e) { if (i + 1 >= attempts) throw e; await new Promise((r) => setTimeout(r, 2000 * 2 ** i)); }
  }
};
const transport = http(process.env.BASE_RPC_URL || undefined);
const account = privateKeyToAccount(process.env.BASE_WALLET_PRIVATE_KEY);
const treasury = getAddress(process.env.BASE_WALLET_ADDRESS);
if (account.address !== treasury) throw new Error('BASE_WALLET_ADDRESS does not match private key');

const publicClient = createPublicClient({ chain, transport });
const walletClient = createWalletClient({ account, chain, transport });

const data = encodeDeployData({ abi: artifact.abi, bytecode: artifact.bytecode, args: [treasury] });
const [balance, gas, fees] = await Promise.all([
  publicClient.getBalance({ address: account.address }),
  publicClient.estimateGas({ account, data }),
  publicClient.estimateFeesPerGas(),
]);
const l2Cost = gas * fees.maxFeePerGas;
const report = { chain: chain.name, deployer: account.address, balanceEth: formatEther(balance), gas: gas.toString(), maxL2CostEth: formatEther(l2Cost) };
if (balance < l2Cost * 3n) throw new Error(`insufficient balance: ${JSON.stringify(report)}`);

if (mode !== 'deploy') {
  console.log(JSON.stringify({ mode, ...report }));
  process.exit(0);
}

record({ status: 'broadcasting', chainId: chain.id, deployer: account.address });
const hash = await walletClient.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode, args: [treasury], gas: (gas * 12n) / 10n });
record({ status: 'broadcast', chainId: chain.id, deployer: account.address, tx: hash });
console.log(JSON.stringify({ broadcast: hash }));
const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
if (receipt.status !== 'success' || !receipt.contractAddress) throw new Error(`deploy failed: ${hash}`);
record({ status: 'deployed', chainId: chain.id, deployer: account.address, tx: hash, address: receipt.contractAddress, block: receipt.blockNumber.toString() });

const token = { address: receipt.contractAddress, abi: artifact.abi };
const read = (functionName, args = []) => withRetry(() => publicClient.readContract({ ...token, functionName, args }));
const [name, symbol, decimals, totalSupply, treasuryBalance] = await Promise.all([
  read('name'), read('symbol'), read('decimals'), read('totalSupply'), read('balanceOf', [treasury]),
]);
const after = await publicClient.getBalance({ address: account.address });
console.log(JSON.stringify({
  address: receipt.contractAddress, tx: hash, block: receipt.blockNumber.toString(), name, symbol, decimals,
  totalSupply: totalSupply.toString(), treasuryBalance: treasuryBalance.toString(), costEth: formatEther(balance - after),
}));
