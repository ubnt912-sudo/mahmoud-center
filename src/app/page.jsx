import Link from 'next/link';
import { Logo, Icon } from '@/components/icons';

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-navy text-white">
      <div className="pointer-events-none absolute -top-32 -end-32 size-[28rem] rounded-full bg-brand/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -start-40 size-[26rem] rounded-full bg-beige/10 blur-3xl" />

      <header className="relative mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-3">
          <Logo className="size-11" />
          <div>
            <p className="text-lg font-black leading-tight">محمود سنتر</p>
            <p className="text-xs text-beige/60">موبايلات • صيانة • إنترنت</p>
          </div>
        </div>
        <Link href="/login" className="btn btn-primary">
          دخول الموظفين
        </Link>
      </header>

      <section className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 pb-16 pt-8">
        <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-beige ring-1 ring-white/10">
          <span className="size-1.5 rounded-full bg-brand" /> النظام المتكامل لإدارة المحل
        </span>
        <h1 className="max-w-2xl text-4xl font-black leading-[1.25] sm:text-5xl">
          كل خدمات <span className="text-brand">محمود سنتر</span> في مكان واحد
        </h1>
        <p className="mt-4 max-w-xl text-base leading-8 text-beige/75">
          متابعة الصيانة لحظة بلحظة، المبيعات والفواتير، المخزون، واشتراكات الإنترنت — مع بوابة خاصة لكل زبون.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            ['wrench', 'صيانة احترافية', 'تتبع حالة جهازك عبر رابطك الخاص'],
            ['cart', 'هواتف وإكسسوارات', 'أجهزة جديدة ومستعملة بأفضل الأسعار'],
            ['wifi', 'إنترنت FTTH ولاسلكي', 'باقات بسرعات تناسب احتياجك'],
          ].map(([icon, t, d]) => (
            <div key={t} className="rounded-3xl bg-white/[.06] p-5 ring-1 ring-white/10 backdrop-blur">
              <span className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-brand text-white">
                <Icon name={icon} />
              </span>
              <p className="font-extrabold">{t}</p>
              <p className="mt-1 text-sm text-beige/60">{d}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-3xl bg-beige p-5 text-navy">
          <p className="flex items-center gap-2 font-extrabold">
            <Icon name="link" className="size-5 text-brand" /> هل أنت زبون؟
          </p>
          <p className="mt-1 text-sm text-navy/70">
            افتح الرابط الخاص الذي وصلك من المحل عبر واتساب لمتابعة أجهزتك واشتراكك وفواتيرك.
          </p>
        </div>
      </section>
    </main>
  );
}
