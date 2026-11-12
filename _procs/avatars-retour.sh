#!/bin/sh
# Nova : preparer le retour a une version anterieure de Nova (demande de l'utilisateur, 2026-11-12).
# Depuis le 2026-11-12 :
# - l'avatar et la couleur d'un eleve sont dans <structure ou classe>/score/<login>.nova_avatar et .nova_couleur ; les
#   versions d'avant les lisent a la racine (.nova_avatar_<login>, .nova_couleur_<login>) ;
# - le stock de ses badges est dans score/<login>.nova_badges de chaque zone ; les versions d'avant lisent score/<login>.nova
#   (sinon les badges seraient recalcules d'apres les notes : niveau perdu ou annonce une seconde fois).
# Ce script les recopie a l'ancien nom (cp -p : meme date), pour tous les eleves de la classe ou de la structure (toutes
# ses zones). Rien n'est retire. A faire juste avant de changer de version : la version courante retire une copie a la
# visite suivante de l'eleve, sauf si elle est plus recente (ecrite par la version anterieure : elle l'emporte alors).
# Usage : avatars-retour.sh <wims_home> <structure ou classe>. Sortie : nombre d'eleves prepares.
# Appele par _widgets/avatars-classe.phtml (accueil, enseignant).
h=$1; k=$2
case "$k" in ''|*[!0-9]*) echo 0; exit 0;; esac
r=$h/log/classes/$k
cd "$r" 2>/dev/null || { echo 0; exit 0; }
{
for f in score/*.nova_avatar score/*.nova_couleur; do
  [ -f "$f" ] || continue
  b=${f##*/}; t=${b##*.nova_}; u=${b%.nova_*}
  case "$u" in ''|*[!A-Za-z0-9_.@-]*) continue;; esac
  cp -p "$f" ".nova_${t}_$u" 2>/dev/null && echo "$u"
done
  # Zones = dossiers numerotes de la structure (comme avatar.proc), la racine comprise.
for d in $(find "$r" ! -name '[0-9]*' -prune -o -type d -print 2>/dev/null); do
  for f in "$d"/score/*.nova_badges; do
    [ -f "$f" ] || continue
    b=${f##*/}; u=${b%.nova_badges}
    case "$u" in ''|*[!A-Za-z0-9_.@-]*) continue;; esac
    cp -p "$f" "$d/score/$u.nova" 2>/dev/null && echo "$u"
  done
done
} | sort -u | wc -l | tr -d ' '
