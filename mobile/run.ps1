param(
  [ValidateSet('customer', 'seller', 'rider')]
  [string]$App = 'customer'
)

$ErrorActionPreference = 'Stop'
$appDir = Join-Path $PSScriptRoot "apps/kariakoo_$App"

if ([string]::IsNullOrWhiteSpace($env:SUPABASE_KEY)) {
  throw 'Set SUPABASE_KEY to the Supabase sb_publishable_... key before running.'
}
if ([string]::IsNullOrWhiteSpace($env:GOOGLE_SERVER_CLIENT_ID)) {
  throw 'Set GOOGLE_SERVER_CLIENT_ID to the Google Web OAuth client ID before running.'
}

$defines = @(
  "--dart-define=SUPABASE_KEY=$($env:SUPABASE_KEY)"
  "--dart-define=GOOGLE_SERVER_CLIENT_ID=$($env:GOOGLE_SERVER_CLIENT_ID)"
)
$appSpecificIosClientVariable = "GOOGLE_IOS_CLIENT_ID_$($App.ToUpperInvariant())"
$iosClientId = [Environment]::GetEnvironmentVariable($appSpecificIosClientVariable)
if ([string]::IsNullOrWhiteSpace($iosClientId)) {
  $iosClientId = $env:GOOGLE_IOS_CLIENT_ID
}
if (-not [string]::IsNullOrWhiteSpace($iosClientId)) {
  $defines += "--dart-define=GOOGLE_IOS_CLIENT_ID=$iosClientId"
}

Push-Location $appDir
try {
  flutter run @defines
} finally {
  Pop-Location
}
