#! /bin/sh
# Nova : contenu d'un examen en deux listes (2026-11-19, utilisateur, maquette examen-contenu). Lu par
# _widgets/examen-contenu.phtml (adm/class/exam, enseignant).
#   examen.sh <wims_home> <classe> examen <examen>
#     HTML cache pour nova.js (examenContenu) : un <i class="x" ...> par exercice de l'examen (fichier exams/.examN de WIMS :
#     enregistrements « :poids / choix / titre / dependances / options / commentaire », choix = « feuille.exercice,... »).
#   examen.sh <wims_home> <classe> feuille <feuille> [hors]
#     Un <b ...> (numero, titre : ligne 3 de sheets/.sheets), puis un <i class="e" ...> par exercice (numero, titre : ligne 5,
#     module et parametres : lignes 1 et 2 de sheets/.sheetN, pour l'apercu) ; « hors » : feuille non active citee par
#     l'examen (data-hors : titres des cartes seulement). Une feuille par appel : la sortie d'un !sh passe par une ligne de
#     WIMS (45 000 octets, MAX_LINELEN) ; toutes les feuilles du banc en un appel : 80 Ko, page d'erreur de WIMS (vecu).
#   examen.sh <wims_home> <classe> citees <examen> "<feuilles actives>"
#     Feuilles citees par l'examen hors des feuilles actives, separees par des virgules.
#     Textes echappes pour un attribut (& " < >).
#   examen.sh <wims_home> <classe> ecrire <examen> "<feuilles actives>" <contenu en hexadecimal>
#     Remplace le contenu de l'examen, s'il est en preparation (ligne de statut 0 dans exams/.exams). Contenu : octets
#     latin-1 en hexadecimal ; enregistrements separes par 1e, champs par 1f, dans l'ordre de WIMS. Memes controles que
#     WIMS (adm/class/exam, var.proc, job=exo) : poids entre 0 et 10 (sinon 1), choix limite aux exercices qui existent dans
#     les feuilles de la classe (nova.js ne propose que les feuilles actives ; un exercice sans choix valable est omis), titre sur une ligne, 100 caracteres, « Ex » si vide, dependances
#     100 caracteres, options limitees a « autogen ». Aucune ligne ne commence par « : » (separateur de WIMS).
#     Sortie : « ok <nombre d'exercices> », ou la raison du refus.
h=$1; c=$2; action=$3; n=$4; actives=$5
[ "$action" = feuille ] && actives=
case "$c" in ''|*[!0-9/]*|*..*) echo classe; exit 0;; esac
case "$n" in ''|*[!0-9]*) echo examen; exit 0;; esac
case "$actives" in *[!0-9,\ ]*) echo feuilles; exit 0;; esac
d="$h/log/classes/$c"
[ -d "$d/exams" ] && [ -d "$d/sheets" ] || { echo classe; exit 0; }
cd "$d" || exit 0
liste=$(printf '%s' "$actives" | tr ', ' '\n\n' | grep -a '^[0-9][0-9]*$')

# Nombre d'exercices de chaque feuille de la classe : « feuille nombre » par ligne. Toutes les feuilles, pas seulement les
# actives : un exercice deja dans l'examen dont la feuille n'est plus active reste (WIMS ne reecrit que l'exercice modifie).
# Variables propres (cp_…) : une fonction sh partage ses variables avec l'appelant ; « f » y a ecrase la cible de
# l'ecriture, qui a vide une FEUILLE du banc (vecu le 2026-11-19, restauree). La cible est refixee apres l'appel.
comptes() {
  for cp_f in sheets/.sheet[0-9]*; do
    cp_s=${cp_f#sheets/.sheet}
    case "$cp_s" in ''|*[!0-9]*) continue;; esac
    printf '%s %s\n' "$cp_s" "$(grep -a -c '^:' "$cp_f")"
  done
}
# Feuilles citees par l'examen hors des feuilles actives (titres des exercices pour les cartes).
citees() {
  [ -f "exams/.exam$n" ] || return 0
  awk '/^:/ { getline; print }' "exams/.exam$n" | tr ',' '\n' | sed -n 's/^\([0-9][0-9]*\)\.[0-9][0-9]*$/\1/p' | sort -un | while read -r ct_s; do
    printf '%s\n' "$liste" | grep -qx "$ct_s" || printf '%s\n' "$ct_s"
  done
}

# Fonctions awk communes : esc() echappe pour un attribut HTML.
ESC='function esc(v) { gsub(/&/, "\\&amp;", v); gsub(/"/, "\\&quot;", v); gsub(/</, "\\&lt;", v); gsub(/>/, "\\&gt;", v); gsub(/\t/, " ", v); return v }'

case "$action" in
examen)
  [ -f "exams/.exam$n" ] && awk "$ESC"'
    function sortir() { printf "<i class=\"x\" data-p=\"%s\" data-c=\"%s\" data-n=\"%s\" data-d=\"%s\" data-o=\"%s\" data-k=\"%s\"></i>\n", esc(f[1]), esc(f[2]), esc(f[3]), esc(f[4]), esc(f[5]), esc(f[6]) }
    /^:/ { if (k) sortir(); k = 1; i = 1; f[1] = substr($0, 2); for (j = 2; j <= 6; j++) f[j] = ""; next }
    k { i++; if (i <= 6) f[i] = $0 }
    END { if (k) sortir() }' "exams/.exam$n"
  ;;
citees)
  citees | tr '\n' ',' | sed 's/,$//'
  ;;
feuille)
  s=$n; h=; [ "$5" = hors ] && h=' data-hors="1"'
  [ -f "sheets/.sheet$s" ] || exit 0
  awk -v s="$s" -v h="$h" "$ESC"'
    /^:/ { r++; if (r == s) { t = 1; next } else if (t) exit }
    t { l++; if (l == 2) { print "<b data-s=\"" s "\"" h " data-t=\"" esc($0) "\"></b>"; exit } }' sheets/.sheets
  awk -v s="$s" "$ESC"'
    function sortir() { printf "<i class=\"e\" data-e=\"%s.%d\" data-t=\"%s\" data-m=\"%s\" data-a=\"%s\"></i>\n", s, k, esc(f[5]), esc(f[1]), esc(f[2]) }
    /^:/ { if (k) sortir(); k++; i = 1; f[1] = substr($0, 2); for (j = 2; j <= 5; j++) f[j] = ""; next }
    k { i++; if (i <= 5) f[i] = $0 }
    END { if (k) sortir() }' "sheets/.sheet$s"
  ;;
ecrire)
  hex=$6
  case "$hex" in *[!0-9a-f]*) echo contenu; exit 0;; esac
  [ -f "exams/.exams" ] || { echo examen; exit 0; }
  statut=$(awk -v n="$n" '/^:/ { r++; if (r == n) { sub(/^:/, ""); gsub(/[ \t\r]/, ""); print; exit } }' exams/.exams)
  [ "$statut" = 0 ] || { echo actif; exit 0; }
  tmp="exams/.exam$n.nova"
  comptes > "$tmp-comptes"
  printf '%s' "$hex" | awk -v comptes="$tmp-comptes" '
    BEGIN {
      for (i = 0; i < 256; i++) car[sprintf("%02x", i)] = sprintf("%c", i)
      while ((getline l < comptes) > 0) { split(l, a, " "); nb[a[1]] = a[2] }
    }
    function ligne(v, lim) { gsub(/[\r\n\t\036\037]/, " ", v); v = substr(v, 1, lim); return v }
    function garde(v) { if (v ~ /^:/) v = " " v; return v }
    { x = x $0 }
    END {
      t = ""
      for (i = 1; i < length(x); i += 2) t = t car[substr(x, i, 2)]
      m = split(t, rec, "\036"); sortie = ""; cnt = 0
      for (r = 1; r <= m; r++) {
        if (rec[r] == "") continue
        split(rec[r], c, "\037")
        p = c[1]; if (p !~ /^[0-9]+(\.[0-9]+)?$/ || p + 0 > 10) p = 1
        ch = ""; q = split(c[2], it, ",")
        for (j = 1; j <= q; j++) {
          if (it[j] !~ /^[0-9]+\.[0-9]+$/) continue
          split(it[j], fe, ".")
          if (!(fe[1] in nb) || fe[2] + 0 < 1 || fe[2] + 0 > nb[fe[1]] + 0) continue
          if (index("," ch ",", "," it[j] ",")) continue
          ch = ch (ch == "" ? "" : ",") it[j]
        }
        if (ch == "") continue
        ti = ligne(c[3], 100); gsub(/  +/, " ", ti); sub(/^ +/, "", ti); sub(/ +$/, "", ti); if (ti == "") ti = "Ex"
        o = (c[5] ~ /autogen/) ? "autogen" : ""
        sortie = sortie ":" p "\n" ch "\n" garde(ti) "\n" garde(ligne(c[4], 100)) "\n" o "\n" garde(ligne(c[6], 2000)) "\n"
        cnt++
      }
      printf "%s", sortie > "/dev/stdout"
      print cnt > "/dev/stderr"
    }' > "$tmp-neuf" 2> "$tmp-nombre"
  nb=$(cat "$tmp-nombre" 2>/dev/null)
  rm -f "$tmp-comptes" "$tmp-nombre"
  case "$nb" in ''|*[!0-9]*) rm -f "$tmp-neuf"; echo erreur; exit 0;; esac
  cible="exams/.exam$n"
  case "$cible" in exams/.exam[0-9]*) ;; *) rm -f "$tmp-neuf"; echo erreur; exit 0;; esac
  mv -f "$tmp-neuf" "$cible" || { rm -f "$tmp-neuf"; echo erreur; exit 0; }
  echo "ok $nb"
  ;;
esac
