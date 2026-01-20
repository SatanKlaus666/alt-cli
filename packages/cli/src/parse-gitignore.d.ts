declare module 'parse-gitignore' {
  export default function parseGitignore(
    content: string | Buffer,
  ): { patterns: Array<string> }
}
