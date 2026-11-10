/// <reference types="vite/client" />

declare module 'virtual:ts-libs' {
  const libs: Record<string, string>;
  export default libs;
}
