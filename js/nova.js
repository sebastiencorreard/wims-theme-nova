/* Nova — menu latéral sur téléphone et tablette.
 * Ajoute à la barre du haut un bouton qui ouvre et ferme le menu (#wimsmenumodubox) ; fermeture
 * aussi par Échap, par un clic hors du menu ou en suivant un lien. Sans JavaScript, le menu
 * reste dans la page : rien ne se perd. Aucune dépendance (jQuery n'est pas requis).
 */
(function () {
  'use strict';
  function initialiser() {
    var barre = document.getElementById('wimstopbox');
    var menu = document.getElementById('wimsmenumodubox');
    if (!barre || !menu || document.querySelector('.nova-menu-bouton')) return;

    var bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'nova-menu-bouton';
    bouton.setAttribute('aria-controls', 'wimsmenumodubox');
    bouton.setAttribute('aria-expanded', 'false');
    bouton.setAttribute('aria-label', document.documentElement.lang === 'en' ? 'Menu' : 'Menu de la classe');
    bouton.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
    barre.insertBefore(bouton, barre.firstChild);

    function basculer(ouvrir) {
      document.body.classList.toggle('nova-menu-ouvert', ouvrir);
      bouton.setAttribute('aria-expanded', ouvrir ? 'true' : 'false');
      if (ouvrir) {
        var premier = menu.querySelector('a[href]');
        if (premier) premier.focus();
      }
    }
    bouton.addEventListener('click', function () {
      basculer(!document.body.classList.contains('nova-menu-ouvert'));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('nova-menu-ouvert')) {
        basculer(false);
        bouton.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (!document.body.classList.contains('nova-menu-ouvert')) return;
      if (menu.contains(e.target) ? e.target.closest('a[href]') : !bouton.contains(e.target)) basculer(false);
    });
  }
  /* Chronomètre d'examen (Nova/_widgets/headmenu.phtml). WIMS fait décompter #chrono_exam
   * (scripts/js/chronoid.js) sans rien changer près de la fin : Nova lit ce texte « mm:ss » et pose
   * l'état sur .nova-chrono (data-etat) — normal, attention (≤ 5 min), critique (≤ 1 min), fin —,
   * change le libellé, l'annonce aux lecteurs d'écran, et affiche un bandeau à 00:00. Les textes
   * viennent des data-texte-* écrits par le widget (lang/name.phtml.<langue>). */
  function chronometre() {
    var boite = document.querySelector('.nova-chrono');
    var temps = boite && boite.querySelector('#chrono_exam, .nova-chrono-miroir');
    if (!boite || !temps) return;
    var libelle = boite.querySelector('.nova-chrono-libelle');
    var libelleNormal = libelle ? libelle.textContent : '';
    var textes = {
      normal: libelleNormal,
      attention: boite.getAttribute('data-texte-5min'),
      critique: boite.getAttribute('data-texte-1min'),
      fin: boite.getAttribute('data-texte-fin')
    };
    document.body.classList.add('nova-examen');
    var annonce = document.createElement('div');
    annonce.className = 'nova-sr';
    annonce.setAttribute('aria-live', 'assertive');
    document.body.appendChild(annonce);
    var precedent = null;

    function bandeau() {
      if (document.querySelector('.nova-chrono-bandeau')) return;
      var b = document.createElement('div');
      b.className = 'nova-chrono-bandeau';
      b.setAttribute('role', 'alert');
      var fort = document.createElement('strong');
      fort.textContent = textes.fin;
      var detail = document.createElement('span');
      detail.textContent = boite.getAttribute('data-texte-fin-detail') || '';
      b.appendChild(fort);
      b.appendChild(detail);
      var corps = document.querySelector('.wimsbody') || document.body;
      corps.insertBefore(b, corps.firstChild);
    }
    function mettreAJour() {
      var m = /(\d+):(\d\d)/.exec(temps.textContent);
      if (!m) return;
      var s = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      var critique = +(boite.getAttribute('data-seuil-critique') || 60);
      var attention = +(boite.getAttribute('data-seuil-attention') || 300);
      var etat = s === 0 ? 'fin' : s <= critique ? 'critique' : s <= attention ? 'attention' : 'normal';
      if (etat === precedent) return;
      boite.setAttribute('data-etat', etat);
      document.body.setAttribute('data-nova-chrono', etat);
      if (libelle && textes[etat]) libelle.textContent = textes[etat];
      if (etat !== 'normal') annonce.textContent = textes[etat] || '';
      if (etat === 'fin') bandeau();
      precedent = etat;
    }
    new MutationObserver(mettreAJour).observe(temps, { childList: true, characterData: true, subtree: true });
    mettreAJour();

    // Heure de fin, calculée par WIMS (html/examclock.proc) et rangée par tail.phtml dans un
    // <template> : « 01/10/2026 - 10:48:12 » devient « Fin à 10:48 » dans le chronomètre.
    var modele = document.getElementById('nova-fin-examen');
    var heure = modele && /(\d{1,2}:\d{2}):\d{2}/.exec(modele.innerHTML);
    if (heure) {
      var fin = document.createElement('span');
      fin.className = 'nova-chrono-fin';
      fin.textContent = (boite.getAttribute('data-texte-fin-a') || '') + ' ' + heure[1];
      boite.appendChild(fin);
    }
  }

  /* Page de l'examen pendant une session (WIMS met alors « Terminer cette session d'examen » —
   * a.endexam — dans le menu du compte). Barre réduite à : ☰, accueil, chronomètre, « Terminer ».
   *  - le chronomètre recopie le décompte de la page (#exam_clock, « Temps restant… ») ;
   *  - « Terminer » est le lien de WIMS lui-même, sorti du menu du compte ;
   *  - le compte, Aide et les autres entrées de la barre passent dans le menu latéral, section
   *    « Profil » (sur téléphone : derrière ☰). Le nom de la classe est masqué (CSS). */
  function modeExamen() {
    var barre = document.getElementById('wimstopbox');
    var fin = barre && barre.querySelector('#user_links a.endexam');
    if (!fin) return;
    var textes = document.getElementById('nova-textes');
    var t = function (nom, defaut) { return (textes && textes.getAttribute('data-' + nom)) || defaut; };
    document.body.classList.add('nova-examen', 'nova-examen-session');

    // « Terminer » : le lien lui-même, dans la barre, libellé court ; le long reste pour l'accessibilité.
    var liFin = fin.closest('li');
    var long = fin.textContent.trim();
    var place = document.createElement('div');
    place.className = 'menuitem nova-terminer';
    fin.setAttribute('aria-label', long);
    fin.setAttribute('title', long);
    fin.textContent = t('terminer', 'Terminer');
    place.appendChild(fin);
    barre.appendChild(place);
    if (liFin) liFin.remove();

    // Profil : le contenu du menu du compte et les autres entrées de la barre, dans le menu latéral.
    var menu = document.getElementById('wimsmenumodubox');
    var compte = barre.querySelector('a.account');
    var liCompte = compte && compte.closest('li');
    if (menu && liCompte) {
      var cible = menu.querySelector('.modubox_content') || menu;
      var titre = document.createElement('h2');
      titre.className = 'menu_title nova-profil-titre';
      titre.textContent = t('profil', 'Profil');
      var groupe = document.createElement('div');
      groupe.className = 'wimsmenu menu nova-profil';
      var ajouter = function (lien) {
        if (!lien || !lien.getAttribute('href') || lien.getAttribute('href') === '#user_links') return;
        var d = document.createElement('div');
        d.className = 'menuitem';
        d.appendChild(lien);
        groupe.appendChild(d);
      };
      // Le nom de l'élève en tête, en texte (le lien « #user_links » n'ouvrait que le menu).
      var nom = document.createElement('div');
      nom.className = 'menuitem nova-profil-nom';
      nom.textContent = compte.textContent.trim();
      groupe.appendChild(nom);
      Array.prototype.forEach.call(liCompte.querySelectorAll('#user_links > li a[href]'), ajouter);
      Array.prototype.forEach.call(barre.querySelectorAll('.wimsmenu > .menuitem'), function (item) {
        if (item.classList.contains('class_home') || item.classList.contains('chrono') ||
            item.classList.contains('nova-terminer') || item.classList.contains('nova-examencours') || item.classList.contains('nova-examencours') || item === liCompte) return;
        Array.prototype.forEach.call(item.querySelectorAll('a[href]'), ajouter);
        item.remove();
      });
      liCompte.remove();
      cible.insertBefore(groupe, cible.firstChild);
      cible.insertBefore(titre, groupe);
    }

    // Chronomètre recopié du décompte de la page.
    chronoMiroir(document.getElementById('exam_clock'), true);
  }

  /* Chronomètre Nova dans la barre, recopié d'un décompte que WIMS écrit dans la page
   * (#exam_clock d'un examen, #clockoef d'un exercice chronométré). examen=false : seuils relatifs
   * à la durée (ambre au dernier quart, au moins 15 s ; rouge aux 10 dernières secondes), sans libellé en
   * minutes ; le bandeau « Temps écoulé » reste. */
  function chronoMiroir(horloge, examen) {
    var barre = document.getElementById('wimstopbox');
    if (!horloge || !barre || barre.querySelector('.nova-chrono')) return;
    var textes = document.getElementById('nova-textes');
    var t = function (nom, defaut) { return (textes && textes.getAttribute('data-' + nom)) || defaut; };
    var item = document.createElement('div');
    item.className = 'menuitem chrono';
    item.innerHTML = '<div class="nova-chrono" data-etat="normal">' +
      '<svg class="nova-chrono-icone" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8"></circle>' +
      '<path d="M12 9v4l2.5 2.5M9 2h6"></path></svg><span class="nova-chrono-libelle"></span>' +
      '<span class="nova-chrono-temps" role="timer"><span class="nova-chrono-miroir"></span></span></div>';
    var boite = item.firstChild;
    var attributs = examen ? ['texte-5min', 'texte-1min', 'texte-fin', 'texte-fin-detail'] : ['texte-fin', 'texte-fin-detail'];
    attributs.forEach(function (a) { boite.setAttribute('data-' + a, t(a, '')); });
    if (examen) boite.querySelector('.nova-chrono-libelle').textContent = t('libelle', '');
    boite.querySelector('.nova-chrono-temps').setAttribute('aria-label', t('libelle', ''));
    var miroir = boite.querySelector('.nova-chrono-miroir');
    var copier = function () {
      var texte = horloge.textContent.trim();
      var m = /(\d+):(\d\d)/.exec(texte);
      if (!examen && m && !boite.hasAttribute('data-seuil-critique')) {
        var duree = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
        boite.setAttribute('data-seuil-critique', 10);
        boite.setAttribute('data-seuil-attention', Math.max(15, Math.round(duree / 4)));
      }
      miroir.textContent = texte;
    };
    copier();
    new MutationObserver(copier).observe(horloge, { childList: true, characterData: true, subtree: true });
    var maison = barre.querySelector('.class_home');
    var bloc = maison ? maison.parentNode : (barre.querySelector('.wimsmenu') || barre);
    bloc.insertBefore(item, maison ? maison.nextSibling : bloc.firstChild);
  }

  // Exercice OEF chronométré (scripts/oef/Main.phtml : « Cet exercice est chronométré » + #clockoef).
  function chronoExercice() { chronoMiroir(document.getElementById('clockoef'), false); }

  /* Barre du haut sur une seule ligne au téléphone (< 640 px). Restent dans la barre : ☰, accueil,
   * nom de classe, chronomètre, compte, langue. Les autres entrées (Aide, À propos, Retour à la
   * liste, Outils…) sont DÉPLACÉES dans un menu « ⋯ » — mêmes éléments, mêmes liens — et remises
   * à leur place exacte quand l'écran s'élargit. */
  function barreCompacte() {
    var barre = document.getElementById('wimstopbox');
    if (!barre || !window.matchMedia) return;
    var etroit = window.matchMedia('(max-width: 639.98px)');
    var conteneur = null, bouton = null, panneau = null, deplaces = [];

    function garde(item) {
      return item.classList.contains('chrono') || item.classList.contains('class_home') ||
        item.id === 'language_selector' || item.querySelector('a.account') || item.classList.contains('back') || item.classList.contains('tools') ||
        item.classList.contains('nova-terminer') || item.classList.contains('nova-examencours') ||
        item.classList.contains('is-submenu-item') || item.closest('.is-dropdown-submenu');
    }
    function entreesSecondaires() {
      var liste = [];
      Array.prototype.forEach.call(barre.children, function (bloc) {
        if (!bloc.classList || !bloc.classList.contains('wimsmenu')) return;
        Array.prototype.forEach.call(bloc.children, function (item) {
          if (item.classList.contains('menuitem') && !garde(item) && item.textContent.trim()) liste.push(item);
        });
      });
      return liste;
    }
    function fermer() { if (panneau && bouton) { panneau.hidden = true; bouton.setAttribute('aria-expanded', 'false'); } }
    function replier() {
      var items = entreesSecondaires();
      if (!items.length) return;
      // Avec un menu latéral (☰), les entrées vont EN TÊTE de ce menu, sous un titre « Plus » (le
      // menu du compte de l'élève ne doit montrer que son nom et la déconnexion) ; titre + bloc
      // forment une paire, comme les familles de l'accordéon jQuery UI. Sinon (visiteur, fenêtre
      // d'examen), dans « ⋯ ».
      var lateral = document.getElementById('wimsmenumodubox');
      if (lateral) {
        var textes = document.getElementById('nova-textes');
        var titre = document.createElement('h2');
        titre.className = 'menu_title nova-deplace-titre';
        titre.textContent = (textes && textes.getAttribute('data-plus')) || 'Plus';
        var groupe = document.createElement('div');
        groupe.className = 'wimsmenu menu nova-deplaces';
        items.forEach(function (item) {
          deplaces.push({ item: item, parent: item.parentNode, suivant: item.nextSibling });
          item.classList.add('nova-deplace');
          groupe.appendChild(item);
        });
        var cible = lateral.querySelector('.modubox_content') || lateral;
        var apres = cible.querySelector('.nova-profil');   // section « Profil » d'un examen
        var ref = apres ? apres.nextSibling : cible.firstChild;
        cible.insertBefore(titre, ref);
        cible.insertBefore(groupe, ref);
        conteneur = groupe;
        conteneur.nova_titre = titre;
        return;
      }
      conteneur = document.createElement('div');
      conteneur.className = 'nova-plus';
      bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'nova-plus-bouton';
      bouton.setAttribute('aria-expanded', 'false');
      bouton.setAttribute('aria-label', document.documentElement.lang === 'en' ? 'More' : 'Plus');
      bouton.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
      panneau = document.createElement('div');
      panneau.className = 'nova-plus-panneau';
      panneau.hidden = true;
      items.forEach(function (item) {
        deplaces.push({ item: item, parent: item.parentNode, suivant: item.nextSibling });
        panneau.appendChild(item);
      });
      conteneur.appendChild(bouton);
      conteneur.appendChild(panneau);
      barre.appendChild(conteneur);
      bouton.addEventListener('click', function (e) {
        e.stopPropagation();
        var ouvrir = panneau.hidden;
        panneau.hidden = !ouvrir;
        bouton.setAttribute('aria-expanded', ouvrir ? 'true' : 'false');
      });
    }
    function deplier() {
      deplaces.reverse().forEach(function (d) { d.item.classList.remove('nova-deplace'); d.parent.insertBefore(d.item, d.suivant); });
      deplaces = [];
      if (conteneur) { if (conteneur.nova_titre) conteneur.nova_titre.remove(); conteneur.remove(); }
      conteneur = bouton = panneau = null;
    }
    function appliquer() { if (etroit.matches) { if (!conteneur) replier(); } else if (conteneur) deplier(); }
    document.addEventListener('click', function (e) { if (panneau && conteneur && !conteneur.contains(e.target)) fermer(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panneau && !panneau.hidden) { fermer(); bouton.focus(); } });
    if (etroit.addEventListener) etroit.addEventListener('change', appliquer); else etroit.addListener(appliquer);
    appliquer();
  }

  /* Onglets jQuery UI : au-delà de 3, une liste déroulante les remplace au téléphone (CSS :
   * .nova-onglets-replies). La liste actionne les onglets eux-mêmes (clic sur l'ancre), qui
   * restent dans la page ; elle suit aussi les changements faits autrement. Lancé au chargement
   * complet : jQuery UI construit les onglets après ce script. */
  function ongletsCompacts() {
    Array.prototype.forEach.call(document.querySelectorAll('.wimsbody .ui-tabs'), function (bloc) {
      var nav = bloc.querySelector(':scope > .ui-tabs-nav');
      if (!nav || bloc.querySelector(':scope > .nova-onglets-liste')) return;
      var ancres = nav.querySelectorAll('.ui-tabs-anchor');
      if (ancres.length <= 3) return;
      var liste = document.createElement('select');
      liste.className = 'nova-onglets-liste';
      liste.setAttribute('aria-label', document.documentElement.lang === 'en' ? 'Tabs' : 'Onglets');
      Array.prototype.forEach.call(ancres, function (a, i) {
        var o = document.createElement('option');
        o.value = i;
        o.textContent = (i + 1) + ' · ' + a.textContent.trim();
        liste.appendChild(o);
      });
      var synchroniser = function () {
        Array.prototype.forEach.call(ancres, function (a, i) {
          if (a.parentNode.classList.contains('ui-tabs-active')) liste.value = i;
        });
      };
      synchroniser();
      liste.addEventListener('change', function () { ancres[liste.value].click(); });
      new MutationObserver(synchroniser).observe(nav, { attributes: true, subtree: true, attributeFilter: ['class'] });
      bloc.insertBefore(liste, nav);
      bloc.classList.add('nova-onglets-replies');
    });
  }

  /* Menu enseignant simplifié / complet (accueil de la classe) : le serveur envoie le menu complet,
   * la classe html.nova-menu-simple (posée dans htmlheader.phtml) en masque une partie (cadre.css).
   * Le choix est gardé dans localStorage, donc par navigateur. */
  function basculeMenu() {
    var marque = document.getElementById('nova-menu-bascule');
    var menu = document.getElementById('wimsmenumodubox');
    if (!marque || !menu) return;
    var racine = document.documentElement;
    var bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'nova-menu-bascule';
    var afficher = function () {
      var simple = racine.classList.contains('nova-menu-simple');
      bouton.textContent = marque.getAttribute(simple ? 'data-voir-tout' : 'data-simplifier');
      bouton.setAttribute('aria-pressed', simple ? 'false' : 'true');
    };
    bouton.addEventListener('click', function () {
      var simple = racine.classList.toggle('nova-menu-simple');
      try { localStorage.setItem('nova_menu', simple ? 'simple' : 'complet'); } catch (e) { /* choix non retenu */ }
      afficher();
    });
    afficher();
    // Dans le menu (la colonne qui défile), mais APRÈS la construction de l'accordéon par jQuery UI :
    // présent avant, il en deviendrait un titre de section.
    var placer = function () {
      if (bouton.parentNode) return;
      if (menu.classList.contains('ui-accordion') || !window.jQuery || !jQuery.fn.accordion) menu.appendChild(bouton);
    };
    placer();
    if (!bouton.parentNode) window.addEventListener('load', function () { setTimeout(function () { placer(); if (!bouton.parentNode) menu.appendChild(bouton); }, 0); });
  }

  /* Écrans larges : le chronomètre (ou « Examen en cours ») au centre de la barre, s'il ne
   * chevauche rien ; sinon il garde sa place (cadre.css, .nova-centre). */
  function centrerBarre() {
    var barre = document.getElementById('wimstopbox');
    var centre = barre && barre.querySelector('.menuitem.chrono, .nova-examencours');
    if (!centre || !window.matchMedia) return;
    var large = window.matchMedia('(min-width: 768px)');
    var choc = function () {
      var r = centre.getBoundingClientRect();
      return Array.prototype.some.call(
        barre.querySelectorAll('.menuitem, .nova-classe, .nova-menu-bouton, .nova-plus'),
        function (e) {
          if (e === centre || centre.contains(e) || e.contains(centre) ||
              e.closest('.is-dropdown-submenu, .nova-plus-panneau') || !e.getClientRects().length) return false;
          var q = e.getBoundingClientRect();
          return q.right > r.left - 12 && q.left < r.right + 12;
        });
    };
    var placer = function () {
      centre.classList.remove('nova-centre');
      barre.classList.remove('nova-serree');
      if (!large.matches) return;
      centre.classList.add('nova-centre');
      if (!choc()) return;
      barre.classList.add('nova-serree');        // « Retour », « Outils » : pictogrammes seuls
      if (!choc()) return;
      barre.classList.remove('nova-serree');
      centre.classList.remove('nova-centre');
    };
    var verifier = function () {
      placer();
      // Barre sur deux lignes malgré tout : libellés de « Retour » et « Outils » retirés.
      if (large.matches && barre.getBoundingClientRect().height > 72) barre.classList.add('nova-serree');
    };
    verifier();
    var attente;
    window.addEventListener('resize', function () { clearTimeout(attente); attente = setTimeout(verifier, 100); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(verifier);
  }

  // Infobulles pour les entrées qui peuvent passer en pictogramme seul (cadre.css).
  function infobulles() {
    Array.prototype.forEach.call(document.querySelectorAll('#wimstopbox .menuitem:is(.back, .tools, .class_home) > a'), function (a) {
      if (!a.title) a.title = a.textContent.trim();
    });
  }

  function demarrer() { infobulles(); modeExamen(); chronoExercice(); initialiser(); chronometre(); barreCompacte(); basculeMenu(); centrerBarre(); }
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
