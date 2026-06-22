@echo off
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set ANDROID_HOME=C:\Users\DELL\AppData\Local\Android\Sdk
set PATH=C:\Program Files\nodejs;%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\build-tools\37.0.0;%PATH%
cd /d C:\Users\DELL\Desktop\crime-app\android
call gradlew.bat assembleDebug -x lint -x test --no-daemon
echo EXIT_CODE=%ERRORLEVEL%
