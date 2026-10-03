import { PaymentService } from './paymentService.js';
import { Web3McpClient, BurnPendingError } from '../mcp/web3Mcp.js';
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

    // Bereits gesendeter Burn: nur Bestätigung prüfen, niemals erneut senden.
    if (payment.status === 'burning' && payment.txHash) {
      const state = await Web3McpClient.getReceiptStatus(payment.txHash);
      if (state === 'success') {
        const amountWhole = BigInt(payment.amountCents) * 10n;
        await PaymentService.markBurned(stripePaymentId, amountWhole, payment.txHash);
        return { success: true, txHash: payment.txHash, burnAmount: amountWhole };
      }
      if (state === 'reverted') {
        await PaymentService.markFailed(stripePaymentId, 'reverted on chain');
        return { success: false, reason: 'REVERTED' };
      }
      return { pending: true, txHash: payment.txHash };
    }

    // Atomic CAS claim: only one concurrent process can transition to 'burning'
    const claimed = await PaymentService.claimForBurning(stripePaymentId);
    if (!claimed) {
      const current = await PaymentService.getPaymentByStripeId(stripePaymentId);
      console.log(`[BurnService] Payment ${stripePaymentId} is already ${current?.status}. Skipping.`);
      return { skipped: true, txHash: current?.txHash };
    }

    // Hash des bereits gesendeten Burns. Ab hier darf kein Fehler mehr zu "failed" führen.
    let broadcastHash: string | undefined;

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

      broadcastHash = txResult.txHash;

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
      if (err instanceof BurnPendingError) {
        await PaymentService.markPending(stripePaymentId, err.txHash);
        return { pending: true, txHash: err.txHash };
      }
      // Burn ist auf der Chain: nicht auf failed setzen (würde erneutes Verbrennen erlauben).
      if (broadcastHash) {
        await PaymentService.markPending(stripePaymentId, broadcastHash);
        return { pending: true, txHash: broadcastHash };
      }
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
