## Release Checklist

### Prerelease (several days prior)
- [Notify translators](https://app.transifex.com/openstreetmap/communication/?q=project%3Aid-editor) of the impending release
- Notify @Rub21

### Prep
- If you don't have a `transifex.auth` file in the root of your iD checkout,
you'll need to create a Transifex account, ask the project's maintainers for admin rights
on the iD project, and then create this file with contents like

  ````json
  { "password": "<your-transifex-api-key>" }
  ````

  where you insert your personal [transifex api token](https://app.transifex.com/user/settings/api/). This file is not version-controlled and will not be checked in.

### Update `iD`

#### Update `staging` branch

```bash
git checkout staging
npm install --save-dev @openstreetmap/editor-layer-index --omit=dev
npm clean-install
npm run imagery
npm run all
git add . && git commit -m 'npm run imagery'
npm run translations
git add . && git commit -m 'npm run translations'
```

- Check and finalize `CHANGELOG.md`

```bash
ID_VERSION=A.B.C
npm version --no-git-tag-version $ID_VERSION
git add . && git commit -m "v$ID_VERSION"
git push origin staging
```

#### Update and tag `release` branch

```bash
git checkout release
git reset --hard staging
npm run all
git add -f dist
git commit -m 'Check in build'
git tag "v$ID_VERSION" -m "v$ID_VERSION" --sign
git push origin -f release "v$ID_VERSION"
```
- Open https://github.com/openstreetmap/iD/tags
- Click `•••` –> `Create Release`, paste version(vA.B.C) to `Release title` and copy/paste the relevant [`changelog`](https://github.com/OpenHistoricalMap/iD/blob/release/CHANGELOG.md) entries into the description of the release.

#### Push release to npm

```bash
npm login
npm publish
```

#### Prepare `staging` branch for further development

```bash
git checkout staging
```

Add section in `CHANGELOG.md` for new version number (e.g. `# Unreleased (AA.BB.0-dev)`).

```bash
npm version --no-git-tag-version vAA.BB.0-dev
git add . && git commit -m 'Set development version number'
git push origin staging
```

### Update `ohm-website`

- Create a PR branch that updates the version number of iD (`@openhistoricalmap/id`) in the [`package.json`](https://github.com/OpenHistoricalMap/ohm-website/blob/staging/package.json) file of the OpenHistoricalMap Website repository.
```bash
bundle install
bundle exec bin/yarn add "@openhistoricalmap/id@$ID_VERSION"
```
- If there have been any changes to iD's [URL parameters](https://github.com/OpenHistoricalMap/iD/blob/staging/API.md#url-parameters), make sure they're reflected in [app/assets/javascripts/edit/id.js.erb](https://github.com/OpenHistoricalMap/ohm-website/blob/staging/app/assets/javascripts/edit/id.js.erb).
- Test the new version locally:
```bash
bundle exec rails assets:precompile
bundle exec rails server
```
- Open the pull request on github and link to the release on github in the issue text for the changelog.

