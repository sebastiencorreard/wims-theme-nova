#!/bin/sh
# Nova : propagation des paramètres du thème aux zones dépendantes (demande de l'utilisateur, 2026-10-08 ; apparence et
# badges séparés, et relevé des écarts, le 2026-11-07).
# Usage : propager.sh <wims_home> <classe> <type de classe> <classe parente> [parties] [ecarts]
#   parties : « apparence », « badges » ou les deux (séparées par une virgule ou un espace) ; absent = les deux.
#     apparence = bloc « Nova : reglages de la page Apparence » ; badges = bloc « Nova : badges ».
#   sans « ecarts » : dans la feuille de style (css) de chaque zone dépendante (sous-dossiers numérotés, comme
#     modules/adm/class/config/propagate.proc ; cours d'un programme compris), les blocs choisis sont remplacés par
#     ceux de la structure ; le reste de la feuille est gardé. Sortie : nombre de zones mises à jour.
#   avec « ecarts » (lecture seule ; appelé sur les pages Apparence et Badges Nova de la structure) : un élément par zone
#     dont un bloc choisi diffère de celui de la structure, sur une ligne : <li data-partie="badges">nom</li>…, nom
#     échappé pour le HTML ($ compris : la sortie passe par une variable WIMS).
# Appelé par header.phtml, droits déjà vérifiés (superviseur d'une structure de type 2, 3 ou 4).
H=$1; C=$2; T=$3; S=$4; P=${5:-apparence,badges}; M=$6
case "$C" in ''|*[!0-9/]*) echo 0; exit ;; esac
case "$S" in *[!0-9/]*) echo 0; exit ;; esac
cd "$H/log/classes/$C" 2>/dev/null || { echo 0; exit; }
motif=''
for p in $(printf '%s' "$P" | tr ',' ' '); do
  case "$p" in
    apparence) motif="$motif|reglages de la page Apparence" ;;
    badges) motif="$motif|badges" ;;
  esac
done
motif=${motif#|}
[ -n "$motif" ] || { echo 0; exit; }
# Blocs Nova d'une feuille (motif : noms des blocs, alternative awk), espaces de fin de ligne retirés.
blocs() { awk -v m="^/\\\\* Nova : ($2) \\\\*/" '$0 ~ m {b=1} b{sub(/[ \t]+$/, ""); print} b&&/^}/{b=0; print ""}' "$1" 2>/dev/null; }
reste() { awk -v m="^/\\\\* Nova : ($2) \\\\*/" '$0 ~ m {b=1} !b{print} b&&/^}/{b=0}' "$1" 2>/dev/null; }
zones=$(find . -type d -name '[0-9]*' | sed 's|^\./||' | sort)
if [ "$T" = program ] && [ -n "$S" ]; then
  for x in $(cat courses icourses 2>/dev/null | cut -d, -f1 | grep .); do zones="$zones $H/log/classes/$S/$x"; done
fi
if [ "$M" = ecarts ]; then
  for p in $(printf '%s' "$P" | tr ',' ' '); do
    case "$p" in apparence) m='reglages de la page Apparence' ;; badges) m='badges' ;; *) continue ;; esac
    ref=$(blocs css "$m")
    for z in $zones; do
      grep -q '^!set class_defined=yes' "$z/.def" 2>/dev/null || continue
      [ "$(blocs "$z/css" "$m")" = "$ref" ] && continue
      nom=$(sed -n 's/^!set class_description=//p' "$z/.def" | head -1)
      [ -n "$nom" ] || nom=$z
      printf '<li data-partie="%s">%s</li>' "$p" "$(printf '%s' "$nom" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g; s/\$/\&#36;/g')"
    done
  done
  exit
fi
nova=$(blocs css "$motif")
n=0
for z in $zones; do
  grep -q '^!set class_defined=yes' "$z/.def" 2>/dev/null || continue
  f="$z/css"
  r=$(reste "$f" "$motif")
  # Structure sans bloc pour cette partie : celui de la zone est retiré. (Avant le 2026-11-07, un test final faux faisait
  # échouer le groupe : feuille non remplacée, fichier temporaire laissé.)
  {
    if [ -n "$r" ]; then printf '%s\n\n' "$r"; fi
    if [ -n "$nova" ]; then printf '%s\n' "$nova"; fi
  } > "$f.nova$$" && mv "$f.nova$$" "$f" && n=$((n+1))
  rm -f "$f.nova$$"
done
echo $n
