# Willabean — Shopify variant import builder
# ===========================================
# Reads the existing products export and emits a new CSV that:
#   * Replaces existing variants on the kept Buckle/single products with
#     standardised Width x Fastening variants (collars), Length variants
#     (leads), or single variant (Henry, Mud Daddy).
#   * Preserves Title, Body (HTML), Tags, Images, SEO, metafields, etc.
#     so the import doesn't blank existing content.
#   * Skips Clasp duplicates and Norman — those are archived manually.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/build-shopify-import.ps1
#
# Inputs:  C:\Users\jonan\Downloads\products_export_1.csv  (export from Shopify admin)
# Outputs: scripts/products_import.csv                     (ready to upload)

$ErrorActionPreference = 'Stop'

$exportPath = 'C:\Users\jonan\Downloads\products_export_1.csv'
$outPath    = Join-Path $PSScriptRoot 'products_import.csv'

if (-not (Test-Path $exportPath)) {
  Write-Host "Export CSV not found at $exportPath" -ForegroundColor Red
  exit 1
}

$src = Import-Csv $exportPath
$srcByHandle = $src | Group-Object Handle

# ------- Product spec table (the new structure we're imposing) -------
# basePence is the price for the cheapest variant (16mm Buckle / 1.2m / sole variant).
# kind drives the variant cross-product:
#   collar-wf : Width x Fastening
#   collar-w  : Width only
#   collar-f  : Fastening only
#   lead-l    : Length only
#   single    : single variant, no axes
$spec = @(
  @{ handle='the-bertie-dog-collar';        kind='collar-w';   basePence=1500 }
  @{ handle='the-hugo-dog-collar';          kind='collar-wf';  basePence=1500 }
  @{ handle='the-walter-dog-collar';        kind='collar-f';   basePence=2200 }
  @{ handle='the-winnie-dog-collar';        kind='collar-wf';  basePence=2200 }
  @{ handle='the-mabel-dog-collar';         kind='collar-wf';  basePence=2400 }
  @{ handle='the-willow-dog-slip-collar';   kind='collar-w';   basePence=2600 }
  @{ handle='the-archie-dog-collar';        kind='collar-wf';  basePence=2800 }
  @{ handle='the-hugo-dog-lead';            kind='lead-l';     basePence=1500 }
  @{ handle='the-winnie-dog-lead';          kind='lead-l';     basePence=2200 }
  @{ handle='the-mabel-dog-lead';           kind='lead-l';     basePence=3000 }
  @{ handle='the-archie-dog-lead';          kind='lead-l';     basePence=2500 }
  @{ handle='the-henry-traffic-handle';     kind='single';     basePence=1200 }
  @{ handle='5l-mud-daddy';                 kind='single';     basePence=4250 }
)

function Format-Price([int]$pence) {
  return ('{0:F2}' -f ($pence / 100.0))
}

# Build the variant rows (Option1/Option2 pairs and prices) for a given spec entry.
# Returns an array of hashtables: @{ Opt1Name, Opt1Value, Opt2Name, Opt2Value, Price }
function Build-Variants($entry) {
  $base   = [int]$entry.basePence
  $widths = @(
    @{ value='16mm'; add=0   }
    @{ value='20mm'; add=400 }
  )
  $fastenings = @(
    @{ value='Buckle'; add=0   }
    @{ value='Clasp';  add=100 }
  )
  $lengths = @(
    @{ value='1.2 m'; add=0   }
    @{ value='1.5 m'; add=300 }
    @{ value='1.8 m'; add=600 }
  )

  $out = @()
  switch ($entry.kind) {
    'collar-wf' {
      foreach ($w in $widths) {
        foreach ($f in $fastenings) {
          $out += @{
            Opt1Name='Width'; Opt1Value=$w.value
            Opt2Name='Fastening'; Opt2Value=$f.value
            PricePence = $base + $w.add + $f.add
          }
        }
      }
    }
    'collar-w' {
      foreach ($w in $widths) {
        $out += @{
          Opt1Name='Width'; Opt1Value=$w.value
          Opt2Name=''; Opt2Value=''
          PricePence = $base + $w.add
        }
      }
    }
    'collar-f' {
      foreach ($f in $fastenings) {
        $out += @{
          Opt1Name='Fastening'; Opt1Value=$f.value
          Opt2Name=''; Opt2Value=''
          PricePence = $base + $f.add
        }
      }
    }
    'lead-l' {
      foreach ($l in $lengths) {
        $out += @{
          Opt1Name='Length'; Opt1Value=$l.value
          Opt2Name=''; Opt2Value=''
          PricePence = $base + $l.add
        }
      }
    }
    'single' {
      $out += @{
        Opt1Name='Title'; Opt1Value='Default Title'
        Opt2Name=''; Opt2Value=''
        PricePence = $base
      }
    }
  }
  return ,$out
}

# ------- Build the import rows -------
$importRows = @()

foreach ($entry in $spec) {
  $group = $srcByHandle | Where-Object { $_.Name -eq $entry.handle }
  if (-not $group) {
    Write-Host "  [skip] $($entry.handle) not found in export" -ForegroundColor Yellow
    continue
  }
  $srcRows  = $group.Group
  $primary  = $srcRows[0]   # main product row carries Title/Body/SEO/etc.
  $imageRows = $srcRows | Where-Object { $_.'Image Src' -and $_.'Image Src' -ne '' }

  $variants = Build-Variants $entry

  for ($vi = 0; $vi -lt $variants.Count; $vi++) {
    $v   = $variants[$vi]
    $row = [ordered]@{}

    # Copy every column from the primary (preserves Title, Body, Tags, SEO, metafields…)
    foreach ($col in $primary.PSObject.Properties.Name) {
      $row[$col] = $primary.$col
    }

    # On the FIRST variant row keep Title/Body/SEO/etc.
    # On subsequent variant rows, blank out everything except Handle + variant fields,
    # which is how Shopify's CSV format expresses additional variants.
    if ($vi -gt 0) {
      $keep = @('Handle')
      foreach ($col in $primary.PSObject.Properties.Name) {
        if ($keep -notcontains $col) {
          $row[$col] = ''
        }
      }
    }

    # Stamp the variant fields
    $row['Option1 Name']  = $v.Opt1Name
    $row['Option1 Value'] = $v.Opt1Value
    $row['Option2 Name']  = $v.Opt2Name
    $row['Option2 Value'] = $v.Opt2Value
    $row['Option3 Name']  = ''
    $row['Option3 Value'] = ''
    $row['Variant Price'] = Format-Price $v.PricePence
    $row['Variant Compare At Price'] = ''
    $row['Variant SKU']   = ''  # blank — Shopify will keep existing or auto-generate
    $row['Variant Inventory Tracker']    = 'shopify'
    $row['Variant Inventory Policy']     = 'continue'
    $row['Variant Fulfillment Service']  = 'manual'
    $row['Variant Requires Shipping']    = 'TRUE'
    $row['Variant Taxable']              = 'TRUE'
    $row['Status'] = 'active'

    # On the first row, drop the Image Src so we don't duplicate the first image.
    # The image rows that follow (below) carry the gallery.
    if ($vi -eq 0) {
      # Keep the primary's first image if there is one — that's the variant's main image.
    } else {
      $row['Image Src']      = ''
      $row['Image Position'] = ''
      $row['Image Alt Text'] = ''
    }

    $importRows += [PSCustomObject]$row
  }

  # Re-emit the additional image rows (positions 2+) so the gallery is preserved
  $extraImages = $imageRows | Where-Object { [int]$_.'Image Position' -gt 1 }
  foreach ($img in $extraImages) {
    $row = [ordered]@{}
    foreach ($col in $primary.PSObject.Properties.Name) {
      $row[$col] = ''
    }
    $row['Handle']         = $entry.handle
    $row['Image Src']      = $img.'Image Src'
    $row['Image Position'] = $img.'Image Position'
    $row['Image Alt Text'] = $img.'Image Alt Text'
    $importRows += [PSCustomObject]$row
  }

  Write-Host ("  [ok] {0,-32}  {1} variants" -f $entry.handle, $variants.Count) -ForegroundColor Green
}

# Match the export's column order so Shopify imports happily
$columnOrder = ($src[0].PSObject.Properties.Name)
$importRows | Select-Object $columnOrder | Export-Csv -Path $outPath -NoTypeInformation -Encoding UTF8

Write-Host ""
Write-Host "Wrote: $outPath" -ForegroundColor Cyan
Write-Host "Rows : $($importRows.Count)" -ForegroundColor Cyan
