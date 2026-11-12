#!/bin/sh
# Nova : preparer le retour a une version anterieure de Nova (demande de l'utilisateur, 2026-11-12).
# Depuis le 2026-11-12, l'avatar et la couleur d'un eleve sont dans <structure ou classe>/score/<login>.nova_avatar et
# .nova_couleur ; les versions d'avant les lisent a la racine (.nova_avatar_<login>, .nova_couleur_<login>). Ce script
# les y recopie (cp -p : meme date), pour tous les eleves de la classe ou de la structure. Rien n'est retire de score/.
# A faire juste avant de changer de version : la version courante efface la copie d'un eleve a sa visite suivante
# (avatar.proc, user.phtml), sauf si elle est plus recente que le fichier de score/ (elle le remplace alors).
# Usage : avatars-retour.sh <wims_home> <structure ou classe>. Sortie : nombre d'avatars recopies.
# Appele par _widgets/avatars-classe.phtml (accueil, enseignant).
h=$1; k=$2
case "$k" in ''|*[!0-9]*) echo 0; exit 0;; esac
cd "$h/log/classes/$k" 2>/dev/null || { echo 0; exit 0; }
n=0
for f in score/*.nova_avatar score/*.nova_couleur; do
  [ -f "$f" ] || continue
  b=${f##*/}; t=${b##*.nova_}; u=${b%.nova_*}
  case "$u" in ''|*[!A-Za-z0-9_.@-]*) continue;; esac
  if cp -p "$f" ".nova_${t}_$u" 2>/dev/null; then [ "$t" = avatar ] && n=$((n + 1)); fi
done
echo $n
