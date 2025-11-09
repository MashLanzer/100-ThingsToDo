@echo off
:: =================================================================
:: SCRIPT DE DESPLIEGUE COMPLETO
:: Proyecto: 100 ThingsToDo
:: =================================================================

:: --- CONFIGURACION DIRECTA ---
set "PROJECT_PATH=D:\Projects\100 ThingsToDo"
set "GIT_BRANCH=main"
set "FIREBASE_PROJECT=thingstodo-2772c"
set "GIT_REMOTE=https://github.com/MashLanzer/100-ThingsToDo.git"

setlocal
:: --- INICIO DEL PROCESO ---
TITLE Asistente de Despliegue - %FIREBASE_PROJECT%
color 0F
cls

echo.
echo  =================================================================
echo    ASISTENTE DE DESPLIEGUE - %FIREBASE_PROJECT%
echo  =================================================================
echo.

:: --- PASO 1: VALIDACION DE RUTA ---
echo [PASO 1] Validando ruta del proyecto...

cd /d "%PROJECT_PATH%"
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] No se pudo encontrar la ruta del proyecto: "%PROJECT_PATH%".
    goto :END
)

echo [OK] Ruta del proyecto validada.

:: --- PASO 2: INICIALIZAR GIT SI NO EXISTE ---
echo.
echo [PASO 2] Verificando repositorio Git...

if not exist ".git" (
    echo [INFO] Repositorio Git no encontrado. Inicializando...
    git init
    git remote add origin %GIT_REMOTE%
    git fetch origin
    git checkout -b %GIT_BRANCH%
    git branch --set-upstream-to=origin/%GIT_BRANCH% %GIT_BRANCH%
    echo [OK] Repositorio Git inicializado y vinculado.
) else (
    echo [OK] Repositorio Git encontrado.
)

:: --- PASO 3: COMPROBANDO CAMBIOS ---
echo.
echo [PASO 3] Comprobando cambios locales...

git status --short > nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] No se pudo ejecutar git status.
    goto :END
)

git diff-index --quiet HEAD --
if %errorlevel%==0 (
    echo [INFO] No hay cambios locales para guardar.
    goto :SYNC_REMOTE
)

echo [INFO] Se detectaron cambios locales.
echo.
echo  ------------------- CAMBIOS DETECTADOS -------------------
git status -s
echo  ----------------------------------------------------------
echo.

set /p COMMIT_MSG=[ACCION] Describe los cambios para el commit: 
if not defined COMMIT_MSG (
    color 0C
    echo [INFO] Proceso cancelado. No se especifico mensaje de commit.
    goto :END
)

echo.
echo [INFO] Guardando cambios: "%COMMIT_MSG%"
git add .
git commit -m "%COMMIT_MSG%"
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] El commit fallo.
    goto :END
)

:: --- PASO 4: SINCRONIZACION CON GITHUB ---
:SYNC_REMOTE
echo.
echo [PASO 4] Sincronizando con GitHub...

echo [INFO] Descargando cambios remotos...
git pull origin %GIT_BRANCH% --rebase
if %errorlevel% neq 0 (
    color 0E
    echo [ADVERTENCIA] git pull tuvo conflictos. Resuelve manualmente.
    goto :END
)

echo.
echo [INFO] Subiendo cambios a GitHub...
git push origin %GIT_BRANCH%
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] git push fallo.
    goto :END
)

echo [OK] Cambios sincronizados con GitHub.

:: --- PASO 5: DESPLIEGUE EN FIREBASE ---
echo.
echo [PASO 5] Preparando despliegue a Firebase...
echo.
set /p DEPLOY_CONFIRM=[ACCION] ¿Desplegar a Firebase '%FIREBASE_PROJECT%'? (S/N): 
if /i not "%DEPLOY_CONFIRM%"=="S" (
    echo [INFO] Despliegue cancelado.
    goto :END
)

echo.
echo [INFO] Desplegando a Firebase Hosting...
firebase deploy --only hosting --project %FIREBASE_PROJECT%
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] El despliegue a Firebase fallo.
    goto :END
)

echo.
color 0A
echo  =================================================================
echo    [EXITO] ¡Despliegue completado!
echo    
echo    GitHub: https://github.com/MashLanzer/100-ThingsToDo
echo    Firebase: https://%FIREBASE_PROJECT%.web.app
echo  =================================================================

:: --- FINALIZACION ---
:END
echo.
echo Proceso finalizado.
pause
endlocal


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
