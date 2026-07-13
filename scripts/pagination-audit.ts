import fs from 'fs';
import path from 'path';

const ROUTES_DIR = path.resolve(__dirname, '../server/src/routes');
const SKIP_FILES = ['auth.ts', 'upload.ts', 'users.ts'];

interface PaginationIssue {
  file: string;
  line: number;
  snippet: string;
}

const issues: PaginationIssue[] = [];

function auditFile(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const filename = path.basename(filePath);

  if (SKIP_FILES.includes(filename)) return;

  let inQuery = false;
  let queryStartLine = 0;
  let queryText = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect start of template literal query
    const queryMatch = line.match(/query\(`(SELECT.*)/i);
    if (queryMatch) {
      inQuery = true;
      queryStartLine = i + 1;
      queryText = queryMatch[1];
      continue;
    }

    // Detect continuation of multi-line query
    if (inQuery) {
      const trimmed = line.trim();
      if (trimmed.endsWith('`')) {
        queryText += ' ' + trimmed.slice(0, -1);
        inQuery = false;

        // Analyze the complete query
        if (isUnboundedSelect(queryText)) {
          issues.push({
            file: filename,
            line: queryStartLine,
            snippet: queryText.substring(0, 120),
          });
        }
        queryText = '';
      } else if (!trimmed.endsWith('`,')) {
        queryText += ' ' + trimmed;
      }
    }
  }
}

function isUnboundedSelect(query: string): boolean {
  const upper = query.toUpperCase().trim();

  // Skip non-SELECT statements
  if (!upper.startsWith('SELECT')) return false;

  // Skip COUNT queries
  if (upper.includes('COUNT(')) return false;

  // Skip EXISTS queries
  if (upper.includes('EXISTS')) return false;

  // Skip queries that already have LIMIT
  if (upper.includes('LIMIT')) return false;

  // Skip queries with FOR UPDATE (single row lock)
  if (upper.includes('FOR UPDATE')) return false;

  // This is an unbounded SELECT
  return true;
}

// Audit all route files
const files = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.ts'));
for (const file of files) {
  auditFile(path.join(ROUTES_DIR, file));
}

// Output results
if (issues.length > 0) {
  console.error(`\n❌ PAGINATION AUDIT FAILED — ${issues.length} unbounded SELECT(s) found:\n`);
  for (const issue of issues) {
    console.error(`  📄 ${issue.file}:${issue.line}`);
    console.error(`     ${issue.snippet}`);
    console.error('');
  }
  process.exit(1);
} else {
  console.log('\n✅ PAGINATION AUDIT PASSED — All SELECT queries have LIMIT\n');
  process.exit(0);
}
