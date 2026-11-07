import Link from "next/link";
import {listPublishedContent} from "@/lib/content/public";
import {formatDate} from "@/lib/dates";
import type {ContentKind} from "@/lib/content/types";
import {FaqList} from "@/app/faq/faq-list";
const headings:Record<ContentKind,string>={news:"공지사항",faq:"자주 묻는 질문",partnership:"교육협력"};
export function ContentUnavailable(){return <section className="content-frame"><div className="rounded-card border border-line bg-surface p-6"><h1 className="text-2xl font-bold">콘텐츠를 불러올 수 없습니다</h1><p className="mt-3 text-muted">잠시 후 다시 확인해 주세요.</p></div></section>;}
export async function PublishedContent({kind}:{kind:ContentKind}){
 let result: Awaited<ReturnType<typeof listPublishedContent>> | null = null;
 try { result = await listPublishedContent(kind); } catch { /* Display an explicit unavailable state. */ }
 if (!result) return <ContentUnavailable/>;
 const {items,example}=result;
 return <><section className="bg-surface"><div className="mx-auto max-w-4xl px-4 py-14 sm:px-8"><h1 className="text-4xl font-bold text-brand-navy">{headings[kind]}</h1>{example&&<p className="mt-3 text-sm font-semibold text-teal-ink">개발용 시연 콘텐츠입니다. 실제 운영 정보가 아닙니다.</p>}{kind==="partnership"&&<Link href="/contact" className="ui-button ui-button--primary mt-6">문의 시연 살펴보기</Link>}</div></section>
 {items.length===0?<section className="content-frame"><p className="text-muted">공개된 콘텐츠가 없습니다.</p></section>:kind==="faq"?<FaqList example={example} items={items.map((item)=>({id:item.id,category:item.category,question:item.title,answer:item.body,href:item.linkPath??undefined,linkLabel:item.linkLabel??undefined}))}/>:<section className="bg-canvas"><div className="mx-auto max-w-4xl px-4 py-12 sm:px-8"><ul className="space-y-3">{items.map((item)=><li key={item.id}><details className="information-item"><summary><span><span className="block text-sm font-semibold text-teal-ink">{item.category}</span><span className="mt-2 block text-lg font-bold text-brand-navy">{item.title}</span>{kind==="news"&&<span className="mt-2 block text-sm text-muted">{item.displayDate?formatDate(item.displayDate):"날짜 미정"}</span>}</span><span className="information-indicator" aria-hidden="true">+</span></summary><div className="information-body"><p className="whitespace-pre-wrap">{item.body}</p></div></details></li>)}</ul></div></section>}</>;
}
