import { useEffect, useMemo, useRef, useState, type ReactNode, type MouseEvent } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { ClerkProvider, Show, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { useCreateAssessment, useDeleteAssessments, useGetAssessment, useGetDashboardSummary, useListAssessments, getGetDashboardSummaryQueryKey, getListAssessmentsQueryKey, getGetAssessmentQueryKey } from '@workspace/api-client-react';
import type { Assessment, AssessmentInput, DashboardSummary, GazePoint } from '@workspace/api-client-react';
import { Route, Switch, Link, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { Activity, ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, ChevronRight, Clock3, Eye, FileHeart, Heart, Home, Info, LockKeyhole, MapPin, Menu, MousePointer2, Palette, Play, RotateCcw, ShieldCheck, Trash2, Video, X } from 'lucide-react';
import './index.css';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/clarity-mark.svg`,
  },
  variables: {
    colorPrimary: '#177d72',
    colorForeground: '#24413d',
    colorMutedForeground: '#70877f',
    colorDanger: '#ad4d3e',
    colorBackground: '#fbfdfb',
    colorInput: '#f3f8f5',
    colorInputForeground: '#24413d',
    colorNeutral: '#547169',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '12px',
  },
  elements: {
    rootBox: { width: '100%', display: 'flex', justifyContent: 'center' },
    cardBox: { background: '#fbfdfb', borderRadius: '18px', width: '440px', maxWidth: '100%', overflow: 'hidden' },
    card: { boxShadow: 'none', border: '0', background: 'transparent' },
    footer: { boxShadow: 'none', border: '0', background: 'transparent' },
    headerTitle: { fontFamily: 'Manrope, sans-serif', color: '#24413d', letterSpacing: '-.04em' },
    headerSubtitle: { color: '#70877f' },
    socialButtonsBlockButtonText: { color: '#34564f' },
    formFieldLabel: { color: '#45675f' },
    footerActionLink: { color: '#177d72' },
    footerActionText: { color: '#718780' },
    dividerText: { color: '#879891' },
    identityPreviewEditButton: { color: '#177d72' },
    formFieldSuccessText: { color: '#31816f' },
    alertText: { color: '#744c40' },
    logoBox: { justifyContent: 'flex-start' },
    logoImage: { height: '32px' },
    socialButtonsBlockButton: { borderRadius: '10px', borderColor: '#dfeae5' },
    formButtonPrimary: { borderRadius: '10px', boxShadow: 'none' },
    formFieldInput: { borderRadius: '10px', borderColor: '#dce8e2', background: '#f3f8f5' },
    footerAction: { paddingTop: '12px' },
    dividerLine: { background: '#e5ede9' },
    alert: { borderRadius: '10px' },
    otpCodeFieldInput: { borderRadius: '9px' },
    formFieldRow: { marginBottom: '12px' },
    main: { width: '100%' },
  },
};
const LOCAL_KEY = 'clarity-assessments-v1';
type AssessmentDraft = AssessmentInput;
const blankDraft: AssessmentDraft = {
  trackingScore: null, colorStatus: 'skipped', colorCorrect: 0, colorTotal: 0,
  leftEyeColorCorrect: null, rightEyeColorCorrect: null, colorProtocol: 'skipped',
  displaySettingsReviewed: false, eyeMode: 'skipped',
  smoothPursuitGain: null, meanTrackingError: null, jitter: null, bilateralDifference: null, gazePath: [],
};

function useLocalAssessments() {
  const [items, setItems] = useState<Assessment[]>([]);
  useEffect(() => { try { setItems(JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')); } catch { setItems([]); } }, []);
  const save = (input: AssessmentInput) => {
    const item: Assessment = { ...input, id: `local-${Date.now()}`, createdAt: new Date().toISOString() };
    const next = [item, ...items]; setItems(next); localStorage.setItem(LOCAL_KEY, JSON.stringify(next)); return item;
  };
  const removeAll = () => { setItems([]); localStorage.removeItem(LOCAL_KEY); };
  return { items, save, removeAll };
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="brand" data-testid="link-brand"><img src={`${import.meta.env.BASE_URL}clarity-mark.svg`} alt="" /><span className="brand-copy"><b>Clarity</b><small>VISUAL HEALTH</small></span>{!compact && <span className="brand-sr">Clarity Visual Health</span>}</Link>;
}

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home }, { href: '/assessment/consent', label: 'Assessment', icon: Activity },
  { href: '/results', label: 'Results', icon: FileHeart }, { href: '/resources', label: 'Resources', icon: Heart },
];

function Shell({ children, active = '' }: { children: ReactNode; active?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="app-frame">
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <div className="side-brand"><BrandMark /></div>
      <nav className="side-nav" aria-label="Main navigation">{navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className={`nav-link ${active === href ? 'active' : ''}`} data-testid={`link-nav-${label.toLowerCase()}`}><Icon size={17} strokeWidth={1.8} /><span>{label}</span></Link>)}</nav>
      <div className="side-bottom"><Link href="/settings" className="nav-link settings-link" data-testid="link-nav-settings"><ShieldCheck size={17} /><span>Settings</span></Link><div className="privacy-mini"><LockKeyhole size={16} /><span><b>Your data stays yours</b><small>Private by default</small></span></div></div>
    </aside>
    {menuOpen && <button className="mobile-scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}
    <main className="main-area"><header className="mobile-header"><button onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu" className="icon-button" data-testid="button-menu"><Menu size={21} /></button><BrandMark compact /><ProfileChip /></header>{children}</main>
  </div>;
}

function ProfileChip() {
  const { isSignedIn, user } = useUser();
  return <div className="profile-chip"><span className="avatar">{isSignedIn ? (user?.firstName?.slice(0, 1) || 'C') : 'G'}</span><span><b>{isSignedIn ? user?.firstName || 'Your profile' : 'Guest mode'}</b><small>{isSignedIn ? 'My profile' : 'Saved on this device'}</small></span></div>;
}

function Button({ children, onClick, href, variant = 'primary', className = '', disabled = false, testId, type = 'button' }: { children: ReactNode; onClick?: () => void; href?: string; variant?: 'primary' | 'outline' | 'soft' | 'text' | 'danger'; className?: string; disabled?: boolean; testId: string; type?: 'button' | 'submit' }) {
  const cls = `btn btn-${variant} ${className}`;
  if (href?.startsWith('http')) return <a href={href} className={cls} target="_blank" rel="noreferrer" data-testid={testId}>{children}</a>;
  if (href) return <Link href={href} className={cls} data-testid={testId}>{children}</Link>;
  return <button type={type} onClick={onClick} className={cls} disabled={disabled} data-testid={testId}>{children}</button>;
}

function Eyemark() {
  return <div className="eye-art" aria-hidden="true"><div className="eye-orbit"><div className="eye-shape"><span className="iris"><i /></span></div></div><span className="art-dot" /></div>;
}

function Landing() {
  const [, navigate] = useLocation();
  const { isSignedIn } = useUser();
  useEffect(() => { if (isSignedIn) navigate('/dashboard'); }, [isSignedIn, navigate]);
  return <div className="landing">
    <header className="landing-nav"><BrandMark /><div className="landing-links"><a href="#how-it-works" data-testid="link-how-it-works">How it works</a><a href="#privacy" data-testid="link-privacy">Privacy</a><Link href="/resources" data-testid="link-landing-resources">Resources</Link></div><div className="landing-auth"><Show when="signed-out"><Link href="/sign-in" className="btn btn-text" data-testid="link-signin">Sign in</Link></Show><Button href="/dashboard" variant="outline" testId="button-guest-start">Try as a guest <ArrowRight size={16} /></Button></div></header>
    <section className="landing-hero wrap">
      <div className="hero-copy fade-up"><span className="eyebrow"><LockKeyhole size={13} /> PRIVATE & SECURE BY DEFAULT</span><h1 className="font-display">A little more<br /><em>clarity</em> over time.</h1><p>An experimental visual-wellness check-in to record color-perception responses and eye movement. It is not a Parkinson’s test.</p><div className="hero-actions"><Button href="/assessment/consent" testId="button-start-assessment">Start a check-in <ArrowRight size={16} /></Button><span className="quiet-note"><Clock3 size={14} /> About 5 minutes</span></div><div className="hero-assurance"><span><Check size={14} /> No diagnosis, just a record</span><span><Check size={14} /> Guest mode available</span></div></div>
      <div className="hero-visual"><div className="hero-wash" /><Eyemark /><div className="visual-note"><span className="note-check"><Check size={14} /></span><span><b>Ready when you are</b><small>Quiet space recommended</small></span></div><div className="visual-caption">A thoughtful moment<br />for your visual wellness</div></div>
    </section>
    <section id="how-it-works" className="landing-details wrap"><div className="section-kicker">A PERSONAL CHECK-IN</div><div className="detail-heading"><h2 className="font-display">Keep your own record.</h2><p>Clarity stores your activity responses for personal reference. The activities are experimental and not validated medical tests.</p></div><div className="steps-row"><article className="step"><span>01</span><Eye /><h3>Take a moment</h3><p>Try an experimental eye-movement activity and a separate-eye color-pattern exercise.</p></article><article className="step"><span>02</span><Activity /><h3>Keep a personal record</h3><p>Review your own check-ins over time in one private, easy-to-understand place.</p></article><article className="step"><span>03</span><Heart /><h3>Choose what comes next</h3><p>If you have a concern, use the care-finding guide to plan a conversation with a professional.</p></article></div></section>
    <section id="privacy" className="landing-trust"><div className="wrap trust-content"><div className="trust-symbol"><ShieldCheck size={26} /></div><div><div className="section-kicker">YOUR CHOICE, YOUR DATA</div><h2 className="font-display">Private by default.<br />Experimental, not diagnostic.</h2><p>Use Clarity without an account. Guest check-ins stay in your browser; sign in to save them to your account. Camera frames are never stored.</p></div><Button href="/assessment/consent" variant="outline" testId="button-trust-checkin">Start with consent <ArrowRight size={15} /></Button></div></section>
    <footer className="landing-footer wrap"><BrandMark /><span>Clarity is not a validated test and cannot screen for or diagnose Parkinson’s.</span><Link href="/resources" data-testid="link-footer-care">Find care resources <ArrowRight size={14} /></Link></footer>
  </div>;
}

function useAssessments() {
  const { isSignedIn, isLoaded } = useUser();
  const local = useLocalAssessments();
  const listQuery = useListAssessments({ query: { enabled: !!isSignedIn, queryKey: getListAssessmentsQueryKey() } });
  const serverRows = listQuery.data || [];
  const rows = isSignedIn ? [...serverRows, ...local.items.filter(x => x.id.startsWith('local-'))].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)) : local.items;
  return { isSignedIn: !!isSignedIn, rows: !isLoaded ? [] : rows, local, loading: !isLoaded || (isSignedIn ? listQuery.isLoading : false), error: isSignedIn ? listQuery.isError : false };
}

function PageHead({ kicker, title, description, action }: { kicker: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-head"><div><div className="section-kicker">{kicker}</div><h1 className="font-display">{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="page-head-action">{action}</div>}</div>;
}

function Dashboard() {
  const { isSignedIn } = useUser(); const data = useAssessments();
  const query = useGetDashboardSummary({ query: { enabled: !!isSignedIn, queryKey: getGetDashboardSummaryQueryKey() } });
  const summary = query.data as DashboardSummary | undefined;
  const latest = isSignedIn ? summary?.latest || data.rows[0] : data.rows[0];
  const trend = isSignedIn ? summary?.trend || [] : data.rows.slice(0, 6).reverse().filter(x => x.trackingScore !== null).map(x => ({ date: x.createdAt, trackingScore: x.trackingScore as number }));
  return <Shell active="/dashboard"><div className="content-wrap">
    <div className="greeting-row"><div><div className="section-kicker">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div><h1 className="font-display">Good to see you.</h1></div><ProfileChip /></div>
    <section className="dashboard-hero"><div><span className="eyebrow light"><LockKeyhole size={13} /> PRIVATE & SECURE</span><h2 className="font-display">Keep an eye on your<br />visual wellness.</h2><p>Keep a personal record of experimental color and eye-movement activities. They are not Parkinson’s tests.</p><div className="hero-actions"><Button href="/assessment/consent" testId="button-dashboard-start">Start visual check-in <ArrowRight size={16} /></Button><span className="quiet-note"><Clock3 size={14} /> Takes about 5 minutes</span></div></div><Eyemark /><span className="dashboard-tip"><Check size={14} /> Ready when you are <small>Quiet space recommended</small></span></section>
    <div className="section-title-row"><div><div className="section-kicker">YOUR PROGRESS</div><h2>Visual health at a glance</h2></div><Link href="/results" className="inline-link" data-testid="link-view-all-results">View all results <ArrowRight size={14} /></Link></div>
    {(data.loading || query.isLoading && isSignedIn) ? <div className="metric-grid"><div className="skeleton panel" /><div className="skeleton panel" /><div className="skeleton panel" /></div> : (data.error || query.isError && isSignedIn) && !data.rows.length ? <div className="notice warning"><Info size={17} /> We couldn’t load your overview. Your saved check-ins are still available in Results. <Button variant="text" onClick={() => query.refetch()} testId="button-retry-dashboard">Retry</Button></div> : <div className="metric-grid">
      <div className="panel score-panel"><div className="metric-top"><span className="metric-icon"><Eye size={17} /></span>{latest?.trackingScore !== null && latest?.trackingScore !== undefined && <span className="badge peach">Latest check-in</span>}</div><span className="metric-label">Latest visual check-in</span>{latest?.trackingScore !== null && latest?.trackingScore !== undefined ? <><div className="score-number">{latest.trackingScore}<small> / 100</small></div><p className="metric-caption">Gaze tracking proxy · {new Date(latest.createdAt).toLocaleDateString()}</p></> : <div className="empty-metric"><b>No check-ins yet</b><small>Your personal record starts with your first check-in.</small></div>}</div>
      <div className="panel trend-panel"><div className="panel-heading"><div><span className="metric-label">YOUR TREND</span><h3>Change over time</h3></div><span className="badge lavender">Personal record</span></div>{trend.length > 1 ? <TrendChart points={trend} /> : <div className="chart-empty"><Activity size={20} /><span>{trend.length ? 'Your trend will take shape with more check-ins.' : 'Your personal trend appears after a check-in.'}</span></div>}</div>
      <div className="panel history-panel"><div className="panel-heading"><div><span className="metric-label">ASSESSMENT HISTORY</span><h3>{data.rows.length} {data.rows.length === 1 ? 'check-in' : 'check-ins'}</h3></div><span className="metric-icon lavender-icon"><CalendarDays size={16} /></span></div>{data.rows.slice(0, 2).length ? data.rows.slice(0, 2).map(row => <Link href={`/results/${row.id}`} key={row.id} className="history-row" data-testid={`link-assessment-${row.id}`}><span className="date-tile"><b>{new Date(row.createdAt).getDate()}</b><small>{new Date(row.createdAt).toLocaleDateString(undefined, { month: 'short' })}</small></span><span className="history-desc"><b>Visual check-in</b><small>Color & eye movement</small></span><b className="history-score">{row.trackingScore ?? '—'}</b></Link>) : <div className="history-empty">Your check-in history will appear here.</div>}</div>
    </div>}
    <div className="quick-actions"><Link href="/assessment/consent" className="quick-card" data-testid="link-quick-assessment"><span className="quick-icon peach-icon"><Activity size={18} /></span><span><b>Take an assessment</b><small>Start your guided visual check</small></span><ArrowRight size={16} /></Link><Link href="/resources" className="quick-card" data-testid="link-quick-care"><span className="quick-icon blue-icon"><MapPin size={18} /></span><span><b>Find care near you</b><small>Explore neurologic care options</small></span><ArrowRight size={16} /></Link><Link href="/settings" className="quick-card" data-testid="link-quick-settings"><span className="quick-icon lavender-icon"><ShieldCheck size={18} /></span><span><b>Your privacy controls</b><small>Review data and accessibility</small></span><ArrowRight size={16} /></Link></div>
    <p className="disclaimer"><Info size={14} /> These experimental activities cannot screen for or diagnose Parkinson’s or another condition. For vision concerns, speak with a qualified healthcare professional.</p>
  </div></Shell>;
}

function TrendChart({ points }: { points: { date: string; trackingScore: number }[] }) {
  const values = points.slice(-6); const coords = values.map((p, i) => `${20 + i * (240 / Math.max(values.length - 1, 1))},${100 - p.trackingScore * .65}`).join(' ');
  return <div className="chart-wrap"><svg viewBox="0 0 280 126" role="img" aria-label="Personal trend chart"><path d="M15 30 H265 M15 65 H265 M15 100 H265" className="chart-grid" /><polyline points={coords} className="chart-line" />{values.map((p, i) => <circle key={`${p.date}-${i}`} cx={20 + i * (240 / Math.max(values.length - 1, 1))} cy={100 - p.trackingScore * .65} r="4" className={i === values.length - 1 ? 'chart-dot latest' : 'chart-dot'} />)}</svg><div className="chart-labels">{values.map((p, i) => <span key={i}>{new Date(p.date).toLocaleDateString(undefined, { month: 'short' })}</span>)}</div></div>;
}

function Consent() {
  const [, navigate] = useLocation(); const [checks, setChecks] = useState({ understands: false, agrees: false }); const [explainerPlaying, setExplainerPlaying] = useState(false);
  const ready = checks.understands && checks.agrees;
  return <Shell active="/assessment/consent"><div className="narrow-wrap"><div className="section-kicker">BEFORE YOU BEGIN</div><h1 className="font-display page-title">Your choice, your data</h1><div className="panel consent-card">
    <div className="consent-intro"><span className="big-icon"><ShieldCheck size={23} /></span><div><h2>First, here’s what you’re agreeing to</h2><p>These experimental activities are not validated medical tests. You can stop at any point, skip either activity, or delete your results later.</p></div></div>
    <div className="explainer-card"><div className="explainer-top"><span><Eye size={17} /> CLARITY EXPLAINER</span><button aria-label={explainerPlaying ? 'Pause explainer' : 'Play explainer'} className="play-button" onClick={() => setExplainerPlaying(!explainerPlaying)} data-testid="button-play-explainer">{explainerPlaying ? <X size={15} /> : <Play size={17} fill="currentColor" />}</button></div><div className="explainer-center"><Eye size={31} /><b>{explainerPlaying ? 'A personal check-in, never a diagnosis' : 'Notice changes over time'}</b><span>{explainerPlaying ? 'Your check-ins create a private record you can discuss with a healthcare professional.' : 'Clarity checks visual perception and eye movement to build your personal trend.'}</span></div><div className="explainer-progress"><i style={{ width: explainerPlaying ? '78%' : '15%' }} /></div><small>Captions are always on · Audio follows the timeline and stays on this device</small></div>
    <div className="plain-words"><b>In simple words</b><p><Check size={14} /> This keeps a personal activity record.</p><p><Info size={14} /> It cannot screen for, diagnose, or rule out Parkinson’s or another condition.</p><p><LockKeyhole size={14} /> Camera frames are not stored.</p><p><ShieldCheck size={14} /> Guest results stay in this browser.</p></div>
    <div className="form-subtitle">Confirm before continuing</div>
    <label className="check-row"><input type="checkbox" checked={checks.understands} onChange={e => setChecks({ ...checks, understands: e.target.checked })} data-testid="checkbox-understands" /><span><b>I understand these are experimental activities, not Parkinson’s tests.</b><small>They cannot diagnose or rule out any health condition.</small></span></label>
    <label className="check-row"><input type="checkbox" checked={checks.agrees} onChange={e => setChecks({ ...checks, agrees: e.target.checked })} data-testid="checkbox-consent" /><span><b>I freely agree to take the assessment.</b><small>I can stop or withdraw this consent later.</small></span></label>
    <div className="consent-actions"><Button variant="outline" href="/dashboard" testId="button-consent-cancel">Not now</Button><Button disabled={!ready} onClick={() => navigate('/assessment/color')} testId="button-consent-continue">I understand, continue <ArrowRight size={16} /></Button></div>
  </div></div></Shell>;
}

type PlateAnswer = string | null;
type PlateDot = { x: number; y: number; size: number; color: string };
type ColorPlate = { answer: PlateAnswer; dots: PlateDot[]; choices: PlateAnswer[] };

type EyeSide = 'right' | 'left';
const supportedPlateNumbers = ['1', '2', '3', '5', '7', '8'];
const noNumberLabel = 'I don’t see a number';
const digitMasks: Record<string, string[]> = {
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
};

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function colorForDot(hue: number, saturation: number, lightness: number) {
  const h = (hue + (Math.random() * 5 - 2.5) + 360) % 360;
  const s = Math.max(17, Math.min(38, saturation + (Math.random() * 8 - 4)));
  const l = Math.max(46, Math.min(68, lightness + (Math.random() * 12 - 6)));
  return `hsl(${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%)`;
}

function digitAtPoint(x: number, y: number, answer: PlateAnswer) {
  if (!answer) return false;
  const left = 17, top = 17, width = 66, height = 66;
  const column = Math.floor(((x - left) / width) * 5);
  const row = Math.floor(((y - top) / height) * 7);
  return row >= 0 && row < 7 && column >= 0 && column < 5 && digitMasks[answer][row][column] === '1';
}

function generatePlate(answer: PlateAnswer, chromaStep: number): ColorPlate {
  // Low-chroma blue/yellow-oriented colors are an uncalibrated visual exercise,
  // not a standards-based tritan test. Per-dot luminance noise reduces simple
  // brightness cues but cannot make consumer displays clinically comparable.
  const blueHue = 222 + Math.random() * 8;
  const yellowHue = 48 + Math.random() * 8;
  const saturation = chromaStep + Math.random() * 2;
  const lightness = 57 + Math.random() * 4;
  const foregroundHue = Math.random() < 0.5 ? blueHue : yellowHue;
  const backgroundHue = foregroundHue === blueHue ? yellowHue : blueHue;
  const dots: PlateDot[] = [];
  const rows = 22, columns = 22, spacing = 4.25;

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const x = 5.4 + column * spacing + (row % 2 ? spacing / 2 : 0);
      const y = 5.4 + row * spacing;
      const jitteredX = x + (Math.random() * 1.1 - 0.55);
      const jitteredY = y + (Math.random() * 1.1 - 0.55);
      if (Math.hypot(jitteredX - 50, jitteredY - 50) > 46) continue;

      const isForeground = digitAtPoint(jitteredX, jitteredY, answer);
      dots.push({
        x: jitteredX,
        y: jitteredY,
        size: 2.6 + Math.random() * 0.9,
        color: colorForDot(
          isForeground ? foregroundHue : backgroundHue,
          saturation,
          lightness,
        ),
      });
    }
  }

  return { answer, dots, choices: shuffle([...supportedPlateNumbers, null]) };
}

function generateColorAssessment(): ColorPlate[] {
  const numbers = shuffle(supportedPlateNumbers).slice(0, 4);
  const chromaSteps = shuffle([30, 26, 22, 18, 14]);
  return shuffle([...numbers, null]).map((answer, index) => generatePlate(answer, chromaSteps[index]));
}

function ColorActivity() {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<'setup' | 'right' | 'switch' | 'left' | 'complete'>('setup');
  const [step, setStep] = useState(0);
  const [rightCorrect, setRightCorrect] = useState<number | null>(null);
  const [leftCorrect, setLeftCorrect] = useState<number | null>(null);
  const [currentCorrect, setCurrentCorrect] = useState(0);
  const [displaySettingsReviewed, setDisplaySettingsReviewed] = useState(false);
  const [plateSets] = useState(() => ({ right: generateColorAssessment(), left: generateColorAssessment() }));
  const activeEye: EyeSide | null = phase === 'right' || phase === 'left' ? phase : null;
  const plates = activeEye ? plateSets[activeEye] : [];
  const plate = plates[step];
  function startEye(eye: EyeSide) {
    setStep(0);
    setCurrentCorrect(0);
    setPhase(eye);
  }
  function choose(answer: PlateAnswer) {
    if (!plate || !activeEye) return;
    const nextCorrect = currentCorrect + (answer === plate.answer ? 1 : 0);
    setCurrentCorrect(nextCorrect);
    if (step >= plates.length - 1) {
      if (activeEye === 'right') {
        setRightCorrect(nextCorrect);
        setPhase('switch');
      } else {
        setLeftCorrect(nextCorrect);
        setPhase('complete');
      }
      return;
    }
    setStep(value => value + 1);
  }
  function continueFlow(status: 'no-difficulty-reported' | 'some-difficulty-reported' | 'skipped') {
    const prev = JSON.parse(sessionStorage.getItem('clarity-draft') || '{}');
    const colorTotal = (rightCorrect === null ? 0 : plateSets.right.length) + (leftCorrect === null ? 0 : plateSets.left.length);
    sessionStorage.setItem('clarity-draft', JSON.stringify({
      ...blankDraft,
      ...prev,
      colorStatus: status,
      colorCorrect: (rightCorrect ?? 0) + (leftCorrect ?? 0),
      colorTotal,
      leftEyeColorCorrect: leftCorrect,
      rightEyeColorCorrect: rightCorrect,
      colorProtocol: colorTotal > 0 ? 'blue-yellow-self-check-v1' : 'skipped',
      displaySettingsReviewed,
    }));
    navigate('/assessment/eye');
  }
  return <Shell active="/assessment/consent"><div className="narrow-wrap assessment-wrap"><div className="step-progress"><span>STEP 1 OF 2</span><div><i style={{ width: phase === 'setup' ? '25%' : phase === 'right' || phase === 'switch' ? '40%' : phase === 'left' ? '70%' : '100%' }} /></div><Link href="/dashboard" data-testid="link-exit-color">Save & exit</Link></div><div className="section-kicker">COLOR PERCEPTION · EXPERIMENTAL</div><h1 className="font-display page-title">A careful look, one eye at a time.</h1><p className="page-lead">This low-saturation, blue–yellow-oriented activity is an uncalibrated prototype—not a validated color test or a way to screen for Parkinson’s.</p>
    <div className="panel color-panel">
      {phase === 'setup' && <>
        <div className="activity-top"><span className="metric-label">BEFORE YOU BEGIN</span><span className="badge">About 2 minutes</span></div>
        <div className="display-guidance">
          <h2>Check your screen and lighting</h2>
          <p>If available, turn off True Tone, Night Shift, eye-comfort or color filters. Use comfortable brightness and similar room lighting each time. Clarity cannot detect these settings, calibrate your display, or control its color range.</p>
          <label className="check-row"><input type="checkbox" checked={displaySettingsReviewed} onChange={event => setDisplaySettingsReviewed(event.target.checked)} data-testid="checkbox-display-settings" /><span><b>I reviewed the display guidance.</b><small>I understand that screen differences can change how these colors look.</small></span></label>
        </div>
        <div className="eye-instructions"><span className="big-icon"><Eye size={22} /></span><div><b>Start with your right eye</b><p>Cover your left eye gently without pressing on it. Keep your usual glasses on if you wear them. You’ll switch eyes before the second set.</p></div></div>
        <Button disabled={!displaySettingsReviewed} onClick={() => startEye('right')} testId="button-begin-color-check">Begin right-eye activity <ArrowRight size={16} /></Button>
      </>}
      {(phase === 'right' || phase === 'left') && plate && <>
        <div className="activity-top"><span className="metric-label">{phase === 'right' ? 'RIGHT EYE' : 'LEFT EYE'} · PATTERN {step + 1} OF {plates.length}</span><span className="badge">No time limit</span></div>
        <p className="eye-cover-instruction">Keep the other eye gently covered. Which number, if any, do you notice?</p>
        <div className="dot-pattern" role="img" aria-label="Low-saturation blue and yellow dot pattern. Choose the number, if any, that you notice.">{plate.dots.map((dot, i) => <span key={i} style={{ left: `${dot.x}%`, top: `${dot.y}%`, width: `${dot.size}%`, height: `${dot.size}%`, background: dot.color }} />)}</div>
        <div className="pattern-options">{plate.choices.map(answer => {
          const label = answer ?? noNumberLabel;
          return <button key={label} className="option-button" onClick={() => choose(answer)} data-testid={`button-pattern-${label.replace(/\W/g, '').toLowerCase()}`}>{label}</button>;
        })}</div>
      </>}
      {phase === 'switch' && <div className="eye-switch-panel"><span className="big-icon"><Eye size={22} /></span><h2>Now switch eyes</h2><p>You finished the right-eye set. Cover your right eye gently and uncover your left eye. The second set is saved separately for your personal history.</p><Button onClick={() => startEye('left')} testId="button-begin-left-eye">Begin left-eye activity <ArrowRight size={16} /></Button><button className="skip-button" onClick={() => setPhase('complete')} data-testid="button-skip-left-eye">Skip the second eye</button></div>}
      {phase === 'complete' && <div className="activity-finished"><span className="big-icon"><CheckCircle2 size={25} /></span><h2>Thanks for taking a look.</h2><p>These are response counts only—there is no pass/fail result or clinical interpretation. Screen and lighting differences can change them.</p><div className="eye-count-summary"><span>Right eye <b>{rightCorrect === null ? 'Not completed' : `${rightCorrect} / ${plateSets.right.length} matches`}</b></span><span>Left eye <b>{leftCorrect === null ? 'Not completed' : `${leftCorrect} / ${plateSets.left.length} matches`}</b></span></div><div className="button-stack"><Button onClick={() => continueFlow('no-difficulty-reported')} testId="button-color-no-difficulty">I noticed no difficulty <ArrowRight size={15} /></Button><Button onClick={() => continueFlow('some-difficulty-reported')} variant="outline" testId="button-color-some-difficulty">I noticed some difficulty</Button></div></div>}
    </div>
    {phase !== 'complete' && <button className="skip-button" onClick={() => continueFlow('skipped')} data-testid="button-skip-color">Skip color activity <ArrowRight size={14} /></button>}
    <div className="notice warning"><Info size={16} /><span><b>Important limitation</b> This prototype is not clinically validated and cannot detect, diagnose, or rule out Parkinson’s or any other condition. Use a qualified eye-care professional for color-vision testing.</span></div>
  </div></Shell>;
}

type CalibrationSample = { inputX: number; inputY: number; targetX: number; targetY: number };
type CalibrationMap = { x: [number, number, number]; y: [number, number, number] };
type EyeLandmark = { x: number; y: number };

const calibrationTargets = [
  { x: 0.14, y: 0.18 },
  { x: 0.86, y: 0.18 },
  { x: 0.5, y: 0.5 },
  { x: 0.14, y: 0.82 },
  { x: 0.86, y: 0.82 },
];

function solveThreeByThree(matrix: number[][], values: number[]): [number, number, number] | null {
  const rows = matrix.map((row, index) => [...row, values[index]]);
  for (let column = 0; column < 3; column++) {
    let pivot = column;
    for (let row = column + 1; row < 3; row++) {
      if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    }
    if (Math.abs(rows[pivot][column]) < 1e-8) return null;
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    const divisor = rows[column][column];
    for (let index = column; index < 4; index++) rows[column][index] /= divisor;
    for (let row = 0; row < 3; row++) {
      if (row === column) continue;
      const factor = rows[row][column];
      for (let index = column; index < 4; index++) rows[row][index] -= factor * rows[column][index];
    }
  }
  return [rows[0][3], rows[1][3], rows[2][3]];
}

function fitCalibration(samples: CalibrationSample[]): CalibrationMap | null {
  if (samples.length < 3) return null;
  const normal = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const targetX = [0, 0, 0];
  const targetY = [0, 0, 0];
  for (const sample of samples) {
    const features = [sample.inputX, sample.inputY, 1];
    for (let row = 0; row < 3; row++) {
      targetX[row] += features[row] * sample.targetX;
      targetY[row] += features[row] * sample.targetY;
      for (let column = 0; column < 3; column++) {
        normal[row][column] += features[row] * features[column];
      }
    }
  }
  const x = solveThreeByThree(normal, targetX);
  const y = solveThreeByThree(normal, targetY);
  return x && y ? { x, y } : null;
}

function applyCalibration(map: CalibrationMap, point: { x: number; y: number }) {
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  return {
    x: clamp(map.x[0] * point.x + map.x[1] * point.y + map.x[2]),
    y: clamp(map.y[0] * point.x + map.y[1] * point.y + map.y[2]),
  };
}

function readEyeLandmarks(landmarks?: EyeLandmark[]) {
  if (!landmarks || landmarks.length < 478) return null;
  const leftIris = landmarks[468];
  const rightIris = landmarks[473];
  const leftCorners = [landmarks[33], landmarks[133]];
  const rightCorners = [landmarks[362], landmarks[263]];
  if (!leftIris || !rightIris) return null;
  const normalizedEyePosition = (iris: EyeLandmark, corners: EyeLandmark[]) => {
    const width = Math.abs(corners[1].x - corners[0].x);
    if (!width) return null;
    return (iris.x - Math.min(corners[0].x, corners[1].x)) / width;
  };
  const leftPosition = normalizedEyePosition(leftIris, leftCorners);
  const rightPosition = normalizedEyePosition(rightIris, rightCorners);
  return {
    x: (leftIris.x + rightIris.x) / 2,
    y: (leftIris.y + rightIris.y) / 2,
    bilateralDifference:
      leftPosition === null || rightPosition === null
        ? null
        : Math.abs(leftPosition - rightPosition),
  };
}

function deriveEyeMetrics(points: GazePoint[], bilateralSamples: number[]) {
  const observed = points.filter(
    (point): point is GazePoint & { gazeX: number; gazeY: number } =>
      point.gazeX !== null && point.gazeY !== null,
  );
  if (!observed.length) {
    return {
      trackingScore: null,
      smoothPursuitGain: null,
      meanTrackingError: null,
      jitter: null,
      bilateralDifference: null,
    };
  }

  const errors = observed.map((point) =>
    Math.hypot(point.gazeX - point.targetX, point.gazeY - point.targetY),
  );
  const meanTrackingError = errors.reduce((sum, error) => sum + error, 0) / errors.length;
  const velocities = observed.slice(1).map((point, index) => {
    const previous = observed[index];
    const seconds = Math.max((point.timeMs - previous.timeMs) / 1000, 0.001);
    return {
      seconds,
      target: Math.hypot(point.targetX - previous.targetX, point.targetY - previous.targetY) / seconds,
      gaze: Math.hypot(point.gazeX - previous.gazeX, point.gazeY - previous.gazeY) / seconds,
    };
  });
  const pursuitIntervals = velocities.filter((velocity) => velocity.target > 0.015);
  const smoothPursuitGain =
    pursuitIntervals.length > 0
      ? pursuitIntervals.reduce((sum, velocity) => sum + velocity.gaze / velocity.target, 0) /
        pursuitIntervals.length
      : null;

  const acceleration = velocities.slice(1).map((velocity, index) => {
    const previous = velocities[index];
    return Math.abs(velocity.gaze - previous.gaze) / Math.max(velocity.seconds, 0.001);
  });
  const jitter =
    acceleration.length > 0
      ? Math.min(
          1,
          acceleration.reduce((sum, value) => sum + value, 0) / acceleration.length / 20,
        )
      : 0;
  const bilateralDifference =
    bilateralSamples.length > 0
      ? bilateralSamples.reduce((sum, value) => sum + value, 0) / bilateralSamples.length
      : null;
  const trackingScore = Math.max(
    0,
    Math.min(100, Math.round(100 - meanTrackingError * 65 - jitter * 20)),
  );

  return {
    trackingScore,
    smoothPursuitGain,
    meanTrackingError,
    jitter,
    bilateralDifference,
  };
}

function EyeActivity() {
  const [, navigate] = useLocation(); const videoRef = useRef<HTMLVideoElement>(null); const streamRef = useRef<MediaStream | null>(null); const [mode, setMode] = useState<'choose' | 'mouse' | 'camera'>('choose'); const [permission, setPermission] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle'); const [errorText, setErrorText] = useState(''); const [path, setPath] = useState<GazePoint[]>([]); const [running, setRunning] = useState(false); const [complete, setComplete] = useState(false); const started = useRef(0); const cameraTimer = useRef<number | null>(null); const mousePosition = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
  const addPoint = (x: number, y: number, gazeX: number | null = x, gazeY: number | null = y) => setPath(p => [...p.slice(-38), { timeMs: Date.now() - started.current, targetX: x, targetY: y, gazeX, gazeY }]);
  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); if (cameraTimer.current) window.clearInterval(cameraTimer.current); try { (window as any).__clarityLandmarker?.close(); delete (window as any).__clarityLandmarker; } catch {} }, []);
  useEffect(() => {
    if (permission === 'ready' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play();
    }
  }, [permission, running]);
  async function startCamera() {
    setMode('camera'); setPermission('loading'); setErrorText('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      // MediaPipe is loaded only after the user chooses camera mode; no frames are persisted.
      try {
        const vision = await import('@mediapipe/tasks-vision');
        const fileset = await vision.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm');
        const landmarker = await vision.FaceLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task', delegate: 'GPU' }, runningMode: 'VIDEO', numFaces: 1 });
        (window as any).__clarityLandmarker = landmarker;
        setPermission('ready');
      } catch { stream.getTracks().forEach(track => track.stop()); streamRef.current = null; setPermission('error'); setErrorText('On-device face landmarks could not load. Please use mouse-guided mode instead.'); }
    } catch (err) { setPermission('error'); setErrorText(err instanceof Error ? err.message : 'Camera permission is unavailable. Choose mouse mode instead.'); }
  }
  function startRun(selected: 'mouse' | 'camera') {
    setMode(selected); setRunning(true); setComplete(false); setPath([]); mousePosition.current = { x: null, y: null }; started.current = Date.now();
    if (selected === 'camera') {
      let i = 0;
      cameraTimer.current = window.setInterval(() => {
        const t = i / 30; const x = .12 + .76 * (0.5 + 0.5 * Math.sin(t * 1.2)); const y = .5 + .24 * Math.sin(t * 2.2);
        let gx: number | null = null; let gy: number | null = null;
        const lm = (window as any).__clarityLandmarker;
        if (lm && videoRef.current) {
          try {
            const landmarks = lm.detectForVideo(videoRef.current, performance.now()).faceLandmarks?.[0];
            const leftIris = landmarks?.[468], rightIris = landmarks?.[473];
            if (leftIris && rightIris) { gx = (leftIris.x + rightIris.x) / 2; gy = (leftIris.y + rightIris.y) / 2; }
          } catch {}
        }
        addPoint(x, y, gx, gy); i++;
        if (i > 84) { if (cameraTimer.current) window.clearInterval(cameraTimer.current); setRunning(false); setComplete(true); }
      }, 105);
    } else {
      let i = 0; const timer = window.setInterval(() => { const x = .1 + .8 * (i % 2 ? .85 : .15); const y = .5 + .34 * Math.sin(i * .35); addPoint(x, y, mousePosition.current.x, mousePosition.current.y); i++; if (i >= 28) { clearInterval(timer); setRunning(false); setComplete(true); } }, 190);
    }
  }
  function saveAndFinish() {
    const draft = JSON.parse(sessionStorage.getItem('clarity-draft') || '{}');
    const points = path.slice(0, 100);
    const errs = mode === 'mouse' ? [] : points.filter(p => p.gazeX !== null).map(p => Math.hypot((p.gazeX as number) - p.targetX, (p.gazeY as number) - p.targetY));
    const meanError = errs.length ? errs.reduce((a, b) => a + b, 0) / errs.length : null;
    const score = mode === 'mouse' || meanError === null ? null : Math.max(0, Math.round(100 - meanError * 100));
    const input: AssessmentInput = { ...blankDraft, ...draft, eyeMode: mode as 'camera' | 'mouse', trackingScore: score, smoothPursuitGain: null, meanTrackingError: meanError, jitter: meanError === null ? null : Number((meanError * .28).toFixed(3)), bilateralDifference: null, gazePath: points };
    sessionStorage.setItem('clarity-completed', JSON.stringify(input)); navigate('/assessment/results');
  }
  function skipEyeActivity() {
    const draft = JSON.parse(sessionStorage.getItem('clarity-draft') || '{}');
    sessionStorage.setItem('clarity-completed', JSON.stringify({ ...blankDraft, ...draft, eyeMode: 'skipped', trackingScore: null, smoothPursuitGain: null, meanTrackingError: null, jitter: null, bilateralDifference: null, gazePath: [] }));
    navigate('/assessment/results');
  }
  const mouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!running || mode !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect(); mousePosition.current = { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
  };
  return <Shell active="/assessment/consent"><div className="narrow-wrap assessment-wrap"><div className="step-progress"><span>STEP 2 OF 2</span><div><i style={{ width: '100%' }} /></div><Link href="/dashboard" data-testid="link-exit-eye">Save & exit</Link></div><div className="section-kicker">EYE MOVEMENT</div><h1 className="font-display page-title">Follow the moving dot.</h1><p className="page-lead">A gentle visual activity. Any measurements are gaze proxies, not clinical findings.</p>
    <div className="panel eye-panel">
      {!running && !complete && <><div className="activity-top"><span className="metric-label">CHOOSE A CHECK-IN MODE</span><span className="badge">About 30 seconds</span></div><div className="mode-cards"><button className={`mode-card ${mode === 'mouse' ? 'selected' : ''}`} onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; setPermission('idle'); setMode('mouse'); }} data-testid="button-mode-mouse"><MousePointer2 size={21} /><b>Mouse-guided</b><small>Move your pointer to follow the target. No camera needed.</small><span className="mode-radio" /></button><button className={`mode-card ${mode === 'camera' ? 'selected' : ''}`} onClick={() => startCamera()} data-testid="button-mode-camera"><Video size={21} /><b>Camera-guided</b><small>Uses on-device face landmarks for gaze proxies. Frames are not saved.</small><span className="mode-radio" /></button></div>{mode === 'camera' && <div className={`notice ${permission === 'error' ? 'warning' : 'subtle'}`}>{permission === 'loading' ? <><span className="pulse-dot" /> Requesting camera permission and loading landmarks…</> : permission === 'error' ? <><Info size={16} /> {errorText} <button className="inline-link" onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; setMode('mouse'); }} data-testid="button-camera-fallback">Use mouse mode</button></> : <><CheckCircle2 size={16} /> Camera ready. Your video stays on this device.</>}</div>}<div className="eye-preview">{mode === 'camera' && permission === 'ready' && <video ref={videoRef} muted playsInline className="camera-preview" data-testid="video-camera-preview" />}<span className="preview-target" /><span className="preview-copy">The target will move gently across this area</span></div><Button disabled={mode === 'camera' && permission !== 'ready'} onClick={() => startRun(mode === 'camera' ? 'camera' : 'mouse')} testId="button-begin-eye-test">Begin eye activity <ArrowRight size={16} /></Button><button className="skip-button" onClick={skipEyeActivity} data-testid="button-skip-eye">Skip eye activity</button></>}
      {running && <><div className="activity-top"><span className="metric-label">FOLLOW THE TARGET</span><span className="badge">You can stop anytime</span></div><div className="eye-preview running-area" onMouseMove={mouseMove} data-testid="area-eye-tracking"><span className="target-moving" style={{ left: `${(path.at(-1)?.targetX ?? .5) * 100}%`, top: `${(path.at(-1)?.targetY ?? .5) * 100}%` }} /><span className="preview-copy">Follow the dot with your eyes{mode === 'mouse' ? ' and pointer' : ''}</span>{mode === 'camera' && <video ref={videoRef} muted playsInline className="camera-preview" />}</div><div className="progress-bar"><i style={{ width: `${Math.min(100, path.length / 84 * 100)}%` }} /></div><button className="skip-button" onClick={() => { setRunning(false); setComplete(true); if (cameraTimer.current) window.clearInterval(cameraTimer.current); }} data-testid="button-stop-eye-test">Stop activity</button></>}
      {complete && <div className="activity-finished"><span className="big-icon"><CheckCircle2 size={25} /></span><h2>That’s the check-in complete.</h2><p>Thank you. Gaze measurements are approximate proxies, not clinical findings or a diagnosis.</p><div className="button-stack"><Button onClick={saveAndFinish} testId="button-finish-assessment">Review my results <ArrowRight size={15} /></Button><Button variant="text" onClick={() => navigate('/assessment/color')} testId="button-retake-color">Retake color activity</Button></div></div>}
    </div><div className="notice subtle"><ShieldCheck size={16} /><span><b>Camera privacy</b> Camera frames are processed on this device and are never stored or uploaded. The camera will be released when you leave this step.</span></div></div></Shell>;
}

function ResultSummary({ result, onRetake, onDelete, trendPoints }: { result: Assessment; onRetake: () => void; onDelete?: () => void; trendPoints?: { date: string; trackingScore: number }[] }) {
  return <><section className="result-banner"><div className="result-ring"><b>{result.trackingScore ?? '—'}</b><small>{result.trackingScore !== null ? 'proxy / 100' : 'not measured'}</small></div><div className="result-banner-copy"><span className="badge peach">PERSONAL CHECK-IN</span><h2>Your results are a snapshot.</h2><p>These experimental activity responses are for personal reference only. They are not validated measures and cannot confirm or rule out any condition.</p></div><Button onClick={onRetake} variant="outline" testId="button-retake-assessment">Retake assessment <RotateCcw size={15} /></Button></section>
     <div className="result-grid"><div className="panel result-trend"><div className="panel-heading"><div><span className="metric-label">YOUR TREND</span><h3>Personal comparison</h3></div><span className="badge">No comparison to others</span></div><TrendChart points={trendPoints || (result.trackingScore === null ? [] : [{ date: result.createdAt, trackingScore: result.trackingScore }])} /><div className="single-point-note">A personal record only; this activity score is not a clinical measure.</div></div><div className="panel measures-panel"><span className="metric-label">THIS CHECK-IN’S ACTIVITY NOTES</span><Measure label="Self-reported color difficulty" value={result.colorStatus === 'skipped' ? 'Not reported' : result.colorStatus === 'some-difficulty-reported' ? 'Some difficulty' : 'No difficulty reported'} icon={<Palette size={16} />} />{result.colorProtocol === 'blue-yellow-self-check-v1' ? <div className="color-response-panel"><b>Low-saturation color activity</b><span>Right eye: {result.rightEyeColorCorrect === null ? 'not completed' : `${result.rightEyeColorCorrect} / 5 matches`}</span><span>Left eye: {result.leftEyeColorCorrect === null ? 'not completed' : `${result.leftEyeColorCorrect} / 5 matches`}</span><small>Response counts only—not a color-vision score. Compare personal records only when display and lighting are similar.</small></div> : (result.colorProtocol === 'unrecorded' || !result.colorProtocol) && result.colorTotal > 0 ? <small className="measure-note">Earlier color activity: {result.colorCorrect} of {result.colorTotal} responses. It is not comparable to the newer separate-eye activity.</small> : null}<Measure label="Eye movement activity" value={result.trackingScore === null ? 'Not measured' : `${result.trackingScore} / 100 proxy`} icon={<Eye size={16} />} /><small className="measure-note">Experimental gaze proxy · {result.eyeMode === 'mouse' ? 'mouse-guided' : result.eyeMode === 'camera' ? 'camera-guided' : 'skipped'}</small><div className="notice warning compact"><Info size={15} /> These activities are not Parkinson’s tests and cannot diagnose or rule out a condition.</div></div></div>
     {result.gazePath.length > 0 && <div className="panel path-panel"><div className="panel-heading"><div><span className="metric-label">EYE-MOVEMENT ACTIVITY</span><h3>Target & {result.eyeMode === 'mouse' ? 'pointer' : 'gaze proxy'} path</h3></div><span className="badge">Approximate, not clinical</span></div><PathChart points={result.gazePath} mode={result.eyeMode} /></div>}
    <section className="follow-up"><span className="follow-icon"><Info size={19} /></span><div><span className="metric-label">A NEXT STEP, IF YOU NEED ONE</span><h3>Noticed a change or have a concern?</h3><p>This doesn’t mean you have a medical condition. It can be sensible to speak with a healthcare professional.</p></div><Button href="/resources" testId="button-find-care">Find care near me</Button></section>
    <div className="data-foot"><span className="big-icon"><LockKeyhole size={18} /></span><div><span className="metric-label">YOUR DATA</span><b>Stored privately</b><p>{onDelete ? 'You can remove this saved record at any time from Settings.' : 'Guest check-ins are stored in this browser.'}</p></div>{onDelete && <Button variant="danger" onClick={onDelete} testId="button-delete-result">Delete all data <Trash2 size={14} /></Button>}</div>
     <p className="disclaimer"><Info size={14} /> Clarity is not a validated clinical test and cannot screen for, diagnose, or rule out Parkinson’s or another condition. Discuss health concerns with a qualified professional.</p>
  </>;
}

function Results() {
  const data = useAssessments(); const query = useGetDashboardSummary({ query: { enabled: data.isSignedIn, queryKey: getGetDashboardSummaryQueryKey() } });
  const [showDelete, setShowDelete] = useState(false); const deleteMutation = useDeleteAssessments(); const qc = useQueryClient();
  const [, navigate] = useLocation();
  const latest = data.rows[0];
  const confirmDelete = () => { if (data.isSignedIn) deleteMutation.mutate(undefined, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListAssessmentsQueryKey() }); qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); data.local.removeAll(); setShowDelete(false); } }); else { data.local.removeAll(); setShowDelete(false); } };
  return <Shell active="/results"><div className="content-wrap"><PageHead kicker="YOUR RECORD" title="Your results" description="A private view of your check-ins and the changes you choose to track." action={<Button href="/assessment/consent" testId="button-results-retake">Retake assessment <RotateCcw size={15} /></Button>} />
     {data.loading ? <div className="skeleton panel loading-panel" /> : data.error && !data.rows.length ? <div className="notice warning"><Info size={16} /> History couldn’t load. <Button variant="text" onClick={() => query.refetch()} testId="button-retry-history">Try again</Button></div> : !data.rows.length ? <EmptyState title="Your record begins here." text="Complete the experimental visual activities to start a personal record. They are not medical tests." action={<Button href="/assessment/consent" testId="button-empty-start">Start a check-in <ArrowRight size={15} /></Button>} /> : <>
      {latest && <ResultSummary result={latest} onRetake={() => navigate('/assessment/consent')} onDelete={() => setShowDelete(true)} trendPoints={data.rows.slice().reverse().filter(r => r.trackingScore !== null).map(r => ({ date: r.createdAt, trackingScore: r.trackingScore as number }))} />}
       <div className="history-section"><div className="section-title-row"><div><div className="section-kicker">PAST CHECK-INS</div><h2>Your personal history</h2></div><span className="badge">{data.rows.length} saved</span></div><p className="history-context">Color responses are listed separately for each eye when available. Compare only your own records made with similar screen settings and lighting; these counts have no clinical meaning.</p><div className="history-list">{data.rows.map(row => <Link key={row.id} href={`/results/${row.id}`} className="history-list-row" data-testid={`link-history-${row.id}`}><span className="date-tile"><b>{new Date(row.createdAt).getDate()}</b><small>{new Date(row.createdAt).toLocaleDateString(undefined, { month: 'short' })}</small></span><span className="history-desc"><b>Experimental visual activities</b><small>{new Date(row.createdAt).toLocaleString()} · {row.eyeMode === 'mouse' ? 'Mouse-guided' : row.eyeMode === 'camera' ? 'Camera-guided' : 'Eye activity skipped'}</small>{row.colorProtocol === 'blue-yellow-self-check-v1' && <small className="history-color">Right {row.rightEyeColorCorrect ?? '—'}/5 · Left {row.leftEyeColorCorrect ?? '—'}/5 color matches</small>}</span><span className="history-score">{row.trackingScore ?? '—'} <small>{row.trackingScore === null ? 'not measured' : 'proxy score'}</small></span><ChevronRight size={17} /></Link>)}</div></div>
    </>}
  </div>{showDelete && <ConfirmDialog count={data.rows.length} pending={deleteMutation.isPending} onCancel={() => setShowDelete(false)} onConfirm={confirmDelete} />}</Shell>;
}

function AssessmentResult() {
  const [, navigate] = useLocation(); const { isSignedIn, isLoaded } = useUser(); const [result, setResult] = useState<Assessment | null>(null); const { mutate: saveAssessment, isPending: isSaving } = useCreateAssessment(); const qc = useQueryClient(); const processed = useRef(false);
  useEffect(() => {
    if (!isLoaded || processed.current) return;
    const raw = sessionStorage.getItem('clarity-completed'); if (!raw) { navigate('/results'); return; }
    processed.current = true;
    const input = JSON.parse(raw) as AssessmentInput;
    if (isSignedIn) saveAssessment({ data: input }, { onSuccess: saved => { setResult(saved); qc.invalidateQueries({ queryKey: getListAssessmentsQueryKey() }); qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); sessionStorage.removeItem('clarity-completed'); }, onError: () => { const item = { ...input, id: `local-${Date.now()}`, createdAt: new Date().toISOString() }; try { const old = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); localStorage.setItem(LOCAL_KEY, JSON.stringify([item, ...old])); } catch {} sessionStorage.removeItem('clarity-completed'); setResult(item); } });
    else { const item = { ...input, id: `guest-${Date.now()}`, createdAt: new Date().toISOString() }; try { const old = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); localStorage.setItem(LOCAL_KEY, JSON.stringify([item, ...old])); } catch {} setResult(item); sessionStorage.removeItem('clarity-completed'); }
  }, [isLoaded, isSignedIn, saveAssessment, qc, navigate]);
  return <Shell active="/results"><div className="content-wrap"><PageHead kicker="CHECK-IN COMPLETE" title="Your results" description={result ? new Date(result.createdAt).toLocaleString() : 'Preparing your personal record…'} />
    {isSaving && !result ? <div className="skeleton panel loading-panel" /> : result ? <ResultSummary result={result} onRetake={() => navigate('/assessment/consent')} /> : <div className="panel pending-result"><div className="skeleton" /><span>Preparing your private summary…</span></div>}
  </div></Shell>;
}

function AssessmentDetail() {
  const { assessmentId = '' } = useParams<{ assessmentId: string }>(); const data = useAssessments(); const isGuest = assessmentId.startsWith('local-') || assessmentId.startsWith('guest-');
  const [, navigate] = useLocation();
  const query = useGetAssessment(assessmentId, { query: { enabled: data.isSignedIn && !isGuest, queryKey: getGetAssessmentQueryKey(assessmentId) } });
  const result = isGuest ? data.rows.find(x => x.id === assessmentId) : query.data;
  return <Shell active="/results"><div className="content-wrap"><PageHead kicker="SAVED CHECK-IN" title="Your results" description={result ? new Date(result.createdAt).toLocaleString() : undefined} action={<Button href="/results" variant="outline" testId="button-back-history"><ArrowLeft size={15} /> All results</Button>} />
    {query.isLoading ? <div className="skeleton panel loading-panel" /> : result ? <ResultSummary result={result} onRetake={() => navigate('/assessment/consent')} trendPoints={data.rows.slice().reverse().filter(r => r.trackingScore !== null).map(r => ({ date: r.createdAt, trackingScore: r.trackingScore as number }))} /> : <EmptyState title="This check-in isn’t available." text="It may have been removed, or it may belong to another account." action={<Button href="/results" testId="button-detail-back">Back to history</Button>} />}
  </div></Shell>;
}

function PathChart({ points, mode }: { points: GazePoint[]; mode: Assessment['eyeMode'] }) {
  const usable = points.filter(p => p.gazeX !== null && p.gazeY !== null);
  const toString = (arr: { x: number; y: number }[]) => arr.map(p => `${p.x * 100},${p.y * 100}`).join(' ');
  const proxyLabel = mode === 'mouse' ? 'Pointer path' : 'Gaze proxy path';
  return <div className="path-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={toString(points.map(p => ({ x: p.targetX, y: p.targetY })))} className="path-target" />{usable.length > 1 && <polyline points={toString(usable.map(p => ({ x: p.gazeX as number, y: p.gazeY as number })))} className="path-gaze" />}</svg><span className="path-label target-label">Target path</span><span className="path-label gaze-label">{proxyLabel}</span>{!usable.length && <span className="path-overlay-note">{mode === 'mouse' ? 'Pointer path is recorded only when you move the pointer.' : 'Gaze proxy data was not available in this session.'}</span>}</div>;
}

function Measure({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return <div className="measure-row"><span className="metric-icon peach-icon">{icon}</span><span><b>{label}</b></span><strong>{value}</strong></div>;
}

function EmptyState({ title, text, action }: { title: string; text: string; action: ReactNode }) {
  return <div className="empty-state"><span className="big-icon"><Eye size={24} /></span><h2 className="font-display">{title}</h2><p>{text}</p>{action}</div>;
}

function ConfirmDialog({ count, pending, onCancel, onConfirm }: { count: number; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className="modal-backdrop" role="presentation"><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title"><span className="danger-icon"><Trash2 size={21} /></span><h2 id="delete-title">Delete all your check-in data?</h2><p>This will permanently delete {count} {count === 1 ? 'saved check-in' : 'saved check-ins'} and your personal trend. This action can’t be undone.</p><div className="dialog-actions"><Button onClick={onCancel} variant="outline" testId="button-cancel-delete">Keep my data</Button><Button onClick={onConfirm} variant="danger" disabled={pending} testId="button-confirm-delete">{pending ? 'Deleting…' : 'Delete all data'} <Trash2 size={15} /></Button></div></section></div>;
}

const resources = [
  { initials: 'HR', name: 'HRSA Health Center Finder', specialty: 'Find community health centers', place: 'Care options across the United States', tone: 'mint', href: 'https://findahealthcenter.hrsa.gov/' },
  { initials: 'NE', name: 'National Eye Institute', specialty: 'Eye health information and care', place: 'U.S. National Institutes of Health', tone: 'lavender', href: 'https://www.nei.nih.gov/learn-about-eye-health/healthy-vision/how-find-eye-doctor' },
  { initials: 'TH', name: 'HHS Telehealth Resources', specialty: 'Learn about telehealth care', place: 'U.S. Department of Health & Human Services', tone: 'peach', href: 'https://telehealth.hhs.gov/' },
];
function Resources() {
  const [location, setLocation] = useState(''); const [searched, setSearched] = useState(false); const [message, setMessage] = useState('');
  async function useLocationOnce() {
    if (!navigator.geolocation) { setMessage('Location is not available in this browser.'); return; }
    setMessage('Requesting location once…');
    navigator.geolocation.getCurrentPosition(pos => { setLocation(`${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`); setMessage('Location used for this search only.'); setSearched(true); }, () => setMessage('We could not access your location. You can type a town or postcode instead.'), { maximumAge: 0, timeout: 10000 });
  }
  return <Shell active="/resources"><div className="content-wrap"><PageHead kicker="CARE & SUPPORT" title="Healthcare resources" description="A place to start a conversation, if and when you want to." />
    <div className="resource-banner"><span className="big-icon"><MapPin size={24} /></span><div><h2>Find care that works for you</h2><p>Explore nearby and remote neurological care. Call ahead to confirm availability, costs, and insurance coverage.</p></div></div>
    <form className="search-row" onSubmit={e => { e.preventDefault(); setSearched(true); setMessage(location ? `Search links are ready for ${location}.` : 'Showing care-finding resources. Enter a town or postcode for a map search.'); }}><label className="search-input"><MapPin size={16} /><input value={location} onChange={e => setLocation(e.target.value)} placeholder="Type your town or postcode" aria-label="Town or postcode" data-testid="input-location" /></label><Button type="submit" testId="button-search-area">Search area</Button><Button variant="outline" onClick={useLocationOnce} testId="button-use-location">Use my location once</Button></form><p className="privacy-hint"><LockKeyhole size={12} /> We do not store your location. You can type a town instead of sharing it.</p>
    {message && <div className="search-feedback" data-testid="status-search">{message}</div>}
    {searched && location.trim() && <a className="area-search-result" href={`https://www.google.com/maps/search/neurology+care+${encodeURIComponent(location)}`} target="_blank" rel="noreferrer" data-testid="link-area-map-search"><span><MapPin size={18} /></span><span><b>Search care providers near {location}</b><small>Opens a map search in a new tab. Your location is not saved here.</small></span><ArrowRight size={16} /></a>}
    <div className="map-illustration"><div className="map-line line-one" /><div className="map-line line-two" /><span className="map-pin pin-one"><MapPin size={19} fill="currentColor" /></span><span className="map-pin pin-two"><MapPin size={19} fill="currentColor" /></span><span className="map-pin pin-three"><MapPin size={19} fill="currentColor" /></span><span className="map-key">Care map <small>Approximate location only</small></span></div>
    <div className="section-title-row resource-list-title"><div><div className="section-kicker">CARE OPTIONS</div><h2>Neurology care options</h2></div><span className="badge">{resources.length} options</span></div>
    <div className="resource-list">{resources.map(item => <article key={item.initials} className="resource-card"><span className={`provider-avatar ${item.tone}`}>{item.initials}</span><div><b>{item.name}</b><span>{item.specialty}</span><small><MapPin size={12} /> {item.place}</small></div><a className="provider-arrow" href={item.href} target="_blank" rel="noreferrer" aria-label={`Open ${item.name}`} data-testid={`link-provider-${item.initials}`}><ArrowRight size={16} /></a></article>)}</div>
    <div className="telehealth-banner"><span><Heart size={20} /></span><div><b>Limited access to a specialist?</b><small>Community health centers can help reduce travel and costs. Ask about sliding-scale fees and remote appointments.</small></div><Button href="https://findahealthcenter.hrsa.gov/" variant="outline" testId="link-call-clinic">Find a clinic</Button><a href="https://telehealth.hhs.gov/" target="_blank" rel="noreferrer" className="inline-link" data-testid="link-telehealth">View telehealth</a></div>
    <div className="resource-bottom-grid"><div className="panel"><div className="section-kicker">CONNECTION & OFFLINE USE</div><h3>Designed for limited connectivity</h3><p>Assessments can run offline. Results are saved on this device unless you choose to sign in. Sharing, live maps, and telehealth need internet.</p><a className="btn btn-outline full-button" href={`data:text/plain;charset=utf-8,${encodeURIComponent(resources.map(r => `${r.name} — ${r.specialty} — ${r.place}`).join('\n'))}`} download="clarity-care-options.txt" data-testid="link-download-care">Download a care list <ArrowRight size={15} /></a></div><div className="panel"><div className="section-kicker">ACCESSIBILITY</div><h3>Choose what works for you</h3><Link href="/settings" className="settings-shortcut" data-testid="link-resource-settings">Open accessibility settings <ChevronRight size={16} /></Link><p>Large text, reduced motion, and other preferences are available in Settings.</p></div></div>
     <p className="disclaimer"><Info size={14} /> Clarity’s experimental activities are not validated medical tests and cannot screen for, diagnose, or rule out Parkinson’s or another condition. Discuss health concerns with a qualified professional.</p>
  </div></Shell>;
}

function Settings() {
  const data = useAssessments(); const deletion = useDeleteAssessments(); const qc = useQueryClient(); const [confirm, setConfirm] = useState(false);
  const [large, setLarge] = useState(localStorage.getItem('clarity-large-text') === 'true'); const [reduceMotion, setReduceMotion] = useState(localStorage.getItem('clarity-reduced-motion') === 'true');
  useEffect(() => { document.documentElement.classList.toggle('large-text', large); document.documentElement.classList.toggle('reduce-motion', reduceMotion); }, [large, reduceMotion]);
  function setPreference(key: string, value: boolean) { localStorage.setItem(key, String(value)); if (key === 'clarity-large-text') { setLarge(value); document.documentElement.classList.toggle('large-text', value); } else { setReduceMotion(value); document.documentElement.classList.toggle('reduce-motion', value); } }
  function deleteAll() { if (data.isSignedIn) deletion.mutate(undefined, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListAssessmentsQueryKey() }); qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() }); data.local.removeAll(); setConfirm(false); } }); else { data.local.removeAll(); setConfirm(false); } }
  return <Shell><div className="content-wrap"><PageHead kicker="PREFERENCES & PRIVACY" title="Settings" description="Your experience, your choices." />
    <div className="settings-layout"><section className="panel settings-panel"><div className="section-kicker">ACCESSIBILITY</div><h2>Make Clarity comfortable</h2><p>These preferences are saved on this device.</p><label className="preference-row"><span><b>Large text</b><small>Increase reading size throughout the app.</small></span><input type="checkbox" checked={large} onChange={e => setPreference('clarity-large-text', e.target.checked)} data-testid="toggle-large-text" /></label><label className="preference-row"><span><b>Reduced motion</b><small>Minimize animation and movement.</small></span><input type="checkbox" checked={reduceMotion} onChange={e => setPreference('clarity-reduced-motion', e.target.checked)} data-testid="toggle-reduced-motion" /></label><div className="preference-row"><span><b>Color activity</b><small>Optional, non-diagnostic dot-pattern exercise.</small></span><Link href="/assessment/consent" className="inline-link" data-testid="link-settings-assessment">Review consent</Link></div></section>
      <section className="panel settings-panel"><div className="section-kicker">PRIVACY & DATA</div><h2>Your data stays yours</h2><p>{data.isSignedIn ? 'Your check-ins are saved to your account. You can delete your saved results below.' : 'Your check-ins are stored only in this browser. Signing in is optional.'}</p><div className="privacy-card"><LockKeyhole size={17} /><span><b>{data.rows.length} saved {data.rows.length === 1 ? 'check-in' : 'check-ins'}</b><small>Camera frames are never stored. Location is never retained.</small></span></div><Button variant="danger" disabled={data.rows.length === 0} onClick={() => setConfirm(true)} testId="button-settings-delete">Delete all check-in data <Trash2 size={15} /></Button></section>
       <section className="panel settings-panel full-setting"><div className="section-kicker">ACCOUNT</div><h2>Use Clarity your way</h2><p>Guest check-ins remain in this browser. Sign in if you want your personal record available with your account.</p><Show when="signed-out"><div className="settings-actions"><Button href="/sign-in" variant="outline" testId="link-settings-signin">Sign in</Button><Button href="/sign-up" testId="link-settings-signup">Create an account <ArrowRight size={15} /></Button></div></Show><Show when="signed-in"><p className="account-connected"><CheckCircle2 size={16} /> Your account is connected.</p></Show></section></div>
     <p className="disclaimer"><Info size={14} /> Clarity is not a validated medical test and cannot screen for, diagnose, or rule out Parkinson’s or another condition. If you have concerns, speak with a healthcare professional.</p>
  </div>{confirm && <ConfirmDialog count={data.rows.length} pending={deletion.isPending} onCancel={() => setConfirm(false)} onConfirm={deleteAll} />}</Shell>;
}

function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const base = import.meta.env.BASE_URL;
  return <div className="auth-page"><div className="auth-brand"><BrandMark /><Link href="/" className="inline-link" data-testid="link-auth-home">Back to Clarity <ArrowRight size={14} /></Link></div><div className="auth-content"><div className="auth-message"><span className="eyebrow"><LockKeyhole size={13} /> YOUR VISUAL WELLNESS, YOUR WAY</span><h1 className="font-display">{mode === 'sign-in' ? 'Welcome back.' : 'Begin with clarity.'}</h1><p>{mode === 'sign-in' ? 'Your personal check-ins, together in one private place.' : 'Create an account to keep your private record with you.'}</p><span className="auth-privacy"><ShieldCheck size={15} /> Private by default. Guest mode is always available.</span></div><div className="auth-widget"><div className="auth-widget-brand"><img src={`${base}clarity-mark.svg`} alt="" /><b>Clarity Visual Health</b></div><ClerkAuthWidget mode={mode} base={base} /></div></div></div>;
}
function ClerkAuthWidget({ mode, base }: { mode: 'sign-in' | 'sign-up'; base: string }) {
  const common = { routing: 'path' as const, path: `${base}${mode}` };
  return mode === 'sign-in' ? <SignIn {...common} signUpUrl={`${base}sign-up`} /> : <SignUp {...common} signInUrl={`${base}sign-in`} />;
}

function AuthShell() {
  return <Switch><Route path="/sign-in/*?" component={() => <AuthPage mode="sign-in" />} /><Route path="/sign-up/*?" component={() => <AuthPage mode="sign-up" />} /></Switch>;
}

function AppRoutes() {
  return <Switch>
    <Route path="/" component={RootPage} />
    <Route path="/dashboard" component={Dashboard} />
    <Route path="/assessment/consent" component={Consent} />
    <Route path="/assessment/color" component={ColorActivity} />
    <Route path="/assessment/eye" component={EyeActivity} />
    <Route path="/assessment/results" component={AssessmentResult} />
    <Route path="/results/:assessmentId" component={AssessmentDetail} />
    <Route path="/results" component={Results} />
    <Route path="/resources" component={Resources} />
    <Route path="/settings" component={Settings} />
    <Route component={() => <EmptyState title="Page not found." text="That page isn’t here. Your check-ins are safe." action={<Button href="/dashboard" testId="button-not-found-home">Back home</Button>} />} />
  </Switch>;
}

function RootPage() {
  const { isSignedIn } = useUser(); const [, navigate] = useLocation();
  useEffect(() => { if (isSignedIn) navigate('/dashboard'); }, [isSignedIn, navigate]);
  return <Landing />;
}

function App() {
  return <QueryClientProvider client={queryClient}><WouterRouter base={basePath}><ClerkProviderWithRouter><RoutedApp /></ClerkProviderWithRouter></WouterRouter></QueryClientProvider>;
}

function RoutedApp() {
  const [location] = useLocation();
  const authRoute = location.includes('/sign-in') || location.includes('/sign-up');
  return <ErrorBoundary resetKey={location}>{authRoute ? <AuthShell /> : <AppRoutes />}</ErrorBoundary>;
}

function ClerkProviderWithRouter({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const stripBase = (path: string) => basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{ signIn: { start: { title: 'Welcome back to Clarity', subtitle: 'Your personal check-ins, together in one private place.' } }, signUp: { start: { title: 'Create your Clarity account', subtitle: 'Keep your private visual wellness record with you.' } } }} routerPush={to => setLocation(stripBase(to))} routerReplace={to => setLocation(stripBase(to), { replace: true })}><PreferenceBootstrap /><ClerkQueryCacheInvalidator>{children}</ClerkQueryCacheInvalidator></ClerkProvider>;
}

function PreferenceBootstrap() {
  useEffect(() => {
    document.documentElement.classList.toggle('large-text', localStorage.getItem('clarity-large-text') === 'true');
    document.documentElement.classList.toggle('reduce-motion', localStorage.getItem('clarity-reduced-motion') === 'true');
  }, []);
  return null;
}

function ClerkQueryCacheInvalidator({ children }: { children: ReactNode }) {
  const { addListener } = useClerk();
  const previousUser = useRef<string | null | undefined>(undefined);
  useEffect(() => addListener(({ user }) => {
    const userId = user?.id ?? null;
    if (previousUser.current !== undefined && previousUser.current !== userId) queryClient.clear();
    previousUser.current = userId;
  }), [addListener]);
  return <>{children}</>;
}

export default App;
