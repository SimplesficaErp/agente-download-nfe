// Teste da rota /api/nfse/dfe com mTLS DE VERDADE: um ADN falso (HTTPS que exige certificado
// cliente) e o agente real como processo filho, usando um .pfx gerado na hora (fora do Windows).
// Rodar: node --test test/
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';

const PORTA_AGENTE = 39131;
const PORTA_ADN = 39443;
const ORIGEM_APP = 'https://agente-mkp.devgogroup.com';
const dir = mkdtempSync(join(tmpdir(), 'agente-teste-'));
const ssl = (...a) => execFileSync('openssl', a, { cwd: dir, stdio: 'ignore' });
let adn;
let agente;
const pedidos = [];

before(async () => {
  ssl('req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'ca.key', '-out', 'ca.pem', '-days', '2', '-subj', '/CN=AC Teste');
  writeFileSync(join(dir, 'san.ext'), 'subjectAltName=IP:127.0.0.1\n');
  ssl('req', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'srv.key', '-out', 'srv.csr', '-subj', '/CN=127.0.0.1');
  ssl('x509', '-req', '-in', 'srv.csr', '-CA', 'ca.pem', '-CAkey', 'ca.key', '-CAcreateserial', '-out', 'srv.pem', '-days', '2', '-extfile', 'san.ext');
  ssl('req', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'cli.key', '-out', 'cli.csr', '-subj', '/CN=LOJA TESTE LTDA:11222333000181');
  ssl('x509', '-req', '-in', 'cli.csr', '-CA', 'ca.pem', '-CAkey', 'ca.key', '-CAcreateserial', '-out', 'cli.pem', '-days', '2');
  ssl('pkcs12', '-export', '-inkey', 'cli.key', '-in', 'cli.pem', '-out', 'cli.pfx', '-passout', 'pass:senha-teste');

  const xml = '<NFSe><infNFSe Id="NFS' + '3'.repeat(50) + '"><nNFSe>1</nNFSe></infNFSe></NFSe>';
  adn = createServer(
    { key: readFileSync(join(dir, 'srv.key')), cert: readFileSync(join(dir, 'srv.pem')), ca: readFileSync(join(dir, 'ca.pem')), requestCert: true, rejectUnauthorized: true },
    (req, res) => {
      const cliente = req.socket.getPeerCertificate();
      pedidos.push({ url: req.url, cn: cliente?.subject?.CN });
      if (req.url.endsWith('/DFe/5')) return res.writeHead(404).end();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ StatusProcessamento: 'DOCUMENTOS_LOCALIZADOS', MaxNSU: 5, LoteDFe: [{ NSU: 5, ChaveAcesso: '3'.repeat(50), TipoDocumento: 'NFSE', ArquivoXml: gzipSync(xml).toString('base64') }] }));
    },
  );
  await new Promise((ok) => adn.listen(PORTA_ADN, '127.0.0.1', ok));

  agente = spawn(process.execPath, ['server.js'], {
    cwd: new URL('..', import.meta.url).pathname,
    env: { ...process.env, AGENTE_PORT: String(PORTA_AGENTE), AGENTE_ADN_BASE: `https://127.0.0.1:${PORTA_ADN}/contribuintes`, NODE_EXTRA_CA_CERTS: join(dir, 'ca.pem') },
    stdio: 'ignore',
  });
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`http://127.0.0.1:${PORTA_AGENTE}/api/saude`);
      return;
    } catch {
      await new Promise((ok) => setTimeout(ok, 100));
    }
  }
  throw new Error('agente não subiu');
});

after(() => {
  agente?.kill();
  adn?.close();
});

const dfe = (corpo, origem = ORIGEM_APP) =>
  fetch(`http://127.0.0.1:${PORTA_AGENTE}/api/nfse/dfe`, { method: 'POST', headers: { 'content-type': 'application/json', origin: origem }, body: JSON.stringify(corpo) });

test('saúde informa a versão e libera CORS só para o app', async () => {
  const r = await fetch(`http://127.0.0.1:${PORTA_AGENTE}/api/saude`, { headers: { origin: ORIGEM_APP } });
  assert.equal(r.headers.get('access-control-allow-origin'), ORIGEM_APP);
  assert.equal((await r.json()).versao, '0.2.0');
});

test('lote: apresenta o certificado ao ADN (mTLS) e devolve só os campos que o app aceita', async () => {
  const r = await dfe({ cnpj: '11222333000181', nsu: 0, pfxPath: join(dir, 'cli.pfx'), senha: 'senha-teste' });
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.deepEqual(Object.keys(d).sort(), ['documentos', 'maxNsu', 'status']);
  assert.equal(d.maxNsu, 5);
  assert.deepEqual(Object.keys(d.documentos[0]).sort(), ['chave', 'nsu', 'tipo', 'xml']);
  assert.match(d.documentos[0].xml, /<infNFSe/);
  assert.deepEqual(pedidos.at(-1), { url: '/contribuintes/DFe/0', cn: 'LOJA TESTE LTDA:11222333000181' });
});

test('404 do ADN = lote vazio', async () => {
  const d = await (await dfe({ cnpj: '11222333000181', nsu: 5, pfxPath: join(dir, 'cli.pfx'), senha: 'senha-teste' })).json();
  assert.deepEqual(d, { status: 'SEM_DOCUMENTOS', documentos: [], maxNsu: null });
});

test('site qualquer não usa o certificado (origem fora da lista)', async () => {
  const r = await dfe({ cnpj: '11222333000181', nsu: 0, pfxPath: join(dir, 'cli.pfx'), senha: 'senha-teste' }, 'https://site-malicioso.com');
  assert.equal(r.status, 403);
});

test('sem certificado da raiz instalado (fora do Windows a loja é vazia) → 404 com mensagem', async () => {
  const r = await dfe({ cnpj: '11222333000181', nsu: 0 });
  assert.equal(r.status, 404);
  assert.match((await r.json()).erro, /Nenhum certificado A1 válido da raiz 11222333/);
});

test('encerrar só sem Origin', async () => {
  const r = await fetch(`http://127.0.0.1:${PORTA_AGENTE}/api/encerrar`, { method: 'POST', headers: { origin: ORIGEM_APP } });
  assert.equal(r.status, 403);
});
