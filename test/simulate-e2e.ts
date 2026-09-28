import { buildApp } from '../src/server/app.js';
import { prisma } from '../src/db/client.js';
import { MarketingService } from '../src/services/marketingService.js';

async function runE2ETests() {
  console.log('====================================================');
  console.log('🧪 RUNNING GÜNTHER CORE E2E SIMULATION TEST SUITE');
  console.log('====================================================\n');

  const app = await buildApp();
  await app.ready();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // Test 1: Healthcheck
    console.log('[Step 1] Testing Health Endpoint...');
    const healthRes = await app.inject({
      method: 'GET',
      url: '/health',
    });
    const healthBody = JSON.parse(healthRes.body);
    assert(healthRes.statusCode === 200, 'Health endpoint responds with HTTP 200');
    assert(healthBody.status === 'healthy', 'Health status is "healthy"');
    assert(healthBody.agent === 'Günther', 'Agent name is Günther');

    // Test 2: Webhook Ingestion & Idempotent Revenue Burn
    console.log('\n[Step 2] Simulating Stripe Webhook: checkout.session.completed ($49.00)...');
    const testPaymentId = `pi_test_${Date.now()}`;
    
    // Clean up any potential leftover from previous test
    await prisma.payment.deleteMany({ where: { stripePaymentId: testPaymentId } });

    const webhookRes = await app.inject({
      method: 'POST',
      url: '/webhooks/stripe',
      payload: {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: `cs_${Date.now()}`,
            payment_intent: testPaymentId,
            amount_total: 4900, // $49.00
            currency: 'usd',
            customer_details: { email: 'buyer@agency.com' },
          },
        },
      },
    });

    assert(webhookRes.statusCode === 200, 'Webhook accepted with HTTP 200');
    const webhookBody = JSON.parse(webhookRes.body);
    assert(webhookBody.received === true, 'Webhook acknowledged reception');
    assert(typeof webhookBody.downloadUrl === 'string', `Download URL generated: ${webhookBody.downloadUrl}`);

    // Test 2b: Digital Asset Delivery / Download
    console.log('\n[Step 2b] Verifying Product Download via Token...');
    const downloadRes = await app.inject({
      method: 'GET',
      url: webhookBody.downloadUrl,
    });
    assert(downloadRes.statusCode === 200, 'Download endpoint returns HTTP 200');
    assert(downloadRes.headers['content-disposition']?.includes('Guenther-Craft-Playbook.md') === true, 'Correct content-disposition attachment header');
    assert(downloadRes.body.includes('Günther Craft: Das Playbook'), 'File content contains actual Playbook markdown');

    // Test invalid download token
    const invalidDownloadRes = await app.inject({
      method: 'GET',
      url: '/download/fake_token_123',
    });
    assert(invalidDownloadRes.statusCode === 404, 'Invalid token returns HTTP 404');

    // Allow setImmediate worker to finish
    await new Promise((r) => setTimeout(r, 600));

    // Verify DB State
    const paymentInDb = await prisma.payment.findUnique({
      where: { stripePaymentId: testPaymentId },
    });
    assert(paymentInDb !== null, 'Payment saved in SQLite database');
    assert(paymentInDb?.amountCents === 4900, 'Amount correctly stored as 4900 cents ($49.00)');
    assert(paymentInDb?.status === 'burned', 'Payment status transitioned to "burned"');
    assert(paymentInDb?.downloadCount === 1, 'Download count incremented to 1');
    assert(paymentInDb?.txHash?.startsWith('0x') === true, `Burn TxHash recorded (${paymentInDb?.txHash?.slice(0, 14)}...)`);

    // Test 3: Idempotency (Duplicate Webhook Must NOT Re-Burn)
    console.log('\n[Step 3] Testing Idempotency Guard (Duplicate Stripe Webhook Delivery)...');
    const duplicateRes = await app.inject({
      method: 'POST',
      url: '/webhooks/stripe',
      payload: {
        type: 'checkout.session.completed',
        data: {
          object: {
            payment_intent: testPaymentId,
            amount_total: 4900,
            currency: 'usd',
          },
        },
      },
    });

    const duplicateBody = JSON.parse(duplicateRes.body);
    assert(duplicateBody.status === 'already_burned', 'Duplicate webhook identified as already burned');

    // Test 4: Mention Handling & Brand Voice
    console.log('\n[Step 4] Testing X Mention Handling & Idempotency...');
    const testTweetId = `mention_${Date.now()}`;
    const mentionResult = await MarketingService.handleIncomingMention(
      testTweetId,
      'ai_builder_99',
      'Wie funktioniert euer Token Burn genau?'
    );
    assert(mentionResult !== undefined, 'Brand persona generated reply');
    assert(mentionResult?.tweetId !== undefined, 'Reply posted to X MCP');

    const mentionInDb = await prisma.mention.findUnique({
      where: { tweetId: testTweetId },
    });
    assert(mentionInDb?.status === 'replied', 'Mention marked as replied in SQLite');

    // Test duplicate mention
    const duplicateMention = await MarketingService.handleIncomingMention(
      testTweetId,
      'ai_builder_99',
      'Wie funktioniert euer Token Burn genau?'
    );
    assert(duplicateMention === undefined, 'Duplicate mention safely skipped');

    // Test 5: Traces & Observability
    console.log('\n[Step 5] Checking Observability Traces in SQLite...');
    const traces = await prisma.trace.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    assert(traces.length >= 2, `Traces recorded in DB (${traces.length} found)`);

    // Test 6: Security & Concurrency Verification
    console.log('\n[Step 6] Verifying Security Hardening & Concurrency...');
    
    // 6a: Paywall Protection
    const directProductAccess = await app.inject({
      method: 'GET',
      url: '/products/gunther-craft/PLAYBOOK.md',
    });
    assert(directProductAccess.statusCode === 404, 'Direct static access to paid products returns 404 (Paywall intact)');

    // 6b: Download Limit Enforced (Max 5 downloads)
    for (let i = 0; i < 4; i++) {
      await app.inject({ method: 'GET', url: webhookBody.downloadUrl });
    }
    const limitExceededRes = await app.inject({ method: 'GET', url: webhookBody.downloadUrl });
    assert(limitExceededRes.statusCode === 403, 'Exceeding max download limit returns HTTP 403');
    assert(limitExceededRes.body.includes('Download-Limit'), 'Error explains download limit reached');

    // 6c: Direct Concurrent Double-Burn Attempt
    const directBurnAttempt = await (await import('../src/services/burnService.js')).BurnService.executeBurn(testPaymentId);
    assert(directBurnAttempt.skipped === true, 'Concurrent/duplicate burn attempt atomically skipped via CAS');

  } catch (err) {
    console.error('Test execution failed with error:', err);
    failed++;
  } finally {
    await app.close();
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests();
