# Code Review Guidelines

Effective code reviews improve code quality, share knowledge, and maintain
consistency across the codebase. This guide explains how to give and receive
code reviews.

## Code Review Principles

### Goals of Code Review

1. **Catch bugs** before they reach production
2. **Improve code quality** and maintainability
3. **Share knowledge** across the team
4. **Ensure consistency** with code standards
5. **Mentor** junior developers
6. **Build team culture** of collaboration

### Review Philosophy

- **Be kind and constructive** - Focus on the code, not the person
- **Be thorough but efficient** - Balance depth with review time
- **Be specific** - Provide clear, actionable feedback
- **Be respectful** - Assume good intent
- **Be humble** - You might learn something too

## Review Process

### As a Reviewer

#### 1. Understand the Context

Before reviewing code:

```markdown
- Read the PR description and linked issues
- Understand what problem is being solved
- Check the type of change (bug fix, feature, refactor)
- Note any special requirements or constraints
```

#### 2. High-Level Review

Start with the big picture:

**Architecture & Design:**

- Does the approach make sense?
- Is it consistent with existing patterns?
- Are there simpler alternatives?
- Will it scale?

**Testing:**

- Are there adequate tests?
- Do tests cover edge cases?
- Are tests meaningful and not just for coverage?

**Documentation:**

- Is the code self-explanatory?
- Are complex parts documented?
- Is the README/API docs updated?

#### 3. Detailed Code Review

Review the implementation:

**Code Quality:**

- Readable and maintainable?
- Follows project conventions?
- No code duplication?
- Proper error handling?

**Performance:**

- Any obvious performance issues?
- Unnecessary computations?
- Efficient algorithms?

**Security:**

- Input validation?
- Proper authentication/authorization?
- No hardcoded secrets?
- SQL injection prevention?

#### 4. Leave Feedback

**Types of comments:**

**Critical (must fix before merge):**

```markdown
🔴 CRITICAL: This will cause a memory leak. The connection is never closed.

- Change: Add `connection.close()` in the finally block
- Why: Prevents resource exhaustion in production
```

**Suggestion (should fix):**

```markdown
💡 SUGGESTION: Consider using a switch statement here instead of if-else chain.

- More readable for multiple conditions
- Easier to extend in the future
```

**Nitpick (optional):**

```markdown
🔹 NITPICK: Variable name could be more descriptive.

- Consider renaming `data` to `userProfile`
- Makes the code more self-documenting
```

**Praise (acknowledge good work):**

```markdown
✅ GREAT: Excellent error handling here! The detailed error messages will help
debugging.
```

**Question (ask for clarification):**

```markdown
❓ QUESTION: Why are we using a different caching strategy here than in the
other endpoints?
```

### Example Review Comments

**Good Review Comments:**

```markdown
🔴 CRITICAL: Race condition in cache update

Lines 45-52: Multiple async operations without proper locking could cause cache
corruption when requests arrive simultaneously.

Suggestion:

- Add a distributed lock (Redis lock) before cache update
- Or use atomic operations with Redis MULTI/EXEC

Reference: docs/architecture/caching-strategy.md
```

````markdown
💡 SUGGESTION: Extract validation logic to reusable function

This validation pattern is used in 3 places. Consider extracting to a shared
utility:

```typescript
function validateUserInput(data: unknown): User {
  return userSchema.parse(data);
}
```
````

Benefits:

- DRY principle
- Easier to update validation rules
- More testable

````

```markdown
❓ QUESTION: Performance implications of N+1 query

Line 78: This loops through users and queries the database for each one.
For 1000 users, this would make 1000 queries.

Could we use a single query with JOIN or batch loading instead?
````

**Bad Review Comments:**

```markdown
❌ "This is wrong"

# Not helpful - doesn't explain what's wrong or how to fix

❌ "Why did you do it this way?"

# Sounds accusatory - better: "Could you explain the reasoning behind this approach?"

❌ "Just use a switch statement"

# Not collaborative - better: "Consider using a switch statement because..."

❌ "This looks good 👍"

# Not thorough - missed potential issues
```

### Review Checklist

Use this checklist for thorough reviews:

#### Code Correctness

- [ ] Code does what it's supposed to do
- [ ] Edge cases are handled
- [ ] Error handling is comprehensive
- [ ] No obvious bugs

#### Tests

- [ ] Tests exist and are meaningful
- [ ] Tests pass in CI
- [ ] Edge cases are tested
- [ ] Coverage meets requirements (>90%)

#### Code Quality

- [ ] Readable and self-documenting
- [ ] Follows project conventions
- [ ] No unnecessary complexity
- [ ] DRY principle followed
- [ ] Proper naming (variables, functions, classes)

#### Performance

- [ ] No N+1 queries
- [ ] Efficient algorithms
- [ ] No unnecessary computations
- [ ] Caching used appropriately

#### Security

- [ ] Input validation
- [ ] No SQL injection vulnerabilities
- [ ] Secrets not hardcoded
- [ ] Authentication/authorization checks

#### Documentation

- [ ] Complex logic is commented
- [ ] README updated if needed
- [ ] API docs updated
- [ ] TypeScript types are accurate

### Review Etiquette

**Do:**

- Use "we" language: "We could improve this by..."
- Ask questions: "What do you think about...?"
- Provide examples and references
- Acknowledge good work
- Be timely (review within 24 hours)

**Don't:**

- Be condescending or sarcastic
- Nitpick on style (let linter handle it)
- Block on personal preferences
- Review your own PR (get someone else)

## As a PR Author

### Before Requesting Review

**Self-review checklist:**

```bash
# 1. Review your own diff on GitHub
- Look for console.logs, commented code, debug statements
- Check for formatting issues
- Ensure all tests pass

# 2. Verify CI passes
- All tests green ✅
- Linting passes
- Type checking passes
- Build succeeds

# 3. Update PR description
- Clear description of changes
- Link to related issues
- Testing instructions
- Screenshots if UI changes
```

### Responding to Feedback

**Good responses:**

```markdown
✅ "Good catch! Fixed in 3f2a1b4"

✅ "Thanks for the suggestion. I went with the switch statement approach because
it's more readable. See updated code in abc123."

✅ "Great question! I used this approach because of X. Happy to discuss
alternatives if you have concerns."

✅ "I'm not sure I understand. Could you clarify what you mean by...?"
```

**Bad responses:**

```markdown
❌ "Works on my machine" (dismissive)

❌ "That's how we did it at my last company" (not collaborative)

❌ Ignoring comments without response

❌ "This is how I always do it" (not receptive to feedback)
```

### After Review

**When changes are requested:**

```bash
# 1. Make changes
git add .
git commit -m "refactor: address review feedback"

# 2. Respond to each comment
- Mark resolved issues
- Explain changes made
- Ask for clarification if needed

# 3. Re-request review
- Click "Re-request review" on GitHub
```

**When approved:**

```bash
# 1. Verify CI is green
# 2. Squash and merge (or merge per team preference)
# 3. Delete branch
# 4. Thank reviewers
```

## Common Review Scenarios

### Scenario 1: Large PR

**Problem:** PR has 2000+ lines of code

**Solution:**

```markdown
💡 "This PR is quite large and would benefit from being split up. Could you
break this into smaller PRs: - PR 1: Database schema changes - PR 2: API
endpoints - PR 3: Frontend integration

     This makes review easier and reduces merge risk."
```

### Scenario 2: Missing Tests

**Problem:** No tests for new feature

**Solution:**

```markdown
🔴 CRITICAL: Missing tests for the new feature

Please add:

- Unit tests for the validation function
- Integration tests for the API endpoint
- Edge case: What happens when input is null?

Target: >90% code coverage
```

### Scenario 3: Performance Issue

**Problem:** Inefficient database query

**Solution:**

````markdown
🔴 CRITICAL: N+1 query will cause performance issues

Current code:

```typescript
for (const user of users) {
  const posts = await db.posts.findMany({ userId: user.id });
}
```
````

Suggested fix:

```typescript
const userIds = users.map((u) => u.id);
const posts = await db.posts.findMany({
  where: { userId: { in: userIds } },
});
```

This reduces 100 queries to 1.

````

### Scenario 4: Security Vulnerability

**Problem:** SQL injection risk

**Solution:**
```markdown
🔴 CRITICAL: SQL injection vulnerability

Line 42: User input is directly interpolated into SQL query.

```typescript
// DON'T DO THIS
const query = `SELECT * FROM users WHERE id = ${userId}`;

// DO THIS
const query = 'SELECT * FROM users WHERE id = $1';
const result = await db.query(query, [userId]);
````

Please use parameterized queries or an ORM.

````

### Scenario 5: Code Duplication

**Problem:** Same logic in multiple places

**Solution:**
```markdown
💡 SUGGESTION: Extract duplicated validation logic

This validation pattern appears in 3 files:
- src/routes/users.ts (lines 23-30)
- src/routes/posts.ts (lines 45-52)
- src/routes/comments.ts (lines 67-74)

Consider extracting to a shared utility:

```typescript
// src/utils/validation.ts
export function validateId(id: unknown): string {
  const schema = z.string().uuid();
  return schema.parse(id);
}
````

Benefits: DRY, easier to maintain, single source of truth

````

## Review Templates

### Template 1: Quick Approval

```markdown
## Review Summary

Looks good! ✅

### Checked
- [x] Code correctness
- [x] Tests coverage
- [x] Documentation updated
- [x] No security issues

### Notes
- Nice use of TypeScript generics on line 45
- Good test coverage (94%)

Approved for merge.
````

### Template 2: Changes Requested

```markdown
## Review Summary

Thanks for the PR! I have a few concerns that need to be addressed before merge.

### Critical Issues (Must Fix)

1. [Line 42] SQL injection vulnerability - use parameterized queries
2. [Line 78] Missing error handling - add try/catch

### Suggestions (Should Fix)

1. [Line 23] Consider extracting duplicated logic
2. [Line 56] Variable naming could be more descriptive

### Questions

1. Why use setTimeout instead of setInterval here?
2. Have you considered the performance implications with 10k+ items?

Happy to discuss any of these points!
```

### Template 3: Minor Feedback

```markdown
## Review Summary

Looking good overall! Just a few minor suggestions.

### Optional Improvements

- Line 34: Consider using `const` instead of `let`
- Line 67: Could simplify this with optional chaining (`user?.email`)

### Praise

- Excellent test coverage!
- Well-documented complex logic

Approved with minor suggestions. Feel free to merge after considering the above.
```

## Reviewing Different Types of Changes

### Bug Fixes

Focus on:

- Does it actually fix the bug?
- Are there tests preventing regression?
- Are there other places with the same bug?

### New Features

Focus on:

- Is the approach sound?
- Does it fit the architecture?
- Are there tests?
- Is it documented?

### Refactoring

Focus on:

- Does it improve code quality?
- Is behavior preserved?
- Are there tests proving equivalence?

### Documentation

Focus on:

- Is it accurate?
- Is it clear and helpful?
- Are examples correct?

## Advanced Review Techniques

### 1. Testing Locally

```bash
# Checkout PR branch
gh pr checkout 123

# Run tests
pnpm test

# Run locally
pnpm dev

# Test the feature manually
```

### 2. Pair Review

For complex changes:

- Schedule a call with the author
- Walk through the code together
- Discuss design decisions
- Ask questions in real-time

### 3. Architectural Review

For major changes:

- Review design doc first
- Check alignment with architecture
- Consider future implications
- Involve senior engineers

## Next Steps

- **[Testing Guide](TESTING.md)** - Write comprehensive tests
- **[Debugging Guide](DEBUGGING.md)** - Debug effectively
- **[API Development Guide](API_DEVELOPMENT.md)** - Build APIs

---

**Next**: [Testing Guide →](TESTING.md)
