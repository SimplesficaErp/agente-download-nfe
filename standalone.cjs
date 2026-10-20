// BUNDLE CJS STANDALONE (Node SEA). Gerado automaticamente.
const UI_HTML = "<!doctype html>\n<html lang=\"pt-BR\">\n<head>\n<meta charset=\"utf-8\" />\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n<title>Agente de Download de NFe</title>\n<style>\n  :root {\n    --navy: #0f1b35; --navy-2: #16274a; --gold: #c9a24b; --gold-2: #e3c270;\n    --bg: #f4f6fb; --card: #fff; --ink: #11203d; --muted: #5a6a85; --line: #e2e8f4;\n    --ok: #157347; --ok-bg: #e4f3ea; --warn: #9a6a00; --warn-bg: #fbf1d9;\n    --err: #b42318; --err-bg: #fbe9e7; --shadow: 0 1px 3px rgba(16,32,61,.08), 0 8px 24px rgba(16,32,61,.06);\n  }\n  @media (prefers-color-scheme: dark) { :root:not([data-theme=\"light\"]) {\n    --bg:#0a1223; --card:#10203d; --ink:#e9eefb; --muted:#93a2c2; --line:#23375f;\n    --ok-bg:#11301f; --warn-bg:#2e2410; --err-bg:#311512; } }\n  * { box-sizing: border-box; }\n  body { margin:0; background:var(--bg); color:var(--ink);\n    font:15px/1.5 -apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,sans-serif; }\n  header { background:linear-gradient(135deg,var(--navy),var(--navy-2)); color:#fff;\n    padding:22px 0; border-bottom:3px solid var(--gold); }\n  .wrap { max-width:1000px; margin:0 auto; padding:0 16px; }\n  .brand { display:flex; align-items:center; gap:12px; }\n  .logo { width:38px; height:38px; border-radius:9px; flex:none;\n    background:linear-gradient(135deg,var(--gold),var(--gold-2)); display:grid; place-items:center;\n    color:var(--navy); font-weight:800; font-size:18px; }\n  h1 { font-size:19px; margin:0; } .sub { font-size:12.5px; color:#b9c6e4; margin-top:2px; }\n  main { padding:22px 0 60px; }\n  .panel { background:var(--card); border:1px solid var(--line); border-radius:14px;\n    box-shadow:var(--shadow); padding:18px; margin-bottom:16px; }\n  .panel h2 { font-size:13px; margin:0 0 12px; color:var(--muted);\n    text-transform:uppercase; letter-spacing:.7px; }\n  label { display:block; font-size:12.5px; color:var(--muted); margin:0 0 4px; }\n  .grid { display:grid; grid-template-columns:1fr 120px 160px; gap:12px; }\n  @media (max-width:640px){ .grid { grid-template-columns:1fr; } }\n  select, input, textarea { width:100%; padding:9px 11px; border:1px solid var(--line);\n    border-radius:9px; background:var(--bg); color:var(--ink); font:inherit; }\n  textarea { min-height:120px; resize:vertical; font:13px/1.6 ui-monospace,Menlo,monospace; }\n  .row { display:flex; gap:10px; flex-wrap:wrap; align-items:center; }\n  button { font:inherit; font-weight:650; cursor:pointer; border-radius:9px; border:1px solid transparent;\n    padding:10px 18px; transition:filter .15s; } button:hover{ filter:brightness(1.06); }\n  button:disabled { opacity:.5; cursor:not-allowed; }\n  .btn-primary { background:var(--navy); color:#fff; } .btn-gold { background:var(--gold); color:var(--navy); }\n  .btn-ghost { background:transparent; border-color:var(--line); color:var(--ink); }\n  .btn-sm { padding:6px 12px; font-size:13px; }\n  .seg { display:inline-flex; border:1px solid var(--line); border-radius:9px; overflow:hidden; }\n  .seg button { border-radius:0; border:none; background:var(--card); color:var(--muted); padding:8px 14px; }\n  .seg button.active { background:var(--navy); color:#fff; }\n  table { width:100%; border-collapse:collapse; font-size:13px; }\n  th,td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); }\n  th { font-size:11px; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); }\n  td.chave { font-family:ui-monospace,Menlo,monospace; font-size:11.5px; }\n  .pill { font-size:11px; font-weight:650; padding:3px 9px; border-radius:999px; white-space:nowrap; }\n  .pill.ok { background:var(--ok-bg); color:var(--ok); } .pill.erro { background:var(--err-bg); color:var(--err); }\n  .pill\\.sem-retorno,.pill.sem-retorno { background:var(--warn-bg); color:var(--warn); }\n  .muted { color:var(--muted); font-size:12.5px; } .mono { font-family:ui-monospace,Menlo,monospace; }\n  .note { background:var(--warn-bg); color:var(--warn); border-radius:9px; padding:10px 12px; font-size:13px; margin-bottom:12px; }\n  .hide { display:none; }\n  .toast { position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:var(--navy); color:#fff;\n    padding:11px 18px; border-radius:10px; box-shadow:var(--shadow); opacity:0; transition:opacity .2s; z-index:9; }\n  .toast.show { opacity:1; }\n  .spin { display:inline-block; width:14px; height:14px; border:2px solid rgba(255,255,255,.4);\n    border-top-color:#fff; border-radius:50%; animation:r .7s linear infinite; vertical-align:-2px; }\n  @keyframes r { to { transform:rotate(360deg); } }\n</style>\n</head>\n<body>\n<header><div class=\"wrap brand\">\n  <div class=\"logo\">N</div>\n  <div><h1>Agente de Download de NFe</h1>\n  <div class=\"sub\">Certificado local · SEFAZ · sem guardar nada</div></div>\n</div></header>\n\n<main class=\"wrap\">\n  <div class=\"note\" id=\"note-plat\"></div>\n\n  <div class=\"panel\">\n    <h2>Certificado</h2>\n    <div class=\"seg\" id=\"origem\" style=\"margin-bottom:12px;\">\n      <button data-o=\"store\" class=\"active\">Instalado na máquina</button>\n      <button data-o=\"file\">Arquivo .pfx</button>\n    </div>\n\n    <div id=\"box-store\">\n      <div class=\"row\">\n        <div style=\"flex:1 1 320px;\">\n          <label>Escolha o certificado</label>\n          <select id=\"cert\"></select>\n        </div>\n        <button class=\"btn-ghost btn-sm\" id=\"btn-reload\" style=\"align-self:flex-end;\">Atualizar lista</button>\n      </div>\n    </div>\n\n    <div id=\"box-file\" class=\"hide\">\n      <div class=\"grid\" style=\"grid-template-columns:1fr 200px;\">\n        <div><label>Caminho do arquivo .pfx</label>\n          <input id=\"pfxPath\" class=\"mono\" placeholder=\"C:\\\\certs\\\\empresa.pfx\" /></div>\n        <div><label>Senha do .pfx</label>\n          <input id=\"senha\" type=\"password\" placeholder=\"••••••\" /></div>\n      </div>\n    </div>\n  </div>\n\n  <div class=\"panel\">\n    <h2>Parâmetros</h2>\n    <div class=\"grid\">\n      <div><label>CNPJ do autor (titular do certificado)</label>\n        <input id=\"cnpj\" class=\"mono\" placeholder=\"14 dígitos (auto se detectado)\" /></div>\n      <div><label>UF do autor</label>\n        <select id=\"uf\"></select></div>\n      <div><label>Ambiente</label>\n        <div class=\"seg\" id=\"amb\">\n          <button data-a=\"1\" class=\"active\">Produção</button>\n          <button data-a=\"2\">Homolog.</button>\n        </div></div>\n    </div>\n    <div style=\"margin-top:12px;\"><label>Pasta de destino (vazio = pasta XMLs do agente)</label>\n      <input id=\"destino\" class=\"mono\" placeholder=\"C:\\\\Users\\\\voce\\\\Downloads\\\\XMLs\" /></div>\n  </div>\n\n  <div class=\"panel\">\n    <h2>Chaves (44 dígitos, uma por linha)</h2>\n    <textarea id=\"chaves\" placeholder=\"Cole aqui as chaves de acesso. Pontuação e espaços são ignorados.\"></textarea>\n    <div class=\"row\" style=\"margin-top:12px;\">\n      <button class=\"btn-gold\" id=\"btn-baixar\">Baixar XMLs</button>\n      <span class=\"muted\" id=\"status\"></span>\n    </div>\n  </div>\n\n  <div class=\"panel hide\" id=\"box-result\">\n    <h2 id=\"result-title\">Resultado</h2>\n    <div class=\"muted\" id=\"result-dest\" style=\"margin-bottom:10px;\"></div>\n    <table><thead><tr><th>Chave</th><th>Status</th><th>Detalhe</th></tr></thead>\n      <tbody id=\"result-body\"></tbody></table>\n  </div>\n</main>\n\n<div class=\"toast\" id=\"toast\"></div>\n\n<script>\nconst $ = (s) => document.querySelector(s);\nconst UFS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];\nlet origem = 'store', ambiente = 1;\n\nfunction toast(m){ const t=$('#toast'); t.textContent=m; t.classList.add('show'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),2800); }\n\n$('#uf').innerHTML = '<option value=\"\">—</option>' + UFS.map(u=>`<option>${u}</option>`).join('');\n\n$('#origem').onclick = (e)=>{ const b=e.target.closest('button'); if(!b) return; origem=b.dataset.o;\n  [...$('#origem').children].forEach(x=>x.classList.toggle('active',x===b));\n  $('#box-store').classList.toggle('hide', origem!=='store');\n  $('#box-file').classList.toggle('hide', origem!=='file'); };\n$('#amb').onclick = (e)=>{ const b=e.target.closest('button'); if(!b) return; ambiente=Number(b.dataset.a);\n  [...$('#amb').children].forEach(x=>x.classList.toggle('active',x===b)); };\n\nasync function carregarCerts(){\n  try{\n    const r = await (await fetch('/api/certs')).json();\n    if(!r.windows){\n      $('#note-plat').textContent = 'Fora do Windows: a leitura de certificados instalados não está disponível. Use a opção \"Arquivo .pfx\".';\n      $('#origem').querySelector('[data-o=\"file\"]').click();\n    } else { $('#note-plat').classList.add('hide'); }\n    const sel = $('#cert');\n    if(!r.certificados.length){ sel.innerHTML = '<option value=\"\">Nenhum certificado com chave privada encontrado</option>'; return; }\n    sel.innerHTML = r.certificados.map(c=>{\n      const venc = c.validadeAte ? ' · vence '+c.validadeAte : '';\n      const cj = c.cnpj ? ' · '+c.cnpj : '';\n      return `<option value=\"${c.thumbprint}\" data-cnpj=\"${c.cnpj||''}\">${c.nome}${cj}${venc}</option>`;\n    }).join('');\n    sincronizarCnpj();\n  }catch(e){ toast('Erro ao listar certificados: '+e.message); }\n}\nfunction sincronizarCnpj(){\n  const opt = $('#cert').selectedOptions[0];\n  if(opt && opt.dataset.cnpj && !$('#cnpj').value) $('#cnpj').value = opt.dataset.cnpj;\n}\n$('#cert').onchange = sincronizarCnpj;\n$('#btn-reload').onclick = carregarCerts;\n\n$('#btn-baixar').onclick = async ()=>{\n  const chaves = $('#chaves').value.split(/\\r?\\n/).map(x=>x.replace(/\\D/g,'')).filter(x=>x.length===44);\n  if(!chaves.length) return toast('Cole ao menos uma chave de 44 dígitos.');\n  if(!$('#uf').value) return toast('Escolha a UF do autor.');\n  const payload = { chaves, uf:$('#uf').value, tpAmb:ambiente, cnpj:$('#cnpj').value, destino:$('#destino').value };\n  if(origem==='store'){ payload.thumbprint = $('#cert').value; if(!payload.thumbprint) return toast('Escolha um certificado.'); }\n  else { payload.pfxPath = $('#pfxPath').value; payload.senha = $('#senha').value;\n    if(!payload.pfxPath) return toast('Informe o caminho do .pfx.'); }\n\n  const btn=$('#btn-baixar'); btn.disabled=true;\n  $('#status').innerHTML = '<span class=\"spin\"></span> Consultando a SEFAZ…';\n  try{\n    const r = await fetch('/api/baixar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});\n    const d = await r.json();\n    if(!r.ok) throw new Error(d.erro||('HTTP '+r.status));\n    $('#box-result').classList.remove('hide');\n    $('#result-title').textContent = `Resultado — ${d.baixadas}/${d.total} baixada(s)`;\n    $('#result-dest').innerHTML = 'Salvos em: <span class=\"mono\">'+d.destino+'</span>';\n    $('#result-body').innerHTML = d.resultados.map(x=>\n      `<tr><td class=\"chave\">${x.chave}</td>`+\n      `<td><span class=\"pill ${x.status}\">${x.status}</span></td>`+\n      `<td class=\"muted\">${x.mensagem||''}${x.arquivos?(' · '+x.arquivos.length+' arquivo(s)'):''}</td></tr>`).join('');\n    toast(d.baixadas+' XML(s) baixado(s)');\n  }catch(e){ toast('Erro: '+e.message); }\n  finally{ btn.disabled=false; $('#status').textContent=''; }\n};\n\ncarregarCerts();\n</script>\n</body>\n</html>\n";
// Agente local de download de XML de NFe — INDEPENDENTE.
// Lê o certificado A1 instalado na máquina (Windows) ou um .pfx apontado,
// faz mTLS com a SEFAZ (NFeDistribuicaoDFe / consChNFe) e salva o XML.
// Só módulos nativos do Node. Escuta só em 127.0.0.1.

const { execFileSync } = require('node:child_process');
const { randomBytes, randomUUID } = require('node:crypto');
const { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { createServer } = require('node:http');
const { request: httpsRequest } = require('node:https');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { gunzipSync } = require('node:zlib');

const PORT = Number(process.env.AGENTE_PORT) || 3131;
const AQUI = process.cwd();
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
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(UI_HTML);
    return;
  }

  if (url.pathname === '/api/certs' && req.method === 'GET') {
    return enviarJson(res, 200, { windows: EH_WINDOWS, certificados: listarCertificadosWindows() }, req);
  }

  if (url.pathname === '/api/baixar' && req.method === 'POST') {
    const b = await lerBody(req);
    const chaves = [...new Set((b.chaves || []).map(soDigitos).filter((c) => c.length === 44))];
    const uf = String(b.uf || '').toUpperCase();
    const cUFAutor = UF_CODES[uf];
    const tpAmb = Number(b.tpAmb) === 2 ? 2 : 1;
    const destino = b.destino && String(b.destino).trim() ? String(b.destino).trim() : join(AQUI, 'XMLs');

    if (chaves.length === 0) return enviarJson(res, 400, { erro: 'nenhuma chave válida (44 dígitos)' }, req);
    if (!cUFAutor) return enviarJson(res, 400, { erro: 'UF do autor inválida' }, req);

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
