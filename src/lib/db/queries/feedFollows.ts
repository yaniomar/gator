import { and, eq } from "drizzle-orm";

import { db } from "../index.js";

import {
  feedFollows,
  feeds,
  users,
} from "../schema.js";

export async function createFeedFollow(
  userId: string,
  feedId: string,
) {
  const [newFeedFollow] = await db
    .insert(feedFollows)
    .values({
      userId,
      feedId,
    })
    .returning();

  const [result] = await db
    .select({
      id: feedFollows.id,
      createdAt: feedFollows.createdAt,
      updatedAt: feedFollows.updatedAt,
      userId: feedFollows.userId,
      feedId: feedFollows.feedId,
      userName: users.name,
      feedName: feeds.name,
    })
    .from(feedFollows)
    .innerJoin(
      feeds,
      eq(feedFollows.feedId, feeds.id),
    )
    .innerJoin(
      users,
      eq(feedFollows.userId, users.id),
    )
    .where(
      eq(
        feedFollows.id,
        newFeedFollow.id,
      ),
    );

  return result;
}

export async function getFeedFollowsForUser(
  userId: string,
) {
  return await db
    .select({
      id: feedFollows.id,
      createdAt: feedFollows.createdAt,
      updatedAt: feedFollows.updatedAt,
      userId: feedFollows.userId,
      feedId: feedFollows.feedId,
      userName: users.name,
      feedName: feeds.name,
    })
    .from(feedFollows)
    .innerJoin(
      feeds,
      eq(feedFollows.feedId, feeds.id),
    )
    .innerJoin(
      users,
      eq(feedFollows.userId, users.id),
    )
    .where(
      eq(feedFollows.userId, userId),
    );
}

export async function deleteFeedFollow(
  userId: string,
  feedUrl: string,
) {
  const [feed] = await db
    .select()
    .from(feeds)
    .where(eq(feeds.url, feedUrl));

  if (!feed) {
    throw new Error(
      `feed ${feedUrl} does not exist`,
    );
  }

  const [deletedFollow] = await db
    .delete(feedFollows)
    .where(
      and(
        eq(feedFollows.userId, userId),
        eq(feedFollows.feedId, feed.id),
      ),
    )
    .returning();

  if (!deletedFollow) {
    throw new Error(
      `you are not following ${feedUrl}`,
    );
  }

  return deletedFollow;
}
