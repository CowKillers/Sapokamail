@echo off
title US Mailbox - @sapokas.com (Acesso PC e Celular 4G/5G)
echo ========================================================
echo    INICIANDO SISTEMA DE E-MAILS COM ID DOS EUA
echo    Dominio: @sapokas.com
echo    Acesso:  PC + Celular (4G/5G/Wi-Fi)
echo ========================================================
echo.
echo Abrindo o painel no navegador (http://localhost:3000)...
timeout /t 2 /nobreak >nul
start http://localhost:3000
echo.
echo Servidor em execucao. O tunel publico gratuito iniciara automaticamente.
echo Para encerrar, basta fechar esta janela.
node server.js
pause
