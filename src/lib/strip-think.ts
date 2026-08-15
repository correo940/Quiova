export function stripThinkTags(text: string): string {
  let result = text.replace(/<think>[\s\S]*?<\/think>/g, '');
  result = result.replace(/<think>[\s\S]*/g, '');
  return result.trim();
}
