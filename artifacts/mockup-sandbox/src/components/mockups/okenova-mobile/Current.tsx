import { useState, type ReactNode } from 'react';
import {
  ArrowUpRight, BriefcaseBusiness, ChevronRight, ClipboardList, LayoutDashboard,
  Menu, MessageCircle, MessageSquare, Megaphone, Package, ShieldCheck, Sparkles, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import './_group.css';

type Conversation = { id: string; lastMessage: string };
type Service = { id: string; name: string };
type Order = { id: string; serviceName: string; status: 'pending' | 'in_progress' | 'completed' };
type Announcement = { id: string };
type PreviewLinkProps = { href: string; className?: string; children: ReactNode; onClick?: () => void };
const Link = ({ href, className, children, onClick }: PreviewLinkProps) => (
  <a href={href} className={className} onClick={onClick}>{children}</a>
);

const nav = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/messages', label: 'Messages', icon: MessageCircle },
  { path: '/services', label: 'Services', icon: BriefcaseBusiness },
  { path: '/orders', label: 'Orders', icon: Package },
  { path: '/announcements', label: 'Announcements', icon: Megaphone },
];

function Brand() {
  return <div className="flex items-center gap-3">
    <img src="/__mockup/images/okenova-mark.png" alt="OKENOVΛ logo" className="h-10 w-10 rounded-xl object-cover"/>
    <div><div className="display text-[15px] font-bold tracking-[.15em]">OKENOVΛ</div><div className="text-[9px] tracking-wide text-slate-500">CONNECT • GROW • SUCCEED</div></div>
  </div>;
}
function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}
function SectionTitle({ title, hint, href }: { title: string; hint?: string; href?: string }) {
  return <div className="mb-4 flex items-center justify-between"><div><h2 className="display m-0 text-[15px] font-semibold text-slate-100">{title}</h2>{hint && <p className="mb-0 mt-1 text-xs text-slate-500">{hint}</p>}</div>{href && <Link href={href} className="flex items-center gap-1 text-xs font-semibold text-sky-300">View all <ChevronRight size={14}/></Link>}</div>;
}
function Empty({ title, text }: { title: string; text: string }) {
  return <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center"><div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-400/[.07] text-slate-500"><ClipboardList size={16}/></div><div className="text-xs font-semibold text-slate-300">{title}</div><div className="mt-1 text-[11px] text-slate-500">{text}</div></div>;
}
function Stat({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: LucideIcon }) {
  return <Card className="p-4 sm:p-5"><div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-400">{label}</span><span className="rounded-lg bg-sky-400/10 p-2 text-sky-300"><Icon size={16}/></span></div><div className="display mt-3 text-[28px] font-semibold tracking-tight">{value}</div><div className="mt-1 text-[11px] text-slate-500">{note}</div></Card>;
}
function Avatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'O';
  return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sky-300/15 bg-gradient-to-br from-sky-400/20 to-violet-400/20 text-xs font-bold text-sky-100">{initials}</div>;
}
function Dashboard({ conversations, services, orders, announcements }: {
  conversations: Conversation[]; services: Service[]; orders: Order[]; announcements: Announcement[];
}) {
  return <div className="space-y-6">
    <div className="relative overflow-hidden rounded-[22px] border border-sky-300/15 bg-gradient-to-br from-[#102341] via-[#111c34] to-[#1a1532] p-5 sm:p-8">
      <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border border-sky-300/10"/>
      <div className="relative max-w-2xl">
        <div className="mb-3 inline-flex rounded-full border border-sky-300/20 bg-sky-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.16em] text-sky-200">A clearer way to connect</div>
        <h1 className="display max-w-xl text-3xl font-semibold leading-tight tracking-[-.045em] text-white sm:text-[40px]">Good to see you, Trophy.<br/><span className="text-sky-300">Your next idea starts here.</span></h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-300/80">One direct connection for creative services, device support and every detail in between.</p>
        <div className="mt-5 flex flex-wrap gap-2"><Link href="/services" className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs"><BriefcaseBusiness size={15}/>Explore services<ArrowUpRight size={14}/></Link><Link href="/messages" className="btn-quiet inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-200"><MessageCircle size={15}/>Message the business</Link></div>
      </div>
      <div className="absolute bottom-0 right-5 hidden h-full items-center sm:flex"><div className="relative flex h-44 w-44 items-center justify-center rounded-full border border-sky-300/15 bg-[#071225]/40"><div className="absolute inset-4 rounded-full border border-violet-300/20"/><div className="absolute h-28 w-28 rotate-[-28deg] rounded-[35%] border-2 border-sky-300/60"/><div className="display text-7xl font-bold text-sky-300">O</div><Sparkles className="absolute right-7 top-7 text-violet-300" size={18}/></div></div>
    </div>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Stat label="Conversations" value={`${conversations.length}`} note="Private conversations" icon={MessageSquare}/>
      <Stat label="Services" value={`${services.length}`} note="Available to explore" icon={BriefcaseBusiness}/>
      <Stat label="Active orders" value={`${orders.filter((order) => order.status !== 'completed').length}`} note="Track progress here" icon={Package}/>
      <Stat label="Updates" value={`${announcements.length}`} note="From Okenstyles" icon={Megaphone}/>
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.35fr_.85fr]">
      <Card className="p-5"><SectionTitle title="Recent conversations" hint="Private chats with Okenstyles Graphics And Tech" href="/messages"/>
        {!conversations.length ? <Empty title="Nothing here yet" text="New activity will appear here when it is available."/> : conversations.slice(0, 3).map((conversation) => <Link key={conversation.id} href="/messages" className="flex items-center gap-3 border-t border-white/[.06] py-3"><Avatar name="Okenstyles"/><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">Okenstyles Graphics And Tech</div><div className="mt-1 truncate text-xs text-slate-500">{conversation.lastMessage || 'Conversation opened'}</div></div><ChevronRight size={15} className="text-slate-600"/></Link>)}
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-sky-300/[.05] p-3 text-[11px] text-slate-400"><ShieldCheck size={15} className="shrink-0 text-sky-300"/>Customer chats are only with the business owner. No customer-to-customer messaging.</div>
      </Card>
      <div className="space-y-5">
        <Card className="p-5"><SectionTitle title="Quick actions" hint="Get to the useful stuff faster"/><div className="grid grid-cols-2 gap-2">{[{ label: 'Browse services', icon: BriefcaseBusiness, to: '/services' }, { label: 'Track an order', icon: Package, to: '/orders' }, { label: 'Send a message', icon: MessageCircle, to: '/messages' }, { label: 'View updates', icon: Megaphone, to: '/announcements' }].map((item) => <Link key={item.to} href={item.to} className="btn-quiet flex min-h-[76px] flex-col items-start justify-between rounded-xl p-3 text-xs font-semibold text-slate-300"><item.icon size={17} className="text-sky-300"/>{item.label}</Link>)}</div></Card>
        <Card className="p-5"><SectionTitle title="Recent orders" href="/orders"/>{!orders.length ? <Empty title="Nothing here yet" text="New activity will appear here when it is available."/> : orders.slice(0, 3).map((order) => <div key={order.id} className="flex items-center gap-3 border-t border-white/[.06] py-3"><Package size={16} className="text-sky-300"/><div className="min-w-0 flex-1"><div className="truncate text-xs font-medium">{order.serviceName}</div><div className="mt-1 text-[10px] text-slate-500">{order.status === 'in_progress' ? 'In progress' : order.status}</div></div></div>)}</Card>
      </div>
    </div>
  </div>;
}

const previewData = {
  conversations: [{ id: 'conversation-1', lastMessage: 'Can you help me with a new brand design?' }],
  services: [{ id: 'graphic-design', name: 'Graphic Design' }, { id: 'photo-editing', name: 'Photo Editing' }, { id: 'phone-repair', name: 'Phone Repair' }],
  orders: [{ id: 'order-1', serviceName: 'Logo and brand kit', status: 'in_progress' as const }, { id: 'order-2', serviceName: 'Photo restoration', status: 'pending' as const }],
  announcements: [{ id: 'announcement-1' }],
};

export function Current() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="app-shell min-h-[100dvh] text-slate-100">
    <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between gap-2 border-b border-white/[.06] bg-[#090d19]/90 px-3 py-2.5 backdrop-blur-xl">
      <div className="flex min-w-0 flex-1 items-center gap-2"><button className="btn-quiet shrink-0 rounded-lg p-2" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={18}/></button><div className="min-w-0"><div className="display truncate text-base font-bold tracking-tight">Dashboard</div><div className="hidden text-[11px] text-slate-500 sm:block">Okenstyles Graphics And Tech / Customer workspace</div></div></div>
      <div className="flex shrink-0 items-center gap-1.5"><button className="btn-quiet rounded-xl px-3 py-2 text-[10px] font-semibold text-slate-300">Sign out</button></div>
    </header>
    {menuOpen && <div className="fixed inset-0 z-40 bg-[#080d18] p-5"><div className="mb-7 flex items-center justify-between"><Brand/><button onClick={() => setMenuOpen(false)} className="btn-quiet rounded-lg p-2" aria-label="Close menu"><X size={17}/></button></div><nav className="flex flex-col gap-2" aria-label="Main navigation">{nav.map((item) => <Link key={item.path} onClick={() => setMenuOpen(false)} href={item.path} className="nav-link flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-300"><item.icon size={18}/>{item.label}<ChevronRight className="ml-auto" size={15}/></Link>)}</nav></div>}
    <main className="main-content mx-auto w-full max-w-[1500px] flex-1 px-5 py-7 lg:px-9"><Dashboard {...previewData}/></main>
    <nav className="mobile-nav fixed inset-x-0 bottom-0 z-30 justify-around border-t border-white/[.08] bg-[#090d19]/95 px-1 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-xl" aria-label="Main navigation">{nav.map((item, index) => <Link key={item.path} href={item.path} aria-current={index === 0 ? 'page' : undefined} className={`flex min-h-12 min-w-[58px] flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-[10px] ${index === 0 ? 'text-sky-300' : 'text-slate-500'}`}><item.icon size={19} strokeWidth={1.8}/>{item.label}</Link>)}</nav>
  </div>;
}
