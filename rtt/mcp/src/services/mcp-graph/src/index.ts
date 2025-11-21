import fg from "fast-glob";
import { readFile } from "node:fs/promises";
import neo4j from "neo4j-driver";
const uri = process.env.NEO4J_URI || "bolt://127.0.0.1:7687";
const user = process.env.NEO4J_USER || "neo4j";
const pass = process.env.NEO4J_PASS || "test1234";
const driver = neo4j.driver(uri, neo4j.auth.basic(user, pass));
const session = driver.session();
async function ingest(root:string){
  const files = await fg(["**/rtt.manifest.json"], { cwd: root, ignore:["**/node_modules/**","**/dist/**"] });
  for(const f of files){
    const doc = JSON.parse(await readFile(root + "/" + f, "utf-8"));
    await session.executeWrite(tx=>tx.run(`
      MERGE (p:Plan {id:$id})
      SET p.providers=$providers, p.lanes=$lanes
      WITH p
      UNWIND $tools as t
      MERGE (tool:Tool {id:t.id})
      SET tool.impl=t.impl
      MERGE (p)-[:USES]->(tool)
    `, { id: doc.id, providers: doc.providers||[], lanes: doc.lanes||[], tools: doc.tools||[] }));
    console.log("ingested", f);
  }
}
await ingest(process.env.SCAN_ROOT || process.cwd());
await session.close(); await driver.close();
