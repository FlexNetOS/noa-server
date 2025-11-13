# Frequently Asked Questions (FAQ)

Common questions and answers for new NOA Server team members.

## Getting Started

### Q: What is NOA Server?

**A:** NOA Server (Neural Orchestration & Automation Server) is an AI
infrastructure platform that provides unified access to multiple AI providers
(OpenAI, Claude, llama.cpp) with advanced features like intelligent routing,
caching, rate limiting, and monitoring.

### Q: What will I be working on?

**A:** Depending on your team:

- **Backend**: AI provider integration, API development, message queues
- **Infrastructure**: Deployment, monitoring, performance optimization
- **Platform**: Dashboard UI, developer tools, MCP servers

### Q: Who is my manager?

**A:** Check your welcome email or ask in `#onboarding` on Slack.

### Q: Who is my mentor?

**A:** You'll be assigned a mentor on Day 1. Check Slack for your mentor
assignment.

### Q: What hours should I work?

**A:** We have flexible hours. Core hours are 10 AM - 4 PM for meetings.
Otherwise, work when you're most productive. Discuss with your manager.

## Development Environment

### Q: What IDE should I use?

**A:** VS Code is recommended and most team members use it. You can use any IDE
you prefer, but VS Code has the best support for our stack.

### Q: My `pnpm install` is failing. What should I do?

**A:** Common solutions:

```bash
# Clear cache
rm -rf node_modules
pnpm store prune

# Reinstall
pnpm install

# Check Node version
node --version  # Should be 20+

# Update pnpm
npm install -g pnpm@latest
```

If still failing, ask in `#help` on Slack.

### Q: Docker containers won't start. Help?

**A:** Check:

```bash
# Is Docker running?
docker info

# Check for port conflicts
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# Restart Docker
# macOS/Windows: Restart Docker Desktop
# Linux: sudo systemctl restart docker
```

### Q: Where do I get API keys for development?

**A:** Ask your mentor or team lead. For local development, you can use test
keys. Production keys are in our secrets manager (access required).

### Q: Tests are failing locally. What should I do?

**A:** First, ensure:

```bash
# Dependencies installed
pnpm install

# Environment variables set
ls -la .env packages/*/.env

# Docker services running
docker ps

# Run tests with verbose output
pnpm test -- --reporter=verbose
```

If still failing, compare with `main` branch.

## Codebase

### Q: How is the codebase organized?

**A:** We use a monorepo structure:

- `/packages` - All application packages
- `/docs` - Documentation
- `/scripts` - Build and automation scripts
- `/tests` - Integration and E2E tests

See [Codebase Tour](CODEBASE_TOUR.md) for details.

### Q: Where should I put my code?

**A:** Depends on what you're building:

- API endpoint → `packages/ai-inference-api/src/routes/`
- AI provider → `packages/ai-provider/src/providers/`
- Message queue job → `packages/message-queue/src/jobs/`
- Monitoring → `packages/monitoring/src/`

### Q: How do I find where a function is defined?

**A:** Use VS Code's "Go to Definition":

- Click function name
- Press `F12` or `Cmd+Click` (macOS)
- Or use search: `Cmd+Shift+F`

### Q: What coding style should I follow?

**A:** We use:

- ESLint for linting
- Prettier for formatting
- TypeScript strict mode
- Run `pnpm lint:fix && pnpm format` before committing

### Q: How do I know what to work on?

**A:** Check:

1. GitHub Issues labeled "good first issue"
2. Sprint board on GitHub Projects
3. Ask your mentor or team lead
4. Team Slack channels

## Git & GitHub

### Q: What's our branching strategy?

**A:** We use feature branches:

- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `hotfix/description` - Urgent fixes

See [Development Workflow](WORKFLOW.md) for details.

### Q: How do I create a PR?

**A:**

```bash
# Create branch
git checkout -b feature/my-feature

# Make changes and commit
git commit -m "feat: add new feature"

# Push
git push origin feature/my-feature

# Create PR on GitHub
# Fill out PR template
```

### Q: What should my commit message look like?

**A:** Use Conventional Commits:

```
feat(api): add streaming support
fix(cache): resolve memory leak
docs(readme): update setup instructions
test(queue): add RabbitMQ tests
```

### Q: How long should a PR be?

**A:** Aim for 200-400 lines of code. Smaller PRs are easier to review and
merge.

### Q: Who should review my PR?

**A:** Start with your mentor. After a few PRs, request reviews from relevant
team members based on the area you're working on.

### Q: How long until my PR is reviewed?

**A:** Most PRs are reviewed within 24 hours. If not, ping in Slack or request
review again.

### Q: What if I disagree with review feedback?

**A:** Discuss politely! Explain your reasoning. If still unclear, ask mentor or
escalate to senior engineer for input.

## Testing

### Q: Do I really need to write tests?

**A:** Yes! All PRs require tests. We aim for >90% code coverage.

### Q: What kind of tests should I write?

**A:**

- **Unit tests**: Test individual functions/classes
- **Integration tests**: Test multiple components together
- **E2E tests**: Test complete user flows

### Q: How do I run tests?

**A:**

```bash
# All tests
pnpm test

# Unit tests only
pnpm test:unit

# Integration tests
pnpm test:integration

# Watch mode
pnpm test:watch

# With coverage
pnpm test:coverage
```

### Q: My tests pass locally but fail in CI. Why?

**A:** Common causes:

- Environment variables not set in CI
- Docker services not available
- Timing issues (use proper async/await)
- Different Node version

Check CI logs for details.

## Deployment

### Q: How do I deploy my changes?

**A:** You don't manually deploy. After PR is merged to `main`:

1. CI pipeline runs tests
2. If passing, automatically deploys to staging
3. After testing, senior engineer deploys to production

### Q: Can I deploy to production?

**A:** Not in your first month. You'll get deployment access after training and
approval from your manager.

### Q: How do I test in staging?

**A:** After merging to `main`:

```bash
# Staging URL
https://staging-api.noa-server.dev

# Test your changes
curl https://staging-api.noa-server.dev/your-endpoint
```

### Q: What if I break production?

**A:** Don't panic!

1. Immediately notify in `#incidents` Slack channel
2. Senior engineer will help rollback
3. Post-mortem to learn and improve
4. We have safeguards to minimize impact

## Troubleshooting

### Q: I'm stuck. What should I do?

**A:**

1. Search documentation and codebase
2. Google the error message
3. Ask in `#help` on Slack
4. Ask your mentor
5. Attend office hours (Tuesday/Thursday)

### Q: Where can I find X in the codebase?

**A:** Use search:

```bash
# Search in files
grep -r "search term" packages/

# Find files by name
find packages/ -name "filename"

# VS Code search
Cmd+Shift+F (macOS)
Ctrl+Shift+F (Windows/Linux)
```

### Q: How do I debug a failing test?

**A:**

```bash
# Run specific test file
pnpm test packages/ai-provider/src/__tests__/model-registry.test.ts

# Run with debugger
node --inspect-brk node_modules/.bin/vitest

# Add console.log in test
# Check test output for clues
```

### Q: The API returns 500 error. How do I debug?

**A:**

```bash
# Check logs
docker logs <container-name>

# Check Sentry for errors
# Check monitoring dashboard

# Run with verbose logging
DEBUG=* pnpm dev
```

## Team & Culture

### Q: What time are stand-ups?

**A:** Monday 10:00 AM. Check team calendar.

### Q: Are meetings mandatory?

**A:**

- Stand-ups: Yes
- Tech reviews: Yes
- Demos: Yes
- 1:1s: Yes
- Others: Check with your manager

### Q: Can I work remotely?

**A:** Check company policy. Many team members work hybrid or remote. Discuss
with your manager.

### Q: What's the dress code?

**A:** Casual. Wear what's comfortable. Business casual for client meetings.

### Q: Can I listen to music while coding?

**A:** Absolutely! Headphones are encouraged.

### Q: How do I request time off?

**A:** Use the HR system and notify your manager and team in advance.

### Q: What if I'm sick?

**A:** Notify your manager and team in Slack. Take care of yourself. No need to
work while sick.

## Learning & Growth

### Q: What should I learn first?

**A:** Follow the onboarding guide:

1. Development setup
2. Architecture overview
3. Codebase navigation
4. First contribution
5. Tutorials

### Q: Are there learning resources?

**A:** Yes! See [Learning Resources](LEARNING_RESOURCES.md) for:

- Books and courses
- Internal documentation
- External tutorials
- Team learning budget

### Q: Can I attend conferences?

**A:** Yes! We have a conference budget. Discuss with your manager.

### Q: How do I get promoted?

**A:** Focus on:

- Delivering high-quality work
- Taking ownership
- Helping teammates
- Learning and growing
- Contributing to team culture

Discuss career growth in 1:1s with your manager.

### Q: Can I contribute to open source?

**A:** Yes! Encouraged during work hours if related to our stack. Ask manager
for approval.

## Technical Questions

### Q: Which AI provider should I use for X?

**A:** The system automatically selects the best provider. For manual selection,
see provider documentation or ask in `#ai-provider` Slack channel.

### Q: How does caching work?

**A:** Multi-tier caching:

1. Memory cache (in-process)
2. Redis cache (shared)
3. Database (persistent)

See caching documentation for details.

### Q: How does rate limiting work?

**A:** Token bucket algorithm per API key and per provider. See rate limiting
documentation.

### Q: How do I add a new API endpoint?

**A:** See tutorial:
[Build Your First API Endpoint](tutorials/01-first-api-endpoint.md)

### Q: How do I add a new AI provider?

**A:** See tutorial:
[Integrate a New AI Provider](tutorials/02-add-ai-provider.md)

### Q: What's the difference between X and Y package?

**A:** See [Architecture Overview](ARCHITECTURE.md) for component descriptions.

## Still Have Questions?

### Where to Ask

- **General questions**: `#help` on Slack
- **Technical questions**: Relevant team channel (`#backend`, `#platform`, etc.)
- **Onboarding questions**: `#onboarding` on Slack
- **Private questions**: DM your mentor or manager
- **Office hours**: Tuesday & Thursday, 3-5 PM

### How to Ask

Good questions include:

- What you're trying to do
- What you've already tried
- Error messages or logs
- Relevant code snippets

**Example:**

```
I'm trying to add a new API endpoint but getting a 404 error.

What I've tried:
- Added route in src/routes/my-route.ts
- Registered in src/index.ts
- Restarted server

Error:
GET /api/v1/my-endpoint returns 404

Code: [link to branch or gist]

Any ideas what I'm missing?
```

---

**Don't see your question?** Ask in `#onboarding` and we'll add it to this FAQ!
