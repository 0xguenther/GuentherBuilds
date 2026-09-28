import { PaymentService } from './paymentService.js';
import { Web3McpClient } from '../mcp/web3Mcp.js';
import { TraceService } from './traceService.js';

export class BurnService {
  /**
   * Executes the revenue burn for a given payment.
   * Ensures idempotency: will never burn twice for the same payment.
   */
  static async executeBurn(stripePaymentId: string) {
    const payment = await PaymentService.getPaymentByStripeId(stripePaymentId);
    if (!payment) {
      throw new Error(`Payment with ID ${stripePaymentId} not found.`);
    }

    if (payment.status === 'burned') {
      console.log(`[BurnService] Payment ${stripePaymentId} is already burned. Skipping.`);
      return { skipped: true, txHash: payment.txHash };
    }

    // Mark as burning
    await PaymentService.markBurning(stripePaymentId);

    try {
      // Calculation: Net revenue in Cents converted to Token Burn Units (e.g. 1000 tokens per dollar / 10 tokens per cent)
      const rateTokensPerCent = 10n; // Example rate: 10 GÜNTER per cent ($1 = 1,000 GÜNTER)
      const burnAmountWholeTokens = BigInt(payment.amountCents) * rateTokensPerCent; // e.g. 49,000 GÜNTER
      const tokenDecimals = 18n;
      const burnAmountUnits = burnAmountWholeTokens * (10n ** tokenDecimals);

      // Execute through CDP Web3 MCP
      const txResult = await Web3McpClient.burnTokens({
        amount: burnAmountUnits,
        referenceId: stripePaymentId,
      });

      // Update state in database with whole tokens (fits 64-bit SQLite integer)
      await PaymentService.markBurned(stripePaymentId, burnAmountWholeTokens, txResult.txHash);

      await TraceService.recordTrace({
        taskId: `burn-${stripePaymentId}`,
        model: 'web3-cdp-agentkit',
        task: 'EXECUTE_BURN',
        status: 'ok',
        metadata: { txHash: txResult.txHash, amountBurned: burnAmountWholeTokens.toString() },
      });

      console.log(`[BurnService] Successfully burned tokens for payment ${stripePaymentId}. Tx: ${txResult.txHash}`);
      return { success: true, txHash: txResult.txHash, burnAmount: burnAmountWholeTokens };
    } catch (err: any) {
      console.error(`[BurnService] Burn failed for ${stripePaymentId}:`, err);
      await PaymentService.markFailed(stripePaymentId, err.message || 'Unknown error');
      
      await TraceService.recordTrace({
        taskId: `burn-${stripePaymentId}`,
        model: 'web3-cdp-agentkit',
        task: 'EXECUTE_BURN',
        status: 'error',
        metadata: { error: err.message },
      });

      throw err;
    }
  }
}
