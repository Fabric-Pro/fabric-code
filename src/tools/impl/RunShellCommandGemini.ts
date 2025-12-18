/**
 * Gemini CLI run_shell_command tool - wrapper around Fabric Code's Bash tool
 * Uses Gemini's exact schema and description
 */

import { bash } from "./Bash";

interface RunShellCommandGeminiArgs {
  command: string;
  description?: string;
  dir_path?: string;
}

export async function run_shell_command(
  args: RunShellCommandGeminiArgs,
): Promise<{ message: string }> {
  // Adapt Gemini params to Fabric Code's Bash tool
  const fabricArgs = {
    command: args.command,
    description: args.description,
  };

  const result = await bash(fabricArgs);

  // Bash returns { content: Array<{ type: string, text: string }>, status: string }
  const message = result.content.map((item) => item.text).join("\n");
  return { message };
}
