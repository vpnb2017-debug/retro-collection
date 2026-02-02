$port = 8080
$root = Resolve-Path .
$listener = New-Object System.Net.HttpListener

# Tenta ligar a todas as interfaces (para Mobile)
# Nota: Isto pode requerer Admin em alguns PCs
try {
    $listener.Prefixes.Add("http://*:$port/")
    $listener.Start()
    $url = "http://$(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty IPAddress):$port"
    if (-not $url.Contains(":")) { $url = "http://<O_SEU_IP>:$port" }
    Write-Host "✅ Servidor Online (Acessível na Rede)"
    Write-Host "   PC Local: http://localhost:$port"
    Write-Host "   Mobile:   $url"
} catch {
    # Fallback para localhost (sem admin)
    Write-Warning "Não foi possível abrir a porta para a rede (Requer Admin?)."
    Write-Warning "A iniciar apenas em modo Local (Apenas neste PC)."
    
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    try {
        $listener.Start()
        Write-Host "✅ Servidor Online (Apenas Local)"
        Write-Host "   PC Local: http://localhost:$port"
        Write-Host "⚠️  Para aceder no telemóvel, tente correr o PowerShell como Administrador."
    } catch {
        Write-Error "Falha total ao iniciar servidor: $_"
        exit
    }
}

Write-Host "Pressione Ctrl+C para parar."

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath.TrimStart('/')

        # --- PROXY HANDLER (Fix CORS) ---
        if ($path -eq "proxy") {
            try {
                $targetUrl = $request.QueryString["url"]
                if ([string]::IsNullOrWhiteSpace($targetUrl)) { throw "URL missing" }

                Write-Host "Proxying: $targetUrl"
                
                # Fetch remote image
                $remoteReq = [System.Net.WebRequest]::Create($targetUrl)
                $remoteResp = $remoteReq.GetResponse()
                $stream = $remoteResp.GetResponseStream()

                $response.ContentType = $remoteResp.ContentType
                $response.AddHeader("Access-Control-Allow-Origin", "*")

                $buffer = New-Object byte[] 4096
                while (($count = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
                    $response.OutputStream.Write($buffer, 0, $count)
                }
                
                $response.StatusCode = 200
                $stream.Dispose()
                $remoteResp.Close()
                $response.Close()
                continue
            } catch {
                Write-Host "Proxy Error: $_" -ForegroundColor Red
                $response.StatusCode = 500
                $response.Close()
                continue
            }
        }
        # ---------------------------------

        if ($path -eq "") { $path = "index.html" }
        
        $localPath = Join-Path $root $path
        
        if (Test-Path $localPath -PathType Leaf) {
            $content = [System.IO.File]::ReadAllBytes($localPath)
            
            # Simple Mime Types
            $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
            switch ($ext) {
                ".html" { $response.ContentType = "text/html" }
                ".css"  { $response.ContentType = "text/css" }
                ".js"   { $response.ContentType = "application/javascript" }
                ".json" { $response.ContentType = "application/json" }
                ".png"  { $response.ContentType = "image/png" }
                ".jpg"  { $response.ContentType = "image/jpeg" }
                ".svg"  { $response.ContentType = "image/svg+xml" }
                Default { $response.ContentType = "application/octet-stream" }
            }

            $response.ContentLength64 = $content.Length
            $response.OutputStream.Write($content, 0, $content.Length)
            $response.StatusCode = 200
        } else {
            $response.StatusCode = 404
        }
        $response.Close()
    }
} finally {
    $listener.Stop()
}
