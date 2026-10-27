@echo off
rem Gera os executaveis do Agente GoGroup (Node SEA) no Windows. Uso: build-windows.cmd
rem Precisa: Node nativo no PATH (gera o ARM64) e um node.exe x64 em NODE_X64 (gera o x64).
rem O blob do SEA tem que ser gerado pela MESMA versao do Node que vai dentro do .exe.
setlocal
set ORIG=%~dp0
if "%NODE_X64%"=="" set NODE_X64=C:\agente-nfe\node-x64.exe
set B=%TEMP%\agente-gogroup-build
if not exist "%B%" mkdir "%B%"
copy /Y "%ORIG%standalone.cjs" "%B%\" >nul
copy /Y "%ORIG%sea-config.json" "%B%\" >nul
cd /d "%B%"
set FUSE=NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
node --experimental-sea-config sea-config.json || exit /b 1
copy /Y "%ProgramFiles%\nodejs\node.exe" agente-gogroup-arm64.exe >nul
call npx --yes postject@1.0.0-alpha.6 agente-gogroup-arm64.exe NODE_SEA_BLOB sea-prep.blob --sentinel-fuse %FUSE% --overwrite || exit /b 1
"%NODE_X64%" --experimental-sea-config sea-config.json || exit /b 1
copy /Y "%NODE_X64%" agente-gogroup-x64.exe >nul
call npx --yes postject@1.0.0-alpha.6 agente-gogroup-x64.exe NODE_SEA_BLOB sea-prep.blob --sentinel-fuse %FUSE% --overwrite || exit /b 1
copy /Y agente-gogroup-arm64.exe "%ORIG%" >nul
copy /Y agente-gogroup-x64.exe "%ORIG%" >nul
echo OK
