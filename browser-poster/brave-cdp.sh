#!/bin/bash
# Ensure Brave is running with remote debugging port
# Place in /usr/local/bin/brave-cdp.sh or run manually

CDP_PORT=${1:-9222}

if pgrep -f "remote-debugging-port=$CDP_PORT" > /dev/null; then
  echo "Brave already running with CDP on port $CDP_PORT"
  exit 0
fi

echo "Starting Brave with --remote-debugging-port=$CDP_PORT ..."
nohup brave-browser \
  --remote-debugging-port=$CDP_PORT \
  --no-first-run \
  --disable-default-apps \
  --disable-popup-blocking \
  --disable-blink-features=AutomationControlled \
  --no-sandbox \
  > /var/log/brave-cdp.log 2>&1 &

echo "Brave PID: $!"
sleep 3
curl -s "http://127.0.0.1:$CDP_PORT/json/version" && echo -e "\nCDP ready." || echo "CDP not yet ready, wait a few seconds."