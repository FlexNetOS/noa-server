import http from "node:http";
import axios from "axios";
const Q = process.env.QDRANT_URL || "http://127.0.0.1:6333";
http.createServer(async (req,res)=>{
  if(req.method==="POST" && req.url==="/mcp/tools/search"){
    let body=""; for await (const c of req) body+=c;
    try{
      const p = JSON.parse(body||"{}");
      const r = await axios.post(`${Q}/collections/${p.collection}/points/search`, { vector: p.vector, limit: p.k||5, with_payload: true });
      res.writeHead(200,{"content-type":"application/json"}); res.end(JSON.stringify(r.data));
    }catch(e:any){ res.writeHead(400,{"content-type":"application/json"}); res.end(JSON.stringify({error:e.message})); }
    return;
  }
  res.writeHead(404); res.end();
}).listen(process.env.PORT||9003, ()=>console.log("mcp-vector-qdrant listening"));
