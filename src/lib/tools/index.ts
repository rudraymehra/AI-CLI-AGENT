import { getTheWeatherOfCity } from "./weather";
import { getGithubDetailsAboutUser } from "./github";
import { executeCommand } from "./exec";
import { writeFile } from "./writeFile";

export type ToolFn = (args: unknown) => Promise<unknown>;

export const tool_map: Record<string, ToolFn> = {
  getTheWeatherOfCity,
  getGithubDetailsAboutUser,
  executeCommand,
  writeFile,
};

export const tool_names = Object.keys(tool_map);
