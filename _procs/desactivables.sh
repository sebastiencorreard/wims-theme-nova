#!/bin/sh
# Nova : feuilles et examens dont l'action « Désactiver » serait REFUSÉE (2026-11-25, utilisateur : ne pas proposer une
# action refusée). Mêmes tests que WIMS 4.32, dans le même ordre :
#  - examen (modules/adm/class/exam/var.proc, « deactivate ») : partage (sharable_exam ou sharing_exam de neighbors non vides,
#    ou class_recshare contenant « main »), puis structure (badstructure, test fait par le gabarit : argument 3), puis examen
#    commencé par un élève (noscore, ligne de 18 caractères en tête, 3e champ = numéro) ;
#  - feuille (modules/adm/class/sheet/var.proc.deactivate) : poste non sécurisé (argument 4, !checkhost du gabarit), partage
#    (sharable_sheet / sharing_sheet / class_recshare=main ; refus seulement si une classe de sharable_sheet a cette classe dans
#    son sharing_sheet, ou dans une zone de structure ; un gestionnaire du site passe), puis feuille utilisée dans un examen.
#    Des notes d'élèves ne font que demander une confirmation : pas un refus.
# Contournement de Nova (_procs/desactiver.sh, _widgets/desactiver.phtml) : permis si la classe l'a permis
# (--nova-desactivation-forcee: oui), pour le statut « actif » (1) seulement, et pour les refus « partage » et « examen
# commencé » d'un examen, « partage » d'une feuille (une feuille dans un examen sans partage reste refusée).
# Usage : desactivables.sh <wims_home> <classe> <structure ok|mauvaise|programme> <poste ok|non> <superclasse> <gestionnaire>
# Sortie : deux lignes, numéros (séparés par des virgules) des feuilles refusées, puis des examens refusés. Rien n'est écrit.
H=$1; C=$2; ST=$3; SEC=$4; SUP=$5; GEST=$6
case "$C" in ''|*[!0-9/]*) exit ;; esac
case "$SUP" in *[!0-9/]*) SUP= ;; esac
cd "$H/log/classes/$C" 2>/dev/null || exit
# Valeur d'une variable d'un fichier de définitions (« x=… » ou « !set x=… »), virgules en espaces.
nv_def() { sed -n "s/^\(!set \)\{0,1\}$1=//p" "$2" 2>/dev/null | tr ',' ' '; }
# Réglage --nova-desactivation-forcee : feuille de la classe, sinon de la structure la plus proche (comme desactiver.sh).
nv_permis=non; nv_d=$C
while [ -n "$nv_d" ]; do
  nv_v=$(sed -n 's/.*--nova-desactivation-forcee[[:space:]]*:[[:space:]]*\([a-z]*\).*/\1/p' "$H/log/classes/$nv_d/css" 2>/dev/null | tail -n 1)
  # Oui pour 24 h seulement (2026-11-27, utilisateur) : heure de fin (secondes) du meme fichier ; sans elle, expire.
  if [ "$nv_v" = oui ]; then
    nv_fin=$(sed -n 's/.*--nova-desactivation-forcee-fin[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p' "$H/log/classes/$nv_d/css" 2>/dev/null | tail -n 1)
    { [ -n "$nv_fin" ] && [ "$nv_fin" -gt "$(date +%s)" ]; } || nv_v=non
  fi
  [ -n "$nv_v" ] && { nv_permis=$nv_v; break; }
  case "$nv_d" in */*) nv_d=${nv_d%/*} ;; *) nv_d= ;; esac
done
nv_recshare=$(nv_def class_recshare .def)
# Statuts : première ligne de chaque enregistrement (« :1 »).
nv_statuts() { awk '/^:/ { k++; print k, substr($0, 2, 1) }' "$1" 2>/dev/null; }

# Examens.
nv_partage_e=non
[ -n "$(nv_def sharable_exam neighbors | tr -d ' ')$(nv_def sharing_exam neighbors | tr -d ' ')" ] && nv_partage_e=oui
case "$nv_recshare" in *main*) nv_partage_e=oui ;; esac
nv_commences=$(cd noscore 2>/dev/null && for nv_f in *; do [ -f "$nv_f" ] && [ "$nv_f" != supervisor ] && cat "$nv_f"; done | awk 'length($1) == 18 { print $3 }' | sort -u | tr '\n' ' ')
nv_refus_e=$(nv_statuts exams/.exams | while read nv_n nv_s; do
  [ "$nv_s" = 0 ] && continue
  if [ "$nv_partage_e" = oui ]; then nv_r=partage
  elif [ "$ST" != ok ]; then nv_r=structure
  else case " $nv_commences " in *" $nv_n "*) nv_r=commence ;; *) nv_r= ;; esac
  fi
  [ -z "$nv_r" ] && continue
  [ "$nv_r" != structure ] && [ "$nv_permis" = oui ] && [ "$nv_s" = 1 ] && continue
  printf '%s,' "$nv_n"
done)

# Feuilles.
nv_partage_f=non
nv_offre=$(nv_def sharable_sheet neighbors)
if [ -n "$(echo "$nv_offre" | tr -d ' ')$(nv_def sharing_sheet neighbors | tr -d ' ')" ] || [ "$nv_recshare" = main ]; then
  if [ "${GEST:-0}" -gt 1 ] 2>/dev/null; then :
  elif [ -z "$SUP" ] || [ "$SUP" = "$C" ]; then
    for nv_c in $nv_offre; do
      case "$nv_c" in *[!0-9/]*) continue ;; esac
      for nv_w in $(nv_def sharing_sheet "$H/log/classes/$nv_c/neighbors"); do [ "$nv_w" = "$C" ] && nv_partage_f=oui; done
    done
  else nv_partage_f=oui
  fi
fi
# Feuilles utilisées dans un examen : 2e ligne de chaque enregistrement des exams/.examN (« feuille.exercice »).
nv_dans=$(for nv_e in exams/.exam[0-9]*; do [ -f "$nv_e" ] && awk '/^:/ { l = 1; next } { l++ } l == 2' "$nv_e"; done | tr ' ' '\n' | sed -n 's/^\([0-9][0-9]*\)\..*/\1/p' | sort -u | tr '\n' ' ')
nv_refus_f=$(nv_statuts sheets/.sheets | while read nv_n nv_s; do
  [ "$nv_s" = 0 ] && continue
  if [ "$SEC" != ok ] && [ "${GEST:-0}" -le 1 ] 2>/dev/null; then nv_r=poste
  elif [ "$nv_partage_f" = oui ]; then nv_r=partage
  else case " $nv_dans " in *" $nv_n "*) nv_r=examen ;; *) nv_r= ;; esac
  fi
  [ -z "$nv_r" ] && continue
  [ "$nv_r" = partage ] && [ "$nv_permis" = oui ] && [ "$nv_s" = 1 ] && continue
  printf '%s,' "$nv_n"
done)
printf '%s\n%s\n' "${nv_refus_f%,}" "${nv_refus_e%,}"
