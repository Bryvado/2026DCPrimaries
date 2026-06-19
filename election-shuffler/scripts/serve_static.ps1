param(
    [int] $Port = 8080
)

$ErrorActionPreference = "Stop"

$Root = [System.IO.Path]::GetFullPath((Split-Path -Parent (Split-Path -Parent $PSCommandPath)))
$Server = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$Server.Start()

Write-Host "Serving $Root at http://localhost:$Port/"

$ContentTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css" = "text/css; charset=utf-8"
    ".js" = "application/javascript; charset=utf-8"
    ".csv" = "text/csv; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".geojson" = "application/geo+json; charset=utf-8"
}

function Send-Response {
    param(
        [System.Net.Sockets.NetworkStream] $Stream,
        [int] $Status,
        [string] $ContentType,
        [byte[]] $Body
    )

    $Reason = if ($Status -eq 200) { "OK" } elseif ($Status -eq 403) { "Forbidden" } else { "Not Found" }
    $Headers = "HTTP/1.1 $Status $Reason`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nConnection: close`r`n`r`n"
    $HeaderBytes = [System.Text.Encoding]::ASCII.GetBytes($Headers)
    $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)
    if ($Body.Length -gt 0) {
        $Stream.Write($Body, 0, $Body.Length)
    }
}

try {
    while ($true) {
        $Client = $Server.AcceptTcpClient()
        try {
            $Stream = $Client.GetStream()
            $Buffer = New-Object byte[] 8192
            $Read = $Stream.Read($Buffer, 0, $Buffer.Length)
            $Request = [System.Text.Encoding]::ASCII.GetString($Buffer, 0, $Read)
            $RequestLine = ($Request -split "`r?`n")[0]
            $Parts = $RequestLine -split " "
            $RequestPath = if ($Parts.Length -ge 2) { $Parts[1] } else { "/" }
            $RequestPath = [System.Uri]::UnescapeDataString(($RequestPath -split "\?")[0].TrimStart("/"))

            if ([string]::IsNullOrWhiteSpace($RequestPath)) {
                $RequestPath = "index.html"
            }

            $FullPath = [System.IO.Path]::GetFullPath((Join-Path $Root $RequestPath))
            if (-not $FullPath.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)) {
                Send-Response $Stream 403 "text/plain; charset=utf-8" ([System.Text.Encoding]::UTF8.GetBytes("Forbidden"))
                continue
            }

            if (-not [System.IO.File]::Exists($FullPath)) {
                Send-Response $Stream 404 "text/plain; charset=utf-8" ([System.Text.Encoding]::UTF8.GetBytes("Not found"))
                continue
            }

            $Extension = [System.IO.Path]::GetExtension($FullPath)
            $ContentType = $ContentTypes[$Extension]
            if ($null -eq $ContentType) {
                $ContentType = "application/octet-stream"
            }

            Send-Response $Stream 200 $ContentType ([System.IO.File]::ReadAllBytes($FullPath))
        }
        finally {
            $Client.Close()
        }
    }
}
finally {
    $Server.Stop()
}
