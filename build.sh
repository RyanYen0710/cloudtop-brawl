#!/bin/sh
# Rebuilds src/worker.js from the game's engine files + the server code.
# Run from this folder after changing fighters or stages: sh build.sh ../site
G=${1:-../site}
{ echo "/* AUTO-BUILT: game engine + server. Edit the game files and src/server.js, then run build.sh */"
  for f in data.js engine.js match.js stages2.js stages.js ult.js; do echo "/* ---- $f ---- */"; sed "s/^'use strict';//" "$G/$f"; done
  echo "/* ---- server.js ---- */"; cat src/server.js; } > src/worker.js
echo "built src/worker.js"
