@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 변경 사항을 GitHub에 올리는 중...
git add -A
git commit -q -m "몽글 투두 업데이트"
git push origin main
if errorlevel 1 (echo. & echo 올리기에 실패했어요. 이 창을 캡처해서 Claude에게 보여주세요.) else (echo. & echo 다 올렸어요! 몇 분 뒤 자동으로 앱과 웹이 만들어져요.)
pause
