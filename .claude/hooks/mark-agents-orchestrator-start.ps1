$ErrorActionPreference = "Stop"

$rawInput = [Console]::In.ReadToEnd()

try {
    $inputObject = $rawInput | ConvertFrom-Json
} catch {
    exit 0
}

if ([string]$inputObject.agent_type -ne "Agents Orchestrator") {
    exit 0
}

$projectDir = $env:CLAUDE_PROJECT_DIR
if ([string]::IsNullOrWhiteSpace($projectDir)) {
    if (-not [string]::IsNullOrWhiteSpace($inputObject.cwd)) {
        $projectDir = [string]$inputObject.cwd
    } else {
        $projectDir = (Get-Location).Path
    }
}

$sessionId = "default"
if (-not [string]::IsNullOrWhiteSpace($inputObject.session_id)) {
    $sessionId = $inputObject.session_id
}

$safeSessionId = $sessionId -replace "[^a-zA-Z0-9_.-]", "_"
$stateDir = Join-Path $projectDir ".claude\hooks\state"
$statePath = Join-Path $stateDir "$safeSessionId.json"

New-Item -ItemType Directory -Path $stateDir -Force | Out-Null

$state = [ordered]@{
    sessionId = $sessionId
    required = $true
    orchestrated = $false
    orchestratorRunning = $true
    orchestratorStartedAt = (Get-Date).ToUniversalTime().ToString("o")
    agentId = [string]$inputObject.agent_id
}

$state | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $statePath -Encoding UTF8

$context = @"
You are the mandatory first routing gate for this repository.

Decide the workflow before implementation. For simple requests, explicitly say they can be handled directly after orchestration. For implementation or QA-sensitive work, coordinate the required specialist agents and quality gates.
"@

$response = @{
    hookSpecificOutput = @{
        hookEventName = "SubagentStart"
        additionalContext = $context
    }
}

$response | ConvertTo-Json -Depth 4 -Compress
exit 0
