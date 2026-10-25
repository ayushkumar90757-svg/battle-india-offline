@echo off
title Battle India Offline - Build APK
echo ========================================================
echo        BATTLE INDIA OFFLINE - ANDROID APK BUILDER
echo ========================================================
echo.
echo [1/3] Building optimized web bundle...
call npm run build
echo.
echo [2/3] Syncing assets to native Android project...
call npx cap sync android
echo.
echo [3/3] Checking build environment...

where javac >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo -------------------------------------------------------------
    echo NOTE: Java JDK 17 / Android SDK is required to compile locally.
    echo.
    echo OPTION A (Android Studio):
    echo Run: npx cap open android
    echo Then click: Build > Build Bundle(s) / APK(s) > Build APK(s)
    echo.
    echo OPTION B (GitHub Actions Cloud - No install needed):
    echo Push to GitHub to get your downloadable APK automatically!
    echo -------------------------------------------------------------
    echo.
) else (
    echo Java detected! Compiling APK via Gradle...
    cd android
    call gradlew.bat assembleDebug
    cd ..
    if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
        echo.
        echo ========================================================
        echo SUCCESS! APK GENERATED AT:
        echo android\app\build\outputs\apk\debug\app-debug.apk
        echo ========================================================
        explorer "android\app\build\outputs\apk\debug"
    )
)

pause
