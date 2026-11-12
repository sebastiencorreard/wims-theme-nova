#!/bin/sh
# Nova : avatar et couleur d'un eleve recopies dans chacune de ses zones (portail, groupement ; demande de l'utilisateur,
# 2026-11-12). Reference : <structure>/score/<login>.nova_avatar et .nova_couleur (lus par avatar.proc, user.phtml,
# suivi.pl...) ; une copie dans le score/ de chaque zone de l'eleve (user_participate de sa fiche dans la structure),
# pour qu'une sauvegarde d'un seul cours les emporte. La copie la plus recente l'emporte partout (cp -p : meme date) :
# choix de l'eleve, zone restauree d'une sauvegarde plus recente, structure sans fichier ; une zone nettoyee ou nouvelle
# recoit la copie. L'ancien fichier de la racine (.nova_<t>_<login>, versions d'avant le 2026-11-12) est repris avant.
# Usage : avatar-zones.sh <wims_home> <structure> <login>. Appele par user.phtml (accueil de l'eleve), avatar.phtml et
# couleur-choix.phtml (apres un choix). Rien dans une classe seule (pas de fiche dans une structure).
h=$1; k=$2; u=$3
case "$k" in ''|*[!0-9]*) exit 0;; esac
case "$u" in ''|*[!A-Za-z0-9_.@-]*) exit 0;; esac
r=$h/log/classes/$k
test -f "$r/.users/$u" || exit 0
z=$(sed -n 's/^!set user_participate=//p' "$r/.users/$u" | tr ',' ' ')
d=$r
for c in $z; do
  case "$c" in "$k"/*) ;; *) continue;; esac
  case "$c" in *[!0-9/]*|*//*|*/) continue;; esac
  test -d "$h/log/classes/$c/score" && d="$d $h/log/classes/$c"
done
for t in avatar couleur; do
  o="$r/.nova_${t}_$u"; n="$r/score/$u.nova_$t"
  if [ -f "$o" ]; then if [ -e "$n" ] && ! [ "$o" -nt "$n" ]; then rm -f "$o"; else mv -f "$o" "$n"; fi; fi
  m=
  for c in $d; do f="$c/score/$u.nova_$t"; [ -f "$f" ] || continue; { [ -z "$m" ] || [ "$f" -nt "$m" ]; } && m=$f; done
  [ -n "$m" ] || continue
  for c in $d; do
    f="$c/score/$u.nova_$t"
    [ "$f" = "$m" ] && continue
    [ -f "$f" ] && ! [ "$m" -nt "$f" ] && cmp -s "$m" "$f" && continue
    cp -p "$m" "$f" 2>/dev/null
  done
done
exit 0
