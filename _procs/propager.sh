#!/bin/sh
# Nova : propagation des paramètres du thème aux zones dépendantes (demande de l'utilisateur, 2026-10-08).
# Appelé par header.phtml (accueil, module de confiance) pour le superviseur d'une structure, droits déjà vérifiés.
# Usage : propager.sh <wims_home> <classe> <type de classe> <classe parente>
# Dans la feuille de style (css) de chaque zone dépendante (sous-dossiers numérotés, comme
# modules/adm/class/config/propagate.proc ; cours d'un programme compris), les blocs Nova (« Nova : reglages de la
# page Apparence » et « Nova : badges ») sont remplacés par ceux de la structure ; le reste de la feuille est gardé.
# Sortie : nombre de zones mises à jour.
H=$1; C=$2; T=$3; S=$4
case "$C" in ''|*[!0-9/]*) echo 0; exit ;; esac
case "$S" in *[!0-9/]*) echo 0; exit ;; esac
cd "$H/log/classes/$C" 2>/dev/null || { echo 0; exit; }
blocs() { awk '/^\/\* Nova : (reglages de la page Apparence|badges) \*\//{b=1} b{print} b&&/^}/{b=0; print ""}' "$1" 2>/dev/null; }
reste() { awk '/^\/\* Nova : (reglages de la page Apparence|badges) \*\//{b=1} !b{print} b&&/^}/{b=0}' "$1" 2>/dev/null; }
nova=$(blocs css)
zones=$(find . -type d -name '[0-9]*' | sed 's|^\./||')
if [ "$T" = program ] && [ -n "$S" ]; then
  for x in $(cat courses icourses 2>/dev/null | cut -d, -f1 | grep .); do zones="$zones $H/log/classes/$S/$x"; done
fi
n=0
for z in $zones; do
  grep -q '^!set class_defined=yes' "$z/.def" 2>/dev/null || continue
  f="$z/css"
  r=$(reste "$f")
  {
    [ -n "$r" ] && printf '%s\n\n' "$r"
    [ -n "$nova" ] && printf '%s\n' "$nova"
  } > "$f.nova$$" && mv "$f.nova$$" "$f" && n=$((n+1))
done
echo $n
