// تحليل روابط الفيديو للعرض داخل الصفحة
export function parseVideo(url) {
  if (!url) return null;
  try {
    const u = new URL(url, 'https://x.local');
    const host = u.hostname.replace(/^www\.|^m\./, '');
    let id = null;
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
    else if (host.endsWith('youtube.com')) {
      if (u.searchParams.get('v')) id = u.searchParams.get('v');
      else {
        const m = u.pathname.match(/\/(shorts|embed|live)\/([\w-]{6,})/);
        if (m) id = m[2];
      }
    }
    if (id && /^[\w-]{6,20}$/.test(id)) return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}?rel=0`, thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
    if (/\.(mp4|webm|mov)(\?|$)/i.test(u.pathname)) return { kind: 'file', src: url };
    return { kind: 'link', src: url };
  } catch {
    return null;
  }
}
