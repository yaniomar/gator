import {
  desc,
  eq,
} from "drizzle-orm";

import { db } from "../index.js";

import {
  feedFollows,
  posts,
} from "../schema.js";

export async function createPost(
  title: string,
  url: string,
  description: string | null,
  publishedAt: Date | null,
  feedId: string,
) {
  const [result] = await db
    .insert(posts)
    .values({
      title,
      url,
      description,
      publishedAt,
      feedId,
    })
    .onConflictDoNothing({
      target: posts.url,
    })
    .returning();

  return result;
}

export async function getPostsForUser(
  userId: string,
  limit: number,
) {
  return await db
    .select({
      id: posts.id,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      title: posts.title,
      url: posts.url,
      description: posts.description,
      publishedAt: posts.publishedAt,
      feedId: posts.feedId,
    })
    .from(posts)
    .innerJoin(
      feedFollows,
      eq(
        posts.feedId,
        feedFollows.feedId,
      ),
    )
    .where(
      eq(
        feedFollows.userId,
        userId,
      ),
    )
    .orderBy(
      desc(posts.publishedAt),
    )
    .limit(limit);
}
