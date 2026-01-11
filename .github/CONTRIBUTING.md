# Contributing to Chit Fund Manager

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Deployment](#deployment)

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow professional standards

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB (local or Atlas)
- Git

### Initial Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/chit-fund-manager.git
   cd chit-fund-manager
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/chit-fund-manager.git
   ```

4. Install dependencies:
   ```bash
   npm run install:all
   ```

5. Copy environment file:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

6. Start development servers:
   ```bash
   npm run dev
   ```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates
- `chore/` - Maintenance tasks

### 2. Make Your Changes

- Write clean, readable code
- Follow existing code style
- Add comments for complex logic
- Update documentation as needed

### 3. Test Your Changes

Run local tests before committing:

```bash
# Linux/Mac
./scripts/local-test.sh

# Windows
.\scripts\local-test.ps1
```

Or run individual test commands:

```bash
# Backend tests
npm test

# Frontend build
cd frontend && npm run build

# Linting
npm run lint
```

### 4. Commit Your Changes

Follow conventional commit format:

```bash
git add .
git commit -m "feat: add new feature"
```

Commit types:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test additions/updates
- `chore:` - Maintenance tasks

### 5. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

## Pull Request Process

### 1. Create Pull Request

- Go to GitHub and create a PR from your fork
- Fill out the PR template completely
- Link any related issues
- Add appropriate labels

### 2. PR Checklist

Ensure your PR:
- [ ] Passes all CI/CD checks
- [ ] Includes tests for new features
- [ ] Updates documentation
- [ ] Follows code style guidelines
- [ ] Has descriptive commit messages
- [ ] Doesn't include sensitive data
- [ ] Has been tested locally

### 3. Code Review

- Respond to review comments promptly
- Make requested changes
- Push updates to the same branch
- Re-request review when ready

### 4. Merge

Once approved:
- Squash commits if requested
- Ensure branch is up to date with main
- Maintainer will merge the PR

## Coding Standards

### JavaScript/Node.js

- Use ES6+ syntax
- Use async/await over callbacks
- Handle errors appropriately
- Use meaningful variable names
- Keep functions small and focused
- Add JSDoc comments for public functions

Example:
```javascript
/**
 * Calculates the total amount for a chit group
 * @param {Object} chitGroup - The chit group object
 * @returns {number} Total amount
 */
async function calculateTotal(chitGroup) {
  // Implementation
}
```

### React/Frontend

- Use functional components with hooks
- Keep components small and reusable
- Use prop-types or TypeScript for type checking
- Follow React best practices
- Use meaningful component names

Example:
```jsx
function ChitGroupCard({ group, onSelect }) {
  // Component implementation
}
```

### File Organization

```
backend/
├── models/          # Database models
├── routes/          # API routes
├── controllers/     # Route handlers
├── middleware/      # Custom middleware
├── utils/           # Utility functions
└── services/        # Business logic

frontend/
├── src/
│   ├── components/  # Reusable components
│   ├── pages/       # Page components
│   ├── context/     # React context
│   ├── hooks/       # Custom hooks
│   ├── services/    # API services
│   └── utils/       # Utility functions
```

## Testing

### Backend Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- path/to/test.js
```

### Frontend Testing

```bash
cd frontend

# Run linting
npm run lint

# Build test
npm run build
```

### Writing Tests

- Test critical functionality
- Use descriptive test names
- Test edge cases
- Mock external dependencies
- Aim for >80% coverage

Example:
```javascript
describe('ChitGroup Model', () => {
  it('should create a new chit group with valid data', async () => {
    const group = await ChitGroup.create({
      name: 'Test Group',
      totalMembers: 10
    });

    expect(group.name).toBe('Test Group');
  });
});
```

## Deployment

### CI/CD Pipeline

Our project uses GitHub Actions for automated deployment:

1. **PR Validation** - Runs on every PR
   - Linting
   - Tests
   - Build check
   - Security audit

2. **Production Deployment** - Runs on merge to main
   - Tests
   - Build
   - Deploy to Render (backend)
   - Deploy to Vercel (frontend)
   - Health checks

3. **Staging Deployment** - Runs on merge to develop
   - Deploy to staging environment
   - Testing in staging

### Manual Testing Before Push

Always run pre-deployment checks:

```bash
# Linux/Mac
./scripts/deploy-check.sh

# Windows PowerShell
# (create equivalent PowerShell script)
```

### Emergency Rollback

If deployment causes issues:

1. Go to GitHub Actions
2. Run "Emergency Rollback" workflow
3. Select target (backend/frontend/both)
4. Provide reason
5. Follow manual rollback instructions

## Environment Variables

Never commit sensitive data! Use environment variables:

- Development: `.env` (gitignored)
- Production: Set in hosting platform
- CI/CD: GitHub Secrets

Required variables are documented in `.env.example`

## Documentation

Update documentation when:
- Adding new features
- Changing API endpoints
- Modifying environment variables
- Updating deployment process
- Changing configuration

Documentation locations:
- README.md - Project overview
- API docs - Backend API reference
- Component docs - Frontend components
- Deployment guides - `.github/` directory

## Getting Help

- Check existing issues and PRs
- Review documentation
- Ask in discussions
- Create an issue for bugs
- Reach out to maintainers

## Recognition

Contributors will be:
- Listed in release notes
- Credited in CHANGELOG
- Acknowledged in README

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to Chit Fund Manager! 🎉
