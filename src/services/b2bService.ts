import { z } from 'zod';
import { prisma } from '../db/client.js';
import { StripeMcpClient } from '../mcp/stripeMcp.js';
import { PaymentService } from './paymentService.js';
import { BurnService } from './burnService.js';
import { MarketingService } from './marketingService.js';
import { TraceService } from './traceService.js';
import { config } from '../config/index.js';
import { guntherCharacter } from '../core/character.js';

export const B2bIntakeSchema = z.object({
  companyName: z.string().min(2, 'Firmenname muss mindestens 2 Zeichen lang sein.'),
  contactName: z.string().min(2, 'Kontaktname muss mindestens 2 Zeichen lang sein.'),
  contactEmail: z.string().email('Ungültige E-Mail-Adresse.'),
  useCase: z.string().min(10, 'Bitte beschreibe den Anwendungsfall detaillierter (min. 10 Zeichen).'),
  monthlyVolume: z.string().default('<1,000 Transaktionen/Mo'),
  integrations: z.union([z.string(), z.array(z.string())]).transform((val) =>
    Array.isArray(val) ? val.join(', ') : val
  ),
});

export type B2bIntakeInput = z.infer<typeof B2bIntakeSchema>;

export class B2bService {
  public static readonly SETUP_FEE_CENTS = 200000; // $2,000 USD
  public static readonly RETAINER_MONTHLY_CENTS = 50000; // $500 USD / Month

  /**
   * Validates and submits a new B2B client inquiry.
   * Immediately triggers automated architecture proposal drafting.
   */
  public static async submitLead(rawInput: unknown) {
    const validated = B2bIntakeSchema.parse(rawInput);

    const lead = await prisma.b2bLead.create({
      data: {
        companyName: validated.companyName,
        contactName: validated.contactName,
        contactEmail: validated.contactEmail,
        useCase: validated.useCase,
        monthlyVolume: validated.monthlyVolume,
        integrations: validated.integrations,
        status: 'submitted',
      },
    });

    // Generate Proposal
    const proposalMarkdown = await this.generateProposal(lead.id);

    return {
      leadId: lead.id,
      companyName: lead.companyName,
      status: 'qualified',
      proposalMarkdown,
    };
  }

  /**
   * Generates a tailored Enterprise Architecture Proposal using Claude 3.5 Sonnet or structured fallback.
   */
  public static async generateProposal(leadId: string): Promise<string> {
    const lead = await prisma.b2bLead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error(`Lead with id ${leadId} not found.`);
    }

    let proposal = '';

    if (config.llm.anthropicApiKey) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.llm.anthropicApiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1000,
            system: `${guntherCharacter.systemPrompt}\nDu erstellst verbindliche, eiskalt präzise B2B-Architekturangebote für Clawcommerce.`,
            messages: [
              {
                role: 'user',
                content: `Erstelle ein B2B-Architekturangebot für Kunde:
Unternehmen: ${lead.companyName}
Ansprechpartner: ${lead.contactName}
Anwendungsfall: ${lead.useCase}
Volumen: ${lead.monthlyVolume}
Schnittstellen: ${lead.integrations}

Preise:
- Einmaliges Setup: $2,000 USD (Architektur, Proxmox/Docker Deployment, MCP-Server Integration)
- Monatlicher Retainer: $500 USD/Monat (Monitoring, Langfuse Tracing, Tokenomics & SLA)
Alle Erlöse fließen in $GÜNTER Burns.
Halte das Angebot fokussiert und technisch exakt.`,
              },
            ],
          }),
          signal: AbortSignal.timeout(8000),
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          proposal = data.content?.[0]?.text || '';
        }
      } catch (err) {
        console.warn('[B2bService] Claude proposal generation failed or timed out. Falling back to deterministic template.');
      }
    }

    if (!proposal) {
      proposal = `# Clawcommerce Enterprise Proposal: ${lead.companyName}

**Erstellt von:** Günther — Autonomer KI-Unternehmer  
**Kunde:** ${lead.companyName} (${lead.contactName})  
**Datum:** ${new Date().toLocaleDateString('de-DE')}  
**Status:** Qualifiziertes Festpreis-Angebot  

---

## 1. Anwendungsfall & Zielarchitektur
- **Fokus:** ${lead.useCase}
- **Geplantes Monatsvolumen:** ${lead.monthlyVolume}
- **Integrierte Schnittstellen:** ${lead.integrations}
- **Technologie-Stack:** ElizaOS Core, Fastify Webhook Gateway, SQLite / Prisma State Engine, CDP AgentKit (Base L2 MPC)

## 2. Leistungsumfang & Deliverables
1. **Containerisiertes Setup:** Isolierter Debian/Docker Stack auf Proxmox VE oder Cloud-Instanz.
2. **Dedizierte MCP Server:** Maßgeschneiderte Schnittstellenanbindung für ${lead.integrations}.
3. **Idempotenz & Paywall:** Garantiert fehlerfreie State-Machine gegen Race Conditions und Double-Processing.
4. **Langfuse Observability:** Vollständiges Token- und Kostenmonitoring in Echtzeit.

## 3. Konditionen
- **Einmalige Setup-Pauschale:** **$2.000,00 USD**
- **Monatlicher Retainer:** **$500,00 USD / Monat** (Inkl. Heartbeat-Monitoring, Bugfixes und Modell-Updates)

*Transparenz-Garantie: 100% der Nettoerlöse werden unwiderruflich in $GÜNTER Token-Burns auf Base L2 konvertiert.*
`;
    }

    await prisma.b2bLead.update({
      where: { id: lead.id },
      data: {
        proposalMarkdown: proposal,
        status: 'qualified',
      },
    });

    await TraceService.recordTrace({
      taskId: `b2b-proposal-${lead.id}`,
      model: config.llm.anthropicApiKey ? 'claude-3-5-sonnet' : 'deterministic-template',
      task: 'GENERATE_B2B_PROPOSAL',
      status: 'ok',
      metadata: { companyName: lead.companyName },
    });

    return proposal;
  }

  /**
   * Generates a Stripe Checkout Session for the $2,000 setup fee.
   */
  public static async createCheckoutSession(leadId: string, origin: string) {
    const lead = await prisma.b2bLead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error(`Lead with id ${leadId} not found.`);
    }

    const session = await StripeMcpClient.createCheckoutSession({
      title: `[Clawcommerce B2B] Setup: ${lead.companyName}`,
      description: `Schlüsselfertiges autonomes KI-Agenten-Setup für ${lead.companyName}. Setup: $2,000 USD.`,
      priceInCents: this.SETUP_FEE_CENTS,
      metadata: {
        type: 'b2b_setup',
        leadId: lead.id,
        companyName: lead.companyName,
      },
      successUrl: `${origin}/?b2b_success=true&leadId=${lead.id}`,
      cancelUrl: `${origin}/?b2b_canceled=true`,
    });

    // Create or update contract record
    await prisma.b2bContract.upsert({
      where: { leadId: lead.id },
      update: {
        setupFeeCents: this.SETUP_FEE_CENTS,
        retainerMonthlyCents: this.RETAINER_MONTHLY_CENTS,
      },
      create: {
        leadId: lead.id,
        setupFeeCents: this.SETUP_FEE_CENTS,
        retainerMonthlyCents: this.RETAINER_MONTHLY_CENTS,
        setupPaid: false,
      },
    });

    await prisma.b2bLead.update({
      where: { id: lead.id },
      data: {
        stripeCheckoutId: session.sessionId,
      },
    });

    return {
      checkoutUrl: session.sessionUrl,
      sessionId: session.sessionId,
    };
  }

  /**
   * Handles payment confirmation for B2B Setup fee.
   * Updates contract, triggers $2,000 Base L2 token burn and Proof-of-Burn announcement.
   */
  public static async handleB2bPayment(params: {
    leadId: string;
    stripePaymentId: string;
    amountCents: number;
    customerEmail?: string;
  }) {
    const lead = await prisma.b2bLead.findUnique({
      where: { id: params.leadId },
      include: { contract: true },
    });

    if (!lead) {
      throw new Error(`Lead with id ${params.leadId} not found.`);
    }

    if (lead.contract?.setupPaid) {
      return { status: 'already_paid', lead };
    }

    // 1. Record incoming payment in unified Payment table
    const burnPaymentId = `b2b_${params.stripePaymentId}`;
    await PaymentService.recordIncomingPayment({
      paymentId: burnPaymentId,
      sessionId: params.stripePaymentId,
      amountCents: params.amountCents,
      currency: 'USD',
      customerEmail: params.customerEmail || lead.contactEmail,
    });

    // 2. Mark contract as setup paid & update lead status
    await prisma.b2bContract.update({
      where: { leadId: lead.id },
      data: {
        setupPaid: true,
        subscriptionStatus: 'active',
        totalBurnedCents: { increment: params.amountCents },
      },
    });

    await prisma.b2bLead.update({
      where: { id: lead.id },
      data: { status: 'contracted' },
    });

    // 3. Trigger $2,000 Token Burn asynchronously
    setImmediate(async () => {
      try {
        const burnRes = await BurnService.executeBurn(burnPaymentId);
        if (burnRes.success && burnRes.txHash && burnRes.burnAmount) {
          await prisma.b2bContract.update({
            where: { leadId: lead.id },
            data: { setupTxHash: burnRes.txHash },
          });

          // Enterprise announcement
          await MarketingService.announceBurn(
            params.amountCents,
            burnRes.burnAmount,
            burnRes.txHash
          );
        }
      } catch (err) {
        console.error(`[B2bService] Failed to execute burn for lead ${lead.id}:`, err);
      }
    });

    return {
      status: 'contracted',
      leadId: lead.id,
      amountCents: params.amountCents,
    };
  }

  /**
   * Retrieves lead details by ID.
   */
  public static async getLead(leadId: string) {
    return prisma.b2bLead.findUnique({
      where: { id: leadId },
      include: { contract: true },
    });
  }

  /**
   * Lists leads with optional status filter.
   */
  public static async listLeads(status?: string) {
    const where = status ? { status } : {};
    return prisma.b2bLead.findMany({
      where,
      include: { contract: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
