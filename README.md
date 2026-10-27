# Agente GoGroup (download de NFe + NFS-e Nacional)

> **v0.2.0** — instala sozinho e roda **escondido** no Windows. Duplo clique no
> `agente-gogroup-x64.exe` baixado: ele se copia para `%LOCALAPPDATA%\AgenteGoGroup`, registra o
> protocolo `agente-gogroup://` (os apps abrem o agente com um clique) e a inicialização com o
> Windows, e sobe sem janela. Log em `%LOCALAPPDATA%\AgenteGoGroup\agente.log`.
> Desinstalar: `agente-gogroup.exe --desinstalar`.
>
> Serve os apps `chaves-nfe` (XML de NF-e) e `agente-mkp` (NFS-e dos marketplaces:
> `POST /api/nfse/dfe {cnpj, nsu}` acha o A1 instalado com a raiz do CNPJ, faz mTLS com o ADN e
> devolve o lote). Build: `node build.cjs` no Mac, depois `build-windows.cmd` no Windows.
> Teste: `node --test test/nfse.test.mjs` (ADN falso com mTLS de verdade).

## Agente de Download de NFe (v0.1)

Baixa o XML de NF-e direto da SEFAZ usando o **certificado A1 instalado na máquina**
(ou um arquivo `.pfx`). **Independente** — não guarda certificado, não depende de
nenhum backend. Igual ao modelo do FSist: lista os certificados, você escolhe, baixa.

- Lê os certificados A1 instalados no Windows (loja do usuário).
- Faz a conexão autenticada (mTLS) com o `NFeDistribuicaoDFe` da SEFAZ.
- Baixa por chave (consChNFe) e salva o XML numa pasta local.
- Serve a própria interface em `http://localhost:3131` — sem CORS, sem nuvem.

## Requisitos
- **Node.js 18+** (`node -v`).
- **Windows** para ler os certificados instalados. Em outros sistemas, use um `.pfx`.
- Certificado **A1** com chave exportável (o comum). A3 em token/cartão ainda não.

## Como rodar
```bash
cd agente-nfe
node server.js
```
Abra **http://localhost:3131** no navegador.

Para rodar sem clonar nada, de qualquer pasta:
```bash
node /caminho/para/agente-nfe/server.js
```

## Como usar
1. **Certificado** — "Instalado na máquina" (Windows) e escolha na lista, **ou**
   "Arquivo .pfx" e informe o caminho + senha.
2. **CNPJ do autor** — preenche sozinho quando detectado no certificado; senão digite.
3. **UF do autor** e **Ambiente** (Produção/Homologação).
4. **Pasta de destino** — vazio salva em `agente-nfe/XMLs`.
5. Cole as **chaves** (44 dígitos, uma por linha) e clique **Baixar XMLs**.

## Como funciona (por dentro)
```
Navegador (localhost UI) ──chaves──▶ agente (Node, seu PC)
                                        │ lê/export A1  →  mTLS
                                        ▼
                                      SEFAZ ──docZip(gzip+base64)──▶ XML salvo
```
O certificado nunca sai da sua máquina. Para o certificado da loja do Windows, o
agente faz um export temporário para um `.pfx` (senha aleatória), usa e **apaga**.

## Limites (MVP)
- **A1 apenas.** A3 (token/smartcard) exige assinar via Windows CNG/PKCS#11 — próximo passo.
- **consChNFe** (busca por chave). Retenção SEFAZ de 90 dias; regras de rejeição
  (593 CNPJ-base, 656 consumo indevido) voltam como mensagem no resultado.
- O CNPJ-base do certificado precisa bater com a nota (emitente, destinatário,
  transportador ou autXML) — exigência da SEFAZ.

## Empacotar como .exe (opcional, depois)
Para distribuir sem pedir Node instalado, dá para empacotar com `pkg` ou o
`--experimental-sea` do Node, ou embrulhar numa bandeja (tray) com Electron/Tauri.
```
