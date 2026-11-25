# Ryukyu World

A browser game set on a 1:1 Okinawa Prefecture: ride the lagoon, cycle the islands, eat island food, collect stamps.

- `site/` is the game. It is plain HTML and JavaScript (three.js from a CDN) and needs no build step.
- `pipeline/build_pref.py` builds prefecture-wide buildings, roads and named places from Overture Maps into `site/pref/`.
- `.github/workflows/build.yml` runs that pipeline on every push to `main`, on the 1st of each month, and on demand,
  then publishes `site/` to the `gh-pages` branch. If the pipeline fails the game is still published, without the new data;
  the reason is in `pref-build-log.txt` on `gh-pages`.

## Play

Once GitHub Pages is switched on for the `gh-pages` branch (Settings > Pages > Deploy from a branch > `gh-pages`, `/ (root)`),
the game is at `https://<owner>.github.io/<repo>/`.

To run it locally: `cd site && python3 -m http.server 8000`, then open `http://localhost:8000`.

## Where the map comes from

| Layer | Source | Notes |
|---|---|---|
| Coastline, municipal boundaries | 国土数値情報（行政区域データ）国土交通省 | `pipeline/coast_and_relief.py` |
| Naha buildings, roads, ground heights | 3D都市モデル Project PLATEAU（国土交通省） | `pipeline/naha_plateau.py`, run by hand on the downloaded CityGML zip |
| Other buildings, roads, shops and restaurants | Overture Maps Foundation, © OpenStreetMap contributors (ODbL) | `pipeline/build_pref.py`, automated |
| Hills outside Naha | generated, not surveyed | to be replaced with national elevation data |

Building heights outside Naha are only as good as the source: where no height or floor count is recorded they are estimated
from the footprint, and the game says so when you tap the building.

Online play (seeing other players) only works in the Claude-hosted preview; the public site is single-player until it gets a server.
