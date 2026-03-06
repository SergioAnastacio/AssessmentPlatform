import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

// Minimal JSON Schema validator using Ajv
import Ajv from "ajv";
import addFormats from "ajv-formats";
import add2020 from "ajv/dist/2020.js";

const repoRoot = process.cwd();
const problemsDir = path.join(repoRoot, "problems");
const schemaPath = path.join(repoRoot, "schemas", "problem.schema.json");

const schema = JSON.parse(await readFile(schemaPath, "utf-8"));
const ajv = new add2020({ allErrors: true, allowUnionTypes: true });
addFormats(ajv);
const validate = ajv.compile(schema);

const entries = await readdir(problemsDir, { withFileTypes: true });
const problemIds = entries.filter((e) => e.isDirectory()).map((e) => e.name);

let ok = true;
for (const id of problemIds) {
  const p = path.join(problemsDir, id, "problem.json");
  const data = JSON.parse(await readFile(p, "utf-8"));
  const valid = validate(data);
  if (!valid) {
    ok = false;
    console.error(`Problem schema invalid: ${id}`);
    console.error(validate.errors);
  }
}

if (!ok) process.exit(2);
console.log(`Validated ${problemIds.length} problem(s).`);
