<#
  Compila la app de escritorio de Molinete (Windows) y deja el instalador listo para distribuir.

  Uso (desde la raíz del proyecto):
    .\scripts\publicar-escritorio.ps1 -Notas "Qué cambió en esta versión"

  Antes: subir el número de "version" en desktop\src-tauri\tauri.conf.json y en desktop\src-tauri\Cargo.toml.
  Genera en public\desktop\:
    - Molinete_<version>_x64-setup.exe  y  latest.json  -> los usa el actualizador de las apps ya instaladas
    - Molinete-Setup.exe                                -> el instalador para clientes nuevos
  Después hay que publicar la web (vercel deploy --prod) para que queden en línea.
  La clave de firma vive en %USERPROFILE%\.molinete\updater.key (NO se sube al repositorio: hacé una copia de resguardo).
#>
param([string]$Notas = "Mejoras y correcciones.")

$ErrorActionPreference = "Stop"
$raiz = Split-Path $PSScriptRoot
$conf = Get-Content "$raiz\desktop\src-tauri\tauri.conf.json" -Raw | ConvertFrom-Json
$version = $conf.version
$clave = Join-Path $env:USERPROFILE ".molinete\updater.key"
if (-not (Test-Path $clave)) { throw "Falta la clave de firma: $clave" }

$env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content $clave -Raw).Trim()
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
$env:Path += ";$env:USERPROFILE\.cargo\bin"

Push-Location "$raiz\desktop"
try {
  $ErrorActionPreference = "Continue"
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Falló la compilación (código $LASTEXITCODE)." }
  $ErrorActionPreference = "Stop"
} finally { Pop-Location }

$bundle = "$raiz\desktop\src-tauri\target\release\bundle\nsis"
$exe = Get-ChildItem $bundle -Filter "*_${version}_x64-setup.exe" | Select-Object -First 1
if (-not $exe) { throw "No encontré el instalador de la versión $version en $bundle" }
$sigArchivo = "$($exe.FullName).sig"
if (-not (Test-Path $sigArchivo)) { throw "Falta la firma del instalador: $sigArchivo" }

$destino = "$raiz\public\desktop"
New-Item -ItemType Directory -Force $destino | Out-Null
Copy-Item $exe.FullName "$destino\$($exe.Name)" -Force
Copy-Item $exe.FullName "$destino\Molinete-Setup.exe" -Force

$manifiesto = [ordered]@{
  version  = $version
  notes    = $Notas
  pub_date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  platforms = @{
    "windows-x86_64" = @{
      signature = (Get-Content $sigArchivo -Raw).Trim()
      url       = "https://molinete-pi.vercel.app/desktop/$($exe.Name)"
    }
  }
} | ConvertTo-Json -Depth 5
# UTF-8 sin BOM (el actualizador no lo acepta con BOM)
[System.IO.File]::WriteAllText("$destino\latest.json", $manifiesto, (New-Object System.Text.UTF8Encoding($false)))

Write-Host ""
Write-Host "Listo: versión $version" -ForegroundColor Green
Write-Host "  Instalador para clientes nuevos: $destino\Molinete-Setup.exe"
Write-Host "  Para que las apps instaladas se actualicen: publicá la web (vercel deploy --prod)."
