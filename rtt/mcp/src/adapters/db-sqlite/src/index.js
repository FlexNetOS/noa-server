const http = require("http");
const Database = require("better-sqlite3");
const db = new Database(process.env.SQLITE_PATH || "/tmp/mcp.sqlite");
http.createServer((req,res)=>{
  if(req.method==="POST" && req.url==="/mcp/tools/query"){
    let body=""; req.on("data",c=>body+=c); req.on("end",()=>{
      try{
        const p = JSON.parse(body||"{}");
        const stmt = db.prepare(p.sql);
        const rows = p.args ? stmt.all(...p.args) : stmt.all();
        res.writeHead(200,{"content-type":"application/json"}); res.end(JSON.stringify({rows}));
      }catch(e){ res.writeHead(400,{"content-type":"application/json"}); res.end(JSON.stringify({error:e.message})); }
    }); return;
  }
  res.writeHead(404); res.end();
}).listen(process.env.PORT||9002, ()=>console.log("mcp-db-sqlite listening"));
