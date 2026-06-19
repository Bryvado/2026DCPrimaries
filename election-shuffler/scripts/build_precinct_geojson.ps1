$ErrorActionPreference = "Stop"

$SourceUrl = "https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Administrative_Other_Boundaries_WebMercator/MapServer/27/query?where=1%3D1&outFields=*&f=geojson"
$Root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$PrecinctsCsv = Join-Path $Root "data\precincts.csv"
$OutputGeoJson = Join-Path $Root "data\precincts.geojson"

function Get-PidFromName {
    param([object] $Properties)

    $name = ""
    if ($null -ne $Properties.NAME) {
        $name = [string] $Properties.NAME
    } elseif ($null -ne $Properties.name) {
        $name = [string] $Properties.name
    }

    $match = [regex]::Match($name, "\d+")
    if (-not $match.Success) {
        return $null
    }

    return ([int] $match.Value).ToString()
}

$knownPids = @{}
Import-Csv $PrecinctsCsv | ForEach-Object {
    $knownPids[[string] $_.pid] = $true
}

$source = Invoke-RestMethod -Uri $SourceUrl -TimeoutSec 60
$features = New-Object System.Collections.Generic.List[object]
$missingName = 0
$outsideModel = 0

foreach ($feature in $source.features) {
    $precinctId = Get-PidFromName -Properties $feature.properties

    if ($null -eq $precinctId) {
        $missingName += 1
        continue
    }

    if (-not $knownPids.ContainsKey($precinctId)) {
        $outsideModel += 1
        continue
    }

    $name = $feature.properties.NAME
    if ($null -eq $name) {
        $name = $feature.properties.name
    }
    if ($null -eq $name) {
        $name = $precinctId
    }

    $features.Add([ordered]@{
        type = "Feature"
        id = $precinctId
        properties = [ordered]@{
            pid = $precinctId
            name = $name
        }
        geometry = $feature.geometry
    })
}

$matchedPids = @{}
foreach ($feature in $features) {
    $matchedPids[$feature.properties.pid] = $true
}

$missingGeometry = @($knownPids.Keys | Where-Object { -not $matchedPids.ContainsKey($_) } | Sort-Object { [int] $_ })
if ($missingGeometry.Count -gt 0) {
    $preview = ($missingGeometry | Select-Object -First 10) -join ", "
    throw "Missing geometry for $($missingGeometry.Count) precinct(s): $preview"
}

$sortedFeatures = @($features | Sort-Object { [int] $_.properties.pid })
$geojson = [ordered]@{
    type = "FeatureCollection"
    name = "dc_precincts"
    features = $sortedFeatures
}

$json = $geojson | ConvertTo-Json -Depth 100 -Compress
[System.IO.File]::WriteAllText($OutputGeoJson, $json, [System.Text.UTF8Encoding]::new($false))

$relativeOutput = Resolve-Path -Path $OutputGeoJson -Relative
Write-Host "wrote $relativeOutput with $($sortedFeatures.Count) precincts ($missingName without NAME, $outsideModel outside model data)"
