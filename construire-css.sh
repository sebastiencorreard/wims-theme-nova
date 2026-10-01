#!/bin/sh
# Construit css.css à partir de css.css.template, comme themes/mkcss.pl de WIMS, mais sans Java
# (pas de yuicompressor : le fichier reste lisible) et depuis l'hôte :
#   - « --- Nova/… --- » : feuille de ce dépôt ;
#   - « --- _css/… --- » ou « --- standard/… --- » : feuille commune, lue dans le conteneur wims432 ;
#   - « *-* nom » : couleur OEF, remplacée d'après Nova/oefcolors s'il existe, sinon themes/oefcolors.
# Les lignes « # … » du modèle sont des commentaires et ne sont pas copiées.
#   ./construire-css.sh
set -e
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

cp "$tmp" css.css
echo "css.css : $(wc -c < css.css) octets, $(grep -c '^/\*! depuis' css.css) feuilles"
