import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const testRunnerDir = join(__dirname, '..', '..');
const coverageDir = join(testRunnerDir, 'coverage');

const darkThemeCSS = `
  <style id="dark-theme-override">
    body {
      background-color: #1e1e1e !important;
      color: #d4d4d4 !important;
    }
    .wrapper {
      background-color: #1e1e1e !important;
    }
    .pad1 {
      background-color: #1e1e1e !important;
      color: #d4d4d4 !important;
    }
    h1 {
      color: #ffffff !important;
    }
    .quiet {
      color: #858585 !important;
    }
    .strong {
      color: #ffffff !important;
    }
    table {
      background-color: #252526 !important;
      color: #d4d4d4 !important;
    }
    thead {
      background-color: #2d2d30 !important;
    }
    th {
      background-color: #2d2d30 !important;
      color: #cccccc !important;
      border-bottom: 1px solid #3e3e42 !important;
    }
    td {
      background-color: #252526 !important;
      color: #d4d4d4 !important;
      border-bottom: 1px solid #3e3e42 !important;
    }
    tr:hover {
      background-color: #2a2d2e !important;
    }
    a {
      color: #4ec9b0 !important;
    }
    a:hover {
      color: #6ecdd0 !important;
    }
    .file {
      color: #4ec9b0 !important;
    }
    .pct {
      color: #d4d4d4 !important;
    }
    .abs {
      color: #858585 !important;
    }
    .status-line {
      background-color: #252526 !important;
    }
    .status-line.low {
      background-color: #3a1f1f !important;
    }
    .status-line.medium {
      background-color: #3a3a1f !important;
    }
    .status-line.high {
      background-color: #1f3a1f !important;
    }
    pre {
      background-color: #1e1e1e !important;
      color: #d4d4d4 !important;
      border: 1px solid #3e3e42 !important;
    }
    code {
      background-color: #252526 !important;
      color: #d4d4d4 !important;
    }
    .cstat-no {
      background-color: #3a1f1f !important;
    }
    .cline-no {
      background-color: #3a1f1f !important;
    }
    .cstat-yes {
      background-color: #1f3a1f !important;
    }
    .cline-yes {
      background-color: #1f3a1f !important;
    }
    input[type="search"] {
      background-color: #3c3c3c !important;
      color: #cccccc !important;
      border: 1px solid #3e3e42 !important;
    }
    input[type="search"]:focus {
      border-color: #007acc !important;
      outline: none !important;
    }
    .chart {
      background-color: #3c3c3c !important;
    }
    .cover-fill {
      background-color: #4ec9b0 !important;
    }
    .cover-empty {
      background-color: #3c3c3c !important;
    }
    .low {
      color: #f48771 !important;
    }
    .medium {
      color: #dcdcaa !important;
    }
    .high {
      color: #4ec9b0 !important;
    }
  </style>
`;

function findHTMLFiles(dir: string): string[] {
  const files: string[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        files.push(...findHTMLFiles(fullPath));
      } else if (entry.endsWith('.html')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  return files;
}

function applyDarkTheme(htmlPath: string): boolean {
  try {
    let content = readFileSync(htmlPath, 'utf-8');
    
    if (content.includes('id="dark-theme-override"')) {
      return false;
    }
    
    const headEndIndex = content.indexOf('</head>');
    if (headEndIndex === -1) {
      console.warn(`No </head> tag found in ${htmlPath}`);
      return false;
    }
    
    content = content.slice(0, headEndIndex) + darkThemeCSS + content.slice(headEndIndex);
    writeFileSync(htmlPath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error applying dark theme to ${htmlPath}:`, error);
    return false;
  }
}

function main(): void {
  const htmlFiles = findHTMLFiles(coverageDir);
  let applied = 0;
  
  for (const htmlFile of htmlFiles) {
    if (applyDarkTheme(htmlFile)) {
      applied++;
    }
  }
  
  if (applied > 0) {
    console.log(`✅ Applied dark theme to ${applied} HTML file(s)`);
  }
}

main();
