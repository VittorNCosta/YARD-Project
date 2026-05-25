$ErrorActionPreference = "Stop"

function Deny-OrchestratorRequired {
    param(
        [string]$Reason
    )

    $response = @{
        hookSpecificOutput = @{
            hookEventName = "PreToolUse"
            permissionDecision = "deny"
            permissionDecisionReason = $Reason
        }
    }

    $response | ConvertTo-Json -Depth 5 -Compress
    exit 0
}

function Allow-OrchestratorGate {
    param(
        [string]$Reason
    )

    $response = @{
        hookSpecificOutput = @{
            hookEventName = "PreToolUse"
            permissionDecision = "allow"
            permissionDecisionReason = $Reason
        }
    }

    $response | ConvertTo-Json -Depth 5 -Compress
    exit 0
}

$rawInput = [Console]::In.ReadToEnd()

try {
    $inputObject = $rawInput | ConvertFrom-Json
} catch {
    Deny-OrchestratorRequired "Agents Orchestrator gate could not parse the PreToolUse hook input JSON."
}

$toolName = [string]$inputObject.tool_name
$agentType = [string]$inputObject.agent_type

if ($agentType -eq "Agents Orchestrator") {
    Allow-OrchestratorGate "Tool call is running inside the mandatory Agents Orchestrator."
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
$statePath = Join-Path $projectDir ".claude\hooks\state\$safeSessionId.json"

$state = $null
if (Test-Path -LiteralPath $statePath) {
    try {
        $state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    } catch {
        Deny-OrchestratorRequired "Agents Orchestrator gate state is invalid. Re-submit the request so the orchestrator gate can reset."
    }
}

$orchestrated = $false
$orchestratorRunning = $false
if ($null -ne $state) {
    $orchestrated = [bool]$state.orchestrated
    $orchestratorRunning = [bool]$state.orchestratorRunning
}

if ($orchestrated -or $orchestratorRunning) {
    Allow-OrchestratorGate "This request has passed through Agents Orchestrator."
}

$preOrchestratorReadTools = @("Read", "Glob", "Grep")
if ($preOrchestratorReadTools -contains $toolName) {
    Allow-OrchestratorGate "Minimal read-only context gathering is allowed before Agents Orchestrator routing."
}

if ($toolName -eq "Agent") {
    $subagentType = [string]$inputObject.tool_input.subagent_type
    $description = [string]$inputObject.tool_input.description
    $prompt = [string]$inputObject.tool_input.prompt

    $asksForOrchestrator =
        $subagentType -eq "Agents Orchestrator" -or
        $subagentType -eq "agents-orchestrator" -or
        $description -match "(?i)agents?[- ]orchestrator" -or
        $prompt -match "(?i)agents?[- ]orchestrator"

    if ($asksForOrchestrator) {
        Allow-OrchestratorGate "Spawning the mandatory Agents Orchestrator is allowed."
    }

    Deny-OrchestratorRequired "Spawn the Agents Orchestrator custom agent first. Direct specialist agents are blocked until the orchestrator has routed this request."
}

Deny-OrchestratorRequired "This tool call is blocked until the request passes through Agents Orchestrator. Read .claude/agents/agents-orchestrator.md, then spawn the Agents Orchestrator custom agent first."
