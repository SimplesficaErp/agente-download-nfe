#!/usr/bin/env node
// Agente local de download de XML de NFe — INDEPENDENTE.
// Lê o certificado A1 instalado na máquina (Windows) ou um .pfx apontado,
// faz mTLS com a SEFAZ (NFeDistribuicaoDFe / consChNFe) e salva o XML.
// Só módulos nativos do Node. Escuta só em 127.0.0.1.

import { execFile, execFileSync, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes, randomUUID } from 'node:crypto';
import { appendFileSync, copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { Agent as HttpsAgent, request as httpsRequest } from 'node:https';
import { tmpdir } from 'node:os';
import { isSea } from 'node:sea';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const VERSAO = '0.2.0';
const PORT = Number(process.env.AGENTE_PORT) || 3131;
const AQUI = dirname(fileURLToPath(import.meta.url));
const EH_WINDOWS = process.platform === 'win32';
const execFileAsync = promisify(execFile);
let seletorAberto = false;

const SEFAZ = {
  1: 'https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
  2: 'https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
};

const UF_CODES = {
  RO: 11, AC: 12, AM: 13, RR: 14, PA: 15, AP: 16, TO: 17, MA: 21, PI: 22, CE: 23,
  RN: 24, PB: 25, PE: 26, AL: 27, SE: 28, BA: 29, MG: 31, ES: 32, RJ: 33, SP: 35,
  PR: 41, SC: 42, RS: 43, MS: 50, MT: 51, GO: 52, DF: 53,
};

// ---------- PowerShell: listar certificados A1 instalados ----------
function listarCertificadosWindows() {
  if (!EH_WINDOWS) return [];
  const ps =
    "Get-ChildItem Cert:\\CurrentUser\\My | Where-Object { $_.HasPrivateKey } | " +
    "ForEach-Object { [PSCustomObject]@{ Subject=$_.Subject; Thumbprint=$_.Thumbprint; " +
    "NotAfter=$_.NotAfter.ToString('yyyy-MM-dd'); NotBefore=$_.NotBefore.ToString('yyyy-MM-dd') } } | " +
    'ConvertTo-Json -Compress';
  let out;
  try {
    out = execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], {
      encoding: 'utf-8',
      timeout: 15000,
    });
  } catch {
    return [];
  }
  let dados;
  try {
    dados = JSON.parse(out.trim() || '[]');
  } catch {
    return [];
  }
  const lista = Array.isArray(dados) ? dados : [dados];
  return lista.map((c) => {
    const subject = c.Subject ?? '';
    const cnMatch = /CN=([^,]+)/.exec(subject);
    const nomeCn = cnMatch ? cnMatch[1] : subject;
    const cnpjMatch = /:(\d{14})\b/.exec(nomeCn) || /(\d{14})/.exec(nomeCn);
    // UF do titular: ICP-Brasil costuma trazer S=/ST= (sigla de 2 letras) no DN.
    const ufMatch = /(?:^|,)\s*(?:ST|S|STATE)=([A-Z]{2})\s*(?:,|$)/i.exec(subject);
    const ufCand = ufMatch ? ufMatch[1].toUpperCase() : '';
    const uf = UF_CODES[ufCand] ? ufCand : '';
    return {
      thumbprint: c.Thumbprint,
      nome: nomeCn.replace(/:(\d{14}).*/, '').trim(),
      cnpj: cnpjMatch ? cnpjMatch[1] : '',
      uf,
      validadeAte: c.NotAfter,
      validadeDe: c.NotBefore,
    };
  });
}

// Exporta o cert escolhido para um PFX temporário (chave exportável).
// Retorna { pfxPath, passphrase, limpar() }.
function exportarPfxTemporario(thumbprint) {
  if (!EH_WINDOWS) throw new Error('exportação de certificado só no Windows');
  // Anti command-injection: thumbprint é interpolado no script PowerShell —
  // só aceitamos 40 hex E que exista na lista de certificados da máquina.
  if (!/^[A-Fa-f0-9]{40}$/.test(thumbprint)) throw new Error('thumbprint inválido');
  if (!listarCertificadosWindows().some((c) => c.thumbprint.toUpperCase() === thumbprint.toUpperCase()))
    throw new Error('certificado não encontrado na máquina');
  const passphrase = randomBytes(18).toString('base64');
  const pfxPath = join(tmpdir(), `agente-nfe-${randomUUID()}.pfx`);
  const ps =
    `$sec = ConvertTo-SecureString -String '${passphrase.replace(/'/g, "''")}' -Force -AsPlainText; ` +
    `Export-PfxCertificate -Cert 'Cert:\\CurrentUser\\My\\${thumbprint}' -FilePath '${pfxPath}' -Password $sec | Out-Null`;
  execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { timeout: 15000 });
  return {
    pfxPath,
    passphrase,
    limpar() {
      try {
        rmSync(pfxPath, { force: true });
      } catch {}
    },
  };
}

// ---------- SEFAZ: consulta por chave (consChNFe) ----------
function montarEnvelope(cUFAutor, tpAmb, cnpj, chNFe) {
  return (
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">' +
    '<soap12:Body>' +
    '<nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">' +
    '<nfeDadosMsg>' +
    '<distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">' +
    `<tpAmb>${tpAmb}</tpAmb>` +
    `<cUFAutor>${cUFAutor}</cUFAutor>` +
    `<CNPJ>${cnpj}</CNPJ>` +
    `<consChNFe><chNFe>${chNFe}</chNFe></consChNFe>` +
    '</distDFeInt>' +
    '</nfeDadosMsg>' +
    '</nfeDistDFeInteresse>' +
    '</soap12:Body>' +
    '</soap12:Envelope>'
  );
}

function postSefaz(urlStr, envelope, pfxBuf, passphrase) {
  const u = new URL(urlStr);
  const body = Buffer.from(envelope, 'utf-8');
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      {
        hostname: u.hostname,
        port: 443,
        path: u.pathname,
        method: 'POST',
        pfx: pfxBuf,
        passphrase,
        minVersion: 'TLSv1.2',
        headers: {
          // SOAP 1.2 exige o parâmetro `action` no Content-Type (não SOAPAction).
          'Content-Type':
            'application/soap+xml; charset=utf-8; action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse"',
          // Sem User-Agent o WAF da Fazenda devolve HTTP 403. Mandar um.
          'User-Agent': `AgenteNFe/${VERSAO} (+https://chaves-nfe.devgogroup.com)`,
          Accept: 'application/soap+xml, text/xml, */*',
          'Content-Length': body.length,
        },
        timeout: 30000,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf-8') }));
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout SEFAZ')));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function parseResposta(xml) {
  const cStat = /<cStat>(\d+)<\/cStat>/.exec(xml)?.[1] ?? '';
  const xMotivo = /<xMotivo>([^<]*)<\/xMotivo>/.exec(xml)?.[1] ?? '';
  const docs = [];
  const re = /<docZip[^>]*>([^<]+)<\/docZip>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    try {
      docs.push(gunzipSync(Buffer.from(m[1].trim(), 'base64')).toString('utf-8'));
    } catch {}
  }
  return { cStat, xMotivo, docs };
}

async function baixarChave({ chNFe, cUFAutor, tpAmb, cnpj, pfxBuf, passphrase, destino }) {
  const envelope = montarEnvelope(cUFAutor, tpAmb, cnpj, chNFe);
  let resp;
  try {
    resp = await postSefaz(SEFAZ[tpAmb], envelope, pfxBuf, passphrase);
  } catch (e) {
    return { chave: chNFe, status: 'erro', mensagem: `falha de conexão: ${e.message}` };
  }
  if (resp.status !== 200)
    return { chave: chNFe, status: 'erro', mensagem: `HTTP ${resp.status} da SEFAZ` };

  const { cStat, xMotivo, docs } = parseResposta(resp.body);
  if (docs.length === 0)
    return { chave: chNFe, status: 'sem-retorno', mensagem: `cStat ${cStat}: ${xMotivo}` };

  const arquivos = [];
  docs.forEach((xml, i) => {
    const nome = docs.length > 1 ? `${chNFe}-${i + 1}.xml` : `${chNFe}.xml`;
    const caminho = join(destino, nome);
    writeFileSync(caminho, xml, 'utf-8');
    arquivos.push(caminho);
  });
  return { chave: chNFe, status: 'ok', mensagem: `cStat ${cStat}: ${xMotivo}`, arquivos };
}

// ---------- NFS-e Nacional (ADN): distribuição de DF-e por NSU ----------
// GET {base}/DFe/{NSU} com mTLS → { StatusProcessamento, LoteDFe:[{NSU, ChaveAcesso, TipoDocumento,
// ArquivoXml (gzip+base64)}], MaxNSU? }; 404 = nada a partir do NSU. Hosts fixos por ambiente.
// AGENTE_ADN_BASE só existe para o teste automatizado (servidor ADN falso em 127.0.0.1).
const ADN = {
  producao: process.env.AGENTE_ADN_BASE || 'https://adn.nfse.gov.br/contribuintes',
  homologacao: 'https://adn.producaorestrita.nfse.gov.br/contribuintes',
};

// PFX exportado da loja do Windows fica só em memória por alguns minutos (cada export custa ~1 s
// de PowerShell e a busca pede dezenas de lotes seguidos). O arquivo temporário é apagado na hora.
const CACHE_PFX_MS = 10 * 60_000;
const cachePfx = new Map();

function pfxDoThumbprint(thumbprint) {
  const t = thumbprint.toUpperCase();
  const c = cachePfx.get(t);
  if (c && c.expira > Date.now()) return c;
  const exp = exportarPfxTemporario(t);
  try {
    const item = { pfxBuf: readFileSync(exp.pfxPath), passphrase: exp.passphrase, expira: Date.now() + CACHE_PFX_MS };
    cachePfx.set(t, item);
    return item;
  } finally {
    exp.limpar();
  }
}

// Certificado instalado com a mesma raiz de CNPJ (8 dígitos), válido, o de validade mais longa.
function certificadoDoCnpj(cnpj) {
  const raiz = soDigitos(cnpj).slice(0, 8);
  const hoje = new Date().toISOString().slice(0, 10);
  return (
    listarCertificadosWindows()
      .filter((c) => c.cnpj && c.cnpj.slice(0, 8) === raiz && c.validadeAte >= hoje)
      .sort((a, b) => b.validadeAte.localeCompare(a.validadeAte))[0] ?? null
  );
}

function getAdn(urlStr, pfxBuf, passphrase) {
  return new Promise((resolve, reject) => {
    const agent = new HttpsAgent({ pfx: pfxBuf, passphrase, minVersion: 'TLSv1.2', keepAlive: false });
    const req = httpsRequest(
      urlStr,
      { method: 'GET', agent, headers: { Accept: 'application/json', 'User-Agent': `AgenteGoGroup/${VERSAO}` }, timeout: 60000 },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf-8') }));
      },
    );
    req.on('timeout', () => req.destroy(new Error('tempo esgotado falando com o ADN')));
    req.on('error', reject);
    req.end();
  });
}

function xmlDoAdn(b64) {
  if (typeof b64 !== 'string' || !b64) return null;
  const bruto = Buffer.from(b64, 'base64');
  try {
    return gunzipSync(bruto).toString('utf-8');
  } catch {
    const texto = bruto.toString('utf-8');
    return texto.trimStart().startsWith('<') ? texto : null;
  }
}

function inteiroOuNull(v) {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : NaN;
  return Number.isSafeInteger(n) ? n : null;
}

function mensagemAdn(body) {
  try {
    const j = JSON.parse(body);
    const erros = j.Erros || j.erros;
    const d = (erros && erros[0] && (erros[0].Descricao || erros[0].descricao)) || j.message || j.mensagem;
    if (typeof d === 'string') return d.slice(0, 300);
  } catch {}
  return String(body || '').slice(0, 200);
}

function erroComStatus(mensagem, status) {
  const e = new Error(mensagem);
  e.status = status;
  return e;
}

// Um lote (até 50 documentos) a partir de `nsu`. Devolve só os campos que o app aceita.
async function loteNfse({ ambiente, nsu, pfxBuf, passphrase }) {
  const r = await getAdn(`${ADN[ambiente]}/DFe/${nsu}`, pfxBuf, passphrase);
  if (r.status === 404) return { status: 'SEM_DOCUMENTOS', documentos: [], maxNsu: null };
  if (r.status < 200 || r.status >= 300) {
    const status = r.status === 401 || r.status === 403 ? 403 : r.status === 429 ? 429 : 502;
    throw erroComStatus(`ADN recusou (HTTP ${r.status}): ${mensagemAdn(r.body)}`, status);
  }
  let j;
  try {
    j = r.body ? JSON.parse(r.body) : {};
  } catch {
    throw erroComStatus('ADN respondeu algo que não é JSON', 502);
  }
  const documentos = [];
  for (const d of Array.isArray(j.LoteDFe) ? j.LoteDFe : []) {
    const n = inteiroOuNull(d.NSU ?? d.nsu);
    if (n === null || n < 1) continue;
    const t = String(d.TipoDocumento ?? d.tipoDocumento ?? '').toUpperCase();
    const chave = d.ChaveAcesso ?? d.chaveAcesso;
    documentos.push({
      nsu: n,
      tipo: t === 'NFSE' ? 'NFSE' : t === 'EVENTO' ? 'EVENTO' : 'OUTRO',
      chave: typeof chave === 'string' ? chave.slice(0, 60) : null,
      xml: xmlDoAdn(d.ArquivoXml ?? d.arquivoXml),
    });
  }
  return {
    status: String(j.StatusProcessamento ?? (documentos.length ? 'DOCUMENTOS_LOCALIZADOS' : 'SEM_DOCUMENTOS')).slice(0, 60),
    documentos,
    maxNsu: inteiroOuNull(j.MaxNSU ?? j.maxNSU ?? j.UltimoNSU),
  };
}

// ---------- Instalação e modo escondido (Windows) ----------
// Duplo clique no .exe baixado: copia para %LOCALAPPDATA%\AgenteGoGroup, registra o protocolo
// agente-gogroup:// (o app abre o agente com um clique) e a inicialização com o Windows, e sobe a
// cópia instalada SEM JANELA (wscript + Run(..., 0)). Depois disso não aparece mais nada na tela.
const NOME_EXE = 'agente-gogroup.exe';
const PASTA_INSTALACAO = join(process.env.LOCALAPPDATA || tmpdir(), 'AgenteGoGroup');
const EXE_INSTALADO = join(PASTA_INSTALACAO, NOME_EXE);
const VBS_INICIAR = join(PASTA_INSTALACAO, 'iniciar.vbs');
const LOG = join(PASTA_INSTALACAO, 'agente.log');
const LOG_MAX_BYTES = 1_000_000;
const CHAVE_PROTOCOLO = 'HKCU\\Software\\Classes\\agente-gogroup';
const CHAVE_INICIO = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const ASPA = '"';

function ehExecutavelEmpacotado() {
  try {
    return isSea();
  } catch {
    return false;
  }
}

function reg(argumentos) {
  execFileSync('reg', argumentos, { stdio: 'ignore', windowsHide: true, timeout: 15000 });
}

function iniciarEscondido() {
  spawn('wscript.exe', [VBS_INICIAR], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
}

async function encerrarAgenteRodando() {
  // Versão nova: pede para sair. Versão 0.1 (janela de console): encerra pelo nome.
  try {
    await fetch(`http://127.0.0.1:${PORT}/api/encerrar`, { method: 'POST', signal: AbortSignal.timeout(2000) });
  } catch {}
  for (const nome of [NOME_EXE, 'agente-nfe.exe', 'agente-nfe-x64.exe']) {
    try {
      execFileSync('taskkill', ['/F', '/IM', nome], { stdio: 'ignore', windowsHide: true });
    } catch {}
  }
  await new Promise((ok) => setTimeout(ok, 800));
}

// VBScript: aspas dentro de string são dobradas. Run(cmd, 0, False) = sem janela, sem esperar.
function scriptIniciar() {
  const exe = EXE_INSTALADO.replace(/"/g, ASPA + ASPA);
  const comando = `${ASPA}${ASPA}${exe}${ASPA}${ASPA} --servico`;
  return `CreateObject(${ASPA}WScript.Shell${ASPA}).Run ${ASPA}${comando}${ASPA}, 0, False\r\n`;
}

async function instalar() {
  console.log(`\n  Instalando o Agente GoGroup ${VERSAO}…`);
  await encerrarAgenteRodando();
  mkdirSync(PASTA_INSTALACAO, { recursive: true });
  copyFileSync(process.execPath, EXE_INSTALADO);
  writeFileSync(VBS_INICIAR, scriptIniciar(), 'utf-8');
  const comando = `wscript.exe ${ASPA}${VBS_INICIAR}${ASPA}`;
  reg(['add', CHAVE_PROTOCOLO, '/ve', '/d', 'URL:Agente GoGroup', '/f']);
  reg(['add', CHAVE_PROTOCOLO, '/v', 'URL Protocol', '/d', '', '/f']);
  reg(['add', `${CHAVE_PROTOCOLO}\\shell\\open\\command`, '/ve', '/d', comando, '/f']);
  reg(['add', CHAVE_INICIO, '/v', 'AgenteGoGroup', '/d', comando, '/f']);
  iniciarEscondido();
  console.log('  Pronto: o agente roda escondido e abre sozinho com o Windows.');
  console.log('  Pode fechar esta janela e voltar para o navegador.\n');
  await new Promise((ok) => setTimeout(ok, 4000));
}

async function desinstalar() {
  await encerrarAgenteRodando();
  try {
    reg(['delete', CHAVE_PROTOCOLO, '/f']);
  } catch {}
  try {
    reg(['delete', CHAVE_INICIO, '/v', 'AgenteGoGroup', '/f']);
  } catch {}
  console.log('  Agente desinstalado (a pasta pode ser apagada):', PASTA_INSTALACAO);
}

// Sem janela não há console: o que o agente escreveria vai para agente.log (zerado acima de 1 MB).
function logarEmArquivo() {
  try {
    mkdirSync(PASTA_INSTALACAO, { recursive: true });
    if (existsSync(LOG) && statSync(LOG).size > LOG_MAX_BYTES) writeFileSync(LOG, '');
  } catch {}
  const escrever =
    (nivel) =>
    (...partes) => {
      try {
        appendFileSync(LOG, `${new Date().toISOString()} ${nivel} ${partes.map(String).join(' ')}\r\n`);
      } catch {}
    };
  console.log = escrever('INFO');
  console.error = escrever('ERRO');
}

// ---------- HTTP server (só 127.0.0.1) ----------
// A página pública do GoDeploy roda em HTTPS e chama este agente no localhost.
// Só liberamos CORS (+ Private Network Access) para ESSAS origens — senão
// qualquer site que a pessoa abrisse poderia mandar o agente baixar usando o
// certificado instalado (drive-by). Localhost (a própria UI do agente) não
// manda Origin, então não precisa de CORS.
const ORIGENS_PERMITIDAS = new Set([
  'https://chaves-nfe.devgogroup.com',
  'https://c2757aa7.devgogroup.com',
  'https://agente-mkp.devgogroup.com',
  'https://2da00850.devgogroup.com',
]);

function corsHeaders(req) {
  const origin = req.headers.origin;
  if (!origin || !ORIGENS_PERMITIDAS.has(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Private-Network': 'true',
    Vary: 'Origin',
  };
}

// Guarda anti-CSRF / anti-DNS-rebinding das rotas sensíveis. O CORS só impede
// LER a resposta cross-site, não impede a requisição de EXECUTAR (e disparar um
// download com o certificado). Então, além do allowlist de Origin:
//  - Origin, se presente, tem que estar no allowlist (bloqueia sites quaisquer);
//  - Host tem que ser localhost/127.0.0.1 (um ataque de DNS rebinding chega com
//    outro Host, ex.: evil.com:3131 → recusado).
function requisicaoLocalOk(req) {
  const origin = req.headers.origin;
  if (origin && !ORIGENS_PERMITIDAS.has(origin)) return false;
  const host = String(req.headers.host || '').toLowerCase();
  return /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(host);
}

// Caminho local seguro: absoluto, sem UNC nem device path. Rejeita UNC em
// QUALQUER mistura de separador (\\srv, //srv, /\srv, \/srv) — no Windows um
// caminho UNC vaza credencial NTLM / escreve em máquina remota.
function caminhoLocalValido(p) {
  const s = String(p || '');
  if (!s || s.includes('\0')) return false;
  if (/^[\\/]{2}/.test(s)) return false; // UNC (duas barras, qualquer mistura)
  if (/^\\\\?\?\\/.test(s)) return false; // device path \\?\ ou \\.\
  if (EH_WINDOWS) return /^[A-Za-z]:[\\/]/.test(s); // só C:\...
  return s.startsWith('/'); // mac/linux: raiz
}

function enviarJson(res, status, dados, req) {
  const body = JSON.stringify(dados);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...(req ? corsHeaders(req) : {}),
  });
  res.end(body);
}

function lerBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

function soDigitos(s) {
  return String(s ?? '').replace(/\D/g, '');
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  // Preflight CORS/PNA das chamadas vindas da página do GoDeploy.
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req));
    res.end();
    return;
  }

  if (url.pathname === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    createReadStream(join(AQUI, 'ui.html')).pipe(res);
    return;
  }

  // A partir daqui, só rotas sensíveis — exigem requisição local legítima.
  if (!requisicaoLocalOk(req)) return enviarJson(res, 403, { erro: 'origem não autorizada' }, req);

  if (url.pathname === '/api/saude' && req.method === 'GET') {
    return enviarJson(res, 200, { ok: true, versao: VERSAO, windows: EH_WINDOWS }, req);
  }

  // Só a própria máquina (sem Origin): usado pelo instalador para trocar de versão.
  if (url.pathname === '/api/encerrar' && req.method === 'POST') {
    if (req.headers.origin) return enviarJson(res, 403, { erro: 'origem não autorizada' }, req);
    enviarJson(res, 200, { ok: true }, req);
    setTimeout(() => process.exit(0), 100);
    return;
  }

  // Lote da NFS-e Nacional (ADN). O certificado é o INSTALADO com a raiz do CNPJ pedido (ou um
  // .pfx, fora do Windows). JSON obrigatório: chamada cross-site precisa de preflight (anti-CSRF).
  if (url.pathname === '/api/nfse/dfe' && req.method === 'POST') {
    if (!String(req.headers['content-type'] || '').includes('application/json'))
      return enviarJson(res, 415, { erro: 'Content-Type deve ser application/json' }, req);
    const b = await lerBody(req);
    const cnpj = soDigitos(b.cnpj);
    const nsu = Number(b.nsu);
    const ambiente = b.ambiente === 'homologacao' ? 'homologacao' : 'producao';
    if (cnpj.length !== 14) return enviarJson(res, 400, { erro: 'CNPJ da empresa inválido' }, req);
    if (!Number.isSafeInteger(nsu) || nsu < 0) return enviarJson(res, 400, { erro: 'NSU inválido' }, req);
    let pfxBuf;
    let passphrase;
    try {
      if (b.pfxPath) {
        if (!caminhoLocalValido(b.pfxPath) || !/\.(pfx|p12)$/i.test(b.pfxPath))
          return enviarJson(res, 400, { erro: 'caminho .pfx inválido (sem UNC/rede; extensão .pfx/.p12)' }, req);
        if (!existsSync(b.pfxPath)) return enviarJson(res, 400, { erro: 'arquivo .pfx não encontrado' }, req);
        pfxBuf = readFileSync(b.pfxPath);
        passphrase = String(b.senha || '');
      } else {
        const cert = certificadoDoCnpj(cnpj);
        if (!cert)
          return enviarJson(res, 404, { erro: `Nenhum certificado A1 válido da raiz ${cnpj.slice(0, 8)} instalado nesta máquina.` }, req);
        ({ pfxBuf, passphrase } = pfxDoThumbprint(cert.thumbprint));
      }
    } catch (e) {
      return enviarJson(res, 400, { erro: `falha ao preparar certificado: ${e.message}` }, req);
    }
    try {
      return enviarJson(res, 200, await loteNfse({ ambiente, nsu, pfxBuf, passphrase }), req);
    } catch (e) {
      console.error('nfse', e.message);
      const mensagem = e.message.startsWith('ADN') ? e.message : `falha falando com o ADN: ${e.message}`;
      return enviarJson(res, e.status || 502, { erro: mensagem }, req);
    }
  }

  if (url.pathname === '/api/certs' && req.method === 'GET') {
    return enviarJson(res, 200, { windows: EH_WINDOWS, certificados: listarCertificadosWindows() }, req);
  }

  // Abre o seletor de pasta NATIVO do Windows e devolve o caminho escolhido.
  // (O navegador não consegue entregar um caminho ao agente; quem abre o
  // diálogo é o agente, que roda localmente.)
  // POST + JSON obrigatório: chamada cross-site precisa de preflight (anti-CSRF).
  // Assíncrono e um diálogo por vez: não trava o agente nem empilha janelas.
  if (url.pathname === '/api/escolher-pasta' && req.method === 'POST') {
    if (!String(req.headers['content-type'] || '').includes('application/json'))
      return enviarJson(res, 415, { erro: 'Content-Type deve ser application/json' }, req);
    if (!EH_WINDOWS) return enviarJson(res, 400, { erro: 'seleção de pasta só no Windows' }, req);
    if (seletorAberto) return enviarJson(res, 409, { erro: 'o seletor de pasta já está aberto' }, req);
    const ps =
      'Add-Type -AssemblyName System.Windows.Forms; ' +
      '$d = New-Object System.Windows.Forms.FolderBrowserDialog; ' +
      "$d.Description = 'Escolha a pasta para salvar os XMLs'; $d.ShowNewFolderButton = $true; " +
      '$d.RootFolder = [System.Environment+SpecialFolder]::MyComputer; ' +
      'if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($d.SelectedPath) }';
    seletorAberto = true;
    try {
      const { stdout } = await execFileAsync(
        'powershell',
        ['-NoProfile', '-NonInteractive', '-STA', '-Command', ps],
        { encoding: 'utf-8', timeout: 180000 },
      );
      return enviarJson(res, 200, { pasta: stdout.trim() || null }, req);
    } catch (e) {
      return enviarJson(res, 400, { erro: `não foi possível abrir o seletor: ${e.message}` }, req);
    } finally {
      seletorAberto = false;
    }
  }

  if (url.pathname === '/api/baixar' && req.method === 'POST') {
    // Exige JSON — força preflight em chamadas cross-site (anti-CSRF por form).
    if (!String(req.headers['content-type'] || '').includes('application/json'))
      return enviarJson(res, 415, { erro: 'Content-Type deve ser application/json' }, req);
    const b = await lerBody(req);
    const chaves = [...new Set((b.chaves || []).map(soDigitos).filter((c) => c.length === 44))];
    const uf = String(b.uf || '').toUpperCase();
    const cUFAutor = UF_CODES[uf];
    const tpAmb = Number(b.tpAmb) === 2 ? 2 : 1;
    const destino = b.destino && String(b.destino).trim() ? String(b.destino).trim() : join(AQUI, 'XMLs');

    if (chaves.length === 0) return enviarJson(res, 400, { erro: 'nenhuma chave válida (44 dígitos)' }, req);
    if (!cUFAutor) return enviarJson(res, 400, { erro: 'UF do autor inválida' }, req);
    if (b.destino && !caminhoLocalValido(destino))
      return enviarJson(res, 400, { erro: 'pasta de destino inválida (sem UNC/rede)' }, req);

    // Resolve o material do certificado: thumbprint (store) ou arquivo .pfx.
    let pfxBuf;
    let passphrase;
    let cnpj = soDigitos(b.cnpj);
    let limparTemp = () => {};
    try {
      if (b.thumbprint) {
        const exp = exportarPfxTemporario(b.thumbprint);
        pfxBuf = readFileSync(exp.pfxPath);
        passphrase = exp.passphrase;
        limparTemp = exp.limpar;
        if (!cnpj) {
          const c = listarCertificadosWindows().find((x) => x.thumbprint === b.thumbprint);
          cnpj = soDigitos(c?.cnpj);
        }
      } else if (b.pfxPath) {
        if (!caminhoLocalValido(b.pfxPath) || !/\.(pfx|p12)$/i.test(b.pfxPath))
          return enviarJson(res, 400, { erro: 'caminho .pfx inválido (sem UNC/rede; extensão .pfx/.p12)' }, req);
        if (!existsSync(b.pfxPath)) return enviarJson(res, 400, { erro: 'arquivo .pfx não encontrado' }, req);
        pfxBuf = readFileSync(b.pfxPath);
        passphrase = String(b.senha || '');
      } else {
        return enviarJson(res, 400, { erro: 'escolha um certificado ou informe um .pfx' }, req);
      }
    } catch (e) {
      return enviarJson(res, 400, { erro: `falha ao preparar certificado: ${e.message}` }, req);
    }

    if (!cnpj || cnpj.length !== 14) {
      limparTemp();
      return enviarJson(res, 400, { erro: 'CNPJ do autor não identificado — informe no campo CNPJ' }, req);
    }

    if (!existsSync(destino)) mkdirSync(destino, { recursive: true });

    const resultados = [];
    for (const chNFe of chaves) {
      // eslint-disable-next-line no-await-in-loop -- SEFAZ é sequencial por autor
      resultados.push(await baixarChave({ chNFe, cUFAutor, tpAmb, cnpj, pfxBuf, passphrase, destino }));
    }
    limparTemp();

    const ok = resultados.filter((r) => r.status === 'ok').length;
    return enviarJson(res, 200, { destino, baixadas: ok, total: chaves.length, resultados }, req);
  }

  enviarJson(res, 404, { erro: 'rota não encontrada' }, req);
});

function servir(escondido) {
  if (escondido) logarEmArquivo();
  server.on('error', (e) => {
    // Já tem um agente nesta porta (aberto pelo protocolo duas vezes, ou pelo logon): sai calado.
    if (e.code === 'EADDRINUSE') process.exit(0);
    console.error('servidor', e.message);
    process.exit(1);
  });
  server.listen(PORT, '127.0.0.1', () => {
    if (escondido) return console.log(`agente ${VERSAO} em http://localhost:${PORT}`);
    const linha = `  Agente GoGroup ${VERSAO} rodando em  http://localhost:${PORT}  `;
    const borda = '─'.repeat(linha.length);
    console.log(`\n┌${borda}┐\n│${linha}│\n└${borda}┘`);
    console.log(EH_WINDOWS ? '  Modo Windows: lê os certificados instalados.' : '  Fora do Windows: use um arquivo .pfx.');
    console.log('  Abra o endereço acima no navegador. Ctrl+C para parar.\n');
  });
}

async function principal() {
  const argumentos = process.argv.slice(2);
  if (argumentos.includes('--desinstalar')) return desinstalar();
  if (argumentos.includes('--servico')) return servir(true);
  if (EH_WINDOWS && ehExecutavelEmpacotado()) {
    // Duplo clique no já instalado: sobe escondido e some.
    if (process.execPath.toLowerCase() === EXE_INSTALADO.toLowerCase()) return iniciarEscondido();
    // Duplo clique no instalador baixado.
    try {
      return await instalar();
    } catch (e) {
      console.error(`\n  Falha ao instalar: ${e.message}\n  Rodando nesta janela mesmo.\n`);
    }
  }
  servir(false);
}

principal();
