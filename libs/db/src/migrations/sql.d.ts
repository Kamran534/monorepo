/**
 * TypeScript declaration for importing .sql files as raw strings
 * This allows TypeScript to recognize SQL file imports with the ?raw suffix
 */

declare module '*.sql?raw' {
  const content: string;
  export default content;
}

declare module '*.sql' {
  const content: string;
  export default content;
}
