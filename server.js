#!/usr/bin/env node
// Agente local de download de XML de NFe — INDEPENDENTE.
// Lê o certificado A1 instalado na máquina (Windows) ou um .pfx apontado,
// faz mTLS com a SEFAZ (NFeDistribuicaoDFe / consChNFe) e salva o XML.
// Só módulos nativos do Node. Escuta só em 127.0.0.1.

import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const PORT = Number(process.env.AGENTE_PORT) || 3131;
const AQUI = dirname(fileURLToPath(import.meta.url));
const EH_WINDOWS = process.platform === 'win32';

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
          'Content-Type': 'application/soap+xml; charset=utf-8',
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

// ---------- HTTP server (só 127.0.0.1) ----------
// A página pública do GoDeploy roda em HTTPS e chama este agente no localhost.
// Só liberamos CORS (+ Private Network Access) para ESSAS origens — senão
// qualquer site que a pessoa abrisse poderia mandar o agente baixar usando o
// certificado instalado (drive-by). Localhost (a própria UI do agente) não
// manda Origin, então não precisa de CORS.
const ORIGENS_PERMITIDAS = new Set([
  'https://chaves-nfe.devgogroup.com',
  'https://c2757aa7.devgogroup.com',
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

// Caminho local seguro: absoluto, sem UNC (\\servidor) nem device path (\\?\).
function caminhoLocalValido(p) {
  const s = String(p || '');
  if (!s || s.startsWith('\\\\') || /^\\\\\?\\/.test(s) || s.includes('\0')) return false;
  return /^[A-Za-z]:[\\/]/.test(s) || s.startsWith('/'); // C:\... ou /... (mac/linux)
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

  if (url.pathname === '/api/certs' && req.method === 'GET') {
    return enviarJson(res, 200, { windows: EH_WINDOWS, certificados: listarCertificadosWindows() }, req);
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

server.listen(PORT, '127.0.0.1', () => {
  const linha = `  Agente de NFe rodando em  http://localhost:${PORT}  `;
  const borda = '─'.repeat(linha.length);
  console.log(`\n┌${borda}┐\n│${linha}│\n└${borda}┘`);
  console.log(EH_WINDOWS ? '  Modo Windows: lê os certificados instalados.' : '  Fora do Windows: use um arquivo .pfx.');
  console.log('  Abra o endereço acima no navegador. Ctrl+C para parar.\n');
});
