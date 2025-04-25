# actions-azure-cache

This action enables caching dependencies to self-managed Azure blob storage.

It also has github [actions/cache@v2](https://github.com/actions/cache) fallback if blob storage save & restore fails

## Usage

```yaml
name: dev ci

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build_test:
    runs-on: [ubuntu-latest]

    steps:
      # Login to azure
      - name: Azure login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - uses: nurture-tech/actions-azure-cache@v1
        with:
          account: myorg-actions-cache # required
          container: cache # required
          use-fallback: true # optional, use github actions cache fallback, default true

          # actions/cache compatible properties: https://github.com/actions/cache
          key: ${{ runner.os }}-yarn-${{ hashFiles('**/yarn.lock') }}
          path: |
            node_modules
            .cache
          restore-keys: |
            ${{ runner.os }}-yarn-
```

To write to the cache only:

```yaml
      - uses: nurture-tech/actions-azure-cache@v1
        with:
          account: myorg-actions-cache # required
          container: cache # required
          # actions/cache compatible properties: https://github.com/actions/cache
          key: ${{ runner.os }}-yarn-${{ hashFiles('**/yarn.lock') }}
          path: |
            node_modules
```

To restore from the cache only:

```yaml
      - uses: nurture-tech/actions-azure-cache@v1
        with:
          account: myorg-actions-cache # required
          container: cache # required
          # actions/cache compatible properties: https://github.com/actions/cache
          key: ${{ runner.os }}-yarn-${{ hashFiles('**/yarn.lock') }}
          path: |
            node_modules
```

## Restore keys

`restore-keys` works similar to how github's `@actions/cache@v2` works: It search each item in `restore-keys`
as prefix in object names and use the latest one

## Azure Blob Store permissions

The Azure credentials supplied must have the `Storage Blob Data Contributor` role on the storage container.

# Note on release

This project follows semantic versioning. Backward incompatible changes will
increase major version.

There is also the `v1` compatible tag that's always pinned to the latest
`v1.x.y` release.

It's done using:

```
git tag -a v1 -f -m "v1 compatible release"
git push -f --tags
```
