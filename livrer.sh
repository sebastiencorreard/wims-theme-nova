#!/bin/sh
# Produit une archive de Nova prête à déposer dans public_html/themes/ d'un serveur WIMS.
#   ./livrer.sh            → ../../livraisons/nova-<date>-<commit>.tgz
#
# L'archive contient le thème servi (gabarits, widgets, procédures, langues, js, polices, css.css
# minifié), les sources CSS (_css/, css.css.template : themes/mkcss.pl de WIMS reconstruit le css.css
# de tous les thèmes et en a besoin) et les licences ; INSTALLER.md et ORIGINES.sha256 sont déposés
# à côté (<nom>.INSTALLER.md, <nom>.ORIGINES.sha256). Elle exclut l'historique git et construire-css.sh /
# livrer.sh, qui dépendent du conteneur de développement.
# Refuse de livrer un dépôt modifié et non versionné : l'archive doit correspondre à un commit.
set -e
cd "$(dirname "$0")"
[ -z "$(git status --porcelain)" ] || { echo "Dépôt Nova modifié : versionner avant de livrer." >&2; git status --short >&2; exit 1; }

./construire-css.sh
[ -z "$(git status --porcelain)" ] || { echo "css.css n'était pas à jour : il vient d'être reconstruit, versionner puis relancer." >&2; exit 1; }

commit=$(git rev-parse --short HEAD)
nom="nova-$(date +%Y-%m-%d)-$commit"
sortie=../../livraisons
mkdir -p "$sortie"
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
mkdir "$tmp/Nova"
git archive HEAD | tar -x -C "$tmp/Nova" --exclude=construire-css.sh --exclude=livrer.sh
# Rien que le thème (demande de l'utilisateur, 2026-10-08) : ni documentation, ni fichiers d'installation, ni
# exemple de Standard, ni images inutilisées. Restent les licences (GPL, OFL des polices) et les sources CSS (mkcss.pl).
rm -f "$tmp/Nova/LISEZMOI.md" "$tmp/Nova/INSTALLER.md" "$tmp/Nova/ORIGINES.sha256" "$tmp/Nova/local.phtml.template"
rm -f "$tmp/Nova"/img/badges/*.png
tar -czf "$sortie/$nom.tgz" -C "$tmp" Nova
# Installation : à côté de l'archive, pas dedans.
cp INSTALLER.md "$sortie/$nom.INSTALLER.md"
cp ORIGINES.sha256 "$sortie/$nom.ORIGINES.sha256"
echo "Livraison : $(cd "$sortie" && pwd)/$nom.tgz ($(du -h "$sortie/$nom.tgz" | cut -f1), commit $commit)"
tar -tzf "$sortie/$nom.tgz" | sed 's|^Nova/||' | grep -v '/$' | awk -F/ '{print ($2 ? $1"/" : $1)}' | sort | uniq -c | sort -rn | head -20
