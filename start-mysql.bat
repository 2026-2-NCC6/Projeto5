@echo off
echo ========================================================
echo   Iniciando MySQL 8.0 para Smart Tennis Arena...
echo ========================================================
set "MYSQL_BIN=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe"
if not exist "%MYSQL_BIN%" (
    if exist "C:\xampp\mysql\bin\mysqld.exe" (
        set "MYSQL_BIN=C:\xampp\mysql\bin\mysqld.exe"
    )
)

echo Iniciando mysqld com .mysql_data\my.ini na porta 3307...
"%MYSQL_BIN%" --defaults-file="%~dp0.mysql_data\my.ini" --console
