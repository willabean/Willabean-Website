# Image compression for Willabean website.
Add-Type -AssemblyName System.Drawing | Out-Null

$root = (Resolve-Path "$PSScriptRoot\..").Path
$maxEdge = 1600
$jpegQuality = 80

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality, [long]$jpegQuality
)

function Resize-To-Tmp {
  param([string]$inPath, [string]$tmpPath, [int]$maxEdge, [bool]$asJpeg, $jpegCodec, $encParams)
  $orig = [System.Drawing.Image]::FromFile($inPath)
  $w = $orig.Width
  $h = $orig.Height
  $scale = [Math]::Min(1.0, [double]$maxEdge / [Math]::Max($w, $h))
  $newW = [int][Math]::Round($w * $scale)
  $newH = [int][Math]::Round($h * $scale)
  $bmp = New-Object System.Drawing.Bitmap $newW, $newH
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  if ($asJpeg) { $g.Clear([System.Drawing.Color]::White) }
  $g.DrawImage($orig, 0, 0, $newW, $newH)
  $g.Dispose()
  if ($asJpeg) {
    $bmp.Save($tmpPath, $jpegCodec, $encParams)
  } else {
    $bmp.Save($tmpPath, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  $bmp.Dispose()
  $orig.Dispose()
}

function Process-File {
  param([System.IO.FileInfo]$file, [bool]$convertPngToJpg, $jpegCodec, $encParams, [int]$maxEdge)
  $sizeBefore = $file.Length
  $isPng = $file.Extension.ToLower() -eq '.png'
  $convertingPng = $convertPngToJpg -and $isPng
  if ($convertingPng) {
    $newPath = [System.IO.Path]::ChangeExtension($file.FullName, '.jpg')
  } else {
    $newPath = $file.FullName
  }
  # Output format: JPG if the destination is .jpg/.jpeg, otherwise PNG.
  $newExt = [System.IO.Path]::GetExtension($newPath).ToLower()
  $asJpeg = ($newExt -eq '.jpg') -or ($newExt -eq '.jpeg')
  $tmp = "$newPath.tmp"
  Resize-To-Tmp -inPath $file.FullName -tmpPath $tmp -maxEdge $maxEdge -asJpeg $asJpeg -jpegCodec $jpegCodec -encParams $encParams
  $tmpSize = (Get-Item $tmp).Length
  if ($tmpSize -lt $sizeBefore -or $convertingPng) {
    if ($convertingPng) {
      Move-Item -Force $tmp $newPath
      if (Test-Path $file.FullName) { Remove-Item $file.FullName }
    } else {
      Move-Item -Force $tmp $newPath
    }
    $sizeAfter = (Get-Item $newPath).Length
    $pct = [Math]::Round(100 - ($sizeAfter / $sizeBefore * 100), 1)
    Write-Output ("  {0}: {1:N0} KB -> {2:N0} KB ({3}% smaller){4}" -f `
      $file.Name, ($sizeBefore/1KB), ($sizeAfter/1KB), $pct, $(if ($convertingPng) { ' [PNG->JPG]' } else { '' }))
  } else {
    Remove-Item $tmp
    Write-Output ("  {0}: skipped (would be larger: {1:N0} KB vs {2:N0} KB)" -f $file.Name, ($tmpSize/1KB), ($sizeBefore/1KB))
  }
}

Write-Output "=== Product PNGs -> JPG ==="
Get-ChildItem -Path "$root\images\products" -Recurse -Filter "*.png" |
  Where-Object { $_.Length -gt 200KB } |
  ForEach-Object { Process-File -file $_ -convertPngToJpg $true -jpegCodec $jpegCodec -encParams $encParams -maxEdge $maxEdge }

Write-Output ""
Write-Output "=== Product JPGs ==="
Get-ChildItem -Path "$root\images\products" -Recurse -Include "*.jpg","*.jpeg" |
  Where-Object { $_.Length -gt 200KB } |
  ForEach-Object { Process-File -file $_ -convertPngToJpg $false -jpegCodec $jpegCodec -encParams $encParams -maxEdge $maxEdge }

Write-Output ""
Write-Output "=== Lifestyle JPGs ==="
Get-ChildItem -Path "$root\images\lifestyle" -Filter "*.jpg" |
  Where-Object { $_.Length -gt 200KB } |
  ForEach-Object { Process-File -file $_ -convertPngToJpg $false -jpegCodec $jpegCodec -encParams $encParams -maxEdge $maxEdge }

Write-Output ""
Write-Output "=== Team JPGs ==="
Get-ChildItem -Path "$root\images\team" -Filter "*.jpg" |
  Where-Object { $_.Length -gt 100KB } |
  ForEach-Object { Process-File -file $_ -convertPngToJpg $false -jpegCodec $jpegCodec -encParams $encParams -maxEdge $maxEdge }

Write-Output ""
Write-Output "Done."
