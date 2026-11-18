#!/bin/sh
# Assemble l'éditeur de code (CodeMirror 6 et langues de WIMS) depuis js/cm6/*.js : js/cm6.js, cm6-wims.js, cm6-web.js,
# cm6-python.js (js/cm6/construire.mjs), et pose leur empreinte dans htmlheader.phtml (meta nova-cm6, lue par nova.js
# pour l'adresse des fichiers). Sans conteneur. 2026-11-18. Paquets et esbuild : ../../outils-js (versions figées,
# package-lock.json ; une seule copie de @codemirror/state et de @lezer/common : npm ls) :
#   npm install --prefix ../../outils-js --save-exact @codemirror/state@6.4.1 @codemirror/view@6.28.1 \
#     @codemirror/commands@6.6.0 @codemirror/language@6.10.2 @codemirror/search@6.5.6 @lezer/highlight@1.2.0 esbuild@0.21.5 \
#     @codemirror/lang-html@6.4.9 @codemirror/lang-css@6.2.1 @codemirror/lang-javascript@6.2.2 @codemirror/lang-python@6.1.6 \
#     @codemirror/legacy-modes@6.4.0 @codemirror/lint@6.8.1
# Sortie en ASCII seul (fichiers du thème lus en windows-1252), réduite.
#   ./construire-cm6.sh            assemble et pose l'empreinte
#   ./construire-cm6.sh --verifier ne change rien : échoue si js/cm6.js ou l'empreinte ne sont pas à jour
set -e
cd "$(dirname "$0")"
outils=${NOVA_OUTILS_JS:-../../outils-js}
tmp=$(mktemp); trap 'rm -f "$tmp"' EXIT
# Empreinte : sources de Nova et versions exactes des paquets.
{ cat js/cm6/*.js js/cm6/*.mjs; cat construire-cm6.sh; [ -f "$outils/package-lock.json" ] && grep -A1 '"node_modules/@codemirror\|"node_modules/@lezer\|"node_modules/esbuild"' "$outils/package-lock.json"; } | sha256sum | cut -c1-10 > "$tmp"
empreinte=$(cat "$tmp")
FICHIERS="cm6.js cm6-wims.js cm6-web.js cm6-python.js"
if [ "${1:-}" = "--verifier" ]; then
  for f in $FICHIERS; do
    head -c 200 "js/$f" 2>/dev/null | grep -aq "^/\*! Nova, js/$f $empreinte " || { echo "js/$f n'est pas construit depuis js/cm6 actuel : relancer ./construire-cm6.sh." >&2; exit 1; }
  done
  grep -aq "name=\"nova-cm6\" content=\"$empreinte\"" htmlheader.phtml || { echo "htmlheader.phtml : empreinte de cm6.js périmée, relancer ./construire-cm6.sh." >&2; exit 1; }
  exit 0
fi
[ -x "$outils/node_modules/.bin/esbuild" ] || { echo "esbuild introuvable dans $outils : voir l'en-tête de ce script." >&2; exit 1; }
node js/cm6/construire.mjs "$outils" "$empreinte"
grep -aq 'name="nova-cm6"' htmlheader.phtml || { echo "htmlheader.phtml : meta nova-cm6 absente." >&2; exit 1; }
sed -i "s|name=\"nova-cm6\" content=\"[^\"]*\"|name=\"nova-cm6\" content=\"$empreinte\"|" htmlheader.phtml
for f in $FICHIERS; do echo "js/$f : $(wc -c < js/$f) octets ($(gzip -9c js/$f | wc -c) compressé)"; done
echo "empreinte $empreinte"
