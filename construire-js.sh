#!/bin/sh
# Assemble js/nova.js à partir de js/src/*.js (dans l'ordre des noms) et met à jour son empreinte dans
# htmlheader.phtml. Ne dépend pas du conteneur (pas de verrou). 2026-11-11.
# Réduit par terser depuis le 2026-11-14 (audit B3, utilisateur : 540 -> 290 Ko, 146 -> 80 Ko compressé), noms de fonctions
# gardés (erreurs lisibles), caractères non ASCII échappés (fichier lu en windows-1252). terser : variable NOVA_TERSER,
# sinon ../../outils-js (npm install --prefix ../../outils-js --save-exact terser@5.36.0), sinon le PATH.
# NOVA_JS_LISIBLE=1 ./construire-js.sh : assemblage seul, pour chercher une panne (--verifier le signale ensuite).
#   ./construire-js.sh            assemble, vérifie la syntaxe (node, s'il est installé), pose l'empreinte
#   ./construire-js.sh --verifier ne change rien : échoue si js/nova.js ou l'empreinte ne sont pas à jour (l'empreinte
#                                 des sources est en tête de nova.js : terser n'est pas nécessaire pour vérifier)
# Les fichiers de js/src sont les morceaux d'UNE fonction englobante (ouverte dans 00-commun.js, fermée dans
# 99-demarrage.js) : une nouvelle fonction va dans le fichier de son domaine, son appel dans demarrer().
set -e
cd "$(dirname "$0")"
tmp=$(mktemp); trap 'rm -f "$tmp" "$tmp.js" "$tmp.min"' EXIT
cat js/src/*.js > "$tmp"
empreinte=$(sha256sum "$tmp" | cut -c1-10)
entete="/*! Nova, js/nova.js $empreinte : assemble depuis js/src et reduit par construire-js.sh (GPL v2+). Sources : js/src. */"
if [ "${1:-}" = "--verifier" ]; then
  [ "$(head -c ${#entete} js/nova.js)" = "$entete" ] || { echo "js/nova.js n'est pas construit depuis js/src actuel (ou NOVA_JS_LISIBLE) : relancer ./construire-js.sh (ou reporter dans js/src une modification faite dans nova.js)." >&2; exit 1; }
  grep -aq "js/nova.js?v=$empreinte\"" htmlheader.phtml || { echo "htmlheader.phtml : empreinte de nova.js périmée, relancer ./construire-js.sh." >&2; exit 1; }
  exit 0
fi
if command -v node >/dev/null 2>&1; then
  cp "$tmp" "$tmp.js"; node --check "$tmp.js" || { echo "Erreur de syntaxe : js/nova.js laissé tel quel." >&2; exit 1; }
fi
if [ -n "${NOVA_JS_LISIBLE:-}" ]; then
  cp "$tmp" "$tmp.min"
else
  terser=${NOVA_TERSER:-}
  [ -n "$terser" ] || { [ -x ../../outils-js/node_modules/.bin/terser ] && terser=../../outils-js/node_modules/.bin/terser; } || true
  [ -n "$terser" ] || terser=$(command -v terser || true)
  [ -n "$terser" ] || { echo "terser introuvable : npm install --prefix ../../outils-js --save-exact terser@5.36.0 (ou NOVA_TERSER=<chemin>)." >&2; exit 1; }
  "$terser" "$tmp" --compress --mangle --keep-fnames --format ascii_only=true,comments=false > "$tmp.min.1"
  { printf '%s\n' "$entete"; cat "$tmp.min.1"; printf '\n'; } > "$tmp.min"; rm -f "$tmp.min.1"
  node --check "$tmp.min" 2>/dev/null || { cp "$tmp.min" "$tmp.js"; node --check "$tmp.js" || { echo "Sortie de terser invalide : js/nova.js laissé tel quel." >&2; exit 1; }; }
fi
cmp -s "$tmp.min" js/nova.js || cp "$tmp.min" js/nova.js
# Adresse de nova.js : empreinte de son contenu, pour qu'un navigateur (un téléphone surtout) ne garde pas une
# ancienne version en cache. Chemin par $wims_theme (remplacé par le C de WIMS) : le dossier peut porter un autre nom.
sed -i "s|html/themes/[^/]*/js/nova.js[^\"]*\"|html/themes/\$wims_theme/js/nova.js?v=$empreinte\"|" htmlheader.phtml
echo "js/nova.js : $(wc -c < js/nova.js) octets ($(gzip -9c js/nova.js | wc -c) compressé), $(ls js/src/*.js | wc -l) sources, empreinte $empreinte"
