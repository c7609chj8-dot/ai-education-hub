export type ActivityCategory="application"|"inquiry"|"content"|"asset"|"brand";
export type ActivityItem={id:string;createdAt:string;actorId:string;targetId:string|null;action:"status_changed"|"viewed"|"saved";revision:number|null;fromStatus:string|null;toStatus:string|null};
export type ActivityPage={items:ActivityItem[];next:{at:string;id:string}|null};
