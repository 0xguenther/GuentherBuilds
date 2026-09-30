import { CommunityGrowthService } from '../src/services/communityGrowthService.js';
import { prisma } from '../src/db/client.js';

async function testGrowthEngagement() {
  console.log('Testing CommunityGrowthService...');
  
  // 1. Process mentions (in test mode returns simulated or empty)
  const mentionsProcessed = await CommunityGrowthService.processIncomingMentions();
  console.log(`Mentions processed: ${mentionsProcessed}`);

  // 2. Publish builder insight with force=true (simulated in test mode)
  process.env.NODE_ENV = 'test';
  const insight = await CommunityGrowthService.publishBuilderInsight(true);
  console.log('Builder insight result:', insight);

  if (!insight.published || !insight.tweetId) {
    throw new Error('Expected builder insight to be published in test mode');
  }

  // 3. Test architecture thread publishing
  const thread = await CommunityGrowthService.publishArchitectureThread();
  console.log('Architecture thread result:', thread);

  if (!thread.published || thread.tweetIds.length !== 5) {
    throw new Error('Expected 5-part architecture thread to be published');
  }

  console.log('✅ ALL CommunityGrowthService tests passed!');
}

testGrowthEngagement()
  .catch((err) => {
    console.error('❌ Growth test failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
