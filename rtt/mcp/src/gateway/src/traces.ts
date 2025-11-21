const buf: { id: string, ts: number, model: string }[] = [];
const MAX = 200;
export function recordTrace(id: string, meta: { ts: number, model: string }){ buf.push({ id, ...meta }); while (buf.length > MAX) buf.shift(); }
export function tracesApi(){ return buf.slice(-MAX).reverse(); }
