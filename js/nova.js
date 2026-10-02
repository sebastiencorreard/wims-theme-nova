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

    // Plus aucun exercice à ouvrir (tout est fait, course arrêtée, ou temps écoulé) : la session
    // reste ouverte chez WIMS, et bloque les autres examens, tant que l'élève n'a pas cliqué sur
    // « Terminer » — qui le déconnecte. On le lui dit, avec le bouton sous la main.
    var corps = document.querySelector('.wimsbody');
    if (corps && !corps.querySelector('a[href*="worksheet="]') && !document.querySelector('.nova-fin-session')) {
      var encadre = document.createElement('div');
      encadre.className = 'nova-fin-session';
      encadre.setAttribute('role', 'status');
      var fort = document.createElement('strong');
      fort.textContent = t('fin-session', '');
      var detail = document.createElement('p');
      detail.textContent = t('fin-session-detail', '');
      var bouton = document.createElement('a');
      bouton.className = 'nova-fin-session-bouton';
      bouton.href = fin.href;
      bouton.textContent = t('terminer', 'Terminer');
      encadre.appendChild(fort);
      encadre.appendChild(detail);
      encadre.appendChild(bouton);
      corps.insertBefore(encadre, corps.firstChild);
    }
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
  /* Fenêtre de vérification d'un exercice d'examen (session « …_check ») : l'exercice y est rejoué,
   * son horloge vaut 00:00 ; ni chronomètre ni « Temps écoulé » (signalé le 2026-10-02). */
  function fenetreVerification() {
    return /[?&+]session=[^&]*_check/.test(location.href) || !!document.querySelector('a[href*="_check."]');
  }
  function chronoExercice() { if (!fenetreVerification()) chronoMiroir(document.getElementById('clockoef'), false); }

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
        item.classList.contains('nova-retour') || item.classList.contains('nova-pages') ||
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
        o.textContent = (i + 1) + ' \u00B7 ' + a.textContent.trim();
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
   * la classe html.nova-menu-simple (posée dans htmlheader.phtml) en masque une partie, d'après la
   * règle écrite par ce même script (<style id="nova-menu-style">, window.novaMenu). Les choix sont
   * gardés dans localStorage, donc par navigateur : nova_menu (simple ou complet) et nova_menu_garde
   * (les entrées gardées, repérées par la classe de leur .menuitem). */
  function basculeMenu() {
    var marque = document.getElementById('nova-menu-bascule');
    var menu = document.getElementById('wimsmenumodubox');
    if (!marque || !menu) return;
    var racine = document.documentElement;
    var texte = function (nom) { return marque.getAttribute('data-' + nom) || ''; };
    var memoriser = function (cle, valeur) { try { localStorage.setItem(cle, valeur); } catch (e) { /* choix non retenu */ } };
    var bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'nova-menu-bascule';
    var afficher = function () {
      var simple = racine.classList.contains('nova-menu-simple');
      bouton.textContent = texte(simple ? 'voir-tout' : 'simplifier');
      bouton.setAttribute('aria-pressed', simple ? 'false' : 'true');
      bouton.hidden = racine.classList.contains('nova-menu-edition');
    };
    bouton.addEventListener('click', function () {
      var simple = racine.classList.toggle('nova-menu-simple');
      memoriser('nova_menu', simple ? 'simple' : 'complet');
      afficher();
    });
    var actions = document.createElement('div');
    actions.className = 'nova-menu-actions';
    actions.appendChild(bouton);
    var personnel = menuPersonnel(menu, racine, texte, memoriser, afficher);
    if (personnel) personnel.forEach(function (e) { actions.appendChild(e); });
    afficher();
    // Dans le menu (la colonne qui défile), mais APRÈS la construction de l'accordéon par jQuery UI :
    // présent avant, il en deviendrait un titre de section.
    var placer = function () {
      if (actions.parentNode) return;
      if (menu.classList.contains('ui-accordion') || !window.jQuery || !jQuery.fn.accordion) menu.appendChild(actions);
    };
    placer();
    if (!actions.parentNode) window.addEventListener('load', function () { setTimeout(function () { placer(); if (!actions.parentNode) menu.appendChild(actions); }, 0); });
  }

  /* Choisir les entrées du menu simplifié : en édition, toutes les entrées s'affichent avec un œil ;
   * un clic sur la ligne (le lien ne s'ouvre pas) ou sur l'œil cache ou montre l'entrée ; l'œil d'un
   * titre agit sur toute sa famille. La règle de masquage est réécrite à chaque changement. */
  function menuPersonnel(menu, racine, texte, memoriser, afficher) {
    var regle = document.getElementById('nova-menu-style');
    var nm = window.novaMenu;
    if (!regle || !nm || !texte('personnaliser')) return null;
    var garde = nm.garde.slice();
    var cle = function (item) {
      for (var i = 0; i < item.classList.length; i++) {
        var c = item.classList[i];
        if (c !== 'menuitem' && c.indexOf('nova-') !== 0 && !/[^A-Za-z0-9_-]/.test(c)) return c;
      }
      return null;
    };
    var nom = function (e) { return (e.querySelector('a') || e).textContent.replace(/\s+/g, ' ').trim(); };
    var familles = [];  // [titre, [entrées]]
    Array.prototype.forEach.call(menu.querySelectorAll('.menu_title'), function (titre) {
      var bloc = titre.nextElementSibling;
      var items = bloc ? Array.prototype.filter.call(bloc.querySelectorAll('.menuitem'), cle) : [];
      if (items.length) familles.push([titre, items]);
    });
    if (!familles.length) return null;
    var editer = document.createElement('button');
    editer.type = 'button';
    editer.className = 'nova-menu-bascule nova-menu-editer';
    var defaut = document.createElement('button');
    defaut.type = 'button';
    defaut.className = 'nova-menu-defaut';
    defaut.textContent = texte('defaut');
    defaut.hidden = true;
    var oeil = function (parent) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'nova-oeil';
      parent.appendChild(b);
    };
    var rafraichir = function () {
      familles.forEach(function (f) {
        var visibles = 0;
        f[1].forEach(function (item) {
          var vue = garde.indexOf(cle(item)) >= 0;
          if (vue) visibles++;
          item.classList.toggle('nova-masquee', !vue);
          var b = item.querySelector(':scope > .nova-oeil');
          if (b) {
            b.setAttribute('aria-pressed', vue ? 'true' : 'false');
            b.setAttribute('aria-label', texte(vue ? 'cacher' : 'montrer') + ' : ' + nom(item));
          }
        });
        f[0].classList.toggle('nova-masquee', !visibles);
        var bt = f[0].querySelector(':scope > .nova-oeil');
        if (bt) bt.setAttribute('aria-label', texte(visibles ? 'cacher' : 'montrer') + ' : ' + nom(f[0]));
      });
      regle.textContent = nm.style(garde);
      defaut.hidden = !enEdition() || garde.slice().sort().join() === nm.defaut.slice().sort().join();
    };
    var basculer = function (cles, montrer) {
      cles.forEach(function (c) {
        var i = garde.indexOf(c);
        if (montrer && i < 0) garde.push(c);
        if (!montrer && i >= 0) garde.splice(i, 1);
      });
      memoriser('nova_menu_garde', JSON.stringify(garde));
      rafraichir();
    };
    var enEdition = function () { return racine.classList.contains('nova-menu-edition'); };
    var etiqueter = function () {
      editer.textContent = texte(enEdition() ? 'termine' : 'personnaliser');
      editer.setAttribute('aria-pressed', enEdition() ? 'true' : 'false');
    };
    editer.addEventListener('click', function () {
      if (!enEdition()) {
        if (!menu.querySelector('.nova-oeil')) familles.forEach(function (f) { oeil(f[0]); f[1].forEach(oeil); });
        racine.classList.add('nova-menu-edition');
      } else {
        // Terminé : on revient au menu simplifié, celui qu'on vient de composer.
        racine.classList.remove('nova-menu-edition');
        racine.classList.add('nova-menu-simple');
        memoriser('nova_menu', 'simple');
      }
      rafraichir();
      etiqueter();
      afficher();
    });
    defaut.addEventListener('click', function () {
      garde = nm.defaut.slice();
      try { localStorage.removeItem('nova_menu_garde'); } catch (e) { /* rien à oublier */ }
      rafraichir();
    });
    // En édition, un clic dans le menu bascule l'entrée ou la famille au lieu d'ouvrir le lien ou
    // de replier l'accordéon (écouteur en capture : il passe avant ceux de jQuery UI).
    menu.addEventListener('click', function (ev) {
      if (!enEdition()) return;
      var item = ev.target.closest('.menuitem');
      var titre = ev.target.closest('.menu_title');
      var f = null;
      familles.forEach(function (x) { if (x[0] === titre) f = x; });
      if (item && cle(item)) basculer([cle(item)], item.classList.contains('nova-masquee'));
      else if (f) basculer(f[1].map(cle), f[0].classList.contains('nova-masquee'));
      else return;
      ev.preventDefault();
      ev.stopPropagation();
    }, true);
    etiqueter();
    return [editer, defaut];
  }

  /* Sections repliables du menu de gauche (demandé le 2026-10-02) : un clic (ou Entrée, Espace) sur
   * le titre d'une famille la replie ou la déplie. WIMS en fait un accordéon jQuery UI que Nova
   * tient ouvert (cadre.css) ; on garde ses écouteurs à l'écart (capture, stopPropagation) et on
   * replie par une classe. L'état est gardé par navigateur et par nom de section (localStorage
   * nova_menu_replie). En édition du menu simplifié, le titre garde son rôle (menuPersonnel). */
  function sectionsRepliables() {
    var menu = document.getElementById('wimsmenumodubox');
    if (!menu) return;
    var titres = Array.prototype.filter.call(menu.querySelectorAll('.menu_title'), function (t) {
      return t.nextElementSibling && t.nextElementSibling.querySelector('.menuitem');
    });
    if (!titres.length) return;
    var lire = function () { try { return JSON.parse(localStorage.getItem('nova_menu_replie') || '[]'); } catch (e) { return []; } };
    var nom = function (t) { return t.textContent.replace(/\s+/g, ' ').trim(); };
    var replies = lire();
    if (!Array.isArray(replies)) replies = [];
    var appliquer = function (t) {
      var replie = replies.indexOf(nom(t)) >= 0;
      t.classList.toggle('nova-replie', replie);
      t.setAttribute('aria-expanded', replie ? 'false' : 'true');
    };
    titres.forEach(function (t) {
      t.classList.add('nova-repliable');
      t.setAttribute('role', 'button');
      t.setAttribute('tabindex', '0');
      t.removeAttribute('aria-selected');
      appliquer(t);
    });
    var basculer = function (t) {
      var i = replies.indexOf(nom(t));
      if (i >= 0) replies.splice(i, 1); else replies.push(nom(t));
      try { localStorage.setItem('nova_menu_replie', JSON.stringify(replies)); } catch (e) { /* choix non retenu */ }
      appliquer(t);
    };
    var cible = function (ev) {
      if (document.documentElement.classList.contains('nova-menu-edition')) return null;
      var t = ev.target.closest('.menu_title');
      return t && titres.indexOf(t) >= 0 ? t : null;
    };
    menu.addEventListener('click', function (ev) {
      var t = cible(ev);
      if (!t) return;
      ev.preventDefault();
      ev.stopPropagation();
      basculer(t);
    }, true);
    menu.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      var t = cible(ev);
      if (!t) return;
      ev.preventDefault();
      ev.stopPropagation();
      basculer(t);
    }, true);
  }

  /* Retour en haut : la pastille (cadre.css) n'apparaît qu'après une demi-hauteur d'écran de
   * défilement. WIMS ne pose son widget (_widgets/topback.phtml) que dans tail, doctail et user : pas
   * sur l'accueil enseignant d'une classe ni sur celui du site, pourtant longs. Nova le crée alors,
   * pour que la règle soit la même partout. Le lien vide de WIMS reçoit un nom accessible. */
  function retourEnHaut() {
    var lien = document.getElementById('back-to-top');
    if (!lien) {
      if (!document.getElementById('wimstopbox')) return;
      var noms = { fr: 'Haut de page', en: 'Top of page', nl: 'Naar boven' };
      var langue = (document.documentElement.lang || 'fr').slice(0, 2);
      var bloc = document.createElement('div');
      bloc.className = 'wims_topback';
      lien = document.createElement('a');
      lien.id = 'back-to-top';
      lien.href = '#wimstopbox';
      lien.title = noms[langue] || noms.en;
      lien.addEventListener('click', function (ev) {
        ev.preventDefault();
        var doux = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        window.scrollTo({ top: 0, behavior: doux ? 'smooth' : 'auto' });
      });
      bloc.appendChild(lien);
      document.body.appendChild(bloc);
    }
    if (lien.title && !lien.getAttribute('aria-label')) lien.setAttribute('aria-label', lien.title);
    var racine = document.documentElement, attente = false;
    var maj = function () {
      attente = false;
      racine.classList.toggle('nova-defile', window.scrollY > window.innerHeight * 0.5);
    };
    window.addEventListener('scroll', function () {
      if (!attente) { attente = true; window.requestAnimationFrame(maj); }
    }, { passive: true });
    maj();
  }

  /* Page « Détails des examens » : garde dans le navigateur les types des pages de vérification
   * (q, r) que tail.phtml a lus dans les journaux, pour la fenêtre de vérification (pagesExamen). */
  function typesExamen() {
    var e = document.getElementById('nova-examtypes');
    if (!e) return;
    var cle = 'nova_examtypes_' + (e.getAttribute('data-user') || '');
    var connus = {};
    try { connus = JSON.parse(localStorage.getItem(cle) || '{}') || {}; } catch (x) { connus = {}; }
    (e.getAttribute('data-types') || '').split(';').forEach(function (entree) {
      var i = entree.indexOf('=');
      if (i > 0) connus[entree.slice(0, i).trim()] = entree.slice(i + 1).replace(/\s+/g, '');
    });
    try { localStorage.setItem(cle, JSON.stringify(connus)); } catch (x) { /* fenêtre sans Q/R exacts */ }
  }

  /* Fenêtre « vérification d'un exercice d'examen » (adm/class/userscore, job=examcheck ; demandé le
   * 2026-10-02). WIMS (html/headmenu_user.phtml) écrit dans la barre « Pages : 1 ... 4 5 6 ... 12 » :
   * la première, la précédente, la courante, la suivante et la dernière page, « ... » ailleurs, quelle
   * que soit la place. Nova reconstruit TOUTES les pages, nommées d'après leur type, lu dans le journal
   * de l'élève sur la page « Détails des examens » (tail.phtml, typesExamen) : une question (new, next) devient Qk, une
   * réponse (reply) Rk — Q1 R1 Q2 R2... Dans un exercice à étapes ou une course (une question, puis une
   * réponse par étape), chaque réponse intermédiaire affiche la question suivante et la dernière
   * l'analyse de toutes : Q1 Q2 ... Q10 R1-10. La courante est mise en évidence ; « Pages : » disparaît. Les « … »
   * n'interviennent qu'en dernier recours : on cache d'abord les pages les plus éloignées de la
   * courante, en gardant toujours la première, la dernière et les voisines. L'information « élève :
   * exercice, N steps, note » descend en tête de page. */
  function pagesExamen() {
    var nav = document.querySelector('#wimstopbox li.menuitem.nav');
    if (!nav) return;
    var liens = nav.querySelectorAll('a[href*="checkstep="]');
    var modele = liens.length ? liens[0].getAttribute('href') : '';
    // Autre vérification (exercice de feuille, devoir libre) : la barre de WIMS, rendue visible
    // (cadre.css la cache jusqu'à ce que ce script passe, contre le clignotement).
    var garderWims = function () { nav.classList.add('nova-nav-wims'); };
    if (modele.indexOf('job=examcheck') < 0) { garderWims(); return; }
    var courant = 0, maxi = 0;
    Array.prototype.forEach.call(nav.childNodes, function (n) {
      if (n.nodeType === 3) (n.textContent.match(/\d+/g) || []).forEach(function (x) { courant = +x; });
    });
    Array.prototype.forEach.call(liens, function (a) { maxi = Math.max(maxi, parseInt(a.textContent, 10) || 0); });
    var info = document.querySelector('#wimstopbox li.menuitem.score');
    var m = info && info.textContent.match(/(\d+)\s*steps?/);
    var total = Math.max(m ? +m[1] : 0, maxi, courant);
    if (!total) { garderWims(); return; }
    var langue = (document.documentElement.lang || 'fr').slice(0, 2);
    var mots = { fr: ['Question', 'R\u00e9ponse', 'Pages'], en: ['Question', 'Answer', 'Pages'], nl: ['Vraag', 'Antwoord', "Pagina's"] }[langue] ||
      ['Question', 'Answer', 'Pages'];
    var liste = document.createElement('ol');
    liste.className = 'nova-pages-liste';
    var bloc = document.createElement('nav');
    bloc.setAttribute('aria-label', mots[2]);
    bloc.appendChild(liste);
    nav.textContent = '';
    nav.appendChild(bloc);
    nav.classList.add('nova-pages');
    if (info && info.textContent.trim()) {
      var corps = document.querySelector('.wimsbody');
      if (corps) {
        var ligne = document.createElement('p');
        ligne.className = 'nova-pages-info';
        ligne.innerHTML = info.innerHTML;
        corps.insertBefore(ligne, corps.firstChild);
      }
      info.remove();
    }
    // Type de chaque page (q = question, r = réponse), lu dans le journal sur la page « Détails des
    // examens » (tail.phtml, typesExamen) et gardé dans le navigateur ; à défaut, l'alternance.
    var types = [];
    var cle = function (nom) { var r = new RegExp('[?&+]' + nom + '=([^&]*)').exec(modele); return r ? decodeURIComponent(r[1]) : ''; };
    try {
      var connus = JSON.parse(localStorage.getItem('nova_examtypes_' + cle('checkuser')) || '{}');
      types = (connus[cle('checksession') + ':' + cle('checkexo')] || '').split(',');
    } catch (e) { types = []; }
    if (types.length !== total || types.some(function (t) { return t !== 'q' && t !== 'r'; })) {
      types = [];
      for (var t = 1; t <= total; t++) types.push(t % 2 ? 'q' : 'r');
    }
    // Libellés. Une question (q) est Qk. Une réponse suivie d'une autre réponse (exercice à étapes,
    // course) affiche en fait la question suivante : Qk+1. La dernière réponse d'une suite affiche
    // l'analyse de toute la suite : Rk, ou Rk-m si elle couvre les questions k à m.
    var libelles = [], titres = [], nq = 0, debut = 0;
    types.forEach(function (t, i) {
      if (t === 'q') { debut = ++nq; libelles.push('Q' + nq); titres.push(mots[0] + ' ' + nq); return; }
      if (types[i + 1] === 'r') { libelles.push('Q' + (++nq)); titres.push(mots[0] + ' ' + nq); return; }
      var de = debut || 1, a = Math.max(nq, de);
      libelles.push(de === a ? 'R' + a : 'R' + de + '-' + a);
      titres.push(mots[1] + ' ' + (de === a ? a : de + '-' + a));
    });
    var element = function (n) {
      var question = libelles[n - 1].charAt(0) === 'Q';
      var li = document.createElement('li');
      li.className = question ? 'nova-page-q' : 'nova-page-r';
      var e;
      if (n === courant) {
        e = document.createElement('span');
        e.setAttribute('aria-current', 'page');
        e.className = 'nova-page nova-page-courante';
      } else {
        e = document.createElement('a');
        e.className = 'nova-page';
        e.href = modele.replace(/checkstep=\d+/, 'checkstep=' + n);
      }
      e.textContent = libelles[n - 1];
      e.title = titres[n - 1];
      li.appendChild(e);
      return li;
    };
    var dessiner = function (visibles) {
      liste.textContent = '';
      var avant = 0;
      visibles.forEach(function (n) {
        if (avant && n > avant + 1) {
          var trou = document.createElement('li');
          trou.className = 'nova-page-ellipse';
          trou.setAttribute('aria-hidden', 'true');
          trou.textContent = '\u2026';
          liste.appendChild(trou);
        }
        liste.appendChild(element(n));
        avant = n;
      });
    };
    var ajuster = function () {
      var visibles = [];
      for (var n = 1; n <= total; n++) visibles.push(n);
      dessiner(visibles);
      var c = courant || 1;
      while (liste.scrollWidth > liste.clientWidth + 1) {
        var retirable = visibles.filter(function (n) { return n !== 1 && n !== total && Math.abs(n - c) > 1; });
        // Dernier recours : les voisines aussi ; restent la première, la courante et la dernière.
        if (!retirable.length) retirable = visibles.filter(function (n) { return n !== 1 && n !== total && n !== c; });
        if (!retirable.length) break;
        retirable.sort(function (a, b) { return Math.abs(b - c) - Math.abs(a - c) || b - a; });
        visibles.splice(visibles.indexOf(retirable[0]), 1);
        dessiner(visibles);
      }
    };
    ajuster();
    if (window.ResizeObserver) new ResizeObserver(function () { window.requestAnimationFrame(ajuster); }).observe(nav);
    else window.addEventListener('resize', ajuster);
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

  /* Élèves (#nova-eleve, header.phtml) : pas de fil d'Ariane (masqué en CSS), mais un bouton
   * « Retour » dans la barre, juste après ☰, vers le niveau précédent du fil — le dernier lien
   * de celui-ci (exercice → feuille → chapitre → accueil). Rien sur l'accueil (aucun lien), ni
   * pendant un examen ou dans la fenêtre d'exercice, qui ont leurs propres boutons. */
  function retourEleve() {
    if (!document.getElementById('nova-eleve') || document.body.classList.contains('nova-examen-session')) return;
    var barre = document.getElementById('wimstopbox');
    var fil = document.querySelector('.breadcrumbs');
    if (!barre || !fil || barre.querySelector('.menuitem.back, .menuitem.chrono')) return;
    var liens = fil.querySelectorAll('a[href]');
    if (!liens.length) return;
    var precedent = liens[liens.length - 1];
    var textes = document.getElementById('nova-textes');
    var libelle = (textes && textes.getAttribute('data-retour')) || 'Retour';
    var item = document.createElement('span');
    item.className = 'menuitem nova-retour';
    var a = document.createElement('a');
    a.href = precedent.href;
    a.className = 'nova-retour-lien';
    a.title = libelle + ' : ' + precedent.textContent.trim();
    a.setAttribute('aria-label', a.title);
    var texte = document.createElement('span');
    texte.className = 'text_item';
    texte.textContent = libelle;
    a.appendChild(texte);
    item.appendChild(a);
    var bloc = barre.querySelector('.wimsmenu.float_left') || barre;
    bloc.insertBefore(item, bloc.firstChild);
  }

  /* Barres de score (themes/_widgets/userbar.phtml) : charte Nova (cadre.css / contenu.css).
   *  - feuille : segments par exercice, état lu dans la classe WIMS (untry, undone, done,
   *    congratulation, unwork) + compteur « réussis/total » ;
   *  - examen : une case colorée en ligne par WIMS, note dans le titre (« Note:4/20 ») → pastille
   *    « 4/20 », niveau faible / moyen / bon.
   * Et, dans une carte d'activité, les blocs que WIMS laisse vides (espaces seuls) sont masqués. */
  /* Examen : la barre est l'HISTORIQUE des sessions passées (themes/_widgets/userexambar.phtml,
   * de la plus ancienne à la plus récente, nombre illimité — jusqu'à 99 pour certains DM). On en
   * montre autant que la largeur de la carte le permet : la plus récente en grand, avec sa note ;
   * les plus anciennes qui ne tiennent pas se résument en « +k » (notes en infobulle). Recalculé
   * quand la carte change de largeur (rotation, fenêtre). */
  function historique(barre, cases) {
    barre.classList.add('nova-score-examen');
    var n = cases.length;
    var ol = cases[0].parentNode;
    cases[n - 1].classList.add('nova-derniere');
    var plus = document.createElement('li');
    plus.className = 'nova-plus-anciennes';
    var ajuster = function () {
      Array.prototype.forEach.call(cases, function (li) { li.classList.remove('nova-ancienne'); });
      if (plus.parentNode) plus.remove();
      var dispo = barre.clientWidth;
      if (!dispo || ol.scrollWidth <= dispo) return;
      ol.insertBefore(plus, cases[0]);
      for (var k = 1; k < n; k++) {
        cases[k - 1].classList.add('nova-ancienne');
        plus.textContent = '+' + k;
        if (ol.scrollWidth <= dispo) break;
      }
      plus.title = Array.prototype.slice.call(cases, 0, k).map(function (li) {
        var a = li.querySelector('a'); return a ? a.textContent.trim() : '';
      }).join(' \u00B7 ');
    };
    ajuster();
    if (window.ResizeObserver) {
      var largeur = barre.clientWidth, attente = 0;
      new ResizeObserver(function () {
        if (barre.clientWidth === largeur) return;
        largeur = barre.clientWidth;
        cancelAnimationFrame(attente);
        attente = requestAnimationFrame(ajuster);
      }).observe(barre);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajuster);
  }

  function scores() {
    Array.prototype.forEach.call(document.querySelectorAll('.wims_score_bar'), function (barre) {
      if (barre.classList.contains('nova-score')) return;
      var cases = barre.querySelectorAll('ol > li');
      if (!cases.length) return;
      barre.classList.add('nova-score');
      var notes = 0;
      Array.prototype.forEach.call(cases, function (li) {
        var a = li.querySelector('a');
        var titre = (a && a.getAttribute('title')) || li.getAttribute('title') || '';
        var m = /(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)/.exec(titre);
        if (li.style.backgroundColor && m) {
          var r = parseFloat(m[1].replace(',', '.')) / parseFloat(m[2].replace(',', '.'));
          li.setAttribute('data-niveau', r >= 0.8 ? 'bon' : r >= 0.5 ? 'moyen' : 'faible');
          li.classList.add('nova-note');
          if (a) a.textContent = m[1] + '/' + m[2];
          notes++;
        }
      });
      if (notes) { historique(barre, cases); return; }
      var reussis = barre.querySelectorAll('ol > li.wims_exo_done').length;
      var compte = document.createElement('span');
      compte.className = 'nova-score-compte';
      compte.textContent = reussis + '/' + cases.length;
      barre.appendChild(compte);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.wimsbody li[class$="_item"] > :is(ul, div, span):not(.wims_score_bar, .wims_seq_item_n)'), function (bloc) {
      if (!bloc.textContent.trim() && !bloc.querySelector('img, svg, input, a, canvas')) bloc.classList.add('nova-vide');
    });
  }

  function demarrer() { infobulles(); modeExamen(); chronoExercice(); retourEleve(); scores(); initialiser(); chronometre(); typesExamen(); pagesExamen(); barreCompacte(); basculeMenu(); sectionsRepliables(); retourEnHaut(); centrerBarre(); }
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
