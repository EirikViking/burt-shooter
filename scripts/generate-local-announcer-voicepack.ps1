param(
  [string]$VoiceName = "Microsoft Zira Desktop",
  [string]$Ffmpeg = "ffmpeg"
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Speech

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$missionDir = Join-Path $root "public\audio\voice\mission-control"
$introDir = Join-Path $root "public\audio\voice\nova-swarm"
$tempDir = Join-Path $root "tmp\announcer-voicepack"
New-Item -ItemType Directory -Force -Path $missionDir, $introDir, $tempDir | Out-Null

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice = $synth.GetInstalledVoices() |
  ForEach-Object { $_.VoiceInfo } |
  Where-Object { $_.Name -eq $VoiceName } |
  Select-Object -First 1

if (-not $voice) {
  $voice = $synth.GetInstalledVoices() |
    ForEach-Object { $_.VoiceInfo } |
    Where-Object { $_.Gender -eq [System.Speech.Synthesis.VoiceGender]::Female } |
    Select-Object -First 1
}

if (-not $voice) {
  throw "No local female System.Speech voice is installed."
}

$synth.SelectVoice($voice.Name)
$synth.Volume = 100

$ffmpegCmd = Get-Command $Ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpegCmd) {
  throw "ffmpeg is required to export MP3 voice assets."
}

$lines = @(
  @{ File = "mission-control\mission_control_launch.mp3"; Text = "Nova hot. Swarm hotter."; Rate = 3 },
  @{ File = "mission-control\mission_control_launch_alt01.mp3"; Text = "Cabinet armed. Make it pretty."; Rate = 3 },
  @{ File = "mission-control\mission_control_launch_alt02.mp3"; Text = "First run. Make them nervous."; Rate = 3 },

  @{ File = "mission-control\mission_control_level_start.mp3"; Text = "New wave. Same bad idea."; Rate = 3 },
  @{ File = "mission-control\mission_control_level_start_alt01.mp3"; Text = "Lane is open. Take it."; Rate = 3 },
  @{ File = "mission-control\mission_control_level_start_alt02.mp3"; Text = "Swarm is lining up. Cute."; Rate = 3 },

  @{ File = "mission-control\mission_control_wave_clear.mp3"; Text = "Clean sweep. Keep flirting with danger."; Rate = 2 },
  @{ File = "mission-control\mission_control_wave_clear_alt01.mp3"; Text = "Wave deleted. Score liked that."; Rate = 3 },
  @{ File = "mission-control\mission_control_wave_clear_alt02.mp3"; Text = "That board felt it."; Rate = 3 },

  @{ File = "mission-control\mission_control_boss_inbound.mp3"; Text = "Boss gate open. Try not to blink."; Rate = 2 },
  @{ File = "mission-control\mission_control_boss_inbound_alt01.mp3"; Text = "Big crown incoming. Look sharp."; Rate = 3 },
  @{ File = "mission-control\mission_control_boss_inbound_alt02.mp3"; Text = "The boss wants drama. Deny it."; Rate = 3 },

  @{ File = "mission-control\mission_control_life_low.mp3"; Text = "Hull is thin. You are not."; Rate = 2 },
  @{ File = "mission-control\mission_control_life_low_alt01.mp3"; Text = "One life. Make it gorgeous."; Rate = 2 },
  @{ File = "mission-control\mission_control_life_low_alt02.mp3"; Text = "Careful now, starfighter."; Rate = 2 },

  @{ File = "mission-control\mission_control_powerup.mp3"; Text = "Take the upgrade. Be rude."; Rate = 3 },
  @{ File = "mission-control\mission_control_powerup_alt01.mp3"; Text = "Oh, use that."; Rate = 3 },
  @{ File = "mission-control\mission_control_powerup_alt02.mp3"; Text = "Power is yours. Show off."; Rate = 3 },

  @{ File = "mission-control\mission_control_victory.mp3"; Text = "Boss down. That was stylish."; Rate = 2 },
  @{ File = "mission-control\mission_control_victory_alt01.mp3"; Text = "Crown cracked. Keep the heat."; Rate = 3 },
  @{ File = "mission-control\mission_control_victory_alt02.mp3"; Text = "Pretty wreckage. Next."; Rate = 3 },

  @{ File = "mission-control\mission_control_game_over.mp3"; Text = "One more run. You know you want it."; Rate = 2 },
  @{ File = "mission-control\mission_control_game_over_alt01.mp3"; Text = "Signal lost. Pride intact. Barely."; Rate = 2 },
  @{ File = "mission-control\mission_control_game_over_alt02.mp3"; Text = "Not bad. Not enough."; Rate = 2 },

  @{ File = "mission-control\mission_control_combo_01.mp3"; Text = "That score just got interesting."; Rate = 3 },
  @{ File = "mission-control\mission_control_combo_02.mp3"; Text = "Clean dodge. Filthy score."; Rate = 3 },
  @{ File = "mission-control\mission_control_combo_03.mp3"; Text = "Combo is awake."; Rate = 3 },

  @{ File = "mission-control\mission_control_local_highscore_01.mp3"; Text = "Local board. Name in lights."; Rate = 2 },
  @{ File = "mission-control\mission_control_local_highscore_02.mp3"; Text = "New local mark. Nice trouble."; Rate = 2 },

  @{ File = "mission-control\mission_control_global_highscore_01.mp3"; Text = "Global board. Oh, you earned that."; Rate = 2 },
  @{ File = "mission-control\mission_control_global_highscore_02.mp3"; Text = "That one travels. Global slot secured."; Rate = 2 },

  @{ File = "mission-control\mission_control_personal_best_01.mp3"; Text = "New personal best. Delicious."; Rate = 2 },
  @{ File = "mission-control\mission_control_personal_best_02.mp3"; Text = "Best run yet. I noticed."; Rate = 2 },

  @{ File = "mission-control\mission_control_restart_01.mp3"; Text = "Again. Faster."; Rate = 3 },
  @{ File = "mission-control\mission_control_restart_02.mp3"; Text = "Back in. Make it loud."; Rate = 3 },

  @{ File = "mission-control\mission_control_hijacker_01.mp3"; Text = "Hijacker beam hot. Break the lock."; Rate = 3 },
  @{ File = "mission-control\mission_control_hijacker_02.mp3"; Text = "Tractor trap. Slip it clean."; Rate = 3 },

  @{ File = "nova-swarm\intro_narrator_01.mp3"; Text = "The last arcade cabinet drifted past the star lanes, still hungry for one more coin."; Rate = 1 },
  @{ File = "nova-swarm\intro_narrator_02.mp3"; Text = "Then the swarm learned formation. Cute trick. Bad manners."; Rate = 1 },
  @{ File = "nova-swarm\intro_narrator_03.mp3"; Text = "Your ship is small, sharp, and extremely underinsured."; Rate = 1 },
  @{ File = "nova-swarm\intro_narrator_04.mp3"; Text = "Every boss guards a score. Break the pattern. Steal the night."; Rate = 1 }
)

foreach ($line in $lines) {
  $relative = $line.File
  $target = Join-Path (Join-Path $root "public\audio\voice") $relative
  $targetDir = Split-Path -Parent $target
  New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

  $wav = Join-Path $tempDir ([IO.Path]::GetFileNameWithoutExtension($relative) + ".wav")
  if (Test-Path -LiteralPath $wav) { Remove-Item -LiteralPath $wav -Force }

  $synth.Rate = [int]$line.Rate
  $synth.SetOutputToWaveFile($wav)
  $synth.Speak([string]$line.Text)
  $synth.SetOutputToNull()

  & $ffmpegCmd.Source -y -hide_banner -loglevel error -i $wav -codec:a libmp3lame -b:a 128k $target
  if ($LASTEXITCODE -ne 0) {
    throw "ffmpeg failed for $relative"
  }

  $bytes = (Get-Item -LiteralPath $target).Length
  Write-Output "generated $relative ($bytes bytes) with $($voice.Name)"
}

$synth.Dispose()
Write-Output "local announcer voicepack written with $($voice.Name)"
