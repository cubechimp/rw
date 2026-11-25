Ryukyu World

HOW TO RUN
  Windows: double-click start.bat
  Mac:     double-click start.command
  Other:   python3 serve.py

A small window opens and stays open while you play; your browser opens the game by itself.
You need Python (python.org) and, the first time, an internet connection to fetch three.js.

Opening index.html directly will not work: the game loads its map files over HTTP.
Use the start file rather than "python -m http.server": that one lets the browser keep old
copies of the files, so after you download a newer build you can end up running a broken mix.

Online play (seeing other players) only works in the hosted Claude preview, not from this folder.

Data credits: 3D都市モデル Project PLATEAU（国土交通省）, 国土数値情報（行政区域データ）国土交通省.
Buildings, roads and named places outside Naha: Overture Maps Foundation (includes OpenStreetMap data, ODbL).
