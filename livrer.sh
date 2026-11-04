#!/bin/sh
# Produit une archive de Nova prête à déposer dans public_html/themes/ d'un serveur WIMS.
#   ./livrer.sh            → ../../livraisons/nova-<date>-<commit>.tgz, puis supprime les archives précédentes :
#                            le dossier ne garde que la dernière version (demande de l'utilisateur, 2026-10-08)
#   ./livrer.sh <commit>   → reconstruit l'archive d'une ancienne version publiée (css.css versionné repris tel
#                            quel, sans conteneur) ; n'efface rien
#   DOSSIER=Nova_1_2 ./livrer.sh [<commit>]
#                          → même archive, dossier du thème nommé autrement (deux versions côte à côte sur un
#                            serveur, depuis le 2026-11-04) ; n'efface pas les archives de Nova. Pas de point dans le
#                            nom : WIMS ne chargerait pas le css.css du thème (src/config.c).
#
# L'archive contient le thème servi (gabarits, widgets, procédures, langues, js, polices, css.css
# minifié), les sources CSS (_css/, css.css.template : themes/mkcss.pl de WIMS reconstruit le css.css
# de tous les thèmes et en a besoin), les licences, la documentation, ORIGINES.sha256 et VERSION.
# Elle exclut l'historique git et construire-css.sh / livrer.sh, qui dépendent du conteneur de
# développement, ainsi que l'exemple local.phtml.template de Standard et les badges PNG inutilisés.
# Sans argument, refuse de livrer un dépôt modifié et non versionné : l'archive doit correspondre à un commit.
set -e
cd "$(dirname "$0")"
DOSSIER=${DOSSIER:-Nova}
case "$DOSSIER" in
  *[!A-Za-z0-9_-]*|'') echo "Nom de dossier refusé : $DOSSIER (lettres, chiffres, _ et - seulement ; WIMS refuse le point)." >&2; exit 1 ;;
esac
sortie=../../livraisons
if [ -n "$1" ]; then
  commit=$(git rev-parse --short "$1^{commit}") || { echo "Commit inconnu : $1" >&2; exit 1; }
  date=$(git log -1 --format=%cd --date=format:%Y-%m-%d "$commit")
else
  [ -z "$(git status --porcelain)" ] || { echo "Dépôt Nova modifié : versionner avant de livrer." >&2; git status --short >&2; exit 1; }
  ./construire-css.sh
  [ -z "$(git status --porcelain)" ] || { echo "css.css n'était pas à jour : il vient d'être reconstruit, versionner puis relancer." >&2; exit 1; }
  commit=$(git rev-parse --short HEAD)
  date=$(date +%Y-%m-%d)
fi
prefixe=$(printf '%s' "$DOSSIER" | tr 'A-Z' 'a-z')
nom="$prefixe-$date-$commit"
mkdir -p "$sortie"
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
mkdir "$tmp/$DOSSIER"
git archive "$commit" | tar -x -C "$tmp/$DOSSIER" --exclude=construire-css.sh --exclude=livrer.sh
printf '%s\n' "$commit" > "$tmp/$DOSSIER/VERSION"
# Ni exemple de Standard, ni images inutilisées : badges PNG (seuls les WebP sont affichés ; 2026-10-08), badges
# pas encore codés (dossier img/badges/etoile, 2026-10-09 : à retirer de cette liste quand il servira).
rm -f "$tmp/$DOSSIER/local.phtml.template" "$tmp/$DOSSIER"/img/badges/*.png "$tmp/$DOSSIER"/img/badges/*/*.png
rm -rf "$tmp/$DOSSIER/img/badges/etoile"
tar -czf "$sortie/$nom.tgz" -C "$tmp" "$DOSSIER"
echo "Livraison : $(cd "$sortie" && pwd)/$nom.tgz ($(du -h "$sortie/$nom.tgz" | cut -f1), commit $commit)"
# Dernière version seulement : les archives précédentes partent (chacune se reconstruit par ./livrer.sh <commit>).
if [ -z "$1" ]; then
  for f in "$sortie"/"$prefixe"-*.tgz; do
    [ "$f" = "$sortie/$nom.tgz" ] || rm -f "$f"
  done
fi
tar -tzf "$sortie/$nom.tgz" | sed "s|^$DOSSIER/||" | grep -v '/$' | awk -F/ '{print ($2 ? $1"/" : $1)}' | sort | uniq -c | sort -rn | head -20
