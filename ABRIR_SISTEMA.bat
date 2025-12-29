@echo off
start cmd /k "node server.js"
timeout /t 3
start http://localhost:3000
exit