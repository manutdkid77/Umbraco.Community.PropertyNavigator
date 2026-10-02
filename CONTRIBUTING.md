# Contributing to Property Navigator

Thanks for taking the time to help. Bug reports, ideas and pull requests are all
welcome.

## Reporting a bug or suggesting a feature

Open an [issue](https://github.com/manutdkid77/Umbraco.Community.PropertyNavigator/issues)
and include:

- your Umbraco version and the package version
- what you did, what you expected, and what happened instead
- a screenshot, or any errors from the browser console, if you have them

## Submitting a pull request

1. Fork the repo and create a branch from `main`.
2. Make your change and test it in the TestSite (see below).
3. Add a line to [CHANGELOG.md](CHANGELOG.md) under an *Unreleased* heading.
4. Open a pull request describing what changed and why. The build workflow checks
   that the package builds and packs.

Keep pull requests focused: one fix or feature per PR is easiest to review.

## Running it locally

Open `src/Umbraco.Community.PropertyNavigator.slnx` and run the **TestSite**
(`https://localhost:44396/umbraco`). On first run it installs itself unattended
(SQLite) with the Clean starter kit, and a local admin:

- **Email:** `admin@example.com`
- **Password:** `1234567890`

These are throwaway credentials for the local test database only (set in
`TestSite/appsettings.Development.json`, the same as `dotnet new umbraco
--friendly-name "Administrator" --email "admin@example.com" --password
"1234567890"` generates). Never reuse them anywhere real.

After the first run, per the Clean starter kit's setup steps: log in, **save and
publish the Home page**, and **save one dictionary item** in the Translation
section. The front end renders after that. (The backoffice, and so the
navigator, works without it.)

The package's JS is served straight from its `wwwroot` via static web assets, so
JS edits show up on a browser refresh (hard-refresh if cached); C# changes and
`umbraco-package.json` changes need a restart.

For implementation notes and v17 gotchas, see [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md).

## Repository layout

```
src/
├── Directory.Packages.props                       # central package versions (Umbraco 17.0.0 floor)
├── Umbraco.Community.PropertyNavigator.slnx
├── Umbraco.Community.PropertyNavigator/           # the package (Razor Class Library → NuGet)
│   ├── Configuration/PropertyNavigatorOptions.cs  # the appsettings options
│   ├── Controllers/PropertyNavigatorConfigController.cs  # exposes them to the backoffice
│   ├── Composers/PropertyNavigatorComposer.cs     # options binding + Swagger doc
│   └── wwwroot/App_Plugins/PropertyNavigator/     # the backoffice extension (no-build JS)
└── Umbraco.Community.PropertyNavigator.TestSite/  # Umbraco 17.7 + Clean 7.0.8 starter kit, references the package
docs/
├── README_nuget.md                                # the README shown on NuGet
├── icon.png / icon.svg                            # package icon (128px PNG packed; SVG is the source)
├── screenshots/                                   # README / NuGet / Marketplace screenshots + demo GIF
├── social-preview.png / .html                     # GitHub social preview image (HTML is the source)
└── HOW-IT-WORKS.md                                # implementation notes + v17 gotchas
umbraco-marketplace.json                           # Umbraco Marketplace listing metadata
CHANGELOG.md                                       # release notes (linked from the NuGet package)
CONTRIBUTING.md                                    # this file
.github/workflows/build.yml                        # PRs / main → build + pack check
.github/workflows/release.yml                      # tag → pack → push to NuGet
```

Structure follows Lotte Pitcher's
[Opinionated Package Starter](https://github.com/LottePitcher/opinionated-package-starter),
except the client side stays as plain no-build JS (no Vite/TypeScript).

## Why the test site is set up the way it is

The package builds against the **minimum** supported Umbraco (17.0.0) via
central package versions (`src/Directory.Packages.props`). The test site is
straight from `dotnet new umbraco` (17.7.0) with the template's inline package
versions, so its own `Directory.Packages.props` switches central versioning off
for it.

It uses the full `Clean` package rather than `Clean.Core`. Clean's docs advise
switching to `Clean.Core` once a site is set up, so the build stops overwriting
your views/assets. That's right for a real site, but not for this test site:
Clean's content import lives in the `Clean` package, and the test database isn't
committed, so with `Clean.Core` a fresh clone would have no document types or
content to navigate. We never customise Clean's views here, so the re-copy on
build is harmless; its generated files are gitignored.

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE).
