@echo off
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set ANDROID_HOME=C:\Users\DELL\AppData\Local\Android\Sdk
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%
cd /d C:\Users\DELL\Desktop\crime-app\android
call .\gradlew.bat assembleDebug -x lint -x test 2>&1
echo BUILD_EXIT_CODE:%ERRORLEVEL%
