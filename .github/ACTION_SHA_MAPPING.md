# GitHub Actions SHA Mapping

This file documents the commit SHAs used for pinned GitHub Actions in our workflows.
All actions are pinned to specific commit SHAs for security (supply chain attack prevention).

**Last Updated**: 2025-10-23

## Core Actions (✅ VERIFIED)

### actions/checkout
- **v4** (Verified): `08eba0b27e820071cde6df949e0beb9ba4906955`
  - Used in: all workflows
  - Status: ✅ Verified working

### actions/setup-node
- **v4** (Verified): `49933ea5288caeca8642d1e84afbd3f7d6820020`
  - Used in: most build workflows
  - Status: ✅ Verified working

### actions/setup-python
- **v5** (Verified): `3605726ffa6ef7750b99ff496e5b88248b414e26`
  - Used in: Python-based workflows (Python 3.12)
  - Status: ✅ Verified working

### actions/upload-artifact
- **v4** (Verified): `ff15f0306b3f739f7b6fd43fb5d26cd321bd4de5`
  - Used in: CI/artifact workflows
  - Status: ✅ Verified working

### actions/download-artifact
- **v4.1.8** (Latest v4): `fa0a91b85d4f404e444e00e005971372dc801d16`
  - Released: 2024-09-30
  - Used in: CI/artifact workflows

### actions/cache
- **v3** (Verified): `2f8e54208210a422b2efd51efaa6bd6d7ca8920f`
  - Used in: cache workflows
  - Status: ✅ Verified working

### actions/github-script
- **v7.0.1** (Latest v7): `60a0d83039c74a4aee543508d2ffcb1c3799cdea`
  - Released: 2024-01-10
  - Used in: automation workflows

### actions/attest-sbom
- **v1.5.0** (Latest v1): `5026d3e739b5cdbafbf81cd4e26d0f9990d8cbe5`
  - Released: 2024-09-30
  - Used in: security workflows

## Package Manager Actions (✅ VERIFIED)

### pnpm/action-setup
- **v4** (Verified): `eae0cfeb286e66ffb5155f1a79b90583a127a68b`
  - Used in: Node.js workflows with pnpm
  - Status: ✅ Verified working

## Security Actions

### aquasecurity/trivy-action
- **master** (Latest): `5681af892cd0b3e6192a2d3f6d1b0c80b5e64169`
  - Note: Using specific commit from master branch
  - Used in: security scanning workflows

### github/codeql-action/init
- **v3.27.5** (Latest v3): `ea9e4e37992a54ee68a9622e985e60c8e8f12d9f`
  - Released: 2024-10-21
  - Used in: CodeQL security scanning

### github/codeql-action/autobuild
- **v3.27.5** (Latest v3): `ea9e4e37992a54ee68a9622e985e60c8e8f12d9f`
  - Released: 2024-10-21
  - Used in: CodeQL security scanning

### github/codeql-action/analyze
- **v3.27.5** (Latest v3): `ea9e4e37992a54ee68a9622e985e60c8e8f12d9f`
  - Released: 2024-10-21
  - Used in: CodeQL security scanning

### github/codeql-action/upload-sarif
- **v3.27.5** (Latest v3): `ea9e4e37992a54ee68a9622e985e60c8e8f12d9f`
  - Released: 2024-10-21
  - Used in: CodeQL security scanning

### gitleaks/gitleaks-action
- **v2.3.6** (Latest v2): `cb2b4efc32bc4da46f87834deb5df7e67962f44f`
  - Released: 2024-01-15
  - Used in: secret scanning

### snyk/actions/node
- **master** (Latest): `c23b5f27e6ff3a10bb8e46c8e9e65ebdbeb55bb6`
  - Note: Using specific commit from master
  - Used in: Snyk security scanning

### snyk/actions/docker
- **master** (Latest): `c23b5f27e6ff3a10bb8e46c8e9e65ebdbeb55bb6`
  - Note: Using specific commit from master
  - Used in: Snyk Docker scanning

### anchore/scan-action
- **v3.7.0** (Latest v3): `64a33b277ea7a1215a3c142735a1091341939ff5`
  - Released: 2024-06-14
  - Used in: Container scanning

### trufflesecurity/trufflehog
- **main** (Latest): `824ed45a7c95bc5b46d4164ee0d78f03f2e2da3d`
  - Note: Using specific commit from main
  - Used in: Secret scanning

## Docker Actions

### docker/setup-buildx-action
- **v3.7.1** (Latest v3): `8026d2bc3645ea78b0d2544766a1225eb5691f89`
  - Released: 2024-10-02
  - Used in: Docker build workflows

### docker/setup-qemu-action
- **v3.2.0** (Latest v3): `49b3bc8e6bdd4a60e6116a5414239cba5943d3cf`
  - Released: 2024-08-30
  - Used in: Multi-platform Docker builds

### docker/login-action
- **v3.3.0** (Latest v3): `9780b0c442fbb1117ed29e0efdff1e18412f7567`
  - Released: 2024-09-18
  - Used in: Docker registry login

### docker/metadata-action
- **v5.5.1** (Latest v5): `70b2cdc6480c1a8b86edf1777157f8f437de2166`
  - Released: 2024-01-23
  - Used in: Docker metadata generation

### docker/build-push-action
- **v5.4.0** (Latest v5): `4f58ea79222b3b9dc2c8bbdd6debcef730109a75`
  - Released: 2024-07-18
  - Used in: Docker build and push

## CI/CD Actions

### codecov/codecov-action
- **v4** (Verified): `ab904c41d6ece82784817410c45d8b8c02684457`
  - Used in: Code coverage reporting
  - Status: ✅ Verified working

### softprops/action-gh-release
- **v1.0.0** (Latest v1): `a485cc634e32a619a9f7b1a4c69e7da60b91c43e`
  - Released: 2024-01-02
  - Used in: GitHub release creation

### slackapi/slack-github-action
- **v1.27.0** (Latest v1): `37ebaef184d7626c5f204ab8d3baff4262dd30f0`
  - Released: 2024-09-17
  - Used in: Slack notifications

### trstringer/manual-approval
- **v1.9.1** (Latest v1): `662b3ddbc7685f897992051e87e1b9f3df3da470`
  - Released: 2024-01-15
  - Used in: Manual approval workflows

### Mattraks/delete-workflow-runs
- **v2.0.6** (Latest v2): `5c7cb72e02f3f1f1b32fb8e95ec8fe11efc7d5eb`
  - Released: 2024-02-14
  - Used in: Workflow cleanup

### aws-actions/configure-aws-credentials
- **v4.0.2** (Latest v4): `e3dd6a429d7300a6a4c196c26e071d42e0343502`
  - Released: 2024-01-04
  - Used in: AWS integration

## Update Policy

1. **Review Monthly**: Check for new stable releases
2. **Security First**: Update immediately for security patches
3. **Test Before Merge**: Test updated actions in feature branches
4. **Document Changes**: Update this file with new commit SHAs

## How to Update

1. Find the latest release at `https://github.com/<owner>/<repo>/releases`
2. Get the full commit SHA from the release tag
3. Update the workflow files with the new SHA
4. Update this mapping file
5. Test the workflows
6. Submit PR with changes

## Verification

To verify a commit SHA matches a version tag:
```bash
git clone https://github.com/<owner>/<repo>
cd <repo>
git show-ref --tags | grep <version>
```

---

**Note**: This file is maintained manually. Always verify commit SHAs before updating workflows.
