# Sourced by the other scripts. Puts a Node that Vite 8 accepts (>= 20.19 or >= 22.12) on PATH.
# Conductor runs scripts in non-interactive shells, so nvm isn't loaded by default; load it and
# use .nvmrc (22) when the Node on PATH is too old.

node_ok() {
	node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||(a===22&&b>=12)||(a===20&&b>=19)?0:1)' 2>/dev/null
}

ensure_node() {
	node_ok && return 0
	nvm_sh="${NVM_DIR:-$HOME/.nvm}/nvm.sh"
	if [ -s "$nvm_sh" ]; then
		set +u # nvm.sh isn't nounset-safe
		. "$nvm_sh"
		nvm use --silent >/dev/null 2>&1 || nvm install
		set -u
	fi
	if ! node_ok; then
		echo "Node >= 20.19 (or >= 22.12) is required; found $(node -v 2>/dev/null || echo none)." >&2
		echo "Install one with: nvm install 22   (or: brew install node)" >&2
		return 1
	fi
}
