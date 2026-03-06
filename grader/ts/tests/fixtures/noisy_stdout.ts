// This submission prints to stdout. It should cause the harness stdout
// to include extra non-JSON output, triggering BAD_JSON classification.
console.log("hello from submission");

export function sumTwo(a: number, b: number): number {
  return a + b;
}
