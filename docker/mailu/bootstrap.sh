#!/bin/sh
set -eu

i=0
while [ "$i" -lt 90 ]; do
  if [ -f /data/main.db ]; then
    if flask mailu config-import -u /bootstrap.yml; then
      echo "Mailu bootstrap OK"
      exit 0
    fi
  fi
  i=$((i + 1))
  sleep 3
done

echo "Mailu bootstrap failed" >&2
exit 1
