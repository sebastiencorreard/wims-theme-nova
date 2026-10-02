# Nova — thème WIMS

Thème pour WIMS 4.32, dérivé de `standard` : sobre et lumineux, adapté au téléphone, chronomètre
d'examen lisible. Installation : voir `INSTALLER.md`.

## Principes

- **Le HTML de WIMS n'est pas touché.** Les liens et formulaires (les fonctions) viennent des
  modules et des widgets ; Nova les *dispose* (CSS) et ajoute ce qui manque (JS sans dépendance).
- **Exception voulue (2026-10-01)** : le menu du compte des **élèves** ne montre que leur nom et la
  déconnexion (ou « Terminer » en examen) ; compte, mot de passe, préférences et CGU leur sont cachés
  pour le moment (`_widgets/user_links.phtml`, une condition à retirer). Le banc compte ces liens comme
  écarts voulus (`banc-nova/ecarts-voulus.json`).
- **Menu enseignant simplifié (2026-10-02)**, comme le thème Pion mais sans modifier WIMS : à
  l'accueil d'une classe, l'enseignant ne voit d'abord que Nouvelle feuille, Nouvel examen, Vue des
  participants, Notes, Message du jour, Config, Modtool ; « Menu complet » rend le reste.
  **Personnalisable** : « Choisir les entrées du menu » affiche toutes les entrées avec un œil ; un
  clic sur la ligne ou sur l'œil la cache ou la montre, l'œil d'un titre agit sur toute la famille,
  « Revenir au menu par défaut » rétablit la liste de départ (`js/nova.js`, `menuPersonnel`).
  Le serveur envoie **toujours le menu complet** ; le navigateur en masque une partie. La règle est
  écrite dès l'en-tête par le script de `htmlheader.phtml` (liste par défaut `window.novaMenu.defaut`,
  `<style id="nova-menu-style">`), avant l'affichage : aucune entrée n'apparaît un instant. Choix gardés
  dans `localStorage` (par navigateur) : `nova_menu` (simple ou complet), `nova_menu_garde` (classes
  des entrées gardées). Sans JavaScript, menu complet. Pourquoi pas côté serveur : WIMS fige
  les en-têtes du navigateur, cookies compris, dans la session à la connexion (`modules/home/var.auth`),
  et n'offre aucune préférence d'enseignant qu'un thème puisse écrire.
- **Accueil du site (2026-10-02)**, disposition choisie par l'utilisateur : en première ligne l'actualité et les exemples (`_widgets/infos.phtml`), puis « Rechercher une ressource »
  (le formulaire de WIMS, filtres compris ; la carte prend toute la largeur quand ils sont ouverts) et
  « Rechercher une classe » (`_widgets/search_classe.phtml`, d'après Nikaia) côte à côte ; puis
  l'actualité et les exemples côte à côte ; puis « Sur ce site » et une ligne Explorer (taxonomie,
  glossaires, parcourir). Actualité et exemples sont les widgets de WIMS (`_widgets/news.phtml`,
  `examples.phtml`, carrousel Slick), lus par `_widgets/front.phtml` sans l'accordéon « Informations » ;
  ils n'apparaissent que si le gestionnaire a réglé le **module de messages** (Configuration ›
  Apparence, `frontmsg` dans `wims.conf` : un module de `local/data/` avec `data/blocnews` et
  `data/blocexamples`). « Sur ce site » reste `log/front.phtml.<langue>` du gestionnaire s'il existe.
  Au téléphone, une colonne ; le menu du visiteur est dans ☰. Styles : `_css/accueil.css`.
- **Sections repliables du menu de gauche (2026-10-02)** : un clic (ou Entrée, Espace) sur le titre
  d'une famille la replie ou la déplie, chevron à droite ; état gardé par navigateur et par nom de
  section (`localStorage` `nova_menu_replie`). L'accordéon jQuery UI de WIMS reste tenu ouvert ; Nova
  replie par une classe (`js/nova.js`, `sectionsRepliables`).
- **Fil d'Ariane (2026-10-02)** : « Accueil » pour la racine, et plus de « Page d'accueil » devant
  les zones (Portail test › 6e5 › 6e5-Pgm 6e) ; dans un module d'une classe, le lien vers l'accueil
  de la classe porte le nom de la classe. Copie adaptée du widget de WIMS (`_widgets/ariane.phtml`,
  listée dans ORIGINES) ; la barre du haut garde « Page d'accueil ». L'icône de maison du jeu d'icônes
  (Font_Awesome) ne reste que sur la racine (`cadre.css`).
- **Barre du haut : « WIMS » et son logo (2026-10-02)** au lieu d'une maison et de « Page d'accueil »
  (copie adaptée de `_widgets/headhome.phtml`, listée dans ORIGINES ; logo en image, dégradés
  compris). Au téléphone, le logo seul.
- **Vérification d'un exercice d'examen (2026-10-02)** (« Détails des examens », clic sur une note) :
  la barre liste TOUTES les pages, nommées d'après leur type dans le journal de l'élève (une question
  — new, next — devient Qk, une réponse — reply — Rk ; lu par `tail.phtml` sur la page « Détails des
  examens », seule à avoir accès aux journaux, et transmis par le navigateur), la
  courante en évidence, « Fermer » tout à droite ; WIMS n'en montrait que cinq, avec « ... ». Les « … »
  de Nova n'interviennent que si la place manque (pages les plus éloignées de la courante d'abord).
  L'information « élève : exercice, N steps, note » passe en tête de page (`js/nova.js`,
  `pagesExamen`).
- **Onglets** (jQuery UI) soulignés et compacts ; au téléphone, plus de 3 onglets deviennent une liste
  déroulante (`js/nova.js`, `ongletsCompacts`).
- **Barre du haut (2026-10-02)** : pictogramme devant chaque entrée (`--nova-picto`, masques SVG ;
  « back » = croix, ou retour vers la liste dans la fenêtre d'un examen) ; sur écran large, le
  chronomètre ou « Examen en cours » au centre s'il ne chevauche rien (`centrerBarre`), « Retour » et
  « Outils » en pictogrammes seuls quand la place manque ; parcours (examen « course ») : progression
  en bande sous la barre au téléphone.
- **Élèves sans fil d'Ariane (2026-10-02)** : masqué en CSS (marque `#nova-eleve`, header.phtml) ;
  bouton « ← Retour » dans la barre vers le niveau précédent du fil (`retourEleve`, nova.js). Les
  liens du fil restent dans la page. Enseignants et admins gardent le fil.
- **Menu de pied de page** de l'enseignant et des administrateurs (commenté dans Standard 4.32) :
  rétabli dans `supervisor.phtml`, sous la page, masqué sous 1024 px.
- **Une seule couleur d'accent** : `ref_bgcolor` du site ou de la classe ; si elle est restée au
  gris par défaut de WIMS (`#676767`), la prune Nova (`#7A3B69`). Fond, image de fond et couleurs de
  menu de la classe sont ignorés : la lisibilité prime.
- **Feuilles métier de WIMS gardées** (`themes/_css/` : exercices, feuilles, examens, forum…), et
  surchargées par Nova en fin de fichier. Foundation n'est gardé que pour ce que WIMS utilise
  (`_css/foundation-min.css`) ; son JavaScript reste chargé.
- **Mode sombre : désactivé** (2026-10-01, à la demande). Prêt dans `jetons.css` : cadre sombre,
  contenu sur feuille claire (en tout-sombre, 70 pages sur 88 illisibles). Pour le rallumer : voir le
  commentaire en tête de `htmlheader.phtml`.
- **Téléphone** : la barre du haut tient sur une ligne ; ce qui ne tient pas passe dans le menu « ⋯ ».

## Organisation

| Fichier | Rôle |
|---|---|
| `css.css.template` | liste ordonnée des feuilles concaténées dans `css.css` |
| `construire-css.sh` | construit `css.css` (remplace `mkcss.pl`, sans Java) ; `--lisible` pour ne pas minifier |
| `_css/polices.css`, `polices/` | Atkinson Hyperlegible Next et Mono, servies localement (OFL) |
| `img/logo-wims-blanc.svg` | logo de WIMS (blanc) devant « WIMS » dans la barre (`_widgets/headhome.phtml`) |
| `_css/jetons.css` | toutes les couleurs, tailles, espaces ; clair, sombre, et contenu clair en sombre |
| `_css/composants.css` | boutons, champs, tableaux, légendes, messages (couleurs que Standard écrivait dans htmlheader) |
| `_css/cadre.css` | barre du haut, fil d'Ariane, menu latéral (grille sur ordinateur, replié sur téléphone), contextes particuliers |
| `_css/chrono.css` | chronomètre d'examen et ses états |
| `_css/contenu.css` | contenu des modules : onglets, séquences, débordements, contrastes repris |
| `_css/foundation-min.css` | le sous-ensemble de Foundation encore utilisé |
| `_css/base.css` | police et couleurs de page, en dernier |
| `js/nova.js` | bouton du menu sur téléphone ; états du chronomètre, bandeau de fin, « Fin à » |
| `_widgets/headmenu.phtml`, `user_links.phtml` | copies des widgets WIMS ; l'entrée `chrono` devient le chronomètre Nova |
| `lang/name.phtml.{fr,en,nl}` | textes propres au thème (**latin-1**) |
| `htmlheader.phtml` | variables `--wims_*` reliées aux jetons, `nova.js` (HTML seulement : lu par le C) |
| `_widgets/accent.phtml` | accent = couleur des barres de la classe, sauf le gris par défaut |

Après toute modification de `_css/` : `./construire-css.sh`.

## Points de surcharge d'un thème WIMS (vérifiés dans 4.32)

- Les fichiers `header`, `tail`, `visitor`, `user`, `supervisor`, `docheader`, `doctail`,
  `mhelpheader`… du thème sont appelés par `html/themes.phtml` ; `htmlheader.phtml` et `css.css`
  sont lus par le code C. Il n'y a **pas** de surcharge générale de `html/*.phtml`.
- Un thème peut lire **ses propres copies de widgets** (`!read themes/Nova/_widgets/…`).
- Traductions : `lang/<module avec des _>_<script>.<langue>` est lu après le module
  (`scripts/adm/language`, `scripts/adm/class/classlang`), par exemple
  `lang/adm_class_exam_lang_names.phtml.fr`. **Limite** : un module qui relit ses textes lui-même
  écrase la surcharge. C'est le cas de `adm/class/exam` en vue élève (`var.proc`, `job=student` :
  `!read lang/names.phtml.$moduclass_lang`) — le temps restant « (session 0) » et la coquille du
  message du dernier essai (`$name_examenlist[8])`) ne peuvent donc pas être corrigés par le thème.

## Pièges

- **`htmlheader.phtml` est lu par le code C de WIMS, qui remplace les `$variables` mais n'exécute
  AUCUNE commande** (`!if`, `!read`, commentaires `!!`) : elles partent telles quelles dans la page.
  Ce fichier ne contient donc que du HTML, du CSS et des variables ; toute logique (l'accent selon
  la classe) passe par `_widgets/accent.phtml`, lu par les gabarits interprétés.

- Dans un `!if`, `=` est une comparaison : `!if a=b isin $x` ne teste pas « a=b est dans x ».
- `css.css` mélange UTF-8 (feuilles Nova) et latin-1 (feuilles WIMS) et est lu en windows-1252 :
  dans `content:`, écrire les caractères en échappement CSS (`"\203A"`).
- Les gabarits `.phtml` et `lang/` sont envoyés au navigateur en windows-1252 : texte affiché en
  ASCII ou latin-1 ; les commentaires `!!` peuvent contenir n'importe quoi (jamais envoyés).
- Exceptions connues : cibles de glisser-déposer Dynapi (positionnées en absolu par leur script) ;
  pages allégées sans aucune feuille de style (aide de module, taxonomie `job=light`).

## Vérifier

Le banc de test est dans `../../banc-nova` (voir son LISEZMOI) : inventaire de toutes les pages par
rôle, comparaison avec Standard, scénario d'examen, mesures à 390 px et en sombre.

## Licence

Nova reprend et adapte des gabarits et des feuilles de style de WIMS : il est distribué, comme WIMS,
sous la **GNU General Public License, version 2 ou (à votre choix) toute version ultérieure**
(`LICENSE`). Les polices Atkinson Hyperlegible Next et Mono (`polices/`) sont sous **SIL Open Font
License 1.1** (`polices/OFL.txt`).
