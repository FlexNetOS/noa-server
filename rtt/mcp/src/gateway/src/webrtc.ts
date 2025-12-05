import { RTCPeerConnection } from "wrtc";
import type { Request, Response } from "express";
import { routeChat } from "./router_chat.js";
import { v4 as uuidv4 } from "uuid";
function iceServers(){ const raw=process.env.ICE_SERVERS||""; if(!raw) return [{urls:"stun:stun.l.google.com:19302"}]; try{return JSON.parse(raw);}catch{return[{urls:raw}]} }
export async function offerHandler(req: Request, res: Response){
  const { sdp, type } = req.body || {}; if (!sdp || type !== "offer") return res.status(400).json({ error: "invalid offer" });
  const pc = new RTCPeerConnection({ iceServers: iceServers() });
  pc.ondatachannel = ev => {
    const dc = ev.channel;
    dc.onmessage = async (msg) => { try { const data = JSON.parse(String(msg.data)); const out = await routeChat(data, uuidv4()); dc.send(JSON.stringify(out)); } catch (e:any){ dc.send(JSON.stringify({ error: e.message || "bad request" })); } };
  };
  await pc.setRemoteDescription({ type: "offer", sdp });
  const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
  res.json({ type: "answer", sdp: pc.localDescription?.sdp });
}
