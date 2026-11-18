#!/bin/sh
# Assemble js/cm6.js (éditeur de code des documents : CodeMirror 6 + langue des documents de WIMS) depuis js/cm6/*.js,
# et pose son empreinte dans htmlheader.phtml (meta nova-cm6, lue par nova.js pour l'adresse du fichier). Sans
# conteneur. 2026-11-18. Paquets et esbuild : ../../outils-js (versions figées, package-lock.json) :
#   npm install --prefix ../../outils-js --save-exact @codemirror/state@6.4.1 @codemirror/view@6.28.1 \
#     @codemirror/commands@6.6.0 @codemirror/language@6.10.2 @codemirror/search@6.5.6 @lezer/highlight@1.2.0 esbuild@0.21.5
# Sortie en ASCII seul (fichiers du thème lus en windows-1252), réduite.
#   ./construire-cm6.sh            assemble et pose l'empreinte
#   ./construire-cm6.sh --verifier ne change rien : échoue si js/cm6.js ou l'empreinte ne sont pas à jour
set -e
cd "$(dirname "$0")"
outils=${NOVA_OUTILS_JS:-../../outils-js}
tmp=$(mktemp); trap 'rm -f "$tmp" "$tmp.js"' EXIT
# Empreinte : sources de Nova et versions exactes des paquets.
{ cat js/cm6/*.js; cat construire-cm6.sh; [ -f "$outils/package-lock.json" ] && grep -A1 '"node_modules/@codemirror\|"node_modules/@lezer\|"node_modules/esbuild"' "$outils/package-lock.json"; } | sha256sum | cut -c1-10 > "$tmp"
empreinte=$(cat "$tmp")
entete="/*! Nova, js/cm6.js $empreinte : CodeMirror 6 (MIT, codemirror.net) et langue des documents de WIMS, assembles par construire-cm6.sh (GPL v2+). Sources : js/cm6. */"
if [ "${1:-}" = "--verifier" ]; then
  [ "$(head -c ${#entete} js/cm6.js 2>/dev/null)" = "$entete" ] || { echo "js/cm6.js n'est pas construit depuis js/cm6 actuel : relancer ./construire-cm6.sh." >&2; exit 1; }
  grep -aq "name=\"nova-cm6\" content=\"$empreinte\"" htmlheader.phtml || { echo "htmlheader.phtml : empreinte de cm6.js périmée, relancer ./construire-cm6.sh." >&2; exit 1; }
  exit 0
fi
[ -x "$outils/node_modules/.bin/esbuild" ] || { echo "esbuild introuvable dans $outils : voir l'en-tête de ce script." >&2; exit 1; }
NODE_PATH="$outils/node_modules" "$outils/node_modules/.bin/esbuild" js/cm6/entree.js --bundle --minify --format=iife \
  --charset=ascii --legal-comments=none --target=es2019 --log-level=warning --outfile="$tmp.js"
{ printf '%s\n' "$entete"; cat "$tmp.js"; } > js/cm6.js
grep -aq 'name="nova-cm6"' htmlheader.phtml || { echo "htmlheader.phtml : meta nova-cm6 absente." >&2; exit 1; }
sed -i "s|name=\"nova-cm6\" content=\"[^\"]*\"|name=\"nova-cm6\" content=\"$empreinte\"|" htmlheader.phtml
echo "js/cm6.js : $(wc -c < js/cm6.js) octets ($(gzip -9c js/cm6.js | wc -c) compressé), empreinte $empreinte"
