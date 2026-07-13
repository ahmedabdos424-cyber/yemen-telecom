# TestSprite Configuration

## Environment Variables

```bash
# Required
TESTSPRITE_API_KEY=sk-user-mjd550vIss7Y5vCEKh7aAmq2sUTFnhxZp3VA-CmtdSyufxGXSg8kj9wmQMQcj2B2NMbr2kdv-lZ1F2dPG0QWzwRdzsPWp0WvUpSmpyY9pdpfBC5Hl1XQkGZ14XRDH_hx3Xc
```

## GitHub Actions Secrets

Set the following secrets in your GitHub repository:

| Secret | Value |
|--------|-------|
| `TESTSPRITE_API_KEY` | Your TestSprite API key |

## GitHub Actions Variables

| Variable | Value |
|----------|-------|
| `TESTSPRITE_PROJECT_ID` | ae188b56-e8c8-47ae-98f0-bb0d01f6b385 |

## TestSprite CLI Commands

### Authentication
```bash
testsprite setup --from-env --yes
testsprite auth status
```

### Project Management
```bash
testsprite project list
testsprite project get ae188b56-e8c8-47ae-98f0-bb0d01f6b385
```

### Test Management
```bash
# List all tests
testsprite test list --project ae188b56-e8c8-47ae-98f0-bb0d01f6b385

# Run a specific test
testsprite test run <test-id> --target-url https://yementelecom1.netlify.app --wait --timeout 180

# Run all tests
testsprite test run --all --project ae188b56-e8c8-47ae-98f0-bb0d01f6b385 --target-url https://yementelecom1.netlify.app --wait --timeout 600

# Check test results
testsprite test result <test-id>

# Get failure artifacts
testsprite test artifact get <run-id>
```

### Agent Installation
```bash
testsprite agent install --target claude --force
```

## CI/CD Pipeline

The TestSprite workflow runs automatically:
1. After CI passes on main branch
2. On manual workflow dispatch
3. Tests against deployed frontend at https://yementelecom1.netlify.app

### Pipeline Steps
1. Install TestSprite CLI
2. Configure authentication
3. Run all TestSprite tests
4. Verify results
5. Upload artifacts

## Test Categories

### Backend Tests (Python)
- Authentication lifecycle
- RBAC access control
- CRUD endpoints
- Health and monitoring
- Customer management
- Input validation

### Frontend Tests (Plan-based)
- Login flow
- Dashboard navigation
- SIM management
- Agent management
- Seller management
- Reports
- Settings
- Alerts
- RTL layout
- Dark mode
- Responsive design

## Troubleshooting

### Backend Down
If the Render backend is sleeping:
```bash
# Wake up the backend
curl https://yemen-telecom-api.onrender.com/api/health
```

### Test Failures
```bash
# Get failure details
testsprite test artifact get <run-id>

# Check the failure.json for root cause analysis
cat .testsprite/runs/<run-id>/failure.json
```

### Coverage Issues
```bash
# Run Vitest with coverage
npx vitest run --coverage

# Check coverage report
npx vitest run --coverage --reporter=json
```
