import axios from "axios";
const OPA_URL = process.env.OPA_URL || "";
const OPA_PATH = process.env.OPA_PATH || "v1/data/rtt/allow";
export async function opaDecide(input:any){
  if (!OPA_URL) return { allow: true, note: "OPA_URL not set; default allow" };
  const r = await axios.post(`${OPA_URL.replace(/\/$/,'')}/${OPA_PATH}`, { input }, { timeout: 5000 });
  return r.data;
}
