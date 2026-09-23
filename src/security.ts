import dns from "node:dns/promises";
import net from "node:net";

export class UnsafeUrlError extends Error {}

function ipv4Int(ip:string){return ip.split(".").reduce((a,p)=>((a<<8)|Number(p))>>>0,0)>>>0;}
function in4(ip:string,n:string,p:number){const m=p===0?0:(0xffffffff<<(32-p))>>>0;return (ipv4Int(ip)&m)===(ipv4Int(n)&m);}
export function isPublicIp(address:string){
  const v=net.isIP(address);
  if(v===4){
    const blocked:[string,number][]=[
      ["0.0.0.0",8],["10.0.0.0",8],["100.64.0.0",10],["127.0.0.0",8],["169.254.0.0",16],
      ["172.16.0.0",12],["192.0.0.0",24],["192.0.2.0",24],["192.168.0.0",16],["198.18.0.0",15],
      ["198.51.100.0",24],["203.0.113.0",24],["224.0.0.0",4],["240.0.0.0",4]
    ];
    return !blocked.some(([n,p])=>in4(address,n,p));
  }
  if(v===6){
    const x=address.toLowerCase();
    if(x==="::"||x==="::1"||x.startsWith("fc")||x.startsWith("fd")||/^fe[89ab]/.test(x)||x.startsWith("ff")||x.startsWith("2001:db8:")) return false;
    return true;
  }
  return false;
}
export function validateUrlShape(raw:string){
  let u:URL; try{u=new URL(raw);}catch{throw new UnsafeUrlError("Invalid URL");}
  if(!["http:","https:"].includes(u.protocol)) throw new UnsafeUrlError("Only http/https allowed");
  if(u.username||u.password) throw new UnsafeUrlError("URL credentials are not allowed");
  const port=u.port?Number(u.port):(u.protocol==="https:"?443:80);
  if(![80,443].includes(port)) throw new UnsafeUrlError("Only ports 80/443 allowed");
  return u;
}
export async function resolvePublicAddress(host:string){
  if(net.isIP(host)){if(!isPublicIp(host))throw new UnsafeUrlError("Blocked address");return {address:host,family:net.isIP(host) as 4|6};}
  const answers=await dns.lookup(host,{all:true,verbatim:true});
  if(!answers.length) throw new UnsafeUrlError("DNS resolution failed");
  const unsafe=answers.find(x=>!isPublicIp(x.address)); if(unsafe) throw new UnsafeUrlError("Hostname resolves to blocked address");
  const pick=answers.find(x=>x.family===4)??answers[0];
  return {address:pick.address,family:pick.family as 4|6};
}
