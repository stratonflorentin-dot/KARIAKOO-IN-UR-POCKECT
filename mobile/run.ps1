param(
  [ValidateSet('customer', 'seller', 'rider')]
  [string]$App = 'customer'
)

$ErrorActionPreference = 'Stop'
$appDir = Join-Path $PSScriptRoot "apps/kariakoo_$App"
$localConfig = Join-Path $PSScriptRoot '.env.local'
if (Test-Path -LiteralPath $localConfig) {
  foreach ($line in Get-Content -LiteralPath $localConfig) {
    if ($line -match '^\s*([A-Z0-9_]+)=(.*)$') {
      $name = $Matches[1]
      $value = $Matches[2].Trim().Trim('"').Trim("'")
      if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) {
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
      }
    }
  }
}

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
  $flutterCommand = Get-Command flutter -ErrorAction SilentlyContinue
  if ($flutterCommand) {
    & $flutterCommand.Source run @defines
  } else {
    $flutterCandidates = @(
      (if ($env:FLUTTER_ROOT) { Join-Path $env:FLUTTER_ROOT 'bin\flutter.bat' }),
      'D:\tools\flutter\bin\flutter.bat',
      'D:\flutter\bin\flutter.bat'
    ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
    if (-not $flutterCandidates) {
      throw 'Flutter was not found on PATH, under FLUTTER_ROOT, or at the usual D: drive locations.'
    }
    & $flutterCandidates[0] run @defines
  }
} finally {
  Pop-Location
}
