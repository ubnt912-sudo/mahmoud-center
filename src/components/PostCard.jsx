'use client';

import { useState } from 'react';
import { parseVideo } from '@/lib/video';
import { CATEGORY } from '@/lib/labels';
import { fmtDate } from '@/lib/format';
import { Icon } from './icons';
import { Badge, cx } from './ui';

export function PostMedia({ post, className }) {
  const [play, setPlay] = useState(false);
  if (post.mediaType === 'IMAGE' && post.mediaUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={post.mediaUrl} alt={post.title} loading="lazy" className={cx('w-full bg-soft object-cover', className)} />
    );
  }
  if (post.mediaType === 'VIDEO' && post.mediaUrl) {
    const v = parseVideo(post.mediaUrl);
    if (v?.kind === 'youtube') {
      return play ? (
        <iframe
          src={`${v.src}&autoplay=1`}
          title={post.title}
          className={cx('aspect-video w-full bg-black', className)}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" onClick={() => setPlay(true)} className={cx('relative block aspect-video w-full overflow-hidden bg-black', className)} aria-label="تشغيل الفيديو">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={v.thumb} alt="" className="size-full object-cover opacity-90" loading="lazy" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-brand text-white shadow-pop">
              <Icon name="play" className="ms-1 size-7" />
            </span>
          </span>
        </button>
      );
    }
    if (v?.kind === 'file') {
      return <video src={v.src} controls playsInline preload="metadata" className={cx('w-full bg-black', className)} />;
    }
    if (v?.kind === 'link') {
      return (
        <a href={v.src} target="_blank" rel="noreferrer" className={cx('flex aspect-video w-full flex-col items-center justify-center gap-2 bg-navy text-white', className)}>
          <span className="flex size-14 items-center justify-center rounded-full bg-brand">
            <Icon name="play" className="ms-1 size-6" />
          </span>
          <span className="text-sm font-bold">مشاهدة الفيديو</span>
        </a>
      );
    }
  }
  return null;
}

export default function PostCard({ post, actions }) {
  return (
    <article className="card overflow-hidden">
      <PostMedia post={post} className="max-h-[28rem]" />
      <div className="p-4">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          {post.isPinned && (
            <Badge tone="orange">
              <Icon name="pin" className="size-3" /> مثبّت
            </Badge>
          )}
          {post.category && <Badge>{CATEGORY[post.category]}</Badge>}
          {post.isActive === false && <Badge tone="red">مخفي</Badge>}
          <span className="ms-auto text-[11px] text-navy/40">{fmtDate(post.createdAt)}</span>
        </div>
        <h3 className="text-base font-black leading-7">{post.title}</h3>
        {post.body && <p className="mt-1 whitespace-pre-line text-sm leading-7 text-navy/70">{post.body}</p>}
        {post.linkUrl && (
          <a href={post.linkUrl} target="_blank" rel="noreferrer" className="btn btn-soft mt-3 px-3 py-1.5 text-xs">
            <Icon name="link" className="size-3.5" /> التفاصيل
          </a>
        )}
        {actions && <div className="mt-3 flex flex-wrap gap-1 border-t border-navy/5 pt-3">{actions}</div>}
      </div>
    </article>
  );
}
