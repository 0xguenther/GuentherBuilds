import { RedditMcpClient } from '../src/mcp/redditMcp.js';
import { RedditService, RedditStrategy } from '../src/services/redditService.js';
import { checkDatabaseConnection } from '../src/db/client.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || '--help';

  console.log('====================================================');
  console.log('  GÜNTHER CORE — Reddit Marketing Manager');
  console.log('====================================================\n');

  await checkDatabaseConnection();

  if (command === '--help' || command === '-h') {
    console.log('Usage:');
    console.log('  npx tsx scripts/reddit-manager.ts --status');
    console.log('      Checks Reddit API credentials, karma, account age & readiness\n');
    console.log('  npx tsx scripts/reddit-manager.ts --preview <selfhosted|localllama|sideproject>');
    console.log('      Outputs the curated, battle-tested submission text\n');
    console.log('  npx tsx scripts/reddit-manager.ts --publish <selfhosted|localllama|sideproject> [--dry-run]');
    console.log('      Submits the post live to Reddit (or simulated if --dry-run or missing keys)\n');
    process.exit(0);
  }

  if (command === '--status') {
    console.log('[1/2] Checking Reddit account connectivity and health...');
    const health = await RedditService.checkAccountHealth();

    console.log('\n--- Account Details ---');
    console.log(`Username:         u/${health.account.username}`);
    console.log(`Link Karma:       ${health.account.linkKarma}`);
    console.log(`Comment Karma:    ${health.account.commentKarma}`);
    console.log(`Total Karma:      ${health.account.totalKarma}`);
    console.log(`Account Age:      ${health.account.accountAgeDays} days`);
    console.log(`Mode:             ${health.account.isSimulated ? '⚠️  SIMULATED (No live keys in .env)' : '✓ LIVE OAUTH2 CONNECTED'}`);
    console.log(`Readiness:        ${health.isReadyForPosting ? '✓ READY' : '⚠️  NOT FULLY READY'}`);
    console.log(`Risk Level:       ${health.riskLevel}`);

    if (health.warnings.length > 0) {
      console.log('\n--- Warnings ---');
      health.warnings.forEach((w) => console.log(`- ${w}`));
    }

    if (health.recommendations.length > 0) {
      console.log('\n--- Recommendations ---');
      health.recommendations.forEach((r) => console.log(`- ${r}`));
    }
    process.exit(0);
  }

  if (command === '--preview') {
    const strategy = (args[1] || 'selfhosted') as RedditStrategy;
    const post = RedditService.getCuratedPost(strategy);

    console.log(`Target Subreddit: r/${post.targetSubreddit}`);
    console.log(`Title: ${post.title}\n`);
    console.log('--- Body Preview ---');
    console.log(post.body);
    console.log('\n-------------------');
    process.exit(0);
  }

  if (command === '--publish') {
    const strategy = (args[1] || 'selfhosted') as RedditStrategy;
    const isDryRun = args.includes('--dry-run');

    const curated = RedditService.getCuratedPost(strategy);
    console.log(`Target Subreddit: r/${curated.targetSubreddit}`);
    console.log(`Title: "${curated.title}"`);

    if (isDryRun) {
      console.log('\n[Dry-Run] Simulating submission...');
      const simulatedResult = await RedditMcpClient.submitPost({
        subreddit: curated.targetSubreddit,
        title: curated.title,
        text: curated.body,
      });
      console.log('\n✓ Dry run successful!');
      console.log(`Simulated URL: ${simulatedResult.url}`);
      process.exit(0);
    }

    console.log('\n[Publishing] Submitting live to Reddit...');
    const result = await RedditService.publishPost({
      subreddit: curated.targetSubreddit,
      title: curated.title,
      body: curated.body,
    });

    console.log('\n✓ Post published successfully!');
    console.log(`Reddit URL: ${result.url}`);
    console.log(`Post ID:    ${result.redditId}`);
    process.exit(0);
  }

  console.error(`Unknown command: ${command}. Use --help for usage.`);
  process.exit(1);
}

main().catch((err) => {
  console.error('Fatal error in Reddit Manager:', err);
  process.exit(1);
});
