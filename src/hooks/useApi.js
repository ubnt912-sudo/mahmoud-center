'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client';

/** جلب بيانات مع إعادة التحميل وإلغاء الطلبات القديمة. url = null لإيقاف الجلب. */
export function useApi(url, { deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(url));
  const ctrl = useRef(null);

  const load = useCallback(async () => {
    if (!url) {
      setLoading(false);
      return;
    }
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setLoading(true);
    setError('');
    try {
      const d = await api(url, { signal: c.signal });
      if (!c.signal.aborted) setData(d);
    } catch (e) {
      if (e?.name !== 'AbortError') setError(e.message || 'حدث خطأ');
    } finally {
      if (!c.signal.aborted) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  useEffect(() => {
    load();
    return () => ctrl.current?.abort();
  }, [load]);

  return { data, error, loading, reload: load, setData };
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
