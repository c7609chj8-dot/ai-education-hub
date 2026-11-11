import type {AssetKind,AssetType} from "./validation";
export type AssetItem={id:string;kind:AssetKind;title:string;description:string;mime:AssetType["mime"];byteSize:number;createdAt:string};
export type ManagedAsset=AssetItem & {isPublic:boolean;revision:number};
export type AssetCursor={at:string;id:string};
export type AssetPage={items:ManagedAsset[];next:AssetCursor|null};
