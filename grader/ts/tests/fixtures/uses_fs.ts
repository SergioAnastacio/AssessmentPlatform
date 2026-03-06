import { readFileSync } from "node:fs";

export function sumTwo(a: number, b: number): number {
  // fake use so import isn't tree-shaken
  void readFileSync;
  return a + b;
}
