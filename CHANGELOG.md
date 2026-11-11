# Nouveautés de Nova

Thème WIMS moderne et adapté au téléphone. Les versions les plus récentes sont en haut.
Ce qui est réservé aux élèves (badges, avatar, couleur personnelle) reste **désactivé** tant que
l'enseignant ou le site ne l'active pas (page « Réglages de Nova » de la configuration).

## 1.3 — 8 novembre 2026

### Élèves
- **Exercices à cases** : sur la page de réponse, chaque choix est marqué dans l'énoncé (✓ juste, ✕ coché à tort, ! en pointillé s'il fallait le cocher) ; l'encadré dit « il manque 1 réponse » au lieu de répéter toutes les réponses.
- **Persévérance** : la règle dit clairement « notes de moins de 5/10 » (la note doit être strictement inférieure au seuil).
- Fenêtre des badges : les récompenses de couleur (couleur, dégradés) apparaissent dans l'onglet du badge qui les débloque.

### Enseignants
- **Élèves connectés** : un point vert de présence remplace la main jaune levée ; sur l'accueil, la phrase « Il y a actuellement n participant(s) connecté(s) » est dans une pastille verte, point devant ; dans les tableaux (suivi d'un parcours, devoirs libres) et le livret, un point vert après le nom.
- **Configuration et maintenance** d'une classe, d'un groupement ou d'un portail : deux onglets (« Sauvegarde et maintenance », « Configuration », le dernier choisi est gardé pendant la session) ; chaque groupe de liens dans une carte, en lignes compactes, une ligne par entrée avec son icône, sa description en dessous et un chevron ; toute la ligne est cliquable.
- Menu « Profil » : « Conditions générales d'utilisation » n'y figure plus ; le lien reste en pied de page, sur toutes les pages.
- **Liens de connexion** : une carte par lien (« Lien pour vous », « Lien pour vos élèves », et sur un portail ceux des enseignants), le lien en entier et un bouton **Copier** ; un QR code du lien des élèves (dessiné par Nova si le serveur n'en produit pas), avec « Agrandir » pour le projeter et « Télécharger » en image, et des **flyers à imprimer** (PDF, 30 par page A4, « WIMS - <classe> » sous chaque QR code, à découper et coller dans le cahier) avec le nom de la classe modifiable, le numéro de la classe a aussi son bouton Copier.
- **Désactiver quand même** : case cochée par défaut « Télécharger d'abord une sauvegarde de la classe (.zip) » ; la sauvegarde complète de WIMS est téléchargée, puis l'examen ou la feuille est désactivé. Si la sauvegarde échoue, rien n'est désactivé.
- **Restriction d'accès d'un portail, groupement ou niveau** : après l'enregistrement, Nova propose de l'appliquer aux zones dépendantes qui ont une autre restriction (liste des zones, « Appliquer » ou « Non, seulement ici »).
- **Restriction d'accès** (Configuration et maintenance) : formulaire pour interdire le travail à certaines heures chaque jour (« La nuit : 20 h 30 à 7 h » en un clic) ou entre deux dates, pour tout le travail ou les exercices seulement, avec un résumé en français. Les règles écrites à la main sont gardées dans « Réglage expert », une règle en double n'est écrite qu'une fois.
- **Accueil d'un portail** : bouton « Replier les classes » à côté de chaque niveau ; replié, il ne reste que les programmes et leurs cours. Le choix est gardé sur le serveur (il vous suit d'un appareil à l'autre).
- Onglet DM WIMS des Réglages de Nova : liste de ce qui utilise ces réglages (« Créer le DM noté », badges Échauffement et Au top).
- **Réglages de Nova** : tous les réglages du thème sur une page à part, en onglets (Affichage, Élèves, DM WIMS, Badges et récompenses, Réglages avancés), dans la liste « Configuration et maintenance » et le menu de gauche (étiquette « New ») ; elle remplace « Badges Nova », la page Apparence ne garde que les réglages de WIMS.
- **DM WIMS** : onglet à part ; un examen n'est un DM que si son titre contient « DMWIMS » ou « DM » (réglable), puis « noté » ou « test » (DM noté) ou « entraînement » ; mots-clés en étiquettes, faciles à ajouter ou retirer.
- **Créer le DM noté** : bouton sur l'accueil, à côté d'un DM d'entraînement qui n'a pas encore son DM noté ; copie avec les mêmes exercices, titre « … (noté) », description du dernier DM noté, 3 sessions, laissée en préparation.
- **Désactiver quand même** un examen ou une feuille que WIMS refuse de désactiver parce qu'ils sont partagés (aussi dans un programme de portail), ou une feuille utilisée dans un examen : bouton sous le refus, après une alerte sur les conséquences. À permettre dans Réglages de Nova, onglet Réglages avancés (désactivé par défaut). Refusé si des élèves ont déjà commencé l'examen.
- **Couleur personnelle** : deux paliers, couleur puis dégradés, chacun avec son niveau et son badge.
- **Mon activité** : ses réglages s'affichent directement quand la page est activée, et disparaissent sinon.
- Page **Notes** : titre de la feuille ou de l'examen en tête de colonne (au lieu de « Feuille 3 », « Examen 4 »), une case par type pour revenir au numéro ; case « Masquer la moyenne » ; choix retenus par le navigateur.

### Installation
- Les icônes propres à Nova sont elles aussi des icônes Lucide : barre du haut (maison, aide, compte, Terminer, Fermer, Retour), chronomètre, « Configuration et maintenance », « Administration du serveur », niveaux, classes, programmes et cours d'un portail, types de travail (feuille, examen, document…), liens de connexion, menu ☰ et « Plus ».
- **Jeu d'icônes « Lucide »** : nouveau choix dans « Jeu d'icônes » (Config / Maintenance › Présentation d'une classe, Configuration du site) ; icônes fines au trait, à la couleur du texte, pour toutes les entrées de WIMS (menus, barre, fil d'Ariane, messages, boutons). « Nouvelle feuille » et « Nouvel examen » ont des icônes assorties (presse-papiers + et presse-papiers horloge). Le jeu est livré avec Nova : il s'ajoute à la liste à la première visite d'une page de configuration.
- **Logo WIMS** : nouveau logo animé en SVG (net à toutes les tailles) dans la barre.
- **Administration du serveur** (gestionnaire du site) : chaque groupe de liens dans une carte, une ligne par entrée avec son icône et un chevron, comme les réglages d'un téléphone.
- **Langues** : Nova est traduit en espagnol et en italien (en plus du français et de l'anglais) ; une langue non traduite (catalan, allemand, chinois, slovène…) ou un texte manquant s'affiche en anglais, jamais vide. La page **Suivi en direct** est traduite elle aussi.
- Nom du dossier du thème : **lettres et chiffres seulement** (`Nova12`, pas `Nova-1-3` ni `Nova_1_2`) ; avec un tiret ou un soulignement, les pages d'accueil s'affichaient sans Nova. Notice d'installation corrigée, `livrer.sh` refuse ces noms.

### Corrections
- Examen, page « Vous n'avez pas fait tous les exercices… Voulez-vous vraiment terminer ? » : le menu de l'élève n'est plus au milieu de la barre, il est à droite avec Aide, devant « Terminer ».
- Le symbole des messages d'information (« Dernière connexion le … ») ne disparaît plus avec un jeu d'icônes en images (Lucide).
- **Import CSV depuis un portail ou un groupement** : les élèves inscrits dans une classe par le fichier (colonne participate) apparaissent tout de suite dans la classe et dans le nombre d'élèves de « Gestion de la structure », sans passer par « Actualiser les index › Participants ».
- **Mode « espacé »** (Préférences d'affichage, Accessibilité) : le texte est de nouveau espacé (lettres, mots, lignes) ; la police de Nova est gardée, sauf si l'appareil a OpenDyslexic.
- **Fil d'Ariane** de la gestion de structure : plus de tiret devant « Gestion de … » avec le jeu d'icônes Font Awesome.
- Après une mise à jour du thème, la mise en page n'est plus cassée tant que le navigateur garde l'ancienne feuille de style (onglets en simples boutons, fenêtre « Ma couleur » sans marges, page « Mon avatar » en vrac) : Nova repère la feuille périmée et la recharge tout seul.
- « Appliquer » (zones dépendantes), la case Nova de « Zones dépendantes » et « Désactiver quand même » ne renvoient plus à l'accueil du portail : on reste sur la page (ou on revient à l'examen, à la feuille), avec le message.
- Après « Enregistrer les réglages de Nova », on reste sur la page des réglages (même onglet), avec « Réglages de Nova enregistrés », au lieu d'arriver sur la page Apparence.
- Exercices à cases dont les choix sont des formules affichées en image : le cadre ne coupe plus la formule et la pastille ne la cache plus.

## 1.2 — 7 novembre 2026

### Élèves
- **Avatar personnalisable** (Avataaars) : l'élève gagne des pièces en réussissant des exercices et les dépense pour débloquer des éléments ; certains sont réservés à des niveaux de badges. Compteur de pièces dans la barre. Vu seulement par l'élève et ses enseignants. Désactivé par défaut.
- **Ma couleur** (menu Profil) : une couleur d'interface parmi 10, puis un dégradé parmi 8 (barre, boutons, titres des fenêtres), débloqués par un niveau de badge choisi par l'enseignant.
- **Badge Échauffement** : récompense l'élève qui fait les sessions de l'examen d'entraînement avant d'ouvrir le DM noté.
- **Badge Au top** : récompense un DM noté réussi (9/10 par défaut).
- **Régularité** (ex-Fidélité) : compteur de semaines travaillées, sans série à perdre ; une semaine compte quand l'élève a envoyé au moins une réponse le nombre de jours choisi.
- **Mon activité** : un jour de travail = au moins une réponse envoyée ; vacances par zone A, B ou C (dates officielles fournies), dates personnalisées, ou aucune.
- Avatar : couleur des chapeaux au choix ; les onglets de couleur n'apparaissent que s'ils servent (chapeau porté, lunettes portées ; cheveux sous un chapeau seulement avec une barbe).
- Fenêtre des badges : onglets en icône ; niveau « Cuivre » renommé « Bronze ».

### Enseignants
- Accueil : moteur de recherche sous les feuilles et les examens.
- modtool : menu latéral personnalisable ; choix de la langue sur une ligne dépliable.
- Rubrique **Badges Nova** accessible depuis le menu, réglages de chaque badge repliés ; paliers à 0 permis (pour tester).
- Portails et groupements : propagation séparée de l'apparence et des badges aux zones ; alerte quand des zones n'utilisent pas les réglages de la structure, avec « Appliquer ».
- Détail des examens : les signes « † » et « ?? » sont expliqués (info-bulle et légende).
- Numéro de version et page des nouveautés (en bas de la carte « Réglages de Nova »).

### Installation
- Le dossier du thème peut porter un autre nom : deux versions côte à côte possibles (pas de point dans le nom).

### Corrections
- Réponse fausse à un exercice à cases : les choix justes ne sont plus entourés de rouge.
- Exercice chronométré : le bandeau « Temps écoulé » dit que la note baisse avec le retard (ou vaut 0).
- La note des examens ne disparaît plus des cartes au bout de quelques jours.
- Configuration d'une feuille : boutons radio et ligne Date / Poids / Règle de calcul remis en forme.
- Boutons collés en bas de l'écran qui vibraient au téléphone.
- Menu Profil (et Déconnexion) qui disparaissait quand les liens externes sont masqués aux élèves.
- « ← Retour » sur les pages Mon avatar et Mon activité, sans sortie au téléphone.

## 1.1 — 9 octobre 2026

### Élèves
- **Badges** : Fidélité (devenu Régularité en 1.2) et Persévérance, fenêtre « Mes badges », activés par la page Apparence.
- **Mon activité** : jours de travail et temps de la semaine, objectif réglable.
- **Dominos** : exercices à étiquettes en tableaux, à taille commune et lisibles au téléphone.
- Réponses mêlées : « n réponses justes sur N », en deux colonnes « Justes » et « À revoir ».
- Menu : rubrique Profil en tête ; menu en tiroir ☰ pour les élèves.
- Images cliquables affichées à leur taille réelle (le clic tombait à côté quand elles étaient réduites).
- Conseil « mode paysage » pour les exercices trop larges au téléphone.

### Enseignants
- **Suivi en direct** pour la salle informatique (Participants) : élèves en difficulté, qui répètent, qui travaillent ou sont inactifs, seuils réglables.
- Rubrique **Badges Nova** dans la configuration de la classe.
- Réglages « Rapprocher du thème standard », réglage par réglage.
- Rubriques masquées aux élèves (communication, liens externes).
- Portails et groupements : réglages Nova propagés aux zones dépendantes.
- Menu simplifié gardé sur le serveur (le même sur tous les ordinateurs).
- Fil d'Ariane fixe sous la barre sur grand écran (réglable).
- Pied de page avec CGU et Aide sur toutes les pages.

## 1.0 — 6 octobre 2026

Première version, construite à partir du thème Standard de WIMS 4.32, sans rien retirer à aucun rôle.

- Interface sobre et lumineuse, police Atkinson Hyperlegible, couleur d'accent = couleur de la classe.
- Téléphone : barre sur une ligne, menus repliés, tableaux et contenus qui tiennent dans l'écran.
- Menu enseignant simplifié et personnalisable (un œil par entrée), « Menu complet » à côté.
- Accueil du site réorganisé (actualité, exemples, recherches, carrousel).
- Feuilles, examens, séquences et zones de travail en cartes ; note retenue en pastille ; couleurs des notes harmonisées.
- Exercices : verdict clair (étoiles, vibration en cas d'erreur), boutons collés en bas au téléphone, progression des parcours et des séries.
- Chronomètre d'examen : pastille, couleurs à 5 min et 1 min, bandeau à la fin ; « Examen en cours » toujours visible.
- Clavier mathématique tactile (option), étiquettes déplaçables au doigt.
- Entrée directe dans un cours unique, déconnexion vers la page de connexion de la classe, œil du mot de passe.
- Réglages de Nova dans la page Apparence (site, classe, portail, groupement) ; animations coupées par défaut.
- Tableaux, formulaires, onglets, accordéons, boutons et dialogues modernisés ; Foundation et Slick retirés.
