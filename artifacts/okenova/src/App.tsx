import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation, useSearch } from 'wouter';
import {
  ArrowUpRight, Bot, BriefcaseBusiness, Check, ChevronRight, ClipboardList,
  Clock3, Image, LayoutDashboard, Menu, MessageCircle, MessageSquare, Megaphone,
  MonitorSmartphone, Package, Plus, Search, Send, Settings2, ShieldCheck, Sparkles,
  WandSparkles, Wrench, X,
} from 'lucide-react';
import {
  getGetCurrentUserQueryKey, getListAnnouncementsQueryKey, getListConversationMessagesQueryKey,
  getListConversationsQueryKey, getListOrdersQueryKey, getListServicesQueryKey,
  useCreateAnnouncement, useCreateOrder, useGetCurrentUser, useListAnnouncements,
  useListConversationMessages, useListConversations, useListOrders, useListServices,
  useOpenConversation, useSendConversationMessage, useUpdateOrder, useUpdateService,
} from '@workspace/api-client-react';
import type { Announcement, Conversation, ConversationMessage, Order, Service, UserProfile } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}
const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/okenova-mark.png`,
  },
  variables: {
    colorPrimary: '#50c9f5', colorForeground: '#e8eef9', colorMutedForeground: '#93a1b8',
    colorDanger: '#fb7185', colorBackground: '#101a2c', colorInput: '#0b1425',
    colorInputForeground: '#e8eef9', colorNeutral: '#34425a', fontFamily: '"DM Sans", sans-serif',
    borderRadius: '0.8rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#0b1221] rounded-[24px] w-[440px] max-w-full overflow-hidden border border-[#273757] shadow-2xl',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#f2f6ff] font-semibold tracking-[-.03em]',
    headerSubtitle: 'text-[#aab8ce] leading-relaxed',
    socialButtonsBlockButtonText: 'text-[#e8eef9] font-medium',
    formFieldLabel: 'text-[#c6d2e5]',
    footerActionLink: 'text-[#69d4ff] font-semibold',
    footerActionText: 'text-[#aab8ce]',
    dividerText: 'text-[#93a1b8]',
    identityPreviewEditButton: 'text-[#69d4ff]',
    formFieldSuccessText: 'text-[#76e2c0]',
    alertText: 'text-[#ffd3dc]',
    logoBox: 'rounded-xl overflow-hidden',
    logoImage: 'rounded-xl',
    socialButtonsBlockButton: 'border border-[#34425a] bg-[#111d32] hover:bg-[#1a2a45] min-h-12',
    formButtonPrimary: 'font-semibold text-[#071321] min-h-12',
    formFieldInput: 'border-[#34425a] bg-[#0b1425] text-[#e8eef9] min-h-12',
    footerAction: 'border-t border-[#2b3b56]',
    dividerLine: 'bg-[#34425a]',
    alert: 'border-[#653444] bg-[#2b1923]',
    otpCodeFieldInput: 'border-[#34425a] bg-[#0b1425] text-[#e8eef9]',
    formFieldRow: 'text-[#e8eef9]',
    main: 'text-[#e8eef9]',
  },
};

const nav = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/messages', label: 'Messages', icon: MessageCircle },
  { path: '/services', label: 'Services', icon: BriefcaseBusiness },
  { path: '/orders', label: 'Orders', icon: Package },
  { path: '/announcements', label: 'Announcements', icon: Megaphone },
  { path: '/assistant', label: 'AI assistant', icon: Bot, owner: true },
  { path: '/owner', label: 'Admin dashboard', icon: Settings2, owner: true },
];
type Role = UserProfile['role'];
type DraftMode = 'reply' | 'summary' | 'requests';
type WorkspaceProps = {
  profile: UserProfile;
  identity: string;
};

function App() {
  return <TooltipProvider><WouterRouter base={basePath}><ClerkRoutes /></WouterRouter><Toaster /></TooltipProvider>;
}
function StartupAnimation() {
  const { isLoaded, isSignedIn } = useAuth();
  const [startupLocation] = useLocation();
  const isProtectedStartupPath = ['/dashboard', '/admin/dashboard', '/customer/dashboard', '/messages', '/services', '/orders', '/announcements', '/assistant', '/owner'].includes(stripBase(startupLocation));
  const shouldResolveProfile = isProtectedStartupPath || stripBase(startupLocation) === '/';
  const startupProfile = useGetCurrentUser({
    query: {
      enabled: isLoaded && Boolean(isSignedIn) && shouldResolveProfile,
      queryKey: getGetCurrentUserQueryKey(),
      retry: false,
    },
  });
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const exitStartedRef = useRef(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(motionPreference.matches);
    motionPreference.addEventListener('change', updatePreference);
    return () => motionPreference.removeEventListener('change', updatePreference);
  }, []);
  useEffect(() => {
    try {
      if (sessionStorage.getItem('okenova-intro-seen')) return;
      sessionStorage.setItem('okenova-intro-seen', '1');
    } catch {
      // Storage can be unavailable in restrictive browser modes.
    }
    setVisible(true);
    const minimumTimer = window.setTimeout(() => setMinimumElapsed(true), 4500);
    return () => window.clearTimeout(minimumTimer);
  }, []);
  useEffect(() => {
    if (!visible) return;
    setTimedOut(false);
    const timeout = window.setTimeout(() => setTimedOut(true), 15000);
    return () => window.clearTimeout(timeout);
  }, [visible, retryToken]);
  const profileReady = !isSignedIn || !shouldResolveProfile || startupProfile.isSuccess;
  const initFailed = Boolean(isLoaded && isSignedIn && shouldResolveProfile && startupProfile.isError);
  const canExit = visible && minimumElapsed && isLoaded && profileReady && !initFailed;
  useEffect(() => {
    if (!canExit || exitStartedRef.current) return;
    exitStartedRef.current = true;
    setExiting(true);
    const timer = window.setTimeout(() => setVisible(false), 520);
    return () => window.clearTimeout(timer);
  }, [canExit]);
  if (!visible) return null;
  const loadingFailed = timedOut || initFailed;
  const retryStartup = () => {
    setTimedOut(false);
    setRetryToken((token) => token + 1);
    if (isLoaded && isSignedIn && shouldResolveProfile) {
      void startupProfile.refetch();
      return;
    }
    try {
      sessionStorage.removeItem('okenova-intro-seen');
    } catch {
      // The reload still retries Clerk if storage is unavailable.
    }
    window.location.reload();
  };
  return <div className={`startup-screen ${loadingFailed ? 'startup-screen--error' : ''} ${exiting ? 'startup-screen--exiting' : ''}`} role={loadingFailed ? 'alert' : 'status'} aria-label={loadingFailed ? 'OKENOVΛ startup needs attention' : 'OKENOVΛ starting'} data-testid="startup-splash">
    <div className="startup-atmosphere" aria-hidden="true"><span className="startup-orbit startup-orbit--outer"/><span className="startup-orbit startup-orbit--inner"/><span className="startup-light startup-light--cyan"/><span className="startup-light startup-light--violet"/><div className="startup-horizon"/></div>
    {!prefersReducedMotion && <video autoPlay muted playsInline preload="auto" className="startup-film" src={`${basePath}/okenova-intro.mp4`} aria-label="Animated OKENOVΛ emblem"/>}
    <main className="startup-content">
      <div className="startup-mark-wrap"><img className="startup-mark" src={`${basePath}/okenova-mark.png`} alt="OKENOVΛ official emblem" data-testid="startup-logo"/></div>
      <div className="startup-wordmark">OKENOV<span>Λ</span></div>
      <p className="startup-tagline">Your Business. Your Connections.<br/>One Platform.</p>
      <div className="startup-bottom" aria-live="polite">
        {loadingFailed ? <>
          <p className="startup-error-copy">{initFailed ? "We couldn't confirm your account yet." : "Startup is taking longer than expected."}</p>
          <button type="button" className="startup-retry" onClick={retryStartup} data-testid="button-retry-startup">Retry connection</button>
        </> : <>
          <div className={`startup-progress ${prefersReducedMotion ? 'startup-progress--reduced' : ''}`} aria-hidden="true"><span/></div>
          <p className="startup-status" data-testid="status-startup">Loading OKENOVΛ…</p>
          <button type="button" onClick={() => setMinimumElapsed(true)} className="startup-skip" data-testid="button-skip-intro">Skip intro</button>
        </>}
      </div>
    </main>
  </div>;
}
function ClerkRoutes() {
  const [, setLocation] = useLocation();
  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    appearance={clerkAppearance}
    signInUrl={`${basePath}/customer/sign-in`}
    signUpUrl={`${basePath}/customer/sign-up`}
    localization={{
      signIn: { start: { title: 'Welcome Back', subtitle: 'Sign in to continue' } },
      signUp: { start: { title: 'Join OKENOVΛ', subtitle: 'Create your customer account to get started.' } },
    }}
    routerPush={(to) => setLocation(stripBase(to))}
    routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
  >
    <QueryClientProvider client={queryClient}>
      <ClerkCacheSync />
      <StartupAnimation/>
      <RoutedErrorBoundary><Switch>
        <Route path="/" component={PublicLanding} />
        <Route path="/admin/sign-in/*?"><SignInPage audience="Admin"/></Route>
        <Route path="/customer/sign-in/*?"><SignInPage audience="Customer"/></Route>
        <Route path="/customer/sign-up/*?"><SignUpPage/></Route>
        <Route path="/sign-in/*?"><Redirect to="/customer/sign-in"/></Route>
        <Route path="/sign-up/*?"><Redirect to="/customer/sign-up"/></Route>
        <Route path="/dashboard"><ProtectedWorkspace /></Route>
        <Route path="/admin/dashboard"><ProtectedWorkspace /></Route>
        <Route path="/customer/dashboard"><ProtectedWorkspace /></Route>
        <Route path="/messages"><ProtectedWorkspace /></Route>
        <Route path="/services"><ProtectedWorkspace /></Route>
        <Route path="/orders"><ProtectedWorkspace /></Route>
        <Route path="/announcements"><ProtectedWorkspace /></Route>
        <Route path="/assistant"><ProtectedWorkspace /></Route>
        <Route path="/owner"><ProtectedWorkspace /></Route>
        <Route component={NotFound} />
      </Switch></RoutedErrorBoundary>
    </QueryClientProvider>
  </ClerkProvider>;
}
function ClerkCacheSync() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  useEffect(() => {
    let previous: string | null | undefined;
    return addListener(({ user }) => {
      const next = user?.id ?? null;
      if (previous !== undefined && previous !== next) client.clear();
      previous = next;
    });
  }, [addListener, client]);
  return null;
}
function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function PublicLanding() {
  const { isLoaded, isSignedIn } = useAuth();
  if (isLoaded && isSignedIn) return <Redirect to="/dashboard" />;
  return <div className="app-shell min-h-[100dvh] text-slate-100">
    <header className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:flex-nowrap sm:px-8 sm:py-5"><a href="#home" aria-label="OKENOVΛ home" className="shrink-0"><Brand/></a><nav className="flex items-center gap-2 sm:gap-3"><a href="#features" className="hidden px-2 py-2 text-xs text-slate-400 hover:text-white sm:inline-flex">Features</a><a href="#download" className="btn-primary rounded-xl px-3 py-2.5 text-xs sm:px-4">Download APK</a><Link href="/customer/sign-in" className="btn-quiet rounded-xl px-3 py-2.5 text-xs font-semibold sm:px-4">Sign in</Link></nav></header>
    <main id="home" className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-8 sm:pt-12">
      <section className="relative isolate overflow-hidden rounded-[28px] border border-sky-300/15 bg-gradient-to-br from-[#102341] via-[#111c34] to-[#1a1532] px-5 py-10 sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute -right-16 -top-24 -z-10 h-96 w-96 rounded-full border border-sky-300/10"/><div className="pointer-events-none absolute right-20 top-14 -z-10 h-52 w-52 rounded-full border border-violet-300/10"/>
        <div className="relative max-w-3xl"><div className="mb-7"><Brand/></div><span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-sky-200">Okenstyles Graphics And Tech</span>
          <h1 className="display mt-7 max-w-3xl text-[clamp(2.4rem,8vw,4.5rem)] font-semibold leading-[1.02] tracking-[-.055em]">Your Business.<br/>Your Connections.<br/><span className="text-sky-300">One Platform.</span></h1>
          <p className="mt-5 text-xs font-bold tracking-[.2em] text-violet-200">CONNECT • GROW • SUCCEED</p><p className="mt-4 max-w-xl text-sm leading-7 text-slate-300/80 sm:text-base">A direct way to request creative and tech services, keep up with orders, and message the business owner privately.</p>
          <div className="mt-7 flex flex-wrap gap-3"><a href={`${basePath}/downloads/OKENOVA-1.0.1.apk`} download="OKENOVA-1.0.1.apk" className="btn-primary inline-flex min-h-12 items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold" data-testid="download-apk-hero"><ArrowUpRight size={17}/>Download for Android</a><Link href="/customer/sign-up" className="btn-quiet inline-flex min-h-12 items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold">Get started <ChevronRight size={15}/></Link></div>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-400"><span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-sky-200">Version 1.0.1</span><span>Android 7.0 or later · Internet required</span></div>
        </div>
        <div className="relative mt-10 grid gap-3 sm:grid-cols-3">{[['01','Creative services','Graphic design and photo editing requests.'],['02','Private messages','Talk directly with the business owner.'],['03','Order updates','Track requests from pending to completed.']].map(([n,title,copy])=><div key={n} className="rounded-2xl border border-white/[.08] bg-[#091426]/65 p-5 backdrop-blur"><div className="font-mono text-xs text-sky-300">{n}</div><h2 className="display mt-3 text-lg font-semibold">{title}</h2><p className="mb-0 mt-2 text-xs leading-relaxed text-slate-400">{copy}</p></div>)}</div>
      </section>
      <section id="features" className="grid scroll-mt-8 gap-7 py-14 sm:grid-cols-[.9fr_1.1fr] sm:py-20"><div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">Made for a simpler workflow</div><h2 className="display mt-3 text-3xl font-semibold leading-tight tracking-tight">The important details, together.</h2><p className="mt-4 text-sm leading-7 text-slate-400">Choose a service, send a private message to the business, and follow the status of your service orders from one account.</p></div><div className="grid gap-3 sm:grid-cols-2">{[['Service requests','Graphic design, photo editing and phone repair.'],['Owner messaging','Private customer-to-business conversations, with no online or last-seen indicators.'],['Order tracking','See pending, in-progress and completed requests.'],['Announcements','Read updates shared by the business owner.']].map(([t,c])=><div key={t} className="panel p-5"><h3 className="display text-base font-semibold">{t}</h3><p className="mb-0 mt-2 text-xs leading-relaxed text-slate-400">{c}</p></div>)}</div></section>
      <section id="download" className="scroll-mt-8 rounded-3xl border border-sky-300/15 bg-gradient-to-br from-sky-400/[.09] to-violet-400/[.07] p-5 sm:p-8"><div className="grid gap-7 md:grid-cols-[1fr_auto] md:items-center"><div><span className="text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">Android release</span><h2 className="display mt-2 text-2xl font-semibold">Download OKENOVΛ 1.0.1</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">Early release. Development is ongoing. The app opens the existing OKENOVΛ website and needs an internet connection.</p><p className="mt-3 text-xs text-slate-500">APK size: 2.84 MiB · Android 7.0 (API 24) or later</p></div><a href={`${basePath}/downloads/OKENOVA-1.0.1.apk`} download="OKENOVA-1.0.1.apk" className="btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold" data-testid="download-apk-section"><ArrowUpRight size={17}/>Download APK</a></div>
        <div className="mt-6 grid gap-3 border-t border-white/[.08] pt-5 text-xs text-slate-400 sm:grid-cols-3"><p><strong className="text-slate-200">1.</strong> Download the APK on your Android device.</p><p><strong className="text-slate-200">2.</strong> Open it and allow installation from this source if Android asks.</p><p><strong className="text-slate-200">3.</strong> Install, open OKENOVΛ, then sign in or create an account.</p></div>
        <div id="help" className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs"><span className="text-slate-500">Release notes: Version 1.0.1 improves the mobile dashboard and navigation; development is ongoing.</span><Link href="/customer/sign-up" className="text-sky-300 hover:text-sky-200">Help and account access</Link></div>
      </section>
      <footer className="mt-12 border-t border-white/[.08] py-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><a href="#home" aria-label="OKENOVΛ home"><Brand/></a><nav className="flex flex-wrap gap-x-5 gap-y-3 text-xs text-slate-400"><a href="#home" className="hover:text-white">Home</a><a href="#features" className="hover:text-white">Features</a><a href="#download" className="hover:text-white">Download</a><a href="#help" className="hover:text-white">Help</a><Link href="/admin/sign-in" className="hover:text-white">Admin</Link></nav></div><div className="mt-5 flex flex-wrap justify-between gap-2 text-[11px] text-slate-600"><span>CONNECT • GROW • SUCCEED</span><span>Version 1.0.1 · © {new Date().getFullYear()} Okenstyles Graphics And Tech</span></div></footer>
    </main>
  </div>;
}
function AuthFrame({ children }: { children: ReactNode }) {
  return <main className="auth-stage" data-testid="auth-screen">
    <div className="auth-light auth-light--one" aria-hidden="true"/><div className="auth-light auth-light--two" aria-hidden="true"/>
    <div className="auth-inner">
      <Link href="/" className="auth-brand-link" aria-label="OKENOVΛ home"><Brand/></Link>
      <div className="auth-caption"><span>OKENSTYLES GRAPHICS AND TECH</span><i aria-hidden="true"/></div>
      <div className="auth-card">{children}</div>
      <p className="auth-footnote">Private business conversations, connected to your account.</p>
      <p className="auth-powered">Powered by Okenstyles Graphics And Tech</p>
    </div>
  </main>;
}
function SignInPage({ audience }: { audience: 'Admin' | 'Customer' }) {
  const path = `/${audience.toLowerCase()}/sign-in`;
  return <AuthFrame><div className="auth-clerk-wrap" data-testid={`clerk-sign-in-${audience.toLowerCase()}`}>
    <div className="auth-audience">{audience} access</div>
    <SignIn routing="path" path={`${basePath}${path}`} signUpUrl={`${basePath}/customer/sign-up`} forceRedirectUrl={`${basePath}/dashboard`}/>
  </div></AuthFrame>;
}
function SignUpPage() {
  return <AuthFrame><div className="auth-clerk-wrap" data-testid="clerk-sign-up"><div className="auth-audience">Customer registration</div><SignUp routing="path" path={`${basePath}/customer/sign-up`} signInUrl={`${basePath}/customer/sign-in`} forceRedirectUrl={`${basePath}/dashboard`}/></div></AuthFrame>;
}
function ProtectedWorkspace() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <LoadingScreen label="Checking your session"/>;
  if (!isSignedIn) return <Redirect to="/customer/sign-in"/>;
  return <WorkspaceLoader/>;
}
function WorkspaceLoader() {
  const [location] = useLocation();
  const { user } = useUser();
  const profileQuery = useGetCurrentUser();
  if (profileQuery.isLoading) return <LoadingScreen label="Loading your workspace"/>;
  if (profileQuery.isError || !profileQuery.data) return <QueryError message="We couldn't load your account profile." retry={() => void profileQuery.refetch()}/>;
  const role = profileQuery.data.role;
  const expectedDashboard = role === 'owner' ? '/admin/dashboard' : '/customer/dashboard';
  const requestedPath = stripBase(location);
  if (['/dashboard', '/admin/dashboard', '/customer/dashboard'].includes(requestedPath) && requestedPath !== expectedDashboard) {
    return <Redirect to={expectedDashboard}/>;
  }
  return <Workspace profile={profileQuery.data} identity={user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Your account'}/>;
}
function LoadingScreen({ label }: { label: string }) {
  return <div className="app-shell flex min-h-[100dvh] items-center justify-center p-6"><div className="panel w-full max-w-md p-6"><div className="h-3 w-24 animate-pulse rounded bg-sky-300/20"/><div className="mt-5 h-7 w-3/4 animate-pulse rounded bg-white/[.08]"/><div className="mt-3 h-3 w-full animate-pulse rounded bg-white/[.06]"/><p className="mb-0 mt-5 text-xs text-slate-500">{label}</p></div></div>;
}
function QueryError({ message, retry }: { message: string; retry: () => void }) {
  return <div className="app-shell flex min-h-[100dvh] items-center justify-center p-6"><section className="panel max-w-md p-7 text-center"><ShieldCheck className="mx-auto text-rose-300" size={24}/><h1 className="display mt-4 text-xl font-semibold">A connection hiccup</h1><p className="mt-2 text-sm text-slate-400">{message}</p><button onClick={retry} className="btn-primary mt-4 rounded-xl px-4 py-2.5 text-xs">Try again</button></section></div>;
}

function Workspace({ profile, identity }: WorkspaceProps) {
  const [path, setPath] = useLocation();
  const search = useSearch();
  const [activeConversationId, setActiveConversationId] = useState('');
  useEffect(() => {
    const conversationId = new URLSearchParams(search).get('conversation');
    if (conversationId) setActiveConversationId(conversationId);
  }, [search]);
  const [messageInput, setMessageInput] = useState('');
  const [submittingMessage, setSubmittingMessage] = useState(false);
  const messageSubmitLock = useRef(false);
  const [draft, setDraft] = useState('');
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceBody, setAnnounceBody] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileMenuCloseRef = useRef<HTMLButtonElement>(null);
  const [notice, setNotice] = useState('');
  const client = useQueryClient();
  const owner = profile.role === 'owner';
  const currentPath = path === '/' ? '/dashboard' : path.endsWith('/dashboard') ? (owner ? '/owner' : '/dashboard') : path;
  const title = nav.find((item) => item.path === currentPath)?.label ?? 'Dashboard';
  const servicesQuery = useListServices();
  const conversationsQuery = useListConversations({ query: { refetchInterval: 5000 } });
  const ordersQuery = useListOrders();
  const announcementsQuery = useListAnnouncements();
  const conversations = conversationsQuery.data ?? [];
  const activeConversation = activeConversationId
    ? conversations.find((item) => item.id === activeConversationId)
    : conversations[0];
  // Pin the recipient: polling can reorder the inbox while the admin is typing.
  useEffect(() => {
    if (!activeConversationId && activeConversation) setActiveConversationId(activeConversation.id);
  }, [activeConversationId, activeConversation]);
  const messagesQuery = useListConversationMessages(activeConversation?.id ?? '', {
    query: { enabled: Boolean(activeConversation?.id), queryKey: getListConversationMessagesQueryKey(activeConversation?.id ?? ''), refetchInterval: 5000 },
  });
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder();
  const updateService = useUpdateService();
  const createAnnouncement = useCreateAnnouncement();
  const openConversation = useOpenConversation();
  const sendMessage = useSendConversationMessage();
  const services = servicesQuery.data ?? [];
  const orders = ordersQuery.data ?? [];
  const announcements = announcementsQuery.data ?? [];
  const messages = messagesQuery.data ?? [];
  const filteredNav = nav.filter((item) => !item.owner || owner);
  useEffect(() => {
    if (!mobileMenu) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscapeAndContainFocus = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenu(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const menu = document.getElementById('workspace-mobile-menu');
      const focusable = menu?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscapeAndContainFocus);
    mobileMenuCloseRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', closeOnEscapeAndContainFocus);
      document.body.style.overflow = previousOverflow;
      mobileMenuTriggerRef.current?.focus();
    };
  }, [mobileMenu]);
  const notify = (text: string) => { setNotice(text); window.setTimeout(() => setNotice(''), 3000); };
  useEffect(() => {
    if (!owner && ['/assistant', '/owner'].includes(currentPath)) setPath('/dashboard', { replace: true });
  }, [owner, currentPath, setPath]);
  if (currentPath === '/assistant' || currentPath === '/owner') {
    if (!owner) return <LoadingScreen label="Opening your workspace"/>;
  }
  const invalidate = async (...keys: (readonly unknown[])[]) => {
    await Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
  };
  const startConversation = () => openConversation.mutate(undefined, {
    onSuccess: async (conversation) => {
      setActiveConversationId(conversation.id);
      await invalidate(getListConversationsQueryKey(), getListConversationMessagesQueryKey(conversation.id));
      setPath('/messages');
      notify('Your private conversation is ready.');
    },
    onError: () => notify('Unable to open a conversation right now. Please try again.'),
  });
  const submitMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (messageSubmitLock.current || !messageInput.trim() || conversationsQuery.isLoading || conversationsQuery.isError) return;
    if (owner && !activeConversation) {
      notify('Choose a customer conversation before sending a reply.');
      return;
    }
    messageSubmitLock.current = true;
    setSubmittingMessage(true);
    const originalInput = messageInput;
    const body = messageInput.trim();
    try {
      // The server derives the customer identity; no recipient identity is supplied.
      const conversation = activeConversation ?? await openConversation.mutateAsync(undefined);
      setActiveConversationId(conversation.id);
      client.setQueryData<Conversation[]>(getListConversationsQueryKey(), (existing = []) =>
        existing.some((item) => item.id === conversation.id) ? existing : [conversation, ...existing]);
      await sendMessage.mutateAsync({ conversationId: conversation.id, data: { body } });
      setMessageInput((current) => current === originalInput ? '' : current);
      await invalidate(getListConversationMessagesQueryKey(conversation.id), getListConversationsQueryKey());
    } catch {
      notify('Your message could not be sent. Your draft is saved here; please try again.');
    } finally {
      messageSubmitLock.current = false;
      setSubmittingMessage(false);
    }
  };
  const changeOrderStatus = (orderId: string, status: Order['status']) => updateOrder.mutate({ orderId, data: { status } }, {
    onSuccess: () => void invalidate(getListOrdersQueryKey()),
    onError: () => notify('Order status could not be updated.'),
  });
  const changeService = (service: Service) => updateService.mutate({ serviceId: service.id, data: { available: !service.available } }, {
    onSuccess: () => void invalidate(getListServicesQueryKey()),
    onError: () => notify('Service availability could not be updated.'),
  });
  const submitAnnouncement = (event: FormEvent) => {
    event.preventDefault();
    if (!announceTitle.trim() || !announceBody.trim()) return;
    createAnnouncement.mutate({ data: { title: announceTitle.trim(), body: announceBody.trim() } }, {
      onSuccess: async () => {
        setAnnounceTitle(''); setAnnounceBody('');
        await invalidate(getListAnnouncementsQueryKey());
        notify('Announcement published.');
      },
      onError: () => notify('Announcement could not be published.'),
    });
  };
  const draftSample = (mode: DraftMode) => {
    const conversationText = messages.map((item) => item.body).slice(-3).join(' ');
    if (mode === 'reply') setDraft(`Thanks for reaching out. ${conversationText ? `I’ve reviewed your note: “${conversationText.slice(0, 140)}${conversationText.length > 140 ? '…' : ''}” ` : ''}I’ll take a closer look and get back to you with the next steps.`);
    if (mode === 'summary') setDraft(conversationText ? `Recent conversation: ${conversationText}` : 'No messages in this conversation yet. Start with the customer’s goals, then confirm the next step.');
    if (mode === 'requests') setDraft(`There are ${orders.length} orders in the workspace. Review the order details and confirm scope and timing before making changes.`);
  };
  const approveDraft = () => {
    if (!draft.trim() || !activeConversation) return;
    sendMessage.mutate({ conversationId: activeConversation.id, data: { body: draft.trim() } }, {
      onSuccess: async () => {
        setDraft('');
        await invalidate(getListConversationMessagesQueryKey(activeConversation.id), getListConversationsQueryKey());
        notify('Approved draft sent to this conversation.');
      },
      onError: () => notify('The approved draft could not be sent. Please retry.'),
    });
  };
  const page = () => {
    switch (currentPath) {
      case '/messages': return <MessagesPage role={profile.role} conversations={conversations} active={activeConversation} messages={messages} messagesLoading={messagesQuery.isLoading} messagesError={messagesQuery.isError} retryMessages={() => void messagesQuery.refetch()} activeId={activeConversation?.id ?? ''} selectConversation={setActiveConversationId} input={messageInput} setInput={setMessageInput} submit={submitMessage} sending={submittingMessage || sendMessage.isPending} openConversation={startConversation} opening={openConversation.isPending} conversationsLoading={conversationsQuery.isLoading} conversationsError={conversationsQuery.isError} retryConversations={() => void conversationsQuery.refetch()}/>;
      case '/services': return <ServicesPage services={services} loading={servicesQuery.isLoading} error={servicesQuery.isError} retry={() => void servicesQuery.refetch()} createOrder={(serviceId, details) => createOrder.mutate({ data: { serviceId, details } }, { onSuccess: async () => { await invalidate(getListOrdersQueryKey()); notify('Your service request was sent.'); }, onError: () => notify('The request could not be created.') })} creatingOrder={createOrder.isPending}/>;
      case '/orders': return <OrdersPage orders={orders} role={profile.role} loading={ordersQuery.isLoading} error={ordersQuery.isError} retry={() => void ordersQuery.refetch()} changeStatus={changeOrderStatus} saving={updateOrder.isPending}/>;
      case '/announcements': return <AnnouncementsPage role={profile.role} announcements={announcements} loading={announcementsQuery.isLoading} error={announcementsQuery.isError} retry={() => void announcementsQuery.refetch()} title={announceTitle} setTitle={setAnnounceTitle} body={announceBody} setBody={setAnnounceBody} submit={submitAnnouncement} publishing={createAnnouncement.isPending}/>;
      case '/assistant': return <AssistantPage conversations={conversations} active={activeConversation} messages={messages} draft={draft} setDraft={setDraft} createDraft={draftSample} approve={approveDraft} sending={sendMessage.isPending}/>;
      case '/owner': return <OwnerPage services={services} orders={orders} announcements={announcements} conversations={conversations} servicesLoading={servicesQuery.isLoading} servicesError={servicesQuery.isError} retryServices={() => void servicesQuery.refetch()} ordersLoading={ordersQuery.isLoading} ordersError={ordersQuery.isError} retryOrders={() => void ordersQuery.refetch()} changeService={changeService} changeOrderStatus={changeOrderStatus} savingService={updateService.isPending} savingOrder={updateOrder.isPending}/>;
      default: return <Dashboard profile={profile} identity={identity} services={services} conversations={conversations} orders={orders} announcements={announcements} conversationsLoading={conversationsQuery.isLoading} conversationsError={conversationsQuery.isError} retryConversations={() => void conversationsQuery.refetch()} ordersLoading={ordersQuery.isLoading} ordersError={ordersQuery.isError} retryOrders={() => void ordersQuery.refetch()}/>;
    }
  };
  return <div className="app-shell flex text-slate-100">
    <aside className="sidebar fixed inset-y-0 left-0 z-30 hidden w-[250px] flex-col px-4 py-5 md:flex"><Brand/><div className="mt-8 rounded-xl border border-sky-400/15 bg-sky-400/[.06] px-3 py-2.5"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.19em] text-sky-300"><span className="h-1.5 w-1.5 rounded-full bg-sky-400"/>Connected workspace</div><div className="mt-1 text-xs text-slate-400">{owner ? 'Owner tools and customer activity' : 'Your services and conversations'}</div></div>
      <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="Main navigation"><div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-600">Workspace</div>{filteredNav.map((item) => <Link key={item.path} href={item.path} aria-current={currentPath === item.path ? 'page' : undefined} data-testid={`nav-${item.path.slice(1)}`} className={`nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium ${currentPath === item.path ? 'active' : 'text-slate-400'}`}><item.icon size={17} strokeWidth={1.8}/><span>{item.label}</span></Link>)}</nav>
      <div className="panel p-3.5"><div className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck size={15} className="text-violet-300"/>Private by design</div><p className="mb-0 mt-1.5 text-[11px] leading-relaxed text-slate-500">Customer conversations are only with the business owner. No online or last-seen status.</p></div>
    </aside>
    <div className="ml-0 flex min-h-[100dvh] w-full flex-col md:ml-[250px]">
      <header className="workspace-header sticky top-0 z-20 flex min-h-[72px] items-center justify-between gap-2 border-b border-white/[.06] bg-[#090d19]/90 px-3 py-2.5 backdrop-blur-xl sm:px-7">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3"><button ref={mobileMenuTriggerRef} className="btn-quiet flex h-11 w-11 shrink-0 items-center justify-center rounded-xl md:hidden" aria-label="Open navigation" aria-controls="workspace-mobile-menu" aria-expanded={mobileMenu} data-testid="button-mobile-menu" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={19}/></button><div className="min-w-0"><div className="display truncate text-base font-bold tracking-tight sm:text-lg">{title}</div><div className="hidden text-[11px] text-slate-500 sm:block">Okenstyles Graphics And Tech <span className="mx-1.5 text-slate-700">/</span> {owner ? 'Admin workspace' : 'Customer workspace'}</div></div></div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3"><div className="hidden max-w-48 truncate text-xs text-slate-400 sm:block" title={identity}>{identity}</div><ProfileAvatar identity={identity}/><SignOutButton/></div>
      </header>
      {mobileMenu && <div id="workspace-mobile-menu" className="mobile-menu-overlay fixed inset-0 z-40 bg-[#080d18] p-5 md:hidden" role="dialog" aria-modal="true" aria-label="Workspace navigation"><div className="mb-7 flex items-center justify-between"><Brand/><button ref={mobileMenuCloseRef} onClick={() => setMobileMenu(false)} className="btn-quiet flex h-11 w-11 items-center justify-center rounded-xl" aria-label="Close menu" data-testid="button-close-mobile-menu"><X size={18}/></button></div><nav className="flex flex-col gap-2">{filteredNav.map((item) => <Link key={item.path} onClick={() => setMobileMenu(false)} href={item.path} aria-current={currentPath === item.path ? 'page' : undefined} className={`nav-link flex min-h-14 items-center gap-3 rounded-xl px-4 text-sm font-semibold ${currentPath === item.path ? 'active' : 'text-slate-300'}`}><item.icon size={19}/>{item.label}<ChevronRight className="ml-auto" size={16}/></Link>)}</nav></div>}
      <main className="main-content mx-auto w-full max-w-[1500px] flex-1 px-5 py-7 lg:px-9">{page()}</main>
      <nav className="mobile-nav fixed inset-x-0 bottom-0 z-30 border-t border-white/[.08] bg-[#090d19]/95 px-1 pt-2 backdrop-blur-xl" aria-label="Main navigation">{filteredNav.slice(0, 5).map((item) => <Link key={item.path} href={item.path} aria-current={currentPath === item.path ? 'page' : undefined} data-testid={`mobile-nav-${item.path.slice(1)}`} className={`mobile-nav-link flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1 text-[9px] font-medium leading-none ${currentPath === item.path ? 'text-sky-200' : 'text-slate-500'}`}><span className="mobile-nav-icon flex h-8 w-10 items-center justify-center rounded-xl"><item.icon size={19} strokeWidth={currentPath === item.path ? 2.2 : 1.8}/></span><span className="mobile-nav-label max-w-full">{item.label}</span></Link>)}</nav>
    </div>
    {notice && <div role="status" data-testid="status-workspace-notice" className="fixed bottom-20 left-1/2 z-50 flex max-w-[min(92vw,480px)] -translate-x-1/2 items-start gap-2 rounded-xl border border-sky-300/20 bg-[#111c30] px-4 py-3 text-xs leading-relaxed text-slate-200 shadow-2xl md:bottom-6"><Check size={15} className="mt-0.5 shrink-0 text-sky-300"/>{notice}</div>}
  </div>;
}
function SignOutButton() {
  const { signOut } = useClerk();
  return <button onClick={() => void signOut({ redirectUrl: basePath || '/' })} className="btn-quiet flex min-h-11 shrink-0 items-center rounded-xl px-3 text-[10px] font-semibold text-slate-300" data-testid="button-sign-out">Sign out</button>;
}
function Brand() {
  return <div className="flex items-center gap-3"><img src={`${basePath}/okenova-mark.png`} alt="OKENOVΛ logo" className="h-10 w-10 rounded-xl object-cover" /><div><div className="display text-[15px] font-bold tracking-[.15em]">OKENOVΛ</div><div className="text-[9px] tracking-wide text-slate-500">CONNECT • GROW • SUCCEED</div></div></div>;
}
function ProfileAvatar({ identity }: { identity: string }) {
  const initials = identity.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U';
  return <div className="hidden h-8 w-8 items-center justify-center rounded-full border border-sky-300/30 bg-gradient-to-br from-sky-300/30 to-violet-400/30 text-[10px] font-bold text-sky-100 sm:flex" aria-label={`Signed in as ${identity}`}>{initials}</div>;
}
function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}
function Heading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div>{eyebrow && <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-sky-300">{eyebrow}</div>}<h1 className="display m-0 text-[27px] font-semibold tracking-[-.04em] text-slate-50 sm:text-[32px]">{title}</h1>{description && <p className="mb-0 mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-400">{description}</p>}</div>{action}</div>;
}
function SectionTitle({ title, hint, href }: { title: string; hint?: string; href?: string }) {
  return <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="display m-0 text-[15px] font-semibold text-slate-100">{title}</h2>{hint && <p className="mb-0 mt-1 text-xs leading-relaxed text-slate-500">{hint}</p>}</div>{href && <Link href={href} className="flex min-h-10 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-sky-300 hover:text-sky-200">View all <ChevronRight size={14}/></Link>}</div>;
}
function Empty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center"><div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-400/[.07] text-slate-500"><ClipboardList size={16}/></div><div className="text-xs font-semibold text-slate-300">{title}</div><div className="mt-1 text-[11px] text-slate-500">{text}</div>{action && <div className="mt-4">{action}</div>}</div>;
}
function DataState({ loading, error, retry, empty, children }: { loading: boolean; error: boolean; retry: () => void; empty: boolean; children: ReactNode }) {
  if (loading) return <div className="space-y-3">{[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl border border-white/[.04] bg-white/[.025]"/> )}</div>;
  if (error) return <div className="rounded-xl border border-rose-300/10 bg-rose-300/[.04] p-5 text-center"><p className="text-xs text-rose-100/80">This information could not be loaded.</p><button onClick={retry} className="btn-quiet rounded-lg px-3 py-2 text-xs">Retry</button></div>;
  if (empty) return <Empty title="Nothing here yet" text="New activity will appear here when it is available." />;
  return <>{children}</>;
}
function Stat({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof Image }) {
  return <Card className="p-4 sm:p-5"><div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-400">{label}</span><span className="rounded-lg bg-sky-400/10 p-2 text-sky-300"><Icon size={16}/></span></div><div className="display mt-3 text-[28px] font-semibold tracking-tight">{value}</div><div className="mt-1 text-[11px] text-slate-500">{note}</div></Card>;
}
function Dashboard({ profile, identity, services, conversations, orders, announcements, conversationsLoading, conversationsError, retryConversations, ordersLoading, ordersError, retryOrders }: {
  profile: UserProfile; identity: string; services: Service[]; conversations: Conversation[]; orders: Order[]; announcements: Announcement[];
  conversationsLoading: boolean; conversationsError: boolean; retryConversations: () => void;
  ordersLoading: boolean; ordersError: boolean; retryOrders: () => void;
}) {
  const owner = profile.role === 'owner';
  return <div className="enter space-y-6">
     <div className="relative overflow-hidden rounded-[22px] border border-sky-300/15 bg-gradient-to-br from-[#102341] via-[#111c34] to-[#1a1532] p-5 sm:p-8"><div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border border-sky-300/10"/><div className="relative max-w-2xl"><div className="mb-3 inline-flex rounded-full border border-sky-300/20 bg-sky-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.16em] text-sky-200">{owner ? 'Owner workspace' : 'A clearer way to connect'}</div><h1 className="display max-w-xl text-[clamp(1.625rem,7.2vw,2rem)] font-semibold leading-tight tracking-[-.045em] text-white sm:text-[40px]">Good to see you, {identity.split(/\s+/)[0]}.<br/><span className="text-sky-300">Your next idea starts here.</span></h1><p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-300/80">One direct connection for creative services, device support and every detail in between.</p><div className="mt-5 flex flex-wrap gap-2"><Link href="/services" className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs"><BriefcaseBusiness size={16}/>Explore services<ArrowUpRight size={14}/></Link><Link href="/messages" className="btn-quiet inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-slate-200"><MessageCircle size={16}/>Message the business</Link></div></div><div className="absolute bottom-0 right-5 hidden h-full items-center sm:flex"><div className="relative flex h-44 w-44 items-center justify-center rounded-full border border-sky-300/15 bg-[#071225]/40"><div className="absolute inset-4 rounded-full border border-violet-300/20"/><div className="absolute h-28 w-28 rotate-[-28deg] rounded-[35%] border-2 border-sky-300/60"/><div className="display text-7xl font-bold text-sky-300">O</div><Sparkles className="absolute right-7 top-7 text-violet-300" size={18}/></div></div></div>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><Stat label="Conversations" value={`${conversations.length}`} note="Private conversations" icon={MessageSquare}/><Stat label="Services" value={`${services.length}`} note="Available to explore" icon={BriefcaseBusiness}/><Stat label="Active orders" value={`${orders.filter((order) => order.status !== 'completed').length}`} note="Track progress here" icon={Package}/><Stat label="Updates" value={`${announcements.length}`} note="From Okenstyles" icon={Megaphone}/></div>
    <div className="grid gap-5 xl:grid-cols-[1.35fr_.85fr]"><Card className="p-5"><SectionTitle title="Recent conversations" hint="Private chats with Okenstyles Graphics And Tech" href="/messages"/><DataState loading={conversationsLoading} error={conversationsError} retry={retryConversations} empty={!conversations.length}>{conversations.slice(0, 3).map((conversation) => <Link key={conversation.id} href="/messages" className="flex items-center gap-3 border-t border-white/[.06] py-3"><Avatar name={owner ? conversation.customerName || 'Customer' : 'Okenstyles'}/><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{owner ? conversation.customerName || 'Customer' : 'Okenstyles Graphics And Tech'}</div><div className="mt-1 truncate text-xs text-slate-500">{conversation.lastMessage || 'Conversation opened'}</div></div><ChevronRight size={15} className="text-slate-600"/></Link>)}</DataState><div className="mt-3 flex items-center gap-2 rounded-xl bg-sky-300/[.05] p-3 text-[11px] text-slate-400"><ShieldCheck size={15} className="shrink-0 text-sky-300"/>Customer chats are only with the business owner. No customer-to-customer messaging.</div></Card>
       <div className="space-y-5"><Card className="p-5"><SectionTitle title="Quick actions" hint="Get to the useful stuff faster"/><div className="grid grid-cols-2 gap-2">{[{ label: 'Browse services', icon: BriefcaseBusiness, to: '/services' }, { label: 'Track an order', icon: Package, to: '/orders' }, { label: 'Send a message', icon: MessageCircle, to: '/messages' }, { label: 'View updates', icon: Megaphone, to: '/announcements' }].map((item) => <Link key={item.to} href={item.to} className="btn-quiet flex min-h-[84px] flex-col items-start justify-between rounded-xl p-3 text-xs font-semibold leading-relaxed text-slate-300"><item.icon size={18} className="text-sky-300"/>{item.label}</Link>)}</div></Card><Card className="p-5"><SectionTitle title="Recent orders" href="/orders"/><DataState loading={ordersLoading} error={ordersError} retry={retryOrders} empty={!orders.length}>{orders.slice(0, 3).map((order) => <div key={order.id} className="flex min-h-[62px] items-center gap-3 border-t border-white/[.06] py-3"><Package size={16} className="shrink-0 text-sky-300"/><div className="min-w-0 flex-1"><div className="truncate text-xs font-medium">{order.serviceName}</div><div className="mt-1 text-[10px] text-slate-500">{statusLabel(order.status)}</div></div></div>)}</DataState></Card></div></div>
  </div>;
}
function Avatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'O';
  return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sky-300/15 bg-gradient-to-br from-sky-400/20 to-violet-400/20 text-xs font-bold text-sky-100">{initials}</div>;
}
function MessagesPage(props: {
  role: Role; conversations: Conversation[]; active?: Conversation; messages: ConversationMessage[]; messagesLoading: boolean;
  messagesError: boolean; retryMessages: () => void; activeId: string; selectConversation: (id: string) => void;
  input: string; setInput: (v: string) => void; submit: (e: FormEvent) => void; sending: boolean;
  openConversation: () => void; opening: boolean; conversationsLoading: boolean; conversationsError: boolean; retryConversations: () => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = props.conversations.filter((c) => (props.role === 'owner' ? c.customerName || 'Customer' : 'Okenstyles Graphics And Tech').toLowerCase().includes(search.toLowerCase()) || (c.lastMessage || '').toLowerCase().includes(search.toLowerCase()));
  const ownSender = props.role;
  return <div className="enter"><Heading eyebrow="Private customer ↔ business" title="Messages" description={props.role === 'owner' ? 'Manage private conversations with your customers.' : 'A direct line to Okenstyles Graphics And Tech. Only you and the business can see this conversation.'}/>
    <div className="chat-layout grid min-h-[570px] grid-cols-[290px_1fr] gap-4">
      <Card className="chat-list flex flex-col overflow-hidden"><div className="border-b soft-line p-4"><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/><input aria-label="Search conversations" data-testid="input-search-conversations" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations" className="form-field h-9 w-full rounded-lg pl-9 pr-3 text-xs"/></div><div className="mt-3 flex items-center justify-between text-[10px] text-slate-500"><span>{props.role === 'owner' ? 'Customer conversations' : 'Your business conversation'}</span><span>{props.conversations.length} threads</span></div></div>
        <div className="flex-1 overflow-y-auto p-2"><DataState loading={props.conversationsLoading} error={props.conversationsError} retry={props.retryConversations} empty={!filtered.length}>{filtered.map((conversation) => <button key={conversation.id} onClick={() => props.selectConversation(conversation.id)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ${props.activeId === conversation.id ? 'bg-sky-400/[.09]' : 'hover:bg-white/[.035]'}`}><Avatar name={props.role === 'owner' ? conversation.customerName || 'Customer' : 'Okenstyles'}/><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{props.role === 'owner' ? conversation.customerName || 'Customer' : 'Okenstyles Graphics And Tech'}</div><div className="mt-1 truncate text-[10px] text-slate-500">{conversation.lastMessage || 'No messages yet'}</div></div></button>)}</DataState></div>
        {props.role === 'customer' && !props.conversationsLoading && !props.conversations.length && <button disabled={props.opening} onClick={props.openConversation} className="btn-primary m-3 rounded-xl px-3 py-2.5 text-xs disabled:opacity-50">{props.opening ? 'Opening…' : 'Start a private conversation'}</button>}
        <div className="border-t soft-line p-3 text-[10px] leading-relaxed text-slate-500"><ShieldCheck size={13} className="mr-1 inline text-sky-300"/>No customer-to-customer messaging. No online or last-seen status.</div>
      </Card>
      <Card className="flex min-h-[570px] flex-col overflow-hidden"><div className="flex items-center gap-3 border-b soft-line px-4 py-3.5"><Avatar name={props.active ? (props.role === 'owner' ? props.active.customerName || 'Customer' : 'Okenstyles') : 'Okenstyles'}/><div className="min-w-0 flex-1"><div className="text-sm font-semibold">{props.active ? (props.role === 'owner' ? props.active.customerName || 'Customer' : 'Okenstyles Graphics And Tech') : 'Business conversation'}</div><div className="mt-1 text-[10px] text-slate-500">Private conversation</div></div><div className="rounded-lg border border-sky-300/10 bg-sky-300/[.05] px-2 py-1.5 text-[9px] text-sky-200"><ShieldCheck size={11} className="mr-1 inline"/>Private</div></div>
        {props.role === 'owner' && props.conversations.length > 0 && <div className="border-b soft-line px-4 py-3 md:hidden"><label htmlFor="mobile-message-recipient" className="mb-2 block text-[10px] text-slate-400">Reply to customer</label><select id="mobile-message-recipient" data-testid="select-message-recipient" value={props.activeId} onChange={(event) => props.selectConversation(event.target.value)} className="form-field h-10 w-full rounded-lg px-3 text-xs"><option value="" disabled>Select a conversation</option>{props.conversations.map((conversation) => <option key={conversation.id} value={conversation.id}>{conversation.customerName || 'Customer'} · {conversation.id.slice(0, 8)}</option>)}</select></div>}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5"><DataState loading={props.messagesLoading} error={props.messagesError} retry={props.retryMessages} empty={!props.active || !props.messages.length}>{props.messages.map((message) => { const mine = message.senderRole === ownSender; return <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[84%] ${mine ? 'text-right' : ''}`}><div className="mb-1.5 text-[9px] text-slate-600">{mine ? 'You' : props.role === 'owner' ? props.active?.customerName || 'Customer' : 'Okenstyles Graphics And Tech'} · {formatDate(message.createdAt)}</div><div className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${mine ? 'rounded-tr-sm bg-gradient-to-br from-[#155b8c] to-[#29478b] text-white' : 'rounded-tl-sm border border-white/[.07] bg-[#111a2c] text-slate-200'}`}>{message.body}</div></div></div>; })}</DataState></div>
        <div className="border-t soft-line p-3">
          <p id="message-composer-help" role="status" className="mb-2 text-[10px] text-slate-400">{props.conversationsLoading ? 'Loading conversations. You can write your draft now.' : props.conversationsError ? 'Conversations could not load. Your draft will stay here.' : !props.active ? (props.role === 'customer' ? 'Type and send your first message to start a private conversation.' : 'Select a customer conversation to send. New customers appear here after they contact you.') : 'Only you and this conversation’s recipient can see these messages.'}{props.conversationsError && <button type="button" onClick={props.retryConversations} className="ml-2 text-sky-300 underline">Retry</button>}</p>
          <form onSubmit={props.submit} className="flex gap-2"><input aria-label="Message" aria-describedby="message-composer-help" data-testid="input-message-composer" value={props.input} onChange={(e) => props.setInput(e.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }} placeholder="Write a message…" className="form-field h-11 min-w-0 flex-1 rounded-xl px-3 text-xs" maxLength={4000}/><button type="submit" aria-label="Send message" data-testid="button-send-message" className="btn-primary flex h-11 w-11 items-center justify-center rounded-xl disabled:opacity-40" disabled={!props.input.trim() || (props.role === 'owner' && !props.active) || props.sending || props.opening || props.conversationsLoading || props.conversationsError}><Send size={16}/></button></form>
        </div>
      </Card>
    </div>
  </div>;
}
function ServicesPage({ services, loading, error, retry, createOrder, creatingOrder }: { services: Service[]; loading: boolean; error: boolean; retry: () => void; createOrder: (id: string, details: string) => void; creatingOrder: boolean }) {
  const [selected, setSelected] = useState<Service | null>(null);
  const [details, setDetails] = useState('');
  return <div className="enter"><Heading eyebrow="What we can do together" title="Services" description="Explore practical creative and tech services from Okenstyles Graphics And Tech."/>
    <div className="mb-5 grid gap-4 sm:grid-cols-[1.3fr_.7fr]"><Card className="relative overflow-hidden p-5 sm:p-6"><div className="relative max-w-xl"><div className="text-[10px] font-bold uppercase tracking-[.18em] text-violet-300">Small business. Big ideas.</div><h2 className="display mt-2 text-2xl font-semibold leading-tight">Make the next thing feel unmistakably yours.</h2><p className="mb-0 mt-2 max-w-lg text-xs leading-relaxed text-slate-400">From a brand refresh to a device back in working order, get personal help without the runaround.</p></div></Card><Card className="flex items-center gap-4 p-5"><div className="rounded-xl bg-sky-300/10 p-3 text-sky-300"><MonitorSmartphone size={21}/></div><div><div className="text-sm font-semibold">A real person, one conversation</div><div className="mt-1 text-xs leading-relaxed text-slate-500">Request details stay between you and the business owner.</div></div></Card></div>
    <SectionTitle title="Available services" hint="Choose a starting point; pricing is confirmed with the business."/>
    <DataState loading={loading} error={error} retry={retry} empty={!services.length}><div className="grid gap-4 lg:grid-cols-3">{services.map((service, index) => { const Icon = serviceIcon(service, index); return <Card key={service.id} className="flex flex-col p-5"><div className="mb-5 flex items-start justify-between"><div className={`rounded-2xl p-3 ${index % 2 ? 'bg-violet-400/10 text-violet-300' : 'bg-sky-300/10 text-sky-300'}`}><Icon size={21}/></div><span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${service.available ? 'bg-emerald-300/10 text-emerald-200' : 'bg-slate-400/10 text-slate-500'}`}>{service.available ? 'Available' : 'Temporarily unavailable'}</span></div><div className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">{service.category}</div><h3 className="display mb-0 mt-1.5 text-xl font-semibold">{service.name}</h3><p className="mt-2 min-h-[58px] text-xs leading-relaxed text-slate-400">{service.description}</p><div className="mt-auto flex items-center justify-between border-t soft-line pt-4"><span className="text-xs font-semibold text-slate-300">{service.priceLabel || 'Ask for a quote'}</span><button onClick={() => { setSelected(service); setDetails(''); }} disabled={!service.available} data-testid={`button-request-service-${service.id}`} className="btn-primary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] disabled:cursor-not-allowed disabled:opacity-40">Request service<ChevronRight size={14}/></button></div></Card>; })}</div></DataState>
    <div className="mt-5 flex items-center gap-3 rounded-xl border border-sky-300/10 bg-sky-300/[.04] p-4 text-xs text-slate-400"><ShieldCheck size={16} className="shrink-0 text-sky-300"/>A request creates an order for this customer account. <Link href="/messages" className="ml-auto shrink-0 font-semibold text-sky-300">Message <ArrowUpRight size={12} className="inline"/></Link></div>
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050a13]/80 p-4"><Card className="w-full max-w-lg p-5"><div className="flex items-start justify-between"><div><div className="text-[10px] font-bold uppercase tracking-[.17em] text-sky-300">New service request</div><h2 className="display mt-2 text-xl font-semibold">{selected.name}</h2></div><button onClick={() => setSelected(null)} aria-label="Close service request" className="btn-quiet rounded-lg p-2"><X size={16}/></button></div><label className="mt-4 block text-xs font-medium text-slate-300">What would you like help with?<textarea value={details} onChange={(event) => setDetails(event.target.value)} className="form-field mt-2 w-full rounded-xl p-3 text-xs leading-relaxed" rows={5} maxLength={4000} placeholder="Share goals, timing or useful context…"/></label><div className="mt-4 flex justify-end gap-2"><button onClick={() => setSelected(null)} className="btn-quiet rounded-xl px-4 py-2.5 text-xs">Cancel</button><button disabled={!details.trim() || creatingOrder} onClick={() => { createOrder(selected.id, details.trim()); setSelected(null); }} className="btn-primary rounded-xl px-4 py-2.5 text-xs disabled:opacity-40">{creatingOrder ? 'Sending…' : 'Send request'}</button></div></Card></div>}
  </div>;
}
function serviceIcon(service: Service, index: number) {
  const value = `${service.name} ${service.category}`.toLowerCase();
  return value.includes('photo') || value.includes('design') ? (value.includes('photo') ? WandSparkles : Image) : index % 2 ? Wrench : BriefcaseBusiness;
}
function statusLabel(status: Order['status']) {
  return status === 'in_progress' ? 'In progress' : status.charAt(0).toUpperCase() + status.slice(1);
}
function StatusBadge({ status }: { status: Order['status'] }) {
  const styles = status === 'completed' ? 'border-emerald-300/15 bg-emerald-300/[.07] text-emerald-200' : status === 'in_progress' ? 'border-sky-300/15 bg-sky-300/[.07] text-sky-200' : 'border-amber-300/15 bg-amber-300/[.07] text-amber-200';
  return <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium ${styles}`}><span className="h-1 w-1 rounded-full bg-current"/>{statusLabel(status)}</span>;
}
function OrdersPage({ orders, role, loading, error, retry, changeStatus, saving }: { orders: Order[]; role: Role; loading: boolean; error: boolean; retry: () => void; changeStatus: (id: string, status: Order['status']) => void; saving: boolean }) {
  const groups: Order['status'][] = ['pending', 'in_progress', 'completed'];
  return <div className="enter"><Heading eyebrow="A clear view of every step" title="Orders & requests" description={role === 'owner' ? 'Review customer orders and update their status.' : 'Follow your service requests from first step to finish.'}/>
    <div className="mb-5 grid grid-cols-3 gap-3">{groups.map((status, i) => <Card key={status} className="p-4"><div className="flex items-center gap-2 text-xs text-slate-400"><span className={`h-2 w-2 rounded-full ${i === 0 ? 'bg-amber-300' : i === 1 ? 'bg-sky-300' : 'bg-emerald-300'}`}/>{statusLabel(status)}</div><div className="display mt-3 text-2xl font-semibold">{loading ? '—' : orders.filter((order) => order.status === status).length}</div><div className="mt-1 text-[10px] text-slate-600">orders</div></Card>)}</div>
    <Card className="overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b soft-line p-5"><div><h2 className="display m-0 text-base font-semibold">Order activity</h2><p className="mb-0 mt-1 text-xs text-slate-500">Order details connected to your account</p></div><span className="rounded-lg bg-slate-400/[.08] px-2.5 py-1.5 text-[10px] text-slate-400">{orders.length} orders</span></div><div className="p-4"><DataState loading={loading} error={error} retry={retry} empty={!orders.length}>{orders.map((order) => <div key={order.id} data-testid={`order-row-${order.id}`} className="flex flex-col gap-3 border-b border-white/[.06] py-4 last:border-0 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><div className="rounded-xl bg-sky-300/[.08] p-2.5 text-sky-300"><Package size={18}/></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-sm font-semibold">{order.serviceName}<span className="font-mono text-[10px] font-normal text-slate-600">{order.id}</span></div><div className="mt-1 text-[11px] text-slate-500">{role === 'owner' && `${order.customerName || 'Customer'} · `}{formatDate(order.createdAt)}</div></div></div><StatusBadge status={order.status}/>{role === 'owner' && <select aria-label={`Update status for ${order.id}`} value={order.status} disabled={saving} onChange={(event) => changeStatus(order.id, event.target.value as Order['status'])} className="form-field h-9 rounded-lg px-2 text-xs"><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select>}</div>)}</DataState></div></Card>
    <div className="mt-5 flex items-start gap-3 rounded-xl border border-sky-300/10 bg-sky-300/[.035] p-4 text-[11px] leading-relaxed text-slate-500"><Clock3 size={16} className="mt-0.5 shrink-0 text-sky-300"/>Order updates are attached to the account and are visible to the customer and business owner.</div>
  </div>;
}
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function AnnouncementsPage({ role, announcements, loading, error, retry, title, setTitle, body, setBody, submit, publishing }: {
  role: Role; announcements: Announcement[]; loading: boolean; error: boolean; retry: () => void;
  title: string; setTitle: (value: string) => void; body: string; setBody: (value: string) => void;
  submit: (event: FormEvent) => void; publishing: boolean;
}) {
  return <div className="enter"><Heading eyebrow="Notes from the studio" title="Announcements" description="Updates, availability and notes from Okenstyles Graphics And Tech."/>
    {role === 'owner' && <Card className="mb-5 p-5"><div className="mb-4 flex items-center gap-3"><div className="rounded-xl bg-violet-400/10 p-2.5 text-violet-300"><Megaphone size={18}/></div><div><h2 className="display m-0 text-base font-semibold">Write an announcement</h2><p className="mb-0 mt-1 text-xs text-slate-500">Publish an update for customers.</p></div></div><form onSubmit={submit} className="space-y-3"><input aria-label="Announcement title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A clear, helpful title" maxLength={160} className="form-field h-10 w-full rounded-lg px-3 text-xs"/><textarea aria-label="Announcement message" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share an update with customers…" rows={3} maxLength={4000} className="form-field w-full resize-y rounded-lg px-3 py-2.5 text-xs"/><div className="flex justify-end"><button type="submit" disabled={!title.trim() || !body.trim() || publishing} className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs disabled:opacity-40"><Plus size={14}/>{publishing ? 'Publishing…' : 'Publish update'}</button></div></form></Card>}
    <SectionTitle title="Latest updates" hint={`${announcements.length} published posts`}/>
    <DataState loading={loading} error={error} retry={retry} empty={!announcements.length}><div className="space-y-3">{announcements.map((item, index) => <Card key={item.id} className="relative overflow-hidden p-5 sm:p-6"><div className={`absolute inset-y-0 left-0 w-1 ${index === 0 ? 'bg-gradient-to-b from-sky-400 to-violet-400' : 'bg-sky-400/40'}`}/><div className="flex items-start gap-3 pl-1"><div className="mt-1 rounded-xl bg-sky-300/[.08] p-2.5 text-sky-300"><Megaphone size={16}/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="display m-0 text-base font-semibold">{item.title}</h3>{index === 0 && <span className="rounded-full bg-sky-300/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-200">Latest</span>}</div><div className="mt-1.5 text-[10px] text-slate-500">{formatDate(item.publishedAt)}</div><p className="mb-0 mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{item.body}</p></div><ArrowUpRight size={16} className="text-slate-600"/></div></Card>)}</div></DataState>
    <div className="mt-5 flex gap-3 rounded-xl border border-white/[.06] bg-white/[.02] p-4 text-[11px] leading-relaxed text-slate-500"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-sky-300"/>Announcements are published by the business for its customers.</div>
  </div>;
}
function AssistantPage({ conversations, active, messages, draft, setDraft, createDraft, approve, sending }: { conversations: Conversation[]; active?: Conversation; messages: ConversationMessage[]; draft: string; setDraft: (v: string) => void; createDraft: (mode: DraftMode) => void; approve: () => void; sending: boolean }) {
  return <div className="enter"><Heading eyebrow="Owner tools · draft only" title="AI assistant" description="Sample writing tools for shaping replies and organizing work. Drafts are local and are not generated by a live AI service."/>
    <div className="mb-5 grid gap-4 md:grid-cols-[1.05fr_.95fr]"><Card className="p-5 sm:p-6"><div className="flex items-center gap-3"><span className="rounded-xl bg-gradient-to-br from-sky-400/20 to-violet-400/20 p-3 text-sky-200"><Bot size={22}/></span><div><div className="display text-lg font-semibold">A thoughtful first draft.</div><div className="mt-1 text-xs text-slate-500">Your judgment always comes first.</div></div></div><p className="mb-0 mt-4 max-w-lg text-xs leading-relaxed text-slate-400">Choose a sample action to place text in the editor. Change every word, then explicitly approve before anything is sent.</p><div className="mt-5 flex flex-wrap gap-2"><button onClick={() => createDraft('reply')} className="btn-primary inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs"><Sparkles size={14}/>Draft a reply</button><button onClick={() => createDraft('summary')} className="btn-quiet inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-200"><MessageSquare size={14}/>Summarize chat</button><button onClick={() => createDraft('requests')} className="btn-quiet inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-200"><ClipboardList size={14}/>Organize orders</button></div></Card>
      <Card className="p-5"><div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} className="text-violet-300"/>Owner approval required</div><p className="mt-2 text-xs leading-relaxed text-slate-400">Nothing enters a conversation until you explicitly approve it. Approval sends this text as a real message.</p><div className="mt-4 rounded-xl border border-white/[.06] bg-[#0b1221] p-3"><div className="mb-2 text-[10px] font-bold uppercase tracking-[.15em] text-slate-500">Selected private conversation</div>{active ? <div className="flex items-center gap-2 text-xs font-medium"><Avatar name={active.customerName || 'Customer'}/><div>{active.customerName || 'Customer'}<div className="mt-1 text-[10px] font-normal text-slate-500">{messages.length} messages</div></div></div> : <div className="text-xs text-slate-500">{conversations.length ? 'Choose a conversation in Messages before approving a draft.' : 'Open a customer conversation to use approval.'}</div>}</div></Card></div>
    <Card className="overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b soft-line px-5 py-4"><div><h2 className="display m-0 text-base font-semibold">Draft editor</h2><p className="mb-0 mt-1 text-xs text-slate-500">Editable local sample · pending until you decide</p></div><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${draft ? 'bg-amber-300/10 text-amber-200' : 'bg-slate-400/[.08] text-slate-500'}`}>{draft ? 'Pending approval' : 'No pending draft'}</span></div><div className="p-5"><textarea aria-label="Edit assistant draft" value={draft} onChange={(e) => setDraft(e.target.value)} rows={8} maxLength={4000} placeholder="Choose a sample action above to prepare a draft. It remains pending until you approve it." className="form-field w-full resize-y rounded-xl p-4 text-sm leading-relaxed"/><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><div className="max-w-lg text-[10px] leading-relaxed text-slate-500">Sample/local text only · never sent automatically.</div><div className="flex gap-2"><button onClick={() => setDraft('')} disabled={!draft} className="btn-quiet inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs text-slate-300 disabled:opacity-40"><X size={14}/>Discard</button><button onClick={approve} disabled={!draft.trim() || !active || sending} className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs disabled:opacity-40"><Check size={14}/>{sending ? 'Sending…' : 'Approve and send'}</button></div></div></div></Card>
  </div>;
}
function OwnerPage({ services, orders, announcements, conversations, servicesLoading, servicesError, retryServices, ordersLoading, ordersError, retryOrders, changeService, changeOrderStatus, savingService, savingOrder }: {
  services: Service[]; orders: Order[]; announcements: Announcement[]; conversations: Conversation[]; servicesLoading: boolean; servicesError: boolean; retryServices: () => void; ordersLoading: boolean; ordersError: boolean; retryOrders: () => void;
  changeService: (service: Service) => void; changeOrderStatus: (id: string, status: Order['status']) => void; savingService: boolean; savingOrder: boolean;
}) {
  const [tab, setTab] = useState<'overview' | 'services' | 'conversations'>('overview');
  return <div className="enter"><Heading eyebrow="Owner workspace" title="Business overview" description="Manage customer orders, service availability and private conversations."/>
    <div className="mb-5 flex gap-1 rounded-xl border border-white/[.06] bg-[#0c1322] p-1">{(['overview', 'services', 'conversations'] as const).map((value) => <button key={value} onClick={() => setTab(value)} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold capitalize ${tab === value ? 'bg-sky-300/10 text-sky-200' : 'text-slate-500 hover:text-slate-300'}`}>{value}</button>)}</div>
    {tab === 'overview' && <><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><Stat label="Customer threads" value={`${conversations.length}`} note="Private, owner-access only" icon={MessageSquare}/><Stat label="Orders in progress" value={`${orders.filter((order) => order.status === 'in_progress').length}`} note="Update status below" icon={Package}/><Stat label="Services" value={`${services.length}`} note="Owner-managed catalog" icon={BriefcaseBusiness}/><Stat label="Published updates" value={`${announcements.length}`} note="Customer announcements" icon={Megaphone}/></div>
      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_.9fr]"><Card className="p-5"><SectionTitle title="Order management" hint="Status updates are reflected in the order record." href="/orders"/><DataState loading={ordersLoading} error={ordersError} retry={retryOrders} empty={!orders.length}>{orders.map((order) => <div key={order.id} className="flex flex-wrap items-center gap-2 border-t border-white/[.06] py-3"><div className="min-w-0 flex-1"><div className="text-xs font-semibold">{order.serviceName}</div><div className="mt-1 text-[10px] text-slate-500">{order.customerName || 'Customer'} · {order.id}</div></div><select aria-label={`Change order status ${order.id}`} disabled={savingOrder} value={order.status} onChange={(e) => changeOrderStatus(order.id, e.target.value as Order['status'])} className="form-field h-8 rounded-lg px-2 text-[10px]"><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></div>)}</DataState></Card>
      <Card className="p-5"><SectionTitle title="Service availability" hint="Changes update the customer catalog."/><DataState loading={servicesLoading} error={servicesError} retry={retryServices} empty={!services.length}>{services.map((service) => <div key={service.id} className="flex items-center gap-3 border-t border-white/[.06] py-3"><div className="min-w-0 flex-1"><div className="text-xs font-semibold">{service.name}</div><div className="mt-1 text-[10px] text-slate-500">{service.available ? 'Visible as available' : 'Marked unavailable'}</div></div><button disabled={savingService} aria-label={`${service.available ? 'Disable' : 'Enable'} ${service.name}`} onClick={() => changeService(service)} className={`relative h-6 w-11 rounded-full ${service.available ? 'bg-sky-400' : 'bg-slate-700'} disabled:opacity-50`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white ${service.available ? 'translate-x-6' : 'translate-x-1'}`}/></button></div>)}</DataState></Card></div>
      <div className="mt-4 grid gap-4 md:grid-cols-2"><Card className="flex items-center justify-between gap-3 p-5"><div><div className="text-sm font-semibold">Review the order queue</div><div className="mt-1 text-xs text-slate-500">{orders.length} orders to review.</div></div><Link href="/orders" className="btn-quiet rounded-xl px-3 py-2 text-xs">Open orders</Link></Card><Card className="flex items-center justify-between gap-3 p-5"><div><div className="text-sm font-semibold">Share a customer update</div><div className="mt-1 text-xs text-slate-500">Publish an announcement.</div></div><Link href="/announcements" className="btn-quiet rounded-xl px-3 py-2 text-xs">Compose</Link></Card></div></>}
    {tab === 'services' && <Card className="overflow-hidden"><div className="border-b soft-line p-5"><SectionTitle title="Services" hint="Availability updates appear in the customer catalog."/></div>{services.map((service, index) => <div key={service.id} className="flex items-center gap-3 border-b border-white/[.05] p-4 last:border-0"><div className="rounded-xl bg-sky-300/[.08] p-2.5 text-sky-300">{(() => { const Icon = serviceIcon(service, index); return <Icon size={17}/>; })()}</div><div className="flex-1"><div className="text-sm font-semibold">{service.name}</div><div className="mt-1 text-[10px] text-slate-500">{service.priceLabel || 'Ask for a quote'} · {service.available ? 'Available' : 'Unavailable'}</div></div><button disabled={savingService} onClick={() => changeService(service)} className="btn-quiet rounded-lg px-3 py-2 text-[10px] font-semibold disabled:opacity-50">{service.available ? 'Set unavailable' : 'Set available'}</button></div>)}</Card>}
    {tab === 'conversations' && <Card className="overflow-hidden"><div className="border-b soft-line p-5"><SectionTitle title="Customer conversations" hint="Every thread is private to its customer and the business owner."/></div>{conversations.length ? conversations.map((conversation) => <Link key={conversation.id} href={`/messages?conversation=${encodeURIComponent(conversation.id)}`} className="flex items-center gap-3 border-b border-white/[.05] p-4 last:border-0"><Avatar name={conversation.customerName || 'Customer'}/><div className="min-w-0 flex-1"><div className="text-sm font-semibold">{conversation.customerName || 'Customer'}</div><div className="mt-1 truncate text-xs text-slate-500">{conversation.lastMessage || 'No messages yet'}</div></div><span className="btn-quiet rounded-lg px-3 py-2 text-[10px] font-semibold">Open thread</span></Link>) : <div className="p-4"><Empty title="No conversations yet" text="Customer conversations will appear here when opened."/></div>}</Card>}
    <div className="mt-5 flex items-start gap-3 rounded-xl border border-sky-300/10 bg-sky-300/[.035] p-4 text-[11px] leading-relaxed text-slate-500"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-sky-300"/>Owner tools are available according to your server profile. Customer messages remain private to the business.</div>
  </div>;
}
export default App;
