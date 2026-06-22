@echo off
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set ANDROID_HOME=C:\Users\DELL\AppData\Local\Android\Sdk
set PATH=%JAVA_HOME%\bin;C:\Program Files\nodejs;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\build-tools\36.0.0;%PATH%
cd /d C:\Users\DELL\Desktop\crime-app\android
call .\gradlew.bat assembleDebug -x lint -x test --no-daemon 2>&1
echo BUILD_EXIT_CODE:%ERRORLEVEL%
pause
