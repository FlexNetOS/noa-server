import { Client } from "pg";
import http from "node:http";
const client = new Client({ connectionString: process.env.PG_URI || "postgres://postgres:postgres@127.0.0.1:5432/postgres" });
await client.connect();
http.createServer(async (req,res)=>{
  if(req.method==="POST" && req.url==="/mcp/tools/query"){
    let body=""; for await (const c of req) body+=c;
    try{
      const p = JSON.parse(body||"{}");
      const r = await client.query(p.sql, p.params||[]);
      res.writeHead(200,{"content-type":"application/json"}); res.end(JSON.stringify({ rows:r.rows }));
    }catch(e:any){ res.writeHead(400,{"content-type":"application/json"}); res.end(JSON.stringify({error:e.message})); }
    return;
  }
  res.writeHead(404); res.end();
}).listen(process.env.PORT||9001, ()=>console.log("mcp-db-postgres listening"));
