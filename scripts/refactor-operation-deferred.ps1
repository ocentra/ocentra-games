$files = Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "createOperationDeferred" | Select-Object -ExpandProperty Path -Unique

foreach ($file in $files) {
    $content = Get-Content $file -Raw
    $original = $content
    
    $content = $content -replace 'createOperationDeferred\s*<([^>]+)>\(\)', 'new OperationDeferred<$1>()'
    $content = $content -replace 'createOperationDeferred\s*\(\)', 'new OperationDeferred()'
    
    $content = $content -replace "import\s*{\s*createOperationDeferred\s*,\s*type\s+OperationDeferred\s*}\s*from\s*['\`"]@lib/eventing['\`"]", "import { OperationDeferred } from '@lib/eventing'"
    $content = $content -replace "import\s*{\s*createOperationDeferred\s*,\s*type\s+OperationDeferred\s*}\s*from\s*['\`"]@/lib/eventing['\`"]", "import { OperationDeferred } from '@/lib/eventing'"
    $content = $content -replace "import\s*{\s*([^}]*),\s*createOperationDeferred\s*,\s*type\s+OperationDeferred\s*}\s*from\s*['\`"]@lib/eventing['\`"]", "import { `$1, OperationDeferred } from '@lib/eventing'"
    $content = $content -replace "import\s*{\s*([^}]*),\s*createOperationDeferred\s*,\s*type\s+OperationDeferred\s*}\s*from\s*['\`"]@/lib/eventing['\`"]", "import { `$1, OperationDeferred } from '@/lib/eventing'"
    $content = $content -replace "import\s*{\s*([^}]*),\s*createOperationDeferred\s*}\s*from\s*['\`"]@lib/eventing['\`"]", "import { `$1, OperationDeferred } from '@lib/eventing'"
    $content = $content -replace "import\s*{\s*([^}]*),\s*createOperationDeferred\s*}\s*from\s*['\`"]@/lib/eventing['\`"]", "import { `$1, OperationDeferred } from '@/lib/eventing'"
    
    if ($content -ne $original) {
        Set-Content $file $content -NoNewline
        Write-Host "Updated: $file"
    }
}

Write-Host "Done! Updated $($files.Count) files"


