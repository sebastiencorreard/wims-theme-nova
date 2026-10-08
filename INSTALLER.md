# Installer Nova sur un serveur WIMS

Nova a été écrit et vérifié pour **WIMS 4.32**. Il remplace la présentation, pas les fonctions :
retirer le thème rend le serveur tel qu'il était.

## 1. Vérifier la compatibilité

Nova contient des copies adaptées de quelques fichiers de WIMS (widgets de la barre du haut,
procédure du menu enseignant, gabarits de Standard). Avant d'installer sur une autre version :

```sh
cd /home/wims/public_html/themes          # racine WIMS du serveur
tar -xzf /chemin/nova-AAAA-MM-JJ-xxxxxxx.tgz Nova/ORIGINES.sha256
grep -v '^#' Nova/ORIGINES.sha256 | sha256sum -c
```

Tout à « OK » : les originaux n'ont pas changé, installer. Une ligne « ÉCHEC » : WIMS a modifié ce
fichier depuis la 4.32 ; comparer l'original avec la copie de Nova et reporter la modification avant
d'installer (sinon une fonction ajoutée par WIMS pourrait manquer à Nova).

## 2. Installer

```sh
cd /home/wims/public_html/themes
tar -xzf /chemin/nova-AAAA-MM-JJ-xxxxxxx.tgz      # crée themes/Nova
chown -R wims:wims Nova                            # le compte qui fait tourner WIMS
```

Le dossier doit s'appeler exactement `Nova` : ses gabarits citent leur propre chemin
(`themes/Nova/_widgets/…`, `html/themes/Nova/js/nova.js`). Ne pas le renommer.

Le thème apparaît aussitôt dans les listes de choix (WIMS cherche les dossiers qui contiennent un
`visitor.phtml`). Aucune recompilation, aucun redémarrage.

## 3. Activer

- **Pour une classe** : depuis le compte enseignant : Config / Maintenance → Présentation → thème `Nova`. Dans un
  groupement ou un portail, chaque classe, niveau ou cours a son propre réglage. On peut utiliser le thème à la
  racine, puis le propager partout en utilisant "Répercuter les configurations aux classes dépendantes" et en
  cochant "Thème" (et éventuellement "Couleurs")
- **Pour tout le site** : maintenance du site (`module=adm/manage`) → Configuration → thème par
  défaut : `Nova`. Vaut pour les visiteurs et pour les classes qui n'ont pas choisi de thème.

L'accent de Nova suit la « couleur de fond des menus » du site ou de la classe ; si elle est restée au gris
par défaut de WIMS, Nova prend sa prune.

## 4. Vérifier

- Une page de classe charge `html/themes/Nova/css.css` (outils de développement du navigateur).
- Le menu de la classe est à gauche sur ordinateur, replié derrière ☰ sur téléphone.
- Dans le menu enseignant ou administrateur, Participants → Suivi en direct ouvre le relevé ;
  il n'apparaît pas chez un élève.
- Un examen montre le chronomètre Nova (libellé « Temps restant », heure de fin).
- Chez un élève, « Mon activité » ouvre la page Nova (régularité, temps de travail, dernières notes) ; la carte
  Nova de la page Apparence (site ou classe) propose ses réglages et les rubriques masquées aux élèves.
- Les navigateurs gardent l'ancien `css.css` en cache (son adresse porte `?ver=<version de WIMS>`,
  inchangée par une mise à jour du thème) : forcer le rechargement (Ctrl+Maj+R) après une mise à jour.

## 5. Revenir en arrière

Remettre `standard` (ou l'ancien thème) dans la configuration du site et des classes concernées,
puis, si l'on veut, supprimer `themes/Nova`. Une classe dont le thème n'existe plus retombe sur le
thème par défaut du site.

## Mettre à jour Nova

Remplacer le dossier par la nouvelle archive (mêmes commandes qu'à l'étape 2), puis forcer le
rechargement des navigateurs. Les réglages de thème des classes ne changent pas.

## Bon à savoir

- Pas de mode sombre : Nova reste clair quel que soit le réglage de l'appareil (les règles sombres de `jetons.css`
  ne s'appliquent que si `htmlheader.phtml` pose `<meta name="nova-sombre">`, ce qu'il ne fait pas).
- Les textes propres à Nova sont en français et en anglais (`lang/`). Le néerlandais ne couvre que les textes
  anciens (barre, connexion) : les pages récentes (« Mon activité », réglages de la page Apparence…) y seraient
  sans texte. Les fichiers de `lang/` sont en latin-1.
- Programmes externes utilisés côté serveur, présents dans une installation WIMS ordinaire : `awk`, `perl`
  (modules standard), `sh`, `find`, `sed`.
- Si un administrateur lance `themes/mkcss.pl`, le `css.css` de Nova est reconstruit à partir de
  `css.css.template` et de `_css/` : c'est prévu, les sources sont livrées.
