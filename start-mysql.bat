@echo off
echo ========================================================
echo   Iniciando MySQL (MariaDB) para Smart Tennis Arena...
echo ========================================================
if not exist "C:\Users\testelab\mysql_data" (
    echo Criando diretorio de dados em C:\Users\testelab\mysql_data...
    mkdir "C:\Users\testelab\mysql_data"
    xcopy /E /I /Y "C:\xampp\mysql\data\*" "C:\Users\testelab\mysql_data"
    attrib -r "C:\Users\testelab\mysql_data\*" /s /d
)

echo Iniciando mysqld na porta 3306...
"C:\xampp\mysql\bin\mysqld.exe" --datadir="C:\Users\testelab\mysql_data" --port=3306 --console
