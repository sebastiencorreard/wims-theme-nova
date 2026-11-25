#!/bin/sh
# Nova : participants d'une classe ou d'une zone, pour la liste des eleves du « Detail des examens » (2026-11-25,
# _widgets/eleves-liste.phtml, nova.js examensDetail). Ordre de .userlist, celui de « Part. precedent / suivant »
# (scripts/adm/class/getnextuser). Une ligne <li> par eleve : data-login (caracteres surs seulement), texte
# « Prenom Nom » echappe pour le HTML. 450 eleves au plus (sortie d'un !sh limitee a 45 000 octets).
# Usage : eleves-liste.sh <wims_home> <classe ou zone, chiffres et / seulement>
el_f="$1/log/classes/$2/.userlist"
test -r "$el_f" || exit 0
sed -n 's/^://p' "$el_f" | head -n 450 | while IFS=, read -r el_nom el_prenom el_login el_reste; do
  el_l=$(printf '%s' "$el_login" | tr -cd 'A-Za-z0-9_.@-')
  test -n "$el_l" || continue
  el_t=$(printf '%s %s' "$el_prenom" "$el_nom" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g; s/\$/\&#36;/g; s/!/\&#33;/g')
  printf '<li data-login="%s">%s</li>\n' "$el_l" "$el_t"
done
exit 0
