import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  ArrowDownLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  CircleHelp,
  Clock3,
  CreditCard,
  Leaf,
  Plus,
  ReceiptText,
  ShoppingBasket,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import {
  loadWalletTopups,
  saveWalletTopup,
  type SavedWalletTopup,
} from '@/lib/supabase';

const queryClient = new QueryClient();

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  amount: number;
  type: 'split' | 'grocery' | 'topup';
};

type ConnectionStatus = 'connecting' | 'ready' | 'error';

const startingDemoBalance = 284.75;

function displayError(error: unknown) {
  const details =
    error && typeof error === 'object'
      ? (error as { message?: string; code?: string; status?: number })
      : undefined;
  const message =
    details?.message ?? (error instanceof Error ? error.message : String(error));
  const normalized = message.toLowerCase();
  if (message === 'SUPABASE_URL_FORMAT') {
    return 'تعذّر قراءة رابط المشروع كعنوان HTTP/HTTPS. انسخ قيمة Project URL وحدها دون اسم المتغير أو أي نص إضافي.';
  }
  if (message === 'SUPABASE_URL_DASHBOARD') {
    return 'الرابط يشير إلى لوحة تحكم Supabase، وليس المشروع. استخدم قيمة Project URL من إعدادات Data API.';
  }
  if (message === 'SUPABASE_URL_NOT_PROJECT_ROOT') {
    return 'استخدم رابط المشروع الأساسي وحده، دون مسار REST أو صفحة أو معاملات إضافية.';
  }
  if (message.includes('VITE_SUPABASE_URL') || message.includes('VITE_SUPABASE_ANON_KEY')) {
    return 'أضف رابط Supabase والمفتاح العام إلى Replit Secrets، ثم أعد تشغيل الصفحة.';
  }
  if (
    normalized.includes('anonymous sign-ins are disabled') ||
    normalized.includes('anonymous_provider_disabled')
  ) {
    return 'فعّل تسجيل الدخول المجهول في إعدادات Authentication داخل Supabase.';
  }
  if (
    normalized.includes('invalid supabaseurl') ||
    normalized.includes('must be a valid http or https url')
  ) {
    return 'رابط Supabase غير صحيح. استخدم رابط المشروع كاملًا بصيغة https://…supabase.co.';
  }
  if (
    message.includes('PGRST205') ||
    message.includes('wallet_topups') ||
    message.includes('42P01')
  ) {
    return 'جدول الشحنات غير جاهز. نفّذ ملف supabase/setup.sql في SQL Editor داخل Supabase.';
  }
  if (
    details?.status === 401 ||
    details?.status === 403 ||
    normalized.includes('invalid api key') ||
    normalized.includes('invalid jwt')
  ) {
    return 'تحقق من رابط Supabase والمفتاح العام anon في Replit Secrets.';
  }
  if (normalized.includes('failed to fetch') || normalized.includes('network')) {
    return 'تعذّر الوصول إلى مشروع Supabase. تحقق من الرابط واتصال الإنترنت.';
  }
  return 'تعذّر الاتصال بـ Supabase. تحقق من الإعدادات وسياسات RLS ثم أعد المحاولة.';
}

function formatSavedDate(value: string) {
  return new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function toActivity(item: SavedWalletTopup): ActivityItem {
  return {
    id: `saved-topup-${item.id}`,
    title: 'إضافة رصيد',
    detail: `شحن تجريبي محفوظ · ${formatSavedDate(item.createdAt)}`,
    amount: item.amount,
    type: 'topup',
  };
}

function Home() {
  const [balance, setBalance] = useState(startingDemoBalance);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('50');
  const [splitDone, setSplitDone] = useState(false);
  const [notice, setNotice] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [connectionError, setConnectionError] = useState('');
  const [savingTopup, setSavingTopup] = useState(false);
  const [history, setHistory] = useState<ActivityItem[]>([
    { id: 'h1', title: 'حصة مشتريات الأسبوع', detail: 'تقسيم · ١٢ يونيو، ٦:٤٢ م', amount: -46.6, type: 'split' },
    { id: 'h2', title: 'مشتريات البيت', detail: 'بقالة · ١٢ يونيو، ٦:٣٨ م', amount: -186.4, type: 'grocery' },
    { id: 'h3', title: 'إضافة رصيد', detail: 'شحن تجريبي · ١٠ يونيو، ١١:١٥ ص', amount: 120, type: 'topup' },
    { id: 'h4', title: 'مشتريات سريعة', detail: 'بقالة · ٨ يونيو، ٧:٢٠ م', amount: -32.85, type: 'grocery' },
  ]);

  useEffect(() => {
    let isCurrent = true;
    loadWalletTopups()
      .then((topups) => {
        if (!isCurrent) return;
        setBalance(
          Number(
            (
              startingDemoBalance +
              topups.reduce((total, item) => total + item.amount, 0)
            ).toFixed(2),
          ),
        );
        setHistory((current) => [
          ...topups.map(toActivity),
          ...current.filter((item) => !item.id.startsWith('saved-topup-')),
        ]);
        setConnectionStatus('ready');
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        setConnectionError(displayError(error));
        setConnectionStatus('error');
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  const addBalance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(topUpAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000) {
      setNotice('أدخل مبلغًا بين ١ و١٬٠٠٠ ر.س.');
      return;
    }
    if (connectionStatus !== 'ready' || savingTopup) return;
    setSavingTopup(true);
    try {
      const savedTopup = await saveWalletTopup(amount);
      setBalance((current) => Number((current + amount).toFixed(2)));
      setHistory((current) => [toActivity(savedTopup), ...current]);
      setTopUpOpen(false);
      setNotice(`تم حفظ شحن ${amount.toFixed(2)} ر.س وتحديث رصيدك التجريبي`);
      window.setTimeout(() => setNotice(''), 3600);
    } catch (error) {
      setNotice(displayError(error));
    } finally {
      setSavingTopup(false);
    }
  };

  const splitOrder = () => {
    if (splitDone) return;
    setBalance((current) => Number((current - 46.6).toFixed(2)));
    setHistory((current) => [
      { id: `split-${Date.now()}`, title: 'حصتك من مشتريات البيت', detail: 'تقسيم · الآن', amount: -46.6, type: 'split' },
      ...current,
    ]);
    setSplitDone(true);
    setNotice('تم تسجيل حصتك في النشاط التجريبي');
    window.setTimeout(() => setNotice(''), 3600);
  };

  const formatAmount = (amount: number) => `${Math.abs(amount).toFixed(2)} ر.س`;

  return (
    <main className="naqwah-shell" dir="rtl">
      <div className="ambient-orb ambient-orb-one" aria-hidden="true" />
      <div className="ambient-orb ambient-orb-two" aria-hidden="true" />
      <header className="topbar">
        <div className="brand-lockup" data-testid="brand-naqwah">
          <span className="brand-mark"><Leaf size={22} strokeWidth={2.2} /></span>
          <span className="brand-name">نقوة <span>Pay</span></span>
        </div>
        <div className="demo-pill" data-testid="status-demo">
          <span className="demo-dot" /> نسخة تجريبية · أموال افتراضية
        </div>
        <button className="help-button" type="button" aria-label="مساعدة" data-testid="button-help" onClick={() => setNotice('هذه تجربة محلية — لا يتم تحصيل أي أموال حقيقية.')}>
          <CircleHelp size={19} /><span>كيف تعمل؟</span>
        </button>
      </header>

      <section className="welcome-row">
        <div>
          <p className="eyebrow">الخميس، ١٣ يونيو ٢٠٢٤ <span className="eyebrow-rule" /></p>
          <h1>أهلًا، ليان <span className="hello-spark"><Sparkles size={20} /></span></h1>
          <p className="welcome-copy">كل شيء واضح بينكم. خلّينا نكمل يومنا.</p>
        </div>
        <div className="household-tag"><span className="household-symbol">ب</span><span>بيت النخيل</span><ChevronLeft size={15} /></div>
      </section>
      {connectionStatus === 'error' && (
        <div className="connection-banner" role="alert" data-testid="status-supabase-error">
          <CircleHelp size={17} />
          <span>{connectionError} إذا لم يكتمل الإعداد بعد، راجع خطوات Supabase.</span>
        </div>
      )}

      <div className="dashboard-grid">
        <section className="wallet-card" data-testid="card-wallet">
          <div className="wallet-card-top">
            <div className="wallet-label"><span className="wallet-icon"><Wallet size={18} /></span><span>رصيدي التجريبي</span></div>
            <span className={`wallet-state wallet-state-${connectionStatus}`} data-testid="status-supabase-connection">
              <span />
              {connectionStatus === 'connecting' ? 'جاري الاتصال' : connectionStatus === 'ready' ? 'محفوظ في Supabase' : 'يتطلب إعدادًا'}
            </span>
          </div>
          <div className="balance-line" data-testid="text-wallet-balance">
            <span className="balance-number">{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="balance-currency">ر.س</span>
          </div>
          <p className="balance-note">رصيد العرض فقط — لا قيمة مالية حقيقية</p>
          <div className="wallet-bottom">
            <div className="wallet-meta"><span className="balance-mini-icon"><CreditCard size={15} /></span><span>محفظة البيت</span><span className="meta-separator">·</span><span>•• ٤٢٨١</span></div>
            <button className="add-balance-button" onClick={() => { setTopUpOpen(true); setNotice(''); }} type="button" disabled={connectionStatus !== 'ready'} data-testid="button-add-balance">
              <Plus size={17} strokeWidth={2.4} /> أضف رصيدًا
            </button>
          </div>
          <div className="card-decoration" aria-hidden="true"><span /><span /><span /></div>
        </section>

        <section className="spending-card" data-testid="card-spending-summary">
          <div className="section-heading compact-heading">
            <div><p className="eyebrow">لمحة البيت</p><h2>مصروفات هذا الأسبوع</h2></div>
            <span className="period-tag">١٠ – ١٦ يونيو</span>
          </div>
          <div className="weekly-total"><span>٢١٩٫٢٥</span><small>ر.س</small></div>
          <div className="spend-progress" aria-label="الإنفاق الأسبوعي">
            <span className="progress-grocery" /><span className="progress-home" /><span className="progress-other" />
          </div>
          <div className="spend-legend">
            <span><i className="legend-dot grocery-dot" /> بقالة <b>٧٢٪</b></span>
            <span><i className="legend-dot home-dot" /> للبيت <b>١٨٪</b></span>
            <span><i className="legend-dot other-dot" /> أخرى <b>١٠٪</b></span>
          </div>
          <p className="spend-footnote"><span className="tiny-trend">↗</span> أقل بـ ١٢٪ من الأسبوع الماضي</p>
        </section>
      </div>

      <div className="content-grid">
        <section className="order-section" data-testid="section-shared-order">
          <div className="section-heading order-heading">
            <div><p className="eyebrow">على الطاولة</p><h2>مشتريات البيت <span className="live-tag"><span /> جديدة</span></h2></div>
            <button className="text-link" type="button" onClick={() => setNotice('كل شيء واضح هنا — تفاصيل المشتريات أدناه.')} data-testid="button-order-details">تفاصيل الطلب <ChevronLeft size={15} /></button>
          </div>
          <article className="order-card">
            <div className="order-card-top">
              <div className="store-stamp"><ShoppingBasket size={21} /></div>
              <div className="store-info"><h3>تموينات السلة الخضراء</h3><p><Clock3 size={13} /> اليوم، ٦:٣٨ م <span>·</span> إيصال رقم ٨٢٤</p></div>
              <div className="order-total"><strong>١٨٦٫٤٠</strong><small>ر.س</small></div>
            </div>
            <div className="order-divider"><span>٥ أصناف</span><span className="divider-line" /><span>للبيت كله</span></div>
            <div className="item-list">
              <div className="grocery-item"><span className="item-swatch swatch-tomato" /><span>خضار وفواكه موسمية</span><small>٤٨٫٥٠</small></div>
              <div className="grocery-item"><span className="item-swatch swatch-grain" /><span>أرز بسمتي وحبوب</span><small>٣٦٫٩٠</small></div>
              <div className="grocery-item"><span className="item-swatch swatch-dairy" /><span>ألبان وأجبان</span><small>٥٢٫٠٠</small></div>
              <div className="grocery-item"><span className="item-swatch swatch-pantry" /><span>أساسيات المطبخ</span><small>٤٩٫٠٠</small></div>
            </div>
            <div className="order-card-footer">
              <div className="housemates">
                <div className="avatar avatar-layan">ل</div><div className="avatar avatar-omar">ع</div><div className="avatar avatar-sara">س</div><div className="avatar avatar-you">+1</div>
                <span>٤ أشخاص</span>
              </div>
              <span className="each-label">حصتك <b>٤٦٫٦٠ ر.س</b></span>
            </div>
            {splitDone ? (
              <div className="split-complete" data-testid="status-split-complete"><CheckCircle2 size={18} /> تم تقسيم الطلب — حصتك ٤٦٫٦٠ ر.س</div>
            ) : (
              <button className="split-button" onClick={splitOrder} type="button" data-testid="button-split-order">
                <span><ReceiptText size={17} /> قسّموا الطلب</span><span className="split-button-price">٤٦٫٦٠ ر.س لكل شخص <ChevronLeft size={16} /></span>
              </button>
            )}
            {splitDone && <div className="split-breakdown" data-testid="text-split-breakdown">
              <div className="breakdown-title"><Check size={14} /> تقسيم متساوٍ على ٤ أشخاص</div>
              <div className="breakdown-people"><span>ليان (أنت)</span><b>٤٦٫٦٠ ر.س</b></div>
              <div className="breakdown-people"><span>عمر · سارة · نور</span><b>٤٦٫٦٠ ر.س لكل شخص</b></div>
            </div>}
          </article>
        </section>

        <section className="activity-section" data-testid="section-activity">
          <div className="section-heading activity-heading">
            <div><p className="eyebrow">كل ريال له حكاية</p><h2>آخر النشاطات</h2></div>
            <button className="filter-button" type="button" onClick={() => setNotice('تعرض القائمة أحدث العمليات أولًا.')} data-testid="button-activity-filter">الأحدث <ChevronLeft size={14} /></button>
          </div>
          <div className="activity-card">
            <div className="activity-date"><span /> هذا الأسبوع</div>
            {history.map((item) => {
              const isIncome = item.type === 'topup';
              return <div className="activity-row" key={item.id} data-testid={`row-activity-${item.id}`}>
                <span className={`activity-icon activity-${item.type}`}>{isIncome ? <ArrowDownLeft size={18} /> : item.type === 'split' ? <ReceiptText size={17} /> : <ShoppingBasket size={18} />}</span>
                <div className="activity-copy"><strong>{item.title}</strong><small>{item.detail}</small></div>
                <div className={`activity-amount ${isIncome ? 'income-amount' : ''}`} data-testid={`text-amount-${item.id}`}>
                  <strong>{isIncome ? '+' : '−'}{formatAmount(item.amount)}</strong>
                  <small>{isIncome ? 'إضافة' : item.type === 'split' ? 'حصتك' : 'بقالة'}</small>
                </div>
              </div>;
            })}
            {history.length === 0 && <div className="empty-history"><ReceiptText size={24} /><p>ستظهر هنا عملياتك القادمة</p></div>}
            <div className="activity-footer"><span>الشحنات التجريبية محفوظة</span><span className="privacy-mark"><CheckCircle2 size={13} /> خاص بك</span></div>
          </div>
          <div className="friendly-note"><span className="note-mark">ن</span><p><strong>بدون حسابات محرجة.</strong> كل واحد يعرف حصته، وبس.</p></div>
        </section>
      </div>
      <footer className="page-footer"><span>نقوة Pay <i>·</i> مصروفات أوضح، وبيت أهدأ.</span><span className="footer-demo">عرض تجريبي فقط</span></footer>

      {topUpOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setTopUpOpen(false); }}>
        <section className="topup-modal" role="dialog" aria-modal="true" aria-labelledby="topup-title" data-testid="dialog-add-balance">
          <button className="modal-close" type="button" aria-label="إغلاق" onClick={() => setTopUpOpen(false)} data-testid="button-close-topup"><X size={19} /></button>
          <div className="modal-icon"><Wallet size={22} /></div>
          <p className="eyebrow">رصيد تجريبي فقط</p><h2 id="topup-title">أضف رصيدًا لمحفظتك</h2>
          <p className="modal-copy">جرّب إضافة مبلغ وشاهد كيف يتحدّث رصيدك وسجلّك. لا توجد أي مدفوعات حقيقية.</p>
          <form onSubmit={addBalance}>
            <label className="amount-label" htmlFor="topup-amount">المبلغ <span>ريال سعودي</span></label>
            <div className="amount-input-wrap"><input id="topup-amount" type="number" min="1" max="1000" step="0.01" value={topUpAmount} onChange={(event) => setTopUpAmount(event.target.value)} autoFocus data-testid="input-topup-amount" /><span>ر.س</span></div>
            <div className="quick-amounts">{['25', '50', '100'].map((amount) => <button className={topUpAmount === amount ? 'quick-amount selected' : 'quick-amount'} type="button" key={amount} onClick={() => setTopUpAmount(amount)} data-testid={`button-quick-amount-${amount}`}>{amount} ر.س</button>)}</div>
             <button className="confirm-topup" type="submit" disabled={savingTopup || connectionStatus !== 'ready'} data-testid="button-confirm-topup">
               <Plus size={17} /> {savingTopup ? 'جارٍ الحفظ...' : 'أضف إلى الرصيد'}
             </button>
          </form>
          <div className="modal-safety"><CheckCircle2 size={14} /> شحن افتراضي — لا تُحفظ بيانات دفع</div>
        </section>
      </div>}
      {notice && <div className="toast-note" role="status" data-testid="status-notice"><CheckCircle2 size={17} />{notice}<button type="button" aria-label="إخفاء" onClick={() => setNotice('')}><X size={15} /></button></div>}
    </main>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
