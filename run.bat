@echo off
:: Navigate to the project directory
cd C:\Users\YourUsername\Documents\checkers-game

:: Add all changes
git add .

:: Commit changes with a generic message
git commit -m "Update checkers project"

:: Push changes to the main branch
git push origin main

:: Notify the user of completion
echo Changes have been pushed to GitHub.
pause
