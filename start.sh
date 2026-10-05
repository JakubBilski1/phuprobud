#!/bin/sh
# Start kontenera: serwer Node (strony, API panelu) i nginx przed nim. Gdy ktorys z nich
# padnie, konczymy kontener, zeby Docker uruchomil go od nowa w calosci.
set -e

HOST=127.0.0.1 PORT=4321 node /app/dist/server/entry.mjs &
NODE=$!
nginx -g 'daemon off;' &
NGINX=$!

trap 'kill -TERM $NODE $NGINX 2>/dev/null' TERM INT

while kill -0 $NODE 2>/dev/null && kill -0 $NGINX 2>/dev/null; do
  sleep 2
done
kill -TERM $NODE $NGINX 2>/dev/null || true
wait
exit 1
