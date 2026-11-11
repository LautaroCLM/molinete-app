# Conecta Supabase (producción) con una cuenta de Gmail para enviar los emails de Molinete
# (invitaciones, recuperar contraseña y confirmación de cuenta) y aplica las plantillas en español.
#
#   .\scripts\configurar-gmail.ps1
#
# Necesitás: la dirección de Gmail y su "contraseña de aplicación" de 16 letras
# (https://myaccount.google.com/apppasswords, con la verificación en 2 pasos activada).
# La contraseña se escribe acá: no pasa por ninguna conversación ni queda en un archivo.

$ErrorActionPreference = "Continue"

$usuario = (Read-Host -Prompt "Gmail que va a enviar los emails (ej. molinete.app@gmail.com)").Trim()
if ($usuario -notmatch "^[^@\s]+@gmail\.com$") { Write-Host "Tiene que ser una dirección @gmail.com" -ForegroundColor Red; exit 1 }

$s = Read-Host -Prompt "Contraseña de aplicación (16 letras)" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
try { $clave = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
$clave = ($clave -replace "\s", "")   # Google la muestra con espacios
if ($clave.Length -ne 16) { Write-Host "La contraseña de aplicación tiene 16 letras (sin contar los espacios). Esta tiene $($clave.Length)." -ForegroundColor Red; exit 1 }

$env:GMAIL_USER = $usuario
$env:GMAIL_APP_PASSWORD = $clave

Write-Host "`nAplicando la configuración en Supabase..."
npx supabase config push --remote --yes 2>&1 | ForEach-Object { if ($_ -is [System.Management.Automation.ErrorRecord]) { $_.ToString() } else { $_ } } | Select-Object -Last 12
$codigo = $LASTEXITCODE

Remove-Item Env:GMAIL_USER, Env:GMAIL_APP_PASSWORD -ErrorAction SilentlyContinue
if ($codigo -ne 0) { Write-Host "`nERROR: no se pudo aplicar (código $codigo). Copiale a Claude las líneas de arriba." -ForegroundColor Red; exit 1 }
Write-Host "`nListo. Avisale a Claude que ya está configurado." -ForegroundColor Green
