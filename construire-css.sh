#!/bin/sh
# Construit css.css à partir de css.css.template, comme themes/mkcss.pl de WIMS, mais sans Java
# (minification prudente en Python au lieu de yuicompressor) et depuis l'hôte :
#   - « --- Nova/… --- » : feuille de ce dépôt ;
#   - « --- _css/… --- » ou « --- standard/… --- » : feuille commune, lue dans le conteneur wims432 ;
#   - « *-* nom » : couleur OEF, remplacée d'après Nova/oefcolors s'il existe, sinon themes/oefcolors.
# Les lignes « # … » du modèle sont des commentaires et ne sont pas copiées.
#   ./construire-css.sh            minifié (à livrer)
#   ./construire-css.sh --lisible  tel quel (pour le développement)
set -e
LISIBLE=; [ "${1:-}" = "--lisible" ] && LISIBLE=1
cd "$(dirname "$0")"
CONTENEUR=${CONTENEUR:-wims432}
THEMES=/home/wims/public_html/themes
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT

printf '/*! généré depuis css.css.template par construire-css.sh — ne pas modifier directement */\n' > "$tmp"
while IFS= read -r ligne || [ -n "$ligne" ]; do
  case "$ligne" in
    \#*) continue ;;
    ---\ *\ ---)
      f=${ligne#--- }; f=${f% ---}
      printf '\n/*! depuis %s */\n' "$f" >> "$tmp"
      case "$f" in
        Nova/*) cat "${f#Nova/}" >> "$tmp" ;;
        *) docker exec "$CONTENEUR" cat "$THEMES/$f" >> "$tmp" || { echo "Feuille introuvable : $f" >&2; exit 1; } ;;
      esac ;;
    *) printf '%s\n' "$ligne" >> "$tmp" ;;
  esac
done < css.css.template

# Couleurs OEF (même règle que mkcss.pl : « !set nom=valeur » dans oefcolors).
if [ -f oefcolors ]; then couleurs=$(cat oefcolors); else couleurs=$(docker exec "$CONTENEUR" cat "$THEMES/oefcolors"); fi
printf '%s\n' "$couleurs" | sed -n 's/^!set \([A-Za-z0-9_]*\)=\(#*[A-Za-z0-9]*\).*/\1 \2/p' | while read -r nom valeur; do
  sed -i "s/\*-\* *$nom\b/$valeur/g" "$tmp"
done

feuilles=$(grep -a -c '^/\*! depuis' "$tmp")
if [ -z "$LISIBLE" ]; then
  # Minification prudente : commentaires retirés (sauf « /*! … */ », provenance des feuilles),
  # espaces réduits, aucun espace retiré autour de « : » (« a :hover » ≠ « a:hover ») ni de
  # « + » et « - » (calc()). Octets lus en latin-1 : rien n'est réencodé.
  python3 - "$tmp" <<'PY'
import re, sys
f = sys.argv[1]
t = open(f, encoding='latin-1').read()
t = re.sub(r'/\*(?!!).*?\*/', '', t, flags=re.S)
t = re.sub(r'\s+', ' ', t)
t = re.sub(r'\s*([{};,])\s*', r'\1', t)
t = t.replace(';}', '}')
t = re.sub(r'(/\*!.*?\*/)', r'\n\1\n', t)
open(f, 'w', encoding='latin-1').write(t.strip() + '\n')
PY
fi
cp "$tmp" css.css
# nova.js : son adresse porte l'empreinte de son contenu, pour qu'un navigateur (un téléphone
# surtout) ne garde pas une ancienne version en cache ; htmlheader.phtml est mis à jour ici.
empreinte=$(sha256sum js/nova.js | cut -c1-10)
sed -i "s|html/themes/Nova/js/nova.js[^\"]*\"|html/themes/Nova/js/nova.js?v=$empreinte\"|" htmlheader.phtml
echo "css.css : $(wc -c < css.css) octets, $feuilles feuilles${LISIBLE:+ (lisible)}"
