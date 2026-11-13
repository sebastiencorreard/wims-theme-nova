
  /* ===== js/src/10-barre-menus.js : barre du haut, menu latéral, menu personnalisable, profil, pied de page, retours ===== */
  /* Menu latéral sur téléphone et tablette : bouton de la barre du haut qui ouvre et ferme le menu
   * (#wimsmenumodubox) ; fermeture aussi par Échap, par un clic hors du menu ou en suivant un lien. */
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
      'stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/></svg>';
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

  /* Menus déroulants de la barre (compte, langues ; _widgets/user_links.phtml), sans Foundation
   * (2026-10-03). Clic ou toucher : ouvre et ferme ; survol avec une souris : ouvre, et referme en
   * sortant s'il n'a pas été ouvert d'un clic. Échap referme et rend le focus au déclencheur ;
   * flèche bas l'ouvre sur sa première entrée ; flèches, Début, Fin dans le menu ; un clic ou le
   * focus ailleurs le referme. Ouvert vers la gauche s'il sortirait de l'écran. Les classes sont
   * celles de Foundation, que le CSS suit déjà (foundation-min.css, cadre.css). */
  function menusDeroulants() {
    var survol = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)');
    var menus = [];
    // Autres menus Foundation de WIMS (adm/manage/motd : langue du message du jour).
    Array.prototype.forEach.call(document.querySelectorAll('[data-dropdown-menu]'), function (ul) {
      ul.removeAttribute('data-dropdown-menu');
      ul.classList.add('dropdown', 'menu', 'nova-menu-deroulant');
      Array.prototype.forEach.call(ul.children, function (li) {
        if (li.querySelector(':scope > ul') && li.querySelector(':scope > a')) li.classList.add('is-dropdown-submenu-parent');
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('#wimstopbox .dropdown.menu > li.is-dropdown-submenu-parent, .nova-menu-deroulant > li.is-dropdown-submenu-parent'), function (li) {
      var lien = li.querySelector(':scope > a'), liste = li.querySelector(':scope > ul');
      if (!lien || !liste) return;
      liste.classList.add('vertical', 'submenu', 'is-dropdown-submenu');
      Array.prototype.forEach.call(liste.children, function (e) { e.classList.add('is-submenu-item', 'is-dropdown-submenu-item'); });
      if (!liste.id) liste.id = 'nova-sousmenu-' + menus.length;
      lien.setAttribute('role', 'button');
      if (!lien.hasAttribute('href')) lien.tabIndex = 0;
      lien.setAttribute('aria-controls', liste.id);
      lien.setAttribute('aria-expanded', 'false');
      var m = { li: li, lien: lien, liste: liste, epingle: false, minuterie: 0 };
      menus.push(m);
      function entrees() {
        return Array.prototype.filter.call(liste.querySelectorAll('a[href]'), function (a) { return a.getClientRects().length; });
      }
      m.entrees = entrees;
      lien.addEventListener('click', function (e) {
        e.preventDefault();
        if (estOuvert(m) && m.epingle) fermer(m); else { ouvrir(m); m.epingle = true; }
      });
      lien.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !lien.hasAttribute('href')) { e.preventDefault(); lien.click(); }
        else if (e.key === 'ArrowDown' || e.key === ' ') {
          e.preventDefault();
          ouvrir(m); m.epingle = true;
          var a = entrees()[0]; if (a) a.focus();
        }
      });
      liste.addEventListener('keydown', function (e) {
        var a = entrees(), i = a.indexOf(document.activeElement), j = -1;
        if (e.key === 'ArrowDown') j = (i + 1) % a.length;
        else if (e.key === 'ArrowUp') j = (i - 1 + a.length) % a.length;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = a.length - 1;
        if (j >= 0 && a.length) { e.preventDefault(); a[j].focus(); }
      });
      li.addEventListener('mouseenter', function () {
        if (!survol || !survol.matches) return;
        clearTimeout(m.minuterie);
        if (!estOuvert(m)) ouvrir(m);
      });
      li.addEventListener('mouseleave', function () {
        if (!survol || !survol.matches || m.epingle) return;
        clearTimeout(m.minuterie);
        m.minuterie = setTimeout(function () { fermer(m); }, 300);
      });
      li.addEventListener('focusout', function (e) {
        if (e.relatedTarget && !li.contains(e.relatedTarget)) fermer(m);
      });
    });
    if (!menus.length) return;
    document.documentElement.classList.add('nova-menus');   // le repli au survol du CSS s'efface
    function estOuvert(m) { return m.liste.classList.contains('js-dropdown-active'); }
    function ouvrir(m) {
      menus.forEach(function (n) { if (n !== m) fermer(n); });
      m.li.classList.remove('opens-left'); m.liste.classList.remove('opens-left', 'nova-ouvre-droite');
      m.li.classList.add('is-active');
      m.liste.classList.add('js-dropdown-active');
      m.lien.setAttribute('aria-expanded', 'true');
      if (m.liste.getBoundingClientRect().right > document.documentElement.clientWidth - 4) {
        m.li.classList.add('opens-left'); m.liste.classList.add('opens-left');
      }
      // Dépasse à gauche (menu des langues, aligné à droite par le CSS, au téléphone où il est à gauche
      // de la barre) : on l'aligne sur le bord gauche de son bouton.
      if (m.liste.getBoundingClientRect().left < 4) m.liste.classList.add('nova-ouvre-droite');
    }
    function fermer(m) {
      clearTimeout(m.minuterie);
      m.epingle = false;
      m.li.classList.remove('is-active');
      m.liste.classList.remove('js-dropdown-active');
      m.lien.setAttribute('aria-expanded', 'false');
    }
    document.addEventListener('click', function (e) {
      menus.forEach(function (m) { if (estOuvert(m) && !m.li.contains(e.target)) fermer(m); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      menus.forEach(function (m) {
        if (!estOuvert(m)) return;
        var dedans = m.li.contains(document.activeElement);
        fermer(m);
        if (dedans) m.lien.focus();
      });
    });
  }

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
        titre.textContent = (textes && textes.getAttribute('data-plus')) || 'More';
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
        '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>';
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

  /* Menu enseignant personnalisé, gardé sur le serveur (demande de l'utilisateur, 2026-10-07 ; header.phtml) :
   * valeur « simple|complet.entrée.entrée… » dans log/classes/<structure ou classe>/.nova_menu_<login>.
   * Le navigateur en garde une copie (localStorage, lue par le script de tête avant l'affichage). Sur une page où le
   * serveur la transmet (#nova-menu-serveur), elle remplace la copie, sauf changement pas encore envoyé
   * (nova_menu_envoi) ; un changement est envoyé avec le lien WIMS suivant (paramètre nova_menu, ignoré des
   * modules), écrit par le serveur si ce lien mène à un module de confiance, sinon renvoyé au lien d'après. */
  function valeurMenu() {
    var nm = window.novaMenu;
    // « defaut » : l'enseignant n'a pas choisi lui-même (menu simplifié, ou complet avec le réglage « Menu
    // enseignant complet par défaut ») ; sinon son choix.
    // modtool : choix à part (préfixe « modtool- », fichier à part sur le serveur ; header.phtml).
    var suf = nm ? nm.suffixe || '' : '';
    var etat = 'defaut';
    try { etat = localStorage.getItem('nova_menu' + suf) || 'defaut'; } catch (e) { /* sans stockage */ }
    return [(nm && nm.contexte || '') + etat].concat(nm ? nm.garde : []).join('.');
  }
  function menuServeur() {
    var nm = window.novaMenu;
    var racine = document.documentElement;
    var lire = function (cle) { try { return localStorage.getItem(cle); } catch (e) { return null; } };
    var ecrire = function (cle, v) { try { if (v === null) localStorage.removeItem(cle); else localStorage.setItem(cle, v); } catch (e) { /* sans stockage */ } };
    var source = document.getElementById('nova-menu-serveur');
    var attente = lire('nova_menu_envoi');
    if (source && nm) {
      var serveur = source.textContent.trim();
      if (attente && attente === serveur) { ecrire('nova_menu_envoi', null); attente = null; }
      var ctx = nm.contexte || '';
      if (!attente && serveur.indexOf(ctx) === 0 && /^(simple|complet|defaut)(\.[A-Za-z0-9_-]+)*$/.test(serveur.slice(ctx.length))) {
        var morceaux = serveur.slice(ctx.length).split('.');
        var simple = morceaux[0] === 'defaut' ? (nm.inverse || !standard('menu-complet')) : morceaux[0] === 'simple';
        nm.garde = morceaux.slice(1);
        ecrire('nova_menu' + (nm.suffixe || ''), morceaux[0] === 'defaut' ? null : morceaux[0]);
        ecrire('nova_menu_garde' + (nm.suffixe || ''), JSON.stringify(nm.garde));
        racine.classList.toggle('nova-menu-simple', simple);
        var regle = document.getElementById('nova-menu-style');
        if (regle) regle.textContent = nm.style(nm.garde);
      }
    }
    // Nouvelles entrees Participants (suivi ; avatars, 2026-11-12) : gardees une fois, puis personnalisables comme les autres.
    [['nova_suivi', 'suivi_v1'], ['nova_avatars', 'avatars_v1']].forEach(function (n) {
      if (!nm || nm.inverse || !document.querySelector('#wimsmenumodubox .' + n[0]) || nm.garde.indexOf(n[1]) >= 0) return;
      if (nm.garde.indexOf(n[0]) < 0) nm.garde.push(n[0]);
      nm.garde.push(n[1]);
      ecrire('nova_menu_garde', JSON.stringify(nm.garde));
      ecrire('nova_menu_envoi', valeurMenu());
      var styleSuivi = document.getElementById('nova-menu-style');
      if (styleSuivi) styleSuivi.textContent = nm.style(nm.garde);
    });
    // Envoi d'un changement en attente avec le prochain lien de WIMS (même session).
    document.addEventListener('click', function (e) {
      var v = lire('nova_menu_envoi');
      var a = v && e.target.closest && e.target.closest('a[href*="wims.cgi"]');
      if (!a || a.target === '_blank' || !/[?&+]session=/.test(a.href) || /wims_window=new/.test(a.href) || /[?&]nova_menu=/.test(a.href)) return;
      var parts = a.href.split('#');
      a.href = parts[0] + '&nova_menu=' + v + (parts.length > 1 ? '#' + parts.slice(1).join('#') : '');
    }, true);
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
    var memoriser = function (cle, valeur) {
      try {
        localStorage.setItem(cle + (window.novaMenu.suffixe || ''), valeur);   // modtool : clés _modtool
        if (cle === 'nova_menu_garde') window.novaMenu.garde = JSON.parse(valeur);
        localStorage.setItem('nova_menu_envoi', valeurMenu());   // vers le serveur avec le lien suivant (menuServeur)
      } catch (e) { /* choix non retenu */ }
    };
    // Variante A (2026-11-11, maquette, utilisateur) : interrupteur « Menu simplifié » et crayon, en barre collée au
    // bas du menu ; en édition, « Revenir au menu par défaut » (icône) et « Terminé ».
    var bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'nova-menu-bascule';
    bouton.setAttribute('role', 'switch');
    var piste = document.createElement('span');
    piste.className = 'nova-menu-piste';
    piste.setAttribute('aria-hidden', 'true');
    var libelle = document.createElement('span');
    libelle.textContent = texte('simplifie');
    bouton.appendChild(piste);
    bouton.appendChild(libelle);
    var actions = document.createElement('div');
    var afficher = function () {
      var simple = racine.classList.contains('nova-menu-simple');
      bouton.setAttribute('aria-checked', simple ? 'true' : 'false');
      // Liste des entrées cachées (modtool, pages de module, accueils de structure) : rien de caché, rien à basculer :
      // interrupteur grisé, avec une info-bulle (2026-11-11, utilisateur : toujours la barre de la maquette A).
      var nm = window.novaMenu;
      var rien = !!(nm && nm.inverse && !nm.garde.length);
      bouton.hidden = racine.classList.contains('nova-menu-edition');
      bouton.disabled = rien;
      if (rien && texte('rien')) bouton.title = texte('rien'); else bouton.removeAttribute('title');
    };
    bouton.addEventListener('click', function () {
      var simple = racine.classList.toggle('nova-menu-simple');
      memoriser('nova_menu', simple ? 'simple' : 'complet');
      afficher();
    });
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
    // Entrées sans titre de famille (pages de module) : personnalisables aussi.
    var rangees = [];
    familles.forEach(function (f) { rangees = rangees.concat(f[1]); });
    var seules = Array.prototype.filter.call(menu.querySelectorAll('.menuitem'), function (item) {
      return cle(item) && rangees.indexOf(item) < 0 && !item.classList.contains('nova-deconnexion');
    });
    if (seules.length) familles.push([null, seules]);
    if (!familles.length) return null;
    var editer = document.createElement('button');
    editer.type = 'button';
    editer.className = 'nova-menu-editer';
    var editerTexte = document.createElement('span');
    editerTexte.className = 'nova-menu-libelle';
    editer.appendChild(editerTexte);
    var defaut = document.createElement('button');
    defaut.type = 'button';
    defaut.className = 'nova-menu-defaut';
    defaut.title = texte('defaut');
    defaut.setAttribute('aria-label', texte('defaut'));
    defaut.hidden = true;
    var consigne = document.createElement('p');
    consigne.className = 'nova-menu-consigne';
    consigne.textContent = texte('consigne');
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
          var vue = (garde.indexOf(cle(item)) >= 0) !== !!nm.inverse;   // modtool : liste des entrées cachées
          if (vue) visibles++;
          item.classList.toggle('nova-masquee', !vue);
          var b = item.querySelector(':scope > .nova-oeil');
          if (b) {
            b.setAttribute('aria-pressed', vue ? 'true' : 'false');
            b.setAttribute('aria-label', texte(vue ? 'cacher' : 'montrer') + ' : ' + nom(item));
          }
        });
        if (!f[0]) return;
        f[0].classList.toggle('nova-masquee', !visibles);
        var bt = f[0].querySelector(':scope > .nova-oeil');
        if (bt) bt.setAttribute('aria-label', texte(visibles ? 'cacher' : 'montrer') + ' : ' + nom(f[0]));
      });
      regle.textContent = nm.style(garde);
      defaut.hidden = !enEdition() || garde.slice().sort().join() === nm.defaut.slice().sort().join();
      afficher();
    };
    var basculer = function (cles, montrer) {
      var dans = montrer !== !!nm.inverse;   // modtool : montrer = retirer de la liste
      cles.forEach(function (c) {
        var i = garde.indexOf(c);
        if (dans && i < 0) garde.push(c);
        if (!dans && i >= 0) garde.splice(i, 1);
      });
      memoriser('nova_menu_garde', JSON.stringify(garde));
      rafraichir();
    };
    var enEdition = function () { return racine.classList.contains('nova-menu-edition'); };
    var etiqueter = function () {
      var t = texte(enEdition() ? 'termine' : 'personnaliser');
      editerTexte.textContent = t;
      editer.title = t;
      editer.setAttribute('aria-pressed', enEdition() ? 'true' : 'false');
    };
    editer.addEventListener('click', function () {
      if (!enEdition()) {
        if (!menu.querySelector('.nova-oeil')) familles.forEach(function (f) { if (f[0]) oeil(f[0]); f[1].forEach(oeil); });
        if (!consigne.parentNode && consigne.textContent) menu.insertBefore(consigne, menu.firstChild);
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
      nm.garde = garde.slice();
      try {
        localStorage.removeItem('nova_menu_garde' + (nm.suffixe || ''));
        localStorage.setItem('nova_menu_envoi', valeurMenu());
      } catch (e) { /* rien à oublier */ }
      rafraichir();
    });
    // En édition, un clic dans le menu bascule l'entrée ou la famille au lieu d'ouvrir le lien ou
    // de replier l'accordéon (écouteur en capture : il passe avant ceux de jQuery UI).
    menu.addEventListener('click', function (ev) {
      if (!enEdition()) return;
      var item = ev.target.closest('.menuitem');
      var titre = ev.target.closest('.menu_title');
      var f = null;
      familles.forEach(function (x) { if (x[0] && x[0] === titre) f = x; });
      if (item && cle(item)) basculer([cle(item)], item.classList.contains('nova-masquee'));
      else if (f) basculer(f[1].map(cle), f[0].classList.contains('nova-masquee'));
      else return;
      ev.preventDefault();
      ev.stopPropagation();
    }, true);
    etiqueter();
    return [defaut, editer];
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
        var doux = !animationsCoupees();
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
    window.requestAnimationFrame(maj);   // pas pendant le démarrage : scrollY force une mise en page (audit B2, 2026-11-13)
  }

  /* Écrans larges : le chronomètre (ou « Examen en cours ») au centre de la barre, s'il ne
   * chevauche rien ; sinon il garde sa place (cadre.css, .nova-centre). */
  /* Chronomètre ou « Examen en cours » au centre de la barre, à toutes les largeurs (demande de
   * l'utilisateur, 2026-10-06) : exactement au centre si rien ne le touche ; sinon à la position la plus
   * proche du centre où il ne touche rien (12 px d'écart) ; s'il ne tient nulle part, à sa place dans la
   * barre. Avant d'y renoncer : sur un écran large, « Retour » et « Outils » en pictogrammes (nova-serree) ;
   * partout, barre compacte (nova-compacte : accueil sans marge, libellé court de la pastille), puis sans
   * l'heure de fin du chronomètre (nova-sans-fin). La
   * position est posée par --nova-centre-x (CSS : .nova-centre, hors du flux). */
  function centrerBarre() {
    var barre = document.getElementById('wimstopbox');
    var centre = barre && barre.querySelector('.menuitem.chrono, .nova-examencours');
    if (!centre || !window.matchMedia) return;
    var large = window.matchMedia('(min-width: 768px)');
    var ECART = 12;
    var positionner = function () {
      var b = barre.getBoundingClientRect();
      var w = centre.getBoundingClientRect().width;
      var milieu = b.width / 2;
      var style = getComputedStyle(barre);
      var gauche = parseFloat(style.paddingLeft) || 0, droite = b.width - (parseFloat(style.paddingRight) || 0);
      Array.prototype.forEach.call(barre.querySelectorAll('.menuitem, .nova-classe, .nova-menu-bouton, .nova-plus'), function (e) {
        if (e === centre || centre.contains(e) || e.contains(centre) ||
            e.closest('.is-dropdown-submenu, .nova-plus-panneau') || !e.getClientRects().length) return;
        var q = e.getBoundingClientRect();
        if (!q.width) return;
        var g = q.left - b.left, d = q.right - b.left;
        if ((g + d) / 2 < milieu) gauche = Math.max(gauche, d + ECART); else droite = Math.min(droite, g - ECART);
      });
      if (droite - gauche < w) return false;
      var x = Math.min(Math.max(milieu, gauche + w / 2), droite - w / 2);
      centre.style.setProperty('--nova-centre-x', x + 'px');
      return true;
    };
    var placer = function () {
      centre.style.removeProperty('--nova-centre-x');
      barre.classList.remove('nova-serree', 'nova-compacte', 'nova-sans-fin');
      centre.classList.add('nova-centre');       // hors du flux : les voisins prennent leur place
      if (positionner()) return;
      if (large.matches) {
        barre.classList.add('nova-serree');      // « Retour », « Outils » : pictogrammes seuls
        if (positionner()) return;
        barre.classList.remove('nova-serree');
      }
      // Barre compacte : moins de marge autour de l'accueil, « Examen » au lieu de « Examen en cours ».
      barre.classList.add('nova-compacte');
      if (positionner()) return;
      // Puis sans l'heure de fin du chronomètre (« Fin à … ») : le décompte reste.
      if (centre.querySelector('.nova-chrono-fin')) {
        barre.classList.add('nova-sans-fin');
        if (positionner()) return;
        barre.classList.remove('nova-sans-fin');
      }
      barre.classList.remove('nova-compacte');
      centre.classList.remove('nova-centre');
      centre.style.removeProperty('--nova-centre-x');
    };
    var verifier = function () {
      placer();
      // Barre sur deux lignes malgré tout : libellés de « Retour » et « Outils » retirés.
      if (large.matches && barre.getBoundingClientRect().height > 72) { barre.classList.add('nova-serree'); placer(); }
    };
    verifier();
    var attente;
    window.addEventListener('resize', function () { clearTimeout(attente); attente = setTimeout(verifier, 100); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(verifier);
  }

  /* Élèves (#nova-eleve, header.phtml) : pas de fil d'Ariane (masqué en CSS), mais un bouton
   * « Retour » dans la barre, juste après ☰, vers le niveau précédent du fil — le dernier lien
   * de celui-ci (exercice → feuille → chapitre → accueil). Rien sur l'accueil (aucun lien), ni
   * pendant un examen ou dans la fenêtre d'exercice, qui ont leurs propres boutons. */
  function retourEleve() {
    if (standard('navigation')) return;   // réglage « Navigation complète pour l'élève » : fil d'Ariane
    if (!document.getElementById('nova-eleve') || document.body.classList.contains('nova-examen-session')) return;
    var barre = document.getElementById('wimstopbox');
    var fil = document.querySelector('.breadcrumbs');
    if (!barre || barre.querySelector('.menuitem.back, .menuitem.chrono')) return;
    // Pages Nova de l'accueil (Mon avatar, Mon activité ; signalé par l'utilisateur le 2026-11-07 : pas de sortie au
    // téléphone) : leur fil d'Ariane n'a pas de lien vers l'accueil, qui est leur page parente.
    var pageAccueil = /[?&+]nova_(avatar|activite)=1/.test(location.search) && lienAccueil('');
    if (!fil && !pageAccueil) return;
    // Le lien « Chapitre » qu'ajoute WIMS sur la page d'une feuille (module=home&seq=N) mène à la page
    // d'une seule séquence, sans onglets : on remonte à l'accueil de la classe, où WIMS rouvre l'onglet
    // d'origine (adm/tabscript, sessionStorage) — comme le retour depuis un examen.
    var liens = fil ? Array.prototype.filter.call(fil.querySelectorAll('a[href]'), function (a) {
      return !/[?&+]module=home(&|$)/.test(a.getAttribute('href')) || !/[?&+]seq=/.test(a.getAttribute('href'));
    }) : [];
    var precedent = liens[liens.length - 1];
    if (pageAccueil) {
      var maison = barre.querySelector('.class_home a[href]');
      precedent = { href: new URL(pageAccueil, location.href).href, textContent: maison ? maison.textContent : '' };
    }
    if (!precedent) return;
    var textes = document.getElementById('nova-textes');
    var libelle = (textes && textes.getAttribute('data-retour')) || 'Back';
    var item = document.createElement('span');
    item.className = 'menuitem nova-retour';
    var a = document.createElement('a');
    a.href = precedent.href;
    a.className = 'nova-retour-lien';
    a.title = precedent.textContent.trim() ? libelle + ' : ' + precedent.textContent.trim() : libelle;
    a.setAttribute('aria-label', a.title);
    var texte = document.createElement('span');
    texte.className = 'text_item';
    texte.textContent = libelle;
    a.appendChild(texte);
    item.appendChild(a);
    var bloc = barre.querySelector('.wimsmenu.float_left') || barre;
    bloc.insertBefore(item, bloc.firstChild);
  }

  /* Rubrique « Profil » en tête du menu latéral (demande de l'utilisateur, 2026-10-07, maquette A ; même style
   * qu'une rubrique ordinaire) : le menu du compte de la barre (nom, préférences, conditions, déconnexion), le
   * choix de la langue s'il y en a un, quittent la barre ; « Aide » de la barre passe dans la rubrique « Aide et
   * outils » si elle existe, sinon dans « Profil ». Élève et enseignant ; chez l'élève, le menu latéral est un
   * tiroir ☰ à toutes les largeurs (CSS). Pages sans menu latéral : la barre garde son menu du compte. Pendant
   * une session d'examen, modeExamen a déjà sa section « Profil ». */
  /* Entrée « Langue : <langue actuelle> » de la rubrique Profil, qui déplie la liste des autres langues (drapeau + nom,
   * langue actuelle cochée en tête). Libellés de WIMS ($wims_name_Language, lang_name_*). Clé profil_langue. */
  function choixLangue(selecteur, autres) {
    var d = document.createElement('div');
    d.className = 'menuitem profil_langue nova-langue';
    var bouton = document.createElement('a');
    bouton.href = '#';
    bouton.setAttribute('role', 'button');
    bouton.setAttribute('aria-expanded', 'false');
    var actuelle = selecteur.querySelector('a.current .legende, .disabled .legende');
    var nomActuel = actuelle ? actuelle.textContent.trim() : (document.documentElement.lang || '');
    var libelle = (selecteur.querySelector('a.lang') || selecteur).textContent.replace(/\s+/g, ' ').trim() || 'Language';
    var texte = document.createElement('span');
    texte.className = 'nova-langue-texte';
    texte.textContent = libelle + ' : ' + nomActuel;
    // Drapeau de la langue actuelle en guise d'icône : Font_Awesome n'a pas de globe, et le jeu « default » aucune icône.
    var drapeau = selecteur.querySelector('a.current img, a.lang img');
    if (drapeau) { var dr = drapeau.cloneNode(true); dr.alt = ''; dr.className = 'vignette'; bouton.appendChild(dr); }
    bouton.appendChild(texte);
    var liste = document.createElement('div');
    liste.className = 'nova-langues';
    liste.id = 'nova-langues';
    liste.hidden = true;
    bouton.setAttribute('aria-controls', liste.id);
    var courant = selecteur.querySelector('a.current');
    if (courant) {
      var c = courant.cloneNode(true);
      var precision = c.querySelector('.smaller');
      if (precision) precision.remove();
      c.setAttribute('aria-current', 'true');
      liste.appendChild(c);
    }
    Array.prototype.forEach.call(autres, function (a) {
      var copie = a.cloneNode(true);
      copie.removeAttribute('id');
      liste.appendChild(copie);
    });
    bouton.addEventListener('click', function (e) {
      if (document.documentElement.classList.contains('nova-menu-edition')) return;   // menuPersonnel s'en charge
      e.preventDefault();
      var ouvrir = liste.hidden;
      liste.hidden = !ouvrir;
      bouton.setAttribute('aria-expanded', ouvrir ? 'true' : 'false');
    });
    d.appendChild(bouton);
    d.appendChild(liste);
    return d;
  }

  function profilLateral() {
    var barre = document.getElementById('wimstopbox');
    var menu = document.getElementById('wimsmenumodubox');
    var racine = document.documentElement;
    var fini = function () { racine.classList.add('nova-profil-pret'); };
    if (standard('menus')) { fini(); return; }   // réglage « Menus du thème standard » : le compte reste dans la barre
    if (!barre || !menu || menu.querySelector('.nova-profil')) { fini(); return; }
    var compte = barre.querySelector('a.account');
    var liCompte = compte && compte.closest('li');
    if (!liCompte) { fini(); return; }
    var textes = document.getElementById('nova-textes');
    var cible = menu.querySelector('.modubox_content') || menu;
    var titre = document.createElement('h2');
    titre.className = 'menu_title nova-profil-titre';
    titre.textContent = (textes && textes.getAttribute('data-profil')) || 'Profile';
    var groupe = document.createElement('div');
    groupe.className = 'wimsmenu menu nova-profil';
    // Chaque entrée porte une clé « profil_<classe du lien> » : le menu simplifié peut la masquer, comme les
    // autres (demande de l'utilisateur, 2026-10-07) ; la déconnexion (cmd=close, ou classe visitor des
    // déconnexions CAS) n'en a pas : toujours visible (htmlheader.phtml).
    var cleProfil = function (a) {
      var c = ((a.getAttribute('class') || '').split(/\s+/).filter(function (x) { return /^[A-Za-z0-9_-]+$/.test(x); })[0]) || 'lien';
      return 'profil_' + c;
    };
    var ajouter = function (lien, ou) {
      if (!lien || !lien.getAttribute('href') || /^#/.test(lien.getAttribute('href'))) return;
      var d = document.createElement('div');
      d.className = 'menuitem';
      if (/[?&+]cmd=close/.test(lien.getAttribute('href')) || lien.classList.contains('visitor')) d.classList.add('nova-deconnexion');
      else d.classList.add(cleProfil(lien));
      var copie = lien.cloneNode(true);
      copie.removeAttribute('id');
      copie.removeAttribute('aria-controls');
      copie.removeAttribute('aria-expanded');
      d.appendChild(copie);
      (ou || groupe).appendChild(d);
    };
    var nom = document.createElement('div');
    nom.className = 'menuitem profil_nom nova-profil-nom';
    nom.textContent = compte.textContent.replace(/\s+/g, ' ').trim();
    groupe.appendChild(nom);
    // Langues (sélecteur de la barre, quand WIMS en met un : modtool, pages hors classe) : UNE entrée « Langue :
    // Français » qui déplie la liste (maquette A, demande de l'utilisateur, 2026-11-04 ; avant : une entrée par langue).
    var langues = barre.querySelector('#language_selector');
    if (langues) {
      var autres = langues.querySelectorAll('#lang_list a[href]');   // pas « ul a » : la liste de la barre contient le sélecteur
      if (autres.length) groupe.appendChild(choixLangue(langues, autres));
    }
    Array.prototype.forEach.call(liCompte.querySelectorAll('#user_links > li:not(.nova-cgu-compte)' + (standard('navigation') ? '' : ':not(.nova-lien-complet)') + ' a[href]'), function (a) { ajouter(a); });
    // Aide : rubrique « Aide et outils » (ou toute rubrique dont le titre parle d'aide), sinon Profil.
    var aides = barre.querySelectorAll('.menuitem:is(.help, .whelp)');
    if (aides.length) {
      var rubriqueAide = null;
      Array.prototype.forEach.call(menu.querySelectorAll('.menu_title'), function (t) {
        if (!rubriqueAide && /aide|help/i.test(t.textContent) && t.nextElementSibling) rubriqueAide = t.nextElementSibling;
      });
      Array.prototype.forEach.call(aides, function (item) {
        Array.prototype.forEach.call(item.querySelectorAll('a[href]'), function (a) {
          var avant = rubriqueAide && rubriqueAide.firstChild;
          var d = document.createElement('div');
          d.className = 'menuitem ' + (item.classList.contains('whelp') ? 'whelp' : 'help');
          var copie = a.cloneNode(true);
          copie.removeAttribute('id');
          d.appendChild(copie);
          if (rubriqueAide) rubriqueAide.insertBefore(d, avant); else groupe.appendChild(d);
        });
        item.remove();
      });
    }
    cible.insertBefore(groupe, cible.firstChild);
    cible.insertBefore(titre, groupe);
    liCompte.remove();
    if (langues) langues.remove();
    // Menu simplifié de l'enseignant : les entrées de Profil et l'Aide déplacée, nouvelles, sont gardées une
    // première fois (repère profil_v1 dans la liste), pour qu'aucune ne disparaisse d'elle-même.
    var nm = window.novaMenu;
    if (nm && !nm.inverse && document.getElementById('nova-menu-bascule') && nm.garde.indexOf('profil_v1') < 0) {
      Array.prototype.forEach.call(menu.querySelectorAll('.nova-profil .menuitem, .menuitem.help, .menuitem.whelp'), function (item) {
        Array.prototype.forEach.call(item.classList, function (c) {
          if ((/^profil_/.test(c) || c === 'help' || c === 'whelp') && nm.garde.indexOf(c) < 0) nm.garde.push(c);
        });
      });
      nm.garde.push('profil_v1');
      try {
        localStorage.setItem('nova_menu_garde', JSON.stringify(nm.garde));
        localStorage.setItem('nova_menu_envoi', valeurMenu());
      } catch (e) { /* cette page seulement */ }
      var regle = document.getElementById('nova-menu-style');
      if (regle) regle.textContent = nm.style(nm.garde);
    }
    fini();
  }

  /* Pied de page (demande de l'utilisateur, 2026-10-08) : CGU et Aide (_widgets/footer.phtml, barre .nova-pied au format
   * du pied de page de l'enseignant) rejoignent, sur l'accueil de l'enseignant, sa barre #wimsmenubox.footer. */
  function piedDePage() {
    var barre = document.querySelector('#wimsmenubox.footer');
    var pied = document.querySelector('body > .nova-pied');
    var groupe = pied && pied.querySelector('.nova-pied-groupe');
    if (!barre || !groupe) return;
    barre.appendChild(groupe);
    pied.parentNode.removeChild(pied);
  }

  /* Élève sur une page sans menu latéral (préférences d'affichage, liste des examens, devoirs libres ; 2026-11-11,
   * utilisateur) : Nova crée un menu vide, que profilLateral remplit avec le menu du compte (nom, « Changer le mot de
   * passe », déconnexion) ; le bouton ☰ (initialiser) l'ouvre, comme sur les autres pages. Réglage « Menus du thème
   * standard » : rien (le compte reste dans la barre). */
  function menuEleve() {
    var corps = document.getElementById('wimsbodybox');
    var barre = document.getElementById('wimstopbox');
    if (!corps || !barre || document.getElementById('wimsmenumodubox') || !document.getElementById('nova-eleve')) return;
    if (standard('menus') || !barre.querySelector('a.account')) return;
    var menu = document.createElement('div');
    menu.id = 'wimsmenumodubox';
    menu.className = 'nova-menu-cree';
    var contenu = document.createElement('div');
    contenu.className = 'modubox_content';
    menu.appendChild(contenu);
    corps.insertBefore(menu, corps.firstChild);
  }

  function placerMenu() {
    var menu = document.getElementById('wimsmenumodubox');
    // Classe connue du jeu Font_Awesome de WIMS ; le jeu default reste sans icone.
    if (menu) {
      var suivi = menu.querySelector('.nova_suivi > a');
      if (suivi) suivi.classList.add('eye');
      // Avatars des élèves (2026-11-12) : silhouette du jeu Font_Awesome (comme « Mon avatar »).
      var avatars = menu.querySelector('.nova_avatars > a');
      if (avatars) avatars.classList.add('account');
      // Réglages de Nova (2026-11-08) : roue dentée du jeu Font_Awesome (règle .menuitem>.config_module:before, plus forte que le tiret).
      var reglagesNova = menu.querySelector('.nova_reglages > a');
      if (reglagesNova) { reglagesNova.classList.add('config_module'); tagNouveau(reglagesNova); }
    }
    var corps = document.getElementById('wimsbodybox');
    if (!menu || !corps || menu.parentElement === corps) return;
    // Le menu doit etre un enfant de #wimsbodybox. WIMS le met dans #wimspagebox sur la page de reponse d'un
    // exercice de feuille ; un module au HTML desequilibre (adm/class/sequence, job=addseq : </div> en trop)
    // fait refermer #wimsbodybox trop tot par le navigateur, et le menu finit sous la page, enfant de <body>.
    // data-nova-deplace garde l'origine (relevee par l'inventaire du banc).
    var origine = menu.parentElement;
    menu.setAttribute('data-nova-deplace', origine === document.body ? 'body' : (origine.id || origine.tagName.toLowerCase()));
    var page = document.getElementById('wimspagebox');
    if (page && !page.contains(corps) && page.parentElement !== corps && !corps.contains(page)) corps.appendChild(page);
    corps.insertBefore(menu, page && page.parentElement === corps ? page : corps.firstChild);
  }
