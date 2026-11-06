@echo off
echo ========================================================
echo   Iniciando MySQL (MariaDB) para Smart Tennis Arena...
echo ========================================================
if not exist "%USERPROFILE%\mysql_data" (
    echo Criando diretorio de dados em %USERPROFILE%\mysql_data...
    mkdir "%USERPROFILE%\mysql_data"
    xcopy /E /I /Y "C:\xampp\mysql\data\*" "%USERPROFILE%\mysql_data"
    attrib -r "%USERPROFILE%\mysql_data\*" /s /d
)

echo Iniciando mysqld na porta 3306...
"C:\xampp\mysql\bin\mysqld.exe" --datadir="%USERPROFILE%\mysql_data" --port=3306 --console
