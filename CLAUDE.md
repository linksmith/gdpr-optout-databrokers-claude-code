# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GDPR data broker opt-out automation tool with **two distinct execution modes**:

1. **Phase 1 (Claude Code)**: Interactive conversational workflow where Claude Code guides users through browser automation while collecting form metadata
2. **Phase 2 (Standalone Bot)**: Independent Node.js application that processes brokers automatically using Puppeteer + CAPTCHA API

Both phases share the same SQLite database (`data/submissions.db`) for state tracking.

## Commands

### Database Operations
```bash
# Initialize fresh database (creates all tables)
npm run init:db

# Apply CAPTCHA tracking migration
npm run migrate:db
```

### Testing
```bash
# Run all E2E tests (includes bot + CAPTCHA solver)
npm test

# Test CAPTCHA solver only
npm run test:captcha

# Test automation bot only
npm run test:bot

# Run mock 2Captcha server (for testing without API costs)
npm run test:mock-server

# Manual CAPTCHA solver test (interactive)
npm run test:manual-captcha
```

### Running the Standalone Bot (Phase 2)
```bash
# Dry run (test mode, no submissions)
npm run bot:dry-run

# Hybrid mode (API + manual fallback) - RECOMMENDED
npm run bot:hybrid

# Full auto mode (requires CAPTCHA_API_KEY)
npm run bot:auto

# Specific brokers
node src/automation/gdpr-optout-bot.js --brokers=spokeo,beenverified

# Specific tier
node src/automation/gdpr-optout-bot.js --tier=1
```

### Phase 1 (Claude Code)
```bash
# Start interactive session
claude --chrome

# Then use conversational commands:
# "Let's process TruePeopleSearch"
# "What's our progress?"
# "Continue where we left off"
```

## Architecture

### Two-Phase Design

**Phase 1 (Claude Code - Interactive):**
- Uses Claude's browser automation via `claude --chrome`
- Claude analyzes forms using vision capabilities
- Collects technical form metadata into `form_analysis` table
- User approves each submission
- Good for: first-time setup, complex edge cases, form discovery

**Phase 2 (Standalone Bot):**
- Independent Puppeteer-based automation in `src/automation/gdpr-optout-bot.js`
- Uses pre-collected form metadata from Phase 1
- Automated CAPTCHA solving via 2Captcha API (`utils/captcha-solver.js`)
- Three modes: `auto` (fully automated), `hybrid` (API + manual fallback), `manual` (user solves)
- Good for: repeat runs, batch processing, scaling

### Key Components

**Broker Definitions**: `config/brokers.yaml`
- 40+ broker configurations organized by tier
- Each broker has: id, name, url, tier, difficulty, opt_out_method
- Edit this file to add/modify brokers (no code changes needed)

**Database Schema**: `data/schema.sql`
- `submissions`: Main tracking table (status: pending → submitted → awaiting_verification → verified → completed)
- `verification_emails`: Email confirmation tracking
- `audit_log`: All actions logged
- `form_analysis`: Technical form metadata captured during Phase 1 for Phase 2 automation
- `captcha_stats`: CAPTCHA solving metrics and costs

**CAPTCHA Solver**: `utils/captcha-solver.js`
- Detects: reCAPTCHA v2/v3, hCaptcha, Cloudflare Turnstile
- Submits to 2Captcha API, polls for solution
- Auto-injects solution into page via `page.evaluate()`
- Falls back to manual solving if API fails (hybrid mode)
- Cost tracking: ~$0.001 per CAPTCHA

**Automation Bot**: `src/automation/gdpr-optout-bot.js`
- Class-based architecture: `GDPROptOutBot`
- Puppeteer-extra with stealth plugin to avoid detection
- Database operations via sqlite3 with promisified methods
- Screenshot capture for evidence
- Resumable: tracks state in database, can stop/continue

### Data Flow

```
.env (user data) → brokers.yaml (definitions) → Claude Code/Bot
                                                      ↓
                                          submissions.db (state)
                                                      ↓
                                          screenshots/ (evidence)
```

### State Machine

```
pending → submitted → awaiting_verification → verified → completed
   ↓
failed/skipped (terminal states)
```

## Development Patterns

### Adding CAPTCHA Support for New Provider

1. Update `API_ENDPOINTS` in `utils/captcha-solver.js`
2. Add provider-specific submit/poll logic
3. Update `.env.template` with provider docs
4. Add tests to `test/e2e/captcha-solver.test.js`

### Adding New Broker

1. Edit `config/brokers.yaml` - add new entry with tier, difficulty, url
2. (Optional) Run Phase 1 to capture form metadata
3. Bot will automatically pick it up on next run

### Database Migrations

1. Create migration SQL in `data/migrations/NNN_description.sql`
2. Add npm script: `"migrate:description": "sqlite3 data/submissions.db < data/migrations/NNN_description.sql"`
3. Update `data/schema.sql` with same changes (for fresh installs)

## Testing Strategy

**E2E Tests** (`test/e2e/`):
- `automation-bot.test.js`: Tests full bot workflow with mock brokers
- `captcha-solver.test.js`: Tests CAPTCHA detection and solving with mock API

**Mock Server** (`test/mocks/2captcha-mock-server.js`):
- Simulates 2Captcha API responses
- No API costs during testing
- Configurable success/failure scenarios

**Unit Tests** (`test/unit/`):
- Mock server validation tests

## Security Notes

**NEVER commit:**
- `.env` (contains personal data)
- `data/submissions.db` (submission records)
- `data/screenshots/` (personal screenshots)

**Always gitignored:**
- `.env` ✓
- `data/submissions.db` ✓
- `data/screenshots/` ✓

**Safe to commit:**
- `.env.template` (no real data)
- `config/brokers.yaml` (public broker definitions)
- `data/schema.sql` (schema only)

## Environment Variables

Critical `.env` variables:
- Identity: `FIRST_NAME`, `LAST_NAME`, `EMAIL_REAL`
- Addresses: `CURRENT_STREET`, `CURRENT_CITY`, etc.
- CAPTCHA: `CAPTCHA_ENABLED`, `CAPTCHA_API_PROVIDER`, `CAPTCHA_API_KEY`

See `.env.template` for full list.

## Common Workflows

### Initial Setup
```bash
npm install
cp .env.template .env
# Edit .env with real data
chmod 600 .env
npm run init:db
```

### Running First Time (Discovery Mode)
```bash
# Use Claude Code to discover and capture form metadata
claude --chrome
# Say: "Let's process Tier 1 brokers and capture form details"
```

### Running Subsequent Times (Automation Mode)
```bash
# Use standalone bot with collected form metadata
npm run bot:hybrid
```

### Debugging Failed Submissions
```bash
# Check database for error messages
sqlite3 data/submissions.db "SELECT broker_id, status, error_message FROM submissions WHERE status='failed';"

# Check screenshots for evidence
ls -lh data/screenshots/

# Re-run specific broker in dry-run mode
node src/automation/gdpr-optout-bot.js --brokers=spokeo --dry-run
```

## Important Implementation Details

### Puppeteer Stealth Mode
Bot uses `puppeteer-extra-plugin-stealth` to avoid bot detection. Don't remove this - many brokers actively block automation.

### CAPTCHA Injection Mechanism
CAPTCHA solutions are injected via `page.evaluate()` setting the `g-recaptcha-response` or `h-captcha-response` fields. Some sites validate differently - check `form_analysis.captcha_selector` for custom injection points.

### Database Concurrency
SQLite is used in WAL mode for better concurrency. Avoid running multiple bot instances simultaneously - they'll conflict on state updates.

### Screenshot Naming
Screenshots use format: `{broker_id}_{timestamp}_{status}.png`
- Example: `spokeo_20240315_143022_submitted.png`

### Form Analysis Schema
`form_analysis.field_mappings` is JSON with structure:
```json
{
  "first_name": {
    "selector": "#fname",
    "type": "text",
    "required": true
  }
}
```

Parse with `JSON.parse()` when using.

## Troubleshooting

**Bot hangs during submission:**
- Check `required_delays` in form_analysis table
- Some sites require artificial delays to avoid rate limiting

**CAPTCHA API fails:**
- Verify API key: `node -e "console.log(require('dotenv').config().parsed.CAPTCHA_API_KEY)"`
- Check balance: `node utils/test-captcha-solver.js`
- Review `captcha_stats` table for error patterns

**Database locked errors:**
- Ensure no other bot instances running: `ps aux | grep gdpr-optout-bot`
- Kill orphaned processes: `pkill -f gdpr-optout-bot`

**Screenshots not saving:**
- Check `data/screenshots/` exists: `mkdir -p data/screenshots`
- Verify write permissions: `ls -ld data/screenshots`
