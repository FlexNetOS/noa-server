import fg from "fast-glob";
import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import axios from "axios";
import { make } from "@mcp/envelope";

async function symbolProbe(root:string){
  const patterns = ["**/*.{ts,js,py,rs,go,json,yaml,yml}"];
  const files = await fg(patterns, { cwd: root, dot: true, ignore:["**/node_modules/**","**/dist/**",".git/**"] });
  return Promise.all(files.map(async f=>({ file:f, size:(await fs.stat(path.join(root,f))).size })));
}
async function wiringSynth(symbols:any[], outDir:string){
  await fs.mkdir(outDir, { recursive: true });
  const tools = symbols.slice(0,6).map((s,i)=>({ id:`tool_${i}`, impl:`file://${s.file}`, schema:{input:{type:"object"},output:{type:"object"}} }));
  const plan = { id:`plan_${Date.now()}`, tools, lanes:["shm","uds","quic"] };
  await fs.writeFile(path.join(outDir,"rtt.manifest.json"), JSON.stringify(plan,null,2));
  return plan;
}
async function proofForge(plan:any, outDir:string){
  const digest = await sha256(JSON.stringify(plan));
  const att = { subject: plan.id, digest, signed_at: new Date().toISOString() };
  await fs.writeFile(path.join(outDir,"attestation.json"), JSON.stringify(att,null,2));
  return { digest, attestation: att };
}
async function admissionSim(plan:any, opaUrl?:string){
  if(!opaUrl) return { allow:true };
  try{ const r = await axios.post(opaUrl.replace(/\/$/,'')+"/v1/data/rtt/allow", { input: plan }); return r.data; }catch(e:any){ return { allow:false, error:e.message }; }
}
async function sha256(s:string){
  const buf = new TextEncoder().encode(s);
  const dig = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(dig)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
const root = process.env.SCAN_ROOT || process.cwd();
const outDir = process.env.APO_OUT || path.join(root,".apo");
const opa = process.env.OPA_URL;
const symbols = await symbolProbe(root);
const plan = await wiringSynth(symbols, outDir);
const proof = await proofForge(plan, outDir);
const decision = await admissionSim(plan, opa);
const env = make({ type:"mcp.apo.plan", source:"apo://local", data:{ plan, proof, decision } });
await fs.writeFile(path.join(outDir,"event.json"), JSON.stringify(env,null,2));
console.log("APO done", outDir);
