param(
  [Parameter(Mandatory=$true)][string]$Title,
  [Parameter(Mandatory=$true)][string]$Body,
  [string]$Base = "master",
  [string]$Head,
  [switch]$Draft
)

# Creates a PR and automatically applies the `automerge` label.
# Requires: gh authenticated.

if (-not $Head -or $Head.Trim() -eq "") {
  $branch = (git branch --show-current).Trim()
  if (-not $branch) { throw "Could not detect current branch. Pass -Head explicitly." }
  $Head = $branch
}

$cmd = @(
  "gh","pr","create",
  "--base", $Base,
  "--head", $Head,
  "--title", $Title,
  "--body", $Body,
  "--label","automerge"
)
if ($Draft) { $cmd += "--draft" }

& $cmd[0] $cmd[1..($cmd.Length-1)]
