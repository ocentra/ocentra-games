// Type declarations for Vite asset imports
// These are used in @cloudflare/vitest-pool-workers which bundles tests with Vite

declare module '*.png?arraybuffer' {
  const content: ArrayBuffer;
  export default content;
}

declare module '*.jpg?arraybuffer' {
  const content: ArrayBuffer;
  export default content;
}

declare module '*.jpeg?arraybuffer' {
  const content: ArrayBuffer;
  export default content;
}

declare module '*.gif?arraybuffer' {
  const content: ArrayBuffer;
  export default content;
}

declare module '*.webp?arraybuffer' {
  const content: ArrayBuffer;
  export default content;
}

declare module '*.txt?raw' {
  const content: string;
  export default content;
}

declare module '*.toml?raw' {
  const content: string;
  export default content;
}

declare module '*.txt' {
  const content: string;
  export default content;
}

declare module '*.asset?arraybuffer' {
  const content: ArrayBuffer;
  export default content;
}

declare module '*.asset?raw' {
  const content: string;
  export default content;
}
