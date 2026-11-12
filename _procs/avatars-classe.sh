#!/bin/sh
# Nova : page « Avatars des eleves » de l'enseignant (demande de l'utilisateur, maquette A validee le 2026-11-12).
# Appele par _widgets/avatars-classe.phtml (accueil, module de confiance) :
#   avatars-classe.sh <wims_home> <dossier du theme> <structure> <zone ou classe> <AAAAMMJJ> <session>
# Eleves de la zone courante seulement (sa liste .userlist). Pour chacun, _procs/avatar.awk (le calcul que voit
# l'eleve, en simple lecture) : jetons gagnes dans toute la structure, choix enregistre (sans les elements hors
# saison), elements debloques, niveaux des badges. Ecrit un fragment HTML dans la session (sortie de !sh limitee
# a 45 Ko, comme suivi.pl) : <li> par eleve, lu par !read ; « $ » et « ! » en entites (lus par WIMS).
h=$1; t=$2; k=$3; c=$4; auj=$5; s=$6
case "$k" in ''|*[!0-9]*) exit 0;; esac
case "$c" in ''|*[!0-9/]*|*//*) exit 0;; esac
case "$auj" in ????????) ;; *) exit 0;; esac
case "$s" in ''|*[!A-Za-z0-9_]*) exit 0;; esac
cl=$h/log/classes; r=$cl/$k; z=$cl/$c
test -d "$h/sessions/$s" || exit 0
out=$h/sessions/$s/nova-avatars.phtml; tmp=$out.$$
proc=$h/public_html/themes/$t/_procs
conf=$(cat "$h/log/nova.conf" "$r/css" "$z/css" 2>/dev/null)
# Fichiers de notes de toute la structure, listes une fois (avatar.proc fait un find par eleve).
liste=$h/sessions/$s/nova-avatars.liste
find "$r" -type f \( -path '*/score/*' -o -path '*/noscore/*' \) 2>/dev/null > "$liste"
{
  test -r "$z/.userlist" && sed -n 's/^://p' "$z/.userlist" | while IFS=, read -r nom prenom login; do
    case "$login" in ''|*[!A-Za-z0-9_.@-]*) continue;; esac
    {
      echo '#conf'; printf '%s\n' "$conf"; echo
      echo '#fichier'; cat "$r/score/$login.nova_avatar" 2>/dev/null || cat "$r/.nova_avatar_$login" 2>/dev/null || cat "$z/score/$login.nova_avatar" 2>/dev/null
      echo '#stock'
      # Stock des badges : score/<login>.nova_badges (avant le 2026-11-12 : .nova, encore lu pour un eleve pas revenu).
      awk -v u="$login" '{ n = split($0, p, "/"); if ((p[n] == u ".nova_badges" || p[n] == u ".nova") && p[n-1] == "score") { sub(/\/[^\/]*$/, ""); print } }' "$liste" | sort -u | while read -r d; do
        f="$d/$login.nova_badges"; [ "$d/$login.nova" -nt "$f" ] && f="$d/$login.nova"; cat "$f" 2>/dev/null; done
      awk -v u="$login" '{ n = split($0, p, "/"); if (p[n] == u && (p[n-1] == "score" || p[n-1] == "noscore")) print }' "$liste" | while read -r f; do
        echo "#zone $(dirname "$(dirname "$f")")"; cat "$f"; done
    } | awk -v auj="$auj" -v catalogue="$proc/avatar-catalogue.txt" -v ouvrir= -v choix= -v niveaux=1 -f "$proc/avatar.awk" \
      | awk -v login="$login" -v nom="$nom" -v prenom="$prenom" '
        function esc(x) { gsub(/&/, "\\&amp;", x); gsub(/</, "\\&lt;", x); gsub(/>/, "\\&gt;", x); gsub(/"/, "\\&quot;", x)
          gsub(/\$/, "\\&#36;", x); gsub(/!/, "\\&#33;", x); return x }
        $1 == "jetons" { j = $2 " " $3 " " $4 " " $5 }
        $1 == "choix" && !vu++ { ch = ($2 == "-" ? "" : $2) }
        $1 == "elements" { for (i = 2; i <= NF; i++) if ($i ~ /:achete$/ || $i ~ /:badge-.*-1$/) d++ }
        $1 == "niveaux" { $1 = ""; niv = substr($0, 2) }
        END { n = prenom; if (nom != "") n = n (n != "" ? " " : "") nom; if (n == "") n = login
          printf "<li><button type=\"button\" class=\"nova-avatars-eleve%s\" data-login=\"%s\" data-nom=\"%s\" data-prenom=\"%s\" data-choix=\"%s\" data-jetons=\"%s\" data-elements=\"%d\" data-niveaux=\"%s\"><span class=\"nova-avatars-portrait\"></span><span class=\"nova-avatars-nom\">%s</span></button></li>\n",
            (ch == "" ? " nova-avatars-sans" : ""), esc(login), esc(nom), esc(prenom), ch, j, d, niv, esc(n) }'
  done
} > "$tmp"
rm -f "$liste"
mv "$tmp" "$out"
