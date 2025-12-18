/**
 * Gemini CLI search_file_content tool - wrapper around Fabric Code's Grep tool
 * Uses Gemini's exact schema and description
 */

import { grep } from "./Grep";

interface SearchFileContentGeminiArgs {
  pattern: string;
  dir_path?: string;
  include?: string;
}

export async function search_file_content(
  args: SearchFileContentGeminiArgs,
): Promise<{ message: string }> {
  // Adapt Gemini params to Fabric Code's Grep tool
  const fabricArgs = {
    pattern: args.pattern,
    path: args.dir_path,
    glob: args.include,
    output_mode: "content" as const, // Return actual matching lines, not just file paths
  };

  const result = await grep(fabricArgs);

  // Grep returns { output: string, matches?, files? }
  return { message: result.output };
}
