import { prisma } from '../db/client.js';

export class MentionService {
  /**
   * Records or checks a mention. Returns whether it is new and needs handling.
   */
  static async recordMention(tweetId: string, author: string, text: string) {
    const existing = await prisma.mention.findUnique({
      where: { tweetId },
    });

    if (existing) {
      return {
        mention: existing,
        shouldProcess: existing.status === 'seen',
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
      shouldProcess: true,
    };
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
