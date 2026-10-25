// تنسيق الأرقام والتواريخ للواجهة

const money = new Intl.NumberFormat('ar-IQ-u-nu-latn', { maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('ar-IQ-u-nu-latn');

export const fmtMoney = (v) => `${money.format(Math.round(Number(v) || 0))} د.ع`;
export const fmtNum = (v) => num.format(Number(v) || 0);

export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-IQ-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('ar-IQ-u-nu-latn', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toInputDate(d) {
  if (!d) return '';
  const x = new Date(d);
  if (isNaN(x)) return '';
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function daysLeft(d) {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

export const pad = (n, w = 5) => String(n ?? '').padStart(w, '0');
export const invoiceNo = (n) => `INV-${pad(n)}`;
export const orderNo = (n) => `ORD-${pad(n)}`;
export const repairNo = (n) => `R-${pad(n)}`;
