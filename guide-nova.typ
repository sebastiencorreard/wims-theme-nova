// Guide pour modifier et maintenir le thème Nova (WIMS), à destination des humains.
// Compiler (le guide lit les sources du thème pour ses annexes ; il est à la racine du thème pour que Typst y ait accès) :
//   typst compile guide-nova.typ
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
  // Le chapitre qui commence sur cette page, sinon le dernier commencé avant.
  let ici = query(heading.where(level: 1)).filter(h => h.location().page() == here().page())
  let t = if ici.len() > 0 { ici } else { query(selector(heading.where(level: 1)).before(here())) }
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

Les mots de WIMS (module, classe, zone, feuille, examen…) et ceux de Nova (gabarit, widget, jeton…) sont définis
dans le @annexe-glossaire.

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
  [`guide-nova.typ`], [Ce guide (à la racine : Typst ne lit les sources que sous le dossier du fichier compilé).],
)

// ================================================================= 2
= Mettre en place son poste

== Ce qu'il faut

- Un *WIMS 4.32 de développement*, installé à votre choix *dans un conteneur Docker* ou *directement sur une machine
  Linux* (une machine virtuelle convient) : @annexe-installer compare les deux et donne les étapes. Dans les deux cas,
  le dossier du thème doit apparaître dans `public_html/themes/Nova` du serveur WIMS. Jamais un serveur où
  travaillent de vrais élèves : on y casse des pages et on y crée des classes de test.
- Sans Docker, `construire-css.sh` et `livrer.sh` lisent les feuilles de WIMS dans le dossier indiqué par
  `WIMS_THEMES` (ex. `export WIMS_THEMES=/home/wims/public_html/themes`) ; avec Docker, dans le conteneur nommé par
  `CONTENEUR` (par défaut `wims432`).
- *Node.js* et *terser 5* : `construire-js.sh` le cherche dans `$NOVA_TERSER`, puis dans `../../outils-js/node_modules/.bin`, puis dans le `PATH`
  (`npm install terser@5.36.0` dans un dossier `outils-js` à côté du projet).
- *Python 3* (contrôles, outils d'icônes et d'avatar), *typst* (ce guide), *Playwright* (captures et tests, conseillé).
- Un navigateur avec un mode « téléphone » (390 px de large) : Nova se vérifie toujours aussi au téléphone.

== Les quatre commandes <commandes>

#table(columns: (auto, auto, 1fr), align: left,
  [Commande], [Lit WIMS ?], [Ce qu'elle fait],
  [`./construire-css.sh`], [oui], [Concatène les feuilles de `css.css.template` (celles de WIMS lues *dans le conteneur* ou dans `$WIMS_THEMES`, celles de Nova dans `_css/`), réduit, écrit `css.css` et l'empreinte (`_css/empreinte.css`, meta `nova-css`).],
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
= Comment WIMS assemble une page Nova <assemblage>

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

=== Le tampon des noms de variables <tampon>

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

*Calculer* : le langage des gabarits de WIMS ne convient pas à un calcul lourd (parcourir les notes d'un élève,
compter des semaines). Le gabarit lance alors un script par `!sh` et lit ce qu'il écrit :
```
!set nova_r=!sh cat "$$fichier" | awk -v auj=$nova_auj -f themes/$wims_theme/_procs/mon-calcul.awk
```
Les scripts de Nova sont en _AWK_ (`badges.awk`, `avatar.awk`, `activite.awk`), en shell ou en Perl (`suivi.pl`) :
des langages installés partout où WIMS tourne, sans rien ajouter au serveur. AWK lit un texte ligne par ligne, le
découpe en champs et applique des règles (« si la ligne ressemble à ceci, faire cela ») : il convient aux fichiers
de notes de WIMS, qui ont une ligne par réponse envoyée. Le serveur a la variante *mawk* 1.3.4, plus limitée que le
`gawk` d'un poste de travail : pas de `{n}` dans les expressions régulières, pas de fonction de date `mktime`
(`badges.awk` calcule les jours du calendrier lui-même). Essayer un script avec `mawk`, pas avec `gawk`.

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
  [`local.phtml`], [point d'accroche de WIMS, lu sur chaque page juste avant d'écrire le menu : c'est là qu'on ajoute ou retire une entrée],
  [`htmlheader.phtml`], [script de tête : menu simplifié par défaut (`window.novaMenu.defaut`), posé avant l'affichage],
  [`_widgets/menu-serveur.phtml`, `menu-bascule.phtml`], [choix de l'enseignant gardé sur le serveur ; repère du bouton « Menu complet »],
  [`js/src/10-barre-menus.js`], [`placerMenu` (icônes), `menuServeur`, `basculeMenu`, `menuPersonnel` (« Choisir les entrées du menu »), `sectionsRepliables`],
)
Le serveur envoie *toujours le menu complet* ; le navigateur en masque une partie (sans JavaScript : menu complet).

=== Comment le menu est fait

Le menu latéral d'une page est la variable `$wims_rm_0` : *une ligne par entrée*, trois champs séparés par des
virgules.
```
itemsep,0,Participants                        titre de groupe (type 0)
add_sheet,1,module=adm/class/sheet&sheet=3    lien dans WIMS (type 1) : WIMS ajoute la session
monlien,2,https://exemple.org                 lien externe (type 2) : adresse complète
```
- Le premier champ est le *nom* de l'entrée. Son libellé est la variable `$wims_name_<nom>` ; dans la page, l'entrée
  devient `<li class="menuitem <nom>">`. Pour connaître le nom d'une entrée existante, la regarder dans l'inspecteur
  du navigateur : c'est la classe à côté de `menuitem`.
- Sur l'accueil d'une classe, les lignes sont préparées par `_procs/menumodubox0.proc` (lu par `supervisor.phtml`),
  qui lit dans l'ordre les procédures de WIMS (`themes/_procs/classtools.proc`, `supervisorusermanage.proc`…).
  Ailleurs, c'est le module de la page qui les prépare.
- Dans tous les cas, WIMS lit ensuite `local.phtml` du thème, puis écrit le menu. `local.phtml` voit donc le menu
  complet et peut le réécrire.

=== Ajouter une entrée

Le modèle le plus simple est le dernier bloc de `local.phtml` (« Réglages de Nova », placée après « Apparence »).
Pour ajouter une entrée `nova_bilan` après « Nouvel examen » (`add_exam`) :
```
!if $wims_user=supervisor and add_exam isin $wims_rm_0 and nova_bilan notin $wims_rm_0
  !default nova_bilan_titre=Report
  !set wims_name_nova_bilan=$nova_bilan_titre
  !set nova_bc=!linecnt $wims_rm_0
  !reset nova_br
  !for nova_bi=1 to $nova_bc
    !set nova_bl=!line $nova_bi of $wims_rm_0
    !set nova_br=!append line $nova_bl to $nova_br
    !set nova_bn=!item 1 of $nova_bl
    !if $nova_bn=add_exam
      !set nova_br=!append line nova_bilan,1,module=adm/class/userscore to $nova_br
    !endif
  !next nova_bi
  !set wims_rm_0=$nova_br
  !reset nova_bc nova_bi nova_bl nova_bn nova_br
!endif
```
Le bloc recopie le menu ligne à ligne dans `nova_br` et glisse la nouvelle ligne après celle qu'il cherche. Ensuite :
+ *Condition* (première ligne) : le rôle (`$wims_user=supervisor`), la page si besoin (`$module=…`), la présence de
  l'entrée repère, et `nova_bilan notin $wims_rm_0` pour ne pas l'ajouter deux fois.
+ *Texte* : `!set nova_bilan_titre=…` dans `lang/name.phtml.fr`, `.en`, `.es`, `.it` (@textes ; ce fichier est lu
  sur chaque page : libellé court). Le `!default` en anglais sert de secours.
+ *Lien* : toujours une adresse de WIMS (type 1). Pour une page de Nova, un paramètre lu par un widget
  (`module=home&nova_suivi=1`, @serveur).
+ *Icône* : dans `placerMenu` (`10-barre-menus.js`), donner au lien une classe que les jeux d'icônes de WIMS
  connaissent (`eye`, `account`, `config_module`, `trophy`…) ; la tester avec le jeu Font_Awesome, car
  certaines classes perdent contre le tiret (voir l'encadré) :
  `var a = menu.querySelector('.nova_bilan > a'); if (a) a.classList.add('trophy');`
+ *Menu simplifié* : sur l'accueil d'une classe, seules les entrées de la liste `defaut` du script de tête
  (`htmlheader.phtml`) sont montrées. Y ajouter `'nova_bilan'` pour qu'elle le soit. Un enseignant qui a déjà
  choisi ses entrées garde sa propre liste : pour qu'il voie la nouvelle une première fois, l'ajouter à la liste
  `[['nova_suivi', 'suivi_v1'], …]` de `menuServeur`. Sur les autres pages, tout est montré par défaut : rien à faire.
+ `./construire-js.sh`, `./verifier.sh`.

=== Retirer une entrée

Trois façons, de la plus légère à la plus forte :
- *Ne plus la montrer par défaut* (elle reste dans « Menu complet » et dans « Choisir les entrées du menu ») : retirer son
  nom de la liste `defaut` de `htmlheader.phtml`.
- *La cacher à tous* : une règle dans `cadre.css`,
  `:where(html:not(.nova-std-menus)) #wimsmenumodubox .menuitem.<nom> { display: none; }`.
- *Ne pas l'envoyer* : dans la boucle de recopie de `local.phtml`, sauter sa ligne. C'est ce que fait le premier bloc
  pour le trombinoscope de WIMS : `!if $nova_avr!=remplace or $(nova_sl[1])!=photoboard`.

Retirer une entrée change le thème standard : la règle ou le bloc doit respecter le réglage « Menus du thème
standard » (@standard). Côté serveur, sa valeur se lit par `!read themes/$wims_theme/_widgets/std-menus.phtml`
(résultat dans `$nova_pstd` : `oui` ou `non`). Ajouter une ligne à `nova_std_menus_liste`.

=== Renommer, déplacer, regrouper

- *Renommer* : `!set wims_name_<nom>=…` dans `local.phtml`, avec un texte de `lang/name.phtml.<l>`.
- *Titre d'une famille* de l'accueil : `nova_menu_activites`, `_participants`, `_communication`, `_classe`, `_aide`
  dans `lang/name.phtml.<l>`.
- *Ordre des familles* de l'accueil : l'ordre des `!read themes/_procs/….proc` dans `_procs/menumodubox0.proc`.
- *Déplacer une entrée* : dans la boucle de `local.phtml`, sauter sa ligne à l'ancienne place et l'ajouter à la
  nouvelle.

=== Lire `local.phtml`

Ses variables de travail ont des noms courts (chaque nom compte dans le tampon de 32 Ko, @tampon) et sont effacées en
fin de bloc. Elles ne sont décrites que par les commentaires `!!` placés au-dessus de leur première affectation.
#table(columns: (0.6fr, 2fr), align: left,
  [Variable], [Sens],
  [`nova_avm`], [la page des avatars est-elle proposée ? `oui` (avatar activé), `badges` (avatar coupé, badges actifs), autre chose : non],
  [`nova_avs_titre`], [texte de `lang/name.phtml` : les deux titres possibles de l'entrée, « Avatars des élèves, Badges des élèves »],
  [`nova_avr`], [`remplace` quand l'entrée prend la place et le nom du trombinoscope de WIMS ; `oui` quand le réglage « Menus du thème standard » l'interdit],
  [`nova_sc`, `nova_si`, `nova_sl`], [nombre de lignes du menu, numéro de la ligne lue, la ligne elle-même],
  [`nova_sg`, `nova_sp`], [numéro de ligne du dernier titre de groupe vu ; de celui du groupe Participants (0 : absent)],
  [`nova_sr`], [le menu réécrit, recopié dans `$wims_rm_0` à la fin],
  [`nova_ici`], [1 sur l'accueil (module `home`) : la rubrique Participants n'est ajoutée que là],
  [`nova_sn`], [titre posé en tête quand le menu du module n'en a pas],
  [`nova_bc`, `nova_bi`, `nova_bl`, `nova_bn`, `nova_br`], [second bloc (« Réglages de Nova ») : nombre de lignes, numéro, ligne, nom de l'entrée, menu réécrit],
)

#verifier[menu simplifié et menu complet ; « Choisir les entrées du menu » propose l'entrée ; une classe seule et une
zone d'un portail ; jeu d'icônes Font_Awesome injecté (@chap-verifier) ; `--nova-std-menus: oui`.]

#attention[Le jeu d'icônes Font_Awesome met un tiret devant toute entrée sans icône : une entrée créée par Nova a
son pictogramme, ou une classe que la feuille d'icônes connaît. Chez un élève dont les « liens externes » sont
masqués, une rubrique qui contient un lien hors de `wims.cgi` disparaît entière : une entrée de Nova pointe
toujours vers `wims.cgi`. Un séparateur sans titre laissé en tête du menu ouvre un groupe sans intitulé : `local.phtml`
les retire avant d'insérer.]

== Modifier la barre du haut, le fil d'Ariane ou le pied de page <barre>

#ou[`_widgets/headmenu.phtml` (entrées ; chronomètre d'examen), `headhome.phtml` (logo « WIMS »),
`user_links.phtml` (compte, langues), `site_title.phtml`, `ariane.phtml` (fil d'Ariane), `footer.phtml` (pied de
page) ; styles dans `cadre.css` ; comportement dans `10-barre-menus.js`.]

Les entrées de la barre (`$wims_hm`) sont préparées par WIMS, hors du thème (`html/headmenu*.phtml`) ; le thème ne
fait que les écrire. On ne change donc pas la liste de WIMS : on ajoute à côté, ou on masque.

=== Ajouter un bouton dans la barre

Modèle : `_widgets/examencours.phtml` (bouton « Examen en cours »).
+ Créer `_widgets/<nom>.phtml`. En tête, la condition d'affichage (rôle, page, pas en examen), puis les textes avec
  un secours en anglais :
  ```
  !if $wims_user!=supervisor and $wims_user!=$empty and $wims_class!=$empty and _exam notin $wims_session
    !default nova_monbouton=My button
    <li class="menuitem nova-monbouton">
      !href module=home&nova_mapage=1 $nova_monbouton
    </li>
  !endif
  ```
+ Le lire dans `header.phtml`, dans le bloc qui écrit la barre, à côté de
  `!read themes/$wims_theme/_widgets/examencours.phtml`.
+ Texte : `!set nova_monbouton=…` dans `lang/name.phtml.fr`, `.en`, `.es`, `.it` (@textes).
+ Icône, dans `cadre.css` : `#wimstopbox .menuitem.nova-monbouton > a::before { … }` (@icones), ou
  `content: none`. Sans cela, le jeu Font_Awesome met un tiret devant le bouton.
+ `./construire-css.sh`.

=== Retirer ou déplacer une entrée de la barre

+ Relever sa classe dans l'inspecteur : `<li class="menuitem <nom>">` dans `#wimstopbox`.
+ La masquer dans `cadre.css`, sous le réglage `navigation` (@standard) :
  `:where(html:not(.nova-std-navigation)) #wimstopbox .menuitem.<nom> { display: none; }`
+ Pour la déplacer (dans le menu latéral, dans « ⋯ »), une fonction de `10-barre-menus.js` qui déplace l'élément ;
  `barreCompacte` range déjà dans « ⋯ » ce qui ne tient pas, `retourEleve` remplace le fil d'Ariane de l'élève par un
  bouton « Retour ».
+ Ajouter une ligne à la liste du réglage (`nova_std_navigation_liste`).

=== Changer le menu du compte

Le menu du compte (nom, mot de passe, déconnexion) est écrit par `_widgets/user_links.phtml`. La liste réduite des
élèves est la branche `!if $nova_est_eleve=yes` : elle parcourt les liens de WIMS (`$wims_user_links`) et n'en
laisse voir que certains. Les autres reçoivent la classe `nova-lien-complet`, masquée par le CSS tant que le réglage
« Navigation complète pour l'élève » n'est pas posé. Pour montrer un lien de plus aux élèves, ajouter son nom au
test `!if $nova_lc=passwd` ; pour une entrée nouvelle, écrire un `<li class="menuitem">` dans cette branche.

=== Ajouter un lien au pied de page

Dans `_widgets/footer.phtml`, recopier un bloc existant :
```
<div class="menuitem cgu">
  !set wims_ref_class=cgu
  !href module=adm/light&phtml=cgu.phtml $wims_name_cgu
</div>
```
en changeant la classe, l'adresse et le texte. La classe (`cgu`, `help`) donne l'icône. Les libellés propres à l'enseignant sont les éléments de `nova_pied`
(`lang/name.phtml.<l>`) : ajouter un élément à la fin, dans les quatre langues.

#verifier[à 390 px : la barre tient sur une ligne, ce qui dépasse est dans « ⋯ » ; en élève et en enseignant ;
pendant un examen (le chronomètre prend de la place) ; jeu Font_Awesome injecté.]

== Ajouter un bloc ou une page à un accueil <accueils>

#table(columns: (0.6fr, 1.6fr), align: left,
  [Accueil], [Fichiers],
  [Site (visiteur)], [`visitor.phtml`, `_widgets/front.phtml`, `infos.phtml` (message, actualité, exemples), `search_classe.phtml` ; `_css/accueil.css`],
  [Élève], [`user.phtml` (badges, avatar, couleur, cours unique) ; `_widgets/classtitle.phtml` ; `js/src/60-eleve.js`],
  [Enseignant], [`supervisor.phtml` ; `_widgets/statuts-ressources.phtml`, `sequences.phtml`, `replis-classes.phtml` ; `70-enseignant.js` (`accueilEnseignantCartes`, `etatsRessources`, `sequencesEnseignant`)],
)
Ces trois gabarits sont des copies de ceux du thème standard : WIMS y écrit la page de haut en bas, et l'ordre des
`!read` est l'ordre des blocs à l'écran.

=== Ajouter un bloc

+ Écrire le bloc dans un widget `_widgets/<nom>.phtml` (commentaire `!!` en tête : qui le lit, quand, pourquoi).
+ Le lire dans le gabarit, à la place voulue : `!read themes/$wims_theme/_widgets/<nom>.phtml`. Dans `user.phtml`,
  la liste des feuilles, examens et documents est écrite par les `!read themes/_widgets/user_var….phtml` : se placer
  avant ou après.
+ Poser la condition *dans le widget*. `user.phtml` sert aussi à l'enseignant d'un portail ou d'un groupement, et
  dans chaque zone : tester le rôle (`$wims_user=supervisor`) et le type (`$class_typename`) avant d'afficher un
  bloc d'élève.
+ Textes : `lang/eleve.phtml.<l>` (lu en tête de `user.phtml`) ou `lang/enseignant.phtml.<l>` ; styles dans
  `accueil.css`.

=== Remplacer l'accueil par une page de Nova

C'est ainsi que sont faites « Mon activité », le suivi en direct et la page des avatars.
+ Un *widget d'entrée*, lu tout en haut du gabarit, teste un paramètre de l'adresse (`nova_activite=1`), le filtre
  (@serveur), lit le widget de la page, puis saute le reste de l'accueil. Modèle : `_widgets/activite-entree.phtml`.
+ Le *widget de la page* écrit le contenu. Modèle : `_widgets/activite.phtml`.
+ Le *lien* qui y mène est une adresse de WIMS, `module=home&nova_activite=1` : une entrée de menu (@menu) ou un
  bouton de la barre (@barre).
+ Nommer les deux fichiers dans l'annexe D de ce guide.

=== Réordonner les blocs de WIMS sans toucher au gabarit

Une fonction JavaScript déplace les blocs une fois la page lue (`accueilEnseignantCartes` range l'accueil de
l'enseignant en cartes). Suivre la recette contre le clignotement (@js), et le réglage `listes` ou `menus`.

#verifier[classe seule, puis portail ou groupement (accueil de la structure et d'une zone) ; un élève sans aucune
ressource ; à 390 px.]

== Corriger ou améliorer l'affichage d'un exercice <exercices>

#ou[`js/src/50-exercice.js`, `contenu.css`, `composants-dominos.css`.]

Les exercices OEF sont le terrain le plus fragile : beaucoup d'éléments y sont créés par *Dynapi* (bibliothèque de
WIMS) après le chargement, en positions absolues. Lire les pièges « Exercices » du @pieges avant d'y toucher.
Règles d'or : ne jamais réduire une image cliquable (le clic serait mal placé) ; ne jamais changer `f_cut` ;
reconnaître l'état d'une case par sa couleur posée par Dynapi, sans l'effacer.

#table(columns: (1fr, 1.6fr), align: left,
  [Ce qui est en cause], [Fonction de `50-exercice.js`, réglage],
  [le verdict de la page de réponse (bandeau juste / faux, note)], [`alignerVerdict`, `noteSeule` ; réglage `reponse`],
  [la réponse de l'élève réaffichée dans l'énoncé (cadre, pastille)], [`retourReponse` ; réglage `reponse`],
  [les étoiles d'une bonne réponse], [`etoiles`, `nueeEtoiles`, `poserEtoiles` ; animations (@choix)],
  [le clavier du téléphone, le clavier mathématique], [`claviersReponse`, `clavierMaths`],
  [les étiquettes à déplacer au doigt], [`glisserTactile`, `tuiles`, `tuilesCorrigees`, `caseVisee`],
  [les dominos], [`dominos` ; règles en fin de `composants-dominos.css` ; réglage `dominos`],
  [les éléments à associer], [`associations`],
  [une image où l'on clique], [`imagesCliquables`],
)

=== Corriger un exercice mal affiché

+ *Reproduire.* Garder l'adresse de l'exercice. L'ouvrir avec le thème standard (ou avec
  `--nova-std-reponse: oui`, `--nova-std-dominos: oui`) : si le défaut est aussi là, il vient de l'exercice ou de
  WIMS, pas de Nova.
+ *Relever le HTML de WIMS.* Bloquer `nova.js` (outils du navigateur) et regarder dans l'inspecteur ce que WIMS
  écrit : c'est sur cette structure que la correction doit s'appuyer.
+ *Trouver la règle ou la fonction en cause.* Dans l'inspecteur, les règles de Nova viennent de `css.css` :
  retrouver leur feuille par `grep -a -n "<sélecteur>" _css/*.css`. Pour le JavaScript, construire la version
  lisible (`NOVA_JS_LISIBLE=1 ./construire-js.sh`) et chercher la classe `nova-…` posée sur l'élément.
+ *Corriger au plus étroit* : un sélecteur qui ne vise que ce type d'exercice, pas tous les exercices.
+ Reconstruire, puis refaire les vérifications ci-dessous sur *d'autres* exercices du même type.

=== Habiller un type de réponse que Nova ne traite pas

+ L'aspect de repos se règle en CSS, sur la structure de WIMS (`div:has(> .corr_label)`, `[style*="…"]`), jamais sur
  une classe posée par `nova.js` : elle arrive après le premier affichage et l'élève verrait l'ancien aspect un
  instant.
+ Le type d'une réponse n'est pas écrit dans la page : le reconnaître par sa structure. Un champ sans attribut
  `type` est un champ de texte.
+ Le comportement va dans une nouvelle fonction de `50-exercice.js`, appelée dans `demarrage()`, qui s'arrête si la
  page n'est pas concernée ou si le réglage standard est choisi (@js).
+ Si l'habillage masque ou déplace quelque chose : le rattacher à un réglage (`reponse`, `dominos`) et compléter sa
  liste (@standard).

#verifier[l'énoncé *et* la page de réponse (juste, faux, partiel) ; dans une feuille et hors feuille ; en examen ;
formules en MathML et en images (`&useropts=52` ou `10` dans l'adresse) ; au doigt sur un téléphone, pas seulement à
la souris ; une réponse réellement envoyée donne la même note qu'avec le thème standard.]

== Modifier le chronomètre ou une page d'examen <examens>

#ou[`js/src/30-examen.js`, `_css/chrono.css`, `_widgets/headmenu.phtml` (chronomètre), `examencours.phtml`
(bouton « Examen en cours »). Tout relève du réglage `examens`.]

Un examen vit dans la session de connexion de l'élève ; « Terminer » efface toute la session. Ne jamais cliquer
un lien d'exercice d'examen pour tester (cela démarre une session et consomme un essai).

#table(columns: (1fr, 1.6fr), align: left,
  [Ce qui est en cause], [Où],
  [le chronomètre d'un examen], [`chronometre`, `chronoMiroir` (copie sur la page de l'examen) ; `chrono.css`],
  [le chronomètre d'un exercice à temps limité], [`chronoExercice` ; le bloc « Exercice OEF chronométré » de `headmenu.phtml`],
  [ce que l'élève voit pendant un examen (menu, « Terminer », aide grisée)], [`modeExamen`, `aideExamen`],
  [la page de l'examen (liste des exercices, étapes d'une série)], [`pagesExamen`, `examExercices`, `serieEtapes`, `typesExamen`],
  [un parcours (« course »)], [`parcours`, `habillerParcours`, `parcoursExamen`, `courseExercice`],
  [le message « Vous avez déjà commencé un autre examen »], [`autreExamen` ; `examencours.phtml`],
  [la fenêtre qui confirme la fin], [`fenetreVerification`],
)

=== Changer l'aspect ou les seuils du chronomètre

Le chronomètre de WIMS (`span#chrono_exam` et son script) reste dans la page, écrit tel quel par `headmenu.phtml` :
Nova lit son décompte et l'habille, il ne compte pas le temps lui-même.
+ *Aspect.* `chronometre` pose un état sur `.nova-chrono` : `data-etat="normal"`, `attention`, `critique` ou `fin`.
  Chaque état a sa règle dans `chrono.css` (`.nova-chrono[data-etat="attention"] { … }`) : y changer couleurs et
  taille, avec les variables de `jetons.css`.
+ *Seuils.* Par défaut 300 s (attention) et 60 s (critique). `chronometre` les lit dans les attributs
  `data-seuil-attention` et `data-seuil-critique` de la boîte `.nova-chrono`. Cette boîte est écrite sous
  l'étiquette `headmenu_1` de `lang/name-textes.phtml.<l>` : y poser les deux attributs, dans les quatre langues.
+ *Textes* (« Moins de 5 minutes », « Temps écoulé »…) : attributs `data-texte-…` de la même boîte (@textes). Si
  un seuil change, changer aussi le texte qui l'annonce.
+ `./construire-css.sh` ou `./construire-js.sh` selon ce qui a changé.

=== Changer ce que l'élève voit pendant un examen

Pendant un examen, la session contient `_exam` : `modeExamen` s'en sert pour réduire la page (menu, lien
« Terminer », aide). Pour montrer ou cacher un élément de plus, le faire dans `modeExamen`, et vérifier la page qui
confirme « Terminer » : elle n'a aucun menu latéral, donc ni bouton ☰ ni chronomètre.

=== Tester sans risque

+ Un élève de test et un examen de quelques minutes, jamais un compte réel.
+ Pour voir le bouton « Examen en cours » sans démarrer d'examen : écrire le verrou
  `log/classes/<classe>/.parmreg/<élève>.exam` (`IP session fin numéro`) *avant* la connexion, puis le retirer.
+ Vérifier la cible d'un lien avec `document.elementFromPoint`, sans cliquer.
+ « Terminer » ne clôt rien tant qu'aucune réponse n'est envoyée et qu'il reste du temps : WIMS montre le détail du
  score. Ce n'est pas une panne.

#verifier[élève en examen à 390 px : chronomètre visible, « Terminer » accessible ; fin du temps ; page qui confirme
« Terminer » ; reconnexion pendant un examen ; classe à connexion CAS si le site en a.]

== Modifier une feuille d'exercices ou un tableau de notes <feuilles>

#ou[`js/src/40-feuilles-notes.js`, `_widgets/couleurs-notes.phtml`, `notes-detail.phtml`, `contenu.css`.]

#table(columns: (1fr, 1.6fr), align: left,
  [Ce qui est en cause], [Où],
  [les cartes d'exercices d'une feuille (élève)], [`feuilleExercices`, `feuilleProgression` ; `contenu.css` (`li.wims_sheet_item`) ; réglage `listes`],
  [les barres de score], [`scores`],
  [l'historique des essais d'un examen], [`historique`, `ajusterHistoriques`],
  [les couleurs des notes], [`--nova-note-*` de `jetons.css` ; `_widgets/couleurs-notes.phtml`],
  [les tableaux de notes de l'enseignant], [`notesExamens`, `libellesNotes`, `notesColonnes`, `legendeTypes`, `notesNaN` ; réglages `notes-eleve`, `notes-enseignant`],
  [le détail des notes d'un élève], [`notesDetail` ; `_widgets/notes-detail.phtml` (textes)],
)

=== Ajouter une information sur la carte d'un exercice

+ L'information doit déjà être dans la page de WIMS (un texte, un attribut `title`) : `feuilleExercices` ne fait que
  réordonner ce que WIMS a écrit. Si elle n'y est pas, il faut un widget côté serveur (@serveur).
+ Dans `feuilleExercices`, créer l'élément et l'ajouter à la carte (`li.wims_sheet_item`).
+ Style dans `contenu.css`. La règle commune des cartes, `li.wims_sheet_item > :not(…)`, est forte : une règle
  `li.wims_sheet_item .x` perd contre elle. Écrire `li.wims_sheet_item > div.x`.
+ La classe `.nova-score` sert à la fois de barre de score et d'étiquette de feuille : toujours la qualifier
  (`.nova-scores .nova-score`).
+ Texte : attribut de l'élément de textes de la feuille (`lang/eleve-textes.phtml.<l>`, @textes).

=== Changer les couleurs des notes

+ Les quatre couleurs sont `--nova-note-rouge`, `-orange`, `-jaune`, `-vert` (plus `-np` pour « non passé » et
  `-zero`) dans `jetons.css` : les changer là change les barres, les pastilles et les tableaux.
+ Les *tranches* (1 à 3 rouge, 4 à 6 orange, 7 et 8 jaune, 9 et 10 vert) sont dans
  `_widgets/couleurs-notes.phtml` pour les tableaux de WIMS (une règle écrite par couleur de la classe), et à
  trois endroits de `40-feuilles-notes.js` pour ce que Nova dessine (chercher `'rouge'`) : les changer ensemble.
+ Vérifier le contraste du texte posé sur chaque couleur.

=== Modifier un tableau de notes

+ Repérer le tableau par sa classe ou sa légende, et la fonction qui le traite (table ci-dessus).
+ Lire une colonne par son *en-tête*, pas par son rang : un exercice non fait a plus de cases que l'en-tête n'a de
  colonnes. Ignorer les lignes qui contiennent des `th` (WIMS écrit la légende dans l'en-tête, et le navigateur
  range alors la ligne d'en-tête dans le corps).
+ Mesurer en une fois : lire toutes les largeurs, calculer, puis écrire (`ajusterHistoriques` est le modèle).

#verifier[un élève sans note, avec des notes partielles, avec tout réussi ; l'enseignant sur le tableau de la
classe et sur le détail d'un élève ; à 390 px, les tableaux défilent sans élargir la page.]

== Ajouter un badge, un élément d'avatar ou une couleur ; régler « Mon activité » <recompenses>

#table(columns: (0.6fr, 1.9fr), align: left,
  [Fonction], [Fichiers],
  [Badges], [`_procs/badges.awk` (calcul sur l'accueil de l'élève, niveaux dans `score/<login>.nova_badges`), `user.phtml`, `js/src/60-eleve.js`, `img/badges/`, `composants-reglages-badges.css`],
  [Ma couleur], [`_widgets/couleur-choix.phtml`, `js/src/61-couleur.js`, `_css/couleur.css`],
  [Avatar], [`_procs/avatar.awk`, `avatar.proc`, `avatar-catalogue.txt` (éléments et prix), `avatar-zones.sh`, `avatars-classe.sh`, `avatars-retour.sh` ; `_widgets/avatar*.phtml`, `avatars-*.phtml` ; `js/src/62-avatar.js`, `js/avatar.js` (DiceBear, voir `js/avatar.LISEZMOI.txt`, construit par `js/avatar-source.mjs`), `js/avatar-extras.js` (construit par `construire-avatar.py` depuis `_avatar/`), `_css/avatar.css`],
  [Mon activité], [`_procs/activite.awk`, `_widgets/activite.phtml`, `activite-entree.phtml`, `_css/activite.css` ; vacances : `_procs/vacances-zones.txt`, mis à jour par `maj-vacances.py`],
)
Un nouveau badge ou un nouvel élément d'avatar commence par une *maquette* validée (@choix). Les scripts `awk`
tournent sous mawk 1.3.4 : pas de `{n}` dans les expressions régulières, pas de `mktime`.

Les fichiers de l'élève (`score/<login>.nova_badges`, `.nova_avatar`, `.nova_couleur`) ont changé de nom et de place
une fois ; le bouton « Préparer le retour » du trombinoscope en découle. Avant de toucher à ces fichiers, lire
@compatibilite.

=== Changer les paliers ou les seuils d'un badge

Rien à coder : ce sont des réglages (`--nova-fidelite-paliers`, `--nova-perseverance-reussite`,
`--nova-echauffement-sessions`, `--nova-top-seuil`…). Valeur par défaut dans `jetons.css` ; un site ou une classe les
change dans « Réglages de Nova ». Un niveau gagné n'est jamais retiré : il est gardé dans le fichier de l'élève.

=== Ajouter un élément à l'avatar

Le catalogue est `_procs/avatar-catalogue.txt` : une ligne par élément, dans l'ordre d'affichage.
```
<catégorie> <valeur> <prix> [mois=<m>,<m>…]
top froBand 2                 coiffure rare : 2 pièces
noel bonnetNoel 1 mois=12     proposé et dessiné en décembre seulement
```
Prix : `libre` (ouvert d'office), `1` ou `2` (pièces), ou `<badge>:<niveau>` (récompense d'un badge : `fidelite`,
`perseverance`, `echauffement`, `top`).
- *Un élément que DiceBear dessine déjà* (style Avataaars) : ajouter sa ligne, avec la valeur exacte de DiceBear.
- *Un élément dessiné pour Nova* :
  + le dessiner dans Inkscape sur la tête de référence (page de 280 × 280), en partant d'un fichier de
    `_avatar/noel/` ; l'enregistrer en `_avatar/<catégorie>/<valeur>.svg` ;
  + `./construire-avatar.py` (il produit `js/avatar-extras.js` et pose son empreinte dans `62-avatar.js`) ;
  + `./construire-js.sh` ;
  + ajouter la ligne au catalogue.
- *Changer un prix, retirer un élément* : modifier ou retirer sa ligne, puis regarder l'avatar d'un élève qui
  portait l'élément retiré.
- Une *catégorie nouvelle* s'ajoute en plus à `AVATAR_CATEGORIES` de `62-avatar.js` (ordre des onglets), à
  `AVATAR_EXTRAS` si elle est dessinée pour Nova, et demande son texte.

=== Ajouter un badge

C'est le changement le plus large du thème : une vingtaine de fichiers. Suivre un badge existant pas à pas :
`grep -a -rl echauffement --exclude=css.css --exclude=nova.js .` donne la liste. Dans l'ordre :
+ *Maquette* des huit niveaux, validée ; images dans `img/badges/<dossier>/<nom>_01.webp` à `_08.webp`.
+ *Réglages* dans `jetons.css` : `--nova-<clé>-paliers` (huit nombres) et les seuils du calcul ; la clé s'ajoute
  aux valeurs possibles de `--nova-badges-actifs`.
+ *Calcul* dans `_procs/badges.awk` : lire les réglages (section `#conf`), compter d'après les notes (section
  `#score`), garder le niveau dans le stock (section `#stock`), et écrire une ligne de sortie de la même forme que
  les autres : `<clé> on niveau total prochain nouveau obtenu np palier1 … palierN`, ou `<clé> off`.
+ *Affichage de l'élève* : `user.phtml` transmet la ligne ; dans `60-eleve.js`, `badges` construit un panneau par
  badge (suivre `echauffement`), `fenetreBadges` et `pastilleBadges` annoncent un niveau gagné.
+ *Textes* : nom, aide, annonces dans `lang/eleve-textes.phtml.<l>` ; réglages dans
  `lang/enseignant-textes.phtml.<l>`.
+ *Réglages de Nova* : les champs dans `_widgets/apparence-classe.phtml`, leur enregistrement dans
  `80-reglages.js` (@reglage).
+ *Ce qui dépend des badges* : `_procs/avatar.awk` (pièces et éléments débloqués, trombinoscope), le catalogue de
  l'avatar (`<clé>:<niveau>`), `61-couleur.js` (badge qui débloque « Ma couleur »), `70-enseignant.js`.
+ *Retour à une version antérieure* : le stock garde une ligne par badge. Essayer la version précédente sur un
  élève qui a la nouvelle ligne : elle doit l'ignorer sans rien perdre (@compatibilite).
+ `LISEZMOI.md` et `CHANGELOG.md`.

=== Ajouter une couleur ou un dégradé à « Ma couleur »

+ La palette et les dégradés (`DEGRADES` : un nom et deux couleurs de la palette) sont en tête de
  `js/src/61-couleur.js` : y ajouter la couleur ou le dégradé.
+ Vérifier le contraste du texte blanc posé dessus (au moins 3,5:1) : la couleur devient l'accent de l'élève
  (barre, boutons).
+ Le choix est enregistré par `_widgets/couleur-choix.phtml`, qui ne laisse passer qu'un nom de la palette, et
  appliqué par `user.phtml`, qui vérifie le droit de choisir : essayer le nouveau nom jusqu'au bout (choisir,
  recharger, se reconnecter).
+ `./construire-js.sh`.
Le niveau de badge qui débloque couleurs et dégradés est un réglage (`--nova-couleur-badge`,
`--nova-couleur-niveau`, `--nova-couleur-degrade`).

=== Régler « Mon activité » et les vacances

- *Seuils* (jours par semaine sous lesquels on encourage, objectif, heures, notes) : réglages
  `--nova-activite-seuil`, `-objectif`, `-heures`, `-notes` (@reglage). Le calcul est dans `_procs/activite.awk`.
- *Vacances scolaires* : `_procs/vacances-zones.txt`, une ligne par période :
  `<zone> <année> <nom> <début>-<fin>`. Le mettre à jour par `./maj-vacances.py` (dates officielles des zones A, B et C) avant une
  livraison ; le script n'est pas livré.

#verifier[un élève qui gagne un niveau (annonce une seule fois, niveau gardé après reconnexion) ; un élève dans une
zone d'un portail ; la page de l'enseignant (trombinoscope) ; badges ou avatar coupés par le réglage : rien ne
s'affiche ; élément de saison hors de son mois.]

== Ajouter un bouton ou une action à une page de l'enseignant <enseignant>

#ou[`js/src/70-enseignant.js` (le plus gros fichier : configuration, fiches de feuille et d'examen, séquences,
confirmations, export…), `_css/composants-enseignant.css`, widgets de textes (`fiche-ressource.phtml`,
`config-globale.phtml`, `capacite.phtml`, `acces-classe.phtml`, `confirmations.phtml`) et d'action
(`desactiver.phtml` + `_procs/desactiver.sh`, `propager.phtml` + `_procs/propager.sh`, `ecarts-zones.phtml`,
`sequences.phtml` + `_procs/sequences.sh`, `participants-zones.phtml`).]

=== Ajouter un bouton, une aide ou une carte

+ Repérer la page : son module (`adm/class/sheet`, `adm/class/config`…) et son `job`, lisibles dans l'adresse.
+ *Textes.* Ajouter une étiquette à `lang/enseignant-textes.phtml.<l>` (@textes) et la lire dans `header.phtml`
  sous la condition de la page :
  ```
  !if $module=adm/class/sheet and $wims_user=supervisor
    !read themes/$wims_theme/lang/enseignant-textes.phtml.$lang monbouton
  !endif
  ```
  Si le serveur doit aussi fournir des données, écrire un widget à la place (@serveur).
+ *Fonction* dans `70-enseignant.js`. Elle commence par chercher l'élément de textes et s'arrête s'il manque : c'est
  lui qui dit que la page est la bonne.
+ L'appeler dans `demarrage()` ; styles dans `composants-enseignant.css`.
+ `./construire-js.sh`, `./construire-css.sh`, `./verifier.sh`.

=== Demander une confirmation avant une action irréversible

Suivre `confirmationsRessources` (fenêtre de Nova) et `_widgets/confirmations.phtml` (ses textes). Beaucoup de liens
« Effacer » de WIMS sont de simples liens : la fonction retient le clic, ouvre la fenêtre, puis suit le lien
d'origine si l'enseignant confirme. Les boutons de danger sont en contour rouge sur la page ; le rouge plein est
réservé au bouton qui confirme, dans la fenêtre.

=== Ajouter une action qui écrit sur le serveur

Modèles : désactiver (`desactiver.phtml`), propager (`propager.phtml`), renuméroter (`sequences.phtml`).
+ Le bouton mène à une adresse de WIMS augmentée d'un paramètre : `…&nova_<action>=1`.
+ Un widget, lu par `header.phtml` sous la condition la plus étroite, lit ce paramètre, le filtre, vérifie le rôle
  *côté serveur*, puis lance un script de `_procs/` (@serveur).
+ Ajouter le paramètre à la liste que `adresseNette` (`00-commun.js`) retire de l'adresse : un rechargement de la
  page ne doit pas rejouer l'action.
+ Dire à l'enseignant ce qui a été fait : `actionAccueil` lance l'action en arrière-plan, `messageReporte` affiche
  son message en tête de la page de retour (`00-commun.js`).

=== Donner un contenu à une page vide

`pagesVides` pose une carte qui dit quoi faire sur une page sans ressource. Ajouter un cas : la condition qui
reconnaît la page, et son texte. La classe `.nova-vide` est déjà prise (elle masque) : la carte est
`.nova-page-vide`.

#verifier[enseignant d'une classe seule, puis d'un portail (la page existe-t-elle en zone ?) ; l'éditeur TinyMCE
actif et désactivé si la page a une zone de texte ; à 390 px.]

== Ajouter une information au suivi en direct <suivi>

#ou[`_widgets/suivi-entree.phtml` (accès : sessions autorisées par WIMS seulement), `suivi.phtml`,
`_procs/suivi.pl` (relevé en lecture seule), `js/suivi.js`, `_css/suivi.css`, `lang/suivi*.phtml`.]

Le suivi (salle informatique) est une page de Nova posée sur l'accueil (`module=home&nova_suivi=1`). Elle a son
propre script : `suivi.js` n'est pas dans `nova.js`, il est chargé par `suivi.phtml` seulement.

+ *Relever* l'information dans `_procs/suivi.pl` : il lit les fichiers de la classe sans rien écrire et sort un
  relevé en JSON. Ajouter le champ à l'enregistrement de l'élève.
+ *Afficher* le champ dans `js/suivi.js`, puis augmenter le numéro de `suivi.js?v=…` dans `_widgets/suivi.phtml` :
  sans cela, les navigateurs gardent l'ancien script.
+ *Textes* : `nova_sv_…` pour le gabarit (`lang/suivi.phtml.<l>`), `nova_svj_…` pour `suivi.js` (élément
  `#nova-suivi-textes`).
+ *Styles* : `_css/suivi.css`, puis `./construire-css.sh`.
+ Ne pas élargir la condition de `suivi-entree.phtml` : la page montre le travail de tous les élèves.

#verifier[deux élèves connectés qui travaillent pendant que la page est ouverte ; une classe et une zone de
portail ; un élève en examen.]

== Ajouter une icône <icones>

Nova n'utilise que le jeu *Lucide* (licence ISC, https://lucide.dev). Deux cas.

*Une icône dans une règle de Nova* (bouton, carte, repère) : un masque SVG en `data:`, coloré par la couleur du texte.
+ Choisir l'icône sur le site de Lucide et copier le contenu de son SVG (les balises `path`, `circle`…).
+ L'écrire sur un pseudo-élément, en encodant `<` en `%3C` et `>` en `%3E`, avec des apostrophes à l'intérieur :
  ```css
  .nova-mon-bouton::before {
    content: ""; flex: none; width: 18px; height: 18px;
    background: currentColor;
    -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") center / contain no-repeat;
            mask: url("…le même…") center / contain no-repeat;
  }
  ```
  Les deux lignes `-webkit-mask` et `mask` sont nécessaires. La couleur vient de `background` : `stroke='black'` ne
  sert qu'à dessiner le masque.
+ `./construire-css.sh`, puis regarder l'icône : un masque mal écrit ne donne aucune erreur, seulement un carré plein
  ou rien.

#attention[Jamais de `#` brut dans un SVG en `data:` (`stroke="#000"` coupe l'adresse, l'icône disparaît sans
erreur) : écrire `stroke='black'` ou `%23`.]

*Une icône d'entrée de menu ou de barre de WIMS* : elle vient du jeu d'icônes choisi par le site (`default`,
Font_Awesome, ou Lucide fourni par Nova). Donner à l'entrée une classe que ces jeux connaissent (@menu). Pour changer
l'icône Lucide d'une classe de WIMS, ou en donner une à une entrée de Nova : `icones/correspondance.py` (`G` : glyphe
Font Awesome → icône Lucide ; `C` : classes de WIMS corrigées ; `E` : entrées propres à Nova), puis reconstruire
`icones/Lucide/icon-min.css` par `icones/construire-lucide.py` (ses arguments sont décrits en tête du script).
`_procs/jeu-icones.sh` crée le lien `gifs/themes/Lucide` à la première page de configuration.

#verifier[avec le jeu `default` (aucune icône de WIMS), Font_Awesome et Lucide : pas de tiret devant l'entrée, pas
de double icône.]

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
  [Pas de Foundation complet], [64 Ko de CSS et 210 Ko de JS par page pour quelques classes utilisées], [`foundation-min.css` ; plus de JS de Foundation : ses composants sont repris dans `20-composants.js`],
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

== Compatibilité d'une version à l'autre <compatibilite>

Un site doit pouvoir installer une version de Nova, puis revenir à la précédente, sans que les élèves perdent rien.
Cette règle a été rompue une fois, le 12 novembre 2026 ; le bouton « Préparer le retour » existe pour réparer cela.

=== Ce qui a changé le 12 novembre 2026

#table(columns: (0.8fr, 1.3fr, 1.3fr), align: left,
  [Donnée de l'élève], [Avant (1.3 et premières livraisons de la 1.4)], [Depuis],
  [Avatar (choix, éléments achetés)], [`.nova_avatar_<login>` à la racine de la classe ou de la structure], [`score/<login>.nova_avatar`],
  [Couleur personnelle], [`.nova_couleur_<login>` à la racine], [`score/<login>.nova_couleur`],
  [Niveaux des badges], [`score/<login>.nova` dans chaque zone], [`score/<login>.nova_badges` dans chaque zone],
)

Pourquoi :
- *Avatar et couleur.* WIMS ne s'occupe que du dossier `score/` d'une classe. Un fichier posé à la racine n'était
  pas dans la sauvegarde de la classe, ne suivait pas un élève supprimé puis rétabli, et n'était pas effacé par
  « nettoyer la classe » (il revenait donc l'année suivante, sans les notes qui le justifiaient). Dans `score/`, WIMS
  fait tout cela seul.
- *Badges.* Le nom `.nova` ne disait pas ce que le fichier contenait ; il a été aligné sur les deux autres.
- Dans une structure (portail, groupement), la référence est le `score/` de la racine ; `_procs/avatar-zones.sh` en
  met une copie dans chaque zone de l'élève, pour qu'elle parte avec la sauvegarde de la zone. La copie la plus
  récente l'emporte partout.

Dans le sens de la montée, rien à faire : à la première visite de l'élève, la version actuelle déplace ses anciens
fichiers (`avatar.proc`, `user.phtml`, `_widgets/couleur-choix.phtml`) ; en attendant, les pages de l'enseignant
lisent le nouveau nom, sinon l'ancien (`avatars-classe.sh`, `suivi.pl`).

=== Ce que fait « Préparer le retour »

Une version d'avant le 12 novembre ne connaît que les anciens noms. Installée telle quelle après une version
récente, elle montrerait des élèves sans avatar ni couleur, et recalculerait les badges d'après les notes : niveau
perdu, ou badge annoncé une seconde fois.

Le bouton est en bas du trombinoscope de l'enseignant (page « Avatars des élèves »), quand l'avatar est activé.
Il appelle la page avec `nova_avatars_retour=1` ; `_widgets/avatars-classe.phtml` lance alors
`_procs/avatars-retour.sh`, qui, pour tous les élèves de la classe ou de la structure entière :
- recopie `score/<login>.nova_avatar` et `.nova_couleur` vers `.nova_avatar_<login>` et `.nova_couleur_<login>` ;
- recopie `score/<login>.nova_badges` en `score/<login>.nova` dans chaque zone ;
- garde la date des fichiers (`cp -p`) et ne retire rien.

À savoir :
- *Le faire juste avant de changer de version.* Tant que la version actuelle est en place, elle retire l'ancienne
  copie à la visite suivante de l'élève.
- *Le retour à la version actuelle se fait seul.* Un ancien fichier plus récent que celui de `score/` (l'élève a
  changé d'avatar ou gagné un niveau sous l'ancienne version) l'emporte ; sinon il est effacé.
- *Limite.* Le bouton n'est pas proposé quand l'avatar est coupé et que seuls les badges sont actifs : lancer alors
  le script à la main, `avatars-retour.sh <dossier de WIMS> <numéro de la classe ou de la structure>`.
- Le script n'utilise aucun fichier temporaire : `mktemp` échoue dans un script lancé depuis une page (@pieges).

=== La règle pour la suite

Ne plus casser la compatibilité. Sont concernés tous les endroits où Nova garde quelque chose d'une version à
l'autre : les fichiers `score/<login>.nova_…`, les réglages `--nova-…` écrits dans la feuille d'une classe et dans
`log/nova.conf`, les clés gardées dans le navigateur (`localStorage`).

+ *Ajouter, ne pas changer.* Une donnée nouvelle prend un fichier nouveau, ou un champ ajouté à la fin, qu'une
  ancienne version ignore. Ne renommer et ne déplacer un fichier, un réglage ou une clé que s'il n'y a pas d'autre
  solution.
+ *Ne pas changer le sens d'une valeur existante* (un réglage `oui`/`non`, l'ordre des champs d'un fichier) : une
  ancienne version la lirait de travers.
+ Si un changement est inévitable, le livrer complet :
  - la nouvelle version lit l'ancien format tant qu'il existe, et le convertit à la visite de l'élève ;
  - quand deux copies existent, la plus récente l'emporte ;
  - le chemin du retour est prévu dès la même livraison : une ligne de plus dans `avatars-retour.sh`, pas un
    second bouton ;
  - une ligne dans la rubrique Installation de `CHANGELOG.md`, et une ligne dans le tableau ci-dessus.
+ *Essayer le retour avant de livrer* : installer la version précédente à côté (`./livrer.sh <commit>`, dossier
  d'un autre nom : deux versions partagent les mêmes données), ouvrir un compte d'élève sous l'une puis sous
  l'autre, et comparer avatar, couleur et badges.

// ================================================================= 8
= Pièges à connaître <pieges>

Chaque piège ci-dessous a coûté du temps au moins une fois. Il est décrit en trois temps : *ce qu'on voit* (le
symptôme, souvent trompeur), *pourquoi* (le mécanisme de WIMS ou du navigateur en cause) et *que faire*. Beaucoup
découlent de l'ordre dans lequel WIMS assemble une page : relire le @assemblage si un « pourquoi » paraît obscur.

#let piege(titre, vu, cause, faire) = block(breakable: false, width: 100%, above: 1.1em, below: .4em)[
  #set par(justify: false)
  #text(weight: "bold", fill: accent)[#titre]
  #v(-.3em)
  #grid(columns: (5.2em, 1fr), column-gutter: .7em, row-gutter: .45em,
    text(8.5pt, weight: "bold", fill: luma(105))[On voit], vu,
    text(8.5pt, weight: "bold", fill: luma(105))[Pourquoi], cause,
    text(8.5pt, weight: "bold", fill: luma(105))[Que faire], faire)
]

== Fichiers, encodages et langage de WIMS

#piege[Des accents cassés (« Ã© ») dans une page ou un texte][
  Un « é » s'affiche « Ã© », ou un texte de `lang/` apparaît vide ou tronqué.
][
  WIMS lit gabarits et fichiers de `lang/` octet par octet, sans conversion, et la page est déclarée en
  windows-1252. Un fichier enregistré en UTF-8 code « é » sur deux octets : le navigateur affiche deux caractères.
][
  Enregistrer ces fichiers en latin-1 (ISO-8859-1) : régler l'éditeur par extension (`*.phtml`, `lang/*`).
  `./verifier.sh` contrôle l'encodage. Pour chercher dedans, toujours `grep -a` : sans cette option, certains `grep`
  prennent un fichier latin-1 pour un fichier binaire et le sautent sans rien dire.
]

#piege[Un caractère accentué dans le JavaScript][
  Tout `nova.js` cesse de fonctionner, ou un texte affiché par le script est faux.
][
  `nova.js` est lui aussi servi en windows-1252. Un « é » tapé en UTF-8 y arrive en deux caractères. Autre
  variante vécue : un outil d'écriture (éditeur, script) a transformé l'échappement `\u0300` d'une expression
  régulière en vrai caractère ; l'expression ne voulait plus rien dire et le script entier s'est arrêté.
][
  Pas de caractère non ASCII dans le code, hors commentaires : écrire `'\u00e9'`. Mieux : mettre le texte dans
  `lang/` (@textes). `./verifier.sh` signale tout caractère non ASCII hors commentaire : le lancer après chaque
  modification de `js/src/`. En CSS, même règle : `content: "\203A"`, et pour une variable au texte accentué
  (`"not\e9"`) la lire par la fonction `texteCss` de `00-commun.js` (Chrome rend l'échappement brut).
]

#piege[Un `$` qui disparaît dans un gabarit][
  Un sélecteur comme `[href$=".pdf"]` écrit dans un gabarit ne sélectionne rien ; un prix `5$` s'affiche `5`.
][
  Avant d'envoyer la page, WIMS remplace chaque `$nom` par la valeur de la variable `nom`. `$=` est pris pour une
  variable au nom vide, remplacée par rien.
][
  Doubler le signe : `$$=` (WIMS écrit un seul `$`). Vaut pour tout `$` qui doit arriver dans la page.
]

#piege[Des commandes `!if` qui apparaissent dans la page][
  Des lignes `!if …` ou `!read …` sont visibles dans le code source de la page, dans `<head>`.
][
  `htmlheader.phtml` n'est pas lu par l'interpréteur de gabarits mais par le programme C de WIMS (`config.c`), qui ne
  fait que remplacer les `$variables`. Aucune commande n'y est exécutée.
][
  Ne mettre dans `htmlheader.phtml` que du HTML, des variables et des scripts. Une décision (choisir une couleur selon
  la classe, par exemple) va dans un widget lu par `header.phtml` (ex. `_widgets/accent.phtml`).
]

#piege[Un texte remplacé par une valeur sans rapport][
  Le libellé d'un bouton est vide, ou affiche un nombre ou un identifiant.
][
  Toutes les variables d'une page WIMS partagent un seul espace de noms : textes de `lang/`, variables du module et
  variables de travail du thème. Un texte et une variable de travail de même nom s'écrasent (vécu : le texte
  d'un bouton remplacé par un paramètre d'achat de l'avatar).
][
  Préfixer les variables de travail du thème (`nova_…`) et donner aux textes des noms distincts. Encore mieux, pour un
  texte destiné à `nova.js` : les textes en clair, qui ne créent aucune variable (@textes).
]

#piege[« variable_name_buffer_overflow » sur une page chargée][
  Une erreur WIMS citant un fichier sans rapport, sur une page lourde seulement : exercice OEF dans une feuille,
  accueil de l'enseignant, configuration de la classe, version imprimable d'une feuille.
][
  WIMS réserve 32 Ko pour les *noms* de toutes les variables d'une page, partagés entre WIMS, le module (un exercice
  OEF en crée beaucoup) et le thème. Chaque nom compte environ 17 octets, et `!reset` ne libère rien. Le thème standard
  en utilise 17 à 19 Ko ; Nova monte à 28 ou 29 Ko sur les pages les plus chargées : la marge est faible.
][
  Ne pas créer de variable sans besoin : pas de `!set` pour un texte de `nova.js` (textes en clair) ; ne lire un
  fichier de `lang/` que dans la branche du gabarit qui s'en sert. `verifier.sh` plafonne `lang/name.phtml` (lu sur
  chaque page) à 4 000 octets de noms. Tester une nouveauté sur la version imprimable d'une longue feuille.
]

#piege[Un paramètre de l'adresse introuvable][
  `&nova_x=1` est dans l'adresse, mais `$nova_x` est vide dans le gabarit ; ou `$httpd_QUERY_STRING` montre une
  ancienne adresse.
][
  WIMS ne crée une variable que pour les paramètres déclarés par le module courant (`var.def`). Et
  `$httpd_QUERY_STRING`, comme `$httpd_HTTP_COOKIE`, est restitué depuis la session : c'est celui de la *connexion*,
  pas de la requête en cours.
][
  Lire la requête en cours par `!sh printf '%s' "$$QUERY_STRING"`, puis la découper par `!getopt` (voir
  `header.phtml`). La valeur lue est brute : la filtrer (piège suivant). Un choix de l'utilisateur fait après la
  connexion ne peut pas passer par un cookie lu côté serveur.
]

#piege[Une valeur de l'adresse exécutée par le serveur][
  Rien de visible : c'est une faille. Une adresse fabriquée (avec `;`, des accents graves) fait exécuter une commande.
][
  Une valeur venue de l'adresse (y compris `$class` ou `$exam`) est collée telle quelle par WIMS dans une ligne `!sh`
  ou dans la page. Les guillemets autour n'y changent rien.
][
  Toujours la réduire avant usage : `!text select 0123456789 in $x` pour un nombre (sans le mot `char`, qui serait
  pris comme liste de caractères), ou la comparer à une liste connue (`isitemof`). `!bound` avant `!writefile`.
  N'écrire dans la page que ce que `nova.js` lit, jamais un fichier entier.
]

#piege[Le nom du dossier du thème][
  Après un renommage du dossier, `css.css` n'est plus chargé (nom avec un point), ou les accueils retombent sur le
  thème par défaut (nom avec un tiret ou un soulignement).
][
  WIMS refuse de charger la feuille d'un thème dont le nom contient un point, et l'accueil ne garde que lettres,
  chiffres et `/` du nom pour trouver ses gabarits.
][
  Lettres et chiffres seulement (`Nova`, `Nova14`) ; `livrer.sh` refuse les autres noms. Dans le code, toujours
  `themes/$wims_theme/…`, jamais `themes/Nova/…`.
]

== Écrire et calculer sur le serveur

#piege[Un `!writefile` qui n'écrit rien][
  Le fichier attendu n'existe pas, sans aucun message d'erreur.
][
  WIMS n'autorise l'écriture dans `wimshome/` que depuis un module « de confiance » (accueil `home`, modules `adm/…`)
  et ne crée *jamais* de dossier. Un gabarit du thème hérite des droits du module de la page où il est lu.
][
  Écrire depuis l'accueil (`user.phtml`, module `home`), dans un dossier qui existe déjà. Une donnée propre à un élève
  va dans `score/` de la classe, sous le nom de l'élève suivi d'un suffixe : elle est alors sauvegardée, cachée et
  restaurée avec ses notes. Un fichier à la racine de la classe n'est pas sauvegardé.
]

#piege[Un script `.proc` de WIMS qui ne fait rien][
  Des lignes `x=…` apparaissent en texte dans la page, et les variables restent vides.
][
  Les `.proc` de WIMS affectent par `x=…`, sans `!set`. Lus par `!read`, en mode page, ces lignes sont du texte à
  afficher.
][
  Les lire par `!readproc`.
]

#piege[Un script shell qui échoue seulement depuis une page][
  Un script de `_procs/` fonctionne lancé à la main dans le conteneur, mais ne fait rien quand une page l'appelle.
][
  Lancé par `!sh` depuis une page, il tourne dans un environnement restreint : `mktemp` y échoue, par exemple.
][
  Pas de fichier temporaire hors de la session : enchaîner par des tubes (`|`). Tester le script depuis une vraie page.
]

#piege[La feuille de style d'une classe vidée à l'enregistrement][
  Après « Enregistrer » dans la configuration d'une classe, sa feuille de style est vide ou tronquée.
][
  WIMS range plusieurs champs dans un même fichier, séparés par des lignes qui commencent par « : ». Une feuille qui
  contient une ligne `:root {` est coupée là.
][
  Ne jamais écrire de ligne qui commence par « : » dans une feuille de classe : `html:root { … }`. Pour lire un tel
  fichier depuis le thème, `!sh cat` plutôt que `!record`.
]

#piege[Une action du thème que l'index de WIMS ne voit pas][
  Le thème modifie un fichier de la classe (ordre des séquences, par exemple), la page le montre, mais une autre
  page de WIMS affiche encore l'ancien état.
][
  Le module calcule ses index (`var.proc`) *avant* que `header.phtml` soit lu, et n'affiche son gabarit qu'*après*.
  Une action du thème est vue par le gabarit, pas par ce que le module a déjà calculé ou écrit.
][
  Mettre à jour aussi les index concernés (voir `_procs/sequences.sh`), ou faire l'action sur une page où le module
  relit ses fichiers ensuite.
]

#piege[« Terminer » un examen déconnecte l'élève][
  L'élève qui termine un examen se retrouve déconnecté.
][
  WIMS garde l'examen dans la session de connexion ; « Terminer » efface la session entière. Ce n'est pas Nova.
][
  Rien à corriger dans le thème ; le savoir pour ne pas chercher une panne qui n'existe pas.
]

== CSS

#piege[Une règle de Nova sans effet][
  La règle est bien dans `_css/`, `css.css` est reconstruit, mais l'élément ne change pas.
][
  Les feuilles de WIMS restent chargées (Nova les surcharge sans les réécrire), et certaines ont des sélecteurs plus
  forts. Exemple : `.ui-widget input[type="submit"]` (spécificité 0,2,1) l'emporte sur `input[type="submit"]` (0,1,1),
  même placée avant. Autre cause : `:not(a, b)` prend la spécificité de son argument *le plus fort*, si bien qu'une
  règle commune en `:not(…)` peut battre une règle plus précise en apparence.
][
  Dans les outils du navigateur (Inspecter › Styles), repérer la règle gagnante et reprendre son préfixe
  (`.ui-widget input[…]`), ou ajouter un type d'élément (`li.x > div.y` au lieu de `li.x .y`). Vérifier que la règle
  est bien arrivée dans `css.css` : `grep -a`.
]

#piege[Une classe de Nova qui existe déjà][
  Un élément créé par Nova est invisible alors que son code paraît juste.
][
  Le nom de classe choisi est déjà utilisé ailleurs dans Nova avec un autre sens : `.nova-vide` masque un bloc
  (`display: none !important`). Autre cas : `.nova-score` désigne à la fois une barre et une étiquette.
][
  Avant de nommer une classe, la chercher dans `css.css` (`grep -a 'nova-xxx' css.css`). Qualifier un sélecteur
  ambigu par son parent (`.nova-scores .nova-score`).
]

#piege[Une règle trop large qui touche WIMS][
  Après une règle sur `.inline` ou `input ~ label`, des éléments de WIMS sans rapport changent ou disparaissent.
][
  WIMS réutilise des noms génériques : les segments `.wims_seed_item` portent aussi la classe `inline` ; les boutons
  radio écrits par `!formradio` sont suivis de leurs libellés frères, que `input ~ label` atteint.
][
  Viser précisément : exclure `:is([type=radio], [type=checkbox]) + label`, qualifier par le conteneur. Comparer les
  pages avant et après (@chap-verifier).
]

#piege[Une icône SVG en `data:` qui n'apparaît pas][
  L'icône, définie par une image `url("data:image/svg+xml,…")`, n'est pas affichée ; aucune erreur.
][
  Dans une adresse, `#` annonce la fin de l'adresse (le fragment). `stroke="#000"` coupe donc le SVG en deux.
][
  Écrire les couleurs par leur nom (`black`) ou encoder le signe (`%23000`).
]

#piege[Un tiret devant une entrée de menu, sur certains serveurs seulement][
  Une entrée ajoutée par Nova dans la barre ou un menu porte un tiret « – » devant son libellé, chez un utilisateur
  mais pas sur le poste de développement.
][
  Le serveur utilise le jeu d'icônes Font_Awesome de WIMS, dont la feuille pose `content: "\f068"` (un tiret) devant
  tout lien de menu sans icône. Le poste de développement est souvent en jeu `default`, qui ne le fait pas.
][
  Toute entrée de barre créée par Nova a son propre `::before` (pictogramme ou `content: none`) ; une entrée de menu
  prend une classe que la feuille Font_Awesome connaît (`heart`, `star`…). Tester en injectant
  `gifs/themes/Font_Awesome/icon-min.css` (@chap-verifier).
]

#piege[`position: sticky` qui ne colle pas au téléphone][
  Un élément censé rester visible en haut de l'écran défile avec la page au téléphone.
][
  Au téléphone, `.wimsbody` défile en largeur (`overflow-x: auto`, filet de sécurité contre les débordements) : un
  élément `sticky` se colle alors au bord de `.wimsbody`, qui défile lui-même, et non à l'écran.
][
  Position fixe plus un repère dans la page (voir `boutonsCollants` dans `20-composants.js`).
]

#piege[Un masquage qui ne masque pas][
  Le code pose l'attribut `hidden`, un test dit « masqué », mais l'élément est visible.
][
  `hidden` n'est qu'un `display: none` par défaut du navigateur : une règle `display` de WIMS l'emporte.
][
  Masquer par une classe de Nova ; vérifier un masquage par la taille réelle (`getBoundingClientRect`), jamais par
  la présence de l'attribut.
]

#piege[Une page lente au téléphone][
  Sur un téléphone modeste, la page met du temps à réagir après le chargement ou à chaque action.
][
  `css.css` est lourd ; un sélecteur `body:has(…)` oblige le navigateur à revérifier tout le document à chaque
  changement, et chaque lecture de style (`getComputedStyle`, une taille) après une écriture recalcule toute la page
  (40 à 60 ms chaque fois).
][
  En CSS, préfixer par une classe posée tôt sur `html` (`html.nova-role-eleve`), jamais `body:has(#…)`. En
  JavaScript, lire les réglages par `racineStyle()` (`00-commun.js`), et regrouper : tout lire, calculer, puis tout
  écrire.
]

#piege[L'ancien aspect après une mise à jour][
  Après le dépôt d'une nouvelle version, un utilisateur voit encore l'ancien aspect, parfois des jours.
][
  WIMS appelle la feuille `css.css?ver=<version de WIMS>` : son adresse ne change pas quand le thème change, et le
  navigateur garde l'ancienne en cache.
][
  Rien à faire en production : `construire-css.sh` écrit une empreinte, et `nova.js` recharge la feuille si elle ne
  correspond pas. En développement, vider le cache (ou désactiver le cache dans les outils du navigateur).
]

== JavaScript

#piege[L'élément d'origine apparaît une fraction de seconde][
  Au chargement, la page de WIMS s'affiche brièvement telle quelle, puis Nova la transforme (« clignotement »).
][
  `nova.js` est chargé en différé : il ne passe qu'après le premier affichage.
][
  Masquer en CSS ce que le script va remplacer, sous la classe `.nova-js` (posée par le script de tête : sans
  JavaScript, la page reste complète), avec un délai de secours si le script ne transforme rien. Reconnaître
  l'élément par sa *structure* (`div:has(> .corr_label)`), pas par une classe que `nova.js` posera trop tard.
  Vérifier en bloquant `nova.js` (@js).
]

#piege[Un élément introuvable au démarrage de `nova.js`][
  `document.querySelector` renvoie `null` pour un élément pourtant visible dans la page finale.
][
  `nova.js` démarre avant le `DOMContentLoaded` sur lequel attendent WIMS et ses bibliothèques. Les éditeurs
  TinyMCE n'existent pas encore ; les liens « Aide » sont encore dans la barre du haut (`#wimstopbox`), pas dans le
  menu où WIMS les range ensuite.
][
  Se brancher sur l'évènement de la bibliothèque (`tinymce.on('AddEditor')`), ou viser un élément par un sélecteur
  sans conteneur (`a[href*="cmd=help"]`).
]

#piege[Une modification du formulaire perdue à l'envoi][
  `nova.js` modifie un champ juste avant l'envoi, mais le serveur reçoit l'ancienne valeur (zones de texte riche).
][
  TinyMCE recopie son contenu dans la zone de texte à son propre écouteur `submit`, posé *après* ceux de Nova :
  il écrase la modification.
][
  Agir sur ce qui part par l'évènement `formdata`, le seul qui passe après la recopie.
]

#piege[`new MouseEvent` qui échoue dans un exercice][
  Une erreur « MouseEvent is not a constructor » (ou un clic simulé sans effet) sur les exercices à glisser.
][
  La bibliothèque Dynapi de WIMS remplace les objets globaux `MouseEvent` et `DragEvent` du navigateur.
][
  Créer l'évènement par `document.createEvent('MouseEvents')`.
]

#piege[Un sélecteur qui attrape trop][
  `el.querySelectorAll('ul a')` renvoie aussi des liens hors de `el`, ou une règle masque des alertes sans rapport.
][
  Dans `querySelectorAll`, tout le sélecteur est évalué dans le document : `ul` peut être un *ancêtre* de `el`. De
  même, les attributs `data-*` qui portent les textes de `nova.js` sont dans la barre : un sélecteur
  `[data-quelque-chose]` les atteint.
][
  Viser précisément (`#lang_list a`, `:scope > ul a`). Ne jamais se servir des attributs de textes comme repères ;
  qualifier un sélecteur par la classe de l'élément visé.
]

== Exercices

#piege[Une réponse sur image faussement comptée fausse][
  Sur un exercice où l'on clique dans une image, l'élève clique au bon endroit et la réponse est fausse.
][
  `<input type="image">` envoie la position du clic en pixels *affichés*, que WIMS lit en pixels de l'image : toute
  réduction de l'image (au téléphone) décale la réponse.
][
  Ne jamais réduire ces images (`max-width: none`, la zone défile) ; `nova.js` (`imagesCliquables`) convertit les
  coordonnées en secours.
]

#piege[Des cases ou des étiquettes décalées dans un exercice à glisser][
  Les cases à remplir ne sont plus en face du texte, ou les étiquettes échappent aux règles CSS de Nova.
][
  Dynapi crée ses calques *après* le chargement, en position absolue, d'après des repères (`a` d'identifiant
  `fill` suivi d'un numéro) ; une marge ajoutée trop tôt n'est pas encore mesurée. Ses étiquettes sont placées
  directement dans `<body>`, hors de `.wimsbody`. L'état d'une case est une couleur de fond posée *en ligne*.
][
  Insérer du contenu au-dessus avant le chargement ; ajuster tailles et positions dans l'enveloppe de `setAnchor`
  (`40-exercices.js`) ; ne pas préfixer par `.wimsbody` les règles des étiquettes ; lire l'état par la couleur
  (`[style*="rgb(96, 96, 255)"]`) sans l'effacer. Ne jamais changer le nombre de cases par ligne (`f_cut`) : des
  exercices en dépendent.
]

#piege[Une formule qui refuse de grandir][
  Augmenter la taille de police autour d'une formule ne change pas sa largeur.
][
  MathJax recalcule son échelle d'après la police environnante : la formule reste de la même taille.
][
  Agrandir par `zoom` sur `.wims_mathml` ; mesurer `mjx-container` une fois MathJax fini (il retouche encore la page
  environ une seconde après le chargement).
]

#piege[La note de l'exercice absente de la page de réponse][
  Sur la page de réponse, la note de fin d'exercice ou de série n'apparaît pas.
][
  WIMS l'écrit dans `.answer_analysis`, que le verdict de Nova masque (il le remplace par une présentation plus
  lisible).
][
  C'est voulu : l'élève voit sa note sur la feuille. Le réglage « standard » `reponse` rend l'affichage de WIMS.
]

#piege[Une image de fond manquante dans un exercice de géométrie][
  Seules des flèches s'affichent ; l'élève répond à l'aveugle.
][
  L'outil de dessin de WIMS (`flydraw`) ne lit nativement que le GIF ; un JPEG ou un PNG passe par ImageMagick.
  Sans lui, aucune erreur.
][
  Installer ImageMagick sur le serveur (`INSTALLER.md`). Ce n'est pas le thème.
]

== Menus

#piege[Une rubrique entière du menu disparaît pour les élèves][
  Pour les élèves d'une classe qui masque les « Liens externes », une rubrique complète (Profil, Déconnexion…)
  disparaît après l'ajout d'une entrée par Nova.
][
  Ce réglage masque *toute* rubrique qui contient un lien hors de `wims.cgi`, même un simple `#ancre`.
][
  Une entrée créée par Nova pointe toujours vers une adresse `wims.cgi`. Tester avec ce réglage activé.
]

#piege[Une ancre de lien qui ne correspond plus][
  Le script compare `location.hash` à `#a-b` et ne trouve rien, alors que le lien semble bon.
][
  WIMS encode l'ancre des entrées qu'on lui ajoute (`$wims_rm_0`, `local.phtml`) : `#a-b` devient `#a%2Db`.
][
  Comparer aux deux formes.
]

#piege[Le menu latéral au mauvais endroit][
  Le menu latéral apparaît sous la page, ou dans le contenu, sur certaines pages de WIMS.
][
  Sur la page de réponse d'un exercice, WIMS place le menu ailleurs ; un module au HTML déséquilibré fait refermer
  le conteneur avant le menu, que le navigateur range alors sous la page.
][
  `placerMenu` (`10-barre-menus.js`) le remet en place d'où qu'il vienne : toute règle du menu suppose
  `#wimsbodybox > #wimsmenumodubox`.
]

#piege[Des groupes de menu sans titre][
  Un groupe sans intitulé apparaît en tête du menu après l'ajout d'une rubrique.
][
  `local.phtml` modifie la liste des entrées *avant* que WIMS retire les séparateurs vides de tête : ils ouvrent
  alors des groupes vides.
][
  Retirer tous les séparateurs vides de tête avant d'insérer un groupe (voir `local.phtml`).
]

#piege[Les pages d'erreur de WIMS ne sont pas aux couleurs de Nova][
  Une page « erreur » de WIMS n'a ni barre, ni menu, ni comportement de Nova.
][
  Ces pages (`msg/user_error.phtml`) ne lisent aucun fichier du thème, seulement `css.css`.
][
  Seul le CSS peut les retoucher ; leur texte et leurs liens ne sont pas modifiables par le thème.
]

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
  [`guide-nova.typ`], [ce guide (Typst ; PDF dans l'archive livrée)],
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

Ce guide n'est utile que s'il dit vrai. Quatre mécanismes le tiennent à jour.

+ *Annexes produites à la compilation* (A, B, C, et les valeurs de l'@annexe-variables) : elles lisent les sources. Rien à faire, sauf si un fichier de
  `js/src/` est ajouté ou renommé : l'ajouter à la liste `js-fichiers` (@annexe-js ; la compilation échoue sinon sur un
  fichier disparu).
+ *Couverture* (contrôlée par `verifier.sh`, bloquante) : tout fichier de `_widgets/`, `_procs/`, `_css/`, `js/`,
  `js/src/`, `icones/`, de la racine, et tout groupe de `lang/` doit être *nommé* dans ce guide. Un fichier nouveau
  oblige donc à dire à quoi il sert, dans l'@annexe-fichiers et, s'il change une recette, au @recettes.
+ *Réglages* (contrôlé par `verifier.sh`, bloquant) : tout réglage `--nova-…` du bloc `:where(:root)` de `jetons.css`
  doit être décrit dans la liste `reglages-doc` de l'@annexe-variables. Un paramètre d'adresse, un fichier de données ou
  une clé de `localStorage` nouveaux s'ajoutent à la main dans la même annexe.
+ *Revue de structure* (signalée par `verifier.sh`, non bloquante) : tous les *40 commits* depuis la ligne
  « revue de structure » en tête du source, `verifier.sh` le rappelle. La revue répond à ces questions :
  - les objectifs du @recettes sont-ils encore ceux qu'on rencontre ? (relire les derniers messages de commit : un
    type de changement fréquent sans recette mérite une recette ; une recette jamais utilisée peut être raccourcie) ;
  - le tableau « Le guide en une page » renvoie-t-il aux bons fichiers ?
  - un fichier de `js/src/` ou de `_css/` a-t-il trop grossi (plus de 3 000 lignes, ou plusieurs domaines) ? le
    découper, et l'écrire ici ;
  - les pièges du @pieges sont-ils encore vrais ? en manque-t-il un qui a coûté du temps ?
  - les choix du @choix ont-ils changé ?
  - les mots de WIMS ou de Nova employés sans explication ont-ils une entrée dans le @annexe-glossaire ?
  Puis changer la date de la ligne « revue de structure », et le dire dans le message de commit.

À chaque changement du thème, en plus : mettre à jour la section concernée (une recette, une ligne de l'@annexe-fichiers,
un piège ; un mot nouveau dans le @annexe-glossaire). Un changement qui ne change rien à la façon de travailler (correction ponctuelle, nouveau texte) ne demande
rien.

= Installer un WIMS de développement <annexe-installer>

Nova se développe contre un vrai serveur WIMS 4.32 : les pages sont fabriquées par WIMS, et `construire-css.sh` lit
les feuilles communes de WIMS (`public_html/themes/_css/…`). Deux façons de l'avoir sur son poste : *dans un conteneur
Docker* ou *installé directement* sur une machine Linux (la vôtre, ou une machine virtuelle). Les deux donnent le même
WIMS ; seule change la façon de le loger.

== Lequel choisir

#table(columns: (auto, 1fr, 1fr), align: left,
  [], [Avec Docker], [Sans Docker],
  [Mise en place], [Une commande (`docker compose up -d --build`) une fois l'image décrite ; refaite à l'identique sur un autre poste.], [Paquets, compte `wims`, compilation et Apache à faire à la main, une fois.],
  [Effet sur le poste], [Aucun : Apache, Maxima, PARI/GP, TeX restent dans l'image. Supprimer le conteneur et ses volumes efface tout.], [Apache et les paquets de WIMS installés sur la machine ; un compte `wims` ; le port 80 occupé. Une machine virtuelle évite de toucher au poste.],
  [Thème], [Monté en lecture seule depuis votre dossier de travail : vous éditez chez vous, WIMS sert la même copie.], [Le dépôt doit être dans `public_html/themes/Nova` (ou y être lisible) : un peu de gymnastique de droits.],
  [Repartir de zéro], [Facile : `docker compose down -v`, ou copie des volumes (`log/`) pour garder un état de test et y revenir.], [Sauvegarder et restaurer `/home/wims/log` à la main.],
  [Commandes], [Tout accès aux fichiers de WIMS passe par `docker exec` ; les scripts de Nova le font seuls.], [Fichiers de WIMS lus directement (`less`, `grep`, éditeur) : plus simple pour lire les sources de WIMS.],
  [Pièges], [Ceux d'un conteneur (charge de la machine, numéro de compte, SELinux) : réglés par les fichiers ci-dessous.], [Ceux d'une installation de serveur (Apache, droits, CGI).],
  [Ressources], [Image d'environ 1,8 Go (TeX surtout) ; Docker ou Podman à installer.], [Les mêmes paquets, sans Docker.],
)

*Conseil* : Docker si vous l'avez déjà ou si plusieurs personnes doivent travailler sur le même serveur de test ; sans Docker si vous
préférez lire et modifier WIMS lui-même, ou si votre machine de développement est déjà une machine virtuelle dédiée.

== Ce qu'il faut dans les deux cas

- Les sources de WIMS 4.32, `wims-4.32.tgz`, sur la forge SourceSup de Renater, où WIMS est développé :
  #link("https://sourcesup.renater.fr/projects/wimsdev/")[`sourcesup.renater.fr/projects/wimsdev`] (rubrique des
  fichiers à télécharger).
- Une Debian récente (ou Ubuntu) et ces paquets :

```sh
apt install build-essential autoconf flex libfl-dev bison libgd-dev \
  libcrypt-dev libgmp-dev librecode-dev apache2 perl wget zip unzip \
  ca-certificates lsb-release tzdata maxima pari-gp imagemagick \
  texlive-latex-base texlive-fonts-recommended
```

  `imagemagick` : sans lui, `flydraw` ne lit pas les images JPEG/PNG et certaines figures d'exercice manquent sans
  erreur visible. `zip` : sauvegarde des classes au format .zip. `texlive` : formules composées en image.
- Des modules d'exercices pour avoir de quoi tester : page de maintenance du site
  (`wims.cgi?module=adm/manage`, compte gestionnaire), rubrique de téléchargement des modules.

== Sans Docker

Toutes les commandes en `wims` se lancent depuis `/home/wims`.

```sh
# 1. Le compte qui fait tourner WIMS
sudo useradd -m -d /home/wims -s /bin/bash wims
sudo cp wims-4.32.tgz /home/wims/ && sudo chown wims: /home/wims/wims-4.32.tgz

# 2. Décompresser et compiler, en tant que wims
sudo -iu wims
tar xzf wims-4.32.tgz
mkdir -p log
# Réponses aux questions de ./compile données d'avance (adapter) :
printf 'manager_site=127.0.0.1\nclass_regpass=all,all,all\n' > log/wims.conf
printf 'changez-moi\n' > log/.wimspass        # mot de passe du gestionnaire du site
chmod 600 log/wims.conf log/.wimspass
./compile --mathjax
exit

# 3. Brancher WIMS sur Apache, en root
cd /home/wims
sudo ./bin/setwrapexec
sudo ./bin/apache-config
sudo a2dismod -f mpm_event && sudo a2enmod mpm_prefork cgi
sudo systemctl restart apache2
```

WIMS répond alors sur `http://127.0.0.1/wims`. `class_regpass=all,all,all` permet de créer des classes de test sans
courrier électronique ; `--mathjax` affiche les formules comme sur un serveur de production.

*Le thème.* WIMS n'a besoin que de *lire* le dossier du thème. Le plus simple : votre dépôt directement à sa place,
à votre nom, lisible par tous.

```sh
export WIMS_THEMES=/home/wims/public_html/themes  # lu par construire-css.sh, livrer.sh
sudo install -d -o "$USER" "$WIMS_THEMES/Nova"
git clone https://github.com/sebastiencorreard/wims-theme-nova "$WIMS_THEMES/Nova"
chmod -R a+rX "$WIMS_THEMES/Nova"
```

Choisir ensuite Nova comme thème dans la configuration du site (page de maintenance) ou dans celle d'une classe de test.

== Avec Docker

Trois fichiers dans un dossier de travail, à côté de `wims-4.32.tgz` et d'un dossier `themes/Nova` (votre clone du
dépôt). Ils reprennent les étapes ci-dessus ; les commentaires disent ce qui est propre au conteneur.

`Dockerfile` :

```dockerfile
FROM debian:trixie
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential autoconf flex libfl-dev bison libgd-dev \
      libcrypt-dev libgmp-dev librecode-dev apache2 perl wget zip unzip \
      ca-certificates lsb-release tzdata procps maxima pari-gp imagemagick \
      texlive-latex-base texlive-fonts-recommended \
 && rm -rf /var/lib/apt/lists/*
# Numéro de compte propre au conteneur : avec 1000 (souvent le vôtre),
# le noyau compte aussi vos processus, WIMS atteint sa limite et tous
# ses scripts échouent.
RUN useradd -m -u 10432 -d /home/wims -s /bin/bash wims
COPY --chown=wims:wims wims-4.32.tgz /home/wims/
USER wims
WORKDIR /home/wims
# manager_site : « 172. » = adresse sous laquelle le conteneur voit l'hôte.
# threshold1/2 : le conteneur lit la charge de toute la machine ; sans
# ce réglage, WIMS refuse de nouvelles sessions dès que l'hôte travaille.
ARG MANAGER_PASSWORD=changez-moi
RUN tar xzf wims-4.32.tgz && rm wims-4.32.tgz && mkdir -p log \
 && printf 'manager_site=127.0.0.1 172.\nthreshold1=2000\n' > log/wims.conf \
 && printf 'threshold2=4000\nclass_regpass=all,all,all\n' >> log/wims.conf \
 && printf '%s\n' "$MANAGER_PASSWORD" > log/.wimspass \
 && chmod 600 log/wims.conf log/.wimspass \
 && ./compile --mathjax < /dev/null
USER root
RUN ./bin/setwrapexec && ./bin/apache-config \
 && a2dismod -f mpm_event && a2enmod mpm_prefork cgi
COPY entrypoint.sh /entrypoint.sh
EXPOSE 80
CMD ["/entrypoint.sh"]
```

`entrypoint.sh` (exécutable) :

```sh
#!/bin/sh
# Le volume log/ a pu être créé par une image où « wims » avait un autre numéro.
chown -R wims:wims /home/wims/log
exec apachectl -D FOREGROUND
```

`compose.yaml` :

```yaml
services:
  wims:
    build: .
    container_name: wims432
    ports:
      - "127.0.0.1:8080:80"
    volumes:
      # classes et réglages, gardés d'une image à l'autre
      - wims-log:/home/wims/log
      # modules téléchargés
      - wims-modules:/home/wims/public_html/modules
      # le thème, en lecture seule
      - ./themes/Nova:/home/wims/public_html/themes/Nova:ro,z
volumes:
  wims-log:
  wims-modules:
```

Puis `docker compose up -d --build` : WIMS répond sur `http://127.0.0.1:8080/wims`. Le `z` du montage sert aux
systèmes à SELinux (Fedora) ; ailleurs il est sans effet. Le démon de WIMS (`wimslogd`) n'a pas besoin d'être lancé :
WIMS le démarre à la première requête. Si le conteneur porte un autre nom que `wims432`, le donner aux scripts par
`CONTENEUR=<nom>`.

== Vérifier l'installation

+ La page d'accueil de WIMS s'affiche, et la maintenance (`wims.cgi?module=adm/manage`) accepte le mot de passe choisi.
+ Un exercice avec une formule et une figure s'affiche entièrement (TeX, MathJax, ImageMagick).
+ Nova choisi comme thème : la page change d'aspect ; `./construire-css.sh` se termine par
  « css.css : … octets, … feuilles » sans « Feuille introuvable ».

= Réglages, paramètres et données de Nova <annexe-variables>

Cette annexe liste ce qui *dure* : ce qu'un site règle, ce qu'une adresse transmet, ce que Nova garde sur le
serveur ou dans le navigateur. Tout ce qui y figure est soumis à la règle de compatibilité (@compatibilite) : on
ajoute, on ne renomme pas.

N'y figurent pas, volontairement : les variables de travail des gabarits (`nova_sl`, `nova_br`… : locales à un
bloc, décrites par le commentaire `!!` au-dessus de leur première affectation) et les textes (les fichiers de
`lang/` sont leur propre index, @textes).

== Réglages `--nova-…` <annexe-reglages>

Valeurs par défaut lues à la compilation dans `_css/jetons.css` (bloc `:where(:root)`). Un réglage se change, du
plus faible au plus fort, dans `log/nova.conf` (site), la feuille du portail ou du groupement, la feuille de la
classe (@reglage). Les valeurs sont des mots sans accent (`oui`, `non`, `defaut`, `aucune`), des nombres, ou des
listes séparées par des espaces.

#let jetons = read("/_css/jetons.css")
#let regle-decl = regex("--nova-([a-z0-9-]+):\s*([^;]+);")
#let defauts = {
  let d = (:)
  let bloc = jetons.match(regex("(?s):where\(:root\) \{(.*?)\n\}")).captures.at(0).replace(regex("(?s)/\*.*?\*/"), "")
  for m in bloc.matches(regle-decl) { d.insert(m.captures.at(0), m.captures.at(1).trim()) }
  d
}
#let reglages-doc = (
  ("Général", (
    ("animations", [Animations de Nova (étoiles, menus, carrousel…). Toujours coupées si l'appareil demande de réduire les animations.]),
    ("entree-directe", [L'élève qui n'a qu'un cours (portail) ou qu'une classe (groupement) y entre directement.]),
    ("clavier-maths", [Clavier mathématique tactile dans les champs de réponse.]),
    ("fil-fixe", [Fil d'Ariane de l'enseignant fixe sous la barre du haut, sur grand écran.]),
    ("decorations", [Décorations de saison de la barre.]),
    ("desactivation-forcee", [Autorise « Désactiver quand même » une ressource partagée ou utilisée dans un examen. Vérifié aussi côté serveur.]),
    ("masques-eleves", [Rubriques du menu masquées aux élèves : liste parmi `communication` et `liens`, ou `aucune`.]),
    ("communication-eleves", [Ancien réglage (rubrique Communication des élèves), gardé pour les classes qui l'ont posé ; remplacé par `masques-eleves`.]),
  )),
  ("« Mon activité »", (
    ("activite", [Remplace la page d'activité de WIMS par celle de Nova.]),
    ("activite-seuil", [Jours de travail par semaine en dessous desquels on encourage l'élève.]),
    ("activite-objectif", [Jours de travail visés par semaine.]),
    ("activite-heures", [Heures par semaine au-delà desquelles on invite à faire des pauses.]),
    ("activite-notes", [Nombre de dernières notes montrées.]),
    ("vacances", [Vacances scolaires : `zone-a`, `zone-b`, `zone-c` (dates livrées avec Nova), ou des périodes `AAAAMMJJ-AAAAMMJJ`.]),
  )),
  ("Badges", (
    ("badges", [Badges des élèves.]),
    ("badges-actifs", [Badges proposés : `tous`, `aucun`, ou une liste de clés (`fidelite`, `perseverance`, `echauffement`, `top`).]),
    ("fidelite-jours", [Régularité : jours différents avec une réponse envoyée pour qu'une semaine compte (1 à 7).]),
    ("fidelite-paliers", [Régularité : semaines comptées pour chaque niveau (huit au plus).]),
    ("perseverance-paliers", [Persévérance : exercices réussis après des difficultés, pour chaque niveau.]),
    ("perseverance-reussite", [Persévérance : note à atteindre (au moins).]),
    ("perseverance-echec", [Persévérance : une note strictement en dessous est une note faible.]),
    ("perseverance-echecs", [Persévérance : notes faibles nécessaires avant la réussite.]),
    ("perseverance-examens", [Persévérance : les examens comptent aussi.]),
    ("echauffement-sessions", [Échauffement : sessions d'entraînement complètes à faire avant d'ouvrir le DM noté.]),
    ("echauffement-paliers", [Échauffement : DM préparés pour chaque niveau.]),
    ("echauffement-entrainement", [Mots du titre qui désignent un entraînement (séparés par des virgules).]),
    ("echauffement-note", [Mots du titre qui désignent un DM noté.]),
    ("top-seuil", [Au top : note à atteindre à un DM noté.]),
    ("top-paliers", [Au top : DM notés réussis pour chaque niveau.]),
  )),
  ("DM WIMS", (
    ("dm-mots", [Mots du titre qui désignent un DM WIMS.]),
    ("dm-note-essais", [Nombre de sessions du DM noté créé par « Créer le DM noté ».]),
  )),
  ("« Ma couleur »", (
    ("couleur-badge", [Badge dont le niveau débloque la couleur personnelle.]),
    ("couleur-niveau", [Niveau de ce badge qui débloque les couleurs.]),
    ("couleur-degrade", [Niveau de ce badge qui débloque les dégradés.]),
  )),
  ("Avatar", (
    ("avatar", [Avatar des élèves.]),
    ("avatar-seuil", [Note (sur 10) à partir de laquelle un exercice réussi compte pour les pièces.]),
    ("avatar-secondes", [Durée minimale entre l'ouverture de l'exercice et la réponse pour qu'il compte.]),
    ("avatar-max-jour", [Nombre d'exercices qui comptent par jour, au plus.]),
    ("avatar-depart", [Pièces offertes au départ.]),
    ("avatar-paliers", [Exercices comptés qui donnent chacun une pièce, au début.]),
    ("avatar-pas", [Ensuite, une pièce tous les tant d'exercices.]),
  )),
)
#{
  let vus = ()
  let cellules = ()
  for (groupe, lignes) in reglages-doc {
    cellules.push(table.cell(colspan: 3, fill: luma(245), text(weight: "bold", groupe)))
    for (cle, sens) in lignes {
      vus.push(cle)
      cellules.push(raw("--nova-" + cle))
      cellules.push(if cle in defauts { raw(defauts.at(cle)) } else { text(fill: rgb("#A3221B"))[absent de `jetons.css`] })
      cellules.push(sens)
    }
  }
  table(columns: (4.9cm, 2.9cm, 1fr), align: left, table.header([Réglage], [Défaut], [Sens]), ..cellules)
  let std = defauts.keys().filter(k => k.starts-with("std-"))
  [*Thème standard* : #std.len() réglages `--nova-std-<r>`, tous à `defaut` (ni `oui` ni `non` : la structure puis le
  site décident). Liste et sens : @annexe-std et @standard.]
  let oublies = defauts.keys().filter(k => k not in vus and not k.starts-with("std-"))
  if oublies.len() > 0 {
    parbreak()
    text(fill: rgb("#A3221B"))[*Réglages de `jetons.css` sans description ici* (à ajouter à `reglages-doc`, dans le
    source de ce guide) : #oublies.map(k => raw("--nova-" + k)).join(", ").]
  }
}

== Jetons de design <annexe-jetons>

Lus à la compilation dans le premier bloc `:root` de `_css/jetons.css`. Ce ne sont pas des réglages : une feuille
de Nova s'en sert au lieu d'écrire une valeur en dur (@jetons).

#{
  let bloc = jetons.match(regex("(?s)\n:root \{(.*?)\n\}")).captures.at(0)
  bloc = bloc.replace(regex("(?m)^\s*/\* ([^*\n]{3,40}) \*/\s*$"), m => "@@" + m.captures.at(0) + "@@")
  bloc = bloc.replace(regex("(?s)/\*.*?\*/"), "")
  let cellules = (table.cell(colspan: 4, text(weight: "bold")[Accent]),)
  let n = 0
  for l in bloc.split("\n") {
    let t = l.match(regex("@@(.+)@@"))
    if t != none {
      if calc.odd(n) { cellules.push([]); cellules.push([]) }
      n = 0
      let titre = t.captures.at(0)
      if titre == "Clair" { titre = "Couleurs" }
      cellules.push(table.cell(colspan: 4, text(weight: "bold", titre)))
    } else {
      for m in l.matches(regle-decl) {
        cellules.push(raw("--nova-" + m.captures.at(0)))
        cellules.push(text(8.5pt, raw(m.captures.at(1).trim())))
        n += 1
      }
    }
  }
  if calc.odd(n) { cellules.push([]); cellules.push([]) }
  table(columns: (auto, 1fr, auto, 1fr), align: left, ..cellules)
}

== Paramètres d'adresse <annexe-parametres>

Ajoutés à une adresse de WIMS (`wims.cgi?…&module=home&nova_suivi=1`). WIMS ne les connaît pas : un widget les lit
dans la requête, les filtre, puis agit (@serveur). `adresseNette` retire de l'adresse ceux qui déclenchent une
action, pour qu'un rechargement ne la rejoue pas.

#table(columns: (5.9cm, 1fr, 3.9cm), align: left,
  table.header([Paramètre], [Effet], [Lu par]),
  [`nova_suivi=1`], [ouvre le suivi en direct], [`suivi-entree.phtml`],
  [`nova_activite=1`], [ouvre « Mon activité »], [`activite-entree.phtml`],
  [`nova_avatar=1`], [ouvre « Mon avatar »], [`avatar-entree.phtml`],
  [`nova_avatar_ouvrir=<cat.val>`], [achète un élément d'avatar avec des pièces], [`avatar-entree.phtml`],
  [`nova_avatar_choix=<cat.val,…>`], [enregistre l'avatar choisi], [`avatar-entree.phtml`],
  [`nova_avatars=1`], [ouvre le trombinoscope de l'enseignant], [`avatars-entree.phtml`],
  [`nova_avatars_retour=1`], [prépare le retour à une version antérieure (@compatibilite)], [`avatars-entree.phtml`],
  [`nova_couleur=<nom>`], [enregistre la couleur personnelle (`classe` : revenir à celle de la classe)], [`couleur-choix.phtml`],
  [`nova_menu=<…>`], [enregistre le choix de menu de l'enseignant (`simple` ou `complet`, puis ses entrées)], [`menu-serveur.phtml`],
  [`nova_replis=<…>`], [enregistre les classes repliées sur l'accueil d'une structure], [`replis-classes.phtml`],
  [`nova_propager=<quoi>`], [recopie des réglages vers les zones dépendantes], [`propager.phtml`],
  [`nova_desactiver=<type>…`], [désactive une ressource malgré un refus de WIMS], [`desactiver.phtml`],
  [`nova_seq_de`, `nova_seq_vers`, `nova_seq_numero`], [déplace une séquence (chiffres) ; choisit d'afficher le numéro seul (`oui`, `non`)], [`sequences.phtml`],
  [`nova_reglages=1` et un paramètre par réglage], [enregistre les réglages du site (formulaire de la page Apparence du gestionnaire)], [`reglages-site.phtml`],
)

== Données sur le serveur <annexe-donnees>

#table(columns: (1.3fr, 1.5fr), align: left,
  [Fichier (sous `log/` de WIMS)], [Contenu],
  [`nova.conf`], [réglages du site : des déclarations `--nova-… : valeur;`],
  [`classes/<classe>/css`], [feuille de style de la classe ; Nova y tient le bloc `/* Nova : reglages de la page Apparence */ html:root { … }`],
  [`classes/<c>/score/<login>.nova_badges`], [niveaux des badges de l'élève, une ligne par badge ; dans chaque zone],
  [`classes/<c>/score/<login>.nova_avatar`], [avatar : une ligne pour le choix, une pour les éléments achetés ; à la racine de la structure, recopié dans les zones],
  [`classes/<c>/score/<login>.nova_couleur`], [nom de la couleur personnelle ; mêmes emplacements que l'avatar],
  [`classes/<c>/.nova_menu_<login>`, `.nova_menu_modtool_<login>`, `.nova_menu_p_<module>_<login>`], [choix de menu de l'enseignant : accueil, modtool, une page donnée],
  [`classes/<c>/.nova_replis_<login>`], [classes repliées par l'enseignant sur l'accueil d'une structure],
  [`classes/<c>/seq/.def`], [ligne `sequence_nova_numero` ajoutée par Nova (la classe affiche le numéro seul des séquences)],
)
Les fichiers de `score/` sont sauvegardés, restaurés et effacés par WIMS avec les notes de l'élève. Ceux de la racine
d'une classe (`.nova_menu_…`, `.nova_replis_…`) ne sont pas dans la sauvegarde : ce ne sont que des préférences
d'affichage.

== Données dans le navigateur <annexe-navigateur>

Clés de `localStorage` : elles restent d'une visite à l'autre, sur cet appareil seulement. Aucune n'est nécessaire :
sans elles, la page prend ses valeurs par défaut.

#table(columns: (1.2fr, 1.6fr), align: left,
  [Clé], [Contenu],
  [`nova_menu`, `nova_menu_garde` (+ suffixe `_modtool` ou `_p_<page>`)], [menu de l'enseignant : `complet` ou rien ; liste des entrées gardées (ou cachées, hors accueil)],
  [`nova_menu_envoi`], [choix de menu en attente d'envoi au serveur, avec le prochain lien suivi],
  [`nova_menu_replie`], [groupes du menu repliés],
  [`nova-couleur|<structure>|<login>`], [couleur personnelle de l'élève, pour la poser avant l'affichage],
  [`nova-avatar|<structure>|<login>`], [avatar de l'élève, pour la barre],
  [`nova-trombinoscope`], [cases « Afficher » du trombinoscope],
  [`nova_examtypes_<login>`], [types des pages de vérification d'un examen, pour la fenêtre de vérification],
  [`nova-flyers-nom|<classe>`], [nom de la classe modifié pour les flyers à imprimer],
  [`nova-fiche-avancees`], [options avancées d'une fiche de ressource ouvertes ou fermées],
)
`sessionStorage` (le temps d'un onglet) ne sert qu'à passer une information d'une page à la suivante : message
reporté (`nova-message`), réglages standard déjà calculés (`nova-std-<classe>`), retour d'un enregistrement
(`nova-reglages-enregistre`)… Ces clés peuvent changer sans précaution.

== Repères posés dans la page <annexe-reperes>

Classes posées sur `<html>` par le script de tête (`htmlheader.phtml`) ou par `nova.js`, sur lesquelles le CSS
s'appuie ; et balises `<meta>` que `nova.js` lit.

#table(columns: (auto, 1fr), align: left,
  [Repère], [Sens],
  [`html.nova-js`], [JavaScript tourne : les règles qui masquent en attendant `nova.js` ne valent que sous cette classe (@js)],
  [`html.nova-role-eleve`, `html.nova-role-prof`], [rôle de la personne connectée, connu avant l'affichage],
  [`html.nova-std-<r>`], [le réglage « thème standard » `<r>` est choisi (@standard)],
  [`html.nova-sans-animation`], [animations coupées (@choix)],
  [`html.nova-menu-simple`, `html.nova-menu-edition`], [menu de l'enseignant simplifié ; en cours de personnalisation (@menu)],
  [`html.nova-sans-communication`, `html.nova-sans-liens`], [rubriques masquées aux élèves],
  [`html.nova-fil-libre`], [fil d'Ariane non fixe],
  [`html.nova-espace`], [mode « espacé » des préférences d'accessibilité de WIMS],
  [`html.nova-page-reglages`], [la page Apparence est affichée comme « Réglages de Nova »],
  [`html.nova-dominos`, `html.nova-tuiles`, `html.nova-assoc`], [type d'exercice à déplacer reconnu (@exercices)],
  [`meta[name=nova-module]`, `nova-type`], [module de la page ; type de la classe (`class`, `course`, `portal`…)],
  [`meta[name=nova-structure]`, `nova-classe`, `nova-utilisateur`], [numéros de la structure et de la classe ; identifiant connecté],
  [`meta[name=nova-css]`], [empreinte des feuilles, pour recharger un `css.css` périmé],
)

= Glossaire <annexe-glossaire>

Les mots de WIMS et ceux propres à Nova employés dans ce guide. Un mot en _italique_ dans une définition a sa propre
entrée.

#let terme(nom, def, ..voir) = (strong(nom), [#def#if voir.pos().len() > 0 [ (#voir.pos().at(0))]])
#table(columns: (auto, 1fr), align: left,
  [Terme], [Définition],
  ..terme[Accueil][Première page d'un rôle, écrite entièrement par le thème : `visitor.phtml` (site), `user.phtml`
    (élève, et enseignant d'une _structure_), `supervisor.phtml` (enseignant d'une _classe_).][@accueils],
  ..terme[AWK][Petit langage de traitement de texte présent sur tout système Unix (son nom : les initiales de ses
    auteurs, Aho, Weinberger, Kernighan). Il lit un texte ligne par ligne et applique des règles. Nova s'en sert pour
    les calculs faits sur le serveur (fichiers `.awk` de `_procs/`), lancés par `!sh` ; le serveur a la variante
    mawk.][@serveur],
  ..terme[Classe][Espace d'un enseignant avec ses élèves, ses _feuilles_ et ses _examens_ ; désignée par un numéro.
    Ses données sont dans `log/classes/<numéro>/`.],
  ..terme[Clignotement][Ce que voit l'utilisateur quand `nova.js` transforme une page déjà affichée telle que WIMS
    l'a écrite. S'évite par une règle CSS sous `.nova-js`.][@js],
  ..terme[Commande `!`][Instruction du langage des _gabarits_ et des modules de WIMS, exécutée sur le serveur :
    `!set` (variable), `!if`, `!read` (lire un gabarit), `!readproc` (lire une _procédure_), `!sh` (lancer un script),
    `!writefile`. Les variables s'écrivent `$nom`.][@serveur],
  ..terme[Dynapi][Bibliothèque JavaScript de WIMS qui dessine les exercices à déplacer (tuiles, dominos, éléments à
    associer). Elle crée ses éléments après le chargement de la page, hors de `.wimsbody`.][@exercices],
  ..terme[Empreinte][Courte somme de contrôle des sources, écrite par `construire-css.sh` et `construire-js.sh` dans
    `css.css`, `htmlheader.phtml` et l'adresse de `nova.js`, pour que le navigateur abandonne une copie périmée.][@commandes],
  ..terme[Examen][Activité notée, en temps limité, que l'élève passe dans une _session_ à part (suffixe `_exam`) ;
    certains liens y sont volontairement inactifs.][@examens],
  ..terme[Feuille (d'exercices)][Liste d'exercices préparée par l'enseignant, notée au fil du travail de l'élève. À
    ne pas confondre avec une _feuille de style_.][@feuilles],
  ..terme[Feuille de la classe][Feuille de style CSS propre à une _classe_ ou à une _structure_, saisie dans sa
    configuration (page Apparence) ; Nova y range les _réglages_ `--nova-…` de l'enseignant.][@reglage],
  ..terme[Feuille de style][Fichier CSS. Les sources de Nova sont dans `_css/`, réunies dans `css.css`.][@css],
  ..terme[Gabarit][Fichier `.phtml` lu par WIMS pour fabriquer une page : du HTML mêlé de _commandes `!`_.
    Les gabarits du thème sont lus à des _points d'accroche_ fixes.][@assemblage],
  ..terme[Gestionnaire du site][Administrateur du serveur WIMS ; il règle le site depuis la page de maintenance
    (`module=adm/manage`), y compris les réglages de Nova pour tout le site.][@reglage],
  ..terme[Groupement][_Structure_ qui réunit plusieurs classes d'un même établissement sous un administrateur ; le
    travail s'y fait dans des _zones_.],
  ..terme[Jeton][Variable CSS nommée qui porte une décision de design (couleur, espacement, police) :
    `--nova-accent`, `--nova-surface`… Toutes dans `_css/jetons.css`.][@jetons],
  ..terme[Lucide][Jeu d'icônes libre utilisé par Nova ; toute nouvelle icône en vient.][@icones],
  ..terme[MathJax][Bibliothèque qui affiche les formules mathématiques dans le navigateur ; elle retouche la page
    encore un moment après le chargement.],
  ..terme[Module][Application de WIMS : un exercice, un outil, un document ou une page d'administration (`adm/…`).
    Dossier de `public_html/modules/`, nommé dans l'adresse (`module=…`).],
  ..terme[Module de confiance][Module autorisé à lire et écrire dans les données du serveur (`wimshome/log/…`) :
    l'accueil et les modules `adm/…`. Un _gabarit_ du thème n'a que les droits du module de la page.][@serveur],
  ..terme[OEF][_Online Exercise Format_ : le format de la plupart des exercices de WIMS. Une page d'exercice OEF
    utilise beaucoup de variables (voir _tampon des noms_).][@exercices],
  ..terme[Point d'accroche][Fichier du thème que WIMS lit à un endroit fixe de la page (`header.phtml`,
    `tail.phtml`, accueils…). Il n'y en a pas d'autres.][@assemblage],
  ..terme[Portail][_Structure_ d'établissement organisée en niveaux, programmes et cours ; le travail s'y fait
    dans des _zones_.],
  ..terme[Procédure (`.proc`)][Fichier de WIMS fait d'affectations `x=…` (sans `!set`) ; se lit par `!readproc`.
    `var.proc` est celle qu'un module exécute avant d'afficher sa page.][@serveur],
  ..terme[Réglage `--nova-…`][Variable CSS que l'enseignant ou le _gestionnaire du site_ pose pour régler Nova
    (couleur, badges, animations…), dans la _feuille de la classe_ ou dans `log/nova.conf`.][@reglage],
  ..terme[Réglage « standard »][Réglage qui rend au thème _Standard_ une partie de ce que Nova transforme (menus,
    réponses, tableaux…) ; classe `nova-std-<r>` sur `<html>`.][@standard],
  ..terme[Rôle][Visiteur, élève, enseignant, administrateur de _structure_, _gestionnaire du site_. Nova doit
    tout laisser faire à chacun.],
  ..terme[Séquence][Regroupement, par l'enseignant, de _feuilles_, d'_examens_ et de documents présentés à l'élève
    dans l'ordre ; l'accueil de l'élève en montre une à la fois.][@accueils],
  ..terme[Session][Visite en cours d'un utilisateur, désignée par `session=…` dans l'adresse ; son état est gardé
    sur le serveur (`sessions/`). Suffixes : `_exam` (examen), `_mhelp` (fenêtre d'aide).],
  ..terme[Standard][Le thème de base de WIMS, dont Nova est dérivé ; référence de comparaison.][@choix],
  ..terme[Structure][_Portail_ ou _groupement_, par opposition à une _classe_ seule.],
  ..terme[Tampon des noms][Place limitée (32 Ko par page) pour les noms de variables WIMS ; plein, la page s'arrête
    sur « variable_name_buffer_overflow ».][@tampon],
  ..terme[Thème][Dossier de `public_html/themes/` qui donne son apparence à WIMS : _gabarits_, `css.css`, scripts.],
  ..terme[TinyMCE][Éditeur de texte riche que WIMS place dans certains formulaires (consignes, commentaires).][@pieges],
  ..terme[Verrou][Fichier qui signale qu'une personne ou un outil travaille sur un serveur de test partagé ;
    on attend qu'il disparaisse avant d'y toucher.][@commandes],
  ..terme[Widget][Morceau de _gabarit_ réutilisable, lu par `!read`. WIMS a les siens (`themes/_widgets/`) ; Nova
    a ses copies et les siens dans `_widgets/` (une action serveur = un widget).][@serveur],
  ..terme[`wimshome`][Préfixe des chemins vers le dossier d'installation de WIMS (`/home/wims`) dans les commandes
    de fichiers : `!writefile wimshome/log/…`.][@serveur],
  ..terme[Zone][Classe ou cours à l'intérieur d'une _structure_, désigné par un chemin (`class=<n>/1/101`) ; les
    élèves y travaillent et leurs notes y sont rangées.],
)
