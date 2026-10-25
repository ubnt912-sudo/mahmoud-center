// توقيع والتحقق من جلسات الدخول (يعمل في Edge و Node)
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'mc_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 أيام

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET غير مضبوط أو قصير جداً. ضع قيمة طويلة في متغيرات البيئة.');
    }
    return new TextEncoder().encode('dev-only-insecure-secret-change-me-please');
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySession(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] });
    return payload;
  } catch {
    return null;
  }
}
