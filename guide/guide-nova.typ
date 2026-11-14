// Guide pour modifier et maintenir le thème Nova (WIMS), à destination des humains.
// Compiler depuis la racine du thème (le guide lit les sources pour ses annexes) :
//   typst compile --root . guide/guide-nova.typ guide/guide-nova.pdf
// livrer.sh le compile dans l'archive (si typst est installé) et verifier.sh contrôle qu'il nomme chaque fichier.
//
// revue de structure : 2026-11-14 (première version). Changer cette ligne à chaque revue (@annexe-maintenir) :
// verifier.sh compte les commits depuis la dernière modification de cette ligne.

#let version = read("/VERSION").split("\n").at(0)
#let commit = sys.inputs.at("commit", default: "dépôt de développement")
#let date-livraison = sys.inputs.at("date", default: none)

#set document(title: "Modifier et maintenir Nova", author: "Contributeurs de Nova")
#set text(lang: "fr", font: ("Fira Sans", "Noto Sans", "DejaVu Sans", "Libertinus Serif"), size: 10pt)
#let hydra-titre() = context {
  let t = query(selector(heading.where(level: 1)).before(here()))
  if t.len() > 0 { text(8pt, fill: luma(110), t.last().body) }
}
#set page(paper: "a4", margin: (x: 2cm, top: 2cm, bottom: 2.2cm),
  numbering: "1", number-align: right,
  header: context { if counter(page).get().first() > 1 [#text(8pt, fill: luma(110))[Nova #version · guide du développeur #h(1fr) #hydra-titre()]] })
#set par(justify: true, leading: 0.62em)
#set heading(numbering: "1.1")
#show heading.where(level: 1): it => { pagebreak(weak: true); v(.4em); text(17pt, fill: rgb("#7A3B69"), it); v(.4em) }
#show heading.where(level: 2): it => { v(.6em); text(12pt, it); v(.15em) }
#show heading.where(level: 3): it => text(10.5pt, it)
#show raw: set text(font: ("Source Code Pro", "DejaVu Sans Mono"), size: 8.6pt)
#show raw.where(block: false): box.with(fill: luma(242), inset: (x: 2pt), outset: (y: 2pt), radius: 2pt)
#show raw.where(block: true): block.with(fill: luma(245), inset: 8pt, radius: 4pt, width: 100%)
#show link: set text(fill: rgb("#5f2d52"))
#set table(stroke: 0.5pt + luma(200), inset: 5pt)
#show table: set par(justify: false)
#show table.cell.where(y: 0): set text(weight: "bold")

#show ref: it => {
  let el = it.element
  if el != none and el.func() == heading {
    let n = counter(heading).at(el.location())
    let txt = if el.numbering == none { el.body } else if el.level == 1 and el.numbering == "A.1" { [annexe #numbering("A", ..n)] } else if el.level == 1 { [chap. #numbering("1", ..n)] } else { [§#numbering(el.numbering, ..n)] }
    link(el.location(), txt)
  } else { it }
}
#let accent = rgb("#7A3B69")
#let encadre(titre, couleur: accent, corps) = block(width: 100%, inset: 8pt, radius: 4pt,
  stroke: (left: 3pt + couleur), fill: couleur.lighten(92%))[#set par(justify: false); #text(weight: "bold", fill: couleur, titre) \ #corps]
#let attention(corps) = encadre("Attention", couleur: rgb("#A3221B"), corps)
#let astuce(corps) = encadre("Astuce", couleur: rgb("#17663B"), corps)
// Recette : où, étapes, vérifier.
#let ou(corps) = [*Où* : #corps]
#let verifier(corps) = [*Vérifier* : #corps]

// ---------------------------------------------------------------- Couverture
#align(center)[
  #v(5cm)
  #text(30pt, weight: "bold", fill: accent)[Modifier et maintenir Nova]
  #v(.3em)
  #text(14pt)[Guide du développeur pour le thème Nova de WIMS]
  #v(1.5cm)
  #text(11pt)[Nova #version · #commit #if date-livraison != none [· #date-livraison]]
  #v(.3em)
  #text(9pt, fill: luma(100))[Thème sous GPL v2 ou ultérieure · polices sous SIL OFL 1.1 \ Dépôt : #link("https://github.com/sebastiencorreard/wims-theme-nova")[`github.com/sebastiencorreard/wims-theme-nova`]]
  #v(2.5cm)
  #block(width: 80%)[#set align(left); #set par(justify: true)
    Ce guide s'adresse à un développeur web de niveau moyen qui doit corriger, adapter ou faire évoluer Nova.
    Il ne demande pas de connaître WIMS à l'avance. Il se lit dans l'ordre la première fois (chapitres 1 à 3,
    une heure), puis se consulte par objectif (@recettes : « je veux… »). Les annexes A à C sont produites
    à partir des sources au moment de la compilation : elles sont toujours à jour.]
]
#pagebreak()

#outline(depth: 2, indent: 1em)

// ================================================================= 0
#heading(numbering: none)[Le guide en une page] <une-page>

#table(columns: (1.15fr, 2fr), align: left,
  [Je veux…], [Fichiers à modifier (puis le chapitre)],
  [changer une couleur, un espacement, la police], [`_css/jetons.css` (@jetons)],
  [changer l'aspect d'un élément de WIMS], [une feuille de `_css/` (table du @css), puis `./construire-css.sh`],
  [ajouter ou corriger un comportement], [un fichier de `js/src/` + son appel dans `99-demarrage.js`, puis `./construire-js.sh` (@js)],
  [ajouter ou traduire un texte], [`lang/*.phtml.fr|en|es|it` (@textes)],
  [faire une action sur le serveur (écrire un fichier, calculer)], [un widget de `_widgets/` lu par `header.phtml`, un script de `_procs/` (@serveur)],
  [ajouter un réglage de Nova (`--nova-…`)], [jetons, cartes Apparence, `80-reglages.js`, `lang/reglages` (@reglage)],
  [permettre de revenir au thème standard], [six listes (@standard)],
  [changer le menu de l'enseignant], [`_procs/menumodubox0.proc`, `local.phtml`, `htmlheader.phtml`, `10-barre-menus.js` (@menu)],
  [changer la barre du haut, le fil d'Ariane, le pied de page], [`_widgets/headmenu|headhome|user_links|ariane|footer.phtml`, `cadre.css` (@barre)],
  [changer un accueil (visiteur, élève, enseignant)], [`visitor|user|supervisor.phtml`, `accueil.css` (@accueils)],
  [toucher aux exercices, examens, feuilles, notes], [`js/src/30` à `50`, `contenu.css`, `chrono.css` (@exercices à @feuilles)],
  [toucher aux badges, avatar, couleur, « Mon activité »], [`_procs/*.awk`, widgets, `js/src/60` à `62` (@recompenses)],
  [toucher aux pages de l'enseignant ou au suivi en direct], [`70-enseignant.js`, `composants-enseignant.css`, `suivi*` (@enseignant, @suivi)],
  [ajouter une icône], [jeu Lucide, `icones/` (@icones)],
  [passer à une nouvelle version de WIMS], [`ORIGINES.sha256` et les copies de WIMS (@wims)],
  [livrer une version], [`./livrer.sh`, `VERSION`, `CHANGELOG.md`, ce guide (@livrer)],
)

#encadre("Les cinq règles qui évitent 90 % des pannes")[
  + *Ne jamais modifier `js/nova.js` ni `css.css`* : ils sont construits. Modifier `js/src/` et `_css/`.
  + *Les fichiers lus par WIMS sont en latin-1* (gabarits, `lang/`) et *servis en windows-1252* : dans le code
    JavaScript, aucun caractère non ASCII hors commentaire (`é`, pas `é`).
  + *Toujours `themes/$wims_theme/…`*, jamais `themes/Nova/…` : le dossier du thème peut être renommé.
  + *Tout ce que Nova change du thème standard dépend d'un réglage « standard »* (@standard), pour qu'un site puisse revenir en arrière.
  + *`./verifier.sh` avant chaque commit* : chacun de ses contrôles vient d'une panne vécue.
]

// ================================================================= 1
= Nova en cinq minutes

== Ce que c'est

Nova est un *thème* pour WIMS 4.32, dérivé du thème `standard` : sobre, lumineux, utilisable au téléphone, sans
rien retirer à aucun rôle (visiteur, élève, enseignant, administrateur de groupement ou de portail, gestionnaire du
site). Il ajoute aussi des fonctions que WIMS n'a pas : badges et avatar des élèves, page « Mon activité », suivi
en direct d'une salle, menu de l'enseignant personnalisable, réglages centralisés.

Un thème WIMS est un dossier de `public_html/themes/`. WIMS y lit des *gabarits* (`.phtml`, un langage de
commandes `!if`, `!read`, `!set`… exécuté sur le serveur) à des points d'accroche fixes, et sert au navigateur sa
feuille `css.css`. Nova ajoute un script, `js/nova.js`.

== Le principe : disposer, pas réécrire

#encadre("Principe fondateur")[
  *Le HTML de WIMS n'est pas touché.* Les liens et formulaires (les fonctions) viennent des modules de WIMS ; Nova
  les *dispose* par le CSS et *ajoute* ce qui manque par le JavaScript (sans bibliothèque). Retirer le thème rend le
  serveur tel qu'il était.
]

Conséquences pratiques :
- un défaut d'affichage se corrige d'abord en CSS ; en JavaScript seulement si le CSS ne peut pas (réordonner,
  regrouper, ajouter un bouton) ;
- une page doit rester utilisable *sans JavaScript* (les transformations ne font que l'améliorer) ;
- quand WIMS change un module, Nova suit en général sans rien faire, parce qu'il repère les éléments par leur
  structure (`.wims_sheet_item`, `#wimsmenumodubox`…) plutôt que par leur texte.

Exceptions voulues, peu nombreuses : quelques widgets de WIMS sont *copiés et adaptés* dans le thème (barre du
haut, fil d'Ariane, menu de l'enseignant ; liste dans `ORIGINES.sha256`, @wims), et quelques textes de modules
sont remplacés par les surcharges de traduction prévues par WIMS (@textes).

== Les trois couches

#table(columns: (auto, 1fr, 1fr), align: left,
  [Couche], [Sources (à modifier)], [Produit (ne pas modifier)],
  [Gabarits, côté serveur], [`*.phtml`, `_widgets/`, `_procs/`, `lang/`], [— (lus tels quels par WIMS)],
  [Styles], [`_css/*.css`, ordre dans `css.css.template`], [`css.css` (par `./construire-css.sh`)],
  [Comportements], [`js/src/*.js`], [`js/nova.js` (par `./construire-js.sh`, réduit par terser)],
)

== Arborescence

#table(columns: (1fr, 1.5fr), align: left,
  [Chemin], [Rôle],
  [`htmlheader.phtml`], [En-tête HTML de chaque page ; scripts de tête (classes posées sur `<html>` avant l'affichage).],
  [`header.phtml`, `tail.phtml`], [Haut et bas de chaque page de module ; `header.phtml` lit les widgets d'action selon le contexte.],
  [`visitor.phtml`, `user.phtml`, `supervisor.phtml`], [Accueils : du site, de l'élève (et de l'enseignant d'une structure), de l'enseignant d'une classe.],
  [`_widgets/`], [Morceaux de gabarit lus par les précédents ; une action serveur = un widget.],
  [`_procs/`], [Procédures WIMS (`.proc`) et scripts (`awk`, `sh`, `perl`) appelés par `!sh`.],
  [`lang/`], [Textes, en latin-1, en quatre langues au moins (fr, en, es, it).],
  [`_css/`], [Feuilles sources ; `css.css.template` fixe leur ordre.],
  [`js/src/`], [Sources de `nova.js`, par domaine (@annexe-js). Autres scripts de `js/` : chargés à la demande.],
  [`icones/`], [Jeu d'icônes Lucide pour WIMS et ses outils de construction.],
  [`img/`, `polices/`, `_avatar/`], [Images (logos, badges), polices (Atkinson Hyperlegible), dessins de l'avatar.],
  [`guide/`], [Ce guide.],
)

// ================================================================= 2
= Mettre en place son poste

== Ce qu'il faut

- Un *WIMS 4.32 de développement* dans Docker (image construite par le `Dockerfile` du projet de développement,
  qui ajoute `imagemagick` et `zip` dont WIMS a besoin), le dossier du thème *monté en lecture seule* dans
  `/home/wims/public_html/themes/Nova`. Le serveur répond sur `http://127.0.0.1:8080/wims`.
- *Node.js* et *terser 5* : `construire-js.sh` le cherche dans `$NOVA_TERSER`, puis dans `../../outils-js/node_modules/.bin`, puis dans le `PATH`
  (`npm install terser@5.36.0` dans un dossier `outils-js` à côté du projet).
- *Python 3* (contrôles, outils d'icônes et d'avatar), *typst* (ce guide), *Playwright* (captures et tests, conseillé).
- Un navigateur avec un mode « téléphone » (390 px de large) : Nova se vérifie toujours aussi au téléphone.

== Les quatre commandes <commandes>

#table(columns: (auto, auto, 1fr), align: left,
  [Commande], [Conteneur ?], [Ce qu'elle fait],
  [`./construire-css.sh`], [oui], [Concatène les feuilles de `css.css.template` (celles de WIMS lues *dans le conteneur*, celles de Nova dans `_css/`), réduit, écrit `css.css` et l'empreinte (`_css/empreinte.css`, meta `nova-css`).],
  [`./construire-js.sh`], [non], [Assemble `js/src/*.js` dans l'ordre des noms, réduit par terser, écrit `js/nova.js` et son empreinte dans `htmlheader.phtml`. `NOVA_JS_LISIBLE=1` : sans réduction, pour déboguer.],
  [`./verifier.sh`], [non], [Contrôles : assemblage à jour, syntaxe, ASCII dans le code, encodages, langues, chemins en dur, couverture de ce guide.],
  [`./livrer.sh`], [oui], [Refuse un dépôt modifié ; lance `verifier.sh` et `construire-css.sh` ; produit `livraisons/nova-<date>-<commit>.tgz` (avec ce guide en PDF).],
)

#attention[Si plusieurs personnes ou outils partagent le même conteneur, posez un verrou avant tout accès
(page web, `docker exec`, `construire-css.sh`, redémarrage) et retirez-le après :
`( set -o noclobber; echo "moi $(date -Is) objet" > /tmp/wims432.verrou )` … `rm -f /tmp/wims432.verrou`.
Si la création échoue, quelqu'un d'autre travaille : attendre.]

== La boucle de travail

+ Modifier les sources (`_css/`, `js/src/`, gabarits, `lang/`).
+ Reconstruire ce qui doit l'être (`./construire-css.sh`, `./construire-js.sh`). Les gabarits et `lang/` n'ont pas
  besoin d'être reconstruits : WIMS les relit à chaque page.
+ Recharger la page. `css.css` a une adresse fixe (`css.css?ver=<version de WIMS>`) : le navigateur peut garder
  l'ancien. Nova le recharge seul quand l'empreinte change (`feuilleAJour`), mais en cas de doute : vider le cache.
+ Regarder à 1280 px *et* à 390 px, en élève *et* en enseignant ; sans JavaScript si la page a été transformée (@chap-verifier).
+ `./verifier.sh`, puis commit (un commit = un changement compréhensible, message en français).
+ Pour une version : `./livrer.sh` (@livrer).

// ================================================================= 3
= Comment WIMS assemble une page Nova

Comprendre cet ordre évite la moitié des surprises : une variable posée trop tard est vide, un script lancé trop tôt
ne trouve pas son élément.

== Côté serveur

#table(columns: (auto, auto, 1fr), align: left,
  [Ordre], [Fichier], [À savoir],
  [1], [`htmlheader.phtml`], [Lu par le programme C de WIMS (`config.c`) : les `$variables` sont remplacées, *aucune commande `!` n'est exécutée* (un `!if` part tel quel dans la page). Toute logique va dans un widget (ex. `_widgets/accent.phtml`). Contient les scripts de tête : classes `nova-js`, `nova-std-<r>`, `nova-menu-simple`, `nova-role-…` posées sur `<html>` avant l'affichage.],
  [2], [`var.proc` du module], [Le module calcule ses variables *avant* le thème : Nova ne peut pas changer ce qu'il a déjà écrit dans ses fichiers d'index.],
  [3], [`lang/name.phtml.<l>`, puis `header.phtml`], [Textes de la barre, puis la barre et les *widgets d'action* : chacun lu sous sa condition (`!if $module=… and $wims_user=…`). Une action ajoutée ici est vue par le gabarit du module.],
  [4], [gabarit du module], [Le contenu (`.wimsbody`) : HTML de WIMS, non modifié.],
  [5], [`tail.phtml`], [Bas de page, menu latéral, widgets de fin (avatars des participants, listes après import…).],
)

Les accueils remplacent 3 à 5 par un gabarit entier : `visitor.phtml` (site), `user.phtml` (élève, et enseignant
d'un portail ou d'un groupement), `supervisor.phtml` (enseignant d'une classe). Autres points d'accroche :
`docheader.phtml`/`doctail.phtml` (documents), `mhelpheader.phtml`/`mhelptail.phtml` (fenêtres d'aide),
`local.phtml` (entrées ajoutées aux menus de WIMS), `table.proc` (renvoie à celle de WIMS).

#attention[Il n'existe *pas* d'autre point d'accroche : pas de surcharge générale de `html/*.phtml`. Les *pages
d'erreur* de WIMS ne lisent aucun fichier du thème (seulement `css.css`) : leur texte n'est pas modifiable.]

=== Le tampon des noms de variables

Chaque page a un tampon de *32 Ko pour les noms* de variables WIMS, partagé entre WIMS, le module (un exercice OEF
en consomme beaucoup) et le thème. Plein, WIMS affiche « variable_name_buffer_overflow ». Nova en utilise déjà
beaucoup sur certaines pages (accueil de l'enseignant, configuration : environ 4 Ko de marge). D'où trois règles :
- les textes destinés à `nova.js` ne sont *pas* des variables (fichiers `-textes`, @textes) ;
- `lang/name.phtml` (lu sur chaque page) ne garde que la barre et le menu : 4 000 octets de noms au plus (contrôlé) ;
- un widget ne lit ses textes que dans la branche qui s'en sert. `!reset` ne libère rien.

== Côté navigateur

+ Scripts de tête de `htmlheader.phtml` : classes sur `<html>`, menu simplifié, réglages « standard » gardés pour la
  session, couleur personnelle. Rien n'est encore affiché.
+ `css.css` du thème, puis *la feuille de la classe* (réglages `--nova-…` de l'enseignant) : chargée *après* les
  scripts de tête, qui ne peuvent donc pas la lire.
+ `js/nova.js`, chargé en différé : `demarrer()` appelle toutes les fonctions (@annexe-js), chacune vérifie si la page
  la concerne et s'arrête sinon. Il s'exécute *avant* `DOMContentLoaded` des scripts de WIMS (TinyMCE, Dynapi) :
  ce qu'ils créent n'existe pas encore (@pieges).

#astuce[Tout ce que `nova.js` remplace s'affiche d'abord tel que WIMS l'écrit, puis change : c'est le
*clignotement*. Le @js donne la recette pour l'éviter.]

// ================================================================= 4
= Recettes : « je veux… » <recettes>

Chaque recette dit *où* travailler, les *étapes*, et comment *vérifier*. Quand une recette ne suffit pas, la
technique la plus sûre est de *suivre un élément voisin qui marche déjà* :
`grep -a -rn "nova-decorations" --exclude=css.css --exclude=nova.js .` montre tous les fichiers qu'un réglage
traverse. (`grep -a` : sans lui, les fichiers latin-1 sont ignorés en silence par certains `grep`.)

== Changer une couleur, un espacement, la police <jetons>

#ou[`_css/jetons.css`, puis `./construire-css.sh`.]

Toute couleur, taille, marge, rayon ou ombre de Nova est une variable `--nova-…` de `jetons.css` : modifier la
variable change tout le thème. N'écrivez jamais une couleur en dur dans une autre feuille.

- *Accent* : une seule couleur, celle du site ou de la classe (`$wims_ref_bgcolor`, posée par
  `_widgets/accent.phtml`) ; si elle est restée au gris par défaut de WIMS (`#676767`), la prune Nova `#7A3B69`.
  Ses nuances (`--nova-accent-doux`, `--nova-lien`…) en sont dérivées par `color-mix`.
- *Notes* : `--nova-note-*` (palette rouge, orange, jaune, vert sur la note /10), reprises par
  `_widgets/couleurs-notes.phtml` pour les tableaux de WIMS.
- *Police* : Atkinson Hyperlegible Next (Mono pour les chiffres), servie par le thème (`_css/polices.css`,
  `polices/`) : aucun appel externe.
- *Espaces* : `--nova-e1` (4 px) à `--nova-e7` (48 px) ; cible tactile `--nova-cible` (44 px).
- *Réglages* : la seconde partie de `jetons.css` (`:where(:root) { … }`) donne les valeurs par défaut des réglages
  (@reglage).

#verifier[contraste du texte sur l'accent (au moins 4,5:1) ; une page d'élève, une page d'enseignant, un exercice.]

== Changer l'aspect d'un élément <css>

#ou[la feuille de `_css/` qui couvre la zone (table ci-dessous, ordre complet en @annexe-css), puis
`./construire-css.sh`.]

#table(columns: (1fr, 1.5fr), align: left,
  [Feuille], [Ce qu'elle couvre],
  [`base.css`], [police, couleurs de page, liens],
  [`cadre.css`], [barre du haut, fil d'Ariane, menu latéral, corps de page, téléphone],
  [`contenu.css`], [ce que les modules mettent dans `.wimsbody` : tableaux, cartes de feuilles, titres, exercices],
  [`composants-base.css`], [boutons, tableaux, légendes, couleurs que WIMS écrivait en dur],
  [`composants-formulaires.css`], [fieldset en cartes, champs, cases, boutons de danger],
  [`composants-messages-zones.css`], [messages, alertes, zones de travail, couleurs de rôle],
  [`composants-fenetres.css`], [accordéons, dialogues, onglets, fenêtres],
  [`composants-connexion-clavier.css`], [pages de connexion, clavier mathématique],
  [`composants-reglages-badges.css`], [cartes « Réglages de Nova », badges],
  [`composants-enseignant.css`], [pages de l'enseignant (configuration, fiches, séquences, export…)],
  [`composants-dominos.css`], [exercices à étiquettes (dominos, tuiles, éléments à associer)],
  [`accueil.css`, `activite.css`, `avatar.css`, `couleur.css`, `chrono.css`, `decorations.css`, `suivi.css`], [une page ou une fonction chacune (leur nom)],
  [`foundation-min.css`], [le peu de Foundation 6 que WIMS utilise encore],
)

Étapes :
+ Trouver la classe de l'élément dans l'inspecteur du navigateur, puis `grep -a -n "<classe>" _css/*.css` pour voir
  qui la touche déjà.
+ Écrire la règle dans la feuille de la zone, *après* les règles de WIMS (les feuilles de WIMS sont chargées avant
  celles de Nova : à spécificité égale, Nova gagne).
+ Si la règle *change le thème standard* (cache, déplace, transforme), la préfixer par le réglage dont elle relève :
  `:where(html:not(.nova-std-listes)) .wims_sheet_item { … }` (@standard). Un simple habillage (couleur, carte) n'en a pas besoin.
+ `./construire-css.sh` ; si la règle semble sans effet : `grep -a "ma-regle" css.css` (elle y est ?), puis la
  spécificité (@pieges, « CSS »).

Conventions : pas d'imbrication CSS (iOS 16) ; préfixer sans changer la priorité par `:where(…)` ; les classes de
Nova commencent par `nova-` (vérifier qu'un nom est libre : `grep -a "\.nova-mon-nom" css.css`) ; une animation
passe sous `html:not(.nova-sans-animation)` (elles sont coupées par défaut).

== Ajouter ou corriger un comportement (JavaScript) <js>

#ou[le fichier de `js/src/` du domaine (@annexe-js), puis `./construire-js.sh` et `./verifier.sh`.]

+ Écrire une fonction dans le fichier du domaine (`40-feuilles-notes.js` pour une feuille, `70-enseignant.js` pour
  une page de l'enseignant…). Elle commence par vérifier que la page la concerne et s'arrête sinon :
  ```js
  function maFonction() {
    var tx = document.getElementById('nova-ma-fonction-textes');   // textes posés par le gabarit
    if (!tx || standard('listes')) return;                          // pas cette page, ou réglage standard
    ...
  }
  ```
+ L'appeler dans `demarrage()` de `js/src/99-demarrage.js`.
+ `./construire-js.sh` puis `./verifier.sh`. Pour déboguer : `NOVA_JS_LISIBLE=1 ./construire-js.sh` (non réduit),
  puis reconstruire normalement avant le commit.

Règles du code :
- *ASCII seulement hors commentaires* : `'é'` au lieu de `é`. Certains outils d'édition écrivent en clair un
  `\uXXXX` qu'on leur donne : `verifier.sh` le détecte ; en Python, construire la barre oblique par `chr(92)`.
- *Pas de texte en dur* : les textes viennent d'attributs `data-*` d'un élément posé par le gabarit (@textes). Textes
  de secours en anglais.
- *Réglages* : `standard('<r>')` pour un réglage « standard » ; `racineStyle('--nova-x')` pour lire un réglage au
  démarrage (ajouter son nom à `VARS_DEMARRAGE` de `00-commun.js`) ; `animationsCoupees()` avant toute animation.
- *Performances* : un `getComputedStyle` ou une mesure après un changement de classe recalcule toute la page (40 à
  60 ms sur un téléphone modeste) : tout lire, calculer, puis tout écrire.
- *Fonctions utiles* de `00-commun.js` : `standard`, `racineStyle`, `texteCss`, `lienSession`, `lienAccueil`,
  `adresseNette`, `messageReporte`, `infobulles`.

=== Éviter le clignotement

Tout ce que `nova.js` transforme s'affiche d'abord tel que WIMS l'écrit. Recette :
```css
/* caché seulement si JavaScript tourne et tant que la fonction n'a pas fini ; révélé au bout de 3 s quoi qu'il arrive */
html.nova-js:not(.nova-ma-fonction-prete) .element-transforme {
  visibility: hidden; animation: nova-revele 0s 3s forwards;
}
```
```js
function maFonction() {
  try { /* transformer */ }
  finally { document.documentElement.classList.add('nova-ma-fonction-prete'); }
}
```
#verifier[la page avec `nova.js` bloqué (outils du navigateur, ou `page.route(/nova\.js/, r => r.abort())` en
Playwright) : elle doit rester complète et utilisable.]

== Ajouter ou traduire un texte <textes>

#ou[`lang/`, en *latin-1*, quatre langues complètes : `fr`, `en`, `es`, `it`. Les autres langues (`.de`, `.nl`…)
commencent par `!read …en` : jamais de texte vide.]

Trois sortes de fichiers :
#table(columns: (1fr, 1.6fr, 1fr), align: left,
  [Fichier], [Contenu], [Lu par],
  [`name.phtml.<l>`], [textes de la barre et du menu, *sur chaque page* (budget de 4 000 octets de noms)], [WIMS, avant `header.phtml`],
  [`eleve`, `enseignant`, `reglages`, `suivi` `.phtml.<l>`], [variables `!set` utilisées par les gabarits eux-mêmes], [`!read themes/$wims_theme/lang/<f>.phtml.$lang` en tête du gabarit qui s'en sert],
  [`<groupe>-textes.phtml.<l>`], [textes *en clair* pour `nova.js` : un élément dont les attributs `data-*` portent les textes, sous une étiquette], [`!read …/<groupe>-textes.phtml.$lang <étiquette>`],
)

Ajouter un texte pour `nova.js` :
```
:feuille
!! qui le lit, pourquoi (date)
<template id="nova-feuille-textes" data-reussi="Réussi" data-points="%1 / %2 points"></template>
!exit
```
dans les quatre fichiers `lang/eleve-textes.phtml.fr|en|es|it` (même étiquette, mêmes attributs : contrôlé), puis
dans le gabarit qui en a besoin : `!read themes/$wims_theme/lang/eleve-textes.phtml.$lang feuille`. Le fichier
commence par `!goto $wims_read_parm` (aller à l'étiquette demandée).

Remplacer un texte d'un *module* de WIMS : `lang/<module, / → _>_<script, / → _>.<l>`, lu après le module
(ex. `lang/adm_class_classes_lang_names.phtml.fr`). Sans effet si le module relit ses textes après.

#attention[Écrire ces fichiers en latin-1 : en Python, `data = s.encode('latin-1')` sur sa propre ligne *avant*
`open(p, 'wb').write(data)` (sinon un caractère impossible vide le fichier). Pas de « — » (absent du latin-1).
Un texte et une variable de travail de même nom s'écrasent : nommer les textes à part.]

== Faire une action côté serveur <serveur>

#ou[un nouveau widget `_widgets/<action>.phtml`, lu par `header.phtml` sous sa condition ; un script de
`_procs/` s'il faut calculer (`awk`, `sh`).]

+ Créer le widget ; en tête, un commentaire `!!` : qui le lit, quand, pourquoi.
+ Dans `header.phtml`, le lire sous la condition la plus étroite :
  ```
  !if $module=adm/class/config and $wims_user=supervisor and $wims_class!=$empty
    !read themes/$wims_theme/_widgets/mon-action.phtml
  !endif
  ```
+ Lire les paramètres de la requête en cours par `!sh printf '%s' "$$QUERY_STRING"` puis `!getopt` (un paramètre
  inconnu du module ne devient pas une variable WIMS).
+ *Filtrer toute valeur venue de l'adresse* avant de s'en servir : `!text select 0123456789 in $x`, ou la comparer à
  une liste (`isitemof`) ; `!bound` avant `!writefile`. WIMS colle les valeurs telles quelles dans une ligne `!sh`.

Où écrire :
- `!writefile wimshome/…` ne marche que depuis un *module de confiance* (accueil `home`, `adm/…`) et *ne crée aucun
  dossier* (échec silencieux) : écrire dans un dossier qui existe.
- Une donnée par élève : `log/classes/<classe>/score/<login>.<suffixe>` (sauvegardée et restaurée avec l'élève).
- Réglages du site : `log/nova.conf` ; d'une classe : bloc `--nova-…` de sa feuille de style (@reglage).
- Un script `.proc` de WIMS se lit par `!readproc`, jamais `!read`.
- Pas de `mktemp` dans un script lancé depuis une page : utiliser un tube.

== Ajouter un réglage de Nova (`--nova-…`) <reglage>

Un réglage est une *variable CSS* : valeur par défaut dans `jetons.css`, surchargée par le site (`log/nova.conf`),
le portail ou groupement, puis la classe (bloc dans la feuille de la classe). Le plus sûr est de copier le chemin d'un
réglage voisin du même type (oui/non : `--nova-decorations` ; nombre : `--nova-activite-seuil`).

+ *Défaut* : `_css/jetons.css`, dans `:where(:root) { … }`, avec un commentaire (qui l'a demandé, quand, effet).
+ *Carte du site* (gestionnaire) : `_widgets/apparence.phtml` (affichage) et `_widgets/reglages-site.phtml`
  (enregistrement dans `log/nova.conf`).
+ *Carte d'une classe, d'un portail, d'un groupement* : `_widgets/apparence-classe.phtml` (le champ, dans l'onglet
  qui convient de « Réglages de Nova ») et `js/src/80-reglages.js`, `reglagesApparence` (liste `cles` ou `nombres`) :
  le JavaScript écrit le bloc `/* Nova : reglages de la page Apparence */ html:root { … }` de la feuille de la classe.
+ *Textes* : `lang/reglages.phtml.<l>` (libellé, aide), quatre langues.
+ *Lecture* : en CSS, la variable elle-même ; en JS, `racineStyle('--nova-x')` (+ `VARS_DEMARRAGE`) ; côté serveur,
  `grep -ao` des déclarations dans les feuilles (voir `_procs/badges.awk`, section `#conf`).
+ *Zones* : la propagation aux zones dépendantes (`_procs/propager.sh`) recopie le bloc entier : rien à faire.

#attention[Une ligne de feuille de classe ne doit jamais *commencer* par « : » (WIMS la prend pour un séparateur
et coupe la feuille). Une valeur accentuée en CSS s'échappe (`"not\e9"`) et se lit par `texteCss`.]

== Permettre de revenir au thème standard <standard>

Chaque transformation de Nova qui *masque, change ou déplace* un élément du thème standard relève d'un réglage
`--nova-std-<r>` (« Rapprocher du thème standard », section repliée des cartes Apparence). Les réglages existants
sont listés en @annexe-std (lus dans `CLES_STANDARD`).

- *Utiliser un réglage existant* : en JS `if (standard('<r>')) return;` ; en CSS préfixe
  `:where(html:not(.nova-std-<r>))` ; puis compléter, dans les quatre `lang/reglages.phtml.<l>`, la liste des
  changements de ce réglage (`nova_std_<r>_liste`, une ligne `<li>`). Cette liste est montrée aux gestionnaires :
  la tenir à jour à chaque changement.
- *Ajouter un réglage* : six listes à compléter ensemble : `CLES_STANDARD` (`js/src/00-commun.js`), script de tête
  de `htmlheader.phtml`, `_css/jetons.css`, `_widgets/apparence-standard.phtml`, `_widgets/reglages-site.phtml`
  (nom avec `_`), `lang/reglages.phtml` fr, en, es, it.

#verifier[injecter `:root { --nova-std-<r>: oui }` (feuille de la classe, ou `page.addStyleTag` en Playwright) :
la page doit redevenir celle du thème standard.]

== Changer le menu de l'enseignant <menu>

#table(columns: (1fr, 1.5fr), align: left,
  [Fichier], [Rôle],
  [`_procs/menumodubox0.proc`], [copie de WIMS qui regroupe le menu d'une classe en familles (Activités, Participants, Communication, Classe, Aide et outils)],
  [`local.phtml`], [point d'accroche de WIMS : entrées ajoutées (`$wims_rm_0`, `nom,1,paramètres`, libellé `$wims_name_<nom>`)],
  [`htmlheader.phtml`], [script de tête : menu simplifié par défaut (`window.novaMenu.defaut`), posé avant l'affichage],
  [`_widgets/menu-serveur.phtml`, `menu-bascule.phtml`], [choix de l'enseignant gardé sur le serveur ; repère du bouton « Menu complet »],
  [`js/src/10-barre-menus.js`], [`basculeMenu`, `menuPersonnel` (« Choisir les entrées du menu »), `sectionsRepliables`],
)
Le serveur envoie *toujours le menu complet* ; le navigateur en masque une partie (sans JavaScript : menu complet).

#attention[Le jeu d'icônes Font_Awesome met un tiret devant toute entrée sans icône : une entrée créée par Nova a
son pictogramme, ou une classe que la feuille d'icônes connaît. Chez un élève dont les « liens externes » sont
masqués, une rubrique qui contient un lien hors de `wims.cgi` disparaît entière : une entrée de Nova pointe
toujours vers `wims.cgi`.]

== Barre du haut, fil d'Ariane, pied de page <barre>

- Barre : `_widgets/headmenu.phtml` (entrées ; chronomètre d'examen), `headhome.phtml` (logo « WIMS »),
  `user_links.phtml` (compte, langues), `site_title.phtml` ; styles dans `cadre.css` ; comportement dans
  `10-barre-menus.js` (`barreCompacte` : ce qui ne tient pas passe dans « ⋯ » ; `centrerBarre`, `retourEleve`).
- Fil d'Ariane : `_widgets/ariane.phtml` (copie adaptée). Masqué aux élèves (bouton « Retour » à la place).
- Pied de page : `_widgets/footer.phtml` (CGU, aide), menu de pied de page de l'enseignant dans `supervisor.phtml`.

== Accueils <accueils>

- Site (visiteur) : `visitor.phtml`, `_widgets/front.phtml`, `infos.phtml` (message, actualité, exemples),
  `search_classe.phtml` ; `_css/accueil.css`.
- Élève : `user.phtml` (badges, avatar, couleur, cours unique) ; `_widgets/classtitle.phtml` ;
  `js/src/60-eleve.js`.
- Enseignant : `supervisor.phtml` ; `_widgets/statuts-ressources.phtml`, `sequences.phtml`, `replis-classes.phtml` ;
  `70-enseignant.js` (`accueilEnseignantCartes`, `etatsRessources`, `sequencesEnseignant`).

== Exercices <exercices>

#ou[`js/src/50-exercice.js` (verdict, étoiles, clavier mathématique, images cliquables, dominos, tuiles, éléments à
associer), `contenu.css`, `composants-dominos.css`.]

Les exercices OEF sont le terrain le plus fragile : beaucoup d'éléments y sont créés par *Dynapi* (bibliothèque de
WIMS) après le chargement, en positions absolues. Lire les pièges « Exercices » du @pieges avant d'y toucher.
Règles d'or : ne jamais réduire une image cliquable (le clic serait mal placé) ; ne jamais changer `f_cut` ;
reconnaître l'état d'une case par sa couleur posée par Dynapi, sans l'effacer.

== Examens et chronomètre <examens>

#ou[`js/src/30-examen.js`, `_css/chrono.css`, `_widgets/headmenu.phtml` (chronomètre), `examencours.phtml`
(bouton « Examen en cours »).]

Un examen vit dans la session de connexion de l'élève ; « Terminer » efface toute la session. Ne jamais cliquer
un lien d'exercice d'examen pour tester (cela démarre une session et consomme un essai).

== Feuilles et notes <feuilles>

#ou[`js/src/40-feuilles-notes.js` (feuille de l'élève, historiques, tableaux de notes, détail des notes),
`_widgets/couleurs-notes.phtml`, `notes-detail.phtml`, `contenu.css`.]

== Récompenses : badges, couleur, avatar, « Mon activité » <recompenses>

#table(columns: (1fr, 1.5fr), align: left,
  [Fonction], [Fichiers],
  [Badges], [`_procs/badges.awk` (calcul sur l'accueil de l'élève, niveaux dans `score/<login>.nova_badges`), `user.phtml`, `js/src/60-eleve.js`, `img/badges/`, `composants-reglages-badges.css`],
  [Ma couleur], [`_widgets/couleur-choix.phtml`, `js/src/61-couleur.js`, `_css/couleur.css`],
  [Avatar], [`_procs/avatar.awk`, `avatar.proc`, `avatar-catalogue.txt` (éléments et prix), `avatar-zones.sh`, `avatars-classe.sh`, `avatars-retour.sh` ; `_widgets/avatar*.phtml`, `avatars-*.phtml` ; `js/src/62-avatar.js`, `js/avatar.js` (DiceBear, voir `js/avatar.LISEZMOI.txt`, construit par `js/avatar-source.mjs`), `js/avatar-extras.js` (construit par `construire-avatar.py` depuis `_avatar/`), `_css/avatar.css`],
  [Mon activité], [`_procs/activite.awk`, `_widgets/activite.phtml`, `activite-entree.phtml`, `_css/activite.css` ; vacances : `_procs/vacances-zones.txt`, mis à jour par `maj-vacances.py`],
)
Un nouveau badge ou un nouvel élément d'avatar commence par une *maquette* validée (@choix). Les scripts `awk`
tournent sous mawk 1.3.4 : pas de `{n}` dans les expressions régulières, pas de `mktime`.

== Pages de l'enseignant <enseignant>

#ou[`js/src/70-enseignant.js` (le plus gros fichier : configuration, fiches de feuille et d'examen, séquences,
confirmations, export…), `_css/composants-enseignant.css`, widgets de textes (`fiche-ressource.phtml`,
`config-globale.phtml`, `capacite.phtml`, `acces-classe.phtml`, `confirmations.phtml`) et d'action
(`desactiver.phtml` + `_procs/desactiver.sh`, `propager.phtml` + `_procs/propager.sh`, `ecarts-zones.phtml`,
`sequences.phtml` + `_procs/sequences.sh`, `participants-zones.phtml`).]

Les boutons de danger sont en contour rouge sur la page ; le rouge plein est réservé au bouton qui confirme, dans
la fenêtre de confirmation de Nova (`confirmationsRessources`, `effacerMotd`). Une page vide reçoit une carte qui
dit quoi faire (`pagesVides`).

== Suivi en direct (salle informatique) <suivi>

#ou[`_widgets/suivi-entree.phtml` (accès : sessions autorisées par WIMS seulement), `suivi.phtml`,
`_procs/suivi.pl` (relevé en lecture seule), `js/suivi.js`, `_css/suivi.css`, `lang/suivi*.phtml`.]

== Ajouter une icône <icones>

Nova n'utilise que le jeu *Lucide* (licence ISC). Dans le CSS, une icône est un masque SVG en `data:` :
#attention[Jamais de `#` brut dans un SVG en `data:` (`stroke="#000"` coupe l'adresse, l'icône disparaît sans
erreur) : écrire `stroke='black'` ou `%23`.]
Le jeu d'icônes proposé à WIMS (`icones/Lucide/icon-min.css`) se reconstruit par `icones/construire-lucide.py`
(correspondances Font Awesome → Lucide dans `icones/correspondance.py`) ; `_procs/jeu-icones.sh` crée le lien
`gifs/themes/Lucide` à la première page de configuration.

== Passer à une nouvelle version de WIMS <wims>

Nova contient des copies, adaptées ou non, de fichiers de WIMS. `ORIGINES.sha256` garde l'empreinte des *originaux*
de WIMS 4.32 :
```sh
cd /home/wims/public_html/themes && grep -v '^#' Nova/ORIGINES.sha256 | sha256sum -c
```
Pour chaque « ÉCHEC » : comparer l'ancien original et le nouveau (`diff`), reporter la modification dans la copie de
Nova, puis mettre à jour la ligne de `ORIGINES.sha256`. Copies : les gabarits de `standard` (`header`, `tail`,
`htmlheader`, `supervisor`, `user`, `visitor`, `docheader`, `doctail`, `mhelpheader`, `mhelptail`, `table.proc`),
`_widgets/headmenu`, `user_links`, `ariane`, `headhome`, `classtitle`, `site_title`, `search_classe` (de Nikaia),
`front` (du module `home`), `_procs/menumodubox0.proc`, et les règles du jeu Font Awesome pour Lucide.

Ensuite : repasser les pages principales de chaque rôle (@chap-verifier), surtout les exercices.

// ================================================================= 5
= Les choix faits, et pourquoi <choix>

Ces décisions ont été prises avec l'utilisateur principal (un enseignant qui teste au téléphone). Les changer est
possible, mais c'est une décision de design : *maquette d'abord, code ensuite* (une image ou une page HTML statique
qui montre les variantes ; on code celle qui est choisie).

#table(columns: (1fr, 1.3fr, 1.2fr), align: left,
  [Choix], [Pourquoi], [Conséquence pour vous],
  [Le HTML de WIMS n'est pas réécrit], [Suivre WIMS sans effort ; retirer le thème rend le serveur intact], [CSS d'abord ; JS pour réordonner ; page utilisable sans JS],
  [Une seule couleur d'accent], [Lisibilité ; les couleurs de fond et de menu des classes rendaient des pages illisibles], [Ne pas lire les autres couleurs de la classe],
  [Police Atkinson Hyperlegible servie par le thème], [Lisibilité pour des élèves de 11 à 18 ans ; aucun appel externe], [Ne pas ajouter de police ni de CDN],
  [Mode sombre désactivé], [70 pages sur 88 illisibles en tout sombre (contenus de WIMS)], [Prêt dans `jetons.css`, commentaire en tête de `htmlheader.phtml`],
  [Animations coupées par défaut], [Calme, batterie, accessibilité], [Toute animation teste `animationsCoupees()` ou passe sous `html:not(.nova-sans-animation)`],
  [Réglages « thème standard »], [Un site doit pouvoir revenir à ce qu'il connaît, réglage par réglage], [Toute transformation déclare son réglage (@standard)],
  [Réglages en variables CSS], [Un seul mécanisme pour le site, la structure et la classe, lisible par CSS, JS et serveur], [@reglage],
  [Textes de `nova.js` en clair (attributs `data-*`)], [Le tampon de 32 Ko des noms de variables débordait], [@textes ; jamais de `!set` pour un texte de `nova.js`],
  [`nova.js` assemblé et réduit], [540 → 290 Ko ; le téléphone le charge plus vite], [Modifier `js/src/` ; les sources sont livrées (GPL)],
  [Menu de l'enseignant simplifié, personnalisable], [Sept entrées utiles d'abord ; le reste à un clic], [Le serveur envoie tout, le navigateur masque],
  [Menu du compte réduit pour les élèves], [Moins de distraction ; rien de nécessaire], [Une condition dans `_widgets/user_links.phtml`],
  [Pas de Foundation complet], [64 Ko pour quelques classes utilisées], [`foundation-min.css` ; le JS de Foundation reste chargé],
  [Icônes Lucide], [Un seul style, licence libre], [Toute nouvelle icône est une icône Lucide],
  [Quatre langues complètes], [fr, en, es, it ; repli sur l'anglais pour les autres], [Tout texte nouveau dans les quatre],
)

// ================================================================= 6
= Vérifier <chap-verifier>

#table(columns: (1fr, 1.5fr), align: left,
  [Quoi], [Comment],
  [Contrôles automatiques], [`./verifier.sh` (lancé aussi par `livrer.sh`)],
  [Deux largeurs], [1280 px et 390 px ; rien ne dépasse de l'écran au téléphone (sauf exercices à positions absolues)],
  [Tous les rôles concernés], [visiteur, élève, enseignant ; portail ou groupement si la page existe en zone],
  [Sans JavaScript], [bloquer `nova.js` : la page reste complète (@js)],
  [Réglage standard], [injecter `--nova-std-<r>: oui` : la page redevient standard],
  [Jeu d'icônes Font_Awesome], [un serveur en production l'utilise souvent : injecter `gifs/themes/Font_Awesome/icon-min.css` et regarder la barre et les menus],
  [Clignotement], [relever l'état de la page toutes les 100 ms dès le chargement (un test qui attend 3 s ne voit pas le délai de secours)],
  [Aucune erreur], [console du navigateur vide (`page.on('pageerror')` en Playwright)],
  [Une page qui ne doit pas changer], [relever le HTML de pages avant et après, `diff -r` (sans les lignes vides : un `!read` en ajoute une)],
)

#attention[Comportements de WIMS à connaître en testant avec un robot : `curl` est pris pour un robot ; beaucoup
de liens « Effacer » sont des GET (ne pas parcourir tous les liens) ; un élève qui enchaîne les exercices est bloqué
10 min (« rafale ») ; deux requêtes à moins d'1 s dans une session : la seconde voit l'état précédent ; deux mots de
passe à moins de 5 s dans la même session : le second est refusé.]

Un rendu obtenu en *simulant* une page (réponse réécrite dans le navigateur de test) se dit simulé.

// ================================================================= 7
= Livrer, versionner, documenter <livrer>

À la fin de chaque changement livré :
+ *`CHANGELOG.md`* : une ligne, ce que l'utilisateur voit changer, sous la version en cours, rubriques Élèves /
  Enseignants / Installation / Corrections (affiché par `nouveautes.html`).
+ *Ce guide* : mettre à jour la section concernée (un fichier nouveau doit y être nommé : `verifier.sh` le refuse
  sinon ; @annexe-maintenir).
+ *Commit*, puis `git fetch` et rebase si besoin avant de pousser sur `main`.
+ *`./livrer.sh`* : refuse un dépôt modifié ou un `css.css` à reconstruire ; produit
  `livraisons/nova-<date>-<commit>.tgz` (thème, sources, licences, documentation, ce guide en PDF si `typst` est
  installé). Une ancienne version : `./livrer.sh <commit>`. Un autre nom de dossier : `DOSSIER=Nova12 ./livrer.sh`
  (lettres et chiffres seulement).

*Version* : le numéro de `VERSION` (ici #version) est choisi par le responsable du thème, pas par le développeur ;
le proposer quand une livraison le mérite. `livrer.sh` ajoute commit et date dans l'archive ; ils s'affichent en bas
des cartes « Réglages de Nova » (`_widgets/version.phtml`, `_procs/version.sh`).

*Autres documents du dépôt* : `LISEZMOI.md` (présentation, fonctions), `INSTALLER.md` (installation sur un serveur),
`LICENSE`, `.gitignore`. `local.phtml.template` est l'exemple de Standard, gardé pour référence et non livré.

// ================================================================= 8
= Pièges à connaître <pieges>

Chaque piège ci-dessous a coûté du temps au moins une fois. Ils sont classés par domaine.

== Fichiers et encodages
- Gabarits et `lang/` en latin-1, servis en windows-1252. `grep -a` toujours. Un fichier enregistré en UTF-8 affiche « Ã© » (contrôlé).
- Dans un gabarit, `$=` (sélecteur CSS « finit par ») perd son `$` : écrire `$$=`.
- Dans un `!if`, `=` est une comparaison. `$httpd_HTTP_COOKIE` est figé à la connexion : inutilisable pour un choix fait après.
- Date du jour dans un gabarit : `!char 1 to 8 of $wims_now`.
- Nom du dossier du thème : lettres et chiffres seulement (un point : `css.css` non chargé ; un tiret : accueils sans Nova).

== CSS
- Spécificité : une règle de WIMS comme `.ui-widget input[type="submit"]` bat `input[type="submit"]` de Nova : préfixer.
- `:not(a, b)` prend la spécificité de son argument le plus fort.
- Une classe de Nova peut déjà exister avec un autre sens (`.nova-vide` masque !) : vérifier dans `css.css`.
- Au téléphone, `.wimsbody` défile en largeur : `position: sticky` s'y colle au bord de `.wimsbody`, pas de l'écran.
- Mesurer un masquage par la taille réelle (`getBoundingClientRect`), pas par l'attribut `hidden`.
- Préfixe de page d'élève : `html.nova-role-eleve`, jamais `body:has(#…)` (lent sur tout le document).

== JavaScript
- `nova.js` démarre avant le `DOMContentLoaded` de WIMS : brancher TinyMCE par `tinymce.on('AddEditor')`.
- Dynapi remplace les globales `MouseEvent` et `DragEvent` : `document.createEvent('MouseEvents')`.
- TinyMCE recopie son texte à l'envoi après les écouteurs de Nova : agir sur ce qui part par l'évènement `formdata`.
- `querySelectorAll('ul a')` depuis un élément vise aussi un `ul` ancêtre : viser précisément.
- Les attributs `data-*` des éléments de textes ne servent jamais de repère CSS.
- Au démarrage, les liens « Aide » sont encore dans la barre du haut, pas dans le menu : repérer le module par un sélecteur sans conteneur.

== Exercices
- Images cliquables (`input[type=image]`) : jamais réduites (le clic est lu en pixels de l'image).
- Dynapi crée ses calques après « load » et place une case sur son repère `<a id="fill<n>">` ; une marge posée avant n'est pas encore mesurée.
- Les étiquettes à déplacer sont dans `<body>`, hors de `.wimsbody`.
- Agrandir une formule MathJax : `zoom` sur `.wims_mathml`, pas la taille de police.
- La note de fin d'exercice est dans `.answer_analysis`, masqué par le verdict de Nova.

== Serveur
- `!writefile` : module de confiance, aucun dossier créé, échec silencieux.
- Valeurs de l'adresse brutes : filtrer avant `!sh` et avant de les écrire dans la page.
- Un `.proc` se lit par `!readproc`.
- Feuille de classe : jamais de ligne commençant par « : ».
- « Terminer » un examen efface toute la session de l'élève.

// ================================================================= Annexes
#set heading(numbering: "A.1")
#counter(heading).update(0)

= Carte du code JavaScript (produite à la compilation) <annexe-js>

Lue dans `js/src/` : description de chaque fichier (sa ligne `/* ===== … ===== */`) et ses fonctions de premier
niveau, dans l'ordre. Une fonction s'ouvre dans les sources par `grep -n "function nom" js/src/*.js`.

#let js-fichiers = ("00-commun.js", "10-barre-menus.js", "20-composants.js", "30-examen.js", "40-feuilles-notes.js",
  "50-exercice.js", "60-eleve.js", "61-couleur.js", "62-avatar.js", "70-enseignant.js", "80-reglages.js", "99-demarrage.js")
#for f in js-fichiers {
  let src = read("/js/src/" + f)
  let m = src.match(regex("/\* ===== js/src/[^ ]+ : (.+?) ===== \*/"))
  let fns = src.matches(regex("(?m)^  function ([A-Za-z0-9_]+)")).map(x => x.captures.at(0))
  let lignes = src.split("\n").len()
  block(breakable: true, below: .9em)[
    #text(weight: "bold")[#raw(f)] #text(fill: luma(100))[ — #lignes lignes, #fns.len() fonctions] \
    #if m != none [#emph(m.captures.at(0)) \ ]
    #text(8.5pt, fns.map(raw).join(", "))
  ]
}

= Feuilles CSS dans l'ordre de `css.css` (produite à la compilation) <annexe-css>

Lue dans `css.css.template`. Les feuilles de WIMS (`_css/…` du serveur) sont gardées et surchargées par celles de
Nova, chargées après : *l'ordre compte*.

#let modele = read("/css.css.template").split("\n").filter(l => l.starts-with("--- "))
#let premiere-phrase(src) = {
  let m = src.match(regex("(?s)^\s*/\*(.*?)\*/"))
  if m == none { return "" }
  let t = m.captures.at(0).replace(regex("(?m)^\s*\*+ ?"), "").replace(regex("\s+"), " ").trim()
  t = t.replace(regex("^Nova( —| :|:)? "), "")
  if t.len() > 230 { t = t.slice(0, t.clusters().slice(0, 220).join("").len()) + "…" }
  t
}
#{
  let wims = ()
  let lignes = ()
  for l in modele {
    let chemin = l.trim("-").trim()
    if chemin.starts-with("Nova/") {
      if wims.len() > 0 { lignes.push(([WIMS], [#wims.map(raw).join(", ")])); wims = () }
      let p = chemin.slice(4)
      lignes.push(([#raw(p.slice(6))], [#text(8.5pt, premiere-phrase(read(p)))]))
    } else { wims.push(chemin.slice(5)) }
  }
  if wims.len() > 0 { lignes.push(([WIMS], [#wims.map(raw).join(", ")])) }
  table(columns: (auto, 1fr), align: left, [Feuille], [Rôle (premier commentaire)], ..lignes.flatten())
}

= Réglages « thème standard » (produite à la compilation) <annexe-std>

Lus dans `CLES_STANDARD` (`js/src/00-commun.js`). Classe posée sur `<html>` : `nova-std-<r>` ; variable :
`--nova-std-<r>` ; texte et liste des changements : `nova_std_<r>` et `nova_std_<r>_liste` (`lang/reglages.phtml`,
avec `_` à la place de `-`).

#{
  let src = read("/js/src/00-commun.js")
  let m = src.match(regex("CLES_STANDARD = \[([^\]]*)\]"))
  let cles = m.captures.at(0).matches(regex("'([a-z-]+)'")).map(x => x.captures.at(0))
  let v = src.match(regex("(?s)VARS_DEMARRAGE = \[(.*?)\]"))
  [#cles.map(k => raw("std-" + k)).join(", ")]
  if v != none [
    \ \ Réglages lus au démarrage de `nova.js` (`VARS_DEMARRAGE`, sans le préfixe `--nova-`) :
    #v.captures.at(0).matches(regex("'([a-z0-9-]+)'")).map(x => raw(x.captures.at(0))).join(", ").
  ]
}

= Inventaire des fichiers <annexe-fichiers>

Chaque fichier du dépôt (hors images et polices) est nommé ici ; `verifier.sh` refuse une livraison si un fichier
nouveau n'y figure pas (@annexe-maintenir).

== Racine
#table(columns: (1fr, 1.5fr), align: left,
  [Fichier], [Rôle],
  [`htmlheader.phtml`], [en-tête HTML (lu par le C : variables seulement), scripts de tête],
  [`header.phtml`], [barre du haut, widgets d'action selon le contexte],
  [`tail.phtml`], [bas de page, widgets de fin],
  [`visitor.phtml`, `user.phtml`, `supervisor.phtml`], [accueils du site, de l'élève, de l'enseignant],
  [`docheader.phtml`, `doctail.phtml`], [documents],
  [`mhelpheader.phtml`, `mhelptail.phtml`], [fenêtres d'aide],
  [`local.phtml`], [entrées ajoutées aux menus de WIMS],
  [`local.phtml.template`], [exemple de Standard (non livré)],
  [`table.proc`], [renvoi à la procédure de WIMS],
  [`css.css.template`, `css.css`], [ordre des feuilles ; feuille construite],
  [`construire-css.sh`, `construire-js.sh`], [construction (@commandes)],
  [`verifier.sh`, `livrer.sh`], [contrôles, livraison],
  [`construire-avatar.py`], [construit `js/avatar-extras.js` depuis `_avatar/`],
  [`maj-vacances.py`], [met à jour `_procs/vacances-zones.txt` (calendrier scolaire officiel)],
  [`VERSION`, `CHANGELOG.md`, `nouveautes.html`], [version, changements, page qui les affiche],
  [`LISEZMOI.md`, `INSTALLER.md`, `LICENSE`, `ORIGINES.sha256`, `.gitignore`], [documentation, licence, empreintes des originaux de WIMS],
)

== `_widgets/`
#table(columns: (1fr, 1.5fr), align: left,
  [Widget], [Rôle],
  [`accent.phtml`], [couleur d'accent (site ou classe, sinon prune)],
  [`couleurs-notes.phtml`], [couleurs des notes dans les tableaux de WIMS],
  [`headmenu.phtml`, `headhome.phtml`, `user_links.phtml`, `site_title.phtml`], [barre du haut (copies de WIMS)],
  [`ariane.phtml`, `footer.phtml`, `classtitle.phtml`], [fil d'Ariane, pied de page, titre de zone],
  [`front.phtml`, `infos.phtml`, `search_classe.phtml`], [accueil du site],
  [`examencours.phtml`], [bouton « Examen en cours »],
  [`menu-serveur.phtml`, `menu-bascule.phtml`, `replis-classes.phtml`, `std-menus.phtml`], [menu de l'enseignant, classes repliées, réglage « menus »],
  [`apparence.phtml`, `apparence-classe.phtml`, `apparence-standard.phtml`, `reglages-site.phtml`, `version.phtml`], [cartes « Réglages de Nova », enregistrement des réglages du site, version],
  [`propager.phtml`, `ecarts-zones.phtml`, `participants-zones.phtml`], [zones dépendantes : propagation, écarts, listes après import],
  [`desactiver.phtml`, `confirmations.phtml`, `statuts-ressources.phtml`, `fiche-ressource.phtml`], [ressources (feuilles, examens) : désactivation, confirmations, états, fiches],
  [`acces-classe.phtml`, `capacite.phtml`, `config-globale.phtml`, `sequences.phtml`], [configuration de la classe, séquences],
  [`notes-detail.phtml`], [détail des notes],
  [`couleur-choix.phtml`], [« Ma couleur » de l'élève],
  [`activite.phtml`, `activite-entree.phtml`], [« Mon activité »],
  [`avatar.phtml`, `avatar-entree.phtml`, `avatar-barre.phtml`, `avatars-classe.phtml`, `avatars-entree.phtml`, `avatars-participants.phtml`], [avatar de l'élève, avatars vus par l'enseignant],
  [`suivi.phtml`, `suivi-entree.phtml`], [suivi en direct],
)

== `_procs/`
#table(columns: (1fr, 1.5fr), align: left,
  [Procédure], [Rôle],
  [`menumodubox0.proc`], [menu de l'enseignant en familles (copie de WIMS)],
  [`eleve.proc`, `textes-standard.proc`], [l'utilisateur est-il un élève ; réglage « textes »],
  [`badges.awk`], [badges],
  [`activite.awk`, `vacances-zones.txt`], [« Mon activité », vacances des zones A, B, C],
  [`avatar.awk`, `avatar.proc`, `avatar-catalogue.txt`, `avatar-zones.sh`, `avatars-classe.sh`, `avatars-retour.sh`], [avatar],
  [`propager.sh`, `desactiver.sh`, `sequences.sh`], [actions de l'enseignant],
  [`jeu-icones.sh`], [lien du jeu Lucide dans `gifs/themes`],
  [`suivi.pl`], [relevé du suivi en direct],
  [`version.sh`], [ligne de version],
)

== `js/`, `lang/`, `icones/`
#table(columns: (1fr, 1.5fr), align: left,
  [Fichier], [Rôle],
  [`js/src/*.js`, `js/nova.js`], [sources et script construit (@annexe-js)],
  [`js/suivi.js`], [page du suivi en direct],
  [`js/qrcode.js`, `js/qrcode.LISEZMOI.txt`], [QR code des liens de connexion (bibliothèque MIT)],
  [`js/flyers.js`], [flyers PDF des liens de connexion],
  [`js/avatar.js`, `js/avatar-source.mjs`, `js/avatar.LISEZMOI.txt`, `js/avatar-extras.js`], [dessin de l'avatar (DiceBear) et éléments propres à Nova],
  [`lang/name`, `name-textes`], [barre et menu (chaque page)],
  [`lang/eleve`, `eleve-textes`, `enseignant`, `enseignant-textes`, `reglages`, `reglages-textes`, `suivi`, `suivi-textes`], [textes par page (@textes)],
  [`lang/adm_class_*`], [surcharges de textes de modules de WIMS],
  [`icones/construire-lucide.py`, `icones/correspondance.py`, `icones/Lucide/`], [jeu d'icônes Lucide pour WIMS],
)

= Maintenir ce guide <annexe-maintenir>

Ce guide n'est utile que s'il dit vrai. Trois mécanismes le tiennent à jour.

+ *Annexes produites à la compilation* (A, B, C) : elles lisent les sources. Rien à faire, sauf si un fichier de
  `js/src/` est ajouté ou renommé : l'ajouter à la liste `js-fichiers` (@annexe-js ; la compilation échoue sinon sur un
  fichier disparu).
+ *Couverture* (contrôlée par `verifier.sh`, bloquante) : tout fichier de `_widgets/`, `_procs/`, `_css/`, `js/`,
  `js/src/`, `icones/`, de la racine, et tout groupe de `lang/` doit être *nommé* dans ce guide. Un fichier nouveau
  oblige donc à dire à quoi il sert, dans l'@annexe-fichiers et, s'il change une recette, au @recettes.
+ *Revue de structure* (signalée par `verifier.sh`, non bloquante) : tous les *40 commits* depuis la ligne
  « revue de structure » en tête du source, `verifier.sh` le rappelle. La revue répond à ces questions :
  - les objectifs du @recettes sont-ils encore ceux qu'on rencontre ? (relire les derniers messages de commit : un
    type de changement fréquent sans recette mérite une recette ; une recette jamais utilisée peut être raccourcie) ;
  - le tableau « Le guide en une page » renvoie-t-il aux bons fichiers ?
  - un fichier de `js/src/` ou de `_css/` a-t-il trop grossi (plus de 3 000 lignes, ou plusieurs domaines) ? le
    découper, et l'écrire ici ;
  - les pièges du @pieges sont-ils encore vrais ? en manque-t-il un qui a coûté du temps ?
  - les choix du @choix ont-ils changé ?
  Puis changer la date de la ligne « revue de structure », et le dire dans le message de commit.

À chaque changement du thème, en plus : mettre à jour la section concernée (une recette, une ligne de l'@annexe-fichiers,
un piège). Un changement qui ne change rien à la façon de travailler (correction ponctuelle, nouveau texte) ne demande
rien.
