# QR Menu - localhost admin panel degisikliklerini GitHub'a aktarir.
# Kullanim:
#   .\guncelle.ps1          (varsayilan mesaj)
#   .\guncelle.ps1 "mesaj"  (ozel mesaj)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }
$root = (Resolve-Path $root).Path

$msg = if ($args.Count -gt 0 -and $args[0]) { $args[0] } else { "menu guncellendi " + (Get-Date -Format 'yyyy-MM-dd HH:mm') }

$git = $null
$gcmd = Get-Command git -ErrorAction SilentlyContinue
if ($gcmd) { $git = $gcmd.Source }
if (-not $git) {
    $cand = @("C:\Program Files\Git\cmd\git.exe", "${env:ProgramFiles(x86)}\Git\cmd\git.exe", "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe")
    $git = $cand | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $git) {
    Write-Host "GIT bulunamadi. Once Git kurun." -ForegroundColor Red
    exit 1
}
if (-not (Test-Path "$root\.git")) {
    Write-Host "Bu klasorde bir git deposu yok: $root" -ForegroundColor Red
    exit 1
}

Push-Location $root
try {
    # 1) Statik kopyayi (docs/) yerel olarak da tazele.
    #    (Gerekmez ama repo her zaman tutarli kalir. CI da zaten yeniden uretir.)
    if (Test-Path "$root\build-static.js") {
        Write-Host "[1/4] docs/ yeniden uretiliyor (node build-static.js)..." -ForegroundColor Cyan
        node build-static.js
        if ($LASTEXITCODE -ne 0) { throw "build-static.js basarisiz oldu" }
    }

    # 2) Degisiklik kontrolu
    $changes = & $git status --porcelain -- data.json docs
    if (-not $changes) {
        Write-Host "Degisiklik yok (data.json ve docs/)." -ForegroundColor Yellow
        Write-Host "(Menuye degisiklik yaptiysaniz once admin panelinde Kaydet'e basin ve sunucunun data.json'a yazmasini bekleyin.)"
        return
    }

    # 3) Ekleyip commit
    Write-Host "[2/4] Degisiklikler:" -ForegroundColor Cyan
    & $git add data.json docs
    & $git status --short
    & $git commit -m $msg
    Write-Host "[3/4] Commit tamam: $msg" -ForegroundColor Green

    # 4) Push
    & $git push
    Write-Host "[4/4] Push tamam!" -ForegroundColor Green
    Write-Host "Site ~1 dk icinde guncellenecek:" -ForegroundColor Cyan
    Write-Host "  https://davutbilge-lang.github.io/qr-menu/" -ForegroundColor White
}
finally {
    Pop-Location
}
