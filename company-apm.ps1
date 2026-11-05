[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$CliArgs
)

$projectPath = "$PSScriptRoot\EngineeringCommonsCli\EngineeringCommonsCli.csproj"
if ($CliArgs -and $CliArgs.Length -gt 0) {
    dotnet run --project $projectPath -- $CliArgs
} else {
    dotnet run --project $projectPath
}
