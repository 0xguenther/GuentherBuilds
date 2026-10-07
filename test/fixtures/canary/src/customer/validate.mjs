let input = '';
for await (const chunk of process.stdin) input += chunk;
const config = JSON.parse(input);
if (config.systemPrompt === 'validator-timeout') await new Promise(resolve => setTimeout(resolve, 6000));
const errors = config.model !== 'fixture-model' ? ['Unsupported model'] : [];
console.log(JSON.stringify(errors.length ? { ok: false, errors } : { ok: true }));
process.exitCode = errors.length ? 2 : 0;
