# Nova — thème WIMS

Thème pour WIMS 4.32, dérivé de `standard` : sobre et lumineux, adapté au téléphone.
Nombreuses modifications de l'interface pour améliorer la clarté et la lisibilité.
Pour les élèves : ludification de WIMS (badges, avatars, couleur personnalisée...)
Pour les profs : suivi des élèves en direct, menu personnalisable, réglahes centralisés.
. Installation : voir `INSTALLER.md`.

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
  — new, next — devient Qk, une réponse — reply — Rk ; dans un exercice à étapes ou une course, chaque
  réponse intermédiaire affiche la question suivante et la dernière l'analyse de toutes : Q1 … Q10
  R1-10 ; lu par `tail.phtml` sur la page « Détails des examens », seule à avoir accès aux journaux,
  et transmis par le navigateur), pas de chronomètre ni de « Temps écoulé » dans cette fenêtre, la
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

## Mon activité (page des élèves)

Le lien « Mon activité » du menu des élèves mène à une page Nova simple (au lieu des graphiques de WIMS, toujours
accessibles par un lien en bas de page) : trois cartes, pour des élèves de 11 à 18 ans.

- **Ma régularité** : jours de travail de la semaine (lundi-dimanche), un rond par jour ; un jour compte quand
  l'élève y envoie au moins une réponse (comme le badge Régularité). Sous le seuil
  d'encouragement, un message et le bouton « Faire un exercice » ; entre le seuil et l'objectif, « C'est bien,
  encore N jours » ; objectif atteint, « Bravo ». Pendant les vacances, pas d'objectif.
- **Mon temps de travail** : durée de la semaine, barre avec un repère au seuil de pause ; au-delà, invitation à
  faire des pauses. Sessions comptées par WIMS chaque nuit (`log/ccaccount`, pauses de plus de 15 min non comptées).
- **Mes dernières notes** : les N dernières notes des feuilles (pas des examens), carré coloré, exercice, jour.

Réglages (page Apparence du site, d'un portail ou groupement, d'une classe) : `--nova-activite` (oui/non),
`--nova-activite-seuil` (2 jours), `--nova-activite-objectif` (3 jours, au moins le seuil), `--nova-activite-heures`
(6 h par semaine), `--nova-activite-notes` (5), `--nova-vacances` (vacances : `zone-a`, `zone-b`, `zone-c`, périodes
`AAAAMMJJ-AAAAMMJJ` ou `aucune` ; dans une classe ou une zone, absent = celles du portail ou du groupement). Les dates
des zones A, B et C sont livrées avec Nova (`_procs/vacances-zones.txt`, jeu de données officiel « Calendrier
scolaire » de data.education.gouv.fr) : Nova prend celles de l'année scolaire en cours, sans rien à refaire d'une année
sur l'autre. Le fichier est mis à jour par `maj-vacances.py` (dépôt seulement) avant une livraison ; une année absente
est signalée sur la page Apparence. Implémentation : `_widgets/activite*.phtml`, `_procs/activite.awk`,
`_css/activite.css`, nova.js `activiteLien`. « Menus comme le thème standard » garde la page de WIMS.

## Badges des élèves

Activés par l'interrupteur « Badges des élèves » de la page Apparence (site, portail ou groupement, classe) ;
désactivés par défaut. Chez l'élève : une pastille « Badges » à côté de « Mes notes » (une icône par badge, grise
sans niveau), une annonce à chaque nouveau niveau, une fenêtre à onglets. 8 niveaux par badge (Papier à
Cosmique), jamais perdus. Réglages dans la rubrique « Badges Nova » de la configuration :

- **Régularité** (ex-Fidélité ; clés `fidelite`) : une semaine compte quand l'élève y envoie au moins une réponse
  sur `--nova-fidelite-jours` jours différents (1, de 1 à 7) ; paliers en semaines comptées (`2 4 6 9 12 16 20 25`),
  pas forcément d'affilée : une semaine sans travail ne fait rien perdre, une semaine de vacances travaillée compte.
- **Persévérance** : un exercice compte (une fois) quand l'élève y obtient au moins `--nova-perseverance-reussite`
  (7/10) après au moins `--nova-perseverance-echecs` (2) notes sous `--nova-perseverance-echec` (5/10) ; examens
  compris par défaut (`--nova-perseverance-examens`) ; paliers `1 3 5 10 15 20 25 30`.
- **Échauffement** (« DM WIMS » : un examen d'entraînement à beaucoup d'essais et un examen noté au même contenu, à
  peu d'essais) : un DM compte quand l'élève a fait au moins `--nova-echauffement-sessions` (2) sessions de
  l'entraînement complètes (une réponse à chaque exercice de l'examen) avant d'ouvrir le DM noté ; paliers `1 3 5 8 12 16 21 26`. Les deux
  examens sont reconnus par leur contenu (mêmes exercices et paniers, seuls à l'avoir : le plus d'essais = entraînement),
  sinon par leur titre : un mot de `--nova-echauffement-entrainement` ou de `--nova-echauffement-note` (« note, test,
  graded »), le reste du titre identique (« DMWIMS 02 (entraînement) » / « DMWIMS 02 (noté) »), accents et majuscules
  ignorés. La fenêtre rappelle le prochain DM noté ouvert et les sessions qui manquent.
- **Au top** (DM WIMS réussis, images `img/badges/etoile`) : un DM compte quand la note retenue de son examen noté
  (meilleure session, calculée par WIMS) atteint `--nova-top-seuil` (9/10) ; paliers `--nova-top-paliers`
  (`1 3 5 8 12 16 21 26`). DM notés repérés comme pour Échauffement, plus les examens dont le titre porte un mot de
  `--nova-echauffement-note` sans entraînement trouvé (un examen « Test : … » compte donc). La fenêtre donne la note du
  DM noté ouvert le plus récent.

**Couleur personnelle** (récompense) : à partir d'un niveau d'un badge (`--nova-couleur-badge`, Régularité par défaut ;
`--nova-couleur-niveau`, Bois par défaut ; « aucun » coupe), l'élève choisit la couleur de son interface dans une palette
de 10 teintes lisibles (texte blanc, contraste ≥ 3,5:1), dans la fenêtre « Ma couleur » du menu Profil (pastille « nouveau »
quand une récompense vient d'être débloquée). À un niveau plus élevé du même badge (`--nova-couleur-degrade`, Fer par
défaut), 8 dégradés pré-établis (≥ 3,8:1) : barre du haut, boutons principaux, titres des fenêtres, onglet actif, note
retenue, barres de progression, retour en haut ; sa première couleur sert d'accent (`_css/couleur.css`). Réglages dans « Badges Nova ». Le choix
vaut pour toute la classe, le groupement ou le portail, examens compris : `log/classes/<structure ou
classe>/.nova_couleur_<login>`, recopié dans le navigateur pour être posé avant l'affichage de chaque page.

Calcul côté serveur (`_procs/badges.awk`, sur l'accueil de l'élève) ; niveaux gardés dans `score/<élève>.nova`.

Portail ou groupement : les réglages d'une zone l'emportent sur ceux de la structure. Pour les recopier dans les zones :
« Zones dépendantes » de la configuration, cases « Apparence du thème Nova » et « Badges Nova » (séparées). Les pages
Apparence et Badges Nova de la structure signalent les zones dont les réglages diffèrent et proposent de les mettre à jour.
Images : `img/badges/<dossier>/` (WebP) : `regularite/coeur_0N`, `perseverance/flamme_0N`, `entrainement/halteres_0N`.

**Avatar des élèves** (`--nova-avatar: oui`, page Badges Nova, bloc « Avatar des élèves » ; coupé par défaut) : entrée
« Mon avatar » du menu Profil (page de l'accueil, `nova_avatar=1`) ; l'avatar enregistré s'affiche à droite de la
barre, sauf en examen, après le compteur de jetons (pièce au logo de WIMS ; nombre recalculé sur l'accueil et la page
d'une feuille, animé quand il augmente). Avataaars de DiceBear, dessinés dans le navigateur par `js/avatar.js` (construit, voir
`js/avatar.LISEZMOI.txt`). Pièces (« jetons » dans le code et les réglages) : un exercice compte quand sa note atteint `--nova-avatar-seuil` (7/10), la réponse
arrivant au moins `--nova-avatar-secondes` (15) après l'ouverture de l'exercice, une fois par jour et par exercice, au
plus `--nova-avatar-max-jour` (10) par jour ; `--nova-avatar-depart` (1) jeton offert au départ, puis un jeton par palier de `--nova-avatar-paliers` (`3 10 20 30 40`), puis un
tous les `--nova-avatar-pas` (10). Éléments (`_procs/avatar-catalogue.txt`) : libres, à 1 ou 2 jetons, ou récompenses
des badges (niveaux fixés dans le catalogue ; masqués quand leur badge n'est pas activé), dont six fonds en dégradé ;
fond transparent par défaut. Tout est compté et vérifié sur le serveur (`_procs/avatar.awk`), dans
toutes les zones de la structure ; choix et achats gardés dans `log/classes/<structure ou classe>/.nova_avatar_<login>`.
Seuls l'élève et ses enseignants (suivi en salle, devant son nom) le voient.

## Suivi en direct (salle informatique)

L’entrée **Suivi en direct**, dans la rubrique **Participants** du menu latéral professeur/admin,
ouvre une page de suivi en
lecture seule. Un enseignant de portail connecté avec son identifiant n'y voit que ses zones
supervisées ; un administrateur voit sa structure et ses descendants. Aucun identifiant de session
élève, adresse IP, mot de passe ni réponse saisie n'est envoyé au navigateur de l'enseignant.

- Une seule liste, groupée du plus urgent au plus calme : **À aller voir** (difficulté possible,
  temps long), **Répétition**, **Au travail**, **Sans action**. Les compteurs en tête servent de
  filtres ; recherche par nom, choix de la classe ou du cours quand il y en a plusieurs. Une ligne :
  situation, élève (et la raison du signal), exercice en cours, cinq dernières notes, dernière action.
  Les notes sont des carrés colorés d'après les seuils : rouge sous la note de difficulté, vert à
  partir de la note de réussite, jaune entre les deux.
- Vue par défaut : élèves ayant fait une action dans les **60 dernières minutes**. Fenêtre réglable
  de 1 à 120 minutes ; les sessions encore ouvertes hors de cette fenêtre ont leur propre compteur.
- **Difficulté possible** : au moins 3 résultats < 5/10 parmi les 5 derniers sur l'exercice ouvert.
- **Répétition après réussite** : au moins 4 nouveaux essais après 3 résultats >= 9/10 sur cet exercice.
- **Temps long, à vérifier** : exercice ouvert depuis 8 minutes sans résultat enregistré sur ce
  dernier essai. Ce signal ne distingue pas réflexion, difficulté et absence du poste.
- Tous ces critères sont réglables dans la fenêtre **Réglages**, écrits comme des phrases à trous : nombre de résultats examinés,
  nombre de résultats faibles, note de difficulté, nombre de réussites, note de réussite, nombre
  de reprises, délais sans résultat et sans action récente, fenêtre récente et fréquence d'actualisation.
  Les notes acceptent les décimales ; le nombre de résultats faibles reste au plus égal au nombre
  de résultats examinés. Les réglages sont conservés dans le navigateur et un bouton rétablit les
  seuils par défaut. Les signaux sont limités à la fenêtre récente ;
  ils ne sont pas des diagnostics et n'ont aucun effet sur les notes.
- Chronologie par élève, ouverte par la flèche de sa ligne : frise de gauche à droite (liste au
  téléphone), groupée par exercice et passant à la ligne (titre de l'exercice en bulle au survol, au clavier ou
  au clic ; visible au téléphone), 40 derniers événements visibles, notes sur 10, feuilles et examens.
  Un nouvel essai seul n'est pas montré ; deux ou plus à la suite sans note (l'élève relance sans répondre)
  donnent une flèche grise « ↻ ×N », heures en info-bulle. Toute la ligne de l'élève ouvre et ferme la chronologie.
  Les réponses non comptabilisées sont incluses si WIMS les journalise. Les activités hors feuille
  ou examen restent visibles mais ne reçoivent pas de signal fondé sur leurs résultats.
- Actualisation toutes les 30 secondes par défaut (réglable de 10 à 300 secondes), sans recharger la page. Suspendue dans un onglet caché,
  pendant la lecture d'une chronologie ou la saisie d'un filtre. En cas d'échec, le dernier relevé
  reste visible avec un message et son heure ; il n'est pas présenté comme un relevé neuf.

Une action récente correspond à une requête WIMS, pas à un mouvement de souris. Une session ouverte
peut appartenir à un élève absent ; **sans action récente ne signifie pas déconnecté** (délai de
5 minutes par défaut, réglable).
Les élèves sans action récente restent dans la vue de séance pour permettre au professeur d'aller
les voir. L'historique concerne la zone de travail actuellement retenue, pas toutes les anciennes
classes de l'élève. Il ne s'agit pas d'un historique annuel ni d'un tableau de notes retenues.

Le menu reste présent sur la page de suivi. L’entrée est visible par défaut dans le menu simplifié,
y compris après une ancienne personnalisation, puis peut être masquée comme les autres entrées.

Implémentation : `local.phtml` (point d’accroche natif des menus WIMS), `_widgets/suivi*.phtml`, `_procs/suivi.pl` (Perl et ses modules standard, déjà
présents dans WIMS), `js/suivi.js`, `_css/suivi.css`. Le serveur vérifie les droits depuis la session
WIMS authentifiée, sans accepter de classe cible fournie par le navigateur. Il lit les sessions et
les journaux `score/` et `noscore/`, dédoublonne leurs événements et ignore les sessions expirées et
les enseignants. Un relevé temporaire est écrit uniquement dans la session du professeur, puis
remplacé à chaque actualisation : aucune donnée de classe ou d'élève n'est modifiée. L'historique
est borné pour garder un relevé compatible avec WIMS ; un historique raccourci est signalé.

Vérification locale : `python3 suivi-fixtures.py`, `node suivi-test.mjs`,
`node suivi-signaux-test.mjs` depuis `../../banc-nova`. Le premier teste les droits et une charge de
30 élèves sur des fichiers isolés ; les autres vérifient les accès réels et les signaux simulés.
`node suivi-seuils-test.mjs` vérifie les seuils, leurs limites, la mémorisation, la remise aux valeurs
par défaut et la cadence d'actualisation avec un DOM en mémoire, sans navigateur ni accès à WIMS.

## Organisation

| Fichier | Rôle |
|---|---|
| `css.css.template` | liste ordonnée des feuilles concaténées dans `css.css` |
| `construire-css.sh` | construit `css.css` (remplace `mkcss.pl`, sans Java) ; `--lisible` pour ne pas minifier |
| `_css/polices.css`, `polices/` | Atkinson Hyperlegible Next et Mono, servies localement (OFL) |
| `img/logo-wims-blanc.svg` | logo de WIMS (blanc) devant « WIMS » dans la barre (`_widgets/headhome.phtml`) |
| `_css/jetons.css` | toutes les couleurs, tailles, espaces ; clair, sombre, et contenu clair en sombre |
| `_css/composants-*.css` | composants partagés avec les modules de WIMS, en huit feuilles dont l'ordre compte (voir `css.css.template`) : `base` (boutons, champs, tableaux), `formulaires` (cartes, réglages), `messages-zones`, `fenetres` (accordéons, dialogues), `connexion-clavier`, `reglages-badges`, `dominos`, `enseignant` (restriction d'accès, liens de connexion, configuration) |
| `_css/cadre.css` | barre du haut, fil d'Ariane, menu latéral (grille sur ordinateur, replié sur téléphone), contextes particuliers |
| `_css/chrono.css` | chronomètre d'examen et ses états |
| `_css/contenu.css` | contenu des modules : onglets, séquences, débordements, contrastes repris |
| `_css/foundation-min.css` | le sous-ensemble de Foundation encore utilisé |
| `_css/base.css` | police et couleurs de page, en dernier |
| `js/nova.js` | tout le JavaScript commun de Nova. **Fichier assemblé** : ne pas le modifier, mais ses sources |
| `js/src/*.js` | sources de `nova.js`, par domaine (`00-commun`, `10-barre-menus`, `20-composants`, `30-examen`, `40-feuilles-notes`, `50-exercice`, `60-eleve`, `61-couleur`, `62-avatar`, `70-enseignant`, `80-reglages`, `99-demarrage`) : morceaux d'une seule fonction englobante, concaténés dans l'ordre des noms |
| `construire-js.sh` | assemble `js/nova.js`, vérifie sa syntaxe, pose son empreinte dans `htmlheader.phtml` (sans conteneur) |
| `verifier.sh` | contrôles avant livraison (assemblage à jour, syntaxe, caractères non ASCII dans le code, feuilles du modèle, encodage des gabarits, textes des langues, chemins `themes/Nova` en dur) ; lancé par `livrer.sh` |
| `_widgets/headmenu.phtml`, `user_links.phtml` | copies des widgets WIMS ; l'entrée `chrono` devient le chronomètre Nova |
| `lang/name.phtml.{fr,en,nl}` | textes propres au thème (**latin-1**) |
| `htmlheader.phtml` | variables `--wims_*` reliées aux jetons, `nova.js` (HTML seulement : lu par le C) |
| `_widgets/accent.phtml` | accent = couleur des barres de la classe, sauf le gris par défaut |
| `VERSION`, `_procs/version.sh`, `_widgets/version.phtml` | numéro de version (choisi à la main dans `VERSION` ; `livrer.sh` y ajoute commit et date), affiché en bas des cartes « Réglages de Nova » |
| `CHANGELOG.md`, `nouveautes.html` | nouveautés de chaque version ; la page (ouverte par le numéro de version, nouvel onglet) affiche `CHANGELOG.md` |

Après toute modification de `_css/` : `./construire-css.sh`. Après toute modification de `js/src/` : `./construire-js.sh`.

## Points de surcharge d'un thème WIMS (vérifiés dans 4.32)

- Les fichiers `header`, `tail`, `visitor`, `user`, `supervisor`, `docheader`, `doctail`,
  `mhelpheader`… du thème sont appelés par `html/themes.phtml` ; `htmlheader.phtml` et `css.css`
  sont lus par le code C. Il n'y a **pas** de surcharge générale de `html/*.phtml`.
- Un thème peut lire **ses propres copies de widgets** (`!read themes/$wims_theme/_widgets/…` : Nova ne cite jamais son propre nom de dossier).
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
Le paquet `js/avatar.js` contient DiceBear (licence MIT) et les dessins **Avataaars by Pablo Stanley via
DiceBear** (« Free for personal and commercial use », https://avataaars.com/) ; textes complets dans
`js/avatar.LISEZMOI.txt`.
