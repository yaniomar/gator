import {
  CommandsRegistry,
  handlerAddFeed,
  handlerAgg,
  handlerFeeds,
  handlerFollow,
  handlerFollowing,
  handlerLogin,
  handlerRegister,
  handlerReset,
  handlerUnfollow,
  handlerUsers,
  middlewareLoggedIn,
  registerCommand,
  runCommand,
  handlerBrowse,
} from "./commands.js";

async function main() {
  const registry: CommandsRegistry =
    {};

  registerCommand(
    registry,
    "login",
    handlerLogin,
  );

  registerCommand(
    registry,
    "register",
    handlerRegister,
  );

  registerCommand(
    registry,
    "reset",
    handlerReset,
  );

  registerCommand(
    registry,
    "users",
    handlerUsers,
  );

  registerCommand(
    registry,
    "agg",
    handlerAgg,
  );

  registerCommand(
    registry,
    "addfeed",
    middlewareLoggedIn(
      handlerAddFeed,
    ),
  );

  registerCommand(
    registry,
    "feeds",
    handlerFeeds,
  );

  registerCommand(
    registry,
    "follow",
    middlewareLoggedIn(
      handlerFollow,
    ),
  );

  registerCommand(
    registry,
    "following",
    middlewareLoggedIn(
      handlerFollowing,
    ),
  );

  registerCommand(
    registry,
    "unfollow",
    middlewareLoggedIn(
      handlerUnfollow,
    ),
  );

  registerCommand(
  registry,
  "browse",
  middlewareLoggedIn(
    handlerBrowse,
  ),
);

  const args =
    process.argv.slice(2);

  if (args.length < 1) {
    console.error(
      "not enough arguments provided",
    );

    process.exit(1);
  }

  const cmdName =
    args[0];

  const cmdArgs =
    args.slice(1);

  try {
    await runCommand(
      registry,
      cmdName,
      ...cmdArgs,
    );
  } catch (error) {
    if (
      error instanceof Error
    ) {
      console.error(
        error.message,
      );
    } else {
      console.error(error);
    }

    process.exit(1);
  }

  process.exit(0);
}

main();
