#!/bin/sh
# Jeu d'icônes « Lucide » de Nova (2026-11-11) : WIMS propose les dossiers de gifs/themes (adm/class/config,
# present.proc) et charge gifs/themes/<jeu>/icon-min.css (src/config.c). Le jeu vit dans le thème
# (icones/Lucide) : un lien symbolique gifs/themes/Lucide le rend visible. Créé s'il manque, refait s'il est
# cassé (dossier du thème renommé) ; un vrai dossier Lucide installé à la main n'est jamais touché.
# Usage : jeu-icones.sh <wims_home> <nom du dossier du thème>
lien="$1/public_html/gifs/themes/Lucide"
cible="../../themes/$2/icones/Lucide"
test -f "$1/public_html/themes/$2/icones/Lucide/icon-min.css" || exit 0
if test -L "$lien"; then
  test -e "$lien" && exit 0
  rm -f "$lien"
elif test -e "$lien"; then
  exit 0
fi
ln -s "$cible" "$lien" 2>/dev/null
exit 0
