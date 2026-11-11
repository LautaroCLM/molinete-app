# Carga en Vercel (entorno production) las variables de Supabase.
# Las claves las escribís vos en esta ventana: no pasan por ninguna conversación ni quedan en un archivo.
#
#   .\scripts\cargar-env-vercel.ps1
#
# Dónde están: Supabase -> tu proyecto -> Project Settings -> API Keys.

$ErrorActionPreference = "Stop"
$url = "https://qnlydppzwskamjytacfm.supabase.co"

function Pedir($nombre) {
  $s = Read-Host -Prompt $nombre -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

function Cargar($nombre, $valor) {
  if (-not $valor) { throw "Falta el valor de $nombre" }
  # Reemplaza si ya existía y no guarda el valor en el historial de la terminal
  vercel env rm $nombre production --yes 2>$null | Out-Null
  $valor | vercel env add $nombre production | Out-Null
  Write-Host "OK  $nombre"
}

$publishable = Pedir "Publishable key (sb_publishable_...)"
$secret = Pedir "Secret key (sb_secret_...)"

if ($publishable -notlike "sb_publishable_*") { throw "La primera clave tiene que empezar con sb_publishable_" }
if ($secret -notlike "sb_secret_*") { throw "La segunda clave tiene que empezar con sb_secret_" }

Cargar "NEXT_PUBLIC_SUPABASE_URL" $url
Cargar "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" $publishable
Cargar "SUPABASE_SECRET_KEY" $secret
Write-Host "`nListo. Avisale a Claude que ya están cargadas."
