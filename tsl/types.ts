import type { Node } from "three/webgpu";

// A sketch's default export: a TSL Fn callable that returns a color node.
// Loose by design — three/tsl Fn callables are not cleanly typed.
export type ShaderFn = () => Node;