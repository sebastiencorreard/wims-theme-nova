#!/bin/sh
# Produit une archive de Nova prête à déposer dans public_html/themes/ d'un serveur WIMS.
#   ./livrer.sh            → ../../livraisons/nova-<date>-<commit>.tgz, puis supprime les archives précédentes :
#                            le dossier ne garde que la dernière version (demande de l'utilisateur, 2026-10-08)
#   ./livrer.sh <commit>   → reconstruit l'archive d'une ancienne version publiée (css.css versionné repris tel
#                            quel, sans conteneur) ; n'efface rien
#
# L'archive contient le thème servi (gabarits, widgets, procédures, langues, js, polices, css.css
# minifié), les sources CSS (_css/, css.css.template : themes/mkcss.pl de WIMS reconstruit le css.css
# de tous les thèmes et en a besoin), les licences, la documentation, ORIGINES.sha256 et VERSION.
# Elle exclut l'historique git et construire-css.sh / livrer.sh, qui dépendent du conteneur de
# développement, ainsi que l'exemple local.phtml.template de Standard et les badges PNG inutilisés.
# Sans argument, refuse de livrer un dépôt modifié et non versionné : l'archive doit correspondre à un commit.
set -e
cd "$(dirname "$0")"
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
nom="nova-$date-$commit"
mkdir -p "$sortie"
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
mkdir "$tmp/Nova"
git archive "$commit" | tar -x -C "$tmp/Nova" --exclude=construire-css.sh --exclude=livrer.sh
printf '%s\n' "$commit" > "$tmp/Nova/VERSION"
# Ni exemple de Standard, ni images inutilisées (badges PNG : seuls les WebP sont affichés ; 2026-10-08).
rm -f "$tmp/Nova/local.phtml.template" "$tmp/Nova"/img/badges/*.png
tar -czf "$sortie/$nom.tgz" -C "$tmp" Nova
echo "Livraison : $(cd "$sortie" && pwd)/$nom.tgz ($(du -h "$sortie/$nom.tgz" | cut -f1), commit $commit)"
# Dernière version seulement : les archives précédentes partent (chacune se reconstruit par ./livrer.sh <commit>).
if [ -z "$1" ]; then
  for f in "$sortie"/nova-*.tgz; do
    [ "$f" = "$sortie/$nom.tgz" ] || rm -f "$f"
  done
fi
tar -tzf "$sortie/$nom.tgz" | sed 's|^Nova/||' | grep -v '/$' | awk -F/ '{print ($2 ? $1"/" : $1)}' | sort | uniq -c | sort -rn | head -20
