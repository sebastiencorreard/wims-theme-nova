#!/bin/sh
# Assemble js/nova.js à partir de js/src/*.js (dans l'ordre des noms) et met à jour son empreinte dans
# htmlheader.phtml. Ne dépend pas du conteneur (pas de verrou). 2026-11-11.
#   ./construire-js.sh            assemble, vérifie la syntaxe (node, s'il est installé), pose l'empreinte
#   ./construire-js.sh --verifier ne change rien : échoue si js/nova.js ou l'empreinte ne sont pas à jour
# Les fichiers de js/src sont les morceaux d'UNE fonction englobante (ouverte dans 00-commun.js, fermée dans
# 99-demarrage.js) : une nouvelle fonction va dans le fichier de son domaine, son appel dans demarrer().
set -e
cd "$(dirname "$0")"
tmp=$(mktemp); trap 'rm -f "$tmp"' EXIT
cat js/src/*.js > "$tmp"
empreinte=$(sha256sum "$tmp" | cut -c1-10)
if [ "${1:-}" = "--verifier" ]; then
  cmp -s "$tmp" js/nova.js || { echo "js/nova.js n'est pas l'assemblage de js/src : relancer ./construire-js.sh (ou reporter dans js/src une modification faite dans nova.js)." >&2; exit 1; }
  grep -aq "js/nova.js?v=$empreinte\"" htmlheader.phtml || { echo "htmlheader.phtml : empreinte de nova.js périmée, relancer ./construire-js.sh." >&2; exit 1; }
  exit 0
fi
if command -v node >/dev/null 2>&1; then
  cp "$tmp" "$tmp.js"; node --check "$tmp.js" || { rm -f "$tmp.js"; echo "Erreur de syntaxe : js/nova.js laissé tel quel." >&2; exit 1; }
  rm -f "$tmp.js"
fi
cmp -s "$tmp" js/nova.js || cp "$tmp" js/nova.js
# Adresse de nova.js : empreinte de son contenu, pour qu'un navigateur (un téléphone surtout) ne garde pas une
# ancienne version en cache. Chemin par $wims_theme (remplacé par le C de WIMS) : le dossier peut porter un autre nom.
sed -i "s|html/themes/[^/]*/js/nova.js[^\"]*\"|html/themes/\$wims_theme/js/nova.js?v=$empreinte\"|" htmlheader.phtml
echo "js/nova.js : $(wc -c < js/nova.js) octets, $(ls js/src/*.js | wc -l) sources, empreinte $empreinte"
