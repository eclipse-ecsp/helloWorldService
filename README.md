# helloWorldService

ECSP service for CICD integration test

---

## Table of Contents
- [Introduction](#introduction)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Support](#support)
- [Security Contact Information](#security-contact-information)
- [License](#license)
- [How to contribute](#how-to-contribute)
- [Code of Conduct](#code-of-conduct)
- [Authors](#authors)
- [Troubleshooting](#troubleshooting)
- [Announcements](#announcements)

---

## Introduction
helloWorldService is a sample ECSP service designed for CI/CD integration testing. It demonstrates automated build, test, license compliance, and release workflows using GitHub Actions. The project is built with Java and Maven, and includes Docker support for containerized deployments.

[![Build](https://github.com/eclipse-ecsp/helloWorldService/actions/workflows/maven-build.yml/badge.svg)](https://github.com/eclipse-ecsp/helloWorldService/actions/workflows/maven-build.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=eclipse-ecsp_helloWorldService&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=eclipse-ecsp_helloWorldService)
[![License Compliance](https://github.com/eclipse-ecsp/helloWorldService/actions/workflows/licence-compliance.yaml/badge.svg)](https://github.com/eclipse-ecsp/helloWorldService/actions/workflows/licence-compliance.yaml)
[![Latest Release](https://img.shields.io/github/v/release/eclipse-ecsp/helloWorldService?sort=semver)](https://github.com/eclipse-ecsp/helloWorldService/releases)

---

## GitHub Actions Workflows

This repository uses several GitHub Actions workflows for CI/CD automation:

### 1. Maven Build & Sonar Analysis (`.github/workflows/maven-build.yml`)
- **Triggers:**
  - On push or pull request to the `main` branch
  - Manually via the GitHub Actions tab
- **What it does:**
  - Runs a Maven build (`clean package`)
  - Performs SonarCloud code analysis
  - Updates dependencies (creates PRs if updates are found)
  - Pushes Docker images to the registry (on `main` branch)

#### Workflow YAML Example
```yaml
name: Maven Build & Sonar Analysis

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]
  workflow_dispatch:

jobs:
  maven_build:
    uses: eclipse-ecsp/.github/.github/workflows/workflow-maven-run.yml@main
    name: Maven Build
    with:
      maven_args: 'clean package --file pom.xml'
    secrets:
      token: ${{ secrets.GITHUB_TOKEN }}
  sonar_analysis:
    needs: maven_build
    uses: eclipse-ecsp/.github/.github/workflows/workflow-sonar-analysis.yml@main
    secrets:
      token: ${{ secrets.SONAR_TOKEN }}
  dependencies_update:
    needs: sonar_analysis
    uses: eclipse-ecsp/.github/.github/workflows/workflow-dependencies-update.yml@main
    secrets: inherit
    permissions:
      pull-requests: write
      contents: read

  docker_push:
    needs: sonar_analysis
    if: github.ref_name == 'main'
    uses: eclipse-ecsp/.github/.github/workflows/workflow-docker-push.yml@main
    secrets: inherit
    with:
      #image_tag: '0.0.1'
      maven_args: 'clean package --file pom.xml'
```

#### Manual Trigger
Go to the **Actions** tab, select **Maven Build & Sonar Analysis**, and click **Run workflow**.

### 2. License Compliance (`.github/workflows/licence-compliance.yaml`)
- **Triggers:**
  - On any push or pull request (except for `.md` and `.txt` file changes)
  - Manually via the GitHub Actions tab
- **What it does:**
  - Checks all project dependencies for license compliance using a shared workflow

#### Workflow YAML Example
```yaml
name: License Compliance

on:
  push:
    branches: [ "*" ]
    paths-ignore:
      - '**/*.md'
      - '**/*.txt'
  pull_request:
    branches: [ "*" ]
  workflow_dispatch:

permissions:
  pull-requests: read
  contents: write

jobs:
  check_licences:
    uses: eclipse-ecsp/.github/.github/workflows/workflow-licences-analysis.yml@main
    name: Analyse Licences
    with:
      create-review: false
    secrets:
      token: ${{ secrets.GITLAB_API_TOKEN }}
```

#### Manual Trigger
Go to the **Actions** tab, select **License Compliance**, and click **Run workflow**.

### 3. Release Workflow (`.github/workflows/maven-release.yml`)
- **Triggers:**
  - On creation of a new GitHub Release
- **What it does:**
  - Runs SonarCloud analysis
  - Checks license compliance
  - Extracts the release version from the tag
  - Publishes build artifacts
  - Pushes a Docker image tagged with the release version
  - Updates the project to the next development version

#### Workflow YAML Example
```yaml
name: Release

on:
  release:
    types: [created]

jobs:
  sonar_analysis:
    uses: eclipse-ecsp/.github/.github/workflows/workflow-sonar-analysis.yml@main
    secrets:
      token: ${{ secrets.SONAR_TOKEN }}

  licence_compliance_status:
    needs: sonar_analysis
    uses: eclipse-ecsp/.github/.github/workflows/workflow-licences-analysis.yml@main
    name: Check Licence Compliance Status
    with:
      create-review: false

  extract_version:
    runs-on: ubuntu-latest
    needs: licence_compliance_status
    name: Extract release version without v prefix
    outputs:
      release_version: ${{ steps.set_version.outputs.release_version }}
    steps:
      - id: set_version
        run: |
          if [[ "${{ github.event_name }}" == "release" ]]; then
              if [[ "${{ github.event.release.tag_name }}" == v* ]]; then
                  version=${{ github.event.release.tag_name }}
                  echo "release_version=${version:1}" >> $GITHUB_ENV
                  echo "::set-output name=release_version::${version:1}"
              else
                  echo "release_version=${{ github.event.release.tag_name }}" >> $GITHUB_ENV
                  echo "::set-output name=release_version::${{ github.event.release.tag_name }}"
              fi
          else
            version=$(mvn help:evaluate -Dexpression=project.version -q -DforceStdout | sed 's/-SNAPSHOT//')
            echo "release_version=$version" >> $GITHUB_ENV
            echo "::set-output name=release_version::$version"

  publish_artifacts:
    needs: extract_version
    uses: eclipse-ecsp/.github/.github/workflows/workflow-publish-artifacts.yml@main
    secrets: inherit
    with:
      release_version: ${{ needs.extract_version.outputs.release_version }}

  docker_push:
    needs: extract_version
    uses: eclipse-ecsp/.github/.github/workflows/workflow-docker-push.yml@main
    secrets: inherit
    with:
      image_tag: ${{ needs.extract_version.outputs.release_version }}
      maven_args: 'clean package -P release'

  update_next_version:
    needs: extract_version
    uses: eclipse-ecsp/.github/.github/workflows/workflow-update-next-version.yml@main
    with:
      version: ${{ needs.extract_version.outputs.release_version }}
    secrets: inherit
```

#### How to Release
1. Create a new release on GitHub (use the Releases tab).
2. The workflow will run automatically and handle versioning, artifact publishing, and Docker image push.

---

## Notes
- Ensure required secrets (`GITHUB_TOKEN`, `SONAR_TOKEN`, etc.) are set in the repository settings.
- For more details, see the workflow YAML files in `.github/workflows/`.

## How to contribute

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details about contribution guidelines and the process for submitting pull requests to us.

## Code of Conduct

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for details about our code of conduct
and the process for submitting pull requests to us.

## Authors
* **[Abhishek Kumar](https://github.com/abhishekkumar-harman)** - *Initial work*

For a list contributors to this project, see the [list of [contributors](../../graphs/contributors).

## Security Contact Information

See [SECURITY.md](./SECURITY.md) to raise any security related issues.

## Support

Contact the project developers via the project's "dev" list - https://accounts.eclipse.org/mailing-list/ecsp-dev

## Troubleshooting

See[CONTRIBUTING.md](./CONTRIBUTING.md) for details about raising an issue and submitting a pull request to us.


## License

This project is licensed under the Apache-2.0 License. See the [LICENSE](./LICENSE) file for details.


## Announcements

All updates to this library are documented in [releases](../../releases).
For the available versions, see the [tags on this repository](../../tags).

