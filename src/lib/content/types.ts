export type ContentKind="news"|"faq"|"partnership";
export type ContentLinkPath="/programs"|"/schedule"|"/partnership"|"/contact";
export type ContentItem={id:string;kind:ContentKind;category:string;title:string;body:string;linkPath:ContentLinkPath|null;linkLabel:string|null;displayDate:string|null;sortOrder:number};
export type ManagedContent=ContentItem & {isPublic:boolean;revision:number;updatedAt:string};
export type ContentCursor={kind:ContentKind;order:number;id:string};
export type ContentPage={items:ManagedContent[];next:ContentCursor|null};
