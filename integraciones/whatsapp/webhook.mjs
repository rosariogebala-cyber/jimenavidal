import { createServer } from 'node:http';
import { createDecipheriv, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const OFERTAS = 'datos/ofertas.json';
const FOTO_MAX = 4 * 1024 * 1024;
const INCLUYE = new Set(['aereo', 'equipaje', 'traslado', 'excursion', 'guia', 'hotel', 'desayuno', 'asistencia']);
const PLAN = new Map([
  ['adulto_doble', 'Por pasajero adulto en base doble'],
  ['adulto_triple', 'Por pasajero adulto en base triple'],
  ['grupo_2a1m', 'Plan familiar (2 adulto + 1 menor hasta 11 años)'],
  ['grupo_2a2m', 'Plan familiar (2 adulto + 2 menores hasta 11 años)'],
]);

const hmac = (key, data) => createHmac('sha256', key).update(data).digest();
const hash = data => createHash('sha256').update(data).digest();
const iguales = (a, b) => a.length === b.length && timingSafeEqual(a, b);
const b64 = data => Buffer.from(data).toString('base64');
const texto = (value, max) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';

function entero(value, min, max) {
  if (!['number', 'string'].includes(typeof value) || !/^\d+$/.test(String(value))) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : null;
}

export function datosOferta(answer) {
  const destino = texto(answer.destino, 40);
  const origen = texto(answer.origen, 24);
  const fechas = texto(answer.fechas, 28);
  const noches = entero(answer.noches, 1, 21);
  const precio = entero(answer.precio, 0, 999999999);
  const moneda = answer.moneda;
  const hasta = answer.hasta || '';
  if (destino.length < 2 || origen.length < 2 || !fechas || noches === null || precio === null ||
      !['USD', 'ARS', 'EUR'].includes(moneda)) return null;
  if (hasta && (typeof hasta !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(hasta) ||
      !Number.isFinite(Date.parse(hasta)) || new Date(hasta).toISOString().slice(0, 10) !== hasta)) return null;
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
  if (hasta && hasta < hoy) return null;
  const incluye = Array.isArray(answer.incluye) ? [...new Set(answer.incluye.filter(item => INCLUYE.has(item)))] : [];
  return {
    datos: { destino, origen, fechas, noches, precio, moneda, incluye,
      precio_nota: PLAN.get(answer.precio_nota) || '', destacada: false },
    ...(hasta ? { hasta } : {}),
  };
}

function crearToken(env, from, messageId) {
  const datos = Buffer.from(JSON.stringify([from, messageId, Date.now()])).toString('base64url');
  return datos + '.' + hmac(env.WA_APP_SECRET, datos).toString('base64url');
}

function idOferta(env, from, token) {
  if (typeof token !== 'string' || token.length > 1024 || !/^[\w-]+\.[\w-]+$/.test(token)) return null;
  const [datos, firma] = token.split('.');
  if (!iguales(hmac(env.WA_APP_SECRET, datos), Buffer.from(firma, 'base64url'))) return null;
  try {
    const [telefono, id, instante] = JSON.parse(Buffer.from(datos, 'base64url').toString());
    const edad = Date.now() - instante;
    if (telefono !== from || typeof id !== 'string' || !Number.isFinite(edad) || edad < 0 || edad > 24 * 3600 * 1000) return null;
    return hash(id).toString('hex').slice(0, 32);
  } catch {
    return null;
  }
}

async function llamar(url, options) {
  const result = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(12000) });
  if (!result.ok) throw new Error('El servicio externo rechazó la solicitud');
  return result;
}

function graph(env, path, options = {}) {
  return llamar('https://graph.facebook.com/' + (env.WA_GRAPH_VERSION || 'v25.0') + '/' + path, {
    ...options,
    headers: { Authorization: 'Bearer ' + env.WA_ACCESS_TOKEN, 'Content-Type': 'application/json' },
  });
}

function mensaje(env, to, content) {
  return graph(env, env.WA_PHONE_NUMBER_ID + '/messages', {
    method: 'POST',
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, ...content }),
  });
}

function respuesta(env, to, body) {
  return mensaje(env, to, { type: 'text', text: { body } });
}

async function descargar(url, headers = {}) {
  const r = await llamar(url, { headers });
  const chunks = [];
  let size = 0;
  for await (const chunk of r.body) {
    size += chunk.length;
    if (size > FOTO_MAX + 32) throw new Error('La foto supera el tamaño admitido');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function descifrarFoto(bytes, meta) {
  const from64 = key => Buffer.from(meta[key], 'base64');
  if (bytes.length <= 10 || !iguales(hash(bytes), from64('encrypted_hash'))) throw new Error('Foto cifrada inválida');
  const cipher = bytes.subarray(0, -10);
  const iv = from64('iv');
  const mac = hmac(from64('hmac_key'), Buffer.concat([iv, cipher])).subarray(0, 10);
  if (!iguales(mac, bytes.subarray(-10))) throw new Error('Firma de foto inválida');
  const dec = createDecipheriv('aes-256-cbc', from64('encryption_key'), iv);
  const plain = Buffer.concat([dec.update(cipher), dec.final()]);
  if (!iguales(hash(plain), from64('plaintext_hash'))) throw new Error('Foto inválida');
  return plain;
}

async function fotoOferta(env, items) {
  const photo = Array.isArray(items) && items.length === 1 ? items[0] : null;
  if (!photo || typeof photo !== 'object') throw new Error('Falta la foto del formulario');
  let bytes;
  if (photo.cdn_url && photo.encryption_metadata) {
    const url = new URL(photo.cdn_url);
    if (url.protocol !== 'https:' || !/(^|\.)whatsapp\.net$/.test(url.hostname)) throw new Error('Origen de foto no admitido');
    bytes = descifrarFoto(await descargar(url), photo.encryption_metadata);
  } else {
    if (typeof photo.media_id !== 'string' || !/^\d+$/.test(photo.media_id)) throw new Error('Formato de foto no admitido');
    const r = await graph(env, photo.media_id + '?phone_number_id=' + env.WA_PHONE_NUMBER_ID);
    const { url } = await r.json();
    const media = new URL(url);
    if (media.protocol !== 'https:' || media.hostname !== 'lookaside.fbsbx.com') throw new Error('Origen de foto no admitido');
    bytes = await descargar(media, { Authorization: 'Bearer ' + env.WA_ACCESS_TOKEN });
  }
  if (bytes.length > FOTO_MAX) throw new Error('La foto supera el tamaño admitido');
  let ext;
  if (bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) ext = 'jpg';
  if (bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) ext = 'png';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') ext = 'webp';
  if (!ext) throw new Error('Formato de foto no admitido');
  return { bytes, ext };
}

async function github(env, query, variables) {
  const r = await llamar('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.GITHUB_TOKEN, 'Content-Type': 'application/json', 'User-Agent': 'jimena-whatsapp' },
    body: JSON.stringify({ query, variables }),
  });
  const result = await r.json();
  if (result.errors?.length) {
    const e = new Error('GitHub no aceptó la operación');
    e.conflicto = result.errors.some(error => /expected branch to point to|expectedHeadOid/i.test(error.message));
    throw e;
  }
  return result.data;
}

async function guardarOferta(env, oferta, answer, id) {
  let foto;
  const branch = env.GITHUB_BRANCH || 'main';
  const [owner, name] = env.GITHUB_REPO.split('/');
  const estado = env.WA_MODE === 'publicar' ? 'publicada' : 'pendiente';
  for (let intento = 0; intento < 3; intento += 1) {
    const { repository } = await github(env,
      'query($owner:String!,$name:String!,$ref:String!,$path:String!){repository(owner:$owner,name:$name){ref(qualifiedName:$ref){target{oid}} object(expression:$path){... on Blob{text}}}}',
      { owner, name, ref: 'refs/heads/' + branch, path: branch + ':' + OFERTAS });
    const lista = JSON.parse(repository.object.text);
    if (lista.some(item => item.id === id)) return;
    foto ??= await fotoOferta(env, answer.foto);
    const filename = id + '.' + foto.ext;
    const orden = lista.reduce((max, item) => item.estado === estado ? Math.max(max, Number(item.orden) || 0) : max, 0) + 1;
    lista.push({ id, estado, orden, foto: filename, ...oferta });
    try {
      await github(env, 'mutation($input:CreateCommitOnBranchInput!){createCommitOnBranch(input:$input){commit{oid}}}', {
        input: {
          branch: { repositoryNameWithOwner: env.GITHUB_REPO, branchName: branch },
          expectedHeadOid: repository.ref.target.oid,
          message: { headline: 'WhatsApp: agrega oferta ' + oferta.datos.destino },
          fileChanges: { additions: [
            { path: OFERTAS, contents: b64(JSON.stringify(lista, null, 2) + '\n') },
            { path: 'datos/fotos/' + filename, contents: b64(foto.bytes) },
          ] },
        },
      });
      return;
    } catch (error) {
      if (!error.conflicto || intento === 2) throw error;
    }
  }
}

async function procesar(env, item) {
  const { from, id } = item;
  if (typeof id !== 'string' || !env.WA_ALLOWED_NUMBERS.split(',').map(n => n.trim()).includes(from)) return;
  if (item.type === 'text' && /^nueva promo$/i.test(item.text?.body?.trim() || '')) {
    await mensaje(env, from, {
      type: 'interactive',
      interactive: {
        type: 'flow', body: { text: 'Completá los datos de la promo.' },
        action: { name: 'flow', parameters: {
          flow_message_version: '3', flow_id: env.WA_FLOW_ID, flow_token: crearToken(env, from, id),
          flow_cta: 'Nueva promo', flow_action: 'navigate', flow_action_payload: { screen: 'NUEVA_PROMO' },
          mode: env.WA_MODE === 'publicar' ? 'published' : 'draft',
        } },
      },
    });
    return;
  }
  if (item.type !== 'interactive' || item.interactive?.type !== 'nfm_reply') return;
  let answer;
  try { answer = JSON.parse(item.interactive.nfm_reply.response_json); } catch { return; }
  if (!answer || typeof answer !== 'object') return;
  const offerId = idOferta(env, from, answer.flow_token);
  if (!offerId) return;
  const oferta = datosOferta(answer);
  if (!oferta) {
    await respuesta(env, from, 'Revisá los datos de la promo y las fechas. Escribí «Nueva promo» para volver a cargarla.');
    return;
  }
  if (env.WA_MODE === 'pendiente' || env.WA_MODE === 'publicar') {
    await guardarOferta(env, oferta, answer, offerId);
    await respuesta(env, from, env.WA_MODE === 'publicar'
      ? 'Guardé la promo. Va a aparecer en la web cuando termine el despliegue.'
      : 'Guardé la promo en Pendientes de Gestión.');
  } else {
    await fotoOferta(env, answer.foto);
    await respuesta(env, from, 'Prueba recibida. Validé los datos y la foto.');
  }
}

export function servidor(env) {
  const required = ['WA_APP_SECRET', 'WA_VERIFY_TOKEN', 'WA_ACCESS_TOKEN', 'WA_PHONE_NUMBER_ID', 'WA_BUSINESS_ID',
    'WA_FLOW_ID', 'WA_ALLOWED_NUMBERS'];
  if (['pendiente', 'publicar'].includes(env.WA_MODE)) required.push('GITHUB_TOKEN', 'GITHUB_REPO');
  if (required.some(key => !env[key])) throw new Error('Falta configurar el entorno del webhook');
  return createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const end = (status, message = '') => { res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(message); };
    if (url.pathname === '/healthz' && req.method === 'GET') return end(200, 'ok');
    if (url.pathname !== '/webhook') return end(404);
    if (req.method === 'GET') {
      const clave = Buffer.from(url.searchParams.get('hub.verify_token') || '');
      const ok = url.searchParams.get('hub.mode') === 'subscribe' && iguales(clave, Buffer.from(env.WA_VERIFY_TOKEN));
      return ok ? end(200, url.searchParams.get('hub.challenge') || '') : end(403);
    }
    if (req.method !== 'POST') return end(405);
    try {
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 256 * 1024) return end(413);
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks);
      const firma = req.headers['x-hub-signature-256'] || '';
      if (typeof firma !== 'string' || !/^sha256=[a-f0-9]{64}$/.test(firma) ||
          !iguales(hmac(env.WA_APP_SECRET, raw), Buffer.from(firma.slice(7), 'hex'))) return end(401);
      const event = JSON.parse(raw.toString());
      if (event.object !== 'whatsapp_business_account') return end(200);
      for (const entry of event.entry || []) {
        if (entry.id !== env.WA_BUSINESS_ID) continue;
        for (const change of entry.changes || []) {
          if (change.field !== 'messages' || change.value?.metadata?.phone_number_id !== env.WA_PHONE_NUMBER_ID) continue;
          for (const message of change.value.messages || []) await procesar(env, message);
        }
      }
      return end(200);
    } catch {
      console.error('No se pudo procesar la notificación de WhatsApp');
      return end(503);
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  servidor(process.env).listen(Number(process.env.PORT || 8080));
}
