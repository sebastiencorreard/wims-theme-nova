#!/bin/sh
# Nova : désactiver un examen ou une feuille que WIMS refuse de désactiver parce qu'ils sont PARTAGÉS avec d'autres
# classes (demande de l'utilisateur, 2026-11-08 ; avant : sauvegarde de la classe, « :1 » changé en « :0 » dans le zip,
# réimport). Seul le statut change (« :1 » → « :0 », examen ou feuille « En préparation ») ; les notes restent.
# Le partage relie les classes par lien symbolique (scripts/adm/class/addshare) : un seul fichier pour toutes.
# Les autres refus de WIMS restent (choix de l'utilisateur) : examen déjà commencé par un élève (comme
# adm/class/exam/var.proc), feuille dont des exercices sont dans un examen (comme adm/class/sheet/var.proc.deactivate).
# Usage : desactiver.sh <wims_home> <classe> exam|sheet <numéro> [verifier]
# Sortie : ok | statut (pas actif) | commence | examen | erreur. « verifier » : rien n'est écrit.
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
st=$(awk -v n="$N" '/^:/ { k++; if (k == n) { print substr($0, 2); exit } }' "$F")
[ "$st" = 1 ] || { echo statut; exit; }
if [ "$T" = exam ]; then
  if [ -d noscore ]; then
    for f in noscore/*; do
      [ -f "$f" ] || continue
      [ "${f##*/}" = supervisor ] && continue
      if awk -v e="$N" 'length($1) == 18 && $3 == e { t = 1; exit } END { exit !t }' "$f"; then echo commence; exit; fi
    done
  fi
else
  for e in exams/.exam[0-9]*; do
    [ -f "$e" ] || continue
    # 2e ligne de chaque enregistrement : exercices « feuille.exercice ».
    if awk -v s="$N" '/^:/ { l = 1; next } { l++ } l == 2 && (" " $0) ~ ("[^0-9.]" s "\\.") { t = 1; exit } END { exit !t }' "$e"; then echo examen; exit; fi
  done
fi
[ "$V" = verifier ] && { echo ok; exit; }
tmp="$F.nova$$"
awk -v n="$N" '/^:/ { k++; if (k == n) sub(/^:1/, ":0") } { print }' "$F" > "$tmp" || { rm -f "$tmp"; echo erreur; exit; }
# cat > : garde le fichier (et le lien du partage), ses droits et son propriétaire.
cat "$tmp" > "$F" && rm -f "$tmp" && echo ok || { rm -f "$tmp"; echo erreur; }
