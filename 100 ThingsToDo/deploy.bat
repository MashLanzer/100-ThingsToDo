@echo off
:: =================================================================
:: SCRIPT DE DESPLIEGUE MEJORADO v2.0
:: Proyecto: 100 ThingsToDo
:: =================================================================
setlocal

:: --- CONFIGURACION ---
:: Lee la configuracion desde un archivo externo para no exponerla aqui.
if not exist "deploy.conf" (
    color 0C
    echo [ERROR] Archivo de configuracion 'deploy.conf' no encontrado.
    echo [ACCION] Por favor, crea el archivo 'deploy.conf' con las siguientes variables:
    echo   set "PROJECT_PATH=D:\Tu\Ruta\Al\Proyecto"
    echo   set "GIT_BRANCH=main"
    echo   set "FIREBASE_PROJECT=tu-id-de-proyecto"
    goto :END
)
call deploy.conf

:: --- INICIO DEL PROCESO ---
TITLE Asistente de Despliegue - %FIREBASE_PROJECT%
color 0F
cls

echo.
echo  =================================================================
echo    ASISTENTE DE DESPLIEGUE - %FIREBASE_PROJECT%
echo  =================================================================
echo.

:: --- PASO 1: VALIDACIONES INICIALES ---
echo [PASO 1] Realizando validaciones iniciales...

:: Validar ruta del proyecto
cd /d "%PROJECT_PATH%"
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] No se pudo encontrar la ruta del proyecto: "%PROJECT_PATH%".
    echo [ACCION] Por favor, corrige la variable 'PROJECT_PATH' en 'deploy.conf'.
    goto :END
)

:: Validar que es un repositorio de Git
if not exist ".git" (
    color 0C
    echo [ERROR] La carpeta no es un repositorio de Git.
    goto :END
)

:: --- PASO 2: COMPROBANDO CAMBIOS ---
echo [PASO 2] Comprobando cambios locales...
git diff-index --quiet --ignore-cr-at-eol HEAD
if %errorlevel%==0 (
    echo [INFO] No hay cambios locales para guardar (commit).
    goto :SYNC_REMOTE
)

echo [INFO] Se han detectado cambios locales.
echo.
echo  ------------------- VISTA PREVIA DE CAMBIOS -------------------
git status -s
echo  ---------------------------------------------------------------
echo.

set /p COMMIT_MSG=[ACCION] Describe los cambios para el commit (o deja en blanco para cancelar): 
if not defined COMMIT_MSG (
    color 0C
    echo [INFO] Proceso cancelado por el usuario. No se hizo commit.
    goto :END
)

echo.
echo [INFO] Guardando cambios con el mensaje: "%COMMIT_MSG%"
git add .
git commit -m "%COMMIT_MSG%"
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] El commit ha fallado. Revisa los mensajes de Git.
    goto :END
)

:: --- PASO 3: SINCRONIZACION CON GITHUB ---
:SYNC_REMOTE
echo.
echo [PASO 3] Sincronizando con el repositorio remoto (%GIT_BRANCH%)...

echo [INFO] Descargando cambios remotos (git pull)...
git pull origin %GIT_BRANCH% --rebase
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] 'git pull' ha fallado. Puede haber un conflicto de fusion.
    echo [ACCION] Resuelve el conflicto manualmente y ejecuta el script de nuevo.
    goto :END
)

echo.
echo [INFO] Subiendo cambios locales (git push)...
git push origin %GIT_BRANCH%
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] La subida a GitHub ('git push') ha fallado.
    goto :END
)

:: --- PASO 4: DESPLIEGUE EN FIREBASE ---
echo.
echo [PASO 4] Preparando despliegue a Firebase...
echo.
set /p DEPLOY_CONFIRM=[ACCION] ¿Desplegar la version actual a '%FIREBASE_PROJECT%'? (S/N): 
if /i not "%DEPLOY_CONFIRM%"=="S" (
    echo.
    echo [INFO] Despliegue cancelado por el usuario.
    goto :END
)

echo.
echo [INFO] Confirmado. Desplegando en Firebase...
firebase deploy --only hosting --project %FIREBASE_PROJECT%
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] El despliegue a Firebase ha fallado. Revisa los mensajes.
    goto :END
)

echo.
color 0A
echo  =================================================================
echo    [EXITO] ¡Despliegue completado correctamente!
echo  =================================================================

:: --- FINALIZACION ---
:END
echo.
echo Proceso finalizado.
pause
endlocal
