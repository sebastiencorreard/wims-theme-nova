#! /bin/sh
# Nova : sequences pedagogiques d'une classe (2026-11-12, utilisateur). Lu par _widgets/sequences.phtml.
#   sequences.sh <wims_home> <classe> deplacer <de> <vers>
#     Deplace la sequence <de> au rang <vers> d'un coup (glisser-deposer de l'enseignant). WIMS ne sait que remonter
#     d'un cran (moveup.proc) : memes fichiers, permutes en rotation : seq/.sequenceN et .SN (conditions d'acces).
#     Index seq/.sequences et seq/.seqinverse renumerotes aussi (WIMS les refait a l'affichage suivant : sheetindex).
#   sequences.sh <wims_home> <classe> numero oui|non
#     Option « numero seul, sans mot generique » : ligne sequence_nova_numero du fichier seq/.def.
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
