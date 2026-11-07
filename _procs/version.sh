#!/bin/sh
# Version de Nova pour la page Apparence (2026-11-07) : affiche « <numéro> <commit> <AAAA-MM-JJ> ».
# Archive de livrer.sh : les trois lignes de VERSION. Dépôt git (développement) : numéro de VERSION, commit lu dans .git,
# date remplacée par « dev ». Appel : sh version.sh <dossier du thème>
d=$1
v=$(sed -n 1p "$d/VERSION" 2>/dev/null); c=$(sed -n 2p "$d/VERSION" 2>/dev/null); j=$(sed -n 3p "$d/VERSION" 2>/dev/null)
if [ -z "$c" ] && [ -r "$d/.git/HEAD" ]; then
  h=$(cat "$d/.git/HEAD")
  case "$h" in
    ref:*) r=${h#ref: }; c=$(cat "$d/.git/$r" 2>/dev/null || awk -v r="$r" '$2 == r { print $1 }' "$d/.git/packed-refs" 2>/dev/null) ;;
    *) c=$h ;;
  esac
  c=$(printf '%s' "$c" | cut -c1-7); j=dev
fi
echo "${v:-?} ${c:-?} ${j:-?}"
