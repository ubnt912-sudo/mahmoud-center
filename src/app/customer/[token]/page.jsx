'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { daysLeft, fmtDate, fmtDateTime, invoiceNo, orderNo, repairNo } from '@/lib/format';
import { CATEGORY, INVOICE_STATUS, ISP_TYPE, MSG_TYPE, ORDER_STATUS, RATING, REPAIR_FLOW, REPAIR_STATUS, SUB_STATUS } from '@/lib/labels';
import PostCard from '@/components/PostCard';
import { useToast } from '@/components/toast';
import { Icon, Logo } from '@/components/icons';
import { Badge, Button, Modal, Money, SearchInput, Select, Spinner, StatusBadge, Textarea, cx } from '@/components/ui';

export default function CustomerPortal() {
  const { token } = useParams();
  const toast = useToast();
  const [c, setC] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('home');
  const [catalog, setCatalog] = useState(null);

  const load = useCallback(() => {
    api(`/api/portal/${token}`)
      .then((d) => setC(d.customer))
      .catch((e) => setError(e.message));
    api(`/api/portal/${token}/catalog`)
      .then((d) => setCatalog(d))
      .catch(() => setCatalog((x) => x || { posts: [], products: [] }));
  }, [token]);
  useEffect(load, [load]);

  // تحديث تلقائي: كل دقيقة وعند الرجوع للصفحة — حتى تظهر تغييرات الإدارة مباشرة
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 60000);
    const onVis = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [load]);

  if (error)
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-navy p-6 text-center text-white">
        <Logo className="size-16" />
        <h1 className="mt-5 text-xl font-black">⚠️ {error}</h1>
        <p className="mt-2 max-w-xs text-sm text-beige/60">تأكد من الرابط الذي وصلك من محمود سنتر، أو تواصل معنا للحصول على رابط جديد.</p>
      </main>
    );
  if (!c)
    return (
      <main className="flex min-h-dvh items-center justify-center bg-navy">
        <Spinner className="size-8 text-brand" />
      </main>
    );

  const activeRepairs = c.repairs.filter((r) => !['DELIVERED', 'CANCELLED'].includes(r.status));
  const sub = c.subscriptions.find((s) => s.status !== 'EXPIRED') || c.subscriptions[0];
  const unpaid = c.invoices.filter((i) => ['UNPAID', 'PARTIAL'].includes(i.status)).reduce((s, i) => s + (i.total - i.paid), 0);

  const tabs = [
    { v: 'home', l: 'العروض', i: 'megaphone', n: catalog?.posts.length || undefined },
    { v: 'store', l: 'المتجر', i: 'store' },
    { v: 'repairs', l: 'الصيانة', i: 'wrench', n: activeRepairs.length },
    { v: 'internet', l: 'الإنترنت', i: 'wifi' },
    { v: 'orders', l: 'المشتريات', i: 'receipt' },
    { v: 'messages', l: 'الرسائل', i: 'message', n: c.messages.filter((m) => m.reply || m.sender === 'STAFF').length || undefined },
  ];

  return (
    <main className="min-h-dvh bg-soft pb-10">
      <header className="relative overflow-hidden bg-navy px-5 pb-20 pt-[max(1.25rem,env(safe-area-inset-top))] text-white">
        <div className="pointer-events-none absolute -top-24 -end-24 size-72 rounded-full bg-brand/30 blur-3xl" />
        <div className="relative mx-auto max-w-xl">
          <div className="flex items-center gap-3">
            <Logo className="size-10" />
            <div>
              <p className="font-black">محمود سنتر</p>
              <p className="text-xs text-beige/60">بوابتك الخاصة</p>
            </div>
          </div>
          <h1 className="mt-6 text-2xl font-black">أهلاً {c.name} 👋</h1>
          <p className="mt-1 text-sm text-beige/70">تابع أجهزتك واشتراكك وفواتيرك من هنا</p>
        </div>
      </header>

      <div className="relative mx-auto -mt-14 max-w-xl space-y-4 px-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            ['بالصيانة', activeRepairs.length, 'wrench'],
            ['الإنترنت', sub ? SUB_STATUS[sub.status].label : '—', 'wifi'],
            ['المتبقي', unpaid > 0 ? Math.round(unpaid).toLocaleString('en-US') : '0', 'wallet'],
          ].map(([l, v, i]) => (
            <div key={l} className="card p-3 text-center">
              <Icon name={i} className="mx-auto size-5 text-brand" />
              <p className="mt-1 text-[11px] font-bold text-navy/45">{l}</p>
              <p className="truncate text-sm font-black">{v}</p>
            </div>
          ))}
        </div>

        <nav className="card grid grid-cols-3 gap-1 p-1">
          {tabs.map((t) => (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              className={cx('relative flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-bold transition', tab === t.v ? 'bg-navy text-white' : 'text-navy/55')}
            >
              <Icon name={t.i} className="size-5" />
              {t.l}
              {t.n ? <span className="absolute top-1 end-2 rounded-full bg-brand px-1.5 text-[10px] text-white">{t.n}</span> : null}
            </button>
          ))}
        </nav>

        {tab === 'home' && <Feed catalog={catalog} onStore={() => setTab('store')} />}
        {tab === 'store' && <Store token={token} catalog={catalog} toast={toast} onSent={load} />}

        {tab === 'repairs' && (
          <section className="space-y-3">
            {c.repairs.length === 0 ? (
              <EmptyState icon="wrench" text="لا توجد أجهزة في الصيانة" />
            ) : (
              c.repairs.map((r) => <RepairCard key={r.id} r={r} />)
            )}
          </section>
        )}

        {tab === 'internet' && (
          <section className="space-y-3">
            {c.subscriptions.length === 0 ? (
              <EmptyState icon="wifi" text="لا يوجد اشتراك إنترنت" />
            ) : (
              c.subscriptions.map((s) => {
                const d = daysLeft(s.endDate);
                const totalDays = Math.max(1, Math.round((new Date(s.endDate) - new Date(s.startDate)) / 86400000));
                const pct = Math.min(100, Math.max(0, (d / totalDays) * 100));
                return (
                  <div key={s.id} className="card overflow-hidden">
                    <div className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <p className="text-lg font-black">{s.planName}</p>
                        <p className="text-sm text-navy/50">
                          {ISP_TYPE[s.type]} • {s.speed}
                        </p>
                      </div>
                      <StatusBadge map={SUB_STATUS} value={s.status} />
                    </div>
                    <div className="px-4 pb-4">
                      <div className="mb-1.5 flex justify-between text-xs font-bold">
                        <span className="text-navy/50">{fmtDate(s.startDate)}</span>
                        <span className={d < 0 ? 'text-red-600' : d <= 5 ? 'text-amber-600' : 'text-emerald-600'}>
                          {d >= 0 ? `متبقي ${d} يوم` : `منتهي منذ ${-d} يوم`}
                        </span>
                        <span className="text-navy/50">{fmtDate(s.endDate)}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-soft">
                        <div className={cx('h-full rounded-full', d <= 5 ? 'bg-amber-400' : 'bg-brand')} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-3 flex justify-between text-sm">
                        <span className="text-navy/55">السعر</span>
                        <Money value={s.price} />
                      </div>
                      {s.price - s.paid > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                          <span>المتبقي</span>
                          <Money value={s.price - s.paid} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        )}

        {tab === 'orders' && (
          <section className="space-y-3">
            {c.invoices.length === 0 && c.orders.length === 0 ? (
              <EmptyState icon="receipt" text="لا توجد مشتريات" />
            ) : (
              c.orders.map((o) => {
                const inv = o.invoice;
                return (
                  <div key={o.id} className="card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-black">{inv ? invoiceNo(inv.number) : orderNo(o.number)}</p>
                        <p className="text-xs text-navy/45">{fmtDateTime(o.createdAt)}</p>
                      </div>
                      {inv ? <StatusBadge map={INVOICE_STATUS} value={inv.status} /> : <StatusBadge map={ORDER_STATUS} value={o.status} />}
                    </div>
                    <ul className="my-3 space-y-1 text-sm">
                      {o.items.map((it) => (
                        <li key={it.id} className="flex justify-between gap-2">
                          <span className="text-navy/70">
                            {it.name} × {it.quantity}
                          </span>
                          <Money value={it.price * it.quantity} />
                        </li>
                      ))}
                    </ul>
                    <div className="space-y-1 border-t border-navy/5 pt-2 text-sm">
                      {o.discount > 0 && (
                        <div className="flex justify-between text-emerald-700">
                          <span>الخصم</span>
                          <Money value={o.discount} />
                        </div>
                      )}
                      <div className="flex justify-between font-black">
                        <span>الإجمالي</span>
                        <Money value={o.totalAmount} />
                      </div>
                      {inv && inv.total - inv.paid > 0 && inv.status !== 'CANCELLED' && (
                        <div className="flex justify-between text-red-600">
                          <span>المتبقي</span>
                          <Money value={inv.total - inv.paid} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        )}

        {tab === 'messages' && <Messages token={token} messages={c.messages} onSent={load} toast={toast} />}

        <Feedback token={token} last={c.feedbacks[0]} toast={toast} />

        <p className="pt-2 text-center text-xs text-navy/40">
          محمود سنتر — هذا الرابط خاص بك، لا تشاركه مع أحد
        </p>
      </div>
    </main>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="card flex flex-col items-center p-8 text-center">
      <span className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-beige-50 text-brand ring-1 ring-beige">
        <Icon name={icon} />
      </span>
      <p className="text-sm font-bold text-navy/55">{text}</p>
    </div>
  );
}

function RepairCard({ r }) {
  const [open, setOpen] = useState(!['DELIVERED', 'CANCELLED'].includes(r.status));
  const idx = REPAIR_FLOW.indexOf(r.status);
  const remaining = Math.max(0, r.cost - r.paid);
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 p-4 text-start">
        <div className="min-w-0">
          <p className="truncate font-black">
            {r.deviceCompany} {r.deviceModel}
          </p>
          <p className="text-xs text-navy/45">
            {repairNo(r.number)} • استلام {fmtDate(r.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge map={REPAIR_STATUS} value={r.status} />
          <Icon name="chevronDown" className={cx('size-4 text-navy/40 transition', open && 'rotate-180')} />
        </div>
      </button>
      {open && (
        <div className="border-t border-navy/5 p-4">
          {r.status !== 'CANCELLED' && (
            <div className="mb-4 flex items-center">
              {REPAIR_FLOW.map((s, i) => (
                <div key={s} className="flex flex-1 items-center last:flex-none">
                  <div
                    title={REPAIR_STATUS[s].label}
                    className={cx(
                      'flex size-7 shrink-0 items-center justify-center rounded-full text-xs',
                      i < idx ? 'bg-navy text-white' : i === idx ? 'bg-brand text-white ring-4 ring-brand-100' : 'bg-soft text-navy/30'
                    )}
                  >
                    {i < idx ? <Icon name="check" className="size-3.5" /> : REPAIR_STATUS[s].icon}
                  </div>
                  {i < REPAIR_FLOW.length - 1 && <div className={cx('mx-1 h-0.5 flex-1', i < idx ? 'bg-navy' : 'bg-soft')} />}
                </div>
              ))}
            </div>
          )}
          {r.status === 'READY' && (
            <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 ring-1 ring-emerald-100">✅ جهازك جاهز للاستلام!</p>
          )}
          <p className="text-sm">
            <span className="font-bold text-navy/50">العطل: </span>
            {r.issue}
          </p>
          {r.expectedDate && !['DELIVERED', 'CANCELLED'].includes(r.status) && (
            <p className="mt-1 text-sm">
              <span className="font-bold text-navy/50">موعد التسليم المتوقع: </span>
              {fmtDate(r.expectedDate)}
            </p>
          )}
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-soft p-3 text-center text-xs">
            <div>
              <p className="text-navy/45">التكلفة</p>
              <Money value={r.cost} />
            </div>
            <div>
              <p className="text-navy/45">المدفوع</p>
              <Money value={r.paid} className="text-emerald-700" />
            </div>
            <div>
              <p className="text-navy/45">المتبقي</p>
              <Money value={remaining} className={remaining > 0 ? 'text-red-600' : ''} />
            </div>
          </div>
          <p className="mb-2 mt-4 text-xs font-black text-navy/50">سجل الجهاز</p>
          <ol className="relative space-y-3 ps-6">
            <span className="absolute inset-y-1 start-[0.45rem] w-px bg-navy/10" />
            {[...r.timeline].reverse().map((t, i) => (
              <li key={t.id} className="relative">
                <span className={cx('absolute -start-[1.3rem] top-1.5 size-3 rounded-full ring-4 ring-white', i === 0 ? 'bg-brand' : 'bg-navy/25')} />
                <p className="text-sm font-bold">
                  {REPAIR_STATUS[t.status].icon} {REPAIR_STATUS[t.status].label}
                </p>
                {t.note && <p className="text-sm text-navy/60">{t.note}</p>}
                <p className="text-[11px] text-navy/40">{fmtDateTime(t.createdAt)}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function Messages({ token, messages, onSent, toast }) {
  const [f, setF] = useState({ type: 'GENERAL', content: '' });
  const [busy, setBusy] = useState(false);
  async function send(e) {
    e.preventDefault();
    if (!f.content.trim()) return;
    setBusy(true);
    try {
      await api(`/api/portal/${token}/messages`, { method: 'POST', body: f });
      toast.success('تم إرسال رسالتك، سنرد عليك قريباً');
      setF({ type: 'GENERAL', content: '' });
      onSent();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3">
      <form onSubmit={send} className="card space-y-3 p-4">
        <p className="font-black">راسلنا</p>
        <Select
          value={f.type}
          onChange={(e) => setF({ ...f, type: e.target.value })}
          options={Object.entries(MSG_TYPE).map(([value, label]) => ({ value, label }))}
        />
        <Textarea placeholder="اكتب رسالتك هنا..." rows={3} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} required maxLength={1000} />
        <Button type="submit" icon="send" loading={busy} className="w-full">
          إرسال
        </Button>
      </form>
      {messages.map((m) => (
        <div key={m.id} className="card p-4">
          <div className="mb-1 flex items-center gap-2">
            <Badge tone={m.sender === 'STAFF' ? 'orange' : 'slate'}>{m.sender === 'STAFF' ? 'من محمود سنتر' : 'رسالتك'}</Badge>
            <span className="text-xs text-navy/40">{MSG_TYPE[m.type]}</span>
            <span className="ms-auto text-[11px] text-navy/40">{fmtDateTime(m.createdAt)}</span>
          </div>
          <p className="whitespace-pre-line text-sm leading-7">{m.content}</p>
          {m.reply ? (
            <div className="mt-2 rounded-xl bg-brand-50 px-3 py-2 ring-1 ring-brand-100">
              <p className="text-xs font-black text-brand-700">رد محمود سنتر</p>
              <p className="whitespace-pre-line text-sm leading-7">{m.reply}</p>
            </div>
          ) : (
            m.sender === 'CUSTOMER' && <p className="mt-1 text-xs text-navy/40">⏳ بانتظار الرد</p>
          )}
        </div>
      ))}
    </section>
  );
}

function Feedback({ token, last, toast }) {
  const [rating, setRating] = useState(last?.rating || '');
  const [comment, setComment] = useState(last?.comment || '');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(Boolean(last));

  async function submit(r = rating) {
    if (!r) return;
    setBusy(true);
    try {
      await api(`/api/portal/${token}/feedback`, { method: 'POST', body: { rating: r, comment: comment || null } });
      setSent(true);
      toast.success('شكراً لتقييمك 🌟');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5 text-center">
      <p className="font-black">قيّم خدمتنا</p>
      <p className="text-xs text-navy/45">رأيك يساعدنا نخدمك أفضل</p>
      <div className="my-4 flex justify-center gap-3">
        {Object.entries(RATING).map(([k, v]) => (
          <button
            key={k}
            onClick={() => {
              setRating(k);
              setSent(false);
            }}
            className={cx(
              'flex w-20 flex-col items-center gap-1 rounded-2xl py-3 transition',
              rating === k ? 'scale-105 bg-brand-50 ring-2 ring-brand' : 'bg-soft opacity-80 hover:opacity-100'
            )}
            aria-label={v.label}
          >
            <span className="text-4xl">{v.emoji}</span>
            <span className="text-xs font-bold">{v.label}</span>
          </button>
        ))}
      </div>
      {rating && !sent && (
        <div className="space-y-3 text-start">
          <Textarea placeholder="تعليق (اختياري)" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} />
          <Button className="w-full" loading={busy} onClick={() => submit()}>
            إرسال التقييم
          </Button>
        </div>
      )}
      {sent && rating && <p className="text-sm font-bold text-emerald-600">✓ شكراً، تم تسجيل تقييمك</p>}
    </section>
  );
}

function Feed({ catalog, onStore }) {
  if (!catalog) return <div className="flex justify-center py-10"><Spinner className="size-6 text-brand" /></div>;
  const offers = catalog.products.filter((p) => p.isOffer && p.available).slice(0, 8);
  return (
    <section className="space-y-4">
      {offers.length > 0 && (
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-black">🔥 عروض المتجر</p>
            <button onClick={onStore} className="text-xs font-bold text-brand">كل المنتجات</button>
          </div>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
            {offers.map((p) => (
              <button key={p.id} onClick={onStore} className="w-36 shrink-0 text-start">
                <div className="mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-soft">
                  {p.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt={p.name} loading="lazy" className="size-full object-cover" />
                  ) : (
                    <Icon name="box" className="size-8 text-navy/20" />
                  )}
                </div>
                <p className="line-clamp-2 text-xs font-extrabold leading-5">{p.name}</p>
                <Money value={p.sellPrice} className="text-xs text-brand-700" />
              </button>
            ))}
          </div>
        </div>
      )}
      {catalog.posts.length === 0 && offers.length === 0 ? (
        <EmptyState icon="megaphone" text="لا توجد عروض حالياً — تابعنا قريباً" />
      ) : (
        catalog.posts.map((p) => <PostCard key={p.id} post={p} />)
      )}
    </section>
  );
}

function Store({ token, catalog, toast, onSent }) {
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [view, setView] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!catalog) return <div className="flex justify-center py-10"><Spinner className="size-6 text-brand" /></div>;

  const cats = Object.keys(CATEGORY).filter((k) => catalog.products.some((p) => p.category === k));
  const ql = q.trim().toLowerCase();
  const list = catalog.products.filter(
    (p) => (!cat || p.category === cat) && (!ql || [p.name, p.brand, p.model].filter(Boolean).join(' ').toLowerCase().includes(ql))
  );

  async function inquire(p) {
    setBusy(true);
    try {
      await api(`/api/portal/${token}/messages`, {
        method: 'POST',
        body: { type: p.available ? 'ORDER' : 'STOCK', referenceId: p.id, content: `${p.available ? 'أرغب بطلب' : 'أستفسر عن توفر'}: ${p.name} — السعر ${Math.round(p.sellPrice).toLocaleString('en-US')} د.ع` },
      });
      toast.success('تم إرسال طلبك للمحل، راح نتواصل وياك قريباً');
      setView(null);
      onSent();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <SearchInput value={q} onChange={setQ} placeholder="ابحث عن جهاز أو إكسسوار..." />
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {[['', 'الكل'], ...cats.map((k) => [k, CATEGORY[k]])].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setCat(k)}
            className={cx('shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold ring-1', cat === k ? 'bg-navy text-white ring-navy' : 'bg-white text-navy/60 ring-navy/10')}
          >
            {l}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState icon="store" text="لا توجد منتجات في هذا القسم" />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {list.map((p) => (
            <button key={p.id} onClick={() => setView(p)} className={cx('card relative flex flex-col p-3 text-start', !p.available && 'opacity-60')}>
              {p.isOffer && <Badge tone="orange" className="absolute top-2 start-2 z-[1]">عرض</Badge>}
              <div className="mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-soft">
                {p.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.images[0]} alt={p.name} loading="lazy" className="size-full object-cover" />
                ) : (
                  <Icon name="box" className="size-8 text-navy/20" />
                )}
              </div>
              <p className="line-clamp-2 min-h-[2.5rem] text-sm font-extrabold leading-5">{p.name}</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                <Money value={p.sellPrice} className="text-sm text-brand-700" />
                {p.oldPrice > p.sellPrice && <span className="text-[11px] text-navy/40 line-through">{Math.round(p.oldPrice).toLocaleString('en-US')}</span>}
              </div>
              <span className={cx('mt-1 text-[11px] font-bold', p.available ? 'text-emerald-600' : 'text-red-500')}>{p.available ? 'متوفر' : 'غير متوفر حالياً'}</span>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(view)}
        onClose={() => setView(null)}
        title={view?.name}
        subtitle={view ? [CATEGORY[view.category], view.brand, view.model].filter(Boolean).join(' • ') : ''}
        footer={
          <Button className="w-full" icon="send" loading={busy} onClick={() => inquire(view)}>
            {view?.available ? 'اطلب هذا المنتج' : 'أعلمني عند التوفر'}
          </Button>
        }
      >
        {view && (
          <div className="space-y-3">
            {view.images?.length > 0 && (
              <div className="no-scrollbar -mx-5 flex snap-x gap-2 overflow-x-auto px-5">
                {view.images.map((u) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={u} src={u} alt="" className="aspect-square w-[85%] shrink-0 snap-center rounded-2xl bg-soft object-cover" />
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-baseline gap-2">
              <Money value={view.sellPrice} className="text-2xl text-brand-700" />
              {view.oldPrice > view.sellPrice && <span className="text-sm text-navy/40 line-through">{Math.round(view.oldPrice).toLocaleString('en-US')} د.ع</span>}
              {view.isOffer && <Badge tone="orange">عرض</Badge>}
            </div>
            <p className={cx('text-sm font-bold', view.available ? 'text-emerald-600' : 'text-red-500')}>{view.available ? '✓ متوفر في المحل' : 'غير متوفر حالياً'}</p>
            {view.description && <p className="whitespace-pre-line text-sm leading-7 text-navy/70">{view.description}</p>}
          </div>
        )}
      </Modal>
    </section>
  );
}
