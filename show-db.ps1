param(
    [string]$Table = "all"
)

python "$PSScriptRoot\view_db.py" $Table
