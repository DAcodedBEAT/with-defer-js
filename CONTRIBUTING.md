# Contributing to with-defer.js 🎉

Hey there! Thanks for your interest in contributing to **with-defer.js**! We appreciate your help in making this library
even better. Here’s how you can get involved:

## How to Contribute 🤗

### Reporting Issues 🐛

If you spot a bug or have a feature idea, please let us know! Here's how:

1. Open an issue in the [GitHub Issues](https://github.com/DAcodedBEAT/with-defer-js/issues) section.
2. Provide a clear description of the problem or feature request.
3. If it's a bug, include steps to reproduce it.

### Pull Requests 💌

We love pull requests! Here’s how to submit one:

1. **Fork the Repo**: Click the "Fork" button at the top right.
2. **Clone Your Fork**:
    ```bash
    git clone https://github.com/YOUR-USERNAME/with-defer-js.git
    cd with-defer-js
    ```
3. **Create a Branch**:
    ```bash
    git checkout -b feature/your-feature-name
    ```
4. **Make Your Changes**: Add your features or fixes!
5. **Commit Your Changes**:

> [!IMPORTANT]
> Please write commits using the [Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/)

    ```bash
    git commit -m "feat(error-handling): added some error-handling feature"
    ```

6. **Push to Your Fork**:
    ```bash
    git push origin feature/your-feature-name
    ```
7. **Open a Pull Request**: Go to the original repo, click on "Pull Requests," and then "New Pull Request." Choose your
   branch.

### Code Style 🖊️

- Make sure your code conforms to the codebase's coding standards.
- Keep your code clean and readable.
- Write clear commit messages.

### Testing 🔍

If you add new features or make changes, please ensure your code is tested. Adding tests for new (and existing)
functionality is always welcome!

### Code of Conduct ✨

Please be respectful and considerate when contributing. We want to maintain a positive environment for everyone.

## Release Process 🚀

### For Maintainers Only

#### Prerequisites

Before setting up package publishing, ensure your npm account is secure:

1. **Enable Two-Factor Authentication (2FA)** on your npm account:
   - Go to [npm Account Settings](https://www.npmjs.com/settings/~/security)
   - Enable 2FA with your preferred method
   - **Important**: Create an **Automation Token** that bypasses 2FA
   - This token will be used in GitHub Actions

2. **Create GitHub Secrets**:
   - Go to your repository Settings → Secrets and variables → Actions
   - Create `NPM_TOKEN` with your npm automation token
   - Create `GITHUB_TOKEN` (usually auto-available in GitHub Actions)
   - **Never** commit or expose these tokens directly

#### Automated Release Process

This project uses **semantic-release** for fully automated versioning and publishing:

**How it works:**
1. Push commits to `main` using [Conventional Commits](https://www.conventionalcommits.org/)
   - `feat:` → Minor version bump
   - `fix:` → Patch version bump
   - `feat!:` or `BREAKING CHANGE:` → Major version bump

2. The `release.yml` workflow automatically:
   - Analyzes commits since last release
   - Bumps version in `package.json`
   - Generates `CHANGELOG.md`
   - Creates GitHub Release with proper tag
   - Publishes to npm with provenance
   - Commits changes back to `main`

**Example workflow:**
```bash
# Make changes and commit with conventional commit
git commit -m "feat: add new feature"
git commit -m "fix: resolve issue"
git push origin main

# GitHub Actions automatically:
# - Detects changes
# - Bumps version (e.g., 0.0.3 → 0.1.0)
# - Publishes to npm
# - Creates GitHub Release
```

**Manual Verification:**
- Check [npm](https://www.npmjs.com/package/@dacodedbeat/with-defer-js) for new version
- Check [GitHub Releases](https://github.com/DAcodedBEAT/with-defer-js/releases) for release notes
- Check [CHANGELOG.md](./CHANGELOG.md) for detailed changes

### Versioning

We follow [Semantic Versioning](https://semver.org/):
- **Major (X.0.0)**: Breaking changes
- **Minor (0.X.0)**: New features (backwards compatible)
- **Patch (0.0.X)**: Bug fixes and improvements (backwards compatible)

### Conventional Commits

All commits should follow the [Conventional Commits specification](https://www.conventionalcommits.org/):
- `feat:` for new features
- `fix:` for bug fixes
- `perf:` for performance improvements
- `docs:` for documentation changes
- `test:` for test additions/updates
- `chore:` for maintenance tasks
- Use `BREAKING CHANGE:` prefix for breaking changes

## Thanks for Contributing! 🙌

Your contributions help make **with-defer.js** a great tool for everyone. We appreciate your time and effort!
