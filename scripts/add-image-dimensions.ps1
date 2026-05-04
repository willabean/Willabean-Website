# Adds explicit width/height attributes to <img> tags based on each image's
# real dimensions. Fixes Cumulative Layout Shift (CLS) by reserving space
# before images load. Skips tags that already have a width or height.
#
# Usage: powershell -ExecutionPolicy Bypass -File scripts\add-image-dimensions.ps1

Add-Type -AssemblyName System.Drawing | Out-Null

$root = (Resolve-Path "$PSScriptRoot\..").Path
$dimensionCache = @{}
$totalEdits = 0

function Get-Dim {
  param([string]$path)
  if ($dimensionCache.ContainsKey($path)) { return $dimensionCache[$path] }
  if (-not (Test-Path $path)) { return $null }
  try {
    $img = [System.Drawing.Image]::FromFile($path)
    $dim = @{ w = $img.Width; h = $img.Height }
    $img.Dispose()
    $dimensionCache[$path] = $dim
    return $dim
  } catch {
    return $null
  }
}

$htmlFiles = Get-ChildItem -Path $root -Recurse -Filter "*.html" -File |
  Where-Object { $_.FullName -notmatch '\\node_modules\\' -and $_.FullName -notmatch '\\email-templates\\' }

foreach ($file in $htmlFiles) {
  $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
  $content = [System.Text.Encoding]::UTF8.GetString($bytes)
  $original = $content

  # Match <img ... src="..." ...> tags. Use regex with named groups.
  $imgRegex = '<img\b(?<attrs>[^>]*?)>'
  $content = [regex]::Replace($content, $imgRegex, {
    param($m)
    $attrs = $m.Groups['attrs'].Value

    # Skip if already has width or height
    if ($attrs -match '\bwidth\s*=' -or $attrs -match '\bheight\s*=') {
      return $m.Value
    }

    # Extract src
    $srcMatch = [regex]::Match($attrs, 'src\s*=\s*"([^"]+)"')
    if (-not $srcMatch.Success) { return $m.Value }
    $src = $srcMatch.Groups[1].Value

    # Skip data: URLs and external URLs
    if ($src -match '^(data:|https?:|//)') { return $m.Value }

    # Resolve to absolute path
    $relativePath = $src.TrimStart('/')
    $absPath = Join-Path $root $relativePath

    $dim = Get-Dim $absPath
    if ($null -eq $dim) { return $m.Value }

    # Insert width/height after src
    $newAttrs = $attrs -replace '(src\s*=\s*"[^"]+")', ('$1 width="' + $dim.w + '" height="' + $dim.h + '"')
    return "<img$newAttrs>"
  })

  if ($content -ne $original) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($file.FullName, $content, $utf8NoBom)
    $editsInFile = ([regex]::Matches($content, $imgRegex).Count -
                    [regex]::Matches($original, $imgRegex).Count)
    # Count via diff: simpler is to just announce file
    Write-Output ("updated {0}" -f ($file.FullName -replace [regex]::Escape($root), '.'))
    $totalEdits++
  }
}

Write-Output ""
Write-Output "files updated: $totalEdits"
