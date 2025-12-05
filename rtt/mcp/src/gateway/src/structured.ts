import Ajv from "ajv";
const ajv = new Ajv({ allErrors: true, strict: true, coerceTypes: true });
export function extractJson(text: string): any {
  try { return JSON.parse(text); } catch {}
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (m) { try { return JSON.parse(m[1]); } catch {} }
  const start = text.indexOf("{"); const end = text.lastIndexOf("}");
  if (start>=0 && end>start) { try { return JSON.parse(text.slice(start, end+1)); } catch {} }
  throw new Error("no valid JSON found");
}
export function coerceAndValidate(obj: any, schema: any){
  const validate = ajv.compile(schema);
  const ok = validate(obj);
  if (!ok) {
    const msg = (validate.errors||[]).map(e=>`${e.instancePath} ${e.message}`).join("; ");
    throw new Error(`schema validation failed: ${msg}`);
  }
  return obj;
}
