$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Speech

$projectRoot = Split-Path -Parent $PSScriptRoot
$narrationPath = Join-Path $projectRoot "submission\video\narration.txt"
$outputPath = Join-Path $projectRoot "submission\video\narration.wav"

$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $voice.Rate = 1
  $voice.Volume = 100
  $voice.SetOutputToWaveFile($outputPath)
  $voice.Speak([System.IO.File]::ReadAllText($narrationPath))
} finally {
  $voice.Dispose()
}

Write-Output $outputPath
