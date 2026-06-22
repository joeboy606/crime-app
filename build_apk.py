import zipfile, os, sys, shutil

tmp = r"C:\Users\DELL\AppData\Local\Temp\apk_patch_clean"
orig_apk = r"C:\Users\DELL\Desktop\crime-app\android\app\build\outputs\apk\debug\app-debug.apk"
out_apk = r"C:\Users\DELL\Desktop\crime-app\android\app\build\outputs\apk\debug\app-patched.apk"
dist = r"C:\Users\DELL\Desktop\crime-app\dist"

# Clean temp
if os.path.exists(tmp):
    shutil.rmtree(tmp)

# Extract original APK
print("Extracting original APK...")
with zipfile.ZipFile(orig_apk, 'r') as zf:
    zf.extractall(tmp)

# Remove old signing and assets
shutil.rmtree(os.path.join(tmp, "META-INF"), ignore_errors=True)
shutil.rmtree(os.path.join(tmp, "assets", "_expo"), ignore_errors=True)
shutil.rmtree(os.path.join(tmp, "assets", "assets"), ignore_errors=True)

# Replace the old JS bundle with the new Hermes bytecode
old_bundle = os.path.join(tmp, "assets", "index.android.bundle")
new_hbc_dir = os.path.join(dist, "_expo", "static", "js", "android")
hbc_files = [f for f in os.listdir(new_hbc_dir) if f.endswith(".hbc")]
if hbc_files and os.path.exists(old_bundle):
    new_hbc = os.path.join(new_hbc_dir, hbc_files[0])
    shutil.copy2(new_hbc, old_bundle)
    print(f"Replaced index.android.bundle with {hbc_files[0]}")

old_config = os.path.join(tmp, "assets", "app.config")
if os.path.exists(old_config):
    os.remove(old_config)

# Copy new assets from dist
dist_expo = os.path.join(dist, "_expo")
if os.path.exists(dist_expo):
    target = os.path.join(tmp, "assets", "_expo")
    if os.path.exists(target):
        shutil.rmtree(target)
    shutil.copytree(dist_expo, target)

dist_assets = os.path.join(dist, "assets")
if os.path.exists(dist_assets):
    target = os.path.join(tmp, "assets", "assets")
    if os.path.exists(target):
        shutil.rmtree(target)
    shutil.copytree(dist_assets, target)

dist_meta = os.path.join(dist, "metadata.json")
if os.path.exists(dist_meta):
    shutil.copy2(dist_meta, os.path.join(tmp, "assets", "app.config"))

# Verify resources.arsc is in the extracted directory
arsc_path = os.path.join(tmp, "resources.arsc")
if not os.path.exists(arsc_path):
    print("ERROR: resources.arsc not found!")
    sys.exit(1)

print("Creating new APK...")
# Create APK with proper compression:
# - resources.arsc: STORED (uncompressed)
# - All other files: DEFLATED (compressed)
with zipfile.ZipFile(out_apk, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(tmp):
        for fname in files:
            full_path = os.path.join(root, fname)
            arcname = os.path.relpath(full_path, tmp).replace('\\', '/')
            if arcname == "resources.arsc" or arcname.endswith(".so") or arcname.startswith("lib/"):
                zf.write(full_path, arcname, compress_type=zipfile.ZIP_STORED)
            else:
                zf.write(full_path, arcname, compress_type=zipfile.ZIP_DEFLATED)

size = os.path.getsize(out_apk)
print(f"APK created: {size/1024/1024:.1f} MB")

# Verify resources.arsc is stored
with zipfile.ZipFile(out_apk, 'r') as zf:
    info = zf.getinfo("resources.arsc")
    method = "STORED" if info.compress_type == zipfile.ZIP_STORED else "DEFLATED"
    print(f"resources.arsc: {method} ({info.file_size}B -> {info.compress_size}B)")
    
    # List asset entries
    assets = [n for n in zf.namelist() if n.startswith("assets/")]
    print(f"Asset entries: {len(assets)}")
