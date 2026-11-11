# Carga en Vercel (entorno production) las variables de Supabase.
# Las claves las escribís vos en esta ventana: no pasan por ninguna conversación ni quedan en un archivo.
#
#   .\scripts\cargar-env-vercel.ps1
#
# Dónde están: Supabase -> tu proyecto -> Project Settings -> API Keys.

# Vercel escribe su banner de versión por la salida de errores; en PowerShell 5.1 eso
# no debe cortar el script. Se verifica el resultado de cada comando con $LASTEXITCODE.
$ErrorActionPreference = "Continue"
$url = "https://qnlydppzwskamjytacfm.supabase.co"

function Pedir($nombre) {
  $s = Read-Host -Prompt $nombre -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { return ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)).Trim() }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

function Cargar($nombre, $valor, $secreta) {
  $modo = if ($secreta) { "--sensitive" } else { "--no-sensitive" }
  vercel env add $nombre production --value $valor --force --yes $modo 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR al cargar $nombre (código $LASTEXITCODE)" -ForegroundColor Red
    exit 1
  }
  Write-Host "OK  $nombre"
}

$publishable = Pedir "Publishable key (sb_publishable_...)"
$secret = Pedir "Secret key (sb_secret_...)"

if ($publishable -notlike "sb_publishable_*") { Write-Host "La primera clave tiene que empezar con sb_publishable_" -ForegroundColor Red; exit 1 }
if ($secret -notlike "sb_secret_*") { Write-Host "La segunda clave tiene que empezar con sb_secret_" -ForegroundColor Red; exit 1 }
if ($secret -like "*•*" -or $secret.Length -lt 30) { Write-Host "La secret key parece incompleta o enmascarada. Usá el botón de copiar (los dos cuadraditos) en Supabase." -ForegroundColor Red; exit 1 }

Cargar "NEXT_PUBLIC_SUPABASE_URL" $url $false
Cargar "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" $publishable $false
Cargar "SUPABASE_SECRET_KEY" $secret $true
Write-Host "`nListo. Avisale a Claude que ya están cargadas."
