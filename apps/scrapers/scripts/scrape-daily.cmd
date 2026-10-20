@echo off
rem Aggiornamento giornaliero dei volantini dei supermercati preferiti (registrati dall'app in data\tracked.json).
rem Lanciato da Utilità di pianificazione di Windows; l'esito viene aggiunto a data\scrape.log.
setlocal
cd /d "%~dp0.."
if not exist "..\..\data" mkdir "..\..\data"
echo ===== %date% %time% =====>> "..\..\data\scrape.log"
"C:\Program Files\nodejs\node.exe" node_modules\tsx\dist\cli.mjs src\run.ts --tracked >> "..\..\data\scrape.log" 2>&1
echo Esito: codice di uscita %errorlevel% >> "..\..\data\scrape.log"
endlocal
