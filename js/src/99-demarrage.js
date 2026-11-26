
  /* ===== js/src/99-demarrage.js : appel de toutes les fonctions, fin de la fonction englobante ===== */
  function demarrer() { racineCache = {}; try { demarrage(); } finally { racineCache = null; } }
  function demarrage() { feuilleAJour(); titreOnglet(); menuEleve(); placerMenu(); piedDePage(); messageReporte(); propagationNova(); reglagesStructure(); reglagesStandard(); activiteLien(); menuServeur(); reconnexionCas(); apparenceNova(); apparenceClasse(); aidesReglages(); ecartsZones(); rubriqueReglages(); configurationClasse(); configurationGlobale(); securiteClasse(); formatsSauvegarde(); capaciteClasse(); desactivationsRefusees(); ficheRessource(); etatsRessources(); numerosRessources();
    accueilEnseignantCartes(); colonneSequences(); exportTableur(); motdActions(); choixMultiples(); pagesVides(); sequencesEnseignant(); sequencesNumero(); examenContenu(); feuilleContenu(); serieModifier(); aidesOef(); confirmationsRessources(); editeursReactivables(); if (animationsCoupees()) document.documentElement.classList.add('nova-sans-animation'); autreExamen(); coursUnique(); oeilMotDePasse(); focusConnexion(); parcours(); parcoursExamen(); courseExercice(); feuilleExercices(); tiParcours(); panneaux(); revelations(); accordeons(); menusDeroulants(); infobulles(); modeExamen(); profilLateral(); badges(); couleurPerso(); pastilleBadges(); avatarBarre(); avatarPage(); avatarsClasse(); avatarsParticipants(); chronoExercice(); retourEleve(); scores(); notesExamens(); libellesNotes(); examExercices(); carrousel(); notesNaN(); examensDetail(); signesExamens(); notesColonnes(); notesDetail(); dmNote(); travailIndividualise(); editeursCode(); forcerDesactivation(); legendeTypes(); clavierMaths(); claviersReponse(); glisserTactile(); dominos(); tuiles(); tuilesCorrigees(); associations(); aideExamen(); derniereConnexion(); imagesCliquables(); retourReponse(); boutonsCollants(); focusSuite(); initialiser(); chronometre(); serieEtapes(); typesExamen(); pagesExamen(); lienExercice(); barreCompacte(); basculeMenu(); replisClasses(); cellulesCliquables(); participantsFleches(); elevesListe(); ficheEleve(); planPortail(); planPortailSuite(); zonesAccueil(); accesClasse(); liensConnexion(); sectionsRepliables(); retourEnHaut(); enLigne(); centrerBarre(); sessionInactive(); adresseNette(); }
  capterTinymce();   // avant le tinymce.init de WIMS (au chargement de la page)
  ongletFeuilles();  // avant le « ready » de jQuery, qui construit les onglets de l'accueil
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
  // jQuery UI construit ses onglets à un moment qui varie (après « load » sur certaines pages) :
  // on surveille l'apparition de .ui-tabs pendant dix secondes ; ongletsCompacts est idempotente.
  ongletsCompacts();
  if (window.MutationObserver) {
    var veille = new MutationObserver(function () { ongletsCompacts(); });
    veille.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class'] });
    setTimeout(function () { veille.disconnect(); }, 10000);
  }
})();
