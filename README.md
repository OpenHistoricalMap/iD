# iD - friendly JavaScript editor for [OpenHistoricalMap](https://www.openhistoricalmap.org/)

[![build](https://github.com/OpenHistoricalMap/iD/workflows/build/badge.svg)](https://github.com/OpenHistoricalMap/iD/actions?query=workflow%3A%22build%22)

This is OpenHistoricalMap’s fork of [iD](https://github.com/openstreetmap/iD/), [OpenStreetMap](https://www.openstreetmap.org/)’s beginner-friendly browser-based editor. We’ve customized this fork to facilitate mapping dates and sources according to [OHM’s tagging conventions](https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/Tags) and tracing off of archived aerial imagery.

## Basics

* iD is a JavaScript [OpenHistoricalMap](https://www.openhistoricalmap.org/) editor forked from OpenStreetMap’s editor.
* It's intentionally simple. It lets you do the most basic tasks while not breaking other people's data.
* It supports all popular modern desktop browsers: Chrome, Firefox, Safari, Opera, and Edge.
* iD is not yet designed for mobile browsers, but this is something we hope to add!
* Data is rendered with [d3.js](https://d3js.org/).

## Participate!

* Read the project [Code of Conduct](CODE_OF_CONDUCT.md) and remember to be nice to one another.
* Read up on [Contributing and the code style of iD](CONTRIBUTING.md).
* See [open issues in the issue tracker](https://github.com/OpenHistoricalMap/issues/labels/iD)
if you're looking for something to do.
* [Translate!](https://github.com/openstreetmap/iD/blob/develop/CONTRIBUTING.md#translating)
* [Test a prerelease version](https://staging.openhistoricalmap.org/) of the `staging` branch

Come on in, the water's lovely. More help? Ping @1ec5 (Minh Nguyen) on:
* [OpenStreetMap U.S. Slack](https://slack.openstreetmap.us/) (`#openhistoricalmap` channel)
* [OpenStreetMap World Discord](https://discord.gg/openstreetmap) (`#openhistoricalmap` channel)
* [OpenHistoricalMap Forum Chat](https://forum.openhistoricalmap.org/chat/c/general/2) (use your openhistoricalmap.org account)

## Prerequisites

* [Node.js](https://nodejs.org/) version 18 or newer
* [`git`](https://www.atlassian.com/git/tutorials/install-git/) for your platform
  * Note for Windows users:
    * Edit `$HOME\.gitconfig`:<br/>
      Add these lines to avoid checking in files with CRLF newlines<br><pre>
      [core]
          autocrlf = input</pre>

## Installation

To run the current development version of iD on your own computer:

#### Cloning the repository

The repository is reasonably large, and it's unlikely that you need the full history (~200 MB). If you are happy to wait for it all to download, run:

```
git clone https://github.com/OpenHistoricalMap/iD.git
```

To clone only the most recent version, instead use a 'shallow clone':

```
git clone --depth=1 https://github.com/OpenHistoricalMap/iD.git
```

If you want to add in the full history later on, perhaps to run `git blame` or `git log`, run `git fetch --depth=1000000`

#### Building iD

1. `cd` into the newly cloned project folder
2. Run `npm install`
3. Run `npm run all`
3. Run `npm start`
4. Open `http://127.0.0.1:8080/` in a web browser

For guidance on building a packaged version, running tests, and contributing to
development, see [CONTRIBUTING.md](CONTRIBUTING.md).


## License

iD is available under the [ISC License](https://opensource.org/licenses/ISC).
See the [LICENSE.md](LICENSE.md) file for more details.

iD also bundles portions of the following open source software.

* [D3.js (BSD-3-Clause)](https://github.com/d3/d3)
* [CLDR (Unicode Consortium Terms of Use)](https://github.com/unicode-cldr/cldr-json)
* [ohm-editor-layer-index (CC-BY-SA 3.0)](https://github.com/openhistoricalmap/ohm-editor-layer-index)
* [Font Awesome (CC-BY 4.0)](https://fontawesome.com/license)
* [Maki (CC0 1.0)](https://github.com/mapbox/maki)
* [Temaki (CC0 1.0)](https://github.com/ideditor/temaki)
* [Röntgen icon set (CC-BY 4.0)](https://github.com/enzet/map-machine#r%C3%B6ntgen-icon-set)
* [Mapillary JS (MIT)](https://github.com/mapillary/mapillary-js)
* [iD Tagging Schema (ISC)](https://github.com/openstreetmap/id-tagging-schema)
* [name-suggestion-index (BSD-3-Clause)](https://github.com/osmlab/name-suggestion-index)
* [osm-community-index (ISC)](https://github.com/osmlab/osm-community-index)


## Thank you

Initial development of iD was made possible by a [grant of the Knight Foundation](https://www.mapbox.com/blog/knight-invests-openstreetmap/).
