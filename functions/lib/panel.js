/* Utilidades de sesión del panel propio (Cloudflare Pages Functions).
   El token de GitHub viaja cifrado dentro de una cookie HttpOnly: el navegador
   nunca puede leerlo y solo estas funciones lo usan para hablar con GitHub. */
import { leerCookie } from './oauth.js';

export const PANEL_COOKIE = 'lf_panel_sesion';
export const PANEL_MAX_AGE = 8 * 60 * 60;
export const PANEL_PREFIX = 'p.';

/* El estado del panel lleva un prefijo para que /api/callback sepa distinguirlo
   del inicio de sesión de Decap, sin necesitar otra URL de autorización. */
export function esEstadoPanel(estado) {
  return String(estado || '').startsWith(PANEL_PREFIX);
}

export function cookieSesion(valor) {
  return `${PANEL_COOKIE}=${encodeURIComponent(valor)}; Path=/api/panel; HttpOnly; Secure; SameSite=Lax; Max-Age=${valor ? PANEL_MAX_AGE : 0}`;
}

export function limpiarSesion() {
  return cookieSesion('');
}

function aBase64Url(bytes) {
  const arreglo = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binario = '';
  for (let i = 0; i < arreglo.length; i += 1) binario += String.fromCharCode(arreglo[i]);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(texto) {
  const limpio = String(texto || '').replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const binario = atob(limpio + '='.repeat((4 - (limpio.length % 4)) % 4));
  const salida = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) salida[i] = binario.charCodeAt(i);
  return salida;
}

async function clave(env) {
  const secreto = env.PANEL_SESSION_SECRET || env.GITHUB_CLIENT_SECRET || '';
  if (!secreto) throw new Error('Falta el secreto de sesión del panel.');
  const material = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secreto));
  return crypto.subtle.importKey('raw', material, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function cifrar(datos, env) {
  const llave = await clave(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cifrado = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, llave, new TextEncoder().encode(JSON.stringify(datos)),
  );
  const completo = new Uint8Array(iv.length + cifrado.byteLength);
  completo.set(iv, 0);
  completo.set(new Uint8Array(cifrado), iv.length);
  return aBase64Url(completo);
}

export async function descifrar(valor, env) {
  try {
    const bytes = deBase64Url(valor);
    if (bytes.length < 29) return null;
    const llave = await clave(env);
    const claro = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytes.slice(0, 12) }, llave, bytes.slice(12),
    );
    return JSON.parse(new TextDecoder().decode(claro));
  } catch (error) {
    return null;
  }
}

export async function leerSesion(request, env) {
  const valor = leerCookie(request.headers.get('cookie'), PANEL_COOKIE);
  if (!valor) return null;
  const sesion = await descifrar(decodeURIComponent(valor), env);
  if (!sesion || !sesion.token || !sesion.exp) return null;
  if (Number(sesion.exp) <= Math.floor(Date.now() / 1000)) return null;
  return sesion;
}

export function json(datos, estado = 200, extra = {}) {
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: {
      'content-type': 'application/json;charset=UTF-8',
      'cache-control': 'no-store',
      ...extra,
    },
  });
}
