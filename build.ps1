<#
    build.ps1

    Concatenates the modules in src/ into a single userscript,
    validates the resulting JavaScript syntax, writes the compiled
    script to dist/canvasdatechecker.user.js and copies its text to
    the clipboard so it can be pasted into the Tampermonkey editor.

    Usage:
        .\build.ps1
#>

$ErrorActionPreference = 'Stop'

$root       = $PSScriptRoot
$srcDir     = Join-Path $root 'src'
$distDir    = Join-Path $root 'dist'
$outFile    = Join-Path $distDir 'canvasdatechecker.user.js'
$checkFile  = Join-Path $distDir '.canvasdatechecker.check.js'

$modules = @(
    'main.js'
    'config.js'
    'api.js'
    'dates.js'
    'audit.js'
    'course.js'
    'modules.js'
    'csv.js'
    'ui.js'
    'start.js'
)

# 1. Read every module.
$parts = foreach ($module in $modules) {

    $path = Join-Path $srcDir $module

    if (-not (Test-Path -LiteralPath $path)) {
        throw "Missing source module: $path"
    }

    (Get-Content -LiteralPath $path -Raw).TrimEnd()
}

$scriptText = ($parts -join "`r`n`r`n") + "`r`n"

# 2. Make sure dist exists.
New-Item -ItemType Directory -Path $distDir -Force | Out-Null

# 3. Validate the syntax on a scratch file first.
Set-Content -LiteralPath $checkFile -Value $scriptText -Encoding utf8 -NoNewline

node --check $checkFile

if ($LASTEXITCODE -ne 0) {
    Remove-Item -LiteralPath $checkFile -Force
    throw 'Syntax validation failed; no output written and clipboard untouched.'
}

# 4. Promote the validated file to the real output.
Move-Item -LiteralPath $checkFile -Destination $outFile -Force

# 5. Put the contents on the clipboard.
Set-Clipboard -Value $scriptText

$lineCount = ($scriptText -split "`r?`n").Count
$byteCount = [System.Text.Encoding]::UTF8.GetByteCount($scriptText)

Write-Host "OK: $outFile"
Write-Host "    $lineCount lines, $byteCount bytes"
Write-Host '    Script text is on the clipboard - paste it into Tampermonkey.'
