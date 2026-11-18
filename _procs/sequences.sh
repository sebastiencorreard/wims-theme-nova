#! /bin/sh
# Nova : sequences pedagogiques d'une classe (2026-11-12, utilisateur). Lu par _widgets/sequences.phtml.
#   sequences.sh <wims_home> <classe> deplacer <de> <vers>
#     Deplace la sequence <de> au rang <vers> d'un coup (glisser-deposer de l'enseignant). WIMS ne sait que remonter
#     d'un cran (moveup.proc) : memes fichiers, permutes en rotation : seq/.sequenceN et .SN (conditions d'acces).
#     Index seq/.sequences et seq/.seqinverse renumerotes aussi (WIMS les refait a l'affichage suivant : sheetindex).
#   sequences.sh <wims_home> <classe> numero oui|non
#     Option « numero seul, sans mot generique » : ligne sequence_nova_numero du fichier seq/.def.
#   sequences.sh <wims_home> <classe> plages
#     Plage d'affichage de chaque sequence (fichier .SN de la classe, ecrit par WIMS : vide = pour tous, « none » = cachee,
#     sinon >AAAAMMJJ.HH:MM (debut), <AAAAMMJJ.HH:MM (fin) et adresses IP ; « \nom » = variable technique), sur une ligne :
#     « N:tous;N:cachee;N:technique;N:plage,<debut>,<fin>,<ip> » (debut, fin = AAAAMMJJHHMM ou vide ; ip = 1 si des postes).
#   sequences.sh <wims_home> <classe> plage <N> tous|cachee|plage <debut> <fin>
#     Ecrit la plage de la sequence N (2026-11-19, utilisateur), au format de WIMS (scripts/adm/scorerestriction, get).
#     Les adresses IP deja posees sont gardees (sauf « cachee », comme WIMS) ; une variable technique : refus.
# Sortie : ok, ou la raison du refus.
h=$1; c=$2; action=$3
case "$c" in ''|*[!0-9/]*|*..*) echo classe; exit 0;; esac
d="$h/log/classes/$c"
[ -d "$d/seq" ] || { echo classe; exit 0; }
cd "$d" || exit 0

if [ "$action" = numero ]; then
  case "$4" in oui) v=yes;; non) v=no;; *) echo valeur; exit 0;; esac
  if [ -f seq/.def ] && grep -aq '^!set sequence_nova_numero=' seq/.def; then
    sed -i "s/^!set sequence_nova_numero=.*/!set sequence_nova_numero=$v/" seq/.def
  else
    printf '!set sequence_nova_numero=%s\n' "$v" >> seq/.def
  fi
  echo ok; exit 0
fi

# Plage lue : sortie « N:... » pour la sequence N.
plage_de() {   # $1 = numero
  f=".S$1"
  [ -s "$f" ] || { echo "$1:tous"; return; }
  premier=$(tr '\n' ' ' < "$f" | awk '{print $1}')
  case "$premier" in none) echo "$1:cachee"; return;; \\*) echo "$1:technique"; return;; esac
  tr '\n' ' ' < "$f" | awk -v n="$1" '{ d = ""; f = ""; ip = 0
    for (i = 1; i <= NF; i++) { c = substr($i, 1, 1); v = substr($i, 2); gsub(/[^0-9]/, "", v)
      if (c == ">") d = v; else if (c == "<") f = v; else ip = 1 }
    if (d == "" && f == "" && !ip) print n ":tous"; else print n ":plage," d "," f "," ip }'
}
if [ "$action" = plages ]; then
  n=$(sed -n 1p seq/.sequences 2>/dev/null | tr -cd '0-9'); [ -n "$n" ] || n=0
  i=1; l=""
  while [ "$i" -le "$n" ]; do l="$l;$(plage_de "$i")"; i=$((i+1)); done
  echo "${l#;}"; exit 0
fi
if [ "$action" = plage ]; then
  k=$4; mode=$5; deb=$6; fin=$7
  case "$k" in ''|*[!0-9]*) echo rang; exit 0;; esac
  [ -f "seq/.sequence$k" ] || { echo rang; exit 0; }
  f=".S$k"
  if [ -s "$f" ]; then case "$(tr '\n' ' ' < "$f" | awk '{print $1}')" in \\*) echo technique; exit 0;; esac; fi
  # Adresses IP gardees (mots sans < ni >, hors « none »).
  ips=""
  [ -f "$f" ] && ips=$(tr '\n' ' ' < "$f" | awk '{ s = ""; for (i = 1; i <= NF; i++) { c = substr($i, 1, 1)
    if (c != "<" && c != ">" && $i != "none") s = s " " $i } print substr(s, 2) }')
  date_ok() {   # AAAAMMJJHHMM
    case "$1" in [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]) ;; *) return 1;; esac
    m=$(echo "$1" | cut -c5-6); j=$(echo "$1" | cut -c7-8); h=$(echo "$1" | cut -c9-10); mi=$(echo "$1" | cut -c11-12)
    [ "$m" -ge 1 ] && [ "$m" -le 12 ] && [ "$j" -ge 1 ] && [ "$j" -le 31 ] && [ "$h" -le 23 ] && [ "$mi" -le 59 ]
  }
  wims() { echo "$1" | sed 's/^\(........\)\(..\)\(..\)$/\1.\2:\3/'; }
  case "$mode" in
    tous) if [ -n "$ips" ]; then printf '%s\n' "$ips" > "$f"; else rm -f "$f"; fi;;
    cachee) printf 'none\n' > "$f";;
    plage)
      [ -z "$deb" ] || date_ok "$deb" || { echo date; exit 0; }
      [ -z "$fin" ] || date_ok "$fin" || { echo date; exit 0; }
      [ -n "$deb$fin" ] || { echo date; exit 0; }
      if [ -n "$deb" ] && [ -n "$fin" ] && [ "$deb" -ge "$fin" ]; then echo ordre; exit 0; fi
      l=""
      [ -z "$deb" ] || l=">$(wims "$deb")"
      [ -z "$fin" ] || l="$l <$(wims "$fin")"
      [ -z "$ips" ] || l="$l $ips"
      printf '%s\n' "$(echo $l)" > "$f";;
    *) echo mode; exit 0;;
  esac
  echo ok; exit 0
fi

[ "$action" = deplacer ] || { echo action; exit 0; }
de=$4; vers=$5
case "$de$vers" in ''|*[!0-9]*) echo rang; exit 0;; esac
n=$(sed -n 1p seq/.sequences 2>/dev/null | tr -cd '0-9')
[ -n "$n" ] || { echo rang; exit 0; }
[ "$de" -ge 1 ] && [ "$de" -le "$n" ] && [ "$vers" -ge 1 ] && [ "$vers" -le "$n" ] || { echo rang; exit 0; }
[ "$de" -ne "$vers" ] || { echo ok; exit 0; }
i=1
while [ "$i" -le "$n" ]; do [ -f "seq/.sequence$i" ] || { echo fichiers; exit 0; }; i=$((i+1)); done

# Rotation : <de> part de cote, les sequences entre les deux glissent d'un cran, <de> arrive a <vers>.
deplacer() {   # $1 = prefixe du fichier (seq/.sequence ou .S)
  p=$1
  [ -e "$p$de" ] && mv "$p$de" "$p.nova-tmp"
  if [ "$de" -lt "$vers" ]; then
    i=$de; while [ "$i" -lt "$vers" ]; do [ -e "$p$((i+1))" ] && mv "$p$((i+1))" "$p$i"; i=$((i+1)); done
  else
    i=$de; while [ "$i" -gt "$vers" ]; do [ -e "$p$((i-1))" ] && mv "$p$((i-1))" "$p$i"; i=$((i-1)); done
  fi
  [ -e "$p.nova-tmp" ] && mv "$p.nova-tmp" "$p$vers"
}
deplacer seq/.sequence
deplacer .S

# Nouveau numero d'une ancienne sequence k.
regle='function nv(k) { k += 0; if (k == de) return vers; if (de < vers && k > de && k <= vers) return k - 1; if (de > vers && k >= vers && k < de) return k + 1; return k }'
if [ -f seq/.sequences ]; then
  awk -v de="$de" -v vers="$vers" "$regle"'
    NR == 1 { print; next }
    /^[0-9]+,/ || /^[0-9]+$/ { split($0, a, ","); k = nv(a[1]); l[k] = k substr($0, length(a[1]) + 1); next }
    { reste = reste $0 "\n" }
    END { for (k = 1; k <= 9999; k++) if (k in l) print l[k]; printf "%s", reste }' seq/.sequences > seq/.sequences.nova && mv seq/.sequences.nova seq/.sequences
fi
if [ -f seq/.seqinverse ]; then
  awk -v de="$de" -v vers="$vers" "$regle"'
    { i = index($0, ":"); if (!i) { print; next }
      m = split(substr($0, i + 1), a, ","); s = ""
      for (j = 1; j <= m; j++) s = s (j > 1 ? "," : "") (a[j] ~ /^[0-9]+$/ ? nv(a[j]) : a[j])
      print substr($0, 1, i) s }' seq/.seqinverse > seq/.seqinverse.nova && mv seq/.seqinverse.nova seq/.seqinverse
fi
echo ok
