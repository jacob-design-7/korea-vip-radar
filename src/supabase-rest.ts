export interface SupabaseRestOptions {
  url?: string;
  serviceRoleKey?: string;
  fetchImpl?: typeof fetch;
}
function requireEnv(name:string,value?:string){if(!value)throw new Error(`${name} is required.`);return value.replace(/\/$/,"");}
export class SupabaseRestClient {
  readonly baseUrl:string; readonly key:string; readonly fetchImpl:typeof fetch;
  constructor(options:SupabaseRestOptions={}){
    this.baseUrl=requireEnv("SUPABASE_URL",options.url??process.env.SUPABASE_URL);
    this.key=requireEnv("SUPABASE_SERVICE_ROLE_KEY",options.serviceRoleKey??process.env.SUPABASE_SERVICE_ROLE_KEY);
    this.fetchImpl=options.fetchImpl??fetch;
  }
  private headers(extra:Record<string,string>={}){
    const h:Record<string,string>={apikey:this.key,"Content-Type":"application/json",Accept:"application/json",...extra};
    if(!this.key.startsWith("sb_secret_")) h.Authorization=`Bearer ${this.key}`;
    return h;
  }
  private async parse(response:Response){
    const text=await response.text();let body:any=null;
    if(text){try{body=JSON.parse(text);}catch{body=text;}}
    if(!response.ok)throw new Error(`Supabase REST failed (${response.status}): ${typeof body==="string"?body:JSON.stringify(body)}`);
    return body;
  }
  async request<T>(path:string,init:RequestInit={}):Promise<T>{
    const res=await this.fetchImpl(`${this.baseUrl}/rest/v1/${path}`,{...init,headers:{...this.headers(),...(init.headers as any??{})},cache:"no-store"});
    return await this.parse(res) as T;
  }
  async select<T=any>(table:string,query="select=*"):Promise<T[]>{
    return await this.request<T[]>(`${encodeURIComponent(table)}?${query}`);
  }
  async insert<T=any>(table:string,row:unknown,select="*"):Promise<T[]>{
    return await this.request<T[]>(`${encodeURIComponent(table)}?select=${encodeURIComponent(select)}`,{
      method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(row)
    });
  }
  async update<T=any>(table:string,filters:string,patch:unknown,select="*"):Promise<T[]>{
    return await this.request<T[]>(`${encodeURIComponent(table)}?${filters}&select=${encodeURIComponent(select)}`,{
      method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(patch)
    });
  }
  async rpc<T=any>(fn:string,args:Record<string,unknown>):Promise<T>{
    return await this.request<T>(`rpc/${encodeURIComponent(fn)}`,{method:"POST",body:JSON.stringify(args)});
  }
}
