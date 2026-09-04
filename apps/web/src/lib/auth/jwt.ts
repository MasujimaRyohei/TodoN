import { jwtVerify, SignJWT } from 'jose';

const COOKIE_NAME = 'todon_token';

function getSecret() {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 16) {
    throw new Error('AUTH_SECRET must be set and at least 16 characters');
  }
  return new TextEncoder().encode(raw);
}

export { COOKIE_NAME };

export async function signUserToken(userId: string) {
  return await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret());
}

export async function verifyUserToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret());
  const sub = payload.sub;
  if (!sub || typeof sub !== 'string') {
    throw new Error('Invalid token payload');
  }
  return sub;
}
