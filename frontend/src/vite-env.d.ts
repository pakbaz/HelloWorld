/// <reference types="vite/client" />

// Allow importing raw text files with the ?raw suffix
declare module '*.sql?raw' {
  const content: string;
  export default content;
}
