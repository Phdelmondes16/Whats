@echo off
echo Iniciando a Plataforma Multi Atendimento WhatsApp...
echo.

REM Verificar se o Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Erro: Node.js não encontrado. Por favor, instale o Node.js para continuar.
    echo Visite https://nodejs.org/en/download/ para baixar e instalar.
    pause
    exit /b
)

REM Verificar se as dependências estão instaladas
if not exist node_modules (
    echo Instalando dependências...
    npm install
    if %ERRORLEVEL% neq 0 (
        echo Erro ao instalar dependências.
        pause
        exit /b
    )
)

REM Iniciar o servidor
echo Iniciando o servidor...
node index.js

pause