@echo off
cls
echo.
echo ================================================================
echo   ASISTENTE DE DESPLIEGUE - 100 ThingsToDo
echo ================================================================
echo.
echo [1] Verificando proyecto...
cd /d "D:\Projects\100 ThingsToDo"
if not exist "public\index.html" (
    echo [ERROR] No se encuentra el proyecto.
    pause
    exit /b
)
echo [OK] Proyecto encontrado.
echo.
echo [2] Preparando archivos para commit...
git add .
echo.
set /p msg="Mensaje de commit: "
if "%msg%"=="" (
    echo [ERROR] Debes ingresar un mensaje.
    pause
    exit /b
)
echo.
echo [3] Haciendo commit...
git commit -m "%msg%"
echo.
echo [4] Subiendo a GitHub...
git push origin main
echo.
echo [5] Desplegar a Firebase? (S/N)
set /p deploy=""
if /i "%deploy%"=="S" (
    echo Desplegando...
    firebase deploy --only hosting --project thingstodo-2772c
)
echo.
echo [COMPLETADO]
pause
