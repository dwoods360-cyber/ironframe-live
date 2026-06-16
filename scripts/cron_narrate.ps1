$ProjectRoot = "C:\Users\Dereck\ironframe-live"
Set-Location $ProjectRoot

$DiffFile = "$ProjectRoot\daily_code_diff.txt"
$LogFile = "$ProjectRoot\scripts\cron_narrate.log"

function Log-Message($Message) {
    $Timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
    Add-Content -Path $LogFile -Value "[$Timestamp] $Message" -Encoding utf8
}

function Import-ProjectDotEnv {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return }
    Get-Content -LiteralPath $Path -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }
        $eq = $line.IndexOf("=")
        $key = $line.Substring(0, $eq).Trim()
        $value = $line.Substring($eq + 1).Trim()
        if (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))
        ) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        if ($key -and -not [string]::IsNullOrWhiteSpace($value)) {
            Set-Item -Path "env:$key" -Value $value
        }
    }
}

function Resolve-CursorAgentLauncher {
    $agentRoot = Join-Path $env:LOCALAPPDATA "cursor-agent"
    if (Test-Path -LiteralPath $agentRoot) {
        $env:Path = "$agentRoot;$env:Path"
    }

    # Prefer direct node+index.js — the root agent.ps1 shim fails on newer version dir names.
    $versionsRoot = Join-Path $agentRoot "versions"
    if (Test-Path -LiteralPath $versionsRoot) {
        $versionDir = Get-ChildItem -Path $versionsRoot -Directory -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            Select-Object -First 1
        if ($versionDir) {
            $nodeExe = Join-Path $versionDir.FullName "node.exe"
            $indexJs = Join-Path $versionDir.FullName "index.js"
            if ((Test-Path -LiteralPath $nodeExe) -and (Test-Path -LiteralPath $indexJs)) {
                return @{
                    Mode = "node"
                    NodeExe = $nodeExe
                    IndexJs = $indexJs
                }
            }
        }
    }

    foreach ($candidate in @("agent", "cursor-agent")) {
        $resolved = Get-Command $candidate -ErrorAction SilentlyContinue
        if ($resolved) {
            return @{
                Mode = "shim"
                Command = $resolved.Source
            }
        }
    }

    return $null
}

function Invoke-CursorAgentCli {
    param(
        [hashtable]$Launcher,
        [string[]]$AgentCliArgs
    )
    if ($Launcher.Mode -eq "node") {
        & $Launcher.NodeExe $Launcher.IndexJs @AgentCliArgs
    } else {
        & $Launcher.Command @AgentCliArgs
    }
}

function Get-WriterDeltaPrompt {
    param([string]$OperationalDate)
    @"
Active: Writer - Narrative Architect, execute your complete mandate.
Current Operational Date: $OperationalDate

Review daily_code_diff.txt and update docs/qa/complete-feature-glossary.md completely from seed to flower.

CRITICAL INSTRUCTION: Do not pull from historical briefing caches or reuse previous templates. You must build today's briefing exclusively by parsing the fresh deltas inside 'daily_code_diff.txt' and evaluating changes against the active 19-agent architecture models. Focus strictly on any new module refactors, recent threat simulations, and verification of our whole-integer BigInt financial boundaries. If 'daily_code_diff.txt' shows no code changes, pivot today's briefing to analyze system telemetry stability logs and current framework compliance baselines.

Do not summarize, do not truncate, and do not use placeholders. Strictly enforce BigInt integer cents only for any financial metrics.
"@
}

function Get-IntelOsintPrompt {
    param([string]$OperationalDateLabel)
    @"
Active: Ironintel & Ironwatch, execute a live external OSINT search for today, $OperationalDateLabel. Search for the latest active threat vectors, cybersecurity news, and CMMC/NIST regulatory updates based on our selected Industry Profile. Route all discovered data through Irongate for mandatory DMZ sanitization, and completely refresh the Strategic Intel dashboard view with fresh information.
"@
}

function Get-BoardGovernancePrompt {
    param([string]$OperationalDateLabel)
    @"
Active: Ironlogic & Irontally, generate a Corporate Governance Memo for $OperationalDateLabel. Evaluate current ALE Baselines (11.1M, 5.9M, 4.7M) against existing framework compliance (SOC2/ISO). Flag any architectural drift or unauthorized fiscal modifications. This memo is for the Product Owner and Constitutional Authority. Strictly enforce the BigInt financial mandate.
"@
}

function Invoke-CursorAgentPhase {
    param(
        [hashtable]$Launcher,
        [string]$PhaseLabel,
        [string]$Prompt
    )
    Log-Message $PhaseLabel
    $agentArgs = @(
        "-p", "--force", "--trust",
        "--workspace", $ProjectRoot,
        $Prompt
    )
    Invoke-CursorAgentCli -Launcher $Launcher -AgentCliArgs $agentArgs >> $LogFile 2>&1
    if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) {
        Log-Message ("ERROR: Cursor agent phase failed with exit code " + $LASTEXITCODE + ".")
        Exit $LASTEXITCODE
    }
}

Import-ProjectDotEnv "$ProjectRoot\.env.local"
Import-ProjectDotEnv "$ProjectRoot\.env"

Log-Message "cron_narrate.ps1: starting (project root: $ProjectRoot)"

$Launcher = Resolve-CursorAgentLauncher
if (-not $Launcher) {
    Log-Message "ERROR: Cursor CLI not found. Install: irm 'https://cursor.com/install?win32=true' | iex"
    Exit 1
}

if ($Launcher.Mode -eq "node") {
    Log-Message ("Using Cursor CLI via node: " + $Launcher.IndexJs)
} else {
    Log-Message ("Using Cursor CLI shim: " + $Launcher.Command)
}

if (-not $env:CURSOR_API_KEY) {
    $env:CURSOR_API_KEY = [Environment]::GetEnvironmentVariable("CURSOR_API_KEY", "User")
}
if (-not $env:CURSOR_API_KEY) {
    Log-Message "ERROR: CURSOR_API_KEY is not set. Add it to User env vars or .env.local for unattended 03:00 runs."
    Exit 1
}

$authStatus = Invoke-CursorAgentCli -Launcher $Launcher -AgentCliArgs @("status") 2>&1 | Out-String
if ($authStatus -match "Not logged in" -and -not $env:CURSOR_API_KEY) {
    Log-Message "ERROR: Cursor agent is not authenticated."
    Exit 1
}
Log-Message "Cursor agent auth: API key configured."

git fetch --quiet origin 2>$null

$BaseCommit = git rev-list -1 --before="24 hours ago" HEAD 2>$null
if (-not $BaseCommit) {
    $BaseCommit = git rev-list --max-parents=0 HEAD 2>$null | Select-Object -Last 1
}

if (-not $BaseCommit) {
    Log-Message "No git history baseline found - writing empty diff and continuing with pivot mandate."
    Set-Content -Path $DiffFile -Value "" -Encoding utf8
} else {
    Log-Message "Generating daily_code_diff.txt from git baseline $BaseCommit"
    $DiffText = git diff $BaseCommit -- . ':(exclude)docs/' 2>$null | Out-String
    Log-Message ("daily_code_diff.txt diff capture length=" + $DiffText.Length)
    Set-Content -Path $DiffFile -Value $DiffText -Encoding utf8 -NoNewline
}

$DiffItem = Get-Item -LiteralPath $DiffFile -ErrorAction SilentlyContinue
$byteCount = if ($null -ne $DiffItem) { $DiffItem.Length } else { 0 }
if ($byteCount -le 0) {
    Log-Message "daily_code_diff.txt empty - Writer will pivot to telemetry/compliance baseline."
} else {
    Log-Message ("daily_code_diff.txt generated successfully (" + $byteCount + " bytes).")
}

$OperationalDate = (Get-Date).ToString("yyyy-MM-dd")
$OperationalDateLabel = (Get-Date).ToString("MMMM d, yyyy")
$WriterPrompt = Get-WriterDeltaPrompt -OperationalDate $OperationalDate
$IntelPrompt = Get-IntelOsintPrompt -OperationalDateLabel $OperationalDateLabel
$BoardPrompt = Get-BoardGovernancePrompt -OperationalDateLabel $OperationalDateLabel

Log-Message ("Operational date: " + $OperationalDate)

# 1. Internal code documentation (The Writer)
Invoke-CursorAgentPhase -Launcher $Launcher `
    -PhaseLabel "Invoking Narrative Architect for internal code changes..." `
    -Prompt $WriterPrompt

# 2. Live external intel search (The Search Engine)
Invoke-CursorAgentPhase -Launcher $Launcher `
    -PhaseLabel "Invoking Ironintel & Irongate for live morning OSINT sweep..." `
    -Prompt $IntelPrompt

# 3. Corporate governance memo (The Board Secretary)
Invoke-CursorAgentPhase -Launcher $Launcher `
    -PhaseLabel "Invoking Ironlogic & Irontally for Corporate Governance Memo..." `
    -Prompt $BoardPrompt

Log-Message "cron_narrate.ps1: complete."
