# Willabean — local preview server (PowerShell, no dependencies)
# Works on any Windows 10/11 machine without installing Python or Node.
# Run with:  powershell -ExecutionPolicy Bypass -File start.ps1

$ErrorActionPreference = 'Stop'
$port = 8000
$root = $PSScriptRoot

# MIME types
$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.htm'  = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.gif'  = 'image/gif'
  '.webp' = 'image/webp'
  '.ico'  = 'image/x-icon'
  '.woff' = 'font/woff'
  '.woff2'= 'font/woff2'
  '.ttf'  = 'font/ttf'
  '.txt'  = 'text/plain; charset=utf-8'
  '.xml'  = 'application/xml; charset=utf-8'
  '.md'   = 'text/markdown; charset=utf-8'
}

# Detect this machine's LAN IPv4 (for previewing on a phone over the same Wi-Fi)
$lanIp = $null
try {
  $lanIp = (Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Dhcp -ErrorAction SilentlyContinue |
            Where-Object { $_.IPAddress -notmatch '^169\.254' -and $_.IPAddress -ne '127.0.0.1' } |
            Select-Object -First 1).IPAddress
  if (-not $lanIp) {
    $lanIp = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
              Where-Object { $_.IPAddress -match '^(192\.168|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)' } |
              Select-Object -First 1).IPAddress
  }
} catch { $lanIp = $null }

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$lanBound = $false
if ($lanIp) {
  try {
    $listener.Prefixes.Add("http://$lanIp`:$port/")
    $listener.Start()
    $lanBound = $true
  }
  catch {
    # LAN binding needs admin privileges. Restart the listener bound to localhost only.
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    try { $listener.Start() } catch {
      Write-Host ""
      Write-Host "Could not start the server on port $port." -ForegroundColor Red
      Write-Host "Something else might already be using it. Close other tools and try again."
      Write-Host ""
      Read-Host "Press Enter to close"
      exit 1
    }
  }
}
else {
  try { $listener.Start() }
  catch {
    Write-Host ""
    Write-Host "Could not start the server on port $port." -ForegroundColor Red
    Write-Host "Something else might already be using it. Close other tools and try again."
    Write-Host ""
    Read-Host "Press Enter to close"
    exit 1
  }
}

Write-Host ""
Write-Host "============================================================"  -ForegroundColor Green
Write-Host "  Willabean - local preview"                                   -ForegroundColor Green
Write-Host "  This computer:  http://localhost:$port"                      -ForegroundColor Green
if ($lanBound) {
  Write-Host "  Phone (Wi-Fi):  http://$lanIp`:$port"                      -ForegroundColor Green
}
elseif ($lanIp) {
  Write-Host ""                                                            -ForegroundColor Yellow
  Write-Host "  To preview on your phone, run start-mobile.bat instead"    -ForegroundColor Yellow
  Write-Host "  (it asks for admin and binds to http://$lanIp`:$port)"    -ForegroundColor Yellow
}
Write-Host "  Leave this window open. Press Ctrl+C to stop."               -ForegroundColor Green
Write-Host "============================================================"  -ForegroundColor Green
Write-Host ""

# Open default browser
Start-Process "http://localhost:$port/"

while ($listener.IsListening) {
  try {
    $context  = $listener.GetContext()
    $request  = $context.Request
    $response = $context.Response

    $urlPath  = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
    if ($urlPath -eq '/' -or $urlPath -eq '') { $urlPath = '/index.html' }

    $filePath = Join-Path $root ($urlPath -replace '^/', '' -replace '/', [IO.Path]::DirectorySeparatorChar)

    # If request is a directory, try index.html inside
    if ((Test-Path $filePath -PathType Container)) {
      $filePath = Join-Path $filePath 'index.html'
    }

    if (Test-Path $filePath -PathType Leaf) {
      $ext = [IO.Path]::GetExtension($filePath).ToLowerInvariant()
      $contentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $bytes = [IO.File]::ReadAllBytes($filePath)

      $response.StatusCode = 200
      $response.ContentType = $contentType
      $response.ContentLength64 = $bytes.Length
      $response.Headers.Add('Cache-Control', 'no-cache')
      $response.OutputStream.Write($bytes, 0, $bytes.Length)

      Write-Host ("  200  {0}" -f $urlPath) -ForegroundColor DarkGreen
    }
    else {
      $response.StatusCode = 404
      $msg = [Text.Encoding]::UTF8.GetBytes("404 - $urlPath")
      $response.ContentType = 'text/plain; charset=utf-8'
      $response.ContentLength64 = $msg.Length
      $response.OutputStream.Write($msg, 0, $msg.Length)
      Write-Host ("  404  {0}" -f $urlPath) -ForegroundColor DarkYellow
    }

    $response.Close()
  }
  catch [System.Net.HttpListenerException] {
    break
  }
  catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
  }
}

$listener.Stop()
