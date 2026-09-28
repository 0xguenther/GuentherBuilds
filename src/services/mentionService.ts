import { prisma } from '../db/client.js';

export class MentionService {
  /**
   * Records a new mention if not yet tracked.
   */
  static async recordMention(tweetId: string, author: string, text: string) {
    const existing = await prisma.mention.findUnique({
      where: { tweetId },
    });

    if (existing) {
      return {
        mention: existing,
        isNew: false,
      };
    }

    const created = await prisma.mention.create({
      data: {
        tweetId,
        author,
        text,
        status: 'seen',
      },
    });

    return {
      mention: created,
      isNew: true,
    };
  }

  /**
   * Atomically claims a mention for replying using CAS.
   * Only transitions from 'seen' to 'replying'.
   * Prevents double-reply race conditions.
   */
  static async claimForReplying(tweetId: string): Promise<boolean> {
    const res = await prisma.mention.updateMany({
      where: {
        tweetId,
        status: 'seen',
      },
      data: { status: 'replying' },
    });
    return res.count > 0;
  }

  static async markReplying(tweetId: string) {
    return prisma.mention.update({
      where: { tweetId },
      data: { status: 'replying' },
    });
  }

  static async markReplied(tweetId: string, replyId: string) {
    return prisma.mention.update({
      where: { tweetId },
      data: {
        status: 'replied',
        replyId,
      },
    });
  }

  static async markFailed(tweetId: string) {
    return prisma.mention.update({
      where: { tweetId },
      data: { status: 'failed' },
    });
  }
}
