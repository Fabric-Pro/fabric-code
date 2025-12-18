/**
 * Gemini CLI glob tool - wrapper around Fabric Code's Glob tool
 * Uses Gemini's exact schema and description
 */

import { glob as fabricGlob } from "./Glob";

interface GlobGeminiArgs {
  pattern: string;
  dir_path?: string;
  case_sensitive?: boolean;
  respect_git_ignore?: boolean;
  respect_gemini_ignore?: boolean;
}

export async function glob_gemini(
  args: GlobGeminiArgs,
): Promise<{ message: string }> {
  // Adapt Gemini params to Fabric Code's Glob tool
  const fabricArgs = {
    pattern: args.pattern,
    path: args.dir_path,
  };

  const result = await fabricGlob(fabricArgs);

  // Glob returns { files: string[], truncated?, totalFiles? }
  const message = result.files.join("\n");
  return { message };
}
