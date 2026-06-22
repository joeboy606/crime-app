$apk = "C:\Users\DELL\Desktop\crime-app\app-patched-aligned.apk"
$targetDevice = "059283308A003429"
Write-Host "Watching for phone $targetDevice..."
while ($true) {
    $devices = & cmd /c "adb devices 2>&1"
    if ($devices -match "$targetDevice\s+device") {
        Write-Host "Phone connected! Installing APK..."
        $result = & cmd /c "adb install -r -t `"$apk`" 2>&1"
        if ($LASTEXITCODE -eq 0) {
            Write-Host "SUCCESS: APK installed!"
            break
        } else {
            Write-Host "Install failed, retrying in 5s..."
        }
    }
    Start-Sleep -Seconds 3
}
