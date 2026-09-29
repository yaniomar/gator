import fs from "fs";
import os from "os";
import path from "path";

export type Config = {
  dbUrl: string;
  currentUserName?: string;
};

function getConfigFilePath(): string {
  return path.join(os.homedir(), ".gatorconfig.json");
}

function validateConfig(rawConfig: any): Config {
  if (
    typeof rawConfig !== "object" ||
    rawConfig === null ||
    typeof rawConfig.db_url !== "string"
  ) {
    throw new Error("Invalid config file");
  }

  return {
    dbUrl: rawConfig.db_url,
    currentUserName:
      typeof rawConfig.current_user_name === "string"
        ? rawConfig.current_user_name
        : undefined,
  };
}

function writeConfig(cfg: Config): void {
  const rawConfig = {
    db_url: cfg.dbUrl,
    current_user_name: cfg.currentUserName,
  };

  fs.writeFileSync(
    getConfigFilePath(),
    JSON.stringify(rawConfig, null, 2),
    "utf-8",
  );
}

export function readConfig(): Config {
  const configPath = getConfigFilePath();

  const data = fs.readFileSync(configPath, "utf-8");

  const rawConfig = JSON.parse(data);

  return validateConfig(rawConfig);
}

export function setUser(userName: string): void {
  const cfg = readConfig();

  cfg.currentUserName = userName;

  writeConfig(cfg);
}
