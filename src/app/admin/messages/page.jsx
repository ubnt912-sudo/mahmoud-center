'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAdmin } from '@/components/admin-context';
import { useApi, useDebounced } from '@/hooks/useApi';
import { api, qs } from '@/lib/client';
import { fmtDateTime, waPhone } from '@/lib/format';
import { MSG_TYPE } from '@/lib/labels';
import MessageForm from '@/components/MessageForm';
import { useToast } from '@/components/toast';
import { WhatsAppIcon } from '@/components/icons';
import { Avatar, Badge, Button, Card, Empty, ErrorBox, IconButton, Loading, Modal, PageHeader, Pager, SearchInput, Select, Tabs, Textarea, cx } from '@/components/ui';

export default function MessagesPage() {
  const { can, refreshBadges } = useAdmin();
  const toast = useToast();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [filter, setFilter] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useApi(`/api/messages${qs({ q: dq, filter, type, page, take: 25 })}`);
  const [reply, setReply] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  useEffect(() => setPage(1), [dq, filter, type]);

  async function patch(m, body, msg) {
    setBusy(true);
    try {
      await api(`/api/messages/${m.id}`, { method: 'PATCH', body });
      if (msg) toast.success(msg);
      reload();
      refreshBadges?.();
      return true;
    } catch (e) {
      toast.error(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="الرسائل"
        subtitle={data ? `${data.unread} رسالة غير مقروءة` : ' '}
        icon="message"
        actions={can('messages', 'write') && <Button icon="send" onClick={() => setNewOpen(true)}>رسالة لزبون</Button>}
      />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row">
        <SearchInput value={q} onChange={setQ} placeholder="ابحث في الرسائل أو باسم الزبون..." className="flex-1" />
        <Select
          className="lg:w-44"
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="كل الأنواع"
          options={Object.entries(MSG_TYPE).map(([value, label]) => ({ value, label }))}
        />
        <Tabs
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: '', label: 'الكل' },
            { value: 'unread', label: 'غير مقروءة', count: data?.unread },
            { value: 'unreplied', label: 'بدون رد' },
          ]}
        />
      </div>
      <ErrorBox error={error} onRetry={reload} />
      <Card className="overflow-hidden">
        {loading && !data ? (
          <Loading />
        ) : !data?.messages.length ? (
          <Empty icon="message" title="لا توجد رسائل" />
        ) : (
          <>
            <ul className="divide-y divide-navy/5">
              {data.messages.map((m) => {
                const unread = !m.isRead && m.sender === 'CUSTOMER';
                return (
                  <li key={m.id} className={cx('px-5 py-4', unread && 'bg-brand-50/50')}>
                    <div className="flex items-start gap-3">
                      <Avatar name={m.customer.name} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/admin/customers/${m.customer.id}`} className="font-extrabold hover:text-brand">
                            {m.customer.name}
                          </Link>
                          <Badge tone={m.sender === 'STAFF' ? 'navy' : 'orange'}>{m.sender === 'STAFF' ? 'صادرة' : 'واردة'}</Badge>
                          <Badge>{MSG_TYPE[m.type]}</Badge>
                          {unread && <Badge tone="red" dot>جديدة</Badge>}
                          <span className="ms-auto text-xs text-navy/40">{fmtDateTime(m.createdAt)}</span>
                        </div>
                        <p className="mt-1.5 whitespace-pre-line text-sm leading-7">{m.content}</p>
                        {m.reply && (
                          <div className="mt-2 rounded-xl bg-soft px-3 py-2 text-sm">
                            <p className="text-xs font-bold text-navy/45">
                              الرد{m.repliedBy ? ` — ${m.repliedBy.name}` : ''} • {fmtDateTime(m.repliedAt)}
                            </p>
                            <p className="whitespace-pre-line leading-7">{m.reply}</p>
                          </div>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {m.sender === 'CUSTOMER' && can('messages', 'write') && (
                            <Button variant="soft" className="px-3 py-1.5 text-xs" icon="send" onClick={() => { setReply(m); setText(m.reply || ''); }}>
                              {m.reply ? 'تعديل الرد' : 'رد'}
                            </Button>
                          )}
                          {m.sender === 'CUSTOMER' && (
                            <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => patch(m, { isRead: !m.isRead })}>
                              {m.isRead ? 'تعليم كغير مقروءة' : 'تعليم كمقروءة'}
                            </Button>
                          )}
                          <a
                            href={`https://wa.me/${waPhone(m.customer.phone)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-ghost px-3 py-1.5 text-xs text-[#128C7E]"
                          >
                            <WhatsAppIcon className="size-4" /> واتساب
                          </a>
                          {can('messages', 'delete') && (
                            <IconButton
                              icon="trash"
                              tone="danger"
                              label="حذف"
                              onClick={async () => {
                                try {
                                  await api(`/api/messages/${m.id}`, { method: 'DELETE' });
                                  toast.success('تم حذف الرسالة');
                                  reload();
                                  refreshBadges?.();
                                } catch (e) {
                                  toast.error(e.message);
                                }
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pager page={page} take={25} total={data.total} onPage={setPage} />
          </>
        )}
      </Card>

      <Modal
        open={Boolean(reply)}
        onClose={() => setReply(null)}
        title="الرد على الرسالة"
        subtitle={reply?.customer?.name}
        footer={
          <>
            <Button variant="soft" onClick={() => setReply(null)}>
              إلغاء
            </Button>
            <Button
              icon="send"
              loading={busy}
              onClick={async () => {
                if (!text.trim()) return toast.error('اكتب الرد');
                if (await patch(reply, { reply: text }, 'تم إرسال الرد — سيظهر في بوابة الزبون')) setReply(null);
              }}
            >
              إرسال الرد
            </Button>
          </>
        }
      >
        <p className="mb-3 rounded-xl bg-soft p-3 text-sm leading-7">{reply?.content}</p>
        <Textarea label="الرد" rows={4} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      </Modal>
      <MessageForm open={newOpen} onClose={() => setNewOpen(false)} onSaved={reload} />
    </div>
  );
}
