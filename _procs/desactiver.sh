#!/bin/sh
# Nova : désactiver un examen ou une feuille que WIMS refuse de désactiver parce qu'ils sont PARTAGÉS avec d'autres
# classes (demande de l'utilisateur, 2026-11-08 ; avant : sauvegarde de la classe, « :1 » changé en « :0 » dans le zip,
# réimport). Seul le statut change (« :1 » → « :0 », examen ou feuille « En préparation ») ; les notes restent.
# Le partage relie les classes par lien symbolique (scripts/adm/class/addshare) : un seul fichier pour toutes.
# Réservé aux classes qui l'ont permis (2026-11-08, utilisateur) : --nova-desactivation-forcee: oui dans la feuille de
# style de la classe ou, à défaut, de la structure la plus proche (log/classes/<c>/css ; la plus proche décide).
# Refus de WIMS gardé (choix de l'utilisateur) : examen déjà commencé par un élève (comme adm/class/exam/var.proc), cherché
# aussi dans les classes du partage (sharable_exam de neighbors : les cours d'un programme de portail, où les élèves
# travaillent ; vu le 2026-11-08, portail 1496713).
# Contourné aussi (2026-11-08, utilisateur) : feuille dont des exercices sont dans un examen (signalé : « ok examen »).
# Usage : desactiver.sh <wims_home> <classe> exam|sheet <numéro> [verifier]
# Sortie : ok | ok examen | reglage (non permis) | statut (pas actif) | commence | erreur. « verifier » : rien n'est écrit.
# Appelé par header.phtml, droits déjà vérifiés (enseignant de la classe).
H=$1; C=$2; T=$3; N=$4; V=$5
case "$C" in ''|*[!0-9/]*) echo erreur; exit ;; esac
case "$N" in ''|*[!0-9]*) echo erreur; exit ;; esac
cd "$H/log/classes/$C" 2>/dev/null || { echo erreur; exit; }
case "$T" in
  exam) F=exams/.exams ;;
  sheet) F=sheets/.sheets ;;
  *) echo erreur; exit ;;
esac
[ -f "$F" ] || { echo erreur; exit; }
permis=non; d=$C
while [ -n "$d" ]; do
  v=$(sed -n 's/.*--nova-desactivation-forcee[[:space:]]*:[[:space:]]*\([a-z]*\).*/\1/p' "$H/log/classes/$d/css" 2>/dev/null | tail -n 1)
  [ -n "$v" ] && { permis=$v; break; }
  case "$d" in */*) d=${d%/*} ;; *) d= ;; esac
done
[ "$permis" = oui ] || { echo reglage; exit; }
st=$(awk -v n="$N" '/^:/ { k++; if (k == n) { print substr($0, 2); exit } }' "$F")
[ "$st" = 1 ] || { echo statut; exit; }
if [ "$T" = exam ]; then
  classes=". $(sed -n 's/^sharable_exam=//p' neighbors 2>/dev/null | tr ',' ' ')"
  for c in $classes; do
    case "$c" in .) d=. ;; *[!0-9/]*|'') continue ;; *) d="$H/log/classes/$c" ;; esac
    [ -d "$d/noscore" ] || continue
    for f in "$d"/noscore/*; do
      [ -f "$f" ] || continue
      [ "${f##*/}" = supervisor ] && continue
      if awk -v e="$N" 'length($1) == 18 && $3 == e { t = 1; exit } END { exit !t }' "$f"; then echo commence; exit; fi
    done
  done
else
  dans=''
  for e in exams/.exam[0-9]*; do
    [ -f "$e" ] || continue
    # 2e ligne de chaque enregistrement : exercices « feuille.exercice ».
    if awk -v s="$N" '/^:/ { l = 1; next } { l++ } l == 2 && (" " $0) ~ ("[^0-9.]" s "\\.") { t = 1; exit } END { exit !t }' "$e"; then dans=' examen'; break; fi
  done
fi
[ "$V" = verifier ] && { echo "ok${dans:-}"; exit; }
# Remplacement d'un coup (mv) du VRAI fichier : le lien du partage est suivi et reste en place ; cp -p garde droits et
# proprietaire (audit du 2026-11-12 ; avant : cat > fichier, que WIMS pouvait lire a moitie ecrit).
R=$(readlink -f "$F") || { echo erreur; exit; }
tmp="$R.nova$$"
cp -p "$R" "$tmp" 2>/dev/null || { rm -f "$tmp"; echo erreur; exit; }
awk -v n="$N" '/^:/ { k++; if (k == n) sub(/^:1/, ":0") } { print }' "$R" > "$tmp" || { rm -f "$tmp"; echo erreur; exit; }
mv "$tmp" "$R" && echo ok || { rm -f "$tmp"; echo erreur; }
