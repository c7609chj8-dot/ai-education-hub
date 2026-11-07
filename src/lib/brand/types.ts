export type Brand = {name:string;slogan:string;email:string|null;phone:string|null;address:string|null};
export type ManagedBrand = Brand & {revision:number;isPublic:boolean};
const clean=(x:unknown,max:number):x is string=>typeof x==="string"&&x===x.trim()&&!!x&&Array.from(x).length<=max&&!/[\u0000-\u001f\u007f]/.test(x);
export function parseBrand(value:unknown):Brand|null {
 if(!value||typeof value!=="object")return null;const r=value as Record<string,unknown>;
 if(!clean(r.name,80)||!clean(r.slogan,160)||!(r.email===null||(clean(r.email,254)&&/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(r.email)))||!(r.phone===null||(clean(r.phone,30)&&r.phone.length>=6&&/^[0-9+() -]+$/.test(r.phone)))||!(r.address===null||clean(r.address,200)))return null;
 return {name:r.name,slogan:r.slogan,email:r.email,phone:r.phone,address:r.address};
}
