#!/usr/bin/env bash
# Run OpenSprinkler's open-source firmware in demo mode (no hardware: zones are simulated) and point
# the Overwater.ing connector at it. For the live demo and for trying the connector at home.
#
#   scripts/opensprinkler-demo.sh            # build + start the controller (Docker, or native on Linux)
#   scripts/opensprinkler-demo.sh sync [...] # run the connector against it (extra args pass through)
#   scripts/opensprinkler-demo.sh stop
#
# Controller UI: http://localhost:8080 (password: opendoor). Data lives in ~/.cache/opensprinkler-demo.
set -euo pipefail
cd "$(dirname "$0")/.."
SRC="${OS_SRC:-$HOME/.cache/opensprinkler-src}"
DATA="${OS_DATA:-$HOME/.cache/opensprinkler-demo}"
PORT="${OS_PORT:-8080}"
PLAN="${OW_PLAN:-salt-lake-spray}"

case "${1:-start}" in
sync)
	shift
	. scripts/node-env.sh && ensure_node >/dev/null
	exec node app/static/connect/opensprinkler.mjs --plan "$PLAN" --controller "http://localhost:$PORT" --zones 1,2,3,4 "$@"
	;;
stop)
	if command -v docker >/dev/null && docker ps -q -f name=opensprinkler-demo | grep -q .; then docker rm -f opensprinkler-demo; fi
	pkill -x OpenSprinkler 2>/dev/null || true
	echo "stopped"
	exit 0
	;;
esac

[ -d "$SRC/.git" ] || git clone --depth 1 https://github.com/OpenSprinkler/OpenSprinkler-Firmware.git "$SRC"
git -C "$SRC" submodule update --init --recursive -q
mkdir -p "$DATA/logs"

if command -v docker >/dev/null; then
	docker build -q --build-arg BUILD_VERSION=DEMO -t opensprinkler-demo "$SRC"
	docker rm -f opensprinkler-demo >/dev/null 2>&1 || true
	# The firmware listens on port 80 inside the container.
	docker run -d --name opensprinkler-demo -p "$PORT:80" -v "$DATA:/data" opensprinkler-demo >/dev/null
elif [ "$(uname)" = Linux ]; then
	# Native build. libmosquitto is the only extra library; build it statically if the system lacks it.
	INC="" LIBS="-lmosquitto -lpthread -lssl -lcrypto"
	if ! ldconfig -p 2>/dev/null | grep -q libmosquitto; then
		M="$HOME/.cache/mosquitto-src"
		[ -d "$M" ] || git clone -q --depth 1 --branch v2.0.20 https://github.com/eclipse-mosquitto/mosquitto.git "$M"
		make -s -C "$M/lib" WITH_CJSON=no WITH_DOCS=no WITH_STATIC_LIBRARIES=yes WITH_SHARED_LIBRARIES=no -j8
		INC="-I$M/include" LIBS="-L$M/lib -l:libmosquitto.a -lpthread -lssl -lcrypto"
	fi
	[ -x "$SRC/OpenSprinkler" ] || make -s -C "$SRC" VERSION=DEMO EXTRA_CXXFLAGS="$INC -DHTTP_PORT=$PORT" LDFLAGS="$LIBS" -j8
	pkill -x OpenSprinkler 2>/dev/null || true
	(cd "$DATA" && nohup "$SRC/OpenSprinkler" -d "$DATA/" >"$DATA/opensprinkler.log" 2>&1 &)
else
	echo "Needs Docker (Docker Desktop on a Mac) or Linux." >&2
	exit 1
fi

for _ in $(seq 1 30); do
	curl -s -m 2 "http://localhost:$PORT/jo?pw=a6d82bced638de3def1e9bbb4983225c" >/dev/null && break
	sleep 1
done
echo "OpenSprinkler demo controller: http://localhost:$PORT (password: opendoor)"
echo "Now: scripts/opensprinkler-demo.sh sync            # this week, from Utah's guide"
echo "     scripts/opensprinkler-demo.sh sync --date 2027-07-14   # preview a July week"
