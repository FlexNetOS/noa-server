import Ajv from "ajv";
import nacl from "tweetnacl";
export const schema = {
  type: "object",
  properties: {
    specversion: { const: "1.0" },
    type: { type: "string" },
    source: { type: "string" },
    id: { type: "string" },
    time: { type: "string" },
    datacontenttype: { type: "string" },
    data: { type: "object" },
    extensions: { type: "object" }
  },
  required: ["specversion","type","source","id","data"]
};
const ajv = new Ajv({allErrors:true});
const validate = ajv.compile(schema);
export function validateEnvelope(obj:any){
  const ok = validate(obj);
  if(!ok) throw new Error("invalid envelope: "+(validate.errors||[]).map(e=>e.message).join("; "));
  return obj;
}
export function make(env: {type:string, source:string, data:any, time?:string, id?:string, extensions?:any}){
  const now = new Date().toISOString();
  const id = env.id || (Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2));
  return validateEnvelope({ specversion:"1.0", datacontenttype:"application/json", time: env.time||now, id, ...env });
}
export function sign(env:any, secretKeyB64:string, kid:string){
  const msg = new TextEncoder().encode(JSON.stringify(env));
  const sk = fromB64(secretKeyB64);
  const sig = nacl.sign.detached(msg, sk);
  env.extensions = env.extensions || {};
  env.extensions.sig = toB64(sig);
  env.extensions.kid = kid;
  return env;
}
export function verify(env:any, publicKeyB64:string){
  const sig = env?.extensions?.sig; if(!sig) return false;
  const msg = new TextEncoder().encode(JSON.stringify({ ...env, extensions: { ...env.extensions, sig: undefined } }));
  const pk = fromB64(publicKeyB64);
  const ok = nacl.sign.detached.verify(msg, fromB64(sig), pk);
  return ok;
}
function toB64(u8:Uint8Array){ return Buffer.from(u8).toString("base64"); }
function fromB64(b:string){ return new Uint8Array(Buffer.from(b,"base64")); }
