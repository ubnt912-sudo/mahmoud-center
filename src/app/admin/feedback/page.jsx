'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { qs } from '@/lib/client';
import { fmtDateTime } from '@/lib/format';
import { RATING } from '@/lib/labels';
import { Card, Empty, ErrorBox, Loading, PageHeader, Pager, cx } from '@/components/ui';

export default function FeedbackPage() {
  const [rating, setRating] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi(`/api/feedback${qs({ rating, page, take: 30 })}`);
  useEffect(() => setPage(1), [rating]);
  const c = data?.counts || { EXCELLENT: 0, NEUTRAL: 0, POOR: 0 };
  const total = c.EXCELLENT + c.NEUTRAL + c.POOR;

  return (
    <div>
      <PageHeader title="التقييمات" subtitle="رضا الزبائن من بوابة الزبون" icon="smile" />
      <ErrorBox error={error} onRetry={reload} />
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Card className="flex flex-col items-center justify-center bg-navy p-5 text-center text-white">
          <p className="text-xs font-bold text-beige/60">نسبة الرضا</p>
          <p className="text-4xl font-black text-brand">{data?.satisfaction ?? 0}%</p>
          <p className="text-xs text-beige/50">{total} تقييم</p>
        </Card>
        {Object.entries(RATING).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setRating(rating === k ? '' : k)}
            className={cx('card flex items-center gap-4 p-5 text-start transition', rating === k ? 'ring-2 ring-brand' : 'hover:-translate-y-0.5')}
          >
            <span className="text-4xl">{v.emoji}</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-navy/55">{v.label}</p>
              <p className="text-2xl font-black">{c[k]}</p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-soft">
                <div className={cx('h-full rounded-full', k === 'EXCELLENT' ? 'bg-emerald-500' : k === 'NEUTRAL' ? 'bg-amber-400' : 'bg-red-500')} style={{ width: `${total ? (c[k] / total) * 100 : 0}%` }} />
              </div>
            </div>
          </button>
        ))}
      </div>
      <Card className="overflow-hidden">
        {loading && !data ? (
          <Loading />
        ) : !data?.feedbacks.length ? (
          <Empty icon="smile" title="لا توجد تقييمات بعد" text="يقيّم الزبائن الخدمة من بوابتهم الخاصة" />
        ) : (
          <>
            <ul className="divide-y divide-navy/5">
              {data.feedbacks.map((f) => (
                <li key={f.id} className="flex items-center gap-4 px-5 py-4">
                  <span className="text-3xl">{RATING[f.rating].emoji}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/customers/${f.customer.id}`} className="font-extrabold hover:text-brand">
                      {f.customer.name}
                    </Link>
                    {f.comment ? <p className="text-sm text-navy/60">{f.comment}</p> : <p className="text-sm text-navy/35">بدون تعليق</p>}
                  </div>
                  <span className="text-xs text-navy/40">{fmtDateTime(f.createdAt)}</span>
                </li>
              ))}
            </ul>
            <Pager page={page} take={30} total={data.total} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
