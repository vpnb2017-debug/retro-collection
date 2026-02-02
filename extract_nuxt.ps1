
$content = Get-Content -Path "debug_search.html" -Raw -Encoding UTF8
if ($content -match "window\.__NUXT__\s*=\s*(.*?);") {
    $matches[1] | Out-File -FilePath "nuxt_debug.js" -Encoding UTF8
    Write-Host "Extracted Nuxt data."
} else {
    Write-Host "Could not find Nuxt data."
}
