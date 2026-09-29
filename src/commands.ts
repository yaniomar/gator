import {
  readConfig,
  setUser,
} from "./config.js";

import {
  createUser,
  deleteAllUsers,
  getUserByName,
  getUsers,
} from "./lib/db/queries/users.js";

import {
  createFeed,
  getFeedByURL,
  getFeeds,
  getNextFeedToFetch,
  markFeedFetched,
} from "./lib/db/queries/feeds.js";

import {
  createFeedFollow,
  deleteFeedFollow,
  getFeedFollowsForUser,
} from "./lib/db/queries/feedFollows.js";

import {
  createPost,
  getPostsForUser,
} from "./lib/db/queries/posts.js";

import type {
  Feed,
  User,
} from "./lib/db/schema.js";

import { fetchFeed } from "./rss.js";

export type CommandHandler = (
  cmdName: string,
  ...args: string[]
) => Promise<void>;

export type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

export type CommandsRegistry = {
  [key: string]: CommandHandler;
};

export function middlewareLoggedIn(
  handler: UserCommandHandler,
): CommandHandler {
  return async (
    cmdName: string,
    ...args: string[]
  ): Promise<void> => {
    const config = readConfig();

    if (!config.currentUserName) {
      throw new Error(
        "no user is currently logged in",
      );
    }

    const user = await getUserByName(
      config.currentUserName,
    );

    if (!user) {
      throw new Error(
        `User ${config.currentUserName} not found`,
      );
    }

    await handler(
      cmdName,
      user,
      ...args,
    );
  };
}

export async function handlerLogin(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error(
      "username is required",
    );
  }

  const username = args[0];

  const user = await getUserByName(
    username,
  );

  if (!user) {
    throw new Error(
      `user ${username} does not exist`,
    );
  }

  setUser(username);

  console.log(
    `User has been set to ${username}`,
  );
}

export async function handlerRegister(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length === 0) {
    throw new Error(
      "username is required",
    );
  }

  const username = args[0];

  const existingUser =
    await getUserByName(username);

  if (existingUser) {
    throw new Error(
      `user ${username} already exists`,
    );
  }

  const user =
    await createUser(username);

  setUser(username);

  console.log(
    `User ${username} was created`,
  );

  console.log(user);
}

export async function handlerReset(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  await deleteAllUsers();

  console.log(
    "Database reset successfully",
  );
}

export async function handlerUsers(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const allUsers =
    await getUsers();

  const config =
    readConfig();

  for (const user of allUsers) {
    if (
      user.name ===
      config.currentUserName
    ) {
      console.log(
        `* ${user.name} (current)`,
      );
    } else {
      console.log(
        `* ${user.name}`,
      );
    }
  }
}

export function parseDuration(
  durationStr: string,
): number {
  const regex =
    /^(\d+)(ms|s|m|h)$/;

  const match =
    durationStr.match(regex);

  if (!match) {
    throw new Error(
      "invalid duration: use values like 500ms, 1s, 1m, or 1h",
    );
  }

  const value =
    Number(match[1]);

  const unit =
    match[2];

  switch (unit) {
    case "ms":
      return value;

    case "s":
      return value * 1000;

    case "m":
      return value * 60 * 1000;

    case "h":
      return value * 60 * 60 * 1000;

    default:
      throw new Error(
        "invalid duration unit",
      );
  }
}

function formatDuration(
  milliseconds: number,
): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  }

  const totalSeconds =
    Math.floor(milliseconds / 1000);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const totalMinutes =
    Math.floor(totalSeconds / 60);

  const seconds =
    totalSeconds % 60;

  if (totalMinutes < 60) {
    return `${totalMinutes}m${seconds}s`;
  }

  const hours =
    Math.floor(totalMinutes / 60);

  const minutes =
    totalMinutes % 60;

  return `${hours}h${minutes}m${seconds}s`;
}

function parsePublishedDate(
  dateString: string,
): Date | null {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export async function scrapeFeeds(): Promise<void> {
  const feed =
    await getNextFeedToFetch();

  if (!feed) {
    console.log(
      "No feeds found to fetch.",
    );

    return;
  }

  console.log(
    `Fetching feed: ${feed.name} (${feed.url})`,
  );

  const rssFeed =
    await fetchFeed(feed.url);

  await markFeedFetched(
    feed.id,
  );

  console.log(
    `Fetched ${rssFeed.channel.item.length} posts from ${feed.name}`,
  );

  for (const item of rssFeed.channel.item) {
  const publishedAt =
    parsePublishedDate(item.pubDate);

  await createPost(
    item.title,
    item.link,
    item.description,
    publishedAt,
    feed.id,
  );
}
}

export async function handlerAgg(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length < 1) {
    throw new Error(
      "time_between_reqs is required",
    );
  }

  const durationStr =
    args[0];

  const timeBetweenRequests =
    parseDuration(durationStr);

  console.log(
    `Collecting feeds every ${formatDuration(timeBetweenRequests)}`,
  );

  const handleError = (
    error: unknown,
  ) => {
    if (
      error instanceof Error
    ) {
      console.error(
        `Error scraping feeds: ${error.message}`,
      );
    } else {
      console.error(
        "Error scraping feeds:",
        error,
      );
    }
  };

  await scrapeFeeds()
    .catch(handleError);

  const interval =
    setInterval(() => {
      scrapeFeeds()
        .catch(handleError);
    }, timeBetweenRequests);

  await new Promise<void>(
    (resolve) => {
      process.on(
        "SIGINT",
        () => {
          console.log(
            "\nShutting down feed aggregator...",
          );

          clearInterval(
            interval,
          );

          resolve();
        },
      );
    },
  );
}

export function printFeed(
  feed: Feed,
  user: User,
): void {
  console.log(
    `Feed ID: ${feed.id}`,
  );

  console.log(
    `Created At: ${feed.createdAt}`,
  );

  console.log(
    `Updated At: ${feed.updatedAt}`,
  );

  console.log(
    `Name: ${feed.name}`,
  );

  console.log(
    `URL: ${feed.url}`,
  );

  console.log(
    `User: ${user.name}`,
  );
}

export async function handlerAddFeed(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 2) {
    throw new Error(
      "feed name and URL are required",
    );
  }

  const name =
    args[0];

  const url =
    args[1];

  const feed =
    await createFeed(
      name,
      url,
      user.id,
    );

  printFeed(
    feed,
    user,
  );

  const follow =
    await createFeedFollow(
      user.id,
      feed.id,
    );

  console.log(
    `${follow.userName} is now following ${follow.feedName}`,
  );
}

export async function handlerFeeds(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const allFeeds =
    await getFeeds();

  for (
    const feed
    of allFeeds
  ) {
    console.log(
      `Name: ${feed.name}`,
    );

    console.log(
      `URL: ${feed.url}`,
    );

    console.log(
      `User: ${feed.userName}`,
    );

    console.log();
  }
}

export async function handlerFollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 1) {
    throw new Error(
      "feed URL is required",
    );
  }

  const url =
    args[0];

  const feed =
    await getFeedByURL(url);

  if (!feed) {
    throw new Error(
      `feed ${url} does not exist`,
    );
  }

  const follow =
    await createFeedFollow(
      user.id,
      feed.id,
    );

  console.log(
    `${follow.userName} is now following ${follow.feedName}`,
  );
}

export async function handlerFollowing(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  const follows =
    await getFeedFollowsForUser(
      user.id,
    );

  for (
    const follow
    of follows
  ) {
    console.log(
      follow.feedName,
    );
  }
}

export async function handlerUnfollow(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  if (args.length < 1) {
    throw new Error(
      "feed URL is required",
    );
  }

  const url =
    args[0];

  await deleteFeedFollow(
    user.id,
    url,
  );

  console.log(
    `${user.name} unfollowed ${url}`,
  );
}

export async function handlerBrowse(
  cmdName: string,
  user: User,
  ...args: string[]
): Promise<void> {
  let limit = 2;

  if (args.length > 0) {
    const parsedLimit =
      Number.parseInt(args[0], 10);

    if (
      Number.isNaN(parsedLimit) ||
      parsedLimit <= 0
    ) {
      throw new Error(
        "limit must be a positive number",
      );
    }

    limit = parsedLimit;
  }

  const posts =
    await getPostsForUser(
      user.id,
      limit,
    );

  for (const post of posts) {
    console.log(`Title: ${post.title}`);
    console.log(`URL: ${post.url}`);

    if (post.description) {
      console.log(
        `Description: ${post.description}`,
      );
    }

    if (post.publishedAt) {
      console.log(
        `Published: ${post.publishedAt}`,
      );
    }

    console.log();
  }
}

export function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler,
): void {
  registry[cmdName] =
    handler;
}

export async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const handler =
    registry[cmdName];

  if (!handler) {
    throw new Error(
      `unknown command: ${cmdName}`,
    );
  }

  await handler(
    cmdName,
    ...args,
  );
}
