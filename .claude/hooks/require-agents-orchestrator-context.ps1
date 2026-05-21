$ErrorActionPreference = "Stop"

$rawInput = [Console]::In.ReadToEnd()
$inputObject = $null

try {
    if (-not [string]::IsNullOrWhiteSpace($rawInput)) {
        $inputObject = $rawInput | ConvertFrom-Json
    }
} catch {
    $response = @{
        decision = "block"
        reason = "Agents Orchestrator gate could not parse the Claude Code hook input JSON."
    }

    $response | ConvertTo-Json -Compress
    exit 0
}

$projectDir = $env:CLAUDE_PROJECT_DIR
if ([string]::IsNullOrWhiteSpace($projectDir)) {
    $projectDir = (Get-Location).Path
}

$agentPath = Join-Path $projectDir ".claude\agents\agents-orchestrator.md"

if (-not (Test-Path -LiteralPath $agentPath)) {
    $response = @{
        decision = "block"
        reason = "Mandatory Agents Orchestrator definition was not found at .claude/agents/agents-orchestrator.md."
    }

    $response | ConvertTo-Json -Compress
    exit 0
}

$agentHeader = Get-Content -LiteralPath $agentPath -TotalCount 12 | Out-String
if ($agentHeader -notmatch "name:\s*Agents Orchestrator") {
    $response = @{
        decision = "block"
        reason = "The mandatory orchestrator file exists, but it does not declare 'name: Agents Orchestrator'."
    }

    $response | ConvertTo-Json -Compress
    exit 0
}

$sessionId = "default"
if ($null -ne $inputObject -and -not [string]::IsNullOrWhiteSpace($inputObject.session_id)) {
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
    orchestratorRunning = $false
    promptReceivedAt = (Get-Date).ToUniversalTime().ToString("o")
}

$state | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $statePath -Encoding UTF8

$context = @"
MANDATORY AGENTS ORCHESTRATOR GATE

The project requires every execution request to pass through the custom agent defined at:
.claude/agents/agents-orchestrator.md

Before modifying files, running implementation commands, creating artifacts, or validating deliverables:
1. Read .claude/agents/agents-orchestrator.md.
2. Use Agents Orchestrator as the first decision maker.
3. Let it decide the correct workflow and specialist agents.
4. If the orchestrator cannot be used, stop and report the blocker instead of proceeding directly.

Direct pre-orchestrator actions are limited to reading instructions, reading agent definitions, and gathering minimal context needed for routing.
"@

$response = @{
    hookSpecificOutput = @{
        hookEventName = "UserPromptSubmit"
        additionalContext = $context
    }
}

$response | ConvertTo-Json -Depth 4 -Compress
exit 0
