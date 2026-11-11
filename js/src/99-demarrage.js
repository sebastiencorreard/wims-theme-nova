
  /* ===== js/src/99-demarrage.js : appel de toutes les fonctions, fin de la fonction englobante ===== */
  function demarrer() { feuilleAJour(); menuEleve(); placerMenu(); piedDePage(); messageReporte(); propagationNova(); reglagesStructure(); reglagesStandard(); activiteLien(); menuServeur(); reconnexionCas(); apparenceNova(); apparenceClasse(); ecartsZones(); rubriqueReglages(); configurationClasse(); if (animationsCoupees()) document.documentElement.classList.add('nova-sans-animation'); autreExamen(); coursUnique(); oeilMotDePasse(); focusConnexion(); parcours(); parcoursExamen(); courseExercice(); feuilleExercices(); panneaux(); revelations(); accordeons(); menusDeroulants(); infobulles(); modeExamen(); profilLateral(); badges(); couleurPerso(); pastilleBadges(); avatarBarre(); avatarPage(); chronoExercice(); retourEleve(); scores(); notesExamens(); libellesNotes(); examExercices(); carrousel(); notesNaN(); signesExamens(); notesColonnes(); dmNote(); forcerDesactivation(); legendeTypes(); clavierMaths(); claviersReponse(); glisserTactile(); dominos(); tuiles(); aideExamen(); derniereConnexion(); imagesCliquables(); retourReponse(); boutonsCollants(); focusSuite(); initialiser(); chronometre(); serieEtapes(); typesExamen(); pagesExamen(); barreCompacte(); basculeMenu(); replisClasses(); accesClasse(); liensConnexion(); sectionsRepliables(); retourEnHaut(); enLigne(); centrerBarre(); }
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
