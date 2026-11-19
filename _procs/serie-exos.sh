#! /bin/sh
# Nova : titres des exercices d'un module OEF, pour l'editeur des parametres d'une serie (2026-11-19, utilisateur, maquette
# serie-parametres ; js/src/74-feuille-contenu.js, serieEditeur). Lu par _widgets/serie-exos.phtml (adm/class/sheet,
# job=prep_modify, feuille en preparation).
#   serie-exos.sh <wims_home> <classe> <module>
#     Un <i data-n="nom" data-t="titre"></i> par ligne « nom:titre » du fichier Extitles du module (module de la classe :
#     log/classes/<classe>/Extitles, comme scripts/adm/class/exo_order.phtml). Textes echappes pour un attribut (& " <).
#     Sortie limitee a 40 000 octets (une ligne de WIMS : 45 000, MAX_LINELEN).
h=$1; c=$2; m=$3
case "$c" in ''|*[!0-9/]*|*..*) exit 0;; esac
case "$m" in ''|*..*|*[!A-Za-z0-9/._-]*) exit 0;; esac
case "$m" in
  classes/*) f="$h/log/classes/$c/Extitles";;
  *) f="$h/public_html/modules/$m/Extitles";;
esac
[ -r "$f" ] || exit 0
awk '{
  i = index($0, ":"); if (i < 2) next
  n = substr($0, 1, i - 1); t = substr($0, i + 1)
  gsub(/[^A-Za-z0-9_.-]/, "", n); if (n == "") next
  gsub(/&/, "\\&amp;", t); gsub(/"/, "\\&quot;", t); gsub(/</, "\\&lt;", t)
  l = "<i data-n=\"" n "\" data-t=\"" t "\"></i>"
  if (length(o) + length(l) > 40000) exit
  o = o l
} END { printf "%s", o }' "$f"
