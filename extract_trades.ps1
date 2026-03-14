$content = [System.IO.File]::ReadAllText("c:\Users\PC\Desktop\developer\Gestor De Portfolio\EjemploHTML\01 - US30 Long H1 DarwinexWF Matrix - Strategy 5.23.22.html", [System.Text.Encoding]::Unicode)

# Find the section after "Transacciones" header
$transIdx = $content.IndexOf("Transacciones")
$section = $content.Substring($transIdx)

# Extract all table rows
$rows = [regex]::Matches($section, '<tr[^>]*>(.*?)</tr>', [System.Text.RegularExpressions.RegexOptions]::Singleline)

$count = 0
foreach ($row in $rows) {
    $tds = [regex]::Matches($row.Groups[1].Value, '<td[^>]*>\s*(.*?)\s*</td>', [System.Text.RegularExpressions.RegexOptions]::Singleline)
    if ($tds.Count -lt 11) { continue }
    $vals = $tds | ForEach-Object { ($_.Groups[1].Value -replace '<[^>]+>','').Trim() -replace '\s+',' ' }
    
    # Check if direction is "out" (index 4)
    if ($vals[4] -eq 'out') {
        $count++
        # Print: date | commission | swap | profit | balance
        Write-Output "$($vals[0]) | comm=$($vals[8]) | swap=$($vals[9]) | profit=$($vals[10]) | bal=$($vals[11])"
    }
}
Write-Output "Total out trades: $count"
