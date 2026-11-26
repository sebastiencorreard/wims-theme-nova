#!/bin/sh
# Nova : donnees du plan d'un portail (Gestion de structure, adm/class/gateway, premiere page ; 2026-11-26, utilisateur,
# maquettes/structure-plan-2026-11-26.html). Lu par _widgets/plan-portail.phtml, pour nova.js planPortail.
# Sortie : une ligne <li> par enseignant puis par zone, dans l'ordre des index de WIMS (levels, programs, classes,
# courses a la racine du portail : « code,responsable,titre,nom du responsable, »).
#   enseignant : <li data-t="teacher" data-l="login">Prenom Nom</li>
#   zone       : <li data-t="level|prog|class|course" data-z="code" data-r="responsable" data-n="effectif"
#                data-s="postes surs" data-p="1 si mot de passe d'inscription" data-g="autres acces de gestion">Titre</li>
#   le portail lui-meme (acces de gestion de la racine) : <li data-t="root" data-z="" data-g="...">
# Effectif = lignes « : » de la .userlist de la zone. Autres acces de gestion = enseignants dont user_supervise
# (.users/<login>) contient la zone, sans son responsable (scripts/adm/gateway/modclass y ajoute aussi le responsable).
# 300 zones au plus (sortie d'un !sh limitee a 45 000 octets) ; au-dela, data-t="trop" : nova.js laisse la page de WIMS.
# Usage : plan-portail.sh <wims_home> <portail, chiffres seulement>
pp_d="$1/log/classes/$2"
test -r "$pp_d/levels" || exit 0
pp_net() { tr -d '<>"\\$!' ; }

# Acces de gestion : une ligne « zone login » par zone supervisee (zone relative au portail, racine = « . »).
pp_acces=$(
  sed -n 's/^\([^,]*\),\([^,]*\),\([^,]*\).*/\3/p' "$pp_d/.teacherlist" 2>/dev/null | tr -cd 'A-Za-z0-9_.@\n-' |
  while read -r pp_l; do
    test -n "$pp_l" && test -r "$pp_d/.users/$pp_l" || continue
    sed -n 's/^!set user_supervise=//p' "$pp_d/.users/$pp_l" | tr ',' '\n' | while read -r pp_z; do
      case "$pp_z" in
        "$2") echo ". $pp_l" ;;
        "$2"/*) echo "${pp_z#$2/} $pp_l" ;;
      esac
    done
  done
)

# Enseignants (.teacherlist : « nom,prenom,login »).
sed -n 's/^\([^,]*\),\([^,]*\),\([^,]*\).*/\3,\2 \1/p' "$pp_d/.teacherlist" 2>/dev/null | while IFS=, read -r pp_l pp_nom; do
  pp_l=$(printf '%s' "$pp_l" | tr -cd 'A-Za-z0-9_.@-')
  test -n "$pp_l" || continue
  printf '<li data-t="teacher" data-l="%s">%s</li>\n' "$pp_l" "$(printf '%s' "$pp_nom" | pp_net)"
done

pp_g() { printf '%s\n' "$pp_acces" | awk -v z="$1" -v r="$2" '$1 == z && $2 != r { printf "%s%s", s, $2; s = " " }'; }
pp_g_racine=$(pp_g . supervisor)
printf '<li data-t="root" data-z="" data-g="%s"></li>\n' "$pp_g_racine"

pp_total=$(cat "$pp_d/levels" "$pp_d/programs" "$pp_d/classes" "$pp_d/courses" 2>/dev/null | grep -c ,)
if [ "$pp_total" -gt 300 ]; then
  echo '<li data-t="trop"></li>'
  exit 0
fi
for pp_t in level:levels prog:programs class:classes course:courses; do
  pp_f="$pp_d/${pp_t#*:}"
  test -r "$pp_f" || continue
  while IFS=, read -r pp_z pp_r pp_titre pp_reste; do
    pp_z=$(printf '%s' "$pp_z" | tr -cd '0-9/')
    test -n "$pp_z" && test -r "$pp_d/$pp_z/.def" || continue
    pp_r=$(printf '%s' "$pp_r" | tr -cd 'A-Za-z0-9_.@-')
    pp_n=$(grep -c '^:' "$pp_d/$pp_z/.userlist" 2>/dev/null)
    pp_s=$(sed -n 's/^!set class_secure=//p' "$pp_d/$pp_z/.def" | head -n 1 | pp_net)
    pp_p=$(sed -n 's/^!set class_password=//p' "$pp_d/$pp_z/.def" | head -n 1)
    case "$pp_p" in ''|'*') pp_p=0 ;; *) pp_p=1 ;; esac
    printf '<li data-t="%s" data-z="%s" data-r="%s" data-n="%s" data-s="%s" data-p="%s" data-g="%s">%s</li>\n' \
      "${pp_t%%:*}" "$pp_z" "$pp_r" "${pp_n:-0}" "$pp_s" "$pp_p" "$(pp_g "$pp_z" "$pp_r")" "$(printf '%s' "$pp_titre" | pp_net)"
  done < "$pp_f"
done
exit 0
