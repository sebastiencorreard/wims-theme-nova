/* Nova — js/nova.js. FICHIER ASSEMBLÉ par construire-js.sh à partir de js/src/*.js (dans l'ordre des noms) :
 * ne pas le modifier ici, mais dans js/src/, puis relancer ./construire-js.sh.
 * Une seule fonction englobante, ouverte dans 00-commun.js et fermée dans 99-demarrage.js : les fichiers de js/src
 * sont des morceaux, pas des scripts autonomes. Les fonctions s'appellent d'un fichier à l'autre ; toutes sont
 * lancées par demarrer() (99-demarrage.js). Aucune dépendance (jQuery n'est pas requis). Sans JavaScript, la page
 * de WIMS reste utilisable : rien ne se perd.
 */
(function () {
  'use strict';

  /* ===== js/src/00-commun.js : outils communs (animations, textes, liens vers l'accueil, feuille à jour) ===== */
  /* Animations : COUPÉES par défaut (--nova-animations: non, jetons.css) ; un enseignant ou un
   * administrateur les active par une surcharge CSS : :root { --nova-animations: oui; }. Le réglage
   * « réduire les animations » de l'appareil les coupe toujours. Demandes de l'utilisateur, 2026-10-05. */
  function animationsCoupees() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    var v = getComputedStyle(document.documentElement).getPropertyValue('--nova-animations').trim().toLowerCase();
    return !/^["']?(oui|yes|on|1)["']?$/.test(v);
  }


  // Infobulles pour les entrées qui peuvent passer en pictogramme seul (cadre.css).
  function infobulles() {
    Array.prototype.forEach.call(document.querySelectorAll('#wimstopbox .menuitem:is(.back, .tools, .class_home) > a'), function (a) {
      if (!a.title) a.title = a.textContent.trim();
    });
  }

  // Valeur texte d'une variable CSS : guillemets retirés, échappements CSS décodés (« not\\e9 » → « noté » ; Chrome rend
  // le texte tel qu'écrit, et les jetons de Nova sont en ASCII). 2026-11-08.
  function texteCss(v) {
    return (v || '').replace(/["']/g, '').replace(/\\([0-9a-fA-F]{1,6})\s?/g, function (m, h) { return String.fromCodePoint(parseInt(h, 16)); }).trim();
  }

  /* Rapprocher Nova du thème standard (demande de l'utilisateur, 2026-10-07) : réglages --nova-std-… (neuf depuis le 2026-11-11)
   * (page Apparence, section repliée). Le script de tête pose html.nova-std-<réglage> avant l'affichage ;
   * recalculé ici, une fois les réglages du site et de la structure posés (reglagesStructure). */
  var CLES_STANDARD = ['menus', 'navigation', 'reponse', 'examens', 'textes', 'listes', 'menu-complet', 'dominos', 'tableaux'];
  function standard(k) { return document.documentElement.classList.contains('nova-std-' + k); }

  /* Adresse de l'accueil de la session (module de confiance : y écrire, header.phtml), avec des paramètres en plus. Un
   * ?session= sans compteur ouvre l'accueil du contexte. */
  function lienAccueil(suite) {
    var m = /[?&]session=([^&.]+)/.exec(location.search), session = m ? m[1] : '';
    // Juste après la connexion, l'adresse porte « session=new.… », qui ne vaut plus rien (vu le 2026-11-07) : la vraie
    // session est dans les liens de la page.
    if (session === 'new') session = '';
    if (!session) {
      var champ = document.querySelector('input[name="session"]');
      if (champ) session = champ.value.split('.')[0];
    }
    if (!session) {
      var a = document.querySelector('a[href*="session="]');
      m = a && /session=([^&.]+)/.exec(a.getAttribute('href'));
      if (m) session = m[1];
    }
    return 'wims.cgi?session=' + encodeURIComponent(session) + '&lang=' + encodeURIComponent(racineLangue()) + '&module=home' + suite;
  }
  // Lien de la session vers un autre module (cmd=new : valable depuis n'importe quelle page ; 2026-11-09).
  function lienSession(suite) { return lienAccueil('').replace('&module=home', '') + suite; }

  /* Actions portees par l'adresse (nova_desactiver, nova_propager, nova_couleur, achat ou choix de l'avatar, reglages du
   * site) : retirees de la barre d'adresse une fois la page lue, pour qu'Actualiser ou Precedent ne rejoue pas l'action
   * (audit du 2026-11-12). Appelee en dernier par demarrer(). */
  function adresseNette() {
    var net = location.search.replace(/([?&])nova_(desactiver|propager|reglages|couleur|avatar_ouvrir|avatar_choix|avatars_retour)=[^&]*&?/g, '$1').replace(/[?&]$/, '');
    if (net === location.search || !history.replaceState) return;
    try { history.replaceState(history.state, '', location.pathname + net + location.hash); } catch (e) { /* adresse gardee */ }
  }
  /* Action faite sur l'accueil (module de confiance) SANS y aller (2026-11-09, utilisateur : « je me retrouve sur la page
   * de mon portail ») : requête en arrière-plan, message de #nova-propage gardé pour la page suivante (messageReporte),
   * puis page de retour, ouverte par cmd=new (après une requête à l'accueil, les liens cmd=reply de la page ne valent
   * plus) et au moins 1,5 s après (deux requêtes à moins d'1 s : la seconde est mal servie). Sans fetch : l'accueil. */
  function actionAccueil(suite, retour) {
    var accueil = lienAccueil(suite);
    if (!window.fetch || !window.TextDecoder) { location.href = accueil; return; }
    var debut = Date.now();
    fetch(accueil, { credentials: 'same-origin' }).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
      var html = new TextDecoder('windows-1252').decode(buf);
      var m = new DOMParser().parseFromString(html, 'text/html').getElementById('nova-propage');
      if (m && m.textContent.trim()) {
        try { sessionStorage.setItem('nova-message', JSON.stringify({ texte: m.textContent.trim(), etat: m.getAttribute('data-etat') || '', quand: Date.now() })); } catch (e) { /* message perdu */ }
      }
      setTimeout(function () { location.href = retour; }, Math.max(0, 1500 - (Date.now() - debut)));
    }).catch(function () { location.href = accueil; });
  }
  // Message d'une action faite en arrière-plan (actionAccueil), en tête de la page de retour.
  function messageReporte() {
    var v = null;
    try { v = JSON.parse(sessionStorage.getItem('nova-message') || 'null'); sessionStorage.removeItem('nova-message'); } catch (e) { v = null; }
    var corps = document.querySelector('.wimsbody');
    if (!v || !v.texte || Date.now() - v.quand > 60000 || !corps) return;
    var msg = document.createElement('div');
    msg.className = 'wims_msg ' + (v.etat === 'erreur' ? 'alert' : 'success');
    msg.setAttribute('role', 'status');
    msg.textContent = v.texte;
    corps.insertBefore(msg, corps.firstChild);
  }
  function racineLangue() { return document.documentElement.lang || 'fr'; }

  /* Feuille perimee (2026-11-09, utilisateur) : WIMS appelle css.css a une adresse fixe (?ver=<version de WIMS>),
   * qu'une mise a jour du theme ne change pas ; un navigateur peut garder des jours l'ancienne feuille avec le
   * nouveau nova.js (vecu sur le serveur de l'utilisateur, version 1.3). css.css porte l'empreinte de ses sources
   * (--nova-css, _css/empreinte.css), htmlheader.phtml celle attendue (meta nova-css), toutes deux ecrites par
   * construire-css.sh. Si elles different : la feuille est redemandee au serveur en remplacant l'entree du cache
   * (fetch, cache: 'reload' : les pages suivantes la trouvent a jour), puis rechargee dans cette page. Une seule
   * redemande par session et par empreinte ; un serveur dont le css.css est lui-meme ancien (mkcss.pl lance sur un
   * autre dossier, installation incomplete) est note et laisse tel quel, avec un message dans la console. */
  function feuilleAJour() {
    var m = document.querySelector('meta[name="nova-css"]');
    var attendu = m ? m.getAttribute('content') : '';
    if (!attendu) return;
    var lue = function () {
      return getComputedStyle(document.documentElement).getPropertyValue('--nova-css').trim().replace(/^["']|["']$/g, '');
    };
    if (lue() === attendu) return;
    var lien = [].filter.call(document.querySelectorAll('link[rel="stylesheet"][href]'), function (l) {
      return /(^|\/)html\/themes\/[^\/?]+\/css\.css(\?|$)/.test(l.getAttribute('href'));
    })[0];
    if (!lien) return;
    var cle = 'nova-css-recharge', deja = null;
    try { deja = sessionStorage.getItem(cle); } catch (e) { deja = null; }
    if (deja === attendu + ' serveur') return;
    var href = lien.href;
    function remplacer() {
      var neuf = lien.cloneNode(false);
      neuf.href = href + (href.indexOf('?') < 0 ? '?' : '&') + 'nova=' + attendu;
      neuf.addEventListener('load', function () {
        if (lien.parentNode) lien.parentNode.removeChild(lien);
        if (lue() !== attendu) {
          try { sessionStorage.setItem(cle, attendu + ' serveur'); } catch (e) { /* sans stockage : rien */ }
          if (window.console) console.warn('Nova : css.css du serveur (' + (lue() || 'sans empreinte') + ') ne correspond pas a nova.js (' +
            attendu + ') : reconstruire la feuille ou reinstaller le theme.');
        }
        window.dispatchEvent(new Event('resize'));
      });
      lien.parentNode.insertBefore(neuf, lien.nextSibling);
    }
    if (deja === attendu || !window.fetch) { remplacer(); return; }
    try { sessionStorage.setItem(cle, attendu); } catch (e) { /* sans stockage : une redemande par page */ }
    fetch(href, { cache: 'reload', credentials: 'same-origin' }).then(remplacer, remplacer);
  }

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
    maj();
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

  /* ===== js/src/20-composants.js : composants repris à Foundation et jQuery UI (accordéons, fenêtres, panneaux, onglets), carrousel, boutons collants, connexion ===== */
  /* Accordéons de Foundation (data-accordion : adm/class/addmodule « Notation », adm/class/freework
   * « zones »), sans Foundation (2026-10-03). nova.js passe avant l'initialisation de Foundation
   * (jQuery ready, footer_foundation.phtml) : il retire data-accordion, que Foundation ignore alors.
   * Mêmes réglages : data-allow-all-closed, data-multi-expand, data-deep-link (l'ancre de l'URL
   * ouvre l'élément et suit l'élément ouvert). Le titre (lien) ouvre et ferme ; Entrée, Espace,
   * flèches haut et bas entre les titres. L'élément ouvert porte is-active, comme chez Foundation. */
  function accordeons() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-accordion]'), function (acc, n) {
      acc.removeAttribute('data-accordion');
      acc.setAttribute('data-nova-accordeon', '');
      var toutFerme = acc.getAttribute('data-allow-all-closed') === 'true';
      var plusieurs = acc.getAttribute('data-multi-expand') === 'true';
      var ancre = acc.getAttribute('data-deep-link') === 'true';
      var elements = [];
      Array.prototype.forEach.call(acc.children, function (item, i) {
        if (!item.hasAttribute('data-accordion-item')) return;
        var titre = item.querySelector(':scope > .accordion-title');
        var contenu = item.querySelector(':scope > .accordion-content');
        if (!titre || !contenu) return;
        if (!contenu.id) contenu.id = 'nova-accordeon-' + n + '-' + i;
        if (!titre.id) titre.id = contenu.id + '-titre';
        titre.setAttribute('role', 'button');
        titre.setAttribute('aria-controls', contenu.id);
        contenu.setAttribute('role', 'region');
        contenu.setAttribute('aria-labelledby', titre.id);
        elements.push({ item: item, titre: titre, contenu: contenu });
      });
      if (!elements.length) return;
      function poser(e, ouvert) {
        e.item.classList.toggle('is-active', ouvert);
        e.titre.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
        e.contenu.setAttribute('aria-hidden', ouvert ? 'false' : 'true');
      }
      function ouvrir(e) {
        if (!plusieurs) elements.forEach(function (f) { if (f !== e) poser(f, false); });
        poser(e, true);
        if (ancre && history.replaceState) history.replaceState(history.state, '', '#' + e.contenu.id);
      }
      function basculer(e) {
        if (!e.item.classList.contains('is-active')) { ouvrir(e); return; }
        var ouverts = elements.filter(function (f) { return f.item.classList.contains('is-active'); });
        if (toutFerme || ouverts.length > 1) poser(e, false);
      }
      var cible = ancre && location.hash.length > 1 ? decodeURIComponent(location.hash.slice(1)) : '';
      var parAncre = null;
      elements.forEach(function (e) {
        if (cible && e.contenu.id === cible) parAncre = e;
        poser(e, e.item.classList.contains('is-active'));
      });
      if (parAncre) ouvrir(parAncre);
      else if (!toutFerme && !elements.some(function (e) { return e.item.classList.contains('is-active'); })) poser(elements[0], true);
      elements.forEach(function (e, i) {
        e.titre.addEventListener('click', function (ev) { ev.preventDefault(); basculer(e); });
        e.titre.addEventListener('keydown', function (ev) {
          var j = -1;
          if (ev.key === ' ') { ev.preventDefault(); basculer(e); }
          else if (ev.key === 'ArrowDown') j = (i + 1) % elements.length;
          else if (ev.key === 'ArrowUp') j = (i - 1 + elements.length) % elements.length;
          if (j >= 0) { ev.preventDefault(); elements[j].titre.focus(); }
        });
      });
    });
  }

  /* Fenêtres « reveal » de Foundation (data-reveal ; scripts/oef/form.phtml : « Êtes-vous sûr ? »
   * quand des réponses sont vides), dans un <dialog> natif (2026-10-03). WIMS les ouvre par
   * jQuery(...).foundation('open') (scripts/oef/var.proc, formcheck) : cet appel est intercepté pour
   * elles, le reste va à Foundation tant qu'il est chargé. data-open="id" ouvre, data-close ferme,
   * Échap aussi (natif). Le <dialog> est mis dans <body>, hors du formulaire, comme le faisait Foundation. */
  function revelations() {
    var fenetres = document.querySelectorAll('[data-reveal]');
    if (!fenetres.length || typeof document.createElement('dialog').showModal !== 'function') return;
    Array.prototype.forEach.call(fenetres, function (el) {
      el.removeAttribute('data-reveal');
      var d = document.createElement('dialog');
      d.className = 'nova-dialogue';
      var titre = el.querySelector('h1, h2');
      if (titre) { if (!titre.id) titre.id = (el.id || 'nova-dialogue') + '-titre'; d.setAttribute('aria-labelledby', titre.id); }
      d.appendChild(el);
      document.body.appendChild(d);
      el.novaDialogue = d;
      d.addEventListener('click', function (e) {
        if (e.target === d || e.target.closest('[data-close]')) d.close();   // clic sur le fond, Non, ×
      });
    });
    function ouvrir(el) { if (el && el.novaDialogue && !el.novaDialogue.open) el.novaDialogue.showModal(); }
    document.addEventListener('click', function (e) {
      var o = e.target.closest && e.target.closest('[data-open]');
      if (!o) return;
      var el = document.getElementById(o.getAttribute('data-open'));
      if (el && el.novaDialogue) { e.preventDefault(); ouvrir(el); }
    });
    var jq = window.jQuery;
    if (jq && jq.fn) {
      var origine = jq.fn.foundation;
      jq.fn.foundation = function (methode) {
        if (typeof methode === 'string' && this.length && this[0].novaDialogue) {
          if (methode === 'open') ouvrir(this[0]);
          else if (methode === 'close') this[0].novaDialogue.close();
          return this;
        }
        return origine ? origine.apply(this, arguments) : this;
      };
    }
  }

  /* Panneaux déroulants de Foundation (bouton data-toggle="X" + div#X.dropdown-pane[data-dropdown] :
   * scripts/js/dropdownbutton.phtml — sauvegarde de classe, vérification d'examen, feuilles), sans
   * Foundation (2026-10-03). Le bouton ouvre et ferme (classe is-open, que le CSS de WIMS suit) ; le
   * panneau se place sous le bouton (data-alignment="right" : aligné à droite) ; Échap, clic ailleurs
   * le referment ; data-auto-focus : focus sur le premier lien. Le panneau « Abandonner » des
   * exercices (scripts/oef/Main.phtml) est une boîte de dialogue jQuery UI : laissé à jQuery UI. */
  function panneaux() {
    var ouverts = [];
    Array.prototype.forEach.call(document.querySelectorAll('.dropdown-pane[data-dropdown][id]'), function (p) {
      var boutons = document.querySelectorAll('[data-toggle="' + p.id + '"]');
      if (!boutons.length) return;
      p.removeAttribute('data-dropdown');
      Array.prototype.forEach.call(boutons, function (b) {
        b.removeAttribute('data-toggle');
        b.setAttribute('aria-controls', p.id);
        b.setAttribute('aria-expanded', 'false');
        b.addEventListener('click', function (e) {
          if (p.classList.contains('ui-dialog-content') || p.id === 'exo_giveup') return;
          e.stopPropagation();
          if (p.classList.contains('is-open')) fermer(p); else ouvrir(p, b);
        });
      });
    });
    function fermer(p) {
      p.classList.remove('is-open');
      Array.prototype.forEach.call(document.querySelectorAll('[aria-controls="' + p.id + '"]'), function (b) { b.setAttribute('aria-expanded', 'false'); });
      ouverts = ouverts.filter(function (q) { return q !== p; });
    }
    function ouvrir(p, b) {
      ouverts.slice().forEach(fermer);
      p.classList.add('is-open');
      b.setAttribute('aria-expanded', 'true');
      var parent = p.offsetParent || document.body;
      var rp = parent.getBoundingClientRect(), rb = b.getBoundingClientRect();
      var haut = rb.bottom - rp.top + parent.scrollTop + 4;
      var gauche = p.getAttribute('data-alignment') === 'right' ? rb.right - rp.left - p.offsetWidth : rb.left - rp.left;
      gauche = Math.max(4 - rp.left, Math.min(gauche, document.documentElement.clientWidth - rp.left - p.offsetWidth - 4));
      p.style.top = haut + 'px';
      p.style.left = gauche + parent.scrollLeft + 'px';
      ouverts.push(p);
      if (p.getAttribute('data-auto-focus') === 'true') { var a = p.querySelector('a[href], button, input'); if (a) a.focus(); }
    }
    document.addEventListener('click', function (e) { ouverts.slice().forEach(function (p) { if (!p.contains(e.target)) fermer(p); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !ouverts.length) return;
      var p = ouverts[0], b = document.querySelector('[aria-controls="' + p.id + '"]');
      fermer(p); if (b) b.focus();
    });
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
      // Libellés coupés (« … », contenu.css : une seule ligne) : le texte entier en info-bulle.
      Array.prototype.forEach.call(ancres, function (a) { if (!a.title) a.title = a.textContent.trim(); });
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

  /* Carrousel des exemples de l'accueil du site (themes/_widgets/examples.phtml : #exemples .carousel, une
   * diapositive par div enfant), à la place de Slick (2026-10-03) : même aspect (flèches, points, pause en
   * haut à droite, défilement automatique qui reboucle). Défilement natif (scroll-snap), au doigt aussi ;
   * pas de défilement automatique si l'appareil demande moins d'animations ; pause au survol, au focus,
   * onglet caché. */
  function carrousel() {
    var c = document.querySelector('#exemples .carousel');
    if (!c || c.classList.contains('nova-carrousel')) return;
    var diapos = Array.prototype.filter.call(c.children, function (e) { return e.tagName === 'DIV'; });
    c.classList.add('nova-carrousel');
    if (diapos.length < 2) return;
    var textes = document.getElementById('nova-textes');
    var t = function (nom, defaut) { return (textes && textes.getAttribute('data-' + nom)) || defaut; };
    var n = diapos.length, courant = 0, arrete = false, suspendu = false, minuterie = 0;
    // Défilement automatique par défaut, indépendant du réglage « Animations » (demande de l'utilisateur,
    // 2026-10-07) ; coupé seulement si l'appareil demande de réduire les animations.
    var calme = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var piste = document.createElement('div');
    piste.className = 'nova-car-piste';
    piste.setAttribute('aria-live', 'off');
    c.setAttribute('role', 'region');
    c.setAttribute('aria-roledescription', 'carrousel');
    c.setAttribute('aria-label', t('car-titre', 'Examples'));
    diapos.forEach(function (d, i) {
      d.classList.add('nova-car-diapo');
      d.setAttribute('role', 'group');
      d.setAttribute('aria-roledescription', 'diapositive');
      d.setAttribute('aria-label', t('car-diapo', 'Example %n of %t').replace('%n', i + 1).replace('%t', n));
      piste.appendChild(d);
    });
    var bouton = function (classe, libelle) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = classe;
      b.setAttribute('aria-label', libelle);
      b.title = libelle;
      return b;
    };
    var prec = bouton('nova-car-prec', t('car-prec', 'Previous example'));
    var suiv = bouton('nova-car-suiv', t('car-suiv', 'Next example'));
    var pause = bouton('nova-car-pause', t('car-pause', 'Stop scrolling'));
    var points = document.createElement('div');
    points.className = 'nova-car-points';
    var boutons = diapos.map(function (d, i) {
      var b = bouton('nova-car-point', d.getAttribute('aria-label'));
      b.addEventListener('click', function () { aller(i); });
      points.appendChild(b);
      return b;
    });
    c.appendChild(pause);
    c.appendChild(prec);
    c.appendChild(piste);
    c.appendChild(suiv);
    c.appendChild(points);
    var marquer = function () {
      boutons.forEach(function (b, i) { if (i === courant) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
      diapos.forEach(function (d, i) { d.toggleAttribute('inert', i !== courant); });
    };
    function aller(i) {
      courant = (i + n) % n;
      piste.scrollTo({ left: courant * piste.clientWidth, behavior: calme ? 'auto' : 'smooth' });
      marquer();
    }
    prec.addEventListener('click', function () { aller(courant - 1); });
    suiv.addEventListener('click', function () { aller(courant + 1); });
    var attente = 0;
    piste.addEventListener('scroll', function () {   // glissement au doigt : la diapositive se cale (scroll-snap)
      clearTimeout(attente);
      attente = setTimeout(function () {
        var i = Math.round(piste.scrollLeft / Math.max(1, piste.clientWidth));
        if (i !== courant) { courant = i; marquer(); }
      }, 120);
    });
    var lancer = function () {
      clearInterval(minuterie);
      if (!arrete && !suspendu && !calme) minuterie = setInterval(function () { aller(courant + 1); }, 5000);
    };
    var majPause = function () {
      var libelle = arrete ? t('car-lecture', 'Resume scrolling') : t('car-pause', 'Stop scrolling');
      pause.setAttribute('aria-label', libelle);
      pause.title = libelle;
      pause.classList.toggle('nova-car-arrete', arrete);
    };
    pause.addEventListener('click', function () { arrete = !arrete; majPause(); lancer(); });
    c.addEventListener('mouseenter', function () { suspendu = true; lancer(); });
    c.addEventListener('mouseleave', function () { suspendu = false; lancer(); });
    c.addEventListener('focusin', function () { suspendu = true; lancer(); });
    c.addEventListener('focusout', function (e) { if (!c.contains(e.relatedTarget)) { suspendu = false; lancer(); } });
    document.addEventListener('visibilitychange', function () { suspendu = document.hidden; lancer(); });
    if (calme) { arrete = true; pause.hidden = true; }
    majPause();
    marquer();
    lancer();
  }

  /* Exercice (OEF, scripts/oef : div.send_answer « Envoyer la réponse », div.oef_buttons « Continuer la série
   * avec l'exercice suivant ») : au téléphone, le bloc de boutons reste en bas de l'écran tant que sa place
   * dans la page est plus bas ; quand l'élève y arrive, il la reprend et défile avec la page (demande de
   * l'utilisateur, 2026-10-03). Pas de position: sticky : .wimsbody défile en largeur au téléphone (filet de
   * sécurité, contenu.css), un élément collant s'y collerait, hors de l'écran. Un repère après le bloc
   * marque sa place ; une cale garde sa hauteur quand il est fixé. « Continuer la série… » devient
   * « Exercice suivant ». */
  function boutonsCollants() {
    var textes = document.getElementById('nova-textes');
    var suivant = document.querySelector('#oef_serie_nextexo .oef_serie_nextexo');
    if (suivant) {
      var libelle = textes && textes.getAttribute('data-exo-suivant');
      if (libelle) { suivant.textContent = libelle; suivant.closest('a').title = libelle; }
    }
    // Série terminée (scripts/oef/answer.phtml : .oef_modulescore ; il ne reste que « Recommencer » dans
    // #oef_actions) : « Revenir à la liste », le lien de retour de la barre du haut (« ← Retour » d'une
    // feuille, retour de la fenêtre d'examen), devant « Recommencer » (demande de l'utilisateur, 2026-10-03).
    var actions = document.getElementById('oef_actions');
    var retour = document.querySelector('#wimstopbox .nova-retour-lien, #wimstopbox .menuitem.back > a');
    if (actions && retour && document.querySelector('.oef_modulescore') && !actions.querySelector('.nova-revenir-liste')) {
      var lien = retour.cloneNode(true);
      lien.removeAttribute('id'); lien.removeAttribute('title'); lien.removeAttribute('aria-label');
      lien.className = 'wims_button nova-revenir-liste';
      lien.textContent = (textes && textes.getAttribute('data-revenir-liste')) || 'Back to the list';
      var recommencer = actions.querySelector('#oef_serie_renew, #oef_renew');
      var place = recommencer ? recommencer.parentNode : actions;
      place.insertBefore(lien, recommencer || place.firstChild);
    }
    var blocs = Array.prototype.filter.call(document.querySelectorAll('.wimsbody .send_answer, .wimsbody .oef_buttons, #oef_actions:has(.nova-revenir-liste), .wimsbody .nova-cg-actions'), function (b) { return b.querySelector('input[type="submit"], a, button'); });
    if (!blocs.length || !window.IntersectionObserver || !window.matchMedia) return;
    var telephone = window.matchMedia('(max-width: 639.98px)');
    blocs.forEach(function (bloc) {
      var repere = document.createElement('span');
      repere.className = 'nova-collant-repere';
      repere.setAttribute('aria-hidden', 'true');
      bloc.parentNode.insertBefore(repere, bloc.nextSibling);
      var cale = document.createElement('div');
      cale.className = 'nova-collant-cale';
      cale.setAttribute('aria-hidden', 'true');
      var dessous = false;
      var appliquer = function () {
        var fixer = telephone.matches && dessous && bloc.getClientRects().length > 0;
        if (fixer === bloc.classList.contains('nova-collant')) return;
        if (fixer) {
          // La cale doit tenir exactement la place du bloc, marges comprises (celles de ses paragraphes
          // traversent le bloc) : sinon le repère bouge de quelques pixels et le bloc se fixe et se libère
          // sans fin à cet endroit, il « vibre » (signalé par l'utilisateur, 2026-11-04). On mesure le repère
          // avant et après, et on corrige la hauteur de la cale de l'écart.
          var avant = repere.getBoundingClientRect().top, hauteur = bloc.offsetHeight;
          cale.style.height = hauteur + 'px';
          bloc.parentNode.insertBefore(cale, bloc);
          bloc.classList.add('nova-collant');
          var ecart = avant - repere.getBoundingClientRect().top;
          if (Math.abs(ecart) > 0.5) cale.style.height = Math.max(0, hauteur + ecart) + 'px';
        } else {
          bloc.classList.remove('nova-collant');
          if (cale.parentNode) cale.parentNode.removeChild(cale);
        }
        document.documentElement.classList.toggle('nova-boutons-collants', !!document.querySelector('.nova-collant'));
      };
      new IntersectionObserver(function (entrees) {
        var e = entrees[entrees.length - 1];
        dessous = !e.isIntersecting && e.boundingClientRect.top > 0;   // place du bloc plus bas que l'écran
        appliquer();
      }).observe(repere);
      if (telephone.addEventListener) telephone.addEventListener('change', appliquer);
    });
  }

  /* Mot de passe : un œil dans le champ pour vérifier ce qu'on a tapé (demande de l'utilisateur,
   * 2026-10-05). Tous les champs de mot de passe de la page (connexion, changement de mot de passe…). Le
   * champ redevient masqué à l'envoi du formulaire. */
  function oeilMotDePasse() {
    var textes = document.getElementById('nova-textes');
    var t = function (nom, defaut) { return (textes && textes.getAttribute('data-' + nom)) || defaut; };
    document.querySelectorAll('.wimsbody input[type="password"]').forEach(function (champ) {
      if (champ.closest('.nova-mdp')) return;
      var parent = champ.parentNode;
      var plein = champ.offsetWidth > 0 && champ.offsetWidth >= parent.clientWidth - 2;
      var boite = document.createElement('span');
      boite.className = 'nova-mdp' + (plein ? ' nova-mdp-plein' : '');
      parent.insertBefore(boite, champ);
      boite.appendChild(champ);
      var bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'nova-mdp-oeil';
      var majour = function () {
        var visible = champ.type === 'text';
        bouton.setAttribute('aria-pressed', visible ? 'true' : 'false');
        bouton.setAttribute('aria-label', visible ? t('mdp-masquer', 'Hide password') : t('mdp-afficher', 'Show password'));
        bouton.title = bouton.getAttribute('aria-label');
      };
      bouton.addEventListener('click', function () {
        champ.type = champ.type === 'password' ? 'text' : 'password';
        majour();
      });
      if (champ.form) champ.form.addEventListener('submit', function () { champ.type = 'password'; majour(); });
      majour();
      boite.appendChild(bouton);
    });
  }

  /* Page de réponse d'un exercice : le focus va au seul bouton pour continuer, « Exercice suivant »
   * (a#oef_serie_nextexo, le lien lui-même) ou, en fin de série, « Revenir à la liste » (boutonsCollants) : Entrée suffit pour
   * passer à la suite (demande de l'utilisateur, 2026-10-05). Sans défilement, et pas si le focus est déjà
   * ailleurs. */
  function focusSuite() {
    if (!document.querySelector('.wimsbody .oefanswer')) return;
    var actif = document.activeElement;
    if (actif && actif !== document.body && actif !== document.documentElement) return;
    var bouton = document.querySelector('a#oef_serie_nextexo[href], #oef_serie_nextexo a[href]') || document.querySelector('#oef_actions a.nova-revenir-liste[href]');
    if (!bouton) return;
    try { bouton.focus({ preventScroll: true }); } catch (e) { bouton.focus(); }
  }

  /* Connexion à une classe (adm/class/classes, authparticipant et authsupervisor) : focus sur
   * l'identifiant, ou sur le mot de passe s'il est déjà rempli (retour après une erreur) ou seul
   * (enseignant). Rien si le visiteur a déjà placé le focus ailleurs avant le passage du script.
   */
  function focusConnexion() {
    var actif = document.activeElement;
    if (actif && actif !== document.body && actif !== document.documentElement) return;
    var login = document.querySelector('input#login[name="auth_user"]');
    var motDePasse = document.querySelector('input#password[name="auth_password"]');
    var cible = login && !login.value ? login : motDePasse;
    if (cible && cible.form) cible.focus();
  }

  // Participant connecte (2026-11-11) : le point vert de .wims_connected::after devient un vrai element, qui peut
  // porter une info-bulle (\u00ab En ligne \u00bb) et un texte pour les lecteurs d'ecran. Pas sur la phrase de
  // l'accueil (p), qui le dit deja.
  function enLigne() {
    var els = document.querySelectorAll('.wims_connected:not(p)');
    var textes = document.getElementById('nova-textes');
    var mot = (textes && textes.getAttribute('data-texte-en-ligne')) || 'Online';
    // WIMS ecrit aussi title="connected" (anglais, en dur) sur le lien du nom (usermanage userlist, regmanage :
    // wims_ref_title) et sur le nom de la fiche d'un participant, CONNECTE OU NON (usermanage/userprop.phtml).
    Array.prototype.forEach.call(document.querySelectorAll('[title="connected"]'), function (x) {
      if (x.closest('.wims_connected')) x.title = mot; else x.removeAttribute('title');
    });
    if (!els.length) return;
    Array.prototype.forEach.call(els, function (el) {
      if (el.querySelector('.nova-en-ligne')) return;
      var point = document.createElement('span');
      point.className = 'nova-en-ligne';
      point.title = mot;
      point.setAttribute('role', 'img');
      point.setAttribute('aria-label', mot);
      el.appendChild(point);
      el.classList.add('nova-en-ligne-pose');
      // WIMS ecrit l'info-bulle du nom en anglais, en dur (adm/class/livret/user.phtml : title="connected").
      if (el.hasAttribute('title')) el.title = mot;
    });
  }


  /* Cellule de tableau cliquable en entier (2026-11-11, utilisateur) : dans un tableau de WIMS (wimstable, wimsborder), une
   * cellule qui contient UN SEUL élément cliquable (lien, bouton, case à cocher, bouton radio) et peu d'autre texte (60
   * caractères au plus) le déclenche quand on clique ailleurs dans la cellule. Exclus : exercices (énoncé, réponse, Dynapi),
   * cellules avec un champ à remplir, une liste déroulante, un tableau imbriqué ou une image cliquable, et tout lien d'action
   * (job=del…, deactivate, expire… : beaucoup d'« Effacer » de WIMS sont des GET ; ou confirm()). Pas de clic si
   * l'élève sélectionne du texte. Clic transmis par createEvent (Dynapi remplace MouseEvent), touches Ctrl/Maj gardées. */
  function cellulesCliquables() {
    if (standard('tableaux')) return;   // réglage « Tableaux du thème standard »
    var CLIQUABLE = 'a[href], button, input[type="submit"], input[type="button"], input[type="reset"], input[type="checkbox"], input[type="radio"]';
    var BLOQUANT = 'input:not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), select, textarea, table, [contenteditable], img[usemap], .wims_grabbable';
    var ACTION = /[?&+](?:job|cmd)=(?:del|erase|remove|clean|deactiv|reactiv|activ|expire|close|restore|reset|purge|empty)/i;
    var cibles = new WeakMap();
    var cellules = document.querySelectorAll('.wimsbody :is(table.wimstable, table.wimsborder) > :is(tbody, thead, tfoot) > tr > :is(td, th)');
    if (cellules.length > 6000) return;
    Array.prototype.forEach.call(cellules, function (c) {
      if (c.closest('.oefstatement, .oefanswer, form[name="replyform"]') || c.querySelector(BLOQUANT)) return;
      var liens = c.querySelectorAll(CLIQUABLE);
      if (liens.length !== 1) return;
      var lien = liens[0];
      if (lien.disabled || lien.getAttribute('aria-disabled') === 'true') return;
      // Jamais une action (effacer, désactiver, expirer…) : un clic à côté ne doit rien changer.
      if (ACTION.test(lien.getAttribute('href') || '') || /confirm/.test(lien.getAttribute('onclick') || '')) return;
      var reste = c.textContent.replace(lien.textContent, '').replace(/\s+/g, '');
      if (reste.length > 60) return;
      cibles.set(c, lien);
      c.classList.add('nova-cellule-clic');
    });
    document.addEventListener('click', function (ev) {
      if (ev.button !== 0 || ev.defaultPrevented) return;
      var c = ev.target.closest && ev.target.closest('.nova-cellule-clic');
      var lien = c && cibles.get(c);
      if (!lien || ev.target.closest('a[href], button, input, label, select, textarea, summary')) return;
      var choix = window.getSelection && String(window.getSelection());
      if (choix) return;
      var e = document.createEvent('MouseEvents');
      e.initMouseEvent('click', true, true, window, 1, ev.screenX, ev.screenY, ev.clientX, ev.clientY, ev.ctrlKey, ev.altKey, ev.shiftKey, ev.metaKey, 0, null);
      lien.dispatchEvent(e);
      if (lien.matches('input[type="checkbox"], input[type="radio"]')) lien.focus();
    });
  }

  /* ===== js/src/30-examen.js : chronomètre, mode examen, parcours, pages et cartes d'examen ===== */
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
    if (standard('examens')) return;   // réglage « Examens comme le thème standard »
    var barre = document.getElementById('wimstopbox');
    var fin = barre && barre.querySelector('#user_links a.endexam');
    // Élève authentifié par CAS (ou autre authentification externe) : html/headmenu_user.phtml met alors le
    // lien de déconnexion du CAS dans le menu du compte, sans « Terminer cette session d'examen ». Il ne reste
    // que celui du module d'examen, dans le menu latéral : il sert de « Terminer » (vécu sur un site
    // CAS, 2026-10-06 : ni « Terminer » ni chronomètre dans la barre).
    if (!fin && barre) {
      var lateral = document.querySelector('#wimsmenumodubox a[href*="job=scorereg"]');
      if (lateral) {
        fin = lateral.cloneNode(true);
        fin.removeAttribute('id');
        fin.classList.add('endexam');
      }
    }
    if (!fin) return;
    var textes = document.getElementById('nova-textes');
    var t = function (nom, defaut) { return (textes && textes.getAttribute('data-' + nom)) || defaut; };
    document.body.classList.add('nova-examen', 'nova-examen-session');

    // Élève CAS : le menu du compte garde « Déconnexion » et « Déconnexion CAS » pendant l'examen (sans CAS,
    // WIMS remplace la déconnexion par « Terminer ») ; retirés, pour ne pas quitter l'examen sans le terminer
    // (demande de l'utilisateur, 2026-10-06). Avant la copie du menu du compte dans le menu latéral.
    Array.prototype.forEach.call(barre.querySelectorAll('#user_links a.visitor'), function (a) {
      var li = a.closest('li');
      if (li && li.parentNode && li.parentNode.id === 'user_links') li.remove(); else a.remove();
    });

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

    // Profil : le contenu du menu du compte et les autres entrées de la barre, recopiés dans le menu
    // latéral ; sous 1024 px seulement (CSS) ils y passent et quittent la barre ; au-delà, ils restent
    // dans la barre, où il y a la place (demande de l'utilisateur, 2026-10-03).
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
        var copie = lien.cloneNode(true);
        copie.removeAttribute('id');
        d.appendChild(copie);
        groupe.appendChild(d);
      };
      // Le nom de l'élève en tête, en texte (le lien « #user_links » n'ouvrait que le menu).
      var nom = document.createElement('div');
      nom.className = 'menuitem nova-profil-nom';
      nom.textContent = compte.textContent.trim();
      groupe.appendChild(nom);
      Array.prototype.forEach.call(liCompte.querySelectorAll('#user_links > li:not(.nova-lien-complet) a[href]'), ajouter);
      Array.prototype.forEach.call(barre.querySelectorAll('.wimsmenu > .menuitem'), function (item) {
        if (item.classList.contains('class_home') || item.classList.contains('chrono') ||
            item.classList.contains('nova-terminer') || item.classList.contains('nova-examencours') || item.classList.contains('nova-examencours') || item === liCompte) return;
        Array.prototype.forEach.call(item.querySelectorAll('a[href]'), ajouter);
        item.classList.add('nova-examen-large');
      });
      liCompte.classList.add('nova-examen-large');
      // Menu du compte vide en session (la déconnexion est devenue « Terminer ») : le nom seul, sans menu.
      if (!Array.prototype.some.call(liCompte.querySelectorAll('#user_links > li:not(.nova-lien-complet) a[href]'), function (a) { return a.getAttribute('href') !== '#user_links'; })) liCompte.classList.add('nova-compte-seul');
      cible.insertBefore(groupe, cible.firstChild);
      cible.insertBefore(titre, groupe);
    } else if (liCompte) {
      // Pas de menu latéral (page qui confirme « Terminer », 2026-10-03) : le menu du compte, vide
      // pour un élève en session, disparaît ; Aide et les autres entrées passent à droite, devant
      // « Terminer ».
      var restants = Array.prototype.filter.call(liCompte.querySelectorAll('#user_links > li:not(.nova-lien-complet) a[href]'), function (a) {
        return a.getAttribute('href') !== '#user_links';
      });
      // Sinon (changer le mot de passe, depuis le 2026-10-08), il rejoint ce groupe, a droite : reste seul
      // dans la barre, il se retrouvait au milieu (signale le 2026-11-11).
      if (!restants.length) liCompte.remove();
      var droite = document.createElement('div');
      droite.className = 'wimsmenu menu dropdown nova-avant-terminer';
      if (restants.length) droite.appendChild(liCompte);
      Array.prototype.forEach.call(barre.querySelectorAll('.wimsmenu > .menuitem'), function (item) {
        if (item.classList.contains('class_home') || item.classList.contains('chrono') ||
            item.classList.contains('nova-terminer') || item.classList.contains('nova-examencours') || item === liCompte) return;
        droite.appendChild(item);
      });
      if (droite.children.length) barre.insertBefore(droite, place);
    }

    // Chronomètre recopié du décompte de la page.
    chronoMiroir(document.getElementById('exam_clock'), true);

    // Plus aucun exercice à ouvrir (tout est fait, course arrêtée, ou temps écoulé) : la session
    // reste ouverte chez WIMS, et bloque les autres examens, tant que l'élève n'a pas cliqué sur
    // « Terminer » — qui le déconnecte. On le lui dit, avec le bouton sous la main.
    // Seulement sur la liste des exercices de la session : ni sur la page qui confirme « Terminer »
    // (job=scorereg, qui avertit au contraire que des exercices restent à faire — signalé le
    // 2026-10-02), ni sur « Mes notes » (job=score), qui n'ont pas de lien d'exercice non plus.
    var job = (/[?&+]job=([a-z]+)/.exec(location.href) || [])[1] || '';
    var corps = document.querySelector('.wimsbody');
    // Avertissement de « Terminer » (scorereg.phtml : « Oui » confirm_end=yes, « Non » job=score) : « Non »
    // ramène à la liste des exercices (job=student) pour continuer l'examen, au lieu de « Mes notes »
    // (demande de l'utilisateur, 2026-10-05).
    var oui = document.querySelector('.wimsbody a[href*="confirm_end=yes"]');
    if (oui) Array.prototype.forEach.call(oui.parentNode.querySelectorAll('a[href*="job=score"]:not([href*="job=scorereg"])'), function (non) {
      non.setAttribute('href', non.getAttribute('href').replace(/job=score(?=&|$)/, 'job=student'));
    });
    // « Terminer » demandé, mais WIMS refuse de clore une session sans aucune réponse tant qu'il reste du
    // temps (scorereg.proc) : il montre « Détail du score actuel », sans sa confirmation. On le dit
    // (demande de l'utilisateur, 2026-10-03), et « Terminer » devient « Examen en cours », vers la liste des
    // exercices (job=student), pour y retourner sans passer par le menu (demande de l'utilisateur, 2026-10-05).
    // Pilule à pictogramme de chronomètre, comme « Examen en cours » (_widgets/examencours.phtml), et le même
    // lien sous le message (demande de l'utilisateur, 2026-10-05).
    var chronoSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg>';
    var versExamen = null;
    if (corps && job === 'scorereg' && !document.querySelector('a[href*="confirm_end=yes"]')) {
      versExamen = fin.getAttribute('href').replace(/job=scorereg(?=&|$)/, 'job=student');
      if (versExamen !== fin.getAttribute('href')) {
        fin.setAttribute('href', versExamen);
        // Libellé long « Examen en cours », court « Examen » sur un écran très étroit (CSS, comme la pastille).
        fin.innerHTML = chronoSvg + '<span class="nova-long"></span><span class="nova-court"></span>';
        fin.querySelector('.nova-long').textContent = t('texte-examen-encours', 'Exam in progress');
        fin.querySelector('.nova-court').textContent = t('texte-examen', 'Exam');
        fin.setAttribute('aria-label', t('texte-examen-encours', 'Exam in progress'));
        fin.setAttribute('title', t('texte-examen-encours', 'Exam in progress'));
        place.classList.add('nova-terminer-examen');
      } else versExamen = null;
    }
    if (corps && job === 'scorereg' && !document.querySelector('a[href*="confirm_end=yes"]') && !document.querySelector('.nova-terminer-impossible')) {
      var avis = document.createElement('div');
      avis.className = 'wims_msg warning nova-terminer-impossible';
      avis.setAttribute('role', 'status');
      avis.textContent = t('terminer-impossible', 'Answer at least one exercise before ending the session.');
      corps.insertBefore(avis, corps.firstChild);
      if (versExamen) {
        var retourExamen = document.createElement('p');
        retourExamen.className = 'nova-autre-examen';
        var lienExamen = document.createElement('a');
        lienExamen.className = 'nova-autre-examen-bouton';
        lienExamen.href = versExamen;
        lienExamen.innerHTML = chronoSvg;
        lienExamen.appendChild(document.createTextNode(t('texte-examen-encours', 'Exam in progress')));
        retourExamen.appendChild(lienExamen);
        corps.insertBefore(retourExamen, avis.nextSibling);
      }
    }
    if (corps && job !== 'scorereg' && job !== 'score' &&
        !corps.querySelector('a[href*="worksheet="]') && !document.querySelector('.nova-fin-session')) {
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
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg><span class="nova-chrono-libelle"></span>' +
      '<span class="nova-chrono-temps" role="timer"><span class="nova-chrono-miroir"></span></span></div>';
    var boite = item.firstChild;
    var attributs = examen ? ['texte-5min', 'texte-1min', 'texte-fin', 'texte-fin-detail'] : ['texte-fin', 'texte-fin-detail'];
    attributs.forEach(function (a) { boite.setAttribute('data-' + a, t(a, '')); });
    // Exercice : après le décompte, la note baisse avec le retard (scoredelay de WIMS), elle n'est pas perdue.
    if (!examen) boite.setAttribute('data-texte-fin-detail', t('texte-fin-detail-exo', t('texte-fin-detail', '')));
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

  /* Feuille d'exercices (adm/sheet, contenu.css) : le score de WIMS est un texte « Qualité: 0/10
   * Réussite: 0% Points requis:10 » ; il devient des étiquettes (libellé + valeur), et la valeur en %
   * une barre de réussite (verte à 100 %). Libellés repris tels quels : toutes les langues. */
  /* Parcours (examen en mode « course ») : WIMS met dans la barre du haut un segment par exercice
   * (scripts/examprogressbar.proc ; title = 10 pour les précédents, la note de l'exercice en cours,
   * « todo » pour la suite). Choix de l'utilisateur (2026-10-03, maquette A) : segments + compteur,
   * posés sur la page au-dessus de l'exercice. Une note à -1 (pas encore de réponse) s'écrit aussi
   * « todo » : après un 10 à l'exercice en cours, c'est le bouton « série suivante »
   * (#wims_nextinexam, themes/_widgets/nextinsheet.phtml) qui dit que le dernier 10 est le sien. */
  function parcours() {
    var li = document.querySelector('#wimstopbox .menuitem.progress');
    var page = document.querySelector('.wimsbody');
    var barre = li && li.querySelector('.wims_score_bar');
    var n = barre ? barre.querySelectorAll('.wims_seed_item').length : 0;
    if (!page || !n) { if (li) li.classList.add('nova-garde'); return; }   // laissée dans la barre
    page.insertBefore(habillerParcours(barre, !!document.getElementById('wims_nextinexam')), page.firstChild);
    li.parentNode.removeChild(li);
  }

  /* Barre de progression d'une course (examprogressbar.proc de WIMS : segments title="10" réussi, "todo",
   * ou la note) → segments Nova + « Exercice n sur N ». reussi : l'exercice en cours est réussi (bouton
   * « série suivante » présent). Rend le bloc .nova-parcours qui contient la barre. */
  function habillerParcours(barre, reussi) {
    var segments = Array.prototype.slice.call(barre.querySelectorAll('.wims_seed_item'));
    var n = segments.length;
    var textes = document.getElementById('nova-textes');
    var t = function (nom, defaut) { return (textes && textes.getAttribute('data-' + nom)) || defaut; };
    var faits = 0;
    while (faits < n && segments[faits].title === '10') faits++;
    var cours, etat, note = '';
    if (faits < n && segments[faits].title !== 'todo') { cours = faits + 1; etat = 'note'; note = segments[faits].title; }
    else if (faits === n) { cours = n; etat = 'termine'; }
    else if (faits > 0 && reussi) { cours = faits; etat = 'reussi'; }
    else { cours = faits + 1; etat = 'en-cours'; }
    var modele = t('parcours', 'Exercise %n of %t');
    segments.forEach(function (s, i) {
      var k = i + 1, quoi;
      s.removeAttribute('style');   // bleu, rouge, blanc de WIMS
      if (k === cours) s.classList.add('nova-cours');
      if (k < cours || (k === cours && (etat === 'reussi' || etat === 'termine'))) { s.classList.add('nova-fait'); quoi = t('parcours-reussi', 'passed'); }
      else if (k === cours && etat === 'note') { s.classList.add('nova-echec'); quoi = t('parcours-note', 'scored') + ' ' + note + '/10'; }
      else if (k === cours) quoi = t('parcours-en-cours', 'in progress');
      else quoi = t('parcours-a-faire', 'to do');
      s.title = modele.replace('%n', k).replace('%t', n) + ' : ' + quoi;
    });
    var bloc = document.createElement('div');
    bloc.className = 'nova-parcours';
    bloc.setAttribute('role', 'group');
    bloc.setAttribute('aria-label', t('parcours-titre', 'Course progress'));
    barre.classList.remove('inline');
    barre.setAttribute('aria-hidden', 'true');
    var compteur = document.createElement('p');
    compteur.className = 'nova-parcours-compteur';
    compteur.innerHTML = modele.replace(/[&<>]/g, '')
      .replace('%n', '<strong>' + cours + '</strong>').replace('%t', String(n));
    var suite = etat === 'note' ? t('parcours-note', 'scored') + ' ' + note + '/10'
      : etat === 'termine' ? t('parcours-termine', 'finished') : etat === 'reussi' ? t('parcours-reussi', 'passed') : '';
    if (suite) {
      var s = document.createElement('span');
      s.className = 'nova-parcours-etat';
      s.textContent = suite;
      compteur.appendChild(s);
    }
    bloc.appendChild(barre);
    bloc.appendChild(compteur);
    return bloc;
  }

  /* Page d'un examen « course » (adm/class/exam, student.phtml) : « Progression de la session de la
   * course » (h2, masqué par le CSS) puis la barre de WIMS → mêmes segments que pendant le parcours
   * (demande de l'utilisateur, 2026-10-03). */
  function parcoursExamen() {
    Array.prototype.forEach.call(document.querySelectorAll('.wimsbody > div.wims_score_bar'), function (barre) {
      if (!barre.querySelector(':scope > .wims_seed_item')) return;
      var place = barre.nextSibling, parent = barre.parentNode;
      var bloc = habillerParcours(barre, false);
      bloc.classList.add('nova-parcours-examen');
      parent.insertBefore(bloc, place);
    });
  }


  /* Exercice « course » (OEF à étapes, ex. E6/number/oeftabmul coursemult) : l'énoncé écrit sa propre
   * barre, une question par segment, title « done » ou « todo ». Même habillage que le parcours
   * (segments + « Question 4 sur 10 ») ; le CSS colore déjà les segments d'après leur title. */
  function courseExercice() {
    var textes = document.getElementById('nova-textes');
    var modele = (textes && textes.getAttribute('data-parcours-question')) || 'Question %n of %t';
    Array.prototype.forEach.call(document.querySelectorAll('.oefstatement .wims_score_bar'), function (barre) {
      if (barre.closest('.nova-parcours')) return;
      var segments = Array.prototype.slice.call(barre.querySelectorAll('.wims_seed_item[title="done"], .wims_seed_item[title="todo"]'));
      var n = segments.length;
      if (!n) return;
      var faits = segments.filter(function (s) { return s.title === 'done'; }).length;
      var cours = Math.min(faits + 1, n);
      segments.forEach(function (s, i) {
        s.removeAttribute('style');
        if (i < faits) s.classList.add('nova-fait');
        else if (i === faits) s.classList.add('nova-cours');
      });
      var bloc = document.createElement('div');
      bloc.className = 'nova-parcours nova-parcours-questions';
      barre.parentNode.insertBefore(bloc, barre);
      barre.setAttribute('aria-hidden', 'true');
      bloc.appendChild(barre);
      var compteur = document.createElement('p');
      compteur.className = 'nova-parcours-compteur';
      compteur.innerHTML = modele.replace(/[&<>]/g, '').replace('%n', '<strong>' + cours + '</strong>').replace('%t', String(n));
      bloc.appendChild(compteur);
    });
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

  /* Barre de série d'exercices (cadre.css/contenu.css : indicateur d'étapes) : le lien vers
   * l'exercice suivant s'écrit « > 2 » chez WIMS ; la flèche est dessinée, le « > » retiré, et le
   * lien reçoit le nom de l'infobulle de WIMS (« Continuer la série avec l'exercice suivant »). */
  function serieEtapes() {
    Array.prototype.forEach.call(document.querySelectorAll('.wims_serie_bar .wims_next_exo > a'), function (a) {
      a.textContent = a.textContent.replace(/^\s*>\s*/, '');
      var li = a.parentNode;
      if (li.title && !a.getAttribute('aria-label')) a.setAttribute('aria-label', li.title + ' (' + a.textContent.trim() + ')');
    });
  }

  /* Exercices d'un examen (adm/class/exam, student.phtml : ol.wims_exam > li.exo_item) en cartes, comme la
   * feuille d'exercices (maquette A, utilisateur, 2026-10-03). WIMS écrit selon l'état : lien (.exo_link a),
   * fait (.exo_name + .exo_done, ou un ❌ dans une course), bloqué par une dépendance (titre nu + lien
   * « Nécessite… »), fermé (titre nu). Nova range : titre, puis étiquettes (poids, état) ; liens de WIMS gardés.
   * Numéro, ✓ et flèche en CSS. */
  function examExercices() {
    if (standard('listes')) return;   // réglage « Feuilles et examens en liste »
    Array.prototype.forEach.call(document.querySelectorAll('ol.wims_exam'), function (ol) {
      if (ol.classList.contains('nova-exam-liste')) return;
      ol.classList.add('nova-exam-liste');
      Array.prototype.forEach.call(ol.querySelectorAll(':scope > li.exo_item'), function (li) {
        var puce = function (classe, contenu) {
          var e = document.createElement('span');
          e.className = 'nova-puce ' + classe;
          if (typeof contenu === 'string') e.textContent = contenu; else e.appendChild(contenu);
          return e;
        };
        var meta = document.createElement('span');
        meta.className = 'nova-exo-meta';
        var poids = li.querySelector('.weight');
        if (poids) {
          var m = /^\(?\s*([^:()]+?)\s*:\s*([^()]+?)\s*\)?$/.exec(poids.textContent.replace(/\s+/g, ' ').trim());
          meta.appendChild(puce('nova-puce-poids', m ? m[1] + ' ' + m[2] : poids.textContent.trim()));
          poids.remove();
        }
        var titre, lien = li.querySelector('.exo_link a'), fait = li.querySelector('.exo_done');
        var echec = Array.prototype.filter.call(li.querySelectorAll('span'), function (e) { return e.textContent.indexOf('\u274C') >= 0; })[0];
        var bloque = !lien && li.querySelector('a[href*="job=student"]');
        if (lien) {
          li.classList.add('nova-exo-afaire');
          titre = lien.closest('.exo_link');
        } else if (fait || echec) {
          li.classList.add(fait ? 'nova-exo-fait' : 'nova-exo-echec');
          titre = li.querySelector('.exo_name');
          meta.appendChild(puce(fait ? 'nova-puce-ok' : 'nova-puce-echec', (fait || echec).textContent.trim()));
          (fait || echec).remove();
        } else if (bloque) {
          li.classList.add('nova-exo-bloque');
          var conteneur = bloque.parentNode === li ? bloque : bloque.parentNode;
          meta.appendChild(puce('nova-puce-bloque', bloque));
          if (conteneur !== bloque) conteneur.remove();
        } else {
          li.classList.add('nova-exo-ferme');
          titre = li.querySelector(':scope > span');
        }
        if (!titre) {
          // Titre écrit en texte nu par WIMS : le recueillir.
          titre = document.createElement('span');
          Array.prototype.slice.call(li.childNodes).forEach(function (n) {
            if (n.nodeType === 3 && n.textContent.trim()) titre.appendChild(document.createTextNode(n.textContent.trim()));
          });
        }
        titre.classList.add('nova-exo-titre');
        if (!lien && titre.lastChild && titre.lastChild.nodeType === 3) titre.lastChild.textContent = titre.lastChild.textContent.replace(/\s*\.\s*$/, '');
        var corps = document.createElement('span');
        corps.className = 'nova-exo-corps';
        corps.appendChild(titre);
        if (meta.childNodes.length) corps.appendChild(meta);
        Array.prototype.slice.call(li.childNodes).forEach(function (n) { if (n.nodeType === 3 || (n !== titre && n.nodeType === 1)) n.remove(); });
        li.appendChild(corps);
      });
    });
  }

  /* Signes « \u2020 » et « ?? » du Détail des examens (adm/class/userscore, examcheck.phtml), que WIMS écrit sans
   * explication dans la case d'un exercice sans note : \u2020 = session sans durée enregistrée (en cours ou interrompue),
   * ?? = exercice sans note d'une session qui a une durée (pas ouvert, ou sans réponse ; WIMS ne distingue pas).
   * Info-bulle (title) sur chaque signe et légende sous le tableau, seulement pour les signes présents
   * (proposé par Claude le 2026-10-03, accepté par l'utilisateur le 2026-11-07). */
  function signesExamens() {
    var textes = document.getElementById('nova-textes');
    if (!textes) return;
    var defs = { '\u2020': textes.getAttribute('data-texte-signe-croix'), '??': textes.getAttribute('data-texte-signe-inconnu') };
    var tables = [];
    Array.prototype.forEach.call(document.querySelectorAll('.wimsbody td.wims_sheet_score a'), function (a) {
      var signe = a.textContent.trim();
      if (!defs[signe]) return;
      a.title = defs[signe];
      a.setAttribute('aria-label', signe + ' : ' + defs[signe]);
      var t = a.closest('table');
      if (!t) return;
      var e = tables.filter(function (x) { return x.table === t; })[0];
      if (!e) { e = { table: t, signes: {} }; tables.push(e); }
      e.signes[signe] = true;
    });
    tables.forEach(function (e) {
      var p = document.createElement('p');
      p.className = 'nova-legende-signes';
      ['\u2020', '??'].forEach(function (signe) {
        if (!e.signes[signe]) return;
        var l = document.createElement('span');
        var b = document.createElement('b');
        b.textContent = signe;
        l.appendChild(b);
        l.appendChild(document.createTextNode(' ' + defs[signe]));
        p.appendChild(l);
      });
      var apres = e.table.closest('.wims_scrollable, .table-scroll') || e.table;
      apres.parentNode.insertBefore(p, apres.nextSibling);
    });
  }

  /* Page d'un examen alors qu'un autre est en cours (adm/class/exam/student.phtml : div.wims_msg.alert
   * « Vous avez déjà commencé un autre examen… ») : le bouton « Examen en cours » de la barre, posé par
   * _widgets/examencours.phtml avec data-autre-examen, passe sous le message (demande de l'utilisateur,
   * 2026-10-05). Son lien est celui de la barre (la session où l'examen a été commencé). */
  function autreExamen() {
    if (standard('examens')) return;
    var pastille = document.querySelector('#wimstopbox .nova-examencours[data-autre-examen]');
    var message = document.querySelector('.wimsbody .wims_msg.alert');
    var lien = pastille && pastille.querySelector('a');
    if (!message || !lien) return;
    // Le message de WIMS (lang/msg.phtml du module, que le thème ne peut pas surcharger) est remplacé
    // (demande de l'utilisateur, 2026-10-05) ; le CSS le cache jusque-là (3 s au plus).
    var textes = document.getElementById('nova-textes');
    var nouveau = textes && textes.getAttribute('data-texte-autre-examen');
    if (nouveau) message.textContent = nouveau;
    message.classList.add('nova-autre-examen-message');
    var bloc = document.createElement('p');
    bloc.className = 'nova-autre-examen';
    lien.classList.add('nova-autre-examen-bouton');
    bloc.appendChild(lien);
    message.parentNode.insertBefore(bloc, message.nextSibling);
    pastille.remove();
  }

  /* Indication et Aide d'un exercice pendant un examen : WIMS les écrit en texte inactif (scripts/oef/Main.phtml :
   * <span class="disabled_link"> au lieu du bouton, dans une session _exam), y compris avec le thème Standard. Nova
   * les montre comme ses boutons d'aide, grisés, avec une info-bulle (demande de l'utilisateur, 2026-10-08). Main.phtml
   * écrit l'Indication puis l'Aide ; l'Aide se reconnaît à son texte (wims_name_help). */
  function aideExamen() {
    var inactifs = document.querySelectorAll('#oef_helphint > span.disabled_link');
    if (!inactifs.length) return;
    var textes = document.getElementById('nova-textes');
    var bulle = (textes && textes.getAttribute('data-texte-indisponible-examen')) || 'Not available during an exam';
    Array.prototype.forEach.call(inactifs, function (sp) {
      var aide = /^(aide|help|hilfe|ayuda|aiuto)$/i.test(sp.textContent.trim());
      sp.classList.add('wims_button_help', 'nova-inactif');
      if (!document.getElementById(aide ? 'oef_help' : 'oef_hint')) sp.id = aide ? 'oef_help' : 'oef_hint';   // icône du jeu de WIMS
      sp.setAttribute('aria-disabled', 'true');
      sp.setAttribute('role', 'button');
      sp.title = bulle;
    });
  }

  /* Fin d'une session d'examen dans une classe CAS (demande de l'utilisateur, 2026-10-06) : WIMS efface la
   * session (scorereg.proc) et montre la connexion de la classe, sans bouton CAS. Un clic sur « Terminer »
   * ou sur le « Oui » qui le confirme est noté (sessionStorage, 2 min) ; si la page suivante porte l'adresse
   * de connexion CAS de la classe (#nova-cas, header.phtml), l'élève y est renvoyé : le CAS, qui le connaît
   * encore, le ramène dans la classe, prêt pour un autre examen. Toute autre page efface la marque. */
  function reconnexionCas() {
    var cle = 'nova-fin-examen', quand = 0;
    try { quand = +sessionStorage.getItem(cle) || 0; sessionStorage.removeItem(cle); } catch (e) { quand = 0; }
    document.addEventListener('click', function (ev) {
      var a = ev.target.closest && ev.target.closest('a[href*="job=scorereg"], a[href*="confirm_end=yes"]');
      if (a) { try { sessionStorage.setItem(cle, String(Date.now())); } catch (e) { /* sans stockage : rien */ } }
    }, true);
    var cas = document.getElementById('nova-cas');
    if (cas && quand && Date.now() - quand < 120000) {
      location.replace(cas.getAttribute('data-cas') + '/login?service=' + encodeURIComponent(cas.getAttribute('data-service')));
    }
  }

  /* ===== js/src/40-feuilles-notes.js : cartes de feuille, scores, notes ===== */
  function feuilleExercices() {
    if (standard('listes')) return;   // réglage « Feuilles et examens en liste »
    Array.prototype.forEach.call(document.querySelectorAll('ol.wims_sheet_list .wims_sheet_score'), function (bloc) {
      if (bloc.querySelector('.nova-scores')) return;
      var texte = bloc.textContent.replace(/\s+/g, ' ').trim(), re = /([^:\d][^:]*?)\s*:\s*([\d.,]+(?:\s*\/\s*[\d.,]+)?\s*%?)/g, m, puces = [], pourcent = null;
      while ((m = re.exec(texte))) {
        puces.push([m[1].trim(), m[2].replace(/\s+/g, '')]);
        if (/%$/.test(m[2].trim()) && pourcent === null) pourcent = parseFloat(m[2].replace(',', '.'));
      }
      if (!puces.length) return;
      var liste = document.createElement('span');
      liste.className = 'nova-scores';
      puces.forEach(function (p) {
        var e = document.createElement('span'), v = document.createElement('strong');
        e.className = 'nova-score';
        e.appendChild(document.createTextNode(p[0]));
        v.textContent = p[1];
        e.appendChild(v);
        liste.appendChild(e);
      });
      bloc.textContent = '';
      bloc.appendChild(liste);
      if (pourcent !== null && !isNaN(pourcent)) {
        var barre = document.createElement('div'), plein = document.createElement('span');
        barre.className = 'nova-barre-reussite';
        barre.setAttribute('aria-hidden', 'true');
        plein.style.width = Math.max(0, Math.min(100, pourcent)) + '%';
        if (pourcent >= 100) barre.setAttribute('data-plein', '');
        barre.appendChild(plein);
        bloc.appendChild(barre);
      }
    });
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
    if (standard('listes')) return;   // réglage « Feuilles et examens en liste »
    Array.prototype.forEach.call(document.querySelectorAll('.wims_score_bar'), function (barre) {
      if (barre.classList.contains('nova-score')) return;
      var cases = barre.querySelectorAll('ol > li');
      if (!cases.length) return;
      barre.classList.add('nova-score');
      var notes = 0;
      Array.prototype.forEach.call(cases, function (li) {
        var a = li.querySelector('a');
        var titre = (a && a.getAttribute('title')) || li.getAttribute('title') || '';
        // Une session d'examen sans note donne « NaN/20 » (userexambar.phtml) ; WIMS y affiche 0.
        var m = /(\d+(?:[.,]\d+)?|NaN)\s*\/\s*(\d+(?:[.,]\d+)?)/.exec(titre);
        if (m && m[1] === 'NaN') m[1] = '0';
        if (li.style.backgroundColor && m) {
          var r = parseFloat(m[1].replace(',', '.')) / parseFloat(m[2].replace(',', '.'));
          var n = Math.round(10 * r);   // note /10 arrondie, comme les couleurs de WIMS (scripts/adm/class/colors)
          li.setAttribute('data-niveau', n <= 0 ? 'zero' : n <= 3 ? 'rouge' : n <= 6 ? 'orange' : n <= 8 ? 'jaune' : 'vert');
          li.classList.add('nova-note');
          if (a) a.textContent = m[1] + '/' + m[2];
          notes++;
        }
      });
      if (notes) { historique(barre, cases); return; }
      if (barre.closest('li.wims_exam_item')) return;   // examen : pas de compteur de feuille
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

  /* Note retenue d'un examen sur sa carte (accueil de la classe), comme la note d'une feuille : WIMS
   * ne l'y met pas. Valeurs calculées par user.phtml (!examscore) dans #nova-notes-examens ; seulement
   * pour un examen déjà commencé (relevé score/<élève>.exam, pas l'historique : WIMS en efface les vieilles
   * sessions, la pastille disparaissait ; 2026-11-04). */
  function notesExamens() {
    if (standard('listes')) return;   // réglage « Feuilles et examens en liste »
    var source = document.getElementById('nova-notes-examens');
    if (!source) return;
    var notes = {}, max = source.getAttribute('data-max') || '10', libelle = source.getAttribute('data-libelle') || 'Score';
    (source.getAttribute('data-notes') || '').trim().split(/\s+/).forEach(function (paire) {
      var m = /^(\d+):(.+)$/.exec(paire);
      if (m) notes[m[1]] = m[2];
    });
    Array.prototype.forEach.call(document.querySelectorAll('li.wims_exam_item'), function (li) {
      if (li.querySelector('.nova-note-examen')) return;
      var lien = li.querySelector('a[href*="exam="]');
      var m = lien && /[?&+]exam=(\d+)/.exec(lien.getAttribute('href'));
      if (!m || notes[m[1]] === undefined) return;
      var bloc = document.createElement('div'), note = document.createElement('span');
      bloc.className = 'wims_user_info nova-note-examen';
      note.className = 'wims_sheet_score';
      note.textContent = libelle + ': ' + notes[m[1]] + '/' + max;
      bloc.appendChild(note);
      li.appendChild(bloc);
    });
  }

  /* Pastille de note d'une carte (« Note: 6.5/10 ») : le libellé isolé dans un span, que le CSS cache
   * au téléphone (seule la valeur reste visible ; le libellé reste lu par les lecteurs d'écran). */
  function libellesNotes() {
    if (standard('listes')) return;   // réglage « Feuilles et examens en liste »
    Array.prototype.forEach.call(document.querySelectorAll('li.wims_sheet_item > div.wims_user_info .wims_sheet_score, li.wims_exam_item > div.nova-note-examen .wims_sheet_score'), function (note) {
      if (note.querySelector('.nova-note-libelle')) return;
      var m = /^([^:]+:)\s*(\S.*)$/.exec(note.textContent.replace(/\s+/g, ' ').trim());
      if (!m) return;
      var libelle = document.createElement('span'), valeur = document.createElement('span');
      libelle.className = 'nova-note-libelle';
      libelle.textContent = m[1];
      valeur.textContent = m[2];
      note.textContent = '';
      note.appendChild(libelle);
      note.appendChild(valeur);
    });
  }

  /* « NaN » que WIMS écrit dans une case de note qu'il ne peut pas calculer (session d'examen sans réponse :
   * adm/class/userscore, examcheck.phtml, « Détail des examens ») : un « - » sobre (choix de l'utilisateur,
   * 2026-10-03). Seul le texte « NaN » change ; ce qui suit (astérisque et info-bulle de WIMS) reste. */
  function notesNaN() {
    Array.prototype.forEach.call(document.querySelectorAll('.wimsbody td'), function (td) {
      var n = td.firstChild;
      while (n && n.nodeType === 3 && !n.textContent.trim()) n = n.nextSibling;
      if (n && n.nodeType === 3 && n.textContent.trim() === 'NaN') n.textContent = n.textContent.replace('NaN', '-');
    });
  }

  function notesColonnes() {
    var mm = document.querySelector('meta[name="nova-module"]');
    var table = document.getElementById('TABLE_userlist');
    if (!mm || mm.content !== 'adm/class/userscore' || !table || table.hasAttribute('data-nova-notes')) return;
    table.setAttribute('data-nova-notes', '');
    var textes = document.getElementById('nova-textes');
    var texte = function (n, defaut) { return (textes && textes.getAttribute('data-texte-' + n)) || defaut; };
    var choix = document.querySelector('select[name="showsheet"]');
    var cadre = choix && choix.closest('fieldset');
    // Case du cadre « Choix des données » (sinon au-dessus du tableau), choix gardé par le navigateur.
    var ajouterCase = function (id, libelle, cle, defaut, appliquer) {
      var actif = defaut;
      try { var v = localStorage.getItem(cle); if (v !== null) actif = v === '1'; } catch (e) { /* sans stockage : défaut */ }
      var champ = document.createElement('div');
      champ.className = 'field box nova-notes-option';
      var c = document.createElement('input');
      c.type = 'checkbox';
      c.id = id;
      c.checked = actif;
      var lib = document.createElement('label');
      lib.htmlFor = id;
      lib.textContent = libelle;
      champ.appendChild(c);
      champ.appendChild(lib);
      c.addEventListener('change', function () {
        appliquer(c.checked);
        try { localStorage.setItem(cle, c.checked ? '1' : '0'); } catch (e) { /* cette page seulement */ }
      });
      if (cadre) {
        var envoi = cadre.querySelector(':scope > .wimsform');
        cadre.insertBefore(champ, envoi || null);
      } else {
        var avant = table.closest('.wims_scrollable, .table-scroll') || table;
        avant.parentNode.insertBefore(champ, avant);
      }
      appliquer(actif);
    };
    // (b) Titre au lieu du numéro (examens : 2026-11-08 ; feuilles et cases : 2026-11-09, utilisateur). Titres lus dans
    // la liste de choix (option « 3 » = « 2/3: titre » pour la feuille 3, « E4 » = « Examen 4: titre »). Cochées par
    // défaut, sauf réglage « Textes du thème standard ».
    var titres = { feuille: {}, examen: {} };
    if (choix) Array.prototype.forEach.call(choix.options, function (o) {
      var m = /^(E?)(\d+)$/.exec(o.value);
      var i = o.textContent.indexOf(':');
      if (m && i >= 0 && o.textContent.slice(i + 1).trim()) titres[m[1] ? 'examen' : 'feuille'][m[2]] = o.textContent.slice(i + 1).trim();
    });
    var types = [
      ['feuille', 'nova-titres-feuilles', texte('titres-feuilles', 'Worksheets: show the title instead of the number'), function () {
        return Array.prototype.map.call(table.querySelectorAll('thead th a[href*="numshowsheet"]'), function (a) { return [a.closest('th'), a]; });
      }],
      ['examen', 'nova-titres-examens', texte('titres-examens', 'Exams: show the title instead of the number'), function () {
        return Array.prototype.map.call(table.querySelectorAll('thead th.name_exam'), function (th) { return [th, th]; });
      }]
    ];
    types.forEach(function (t) {
      if (!Object.keys(titres[t[0]]).length) return;
      var cellules = t[3]().map(function (x) {
        var origine = x[1].textContent.trim();
        var m = /(\d+)$/.exec(origine);
        return { th: x[0], el: x[1], origine: origine, titre: m && titres[t[0]][m[1]] };
      }).filter(function (c) { return c.titre; });
      ajouterCase(t[1], t[2], t[1], !standard('textes'), function (oui) {
        cellules.forEach(function (c) {
          c.el.textContent = '';
          if (oui) {
            var s = document.createElement('span');
            s.className = 'nova-titre-examen';
            s.textContent = c.titre;
            c.el.appendChild(s);
            c.th.title = c.origine + ' : ' + c.titre;
          } else {
            c.el.textContent = c.origine;
            c.th.removeAttribute('title');
          }
        });
      });
    });
    // (a) Masquer la moyenne.
    var moy = table.querySelector('thead th.average');
    if (!moy) return;
    var rang = Array.prototype.indexOf.call(moy.parentNode.children, moy);
    ajouterCase('nova-sans-moyenne', texte('masquer-moyenne', 'Hide the average'), 'nova-notes-sans-moyenne', false, function (oui) {
      Array.prototype.forEach.call(table.rows, function (tr) {
        var c = tr.cells[rang];
        if (c) c.classList.toggle('nova-col-masquee', oui);
      });
    });
  }

  /* Légende des types (adm/class/seq_legend.phtml : ul.inline de li.wims_*_item sans lien) : seulement les types
   * présents à l'écran, c'est-à-dire dans l'onglet de séquence affiché (ou toute la page s'il n'y a pas
   * d'onglets) ; recalculée à chaque changement d'onglet (demande de l'utilisateur, 2026-10-03). */
  function legendeTypes() {
    if (standard('listes')) return;   // réglage « Feuilles et examens en liste »
    var corps = document.querySelector('.wimsbody');
    if (!corps) return;
    var legendes = Array.prototype.filter.call(corps.querySelectorAll('ul.inline'), function (ul) {
      var lis = ul.querySelectorAll(':scope > li');
      return lis.length > 1 && Array.prototype.every.call(lis, function (li) { return /_item\b/.test(li.className) && !li.querySelector('a'); });
    });
    if (!legendes.length) return;
    var type = function (el) { return (el.className.match(/\bwims_[a-z]+_item\b/) || [])[0]; };
    var majour = function () {
      var panneaux = Array.prototype.filter.call(corps.querySelectorAll('[id^="wims_seq_"]:not(#wims_seq_summary)'), function (p) { return p.getClientRects().length; });
      var zones = panneaux.length ? panneaux : [corps];
      var presents = {};
      zones.forEach(function (z) {
        Array.prototype.forEach.call(z.querySelectorAll('li[class*="_item"]'), function (li) {
          if (li.querySelector(':scope > a') && !legendes.some(function (l) { return l.contains(li); })) presents[type(li)] = true;
        });
      });
      legendes.forEach(function (ul) {
        var visibles = 0;
        Array.prototype.forEach.call(ul.querySelectorAll(':scope > li'), function (li) {
          var garde = !!presents[type(li)];
          li.classList.toggle('nova-legende-absente', !garde);
          if (garde) visibles++;
        });
        ul.classList.toggle('nova-legende-absente', !visibles);
        var bloc = ul.closest('.wims_seq_legend, .legend, fieldset');
        if (bloc && bloc.querySelectorAll('ul.inline').length === 1) bloc.classList.toggle('nova-legende-absente', !visibles);
      });
    };
    majour();
    var attente = 0;
    var relancer = function () { cancelAnimationFrame(attente); attente = requestAnimationFrame(majour); };
    corps.addEventListener('click', relancer);
    corps.addEventListener('change', relancer);
    if (window.MutationObserver) {
      new MutationObserver(relancer).observe(corps, { subtree: true, attributes: true, attributeFilter: ['style', 'aria-hidden', 'hidden'] });
    }
  }

  /* ===== js/src/50-exercice.js : page de réponse, claviers, images cliquables, dominos ===== */
  /* Tableau du verdict mêlé (2026-11-12, utilisateur) : une colonne de réponses (« Votre réponse », « Bonne réponse ») est
   * centrée sous son titre quand toutes ses réponses sont courtes (au plus 10 rem de large : un nombre, un mot, une tuile),
   * sinon alignée à gauche (seuil choisi par Claude : au-delà, une phrase ou une expression se lit mieux à gauche). Cadre
   * d'une réponse vide à la taille d'une tuile dans un exercice à tuiles. Mesures refaites après MathJax (~1 s après
   * « load ») et au redimensionnement. */
  function alignerVerdict(table) {
    var seuil = 10 * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
    var largeur = function (c) {
      var w = 0;
      Array.prototype.forEach.call(c.childNodes, function (n) {
        var r = null, lignes = 1;
        if (n.nodeType === 1) { r = n.getBoundingClientRect(); lignes = n.getClientRects().length; }
        else if (n.nodeType === 3 && n.nodeValue.trim()) { var g = document.createRange(); g.selectNodeContents(n); r = g.getBoundingClientRect(); lignes = g.getClientRects().length; }
        // Une réponse coupée sur plusieurs lignes (cellule étroite, au téléphone) compte comme longue.
        if (r) w = Math.max(w, lignes > 1 ? Infinity : r.width);
      });
      return w;
    };
    var mesurer = function () {
      if (!table.isConnected) return;
      var tuile = table.querySelector('.fill_container > .drag_label');
      if (tuile) {
        var t = tuile.getBoundingClientRect();
        table.style.setProperty('--nova-vide-l', Math.round(t.width) + 'px');
        table.style.setProperty('--nova-vide-h', Math.round(t.height) + 'px');
      } else if (document.querySelector('.fill_container > .drag_label')) {
        table.style.setProperty('--nova-vide-l', '44px');
        table.style.setProperty('--nova-vide-h', '44px');
      }
      var corps = table.tBodies[0];
      [1, 2].forEach(function (k) {
        var cellules = Array.prototype.map.call(corps.rows, function (r) { return r.cells[k]; }).filter(Boolean);
        table.classList.toggle('nova-verdict-centre-' + (k + 1), cellules.length > 0 && cellules.every(function (c) { return largeur(c) <= seuil; }));
      });
    };
    mesurer();
    window.addEventListener('load', function () { mesurer(); setTimeout(mesurer, 1500); });
    if (document.readyState === 'complete') setTimeout(mesurer, 1500);
    var attente;
    window.addEventListener('resize', function () { clearTimeout(attente); attente = setTimeout(mesurer, 150); });
  }

  /* Exercice OEF (demande de l'utilisateur, 2026-10-05). « Envoyer la réponse » (div.send_answer) devient
   * « Valider ». Page de réponse (scripts/oef/answer.phtml) : le tableau « Analyse de votre réponse » (une
   * ligne par réponse : nom, réponse de l'élève, span.oef_indgood|oef_indbad|oef_indpartial|oef_indprec et la
   * bonne réponse en div.inline.tt) devient un verdict en tête de .oefanswer ; le CSS masque le reste du bloc
   * sauf .oef_feedbacks. La réponse réaffichée dans l'énoncé (scripts/oef/embed.phtml : div.oef_ind… suivi de
   * <sup><small>[k]</small></sup>, k = nom de la ligne) : rouge si fausse ; étoiles (depuis la place du bouton « Valider ») si tout est juste, la page vibre si tout est faux ;
   * oef_indneutral (bonne réponse non montrée) prend l'état de sa ligne. Ligne inconnue (conditions, « voir
   * l'analyse ») : rien ne change. */
  function retourReponse() {
    if (standard('reponse')) return;   // réglage « Réponse comme le thème standard »
    var textes = document.getElementById('nova-textes');
    var texte = function (cle, defaut) { return (textes && textes.getAttribute('data-' + cle)) || defaut; };
    document.querySelectorAll('.wimsbody .send_answer input[type="submit"]').forEach(function (b) {
      b.value = texte('valider', 'Submit');
      b.classList.add('nova-valider');
      // Place du bouton à l'envoi, à l'écran : les étoiles de la page de réponse en partiront.
      if (b.form) b.form.addEventListener('submit', function () {
        var r = b.getBoundingClientRect();
        try { sessionStorage.setItem('nova-valider', JSON.stringify({ l: r.left, t: r.top, w: r.width, h: r.height, quand: Date.now() })); } catch (e) { /* sans stockage : étoiles sur le verdict */ }
      });
    });
    var reponse = document.querySelector('.wimsbody .oefanswer');
    if (!reponse) return;
    var tableau = reponse.querySelector('table.answeranalysis');
    var lignes = [], inconnues = 0, conditions = 0;
    // Lignes du tableau seulement : une bonne réponse peut être elle-même un tableau (éléments à associer, OEF correspond),
    // dont les lignes ne sont pas des réponses (vécu, 2026-11-11 : verdict de WIMS laissé tel quel).
    if (tableau) tableau.querySelectorAll(':scope > tbody > tr, :scope > tr').forEach(function (tr) {
      // L'état est le span en tête de la dernière cellule : oef_ind… pour une réponse, oef_cond… pour une
      // condition (OUI/NON). La bonne réponse montrée à côté peut porter elle-même oef_indgood (étiquettes
      // clickfill, E3/measurement/oefdatagestion.fr, vécu 2026-10-05) : ne pas chercher ailleurs.
      var derniere = tr.lastElementChild;
      var marque = derniere && derniere.querySelector(':scope > span[class^="oef_ind"], :scope > span[class^="oef_cond"]');
      var m = marque && /^oef_(ind|cond)(good|bad|partial|prec)\b/.exec(marque.className);
      var etat = m ? { good: 'bonne', bad: 'mauvaise', partial: 'partielle', prec: 'precision' }[m[2]] : null;
      if (!etat) { if (tr.textContent.trim()) inconnues++; return; }
      var reponseEleve = m[1] === 'ind' && tr.children.length >= 3;
      if (m[1] === 'cond') conditions++;
      lignes.push({ etat: etat, nom: tr.children[0].textContent.replace(/[\s:=]+$/, '').trim(),
        condition: m[1] === 'cond', eleve: reponseEleve ? tr.children[1] : null, juste: reponseEleve ? tr.children[2].querySelector('div.inline.tt') : null, champs: [] });
    });
    // Lignes sans état (« voir l'analyse », renvois) : sans conséquence s'il y a des conditions, qui donnent
    // alors le verdict ; sinon, WIMS tel quel, et l'animation suit la note (noteSeule).
    if (!lignes.length || (inconnues && !conditions)) { reponse.classList.add('nova-retour-pret'); noteSeule(reponse); return; }

    // Réponses réaffichées dans l'énoncé, rattachées à leur ligne par le renvoi [k].
    var renvoiDe = function (el) { var r = el.nextElementSibling; return r && r.tagName === 'SUP' ? r.textContent.trim() : ''; };
    document.querySelectorAll('.oefstatement div[class*="oef_ind"]').forEach(function (champ) {
      var m = /\boef_ind(good|bad|partial|prec|neutral)\b/.exec(champ.className);
      if (!m) return;
      var nom = renvoiDe(champ);
      var ligne = lignes.filter(function (l) { return nom && l.nom === nom; })[0];
      if (ligne) ligne.champs.push(champ);
      else if (m[1] === 'bad') champ.classList.add('nova-faux');
    });
    // Réponses à choix (cases à cocher, mots à marquer, choix unique réaffichés en liste : scripts/oef/embed.phtml ;
    // variante A choisie par l'utilisateur le 2026-11-08) : chaque choix est marqué dans l'énoncé — cadre et
    // pastille ✓ (choisi, juste), ✕ (choisi à tort), ! en pointillé (oublié : oef_indforget), choix non retenus
    // pâlis ; sans bonne réponse montrée (presentgood=0), seulement « choisi », en couleur d'accent. Une ligne est
    // « à choix » si elle a plusieurs champs, ou si des choix non retenus (sans renvoi) sont à côté de son champ.
    // Réponse partiellement juste : WIMS marque tous les choix « partial » ; le bon est retrouvé dans sa liste
    // « la bonne réponse est … » (même image, ou même texte).
    var nonRetenus = Array.prototype.filter.call(document.querySelectorAll('.oefstatement div.inline[class*="oef_"]'), function (d) {
      return /\boef_(indforget|indneutral|empty)\b/.test(d.className) && !renvoiDe(d);
    });
    var voisin = function (champ) {
      var zone = champ.parentElement && champ.parentElement.parentElement;
      return zone && nonRetenus.some(function (d) { return zone.contains(d); });
    };
    var cleChoix = function (el) {
      var img = el.querySelector('img');
      return img ? 'img:' + img.getAttribute('src') : 'txt:' + el.textContent.replace(/\s+/g, ' ').trim();
    };
    var oublies = 0, aTort = 0, choixVus = false;
    lignes.forEach(function (ligne) {
      if (!ligne.champs.length || !(ligne.champs.length > 1 || ligne.champs.some(voisin))) return;
      ligne.choix = true;
      choixVus = true;
      var bons = null;
      if (ligne.juste) {
        bons = {};
        Array.prototype.forEach.call(ligne.juste.querySelectorAll('img'), function (i) { bons['img:' + i.getAttribute('src')] = true; });
        ligne.juste.textContent.split(',').forEach(function (t) { t = t.replace(/\s+/g, ' ').trim(); if (t) bons['txt:' + t] = true; });
      }
      ligne.champs.forEach(function (champ) {
        var m = /\boef_ind(good|bad|partial|prec|neutral)\b/.exec(champ.className);
        var etat = m[1] === 'good' ? 'juste' : m[1] === 'bad' ? 'faux' : 'pris';
        if (etat === 'pris' && m[1] !== 'neutral' && bons) etat = bons[cleChoix(champ)] ? 'juste' : 'faux';
        if (etat === 'faux') aTort++;
        champ.classList.add('nova-choix', 'nova-choix-' + etat);
      });
    });
    if (choixVus) nonRetenus.forEach(function (d) {
      if (/\boef_indforget\b/.test(d.className)) { d.classList.add('nova-choix', 'nova-choix-oublie'); oublies++; }
      else if (/\boef_indneutral\b/.test(d.className)) d.classList.add('nova-choix-neutre');
    });
    // Pastilles et noms des états, pour les lecteurs d'écran (pastille dessinée en CSS).
    document.querySelectorAll('.oefstatement .nova-choix').forEach(function (champ) {
      var etat = /nova-choix-(juste|faux|oublie|pris)/.exec(champ.className)[1];
      var p = document.createElement('span');
      p.className = 'nova-choix-pastille';
      p.setAttribute('role', 'img');
      p.setAttribute('aria-label', texte('choix-' + etat, { juste: 'chosen, correct', faux: 'chosen, wrong', oublie: 'missed', pris: 'chosen' }[etat]));
      champ.appendChild(p);
      // Choix « image » (figure, photo) : cadre collé à l'image. Une formule rendue en image par WIMS (formules en mode
      // image, réglage de l'élève ou du site) reste un choix « texte » : petite image, de la hauteur d'une ligne
      // (vu le 2026-11-08 : texte coupé par le cadre). Seuil : 40 px.
      var imgs = [].slice.call(champ.querySelectorAll('img'));
      var texteSeul = champ.textContent.replace(/\s+/g, '').length;
      if (!imgs.length || texteSeul) return;
      var classer = function () {
        if (imgs.some(function (i) { return !i.complete; })) return;
        if (imgs.some(function (i) { return Math.max(i.naturalHeight || 0, i.getBoundingClientRect().height) >= 40; })) champ.classList.add('nova-choix-image');
      };
      imgs.forEach(function (i) { if (!i.complete) i.addEventListener('load', classer); });
      classer();
    });
    // Le verdict ne répète plus les choix (demande de l'utilisateur, 2026-11-08) : « il manque n réponses »,
    // « n réponses choisies à tort ».
    var pluriel = function (n, cle, un, plusieurs) { return texte(cle + (n > 1 ? 's' : ''), n > 1 ? plusieurs : un).replace('%1', n); };
    lignes.forEach(function (ligne) {
      if (!ligne.choix || !ligne.juste || ligne.etat === 'bonne') return;
      var r = [];
      if (aTort) r.push(pluriel(aTort, 'choix-a-tort', '%1 answer chosen by mistake', '%1 answers chosen by mistake'));
      if (oublies) r.push(pluriel(oublies, 'choix-manque', '%1 answer missing', '%1 answers missing'));
      if (r.length) { ligne.resume = r.join(', '); ligne.juste = null; }
    });
    lignes.forEach(function (ligne) {
      if (ligne.etat === 'mauvaise' && !ligne.choix) ligne.champs.forEach(function (champ) { champ.classList.add('nova-faux'); });
    });

    var toutes = lignes.every(function (l) { return l.etat === 'bonne'; });
    var fausse = lignes.some(function (l) { return l.etat === 'mauvaise'; });
    // Animations seulement si le verdict est entier (demande de l'utilisateur, 2026-10-05) : étoiles quand
    // tout est juste, vibration quand tout est faux ; rien dans les cas intermédiaires.
    var toutesFausses = lignes.every(function (l) { return l.etat === 'mauvaise'; });
    var boite = document.createElement('div');
    boite.className = 'nova-verdict nova-verdict-' + (toutes ? 'bonne' : fausse ? 'mauvaise' : 'partielle');
    boite.setAttribute('role', 'status');
    var corps = document.createElement('div');
    corps.className = 'nova-verdict-corps';
    boite.appendChild(corps);
    var titre = document.createElement('p');
    titre.className = 'nova-verdict-titre';
    corps.appendChild(titre);
    var libelle = function (etat) {
      return etat === 'mauvaise' ? texte('mauvaise', 'Wrong answer') : etat === 'partielle' ? texte('partielle', 'Partly correct answer')
        : etat === 'precision' ? texte('precision', 'Not precise enough') : texte('bonne', 'Correct answer');
    };
    // « …, la bonne réponse était X » : la bonne réponse de WIMS est déplacée (MathJax compris).
    var completer = function (el, ligne) {
      if (ligne.resume) el.appendChild(document.createTextNode(', ' + ligne.resume));
      if (!ligne.juste) return;
      el.appendChild(document.createTextNode(', ' + texte('bonne-etait', 'the correct answer was') + ' '));
      ligne.juste.classList.add('nova-verdict-juste');
      el.appendChild(ligne.juste);
    };
    // Réponse hors énoncé, fausse : copie de la réponse de l'élève, en rouge.
    var eleve = function (ligne) {
      if (!ligne.eleve || ligne.champs.length || ligne.etat === 'bonne' || !ligne.eleve.textContent.trim()) return;
      var p = document.createElement('p');
      p.className = 'nova-verdict-eleve';
      p.appendChild(document.createTextNode(texte('votre-reponse', 'Your answer:') + ' '));
      var copie = document.createElement('span');
      copie.className = ligne.etat === 'mauvaise' ? 'nova-faux' : '';
      while (ligne.eleve.firstChild) copie.appendChild(ligne.eleve.firstChild);
      p.appendChild(copie);
      corps.appendChild(p);
    };
    if (toutes) {
      titre.textContent = lignes.length > 1 ? texte('bonnes', 'Correct answers') : texte('bonne', 'Correct answer');
      // Étoiles sur la réponse réaffichée dans l'énoncé (demande de l'utilisateur, 2026-11-11), sinon comme avant.
      etoiles(boite, [].concat.apply([], lignes.map(function (l) { return l.champs; })));
    } else if (lignes.length === 1) {
      titre.textContent = libelle(lignes[0].etat);
      completer(titre, lignes[0]);
      eleve(lignes[0]);
    } else if (lignes.some(function (l) { return l.etat === 'bonne'; })) {
      // Réponses justes et à revoir mêlées (variante A, choisie par l'utilisateur le 2026-11-12 ; avant : deux colonnes
      // Justes | À revoir, 2026-10-08) : carte neutre, titre « n réponses justes sur N », puis un tableau dans l'ordre des
      // réponses : [k] | votre réponse (verte si juste, rouge si fausse) | la bonne réponse de WIMS (déplacée, MathJax
      // compris ; une coche pour une réponse juste). Les renvois [k] de l'énoncé restent tous.
      var justes = lignes.filter(function (l) { return l.etat === 'bonne'; }).length;
      titre.textContent = texte(justes > 1 ? 'justes-sur' : 'juste-sur', justes > 1 ? '%1 correct answers out of %2' : '%1 correct answer out of %2')
        .replace('%1', justes).replace('%2', lignes.length);
      boite.className = 'nova-verdict nova-verdict-mixte';
      var cadre = document.createElement('div');
      cadre.className = 'nova-verdict-cadre';
      var table = document.createElement('table');
      table.className = 'nova-verdict-tableau';
      // Conditions de l'auteur seulement (« 25 : OUI », H1/number/OEFevalwimsope decomp ; signalé par l'utilisateur,
      // 2026-11-12) : ni réponse de l'élève ni bonne réponse à montrer ; deux colonnes, nom et pastille, sans en-tête.
      var sansReponses = lignes.every(function (l) { return l.condition; });
      var entete = sansReponses ? null : table.createTHead().insertRow();
      if (entete) [['', 'num'], [texte('votre-reponse', 'Your answer:').replace(/\s*:\s*$/, ''), 'eleve'], [texte('bonne', 'Correct answer'), 'bonne']].forEach(function (c) {
        var th = document.createElement('th');
        th.scope = 'col';
        th.className = 'nova-verdict-col-' + c[1];
        th.textContent = c[0];
        entete.appendChild(th);
      });
      var tbody = table.createTBody();
      // Ordre de l'énoncé : WIMS range son analyse dans l'ordre de ses réponses (l'unité d'abord dans une soustraction
      // posée, E6/number/OEFaddsous) ; renvois numérotés triés par numéro.
      var ordre = lignes.slice();
      // Nom de ligne « 2 » ou « [2] » (réponse placée dans l'énoncé).
      var numero = function (l) { var m = /^\[?(\d+)\]?$/.exec(l.nom); return m ? +m[1] : NaN; };
      if (ordre.every(function (l) { return !l.condition && !isNaN(numero(l)); })) ordre.sort(function (x, y) { return numero(x) - numero(y); });
      ordre.forEach(function (ligne) {
        var tr = tbody.insertRow();
        tr.className = 'nova-verdict-ligne-' + ligne.etat;
        var num = document.createElement('th');
        num.scope = 'row';
        num.className = 'nova-verdict-num';
        num.textContent = !ligne.nom ? '' : !ligne.condition && /^\d+$/.test(ligne.nom) ? '[' + ligne.nom + ']' : ligne.nom;
        tr.appendChild(num);
        var celEleve = tr.insertCell();
        if (ligne.condition) {
          // Condition (OUI / NON) : pastille ✓ ou ✕ dans la colonne « Bonne réponse » (seule colonne sans réponse).
          var marque = document.createElement('span');
          marque.className = ligne.etat === 'bonne' ? 'nova-verdict-coche' : 'nova-verdict-croix';
          marque.setAttribute('role', 'img');
          marque.setAttribute('aria-label', libelle(ligne.etat));
          (sansReponses ? celEleve : tr.insertCell()).appendChild(marque);
          return;
        }
        var celBonne = tr.insertCell();
        var donnee = ligne.eleve && ligne.eleve.textContent.trim() ? document.createElement('span') : null;
        if (donnee) {
          while (ligne.eleve.firstChild) donnee.appendChild(ligne.eleve.firstChild);
          donnee.className = ligne.etat === 'bonne' ? 'nova-juste' : ligne.etat === 'mauvaise' ? 'nova-faux' : 'nova-partiel';
          celEleve.appendChild(donnee);
        }
        if (ligne.etat === 'bonne') {
          if (!donnee) {
            // Case laissée vide à raison : cadre vert vide.
            var videJuste = document.createElement('span');
            videJuste.className = 'nova-juste nova-verdict-vide';
            celEleve.appendChild(videJuste);
          }
          var coche = document.createElement('span');
          coche.className = 'nova-verdict-coche';
          coche.setAttribute('role', 'img');
          coche.setAttribute('aria-label', texte('bonne', 'Correct answer'));
          celBonne.appendChild(coche);
          return;
        }
        if (!donnee && ligne.etat === 'mauvaise') {
          // Case laissée vide : cadre rouge vide, nommé pour les lecteurs d'écran.
          var vide = document.createElement('span');
          vide.className = 'nova-faux nova-verdict-vide';
          vide.setAttribute('role', 'img');
          vide.setAttribute('aria-label', libelle('mauvaise'));
          celEleve.appendChild(vide);
        } else if (ligne.etat !== 'mauvaise') {
          var etat = document.createElement('span');
          etat.className = 'nova-verdict-etat';
          etat.textContent = libelle(ligne.etat);
          celEleve.appendChild(etat);
        }
        if (ligne.juste) {
          ligne.juste.classList.add('nova-verdict-juste', 'nova-juste');
          celBonne.appendChild(ligne.juste);
        } else if (ligne.resume) celBonne.appendChild(document.createTextNode(ligne.resume));
      });
      cadre.appendChild(table);
      corps.appendChild(cadre);
      if (!sansReponses) alignerVerdict(table);
    } else {
      titre.textContent = libelle(fausse ? 'mauvaise' : 'partielle');
      var liste = document.createElement('ul');
      lignes.forEach(function (ligne) {
        if (ligne.etat === 'bonne') return;
        var li = document.createElement('li');
        // Le titre dit déjà « Mauvaise réponse » : « [k] : la bonne réponse était X » suffit.
        li.textContent = ligne.nom ? ligne.nom + ' : ' : '';
        if (ligne.etat === 'mauvaise' && ligne.juste) {
          li.appendChild(document.createTextNode(texte('bonne-etait', 'the correct answer was') + ' '));
          ligne.juste.classList.add('nova-verdict-juste');
          li.appendChild(ligne.juste);
        } else {
          li.appendChild(document.createTextNode(libelle(ligne.etat)));
          completer(li, ligne);
        }
        liste.appendChild(li);
      });
      corps.appendChild(liste);
      lignes.forEach(eleve);
    }
    reponse.insertBefore(boite, reponse.firstChild);
    reponse.classList.add('nova-retour', 'nova-retour-pret');
    // Renvois [k] de l'énoncé sans usage (demande de l'utilisateur, 2026-11-12) : le verdict ne les cite pas quand tout est
    // juste ou qu'il n'y a qu'une réponse, et le tableau de WIMS qu'ils désignent est masqué. Masqués (pas retirés).
    if (toutes || lignes.length === 1) {
      document.querySelectorAll('.oefstatement div.inline[class*="oef_"] + sup').forEach(function (sup) {
        if (/^\[[^\]]*\]$/.test(sup.textContent.trim())) sup.classList.add('nova-renvoi-inutile');
      });
    }
    if (toutesFausses) vibrer();
  }

  // Verdict que Nova ne sait pas lire (tableau vide : le verdict est dans les commentaires de l'auteur, ex.
  // H4/algebra/factorcom.fr) : WIMS tel quel ; étoiles si la note de l'exercice est 10/10, vibration si 0/10
  // (span.oef_modulescore : « … une note de N sur 10 », chiffres lus quelle que soit la langue).
  function noteSeule(reponse) {
    var note = reponse.querySelector('.oef_modulescore');
    var m = note && /(\d+(?:[.,]\d+)?)\D+10(?:\D|$)/.exec(note.textContent);
    if (!m) return;
    var n = parseFloat(m[1].replace(',', '.'));
    if (n >= 10) etoiles(reponse);
    else if (n === 0) vibrer();
  }

  // Petites étoiles (CSS : .nova-etoiles, sans animation si l'élève la refuse). Centrées sur la réponse de
  // l'élève réaffichée dans l'énoncé (cibles, une nuée par champ visible, quatre au plus ; demande de
  // l'utilisateur, 2026-11-11) ; à défaut, sur la place du bouton « Valider » à l'envoi (2026-10-05, position
  // fixe, toujours à l'écran) ; à défaut (envoi ancien ou inconnu), sur l'élément donné.
  function etoiles(el, cibles) {
    if (animationsCoupees()) return;
    // Une réponse en image n'a pas encore sa taille avant « load » : attendre, sinon la nuée part ailleurs.
    if (cibles && cibles.length && document.readyState !== 'complete') {
      window.addEventListener('load', function () { etoiles(el, cibles); }, { once: true });
      return;
    }
    var place = null;
    try {
      place = JSON.parse(sessionStorage.getItem('nova-valider') || 'null');
      sessionStorage.removeItem('nova-valider');
    } catch (e) { place = null; }
    var rects = (cibles || []).map(function (c) { return c.getBoundingClientRect(); }).filter(function (r) {
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    }).slice(0, 4);
    if (rects.length) {
      rects.forEach(function (r) {
        var n = nueeEtoiles(Math.max(5, Math.round(12 / rects.length)));
        n.style.left = (r.left + scrollX) + 'px';
        n.style.top = (r.top + scrollY) + 'px';
        n.style.width = r.width + 'px';
        n.style.height = r.height + 'px';
        n.style.zIndex = '60';
        poserEtoiles(document.body, n);
      });
      return;
    }
    var nuee = nueeEtoiles(12);
    if (place && Date.now() - place.quand < 120000 && place.w > 0) {
      nuee.classList.add('nova-etoiles-valider');
      nuee.style.left = Math.max(0, Math.min(place.l, innerWidth - place.w)) + 'px';
      nuee.style.top = Math.max(60, Math.min(place.t, innerHeight - place.h)) + 'px';
      nuee.style.width = place.w + 'px';
      nuee.style.height = place.h + 'px';
      el = document.body;
    }
    if (el !== document.body) el.classList.add('nova-etoile-source');
    poserEtoiles(el, nuee);
  }
  function nueeEtoiles(nombre) {
    var nuee = document.createElement('span');
    nuee.className = 'nova-etoiles';
    nuee.setAttribute('aria-hidden', 'true');
    var couleurs = ['var(--nova-note-jaune)', 'var(--nova-accent)', 'var(--nova-note-jaune)', 'var(--nova-note-vert)'];
    var milieu = (nombre - 1) / 2;
    for (var i = 0; i < nombre; i++) {
      var s = document.createElement('span');
      s.textContent = '\u2605';
      s.style.setProperty('--x', (nombre > 1 ? 20 + i * 60 / (nombre - 1) : 50) + '%');
      s.style.setProperty('--dx', ((i - milieu) * 9 * 11 / Math.max(1, nombre - 1) + Math.random() * 16 - 8).toFixed(0) + 'px');
      s.style.setProperty('--h', (-70 - Math.random() * 50).toFixed(0) + 'px');
      s.style.setProperty('--d', (Math.random() * 0.35).toFixed(2) + 's');
      s.style.setProperty('--t', (11 + Math.random() * 9).toFixed(0) + 'px');
      s.style.setProperty('--r', (Math.random() * 120 - 60).toFixed(0) + 'deg');
      s.style.setProperty('--c', couleurs[i % couleurs.length]);
      nuee.appendChild(s);
    }
    return nuee;
  }
  function poserEtoiles(parent, nuee) {
    parent.appendChild(nuee);
    setTimeout(function () { if (nuee.parentNode) nuee.parentNode.removeChild(nuee); }, 2500);
  }

  // Réponse fausse : toute la page vibre, brièvement (demande de l'utilisateur, 2026-10-05).
  function vibrer() {
    if (animationsCoupees()) return;
    var racine = document.documentElement;
    racine.classList.add('nova-vibre');
    setTimeout(function () { racine.classList.remove('nova-vibre'); }, 600);
  }

  /* Champs de réponse d'un exercice (scripts/anstype/*.input : le type n'est pas visible dans le HTML) :
   * - ni correction automatique, ni vérification d'orthographe (qui trahirait une faute dans une réponse en
   *   mots), ni majuscule automatique (WIMS n'en protège pas « units » et « sigunits ») ;
   * - pas de pavé numérique : un champ « numeric » accepte le signe moins et les fractions (2/3), absents
   *   des pavés décimal ou téléphone (iPhone surtout) ; le clavier texte reste le seul complet ;
   * - Entrée dans un champ alors qu'un autre est vide : passe au champ vide suivant au lieu d'envoyer
   *   (WIMS refuserait l'envoi) ; touche Entrée du téléphone « Suivant », puis « OK » sur le dernier ;
   * - focus sur le premier champ à l'ouverture.
   * Demande de l'utilisateur, 2026-10-06. */
  function claviersReponse() {
    var form = document.forms.replyform;
    if (!form) return;
    var champs = Array.prototype.filter.call(form.querySelectorAll('input[name^="reply"], textarea[name^="reply"]'), function (c) {
      return c.tagName === 'TEXTAREA' || !c.type || c.type === 'text';
    });
    champs.forEach(function (c) {
      c.setAttribute('autocapitalize', 'off');
      c.setAttribute('autocorrect', 'off');
      c.setAttribute('spellcheck', 'false');
      c.setAttribute('autocomplete', 'off');
    });
    var lignes = champs.filter(function (c) { return c.tagName === 'INPUT' && !c.readOnly; });
    var vide = function (c) { return !c.value.trim(); };
    var majour = function () {
      lignes.forEach(function (c) {
        var autreVide = lignes.some(function (d) { return d !== c && vide(d); });
        c.setAttribute('enterkeyhint', autreVide ? 'next' : 'go');
      });
    };
    lignes.forEach(function (c, i) {
      c.addEventListener('input', majour);
      c.addEventListener('keydown', function (ev) {
        if (ev.key !== 'Enter' || ev.isComposing || ev.shiftKey || ev.altKey || ev.ctrlKey || ev.metaKey) return;
        var suivants = lignes.slice(i + 1).concat(lignes.slice(0, i));
        var cible = suivants.filter(vide)[0];
        if (!cible) return;                       // tout est rempli : envoi normal
        ev.preventDefault();
        cible.focus();
      });
    });
    majour();
    // Focus sur le premier champ de réponse (demande de l'utilisateur, 2026-10-06) : champ texte ou zone de
    // texte, sans défilement (l'énoncé reste en vue), seulement si rien d'autre n'a le focus.
    var premier = champs.filter(function (c) { return !c.readOnly && !c.disabled && c.getClientRects().length; })[0];
    var actif = document.activeElement;
    if (premier && (!actif || actif === document.body || actif === document.documentElement)) {
      try { premier.focus({ preventScroll: true }); } catch (e) { premier.focus(); }
    }
  }

  /* Tuiles à déplacer des exercices (dragfill, correspond… : bibliothèque Dynapi de WIMS, DragEvent, qui
   * n'écoute que la souris) : au doigt, le téléphone faisait défiler la page au lieu de déplacer la tuile.
   * Pont tactile (demande de l'utilisateur, 2026-10-06) : un toucher qui commence sur une couche Dynapi
   * déplaçable (écouteur DragEvent.lyrListener) ne fait plus défiler ; dès que le doigt bouge, il devient
   * mousedown / mousemove / mouseup pour Dynapi. Un simple toucher reste un « clic » (tuile puis
   * destination). */
  function glisserTactile() {
    var dyn = window.DynObject, drag = window.DragEvent;
    if (!dyn || !dyn.all || !drag || !drag.lyrListener || !('ontouchstart' in window)) return;
    var deplacable = function (el) {
      for (; el && el !== document.body; el = el.parentElement) {
        var obj = el.id && dyn.all[el.id];
        if (obj && obj._listeners && obj._listeners.indexOf(drag.lyrListener) >= 0) return el;
      }
      return null;
    };
    // Dynapi remplace window.MouseEvent par sa propre classe : évènement natif par document.createEvent.
    var souris = function (type, cible, x, y) {
      var e = document.createEvent('MouseEvents');
      e.initMouseEvent(type, true, true, window, 1, x, y, x, y, false, false, false, false, 0, null);
      (cible || document.body).dispatchEvent(e);
    };
    // Hors de l'écran, elementFromPoint ne renvoie rien : le body (Dynapi ne sait pas traiter le document).
    var sous = function (x, y) { return document.elementFromPoint(x, y) || document.body; };
    var etat = null;
    document.addEventListener('touchstart', function (ev) {
      etat = null;
      if (ev.touches.length !== 1 || !deplacable(ev.target)) return;
      var t = ev.touches[0];
      etat = { cible: ev.target, x: t.clientX, y: t.clientY, glisse: false };
    }, { capture: true, passive: true });
    document.addEventListener('touchmove', function (ev) {
      if (!etat) return;
      ev.preventDefault();                       // dès le premier mouvement : la page ne défile pas
      var t = ev.touches[0];
      if (!etat.glisse) {
        if (Math.abs(t.clientX - etat.x) + Math.abs(t.clientY - etat.y) < 6) return;
        etat.glisse = true;
        souris('mousedown', etat.cible, etat.x, etat.y);
      }
      souris('mousemove', sous(t.clientX, t.clientY), t.clientX, t.clientY);
    }, { capture: true, passive: false });
    var finir = function (ev) {
      if (!etat) return;
      var e = etat; etat = null;
      if (!e.glisse) return;                     // simple toucher : le navigateur fait son « clic »
      if (ev.cancelable) ev.preventDefault();    // pas de clic en plus après un glissement
      var t = ev.changedTouches[0];
      souris('mouseup', sous(t.clientX, t.clientY), t.clientX, t.clientY);
    };
    document.addEventListener('touchend', finir, { capture: true, passive: false });
    document.addEventListener('touchcancel', finir, { capture: true, passive: false });
  }

  /* Clavier mathématique tactile (disposition A choisie par l'utilisateur, 2026-10-06), activé par une
   * surcharge CSS (:root { --nova-clavier-maths: oui; }, jetons.css), sur un écran tactile seulement. Il
   * remplace le clavier du téléphone (inputmode="none") dans tous les champs texte de réponse ; « ABC » rend
   * le clavier du téléphone pour le champ, un petit bouton « 123 » à côté du champ ramène au clavier Nova.
   * x² → ^2, x³ → ^3, √ → sqrt() (curseur entre les parenthèses), ×10ˣ → *10^, × → *, ÷ → /. Entrée :
   * « Suivant » vers le champ vide suivant, sinon « OK » (bouton d'envoi de WIMS, sa vérification comprise).
   * Les touches ne prennent pas le focus (pointerdown sans action par défaut) : le curseur reste dans le
   * champ. */
  function clavierMaths() {
    var form = document.forms.replyform;
    if (!form || !window.matchMedia || !window.matchMedia('(pointer: coarse)').matches) return;
    var reglage = getComputedStyle(document.documentElement).getPropertyValue('--nova-clavier-maths').trim().toLowerCase();
    if (!/^["']?(oui|yes|on|1)["']?$/.test(reglage)) return;
    var textes = document.getElementById('nova-textes');
    var t = function (n, d) { return (textes && textes.getAttribute('data-texte-clavier' + (n ? '-' + n : ''))) || d; };
    var champs = Array.prototype.filter.call(form.querySelectorAll('input[name^="reply"]'), function (c) {
      return (!c.type || c.type === 'text') && !c.readOnly && !c.disabled;
    });
    if (!champs.length) return;
    var natifs = [];
    var svg = function (d) {
      return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
    };
    var exp = function (b, e) { return b + '<sup>' + e + '</sup>'; };
    // Disposition A, colonnes permutées (demande de l'utilisateur, 2026-10-06) : chiffres et opérations à
    // gauche, fonctions et navigation à droite, « Suivant » en bas à droite. c = classe, v = texte écrit ou
    // action, a = nom accessible.
    var touches = [
      { l: '7' }, { l: '8' }, { l: '9' }, { l: '\u00F7', c: 'f', v: '/' },
      { l: exp('x', '2'), c: 'f', v: '^2', a: t('carre', 'Squared') }, { l: exp('x', '3'), c: 'f', v: '^3', a: t('cube', 'Cubed') },
      { l: '\u221A', c: 'f', v: 'racine', a: t('racine', 'Square root') },
      { l: '4' }, { l: '5' }, { l: '6' }, { l: '\u00D7', c: 'f', v: '*' },
      { l: '(' }, { l: ')' }, { l: '\u00D710' + '<sup>x</sup>', c: 'f', v: '*10^', a: t('puissance10', 'Times ten to the power') },
      { l: '1' }, { l: '2' }, { l: '3' }, { l: '\u2212', c: 'f', v: '-' },
      { l: svg('<path d="M15 6l-6 6 6 6"/>'), c: 'nav', v: 'gauche', a: t('gauche', 'Move left') },
      { l: svg('<path d="M9 6l6 6-6 6"/>'), c: 'nav', v: 'droite', a: t('droite', 'Move right') },
      { l: svg('<path d="M21 5H9l-6 7 6 7h12z"/><path d="M17 9l-5 6M12 9l5 6"/>'), c: 'nav', v: 'effacer', a: t('effacer', 'Delete') },
      { l: '0', c: 's2' }, { l: '.' }, { l: '+', c: 'f' },
      { l: 'ABC', c: 'abc', v: 'abc', a: t('abc', 'Phone keyboard') }, { l: '', c: 'ok s2', v: 'entree' }
    ];
    var clavier = document.createElement('div');
    clavier.className = 'nova-clavier';
    clavier.setAttribute('role', 'group');
    clavier.setAttribute('aria-label', t('', 'Math keyboard'));
    clavier.hidden = true;
    var entree = null;
    touches.forEach(function (k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.tabIndex = -1;
      b.className = 'nova-touche' + (k.c ? ' ' + k.c : '');
      b.innerHTML = '<span>' + k.l + '</span>';
      b.setAttribute('data-v', k.v || k.l);
      if (k.a) b.setAttribute('aria-label', k.a);
      if (k.v === 'entree') entree = b;
      clavier.appendChild(b);
    });
    document.body.appendChild(clavier);

    var champ = null;
    var evenement = function (c) { var e = document.createEvent('Event'); e.initEvent('input', true, true); c.dispatchEvent(e); };
    var vide = function (c) { return !c.value.trim(); };
    var suivantVide = function () {
      var i = champs.indexOf(champ);
      return champs.slice(i + 1).concat(champs.slice(0, i)).filter(vide)[0] || null;
    };
    var majEntree = function () {
      if (!entree || !champ) return;
      var suite = suivantVide();
      entree.querySelector('span').textContent = suite ? t('suivant', 'Next') : t('ok', 'OK');
    };
    var inserer = function (txt, recul) {
      var a = champ.selectionStart, b = champ.selectionEnd;
      champ.setRangeText(txt, a, b, 'end');
      if (recul) { var q = champ.selectionStart - recul; champ.setSelectionRange(q, q); }
      evenement(champ);
    };
    var agir = function (v) {
      if (!champ) return;
      var a = champ.selectionStart, b = champ.selectionEnd;
      if (v === 'gauche') { var g = a === b ? Math.max(0, a - 1) : a; champ.setSelectionRange(g, g); }
      else if (v === 'droite') { var d = a === b ? Math.min(champ.value.length, b + 1) : b; champ.setSelectionRange(d, d); }
      else if (v === 'effacer') {
        if (a !== b) champ.setRangeText('', a, b, 'end');
        else if (a > 0) champ.setRangeText('', a - 1, a, 'end');
        evenement(champ);
      }
      else if (v === 'racine') inserer('sqrt()', 1);
      else if (v === 'abc') natif(champ);
      else if (v === 'entree') {
        var suite = suivantVide();
        if (suite) { suite.focus(); return; }
        var envoi = form.querySelector('.send_answer input[type="submit"], input[type="submit"]');
        if (envoi) envoi.click(); else form.submit();
      }
      else inserer(v);
      majEntree();
    };
    // Les touches ne prennent pas le focus : le curseur reste dans le champ.
    clavier.addEventListener('pointerdown', function (ev) { if (ev.target.closest('.nova-touche')) ev.preventDefault(); });
    clavier.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    clavier.addEventListener('click', function (ev) {
      var b = ev.target.closest('.nova-touche');
      if (b) agir(b.getAttribute('data-v'));
    });

    var afficher = function (c) {
      champ = c;
      clavier.hidden = false;
      document.documentElement.classList.add('nova-clavier-ouvert');
      document.documentElement.style.setProperty('--nova-clavier-h', clavier.offsetHeight + 'px');
      majEntree();
      // Le champ reste visible au-dessus du clavier.
      var r = c.getBoundingClientRect(), bas = window.innerHeight - clavier.offsetHeight - 12;
      if (r.bottom > bas) window.scrollBy(0, r.bottom - bas);
      else if (r.top < 72) window.scrollBy(0, r.top - 72);
    };
    var cacher = function () {
      clavier.hidden = true;
      document.documentElement.classList.remove('nova-clavier-ouvert');
    };
    // « ABC » : clavier du téléphone pour ce champ ; « 123 » à côté du champ pour revenir.
    var natif = function (c) {
      if (natifs.indexOf(c) < 0) natifs.push(c);
      c.setAttribute('inputmode', 'text');
      c.classList.add('nova-champ-natif');
      cacher();
      c.blur();
      c.focus();
    };
    champs.forEach(function (c) {
      c.setAttribute('inputmode', 'none');
      // Liste de suggestions vide de WIMS (list="emptylist", contre la saisie automatique) : une flèche ▼
      // apparaît sur le champ au téléphone ; inutile ici (autocomplete déjà coupé par claviersReponse).
      c.removeAttribute('list');
      c.addEventListener('input', majEntree);
    });
    // Pastille flottante en bas à droite, quand le clavier Nova est rangé : le rouvre sur le dernier champ
    // utilisé (demande de l'utilisateur, 2026-10-06). Elle suit le haut du clavier du téléphone s'il est
    // ouvert (visualViewport).
    var dernier = champs[0];
    var pastille = document.createElement('button');
    pastille.type = 'button';
    pastille.className = 'nova-pastille-clavier';
    pastille.setAttribute('aria-label', t('123', 'Math keyboard'));
    pastille.title = t('123', 'Math keyboard');
    pastille.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 8h.01"/><path d="M12 12h.01"/><path d="M14 8h.01"/><path d="M16 12h.01"/><path d="M18 8h.01"/><path d="M6 8h.01"/><path d="M7 16h10"/><path d="M8 12h.01"/><rect width="20" height="16" x="2" y="4" rx="2"/></svg>';
    pastille.addEventListener('pointerdown', function (ev) { ev.preventDefault(); });
    pastille.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
    pastille.addEventListener('click', function () {
      var c = dernier;
      var n = natifs.indexOf(c);
      if (n >= 0) natifs.splice(n, 1);
      c.classList.remove('nova-champ-natif');
      c.setAttribute('inputmode', 'none');
      c.blur();
      c.focus();
      afficher(c);
    });
    document.body.appendChild(pastille);
    document.documentElement.classList.add('nova-clavier-permis');
    if (window.visualViewport) {
      var suivreClavier = function () {
        var vv = window.visualViewport;
        var bas = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        document.documentElement.style.setProperty('--nova-vv-bas', bas + 'px');
      };
      window.visualViewport.addEventListener('resize', suivreClavier);
      window.visualViewport.addEventListener('scroll', suivreClavier);
    }
    // Toucher ailleurs (énoncé, figure…) range le clavier Nova et rend la page entière ; la pastille le rouvre.
    document.addEventListener('pointerdown', function (ev) {
      if (clavier.hidden || clavier.contains(ev.target) || pastille.contains(ev.target) || champs.indexOf(ev.target) >= 0) return;
      cacher();
      if (champs.indexOf(document.activeElement) >= 0) document.activeElement.blur();
    }, true);
    document.addEventListener('focusin', function (ev) {
      if (champs.indexOf(ev.target) >= 0) dernier = ev.target;
      if (champs.indexOf(ev.target) >= 0 && natifs.indexOf(ev.target) < 0) afficher(ev.target);
      else if (!clavier.contains(ev.target)) cacher();
    });
    document.addEventListener('focusout', function () {
      setTimeout(function () {
        var actif = document.activeElement;
        if (champs.indexOf(actif) < 0 || natifs.indexOf(actif) >= 0) cacher();
      }, 0);
    });
    if (champs.indexOf(document.activeElement) >= 0) afficher(document.activeElement);
  }

  /* Images cliquables des exercices (<input type="image">, réponses « coord », droites graduées…) : le
   * navigateur envoie la position du clic en pixels AFFICHÉS, que WIMS lit comme des pixels de l'image. Nova
   * réduit les champs à la largeur de la page (max-width: 100 %) : sur un écran étroit ou zoomé, le point partait
   * ailleurs (signalé par un collègue de l'utilisateur, 2026-10-07, H2/number/OEFevalwimsnbrel.fr ; pas avec Pion3,
   * qui laisse l'image déborder). La position est ramenée à l'image d'origine avant l'envoi. Clavier (Entrée) :
   * envoi ordinaire. */
  function imagesCliquables() {
    if (!document.querySelector('.wimsbody input[type="image"]')) return;
    var tailles = {};
    Array.prototype.forEach.call(document.querySelectorAll('.wimsbody input[type="image"]'), function (i) {
      var im = new Image();
      im.onload = function () { tailles[i.src] = [im.naturalWidth, im.naturalHeight]; };
      im.src = i.src;
    });
    document.addEventListener('click', function (e) {
      var i = e.target;
      if (!i || i.tagName !== 'INPUT' || i.type !== 'image' || !i.form || !i.closest('.wimsbody') || e.detail === 0) return;
      var t = tailles[i.src];
      var r = i.getBoundingClientRect();
      var c = getComputedStyle(i);
      var gauche = r.left + parseFloat(c.borderLeftWidth) + parseFloat(c.paddingLeft);
      var haut = r.top + parseFloat(c.borderTopWidth) + parseFloat(c.paddingTop);
      var largeur = r.width - parseFloat(c.borderLeftWidth) - parseFloat(c.borderRightWidth) - parseFloat(c.paddingLeft) - parseFloat(c.paddingRight);
      var hauteur = r.height - parseFloat(c.borderTopWidth) - parseFloat(c.borderBottomWidth) - parseFloat(c.paddingTop) - parseFloat(c.paddingBottom);
      if (!t || !largeur || !hauteur || (Math.abs(largeur - t[0]) < 0.5 && Math.abs(hauteur - t[1]) < 0.5 && Math.abs(gauche - r.left) < 0.5 && Math.abs(haut - r.top) < 0.5)) return;   // taille réelle : rien à corriger
      e.preventDefault();
      var x = Math.round((e.clientX - gauche) * t[0] / largeur);
      var y = Math.round((e.clientY - haut) * t[1] / hauteur);
      x = Math.max(0, Math.min(t[0] - 1, x));
      y = Math.max(0, Math.min(t[1] - 1, y));
      var nom = i.name ? i.name + '.' : '';
      Array.prototype.forEach.call(i.form.querySelectorAll('input.nova-clic-image'), function (h) { h.remove(); });
      [['x', x], ['y', y]].forEach(function (v) {
        var h = document.createElement('input');
        h.type = 'hidden'; h.className = 'nova-clic-image'; h.name = nom + v[0]; h.value = v[1];
        i.form.appendChild(h);
      });
      if (typeof i.form.requestSubmit === 'function') i.form.requestSubmit(); else i.form.submit();
    }, true);
  }

  /* Exercices à dominos (étiquettes faites d'un tableau, scripts/anstype/fill.after ; demandes de l'utilisateur,
   * 2026-10-08) :
   *  - une consigne au-dessus des dominos (insérée avant que Dynapi ne place ses calques sur les repères
   *    fillobj1…, après « load » : rien ne se décale) ;
   *  - une seule taille de texte pour tous les dominos, la plus grande sans débordement (mesurée une fois les
   *    formules affichées par MathJax) ;
   *  - la case où le domino tomberait, en surbrillance pendant le glissement (règle de WIMS, f_cright : coin du
   *    domino à moins des 2/3 de la case), ou la case sous le pointeur quand un domino est choisi d'un clic. */
  function dominos() {
    if (standard('dominos')) return;   // réglage « Dominos du thème standard »
    var repere = document.getElementById('fillobj1');
    var exercice = !!repere && Array.prototype.some.call(document.scripts, function (sc) { return /f_objs/.test(sc.textContent) && /wimsborder/.test(sc.textContent); });
    // Page de correction (demande de l'utilisateur, 2026-10-08) : dominos réaffichés par WIMS (.drag_label >
    // .drag_content > table, dans l'énoncé et l'analyse) et ceux de la solution de l'auteur (tableaux à une ligne de
    // deux cases, marqués ici nova-domino-solution) : même habillage, même taille commune.
    var correction = !exercice && !!document.querySelector('.drag_content > table.wimsborder');
    if (!exercice && !correction) return;
    if (correction) Array.prototype.forEach.call(document.querySelectorAll('.wimsbody table.wimsborder'), function (t) {
      var lignes = t.rows;
      if (t.closest('.drag_content') || t.querySelector('table') || lignes.length !== 1 || lignes[0].cells.length !== 2) return;
      t.classList.add('nova-domino-solution');
    });
    // Ligne de solution trop large (dominos à 205 px et « = 6 = ») : elle défile dans son cadre, la page ne s'élargit pas.
    if (correction) Array.prototype.forEach.call(document.querySelectorAll('.wimsbody table:has(table.nova-domino-solution)'), function (t) {
      if (t.querySelector('table:has(table.nova-domino-solution)') || t.parentElement.classList.contains('nova-defile-x')) return;
      var cadre = document.createElement('div');
      cadre.className = 'nova-defile-x';
      t.parentNode.insertBefore(cadre, t);
      cadre.appendChild(t);
    });
    // Placement des calques par Dynapi (fill.after) : les cases d'un même groupe sont rangées en grille à partir du
    // repère du groupe, f_cut cases par ligne, pas de 205 px (stretchH) en largeur et de 50 px (stretchV) en hauteur ;
    // les dominos, sur leur repère fillobj<n> (décalage left de -205 px). Nova les fait plus hauts (80 px, CSS) : le
    // pas vertical est agrandi d'autant, sinon des cases sur plusieurs lignes se chevaucheraient. Au téléphone
    // (demande de l'utilisateur, 2026-10-08), ils sont moins larges (175 px ; 150 px d'abord : texte trop petit) :
    // places réservées, largeur, décalages et nombre de cases par ligne (f_cut) réduits avant « load », quand Dynapi
    // place ses calques.
    if (exercice && window.DynLayer && DynLayer.prototype.setAnchor) {
      var telephone = !!(window.matchMedia && matchMedia('(max-width: 639.98px)').matches);
      var etroit = 175, haut = 80 + 8, origine = null, origineV = null;
      Array.prototype.forEach.call(document.querySelectorAll('a[id^="fill"] > img, div:has(> a[id^="fillobj"]) > img'), function (im) {
        var w = parseFloat(im.style.width);
        if (!(w > 1)) return;
        if (!origine) origine = w;
        if (telephone) im.style.width = Math.round(w * etroit / origine) + 'px';
      });
      if (!telephone) etroit = origine;
      if (telephone && origine && window.f_cut) {
        var place = (document.querySelector('.wims_question') || repere.parentNode).clientWidth || 0;
        var parLigne = Math.max(1, Math.floor(place / etroit));
        for (var ic = 0; ic < f_cut.length; ic++) if (f_cut[ic] > parLigne) f_cut[ic] = parLigne;
      }
      if (origine) {
        var ancrer = DynLayer.prototype.setAnchor;
        DynLayer.prototype.setAnchor = function (a) {
          if (a && a.stretchH === origine) {
            var b = {};
            for (var k in a) if (Object.prototype.hasOwnProperty.call(a, k)) b[k] = a[k];
            if (origineV === null && typeof a.stretchV === 'number') origineV = a.stretchV;
            b.stretchH = etroit;
            if (typeof b.left === 'number') b.left = Math.round(b.left * etroit / origine);
            if (typeof b.top === 'number' && origineV) b.top = Math.round(b.top * haut / origineV);
            a = b;
          }
          return ancrer.call(this, a);
        };
      }
    }
    // Page à dominos : marquée avant « load » (le CSS agrandit dominos, cases et places réservées avant que Dynapi ne
    // calcule ses positions).
    document.documentElement.classList.add('nova-dominos');
    var textes = document.getElementById('nova-textes');
    var consigne = textes && textes.getAttribute('data-texte-consigne-dominos');
    var bloc = repere && repere.parentElement;
    if (exercice && consigne && bloc && !document.querySelector('.nova-consigne-glisser')) {
      var pc = document.createElement('p');
      pc.className = 'nova-consigne-glisser';
      pc.textContent = consigne;
      bloc.parentNode.insertBefore(pc, bloc);
    }
    // Taille commune : essais à 20 px, puis la plus grande qui tient partout, sur la face la plus large ou la plus
    // haute (bornée à 26 px).
    var essais = 0;
    var taille = function () {
      var faces = Array.prototype.slice.call(document.querySelectorAll('.wims_grabbable .fill_content > table.wimsborder :is(th, td), .drag_content > table.wimsborder :is(th, td), table.nova-domino-solution :is(th, td)'));
      var pretes = faces.length && faces.every(function (c) { return !c.querySelector('math') || c.querySelector('mjx-container'); });
      if (!pretes) { if (++essais < 40) setTimeout(taille, 200); return; }
      // Même taille pour tous les dominos affichés ensemble (cette page) ; elle peut changer d'un exercice à l'autre
      // (précision de l'utilisateur, 2026-10-08). Par un zoom commun sur les formules, et non par la taille de police :
      // MathJax recalcule l'échelle de ses formules d'après la police qui les entoure et annulait le changement (vécu :
      // largeurs inchangées de 10 à 26 px). Mesure au naturel (zoom 1), puis le plus grand zoom qui tient partout.
      var mesure = function (c) {
        // Rendu visible de MathJax (le MathML gardé pour les lecteurs d'écran fausserait la mesure), sinon le texte.
        var mj = c.querySelectorAll('mjx-container');
        if (mj.length) {
          var g = Infinity, d = -Infinity, h = Infinity, bas = -Infinity;
          Array.prototype.forEach.call(mj, function (m) { var q = m.getBoundingClientRect(); g = Math.min(g, q.left); d = Math.max(d, q.right); h = Math.min(h, q.top); bas = Math.max(bas, q.bottom); });
          return { width: d - g, height: bas - h };
        }
        var r = document.createRange(); r.selectNodeContents(c); return r.getBoundingClientRect();
      };
      var contenus = faces.map(function (c) { return c.querySelector('.wims_mathml') || c; });
      contenus.forEach(function (e) { e.style.zoom = ''; });
      var z = Infinity;
      faces.forEach(function (c) {
        var b = mesure(c), cs = getComputedStyle(c);
        var largeur = c.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 4;   // 2 px d'air de plus de chaque côté
        var hauteur = c.closest('.wims_grabbable, .drag_label, .nova-domino-solution').clientHeight - 12;  // marges et air
        if (b.width > 0) z = Math.min(z, largeur / b.width);
        if (b.height > 0) z = Math.min(z, hauteur / b.height);
      });
      if (!isFinite(z)) return;
      z = Math.max(0.5, Math.min(3, Math.floor(z * 100) / 100));   // la hauteur du domino borne déjà la taille
      contenus.forEach(function (e) { e.style.zoom = String(z); });
      document.documentElement.setAttribute('data-nova-dominos-zoom', String(z));
    };
    // MathJax retouche encore ses formules plusieurs secondes après « load » (fontes, taille relative à la police) :
    // mesures répétées toutes les 500 ms pendant 8 s, puis à chaque fin de rendu MathJax (vécu : 20 px posés d'après
    // une mesure prise trop tôt, texte qui débordait). Mesure et taille finale dans la même tâche : rien ne clignote.
    var relancer = function () { essais = 0; taille(); };
    window.addEventListener('load', function () {
      var n = 0;
      var tic = setInterval(function () { relancer(); if (++n >= 16) clearInterval(tic); }, 500);
      if (window.MathJax && MathJax.startup && MathJax.startup.promise) MathJax.startup.promise.then(function () { setTimeout(relancer, 150); });
    });
    if (!exercice) return;
    // Téléphone en portrait, dominos ou cases sur plusieurs lignes : fenêtre flottante qui propose le mode paysage
    // (demande de l'utilisateur, 2026-10-08). Elle part en paysage ou quand on la ferme (pas de retour de la session).
    var portrait = window.matchMedia ? matchMedia('(orientation: portrait)') : null;
    var surUneLigne = function (sel) {
      var hauts = Array.prototype.map.call(document.querySelectorAll(sel), function (e) { return Math.round(e.getBoundingClientRect().top + window.scrollY); });
      return !hauts.length || Math.max.apply(null, hauts) - Math.min.apply(null, hauts) < 4;
    };
    var fenetre = null;
    var paysage = function () {
      var ferme = false;
      try { ferme = sessionStorage.getItem('nova-paysage-ferme') === '1'; } catch (e) { /* sans stockage */ }
      var montrer = !ferme && portrait && portrait.matches && document.querySelector('.wims_droppable') &&
        !(surUneLigne('.wims_droppable') && surUneLigne('.wims_grabbable'));
      if (!montrer) { if (fenetre) fenetre.hidden = true; return; }
      if (!fenetre) {
        fenetre = document.createElement('div');
        fenetre.className = 'nova-paysage';
        fenetre.setAttribute('role', 'status');
        fenetre.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="2" width="10" height="16" rx="2"/><path d="M3 15a9 9 0 0 0 15 6"/><path d="M18 17v4h-4"/></svg><span></span><button type="button"></button>';
        fenetre.querySelector('span').textContent = (textes && textes.getAttribute('data-texte-paysage')) || 'Turn your phone sideways.';
        var bouton = fenetre.querySelector('button');
        bouton.textContent = '\u00d7';
        bouton.setAttribute('aria-label', (textes && textes.getAttribute('data-texte-fermer')) || 'Close');
        bouton.addEventListener('click', function () {
          fenetre.hidden = true;
          try { sessionStorage.setItem('nova-paysage-ferme', '1'); } catch (e) { /* cette page seulement */ }
        });
        document.body.appendChild(fenetre);
      }
      fenetre.hidden = false;
    };
    window.addEventListener('load', function () { setTimeout(paysage, 1200); });
    if (portrait && portrait.addEventListener) portrait.addEventListener('change', function () { setTimeout(paysage, 600); });
    caseVisee();
  }

  /* Tuiles à déplacer des autres exercices à cases (étiquettes qui ne sont pas des dominos : clickfill, dragfill ;
   * maquette C « poignée et creux », choisie par l'utilisateur le 2026-11-11, rattachée au réglage « dominos »).
   * html.nova-tuiles avant « load » (le CSS habille tuiles et cases, _css/composants-dominos.css) ; tuiles et cases
   * plus petites que 44 px agrandies (même taille pour toutes, fill_sx x fill_sy de fill.after) ; poignée et « Déposer
   * ici » seulement quand les tuiles sont vraiment larges (160 px et plus, demande de l'utilisateur) ; la tuile « ? »
   * qui vide une case (clickfill : une de plus que les étiquettes) marquée nova-tuile-vider. */
  function tuiles() {
    if (standard('dominos')) return;
    var script = Array.prototype.filter.call(document.scripts, function (sc) { return /f_objs/.test(sc.textContent); })[0];
    if (!script || /wimsborder/.test(script.textContent) || !document.getElementById('fillobj1')) return;
    var m = script.textContent.match(/stretchH:(\d+),stretchV:(\d+)/);
    if (!m) return;
    var sx = +m[1], sy = +m[2], racine = document.documentElement;
    racine.classList.add('nova-tuiles');
    if (sx >= 160) racine.classList.add('nova-tuiles-larges');
    // Avant « load » : petites tuiles agrandies à 44 px, et 8 px entre les cases d'un même groupe (Dynapi les colle :
    // pas de fill_sx, f_cut cases par ligne ; demande de l'utilisateur, 2026-11-11). Places réservées dans la page
    // (images transparentes dans fill<nom>, k cases de large et r de haut, et devant fillobj<n>, plus leurs cales de
    // 1 px de large), puis taille et décalages que Dynapi donne à ses calques.
    var nsx = Math.max(sx, 44), nsy = Math.max(sy, 44), ecart = 8;
    if (window.DynLayer && DynLayer.prototype.setAnchor) {
      Array.prototype.forEach.call(document.querySelectorAll('a[id^="fill"] > img, img:has(+ a[id^="fill"])'), function (im) {
        var w = parseFloat(im.style.width), h = parseFloat(im.style.height);
        var lien = /^fill/.test(im.parentElement.id || '') ? im.parentElement : im.nextElementSibling;
        var groupe = !!lien && !/^fillobj/.test(lien.id || '');
        var k = Math.round(w / sx), r = Math.floor(h / sy);
        if (k >= 1 && Math.abs(w - k * sx) < 1) im.style.width = (k * nsx + (groupe ? (k - 1) * ecart : 0)) + 'px';
        if (r >= 1) im.style.height = (h + r * (nsy - sy) + (groupe ? (r - 1) * ecart : 0)) + 'px';
      });
      var ancrer = DynLayer.prototype.setAnchor;
      DynLayer.prototype.setAnchor = function (a) {
        // Une seule fois par ancrage : Dynapi repasse ici l'ancrage d'un calque créé avant d'être ajouté à la page
        // (addChild, event.js) ; sans la marque, cases décalées deux fois quand la taille ne change pas (vécu,
        // tuiles de 44 px et plus : tuiles posées à côté des cases, 2026-11-11).
        centrer();
        if (a && !a.novaAjuste && a.stretchH === sx && a.stretchV === sy) {
          var b = { novaAjuste: true }, groupe = !/^fillobj/.test(a.leftA || '');
          for (var k in a) if (Object.prototype.hasOwnProperty.call(a, k)) b[k] = a[k];
          b.stretchH = nsx; b.stretchV = nsy;
          if (typeof b.left === 'number') {
            var col = groupe ? Math.max(0, Math.floor(b.left / sx)) : 0;
            b.left = Math.round(b.left * nsx / sx) + col * (groupe ? ecart : 0);
          }
          if (typeof b.top === 'number') {
            var lig = groupe ? Math.max(0, Math.floor(b.top / sy)) : 0;
            b.top = Math.round(b.top * nsy / sy) + lig * (groupe ? ecart : 0);
          }
          a = b;
        }
        return ancrer.call(this, a);
      };
      if (nsx !== sx || nsy !== sy) racine.classList.add('nova-tuiles-agrandies');
      // Tableau de cases plus large que l'énoncé (addition posée de E4/number/oefoperation au téléphone ; signalé par
      // l'utilisateur, 2026-11-11) : centré sur l'écran par une marge négative, posée avant « load » (Dynapi place
      // alors les cases dessus). Les cases gardent leur taille ; .wimsbody ne défile pas (calques hors de lui).
      var tableaux = Array.prototype.map.call(document.querySelectorAll('td > a[id^="fill"]:not([id^="fillobj"])'), function (a) { return a.closest('table'); })
        .filter(function (t, i, l) { return t && l.indexOf(t) === i; });
      // Cellules sans marge intérieure dès maintenant ; centrage mesuré au premier ancrage de Dynapi (au « load », avant le
      // calcul des positions) : mesuré ici, le tableau gardait encore ses anciennes marges (vécu, 2026-11-11).
      tableaux.forEach(function (t) {
        if (t.getBoundingClientRect().width <= t.parentElement.getBoundingClientRect().width + 1) return;
        Array.prototype.forEach.call(t.rows, function (tr) { Array.prototype.forEach.call(tr.cells, function (c) { c.style.paddingLeft = c.style.paddingRight = '1px'; }); });
        t.classList.add('nova-tuiles-tableau');
      });
      var centre = false;
      var centrer = function () {
        if (centre) return;
        centre = true;
        Array.prototype.forEach.call(document.querySelectorAll('table.nova-tuiles-tableau'), function (t) {
          var parent = t.parentElement, rt = t.getBoundingClientRect(), rp = parent.getBoundingClientRect();
          if (rt.width <= rp.width + 1) return;
          var gauche = Math.max(4, (document.documentElement.clientWidth - rt.width) / 2);
          var cs = getComputedStyle(parent), bord = rp.left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
          t.style.marginLeft = Math.round(gauche - bord) + 'px';
          t.style.marginRight = '0';
          racine.classList.add('nova-tuiles-debord');
        });
      };
    }
    var textes = document.getElementById('nova-textes');
    var consigne = textes && textes.getAttribute('data-texte-consigne-tuiles');
    var bloc = document.getElementById('fillobj1').parentElement;
    if (consigne && bloc && !document.querySelector('.nova-consigne-glisser')) {
      var pc = document.createElement('p');
      pc.className = 'nova-consigne-glisser';
      pc.textContent = consigne;
      bloc.parentNode.insertBefore(pc, bloc);
    }
    // Calques créés par Dynapi au chargement : tuile « vider » et texte des grandes cases.
    var deposer = (textes && textes.getAttribute('data-texte-deposer')) || 'Drop here';
    var marquer = function () {
      var lb = window.f_lbis, ob = window.f_objs;
      if (lb && ob && lb.length === ob.length && lb[lb.length - 1]) {
        var v = document.getElementById(lb[lb.length - 1].id);
        if (v) v.classList.add('nova-tuile-vider');
      }
      if (sx >= 160) Array.prototype.forEach.call(document.querySelectorAll('.wims_droppable'), function (z) { z.setAttribute('data-nova-deposer', deposer); });
    };
    window.addEventListener('load', function () { setTimeout(marquer, 0); setTimeout(marquer, 600); });
    caseVisee();
  }

  /* Correction des exercices à tuiles (demande de l'utilisateur, 2026-11-11) : quand WIMS ne marque pas les tuiles
   * réaffichées dans l'énoncé (div.inline.colorr_none, verdict seulement dans les conditions de l'auteur, ex.
   * E5/number/oefdecimal jeudesfamilles : « 8 x 100 = 800 : OUI »), chaque tuile prend le verdict de la ligne de
   * l'analyse qui commence par son texte : verte (bien placée) ou rouge (mal placée), pastille comme les choix.
   * Une tuile sans ligne, ou avec des lignes qui se contredisent, reste neutre. Réglage « dominos ». */
  function tuilesCorrigees() {
    if (standard('dominos') || document.documentElement.classList.contains('nova-dominos')) return;
    var tuiles = document.querySelectorAll('.oefstatement .drag_label');
    if (!tuiles.length) return;
    var texte = function (e) { return (e.textContent || '').replace(/\s+/g, ' ').trim(); };
    var lignes = [];
    Array.prototype.forEach.call(document.querySelectorAll('table.answeranalysis tr'), function (tr) {
      var c = tr.querySelector('td.bold'), v = tr.querySelector('.oef_condgood, .oef_condbad');
      if (c && v) lignes.push({ t: texte(c) + ' ', ok: v.classList.contains('oef_condgood') });
    });
    if (!lignes.length) return;
    Array.prototype.forEach.call(tuiles, function (d) {
      if (d.closest('.oef_indgood, .oef_indbad, .oef_indpartial') || d.classList.contains('nova-tuile-juste') || d.classList.contains('nova-tuile-fausse')) return;
      var t = texte(d.querySelector('.drag_content') || d);
      if (!t) return;
      var vus = lignes.filter(function (l) { return l.t.indexOf(t + ' ') === 0; });
      if (!vus.length || vus.some(function (l) { return l.ok !== vus[0].ok; })) return;
      d.classList.add(vus[0].ok ? 'nova-tuile-juste' : 'nova-tuile-fausse');
      var p = document.createElement('span');
      p.className = 'nova-choix-pastille';
      p.setAttribute('aria-hidden', 'true');
      d.appendChild(p);
    });
  }


  /* Éléments à associer (OEF correspond, scripts/anstype/correspond.input et correspond ; variante A « Trait » choisie par
   * l'utilisateur sur maquette, 2026-11-11 ; réglage « dominos »). Saisie : calques Dynapi globaux c<i>_lleft, _lright
   * (rangé par c<i>_ys), _lmid, état c<i>_det (paire faite par ligne), c<i>_clx (1 gauche, 2 droite) et c<i>_cly (ligne
   * choisie) ; c<i>_update, appelée à chaque changement, est enveloppée pour poser les classes d'ÉTAT : choisie, cibles
   * de l'autre colonne, liée, et sur le milieu trait plein ou pointillés vers un rond « ? » (flèches de WIMS alors
   * masquées). L'aspect de repos (tuiles, cadre, correction) est dans le CSS, d'après la structure de WIMS, sans
   * attendre nova.js (2026-11-11). Correction : seule la pastille ✓ / ✕ de l'énoncé est ajoutée ici. */
  function associations() {
    if (standard('dominos')) return;
    // Correction : l'aspect est tout entier dans le CSS (structure de WIMS) ; ici, seulement la pastille de l'énoncé, que
    // le CSS colore et remplit (✓ / ✕ selon le fond de la cellule).
    Array.prototype.forEach.call(document.querySelectorAll('.oefstatement table > tbody > tr > td:nth-child(2) > img[src*="arrows/corrlr"]'), function (im) {
      var td = im.parentElement.nextElementSibling;
      if (!td || td.nextElementSibling || td.querySelector('.nova-choix-pastille')) return;
      var p = document.createElement('span');
      p.className = 'nova-choix-pastille';
      p.setAttribute('aria-hidden', 'true');
      td.appendChild(p);
    });

    var noms = [];
    Array.prototype.forEach.call(document.scripts, function (sc) {
      var re = /var (c\d+)_lefts=new Array/g, m;
      while ((m = re.exec(sc.textContent))) if (noms.indexOf(m[1]) < 0) noms.push(m[1]);
    });
    if (!noms.length) return;
    var textes = document.getElementById('nova-textes');
    var consigne = textes && textes.getAttribute('data-texte-consigne-associer');
    var marquer = function (z) {
      var L = window[z + '_lleft'], R = window[z + '_lright'], M = window[z + '_lmid'], det = window[z + '_det'], ys = window[z + '_ys'];
      if (!L || !R || !M || !det || !ys || !L[0] || !L[0].elm) return;
      var clx = window[z + '_clx'], cly = window[z + '_cly'];
      for (var k = 0; k < L.length; k++) {
        var g = L[k] && L[k].elm, d = R[ys[k]] && R[ys[k]].elm, m = M[k] && M[k].elm;
        if (!g || !d || !m) continue;
        var lie = det[k] > 0, prisG = cly === k && clx === 1, prisD = cly === k && clx === 2;
        m.classList.add('nova-assoc-lien');
        g.classList.toggle('nova-assoc-liee', lie); d.classList.toggle('nova-assoc-liee', lie);
        g.classList.toggle('nova-assoc-prise', prisG); d.classList.toggle('nova-assoc-prise', prisD);
        g.classList.toggle('nova-assoc-cible', clx === 2); d.classList.toggle('nova-assoc-cible', clx === 1);
        m.classList.toggle('nova-assoc-lie', lie && !prisG && !prisD);
        m.classList.toggle('nova-assoc-attend-d', prisG);
        m.classList.toggle('nova-assoc-attend-g', prisD);
      }
    };
    noms.forEach(function (z) {
      var ancre = document.getElementById('tarea' + z.slice(1));
      // Avant « load » : Dynapi place ses calques sur l'ancre ensuite, rien ne se décale.
      if (consigne && ancre && !document.querySelector('.nova-consigne-associer')) {
        var pc = document.createElement('p');
        pc.className = 'nova-consigne-glisser nova-consigne-associer';
        pc.textContent = consigne;
        ancre.parentNode.insertBefore(pc, ancre);
      }
      var maj = window[z + '_update'];
      if (typeof maj === 'function') window[z + '_update'] = function () { var r = maj.apply(this, arguments); marquer(z); return r; };
    });
    var tout = function () { noms.forEach(marquer); };
    if (document.readyState === 'complete') setTimeout(tout, 0);
    window.addEventListener('load', function () { setTimeout(tout, 0); setTimeout(tout, 600); });
  }
  // Case visée pendant le glissement ou quand une étiquette est choisie (dominos et tuiles).
  function caseVisee() {
    var glisse = null, rafId = 0, derniere = null, remplacee = null;
    // Tuile déjà posée sur la case visée (glisser-déposer : elle la recouvre) : allumée aussi, WIMS la renverra dans la
    // réserve (demande de l'utilisateur, 2026-11-12). Reconnue par sa position : coin à 2 px de celui de la case.
    var posee = function (z) {
      if (!z) return null;
      var r = z.getBoundingClientRect(), tenue = glisse || choisi();
      return Array.prototype.filter.call(document.querySelectorAll('.wims_grabbable'), function (g) {
        if (g === tenue) return false;
        var q = g.getBoundingClientRect();
        return Math.abs(q.left - r.left) < 2 && Math.abs(q.top - r.top) < 2;
      })[0] || null;
    };
    var marquer = function (z) {
      var t = posee(z);
      if (t !== remplacee) {
        if (remplacee) remplacee.classList.remove('nova-remplacee');
        if (t) t.classList.add('nova-remplacee');
        remplacee = t;
      }
      if (z === derniere) return;
      if (derniere) derniere.classList.remove('nova-survolee');
      if (z) z.classList.add('nova-survolee');
      derniere = z;
    };
    var choisi = function () { return document.querySelector('.wims_grabbable[style*="rgb(96, 96, 255)"]'); };
    document.addEventListener('mousedown', function (e) { var g = e.target.closest && e.target.closest('.wims_grabbable'); glisse = g || null; }, true);
    document.addEventListener('mouseup', function () { glisse = null; setTimeout(function () { marquer(null); }, 0); }, true);
    document.addEventListener('mousemove', function (e) {
      if (rafId) return;
      rafId = requestAnimationFrame(function () {
        rafId = 0;
        var zones = document.querySelectorAll('.wims_droppable');
        var vise = null;
        if (glisse) {
          var g = glisse.getBoundingClientRect();
          Array.prototype.some.call(zones, function (z) {
            var r = z.getBoundingClientRect();
            if (Math.abs(g.left - r.left) <= r.width * 2 / 3 && Math.abs(g.top - r.top) <= r.height * 2 / 3) { vise = z; return true; }
            return false;
          });
        } else if (choisi()) {
          Array.prototype.some.call(zones, function (z) {
            var r = z.getBoundingClientRect();
            if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) { vise = z; return true; }
            return false;
          });
        }
        marquer(vise);
      });
    }, true);
  }

  /* ===== js/src/60-eleve.js : accueil de l'élève, Mon activité, badges ===== */
  /* Élève d'un portail ou d'un groupement dont l'accueil ne propose qu'un seul cours (ou une seule classe) :
   * il y entre directement, juste après la connexion comme à chaque retour à cet accueil, qui devient ainsi
   * le cours (demande de l'utilisateur, 2026-10-05). Seulement si cet accueil n'a rien d'autre à montrer : ni
   * travail (#widget_user_list), ni message de la classe (themes/_widgets/motd.phtml). location.replace :
   * pas d'étape de plus dans l'historique. Un retour depuis le cours passe par le portail (ou le groupement) :
   * sa page de classe renvoie d'abord à la classe, il faut un second saut (vécu au banc). Garde-fou : au plus
   * 3 sauts vers le même cours en 10 s. */
  function coursUnique() {
    if (!document.getElementById('nova-eleve')) return;
    // Avant tout retour anticipé : chaque page de l'élève doit noter sa classe.
    // Sens du déplacement (correction du 2026-10-07, signalée par l'utilisateur : un élève qui remontait du cours
    // vers une page à entrée unique, celle de sa classe, y était renvoyé aussitôt vers le cours, page masquée, et
    // ne passait qu'après plusieurs « Retour » rapides). On ne saute que vers le bas : juste après la connexion
    // (session=new.), ou depuis une page qui n'est pas sous l'entrée unique. La classe de chaque page de l'élève
    // (meta nova-classe, htmlheader.phtml) est retenue pour la page suivante.
    var meta = document.querySelector('meta[name="nova-classe"]');
    var ici = meta ? meta.getAttribute('content') : '';
    var precedente = null;
    try { precedente = sessionStorage.getItem('nova-classe-prec'); if (ici) sessionStorage.setItem('nova-classe-prec', ici); } catch (e) { /* sans stockage */ }
    if (/[?&]session=new\./.test(location.href)) precedente = null;
    var corps = document.querySelector('.wimsbody');
    // Réglage par surcharge CSS (jetons.css) : :root { --nova-entree-directe: non; } garde l'élève sur cet
    // accueil (demande de l'utilisateur, 2026-10-06).
    var reglage = getComputedStyle(document.documentElement).getPropertyValue('--nova-entree-directe').trim().toLowerCase();
    if (/^["']?(non|no|none|aucune|off|0)["']?$/.test(reglage)) { if (corps) corps.classList.add('nova-sans-saut'); return; }
    var liste = corps && corps.querySelector(':scope > ul.wims_subclasses');
    var liens = liste ? liste.querySelectorAll('a[href*="type=authparticipant"]') : [];
    var travail = document.getElementById('widget_user_list');
    var seul = liens.length === 1 && !(travail && travail.textContent.trim()) &&
      !document.querySelector('#wims_class_motd, #wims_class_pmotd');
    if (!liste) return;
    if (seul) {
      var cible = (/[?&+]class=([^&]*)/.exec(liens[0].getAttribute('href')) || [])[1] || liens[0].href;
      try { cible = decodeURIComponent(cible); } catch (e) { /* telle quelle */ }
      if (precedente && (precedente === cible || precedente.indexOf(cible + '/') === 0)) { corps.classList.add('nova-sans-saut'); return; }
      var recent = false;
      try {
        var dernier = JSON.parse(sessionStorage.getItem('nova-cours-unique') || 'null');
        var suite = !!dernier && dernier.cible === cible && Date.now() - dernier.t < 10000;
        var essais = suite ? dernier.n + 1 : 1;
        recent = essais > 3;
        if (!recent) sessionStorage.setItem('nova-cours-unique', JSON.stringify({ cible: cible, t: suite ? dernier.t : Date.now(), n: essais }));
      } catch (e) { /* stockage refusé : on entre quand même */ }
      // Après « load » et un délai : une requête partie moins d'une seconde après la précédente est traitée
      // avec l'état précédent de la session et ramène ici (mesuré au banc : 300 ms échoue, 1 s passe de
      // justesse, 1,5 s passe). Juste après la connexion (session=new.…), 300 ms suffisent.
      if (!recent) {
        var delai = /[?&]session=new\./.test(location.href) ? 300 : 1500;
        var partir = function () { setTimeout(function () { location.replace(liens[0].href); }, delai); };
        if (document.readyState === 'complete') partir(); else window.addEventListener('load', partir);
        return;
      }
    }
    corps.classList.add('nova-sans-saut');
  }

  /* « Dernière connexion le 07/10/2026 - 23:03:05 » (modules/home/main.phtml, date de scripts/adm/date.phtml, hors du
   * thème) : jour/mois et heures:minutes seulement, « 07/10 à 23:03 » (demande de l'utilisateur, 2026-10-08). */
  function derniereConnexion() {
    var a = /^en/i.test(document.documentElement.lang || '') ? 'at' : '\u00e0';
    Array.prototype.forEach.call(document.querySelectorAll('.wimsbody .wims_msg.info'), function (m) {
      var re = /(\d{1,2})\/(\d{1,2})\/\d{4}\s*-\s*(\d{1,2}):(\d{2}):\d{2}/;
      if (!re.test(m.textContent)) return;
      var marche = document.createTreeWalker(m, NodeFilter.SHOW_TEXT);
      for (var t = marche.nextNode(); t; t = marche.nextNode()) {
        if (re.test(t.nodeValue)) { t.nodeValue = t.nodeValue.replace(re, '$1/$2 ' + a + ' $3:$4'); return; }
      }
    });
  }

  /* Menu latéral rangé dans #wimspagebox par WIMS sur certaines pages (page de réponse d'un exercice de feuille)
   * au lieu d'être enfant de #wimsbodybox comme partout ailleurs : remis à sa place habituelle, sinon ni le tiroir
   * ni la grille de Nova ne s'appliquent (vécu le 2026-10-08 : menu ☰ en bas de page, sous les boutons collés et
   * le voile). */
  /* Page « Mon activité » de l'élève (demande de l'utilisateur, 2026-10-08, maquette A) : le lien de WIMS
   * (module adm/class/activity) mène à la page Nova de l'accueil (nova_activite=1, _widgets/activite.phtml), sauf
   * réglage --nova-activite: non (page Apparence) ou « Menus comme le thème standard ». */
  function activiteLien() {
    if (!document.getElementById('nova-eleve') || standard('menus')) return;
    var v = getComputedStyle(document.documentElement).getPropertyValue('--nova-activite').trim().replace(/["']/g, '');
    if (v === 'non') return;
    document.querySelectorAll('#wimsmenumodubox a[href*="module=adm%2Fclass%2Factivity"], #wimstopbox a[href*="module=adm%2Fclass%2Factivity"]').forEach(function (a) {
      a.href = a.href.replace(/module=adm%2Fclass%2Factivity(&\+job=[^&]*)?/, 'module=home&+nova_activite=1');
    });
  }

  /* Badges de l'élève (demande de l'utilisateur, 2026-10-07, maquette B ; premier badge : Fidélité).
   *  - « Mes badges » dans le menu du compte de l'élève, sur toutes ses pages, quand --nova-badges vaut oui
   *    (pas en session d'examen) : lien vers l'accueil de la classe, qui ouvre la fenêtre (#nova-badges) ;
   *  - sur l'accueil (user.phtml) : pastille à côté de « Mes notes », annonce d'un nouveau niveau, et données
   *    du badge (#nova-badges, calculées par _procs/badges.awk) pour la fenêtre, ouverte d'un toucher. */
  function badges() {
    var racine = document.documentElement;
    var actif = getComputedStyle(racine).getPropertyValue('--nova-badges').trim().replace(/["']/g, '') === 'oui';
    if (getComputedStyle(racine).getPropertyValue('--nova-badges-actifs').trim().replace(/["']/g, '') === 'aucun') actif = false;
    var maison = document.querySelector('#wimstopbox .class_home a[href]');
    var surAccueil = !!document.getElementById('nova-badges');
    // « Mes badges » juste après « Mes notes », dans le même menu (le menu latéral ; demande de l'utilisateur,
    // 2026-10-07). Classe « heart » : icône cœur du jeu Font_Awesome de WIMS (sans elle, un tiret), rien
    // avec le jeu « default ».
    var notes = document.querySelector('#wimsmenumodubox .menuitem > a.myscore');
    var textes = document.getElementById('nova-textes');
    if (actif && notes && document.getElementById('nova-eleve') && (maison || surAccueil) &&
        !document.body.classList.contains('nova-examen-session') && !document.querySelector('.nova-mes-badges')) {
      var item = notes.parentNode.cloneNode(false);
      item.removeAttribute('id');
      var lien = document.createElement('a');
      lien.className = 'heart nova-mes-badges';
      lien.href = maison ? maison.href.split('#')[0] + '#nova-badges' : '#nova-badges';   // accueil : sans lien de retour
      lien.textContent = (textes && textes.getAttribute('data-texte-mes-badges')) || 'My badges';
      item.appendChild(lien);
      notes.parentNode.parentNode.insertBefore(item, notes.parentNode.nextSibling);
    }

    var d = document.getElementById('nova-badges');
    if (!d) return;
    var masquer = document.querySelector('.nova-badge-annonce .nova-badge-masquer');
    if (masquer) masquer.addEventListener('click', function () { masquer.closest('.nova-badge-annonce').remove(); });
    var fenetre = null;
    var ouvrir = function (badge) {
      if (!fenetre) fenetre = fenetreBadges(d);
      if (badge && fenetre.choisir) fenetre.choisir(badge);
      if (typeof fenetre.showModal === 'function') { if (!fenetre.open) fenetre.showModal(); }
      else fenetre.setAttribute('open', '');
    };
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href$="#nova-badges"]');
      if (!a) return;
      e.preventDefault();
      ouvrir(a.getAttribute('data-badge'));
    });
    if (location.hash === '#nova-badges') {
      try { history.replaceState(null, '', location.href.split('#')[0]); } catch (e) { /* adresse gardée */ }
      ouvrir();
    }
  }

  function fenetreBadges(d) {
    var a = function (nom) { return d.getAttribute('data-' + nom) || ''; };
    var el = function (balise, classe, texte) {
      var e = document.createElement(balise);
      if (classe) e.className = classe;
      if (texte != null) e.textContent = texte;
      return e;
    };
    var noms = a('niveaux').split(',');
    var reg = a('reglages').split(/\s+/);   // reglages <exercices/semaine> <réussite> <échec> <échecs> <examens>
    var parsem = +reg[1] || 1, reussite = reg[2] || '7', echec = reg[3] || '5', nechecs = reg[4] || '2', examens = reg[5] !== '0';
    var nsess = +reg[7] || 2;   // Échauffement : sessions d'entraînement demandées avant le DM noté
    var f = el('dialog', 'nova-badges-fenetre');
    f.setAttribute('aria-labelledby', 'nova-badges-titre');
    var tete = el('div', 'nova-badges-entete');
    var h = el('h2', '', a('titre'));
    h.id = 'nova-badges-titre';
    var fermer = el('button', 'nova-badges-fermer', '\u00d7');
    fermer.type = 'button';
    fermer.setAttribute('aria-label', a('fermer'));
    fermer.addEventListener('click', function () { f.close ? f.close() : f.removeAttribute('open'); });
    tete.appendChild(h); tete.appendChild(fermer);
    f.appendChild(tete);
    // Toucher à côté de la fenêtre : la ferme.
    f.addEventListener('click', function (e) { if (e.target === f && f.close) f.close(); });

    var dateLongue = function (o) {
      if (!/^\d{8}$/.test(o)) return '';
      return new Date(+o.slice(0, 4), +o.slice(4, 6) - 1, +o.slice(6, 8)).toLocaleDateString(racineLangue(), { day: 'numeric', month: 'long', year: 'numeric' });
    };
    // Panneau commun : en-tête (image, nom, niveau, date, règle), chiffres, état, grille des niveaux, aide.
    var panneau = function (cle, nom, niveau, np, paliers, obtenu, regle, chiffresListe, etatClasse, etatTexte, unite, aide, images) {
      var carte = el('section', 'nova-badge-detail');
      carte.setAttribute('data-badge', cle);
      var image = function (n) { return images + Math.max(1, n) + '.webp'; };
      var haut = el('div', 'nova-badge-haut');
      var img = el('img', niveau ? '' : 'nova-badge-verrou');
      img.src = image(niveau); img.alt = ''; img.width = 96; img.height = 96;
      haut.appendChild(img);
      var titre = el('div');
      titre.appendChild(el('h3', '', nom));
      titre.appendChild(el('p', 'nova-badge-niveau', niveau ? noms[niveau - 1] + ' \u00b7 ' + a('niveau') + ' ' + niveau + '/' + np : a('aucun')));
      var dt = niveau ? dateLongue(obtenu) : '';
      if (dt) titre.appendChild(el('p', '', a('obtenu') + ' ' + dt + '.'));
      titre.appendChild(el('p', '', regle));
      haut.appendChild(titre);
      carte.appendChild(haut);
      var chiffres = el('div', 'nova-badge-chiffres');
      chiffresListe.forEach(function (c) {
        var b = el('div');
        b.appendChild(el('b', '', String(c[0])));
        b.appendChild(el('span', '', c[1]));
        chiffres.appendChild(b);
      });
      carte.appendChild(chiffres);
      if (etatTexte) carte.appendChild(el('p', 'nova-badge-etat nova-badge-etat-' + etatClasse, etatTexte));
      var grille = el('ol', 'nova-badge-niveaux');
      paliers.forEach(function (p, i) {
        var n = i + 1;
        var li = el('li', n < niveau ? 'nova-atteint' : (n === niveau ? 'nova-atteint nova-actuel' : 'nova-verrou'));
        var im = el('img');
        im.src = image(n); im.alt = ''; im.width = 52; im.height = 52; im.loading = 'lazy';
        li.appendChild(im);
        li.appendChild(el('span', '', noms[i] || String(n)));
        li.appendChild(el('b', '', unite ? p + ' ' + unite : String(p)));
        grille.appendChild(li);
      });
      carte.appendChild(grille);
      if (aide) carte.appendChild(el('p', 'nova-badge-aide', aide));
      return carte;
    };
    var panneaux = [];
    // Régularité (ex-Fidélité ; compteur de semaines depuis le 2026-11-07, maquette validée par l'utilisateur) :
    // fidelite on niveau total total etat prochain nouveau obtenu np paliers… (etat : fait | attente).
    var mf = a('fidelite').split(/\s+/);
    if (mf[1] === 'on') {
      var niveau = +mf[2], totalF = +mf[3], etat = mf[5] === 'fait' ? 'fait' : 'attente', prochain = +mf[6], np = +mf[9];
      var paliers = mf.slice(10, 10 + np).map(Number);
      var suite = niveau < np ? (prochain === 1 ? a('fid-suite1') : a('fid-suite')).replace('%n', prochain).replace('%s', noms[niveau]) : a('max');
      var etatTexte = etat === 'fait' ? (a('fid-etat-fait') + ' ' + suite).trim()
        : (parsem === 1 ? a('fid-etat-attente1') : a('fid-etat-attente')).replace('%e', parsem);
      var chiffresF = [[totalF, a('fid-total')]];
      if (niveau < np) chiffresF.push([prochain, a('avant').replace('%s', noms[niveau])]);
      panneaux.push(['fidelite', a('fid-nom'), panneau('fidelite', a('fid-nom'), niveau, np, paliers, mf[8],
        (parsem === 1 ? a('fid-regle1') : a('fid-regle')).replace('%e', parsem), chiffresF, etat, etatTexte, a('sem'), a('fid-aide'), a('images-fidelite'))]);
    }
    // Persévérance : perseverance on niveau total prochain nouveau obtenu np paliers…
    var mp = a('perseverance').split(/\s+/);
    if (mp[1] === 'on') {
      var nivP = +mp[2], total = +mp[3], prochP = +mp[4], npP = +mp[7];
      var palP = mp.slice(8, 8 + npP).map(Number);
      var chiffresP = [[total, a('per-total')]];
      if (nivP < npP) chiffresP.push([prochP, a('avant').replace('%s', noms[nivP])]);
      // « En cours » : exercice qui n'attend qu'une réussite (titre|échecs), sinon ce qui reste.
      var enc = a('encours'), etatP, texteP;
      if (enc && enc.indexOf('|') > 0) {
        var t = enc.split('|');
        etatP = 'attente';
        texteP = a('per-encours').replace('%t', t[0]).replace('%n', t[1]).replace('%e', echec);
      } else {
        etatP = 'fait';
        texteP = nivP < npP ? (prochP === 1 ? a('per-suite1') : a('per-suite')).replace('%n', prochP).replace('%s', noms[nivP]) : a('max');
      }
      panneaux.push(['perseverance', a('per-nom'), panneau('perseverance', a('per-nom'), nivP, npP, palP, mp[6],
        a('per-regle').replace('%r', reussite).replace('%n', nechecs).replace('%e', echec), chiffresP, etatP, texteP, '',
        a(examens ? 'per-examens-oui' : 'per-examens-non'), a('images-perseverance'))]);
    }
    // Échauffement (DM WIMS, 2026-11-06) : echauffement on niveau total prochain nouveau obtenu np paliers… ;
    // data-dm = « faites demandées titre » du DM noté ouvert et pas encore commencé, ou « - ».
    var mh = a('echauffement').split(/\s+/);
    if (mh[1] === 'on') {
      var nivH = +mh[2], totalH = +mh[3], prochH = +mh[4], npH = +mh[7];
      var palH = mh.slice(8, 8 + npH).map(Number);
      var chiffresH = [[totalH, a('ech-total')]];
      if (nivH < npH) chiffresH.push([prochH, a('avant').replace('%s', noms[nivH])]);
      var dm = /^dm (\d+) (\d+) (.+)$/.exec(a('dm')), etatH, texteH;
      if (dm) {
        var reste = +dm[2] - +dm[1];
        etatH = reste > 0 ? 'attente' : 'fait';
        texteH = (reste > 1 ? a('ech-dm').replace('%n', reste) : (reste === 1 ? a('ech-dm1') : a('ech-pret'))).replace('%t', dm[3]);
      } else {
        etatH = 'fait';
        texteH = nivH < npH ? (prochH === 1 ? a('ech-suite1') : a('ech-suite')).replace('%n', prochH).replace('%s', noms[nivH]) : a('max');
      }
      panneaux.push(['echauffement', a('ech-nom'), panneau('echauffement', a('ech-nom'), nivH, npH, palH, mh[6],
        (nsess === 1 ? a('ech-regle1') : a('ech-regle')).replace('%n', nsess), chiffresH, etatH, texteH, '',
        a('ech-aide'), a('images-echauffement'))]);
    }
    // Au top (DM WIMS notés réussis, 2026-11-07) : top on niveau total prochain nouveau obtenu np paliers… ;
    // data-topdm = « topdm <note retenue | -> <seuil> <titre> » du DM noté ouvert le plus récent, ou « topdm - ».
    var mt = a('top').split(/\s+/);
    if (mt[1] === 'on') {
      var nivT = +mt[2], totalT = +mt[3], prochT = +mt[4], npT = +mt[7];
      var palT = mt.slice(8, 8 + npT).map(Number);
      var chiffresT = [[totalT, a('top-total')]];
      if (nivT < npT) chiffresT.push([prochT, a('avant').replace('%s', noms[nivT])]);
      var td = /^topdm (\S+) (\S+) (.+)$/.exec(a('topdm')), etatT, texteT;
      var virgule = function (n) { return String(Math.round(n * 10) / 10).replace('.', racineLangue() === 'fr' ? ',' : '.'); };
      var seuilT = +reg[8] || (td ? +td[2] : 9);
      if (td && td[1] === '-') { etatT = 'attente'; texteT = a('top-afaire'); }
      else if (td && +td[1] >= seuilT) { etatT = 'fait'; texteT = a('top-reussi'); }
      else if (td) { etatT = 'attente'; texteT = a('top-encore'); }
      if (td) texteT = texteT.replace('%t', td[3]).replace('%n', virgule(+td[1])).replace('%s', virgule(seuilT));
      else {
        etatT = 'fait';
        texteT = nivT < npT ? (prochT === 1 ? a('top-suite1') : a('top-suite')).replace('%n', prochT).replace('%s', noms[nivT]) : a('max');
      }
      panneaux.push(['top', a('top-nom'), panneau('top', a('top-nom'), nivT, npT, palT, mt[6],
        a('top-regle').replace('%s', virgule(seuilT)), chiffresT, etatT, texteT, '', a('top-aide'), a('images-top'))]);
    }
    // Couleur personnelle : carte dans l'onglet du badge choisi par l'enseignant (reglages : 9e champ badge, 10e niveau).
    var drC = droitsCouleur(d);
    panneaux.forEach(function (p) {
      if (!drC || (p[0] !== drC.badge && p[0] !== drC.badgeDeg)) return;
      var detail = p[2], aide = detail.querySelector('.nova-badge-aide');
      var carte = carteCouleur(d, p[0]);
      detail.insertBefore(carte, detail.querySelector('.nova-badge-niveaux') || aide);
    });
    // Onglets, s'il y a plus d'un badge.
    var onglets = null;
    f.choisir = function (cle) {
      panneaux.forEach(function (p) {
        var on = p[0] === cle;
        p[2].hidden = !on;
        if (p[3]) { p[3].setAttribute('aria-selected', on ? 'true' : 'false'); p[3].classList.toggle('nova-actif', on); p[3].tabIndex = on ? 0 : -1; }
      });
    };
    if (panneaux.length > 1) {
      onglets = el('div', 'nova-badges-onglets');
      onglets.setAttribute('role', 'tablist');
      panneaux.forEach(function (p) {
        var b = el('button', 'nova-badges-onglet');
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.id = 'nova-onglet-' + p[0];
        var im = el('img');
        var niv = +({ fidelite: mf, perseverance: mp, echauffement: mh, top: mt }[p[0]][2]);
        im.src = a('images-' + p[0]) + Math.max(1, niv) + '.webp'; im.alt = ''; im.width = 28; im.height = 28;
        if (!niv) im.className = 'nova-badge-verrou';
        b.appendChild(im);
        b.appendChild(el('span', 'nova-badges-onglet-nom', p[1]));
        b.title = p[1];
        b.addEventListener('click', function () { f.choisir(p[0]); });
        p[2].setAttribute('role', 'tabpanel');
        p[2].setAttribute('aria-labelledby', b.id);
        p[3] = b;
        onglets.appendChild(b);
      });
      onglets.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var i = panneaux.findIndex(function (p) { return !p[2].hidden; });
        var n = (i + (e.key === 'ArrowRight' ? 1 : panneaux.length - 1)) % panneaux.length;
        f.choisir(panneaux[n][0]); panneaux[n][3].focus();
      });
      f.appendChild(onglets);
    }
    panneaux.forEach(function (p) { f.appendChild(p[2]); });
    if (panneaux.length) f.choisir(panneaux[0][0]);
    document.body.appendChild(f);
    return f;
  }

  /* Accueil de l'élève, écran étroit (2026-11-11, utilisateur) : « Mes notes » garde sa largeur ; la pastille des badges
   * montre moins de badges (les derniers d'abord, au moins un), puis perd son libellé s'il le faut (le lien garde son
   * aria-label). Recalculé quand la largeur change. */
  function pastilleBadges() {
    var p = document.querySelector('.nova-mes-notes a.nova-pastille-badge');
    if (!p) return;
    var imgs = [].slice.call(p.querySelectorAll('img')), libelle = p.querySelector('span');
    var ajuster = function () {
      imgs.forEach(function (i) { i.hidden = false; });
      if (libelle) libelle.hidden = false;
      for (var n = imgs.length - 1; n > 0 && p.scrollWidth > p.clientWidth + 1; n--) imgs[n].hidden = true;
      if (libelle && p.scrollWidth > p.clientWidth + 1) libelle.hidden = true;
    };
    ajuster();
    window.addEventListener('resize', ajuster);
    window.addEventListener('load', ajuster);
  }

  /* ===== js/src/61-couleur.js : couleur personnelle (« Ma couleur ») ===== */
  // Fenêtre « Mes badges » : un onglet par badge proposé (Régularité, Persévérance, Échauffement ; maquette du 2026-10-09). Chaque
  // panneau : image et niveau, règle, chiffres, ce qui reste, les 8 niveaux. Données de user.phtml (#nova-badges).
  /* Couleur personnelle d'un élève (demande de l'utilisateur, 2026-11-07) : palette lisible (texte blanc, contraste ≥ 3,5:1),
   * débloquée par le niveau d'un badge choisi par l'enseignant (--nova-couleur-badge, --nova-couleur-niveau), puis 8 dégradés
   * pré-établis à un niveau plus élevé du même badge (--nova-couleur-degrade ; maquette v2 validée le 2026-11-07). Choix gardé
   * pour toute la structure sur le serveur (score/<login>.nova_couleur, header.phtml) et, pour l'appliquer avant l'affichage de
   * chaque page (htmlheader.phtml), dans localStorage sous nova-couleur|<structure ou classe>|<login> : « #accent » ou
   * « #accent #seconde » (dégradé : html.nova-degrade et --nova-degrade, _css/couleur.css). Le choix se fait dans la fenêtre
   * « Ma couleur », ouverte par le menu Profil (sur l'accueil seulement : l'envoi au serveur passe par l'accueil). */
  // Palette (2026-11-07, utilisateur : 10 couleurs, du spectre entier, claires et foncées, texte blanc lisible ≥ 3,5:1).
  var PALETTE = [['corail', '#E0442E'], ['orange', '#D35400'], ['ambre', '#B87400'], ['vert', '#1E9447'], ['sapin', '#2E6B3A'],
    ['turquoise', '#008C95'], ['azur', '#0A7BD6'], ['nuit', '#1F3A6E'], ['violet', '#7B1FE0'], ['rose', '#D1106B']];
  // Dégradés : deux couleurs de la palette, texte blanc ≥ 3,8:1 sur toute la longueur (calculé le 2026-11-07).
  var DEGRADES = [['crepuscule', 'corail', 'violet'], ['braise', 'orange', 'rose'], ['framboise', 'rose', 'violet'], ['soleil', 'ambre', 'corail'],
    ['ocean', 'azur', 'turquoise'], ['aurore', 'turquoise', 'violet'], ['foret', 'sapin', 'turquoise'], ['etoilee', 'nuit', 'violet']];
  function hexPalette(nom) { var c = PALETTE.filter(function (p) { return p[0] === nom; })[0]; return c ? c[1] : ''; }
  function couleursDe(nom) {   // [accent, seconde] ; [] = couleur de la classe
    var g = DEGRADES.filter(function (x) { return x[0] === nom; })[0];
    if (g) return [hexPalette(g[1]), hexPalette(g[2])];
    var c = hexPalette(nom);
    return c ? [c] : [];
  }
  function cleCouleur() {
    var meta = function (n) { var m = document.querySelector('meta[name="' + n + '"]'); return m ? m.content : ''; };
    var racine = meta('nova-structure') || meta('nova-classe').split('/')[0], u = meta('nova-utilisateur');
    return racine && u ? 'nova-couleur|' + racine + '|' + u : '';
  }
  function poserCouleur(nom) {
    var c = couleursDe(nom), cle = cleCouleur(), r = document.documentElement;
    if (c[0]) r.style.setProperty('--nova-accent', c[0]); else r.style.removeProperty('--nova-accent');
    if (c[1]) { r.style.setProperty('--nova-degrade', 'linear-gradient(90deg, ' + c[0] + ', ' + c[1] + ')'); r.classList.add('nova-degrade'); }
    else { r.style.removeProperty('--nova-degrade'); r.classList.remove('nova-degrade'); }
    try { if (cle) { if (c[0]) localStorage.setItem(cle, c.join(' ')); else localStorage.removeItem(cle); } } catch (e) { /* sans stockage : cette page seulement */ }
  }
  // Droits de l'élève d'après l'accueil (#nova-badges) : 0 rien, 1 couleur, 2 dégradés ; null = récompense non proposée.
  function droitsCouleur(d) {
    if (!d) return null;
    var reg = (d.getAttribute('data-reglages') || '').split(/\s+/), badge = reg[9] || 'aucun';
    if (badge === 'aucun') return null;
    var ligne = (d.getAttribute('data-' + badge) || '').split(/\s+/);
    if (ligne[1] !== 'on') return null;
    var niveau = +ligne[2] || 0, requis = +reg[10] || 2, requisDeg = +reg[11] || requis + 2;
    var court = { fidelite: 'fid', perseverance: 'per', echauffement: 'ech', top: 'top' };
    // Dégradés : badge à part (12e champ, 2026-11-08 ; absent = celui de la couleur, aucun = pas de dégradés). Ils ne
    // s'ouvrent qu'une fois la couleur débloquée.
    var badgeDeg = reg[12] || badge;
    if (badgeDeg === badge) requisDeg = Math.max(requis, requisDeg);
    var ligneDeg = badgeDeg === badge ? ligne : (d.getAttribute('data-' + badgeDeg) || '').split(/\s+/);
    var niveauDeg = badgeDeg !== 'aucun' && ligneDeg[1] === 'on' ? +ligneDeg[2] || 0 : -1;
    var degOk = niveauDeg >= 0 && niveauDeg >= requisDeg;
    return { badge: badge, nomBadge: d.getAttribute('data-' + court[badge] + '-nom') || badge, niveau: niveau, requis: requis, requisDeg: requisDeg,
      badgeDeg: niveauDeg >= 0 ? badgeDeg : 'aucun', nomBadgeDeg: d.getAttribute('data-' + court[badgeDeg] + '-nom') || badgeDeg,
      etat: niveau >= requis ? (degOk ? 2 : 1) : 0 };
  }
  function cleMenuCouleur() { var c = cleCouleur(); return c ? c + '|menu' : ''; }
  function lireMenuCouleur() { try { var c = cleMenuCouleur(); return c ? JSON.parse(localStorage.getItem(c) || 'null') : null; } catch (e) { return null; } }
  function garderMenuCouleur(v) { try { var c = cleMenuCouleur(); if (c) { if (v) localStorage.setItem(c, JSON.stringify(v)); else localStorage.removeItem(c); } } catch (e) { /* rien */ } }
  // Accueil de l'élève (#nova-couleur, user.phtml) : la valeur du serveur fait foi (vide : badges ou réglage coupés).
  // Puis l'entrée « Ma couleur » du menu Profil, sur toutes les pages ordinaires (mémoire de l'accueil).
  function couleurPerso() {
    var source = document.getElementById('nova-couleur'), d = document.getElementById('nova-badges');
    // Badges coupés dans cette zone (data-bdg) : la couleur choisie ailleurs dans la structure reste, l'entrée du menu part.
    var bdg = source && source.getAttribute('data-bdg') === 'on';
    if (bdg) poserCouleur(source.getAttribute('data-couleur') || '');
    if (!document.getElementById('nova-eleve')) return;
    var memo = lireMenuCouleur();
    if (source) {
      var dr = bdg && droitsCouleur(d);
      if (!dr) { memo = null; garderMenuCouleur(null); }
      else {
        memo = { etat: dr.etat, vu: memo && typeof memo.vu === 'number' ? memo.vu : 0,
          titre: d.getAttribute('data-coul-menu') || 'My colour', nouveau: d.getAttribute('data-coul-nouveau') || '' };
        garderMenuCouleur(memo);
      }
    }
    if (!memo) return;
    var barre = document.getElementById('wimstopbox');
    if (barre && !barreOrdinaire(barre)) return;
    var profil = document.querySelector('#wimsmenumodubox .nova-profil');
    if (!profil || profil.querySelector('.profil_couleur')) return;
    var item = document.createElement('div');
    item.className = 'menuitem profil_couleur';
    var a = document.createElement('a');
    a.className = 'tint';   // Font_Awesome : goutte (« .menuitem .tint »), rien avec le jeu « default »
    // Toujours une adresse wims.cgi : « Liens externes masqués aux élèves » (--nova-masques-eleves) cache toute rubrique qui
    // contient un lien hors de wims.cgi ; un simple « #… » y faisait disparaître tout le Profil (vécu, portail, 2026-11-07).
    a.href = lienAccueil('') + '#nova-ma-couleur';
    var span = document.createElement('span');
    span.textContent = memo.titre;
    a.appendChild(span);
    if (memo.etat > memo.vu && memo.nouveau) {
      a.classList.add('nova-couleur-neuf');
      var n = document.createElement('span');
      n.className = 'nova-couleur-nouveau';
      n.textContent = memo.nouveau;
      a.appendChild(n);
    }
    item.appendChild(a);
    var avant = profil.querySelector('.profil_avatar') || profil.querySelector('.nova-profil-nom');
    profil.insertBefore(item, avant ? avant.nextSibling : profil.firstChild);
    if (!d) return;
    var fenetre = null;
    var ouvrir = function () {
      if (!fenetre) fenetre = fenetreCouleur(d);
      if (typeof fenetre.showModal === 'function') { if (!fenetre.open) fenetre.showModal(); } else fenetre.setAttribute('open', '');
      var m = lireMenuCouleur();
      if (m) { m.vu = Math.max(m.vu || 0, m.etat); garderMenuCouleur(m); }
      var neuf = document.querySelector('.profil_couleur .nova-couleur-nouveau');
      if (neuf) { neuf.remove(); a.classList.remove('nova-couleur-neuf'); }
    };
    window.novaOuvrirCouleur = ouvrir;
    document.addEventListener('click', function (e) {
      var l = e.target.closest && e.target.closest('a[href$="#nova-ma-couleur"]');
      if (!l) return;
      e.preventDefault();
      var badgesOuverte = document.querySelector('dialog.nova-badges-fenetre[open]:not(.nova-couleur-fenetre)');
      if (badgesOuverte && badgesOuverte.close) badgesOuverte.close();
      ouvrir();
    });
    if (location.hash === '#nova-ma-couleur') {
      try { history.replaceState(null, '', location.href.split('#')[0]); } catch (e) { /* adresse gardée */ }
      ouvrir();
    }
  }
  // Fenêtre « Ma couleur » (maquette v2 validée le 2026-11-07) : couleurs unies, couleur de la classe, dégradés.
  function fenetreCouleur(d) {
    var a = function (n) { return d.getAttribute('data-' + n) || ''; };
    var el = function (balise, classe, texte) {
      var e = document.createElement(balise);
      if (classe) e.className = classe;
      if (texte != null) e.textContent = texte;
      return e;
    };
    var dr = droitsCouleur(d) || { etat: 0, requis: 2, requisDeg: 4, nomBadge: '' };
    var niveaux = a('niveaux').split(',');
    var nomNiv = function (n) { return niveaux[n - 1] || String(n); };
    var f = el('dialog', 'nova-badges-fenetre nova-couleur-fenetre');
    f.setAttribute('aria-labelledby', 'nova-couleur-titre');
    var tete = el('div', 'nova-badges-entete');
    var h = el('h2', '', a('coul-menu'));
    h.id = 'nova-couleur-titre';
    var fermer = el('button', 'nova-badges-fermer', '\u00d7');
    fermer.type = 'button';
    fermer.setAttribute('aria-label', a('fermer'));
    fermer.addEventListener('click', function () { f.close ? f.close() : f.removeAttribute('open'); });
    tete.appendChild(h); tete.appendChild(fermer);
    f.appendChild(tete);
    f.addEventListener('click', function (e) { if (e.target === f && f.close) f.close(); });
    var corps = el('div', 'nova-couleur-corps');
    f.appendChild(corps);
    var verrou = function (texte, n, nomBadge) {
      var v = el('p', 'nova-couleur-verrou', texte.replace('%s', nomNiv(n)).replace('%b', nomBadge || dr.nomBadge));
      return v;
    };
    var actuelle = (document.getElementById('nova-couleur') || d).getAttribute('data-couleur') || '';
    var etat = el('p', 'nova-couleur-etat');
    etat.setAttribute('aria-live', 'polite');
    var boutons = [];
    var nomsU = a('coul-noms').split(','), nomsD = a('coul-degrades-noms').split(',');
    var nomDe = function (nom) {
      var i = PALETTE.findIndex(function (p) { return p[0] === nom; });
      if (i >= 0) return nomsU[i] || nom;
      i = DEGRADES.findIndex(function (p) { return p[0] === nom; });
      return i >= 0 ? nomsD[i] || nom : '';
    };
    var choisir = function (nom, envoyer) {
      actuelle = nom;
      boutons.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-couleur') === nom ? 'true' : 'false'); });
      var n = nomDe(nom);
      etat.textContent = n ? a('coul-choisie').replace('%s', n) : '';
      poserCouleur(nom);
      var source = document.getElementById('nova-couleur');
      if (source) source.setAttribute('data-couleur', nom === 'classe' ? '' : nom);
      if (envoyer) { var u = lienAccueil('&nova_couleur=' + nom); if (u) fetch(u, { credentials: 'same-origin' }).catch(function () {}); }
    };
    // Couleur unie
    var b1 = el('section', 'nova-couleur-bloc');
    b1.appendChild(el('h3', '', a('coul-unie')));
    if (dr.etat < 1) b1.appendChild(verrou(a('coul-verrou'), dr.requis));
    else {
      b1.appendChild(el('p', 'nova-couleur-aide', a('coul-aide')));
      var liste = el('div', 'nova-couleur-liste');
      PALETTE.forEach(function (p, i) {
        var b = el('button', 'nova-couleur-pastille');
        b.type = 'button';
        b.style.background = p[1];
        b.setAttribute('data-couleur', p[0]);
        b.setAttribute('aria-label', nomsU[i] || p[0]);
        b.title = nomsU[i] || p[0];
        b.addEventListener('click', function () { choisir(p[0], true); });
        boutons.push(b);
        liste.appendChild(b);
      });
      b1.appendChild(liste);
      var classe = el('button', 'nova-couleur-classe', a('coul-classe'));
      classe.type = 'button';
      classe.addEventListener('click', function () { choisir('classe', true); });
      b1.appendChild(classe);
    }
    corps.appendChild(b1);
    // Dégradés
    var b2 = el('section', 'nova-couleur-bloc');
    b2.appendChild(el('h3', '', a('coul-degrades')));
    b2.appendChild(el('p', 'nova-couleur-aide', a('coul-degrades-aide')));
    if (dr.etat < 2) b2.appendChild(dr.badgeDeg && dr.badgeDeg !== dr.badge ? verrou(a('coul-verrou-degrade2') || a('coul-verrou-degrade'), dr.requisDeg, dr.nomBadgeDeg) : verrou(a('coul-verrou-degrade'), dr.requisDeg));
    else {
      var grille = el('div', 'nova-couleur-degrades');
      DEGRADES.forEach(function (g, i) {
        var b = el('button', 'nova-couleur-degrade', nomsD[i] || g[0]);
        b.type = 'button';
        b.style.background = 'linear-gradient(90deg, ' + hexPalette(g[1]) + ', ' + hexPalette(g[2]) + ')';
        b.setAttribute('data-couleur', g[0]);
        b.addEventListener('click', function () { choisir(g[0], true); });
        boutons.push(b);
        grille.appendChild(b);
      });
      b2.appendChild(grille);
    }
    corps.appendChild(b2);
    corps.appendChild(etat);
    choisir(actuelle, false);
    etat.textContent = '';
    document.body.appendChild(f);
    return f;
  }
  // Fenêtre des badges, onglet du badge qui débloque la couleur : rappel de la récompense et lien vers « Ma couleur ».
  // cle : badge de l'onglet ; la carte n'y montre que ses paliers (couleur, dégradés : badges à part depuis le 2026-11-08).
  function carteCouleur(d, cle) {
    var a = function (n) { return d.getAttribute('data-' + n) || ''; };
    var dr = droitsCouleur(d);
    var niveaux = a('niveaux').split(',');
    var nomNiv = function (n) { return niveaux[n - 1] || String(n); };
    var carte = document.createElement('div');
    carte.className = 'nova-couleur-carte' + (dr && dr.etat ? '' : ' nova-couleur-verrou');
    var h = document.createElement('p');
    h.className = 'nova-couleur-titre';
    h.textContent = a('coul-titre');
    carte.appendChild(h);
    if (!dr) return carte;
    var paliers = [];
    if (!cle || cle === dr.badge) paliers.push([a('coul-recompense'), dr.requis, dr.etat >= 1]);
    if (dr.badgeDeg !== 'aucun' && (!cle || cle === dr.badgeDeg)) paliers.push([dr.badgeDeg === dr.badge ? a('coul-recompense-deg') : (a('coul-recompense-deg2') || a('coul-recompense-deg')), dr.requisDeg, dr.etat >= 2]);
    paliers.forEach(function (x) {
      var p = document.createElement('p');
      p.className = 'nova-couleur-aide' + (x[2] ? ' nova-couleur-acquis' : '');
      p.textContent = x[0].replace('%s', nomNiv(x[1]));
      carte.appendChild(p);
    });
    if (dr.etat >= 1) {
      var l = document.createElement('a');
      l.className = 'nova-couleur-choisir';
      l.href = '#nova-ma-couleur';
      l.textContent = a('coul-choisir');
      carte.appendChild(l);
    }
    return carte;
  }

  /* ===== js/src/62-avatar.js : avatar et pièces ===== */
  /* Avatar de l'élève (demande de l'utilisateur, maquette validée le 2026-11-07) : Avataaars de DiceBear (js/avatar.js,
   * chargé seulement quand il faut dessiner). Jetons gagnés en réussissant des exercices, éléments ouverts avec eux ou
   * par les badges : tout est calculé et vérifié sur le serveur (_procs/avatar.awk, _widgets/avatar.phtml) ; ici,
   * seulement l'affichage. Le choix enregistré et son dessin sont gardés dans localStorage
   * (nova-avatar|<structure ou classe>|<login>) pour la barre et le menu Profil de toutes les pages ; l'accueil
   * (#nova-avatar-barre, user.phtml) dit ce qui vaut. Seuls l'élève et ses enseignants voient l'avatar. */
  // Dossiers d'images des badges (img/badges/<dossier>_0<niveau>.webp, niveaux 1 à 8) : Mon avatar et trombinoscope.
  var IMAGES_BADGES = { fidelite: 'regularite/coeur', perseverance: 'perseverance/flamme', echauffement: 'entrainement/halteres', top: 'etoile/etoile' };
  var AVATAR_CATEGORIES = ['top', 'hatColor', 'noel', 'hairColor', 'skinColor', 'eyes', 'eyebrows', 'mouth', 'accessories', 'accessoriesColor', 'facialHair',
    'clothing', 'clothingGraphic', 'clothesColor', 'backgroundColor'];
  function cleAvatar() {
    var cle = cleCouleur();
    return cle ? cle.replace(/^nova-couleur\|/, 'nova-avatar|') : '';
  }
  function lireAvatar() {
    try { return JSON.parse(localStorage.getItem(cleAvatar()) || 'null'); } catch (e) { return null; }
  }
  function garderAvatar(v) {
    try { var cle = cleAvatar(); if (!cle) return; if (v) localStorage.setItem(cle, JSON.stringify(v)); else localStorage.removeItem(cle); } catch (e) { /* sans stockage : rien */ }
  }
  // Fonds en dégradé du catalogue (récompenses de badges ; maquette v3 validée le 2026-11-07).
  // Coiffures qui sont des chapeaux : seules à montrer l'onglet « Chapeau (couleur) » (hatColor).
  var AVATAR_CHAPEAUX = ['hat', 'winterHat1', 'winterHat02', 'winterHat03', 'winterHat04'];
  // Éléments dessinés pour Nova, hors DiceBear (2026-11-11, utilisateur : catégorie « Noël ») : js/avatar-extras.js,
  // construit par construire-avatar.py depuis _avatar/<catégorie>/<valeur>.svg, posé PAR-DESSUS le dessin d'Avataaars.
  // Un élément de Noël porté remplace le chapeau d'Avataaars (pas deux couvre-chefs) ; les cheveux restent.
  var AVATAR_EXTRAS = ['noel'];
  var AVATAR_EXTRAS_V = '0aa6062923';
  function porteNoel(c) { return !!c.noel && c.noel !== 'aucun'; }
  function porteChapeau(c) { return AVATAR_CHAPEAUX.indexOf(c.top) >= 0 && !porteNoel(c); }
  function porteLunettes(c) { return !!c.accessories && c.accessories !== 'aucun' && c.accessories !== 'eyepatch'; }
  function porteBarbe(c) { return !!c.facialHair && c.facialHair !== 'aucun'; }
  // Onglets de couleur montrés seulement quand ils changent quelque chose (2026-11-07, utilisateur) : chapeau porté,
  // lunettes portées ; cheveux cachés par un chapeau, sauf barbe (elle prend la couleur des cheveux).
  function ongletUtile(k, c) {
    if (k === 'hatColor') return porteChapeau(c);
    if (k === 'accessoriesColor') return porteLunettes(c);
    if (k === 'hairColor') return !porteChapeau(c) || porteBarbe(c);
    return true;
  }
  var AVATAR_DEGRADES = { coucher: ['ff6b6b', 'ffd60a'], ocean: ['00b4d8', '3a86ff'], aurore: ['06d6a0', '8338ec'],
    bonbon: ['ff006e', 'ffafcc'], lagon: ['9ef01a', '00b4d8'], galaxie: ['1d3557', '8338ec'] };
  // Choix « top.bob,eyes.happy,… » -> options de DiceBear.
  function optionsAvatar(choix) {
    var c = {};
    (choix || '').split(',').forEach(function (e) { var i = e.indexOf('.'); if (i > 0) c[e.slice(0, i)] = e.slice(i + 1); });
    var o = { seed: 'nova', nose: ['default'], topProbability: (porteNoel(c) && AVATAR_CHAPEAUX.indexOf(c.top) >= 0) ? 0 : 100 };
    ['top', 'hairColor', 'skinColor', 'eyes', 'eyebrows', 'mouth', 'clothing', 'clothesColor', 'clothingGraphic', 'backgroundColor'].forEach(function (k) {
      if (c[k]) o[k] = [c[k]];
    });
    // Couleur du chapeau (2026-11-07) : la sienne, sinon celle du vêtement (avatars enregistrés avant).
    if (c.hatColor || c.clothesColor) o.hatColor = [c.hatColor || c.clothesColor];
    if (AVATAR_DEGRADES[c.backgroundColor]) { o.backgroundColor = AVATAR_DEGRADES[c.backgroundColor]; o.backgroundType = ['gradientLinear']; o.backgroundRotation = [135]; }
    if (c.accessoriesColor) o.accessoriesColor = [c.accessoriesColor];
    if (!c.accessories || c.accessories === 'aucun') o.accessoriesProbability = 0; else { o.accessories = [c.accessories]; o.accessoriesProbability = 100; }
    if (!c.facialHair || c.facialHair === 'aucun') o.facialHairProbability = 0;
    else { o.facialHair = [c.facialHair]; o.facialHairProbability = 100; if (c.hairColor) o.facialHairColor = [c.hairColor]; }
    return o;
  }
  // Dessin complet d'un choix : Avataaars, puis les éléments de Nova dans le groupe masqué de la page (même repère).
  function dessinerAvatar(f, choix) {
    var uri = f(optionsAvatar(choix));
    var dessins = window.novaAvatarExtras || {}, ajout = '';
    (choix || '').split(',').forEach(function (e) {
      var i = e.indexOf('.'), k = e.slice(0, i), v = e.slice(i + 1);
      if (i > 0 && AVATAR_EXTRAS.indexOf(k) >= 0 && dessins[k] && dessins[k][v]) ajout += dessins[k][v];
    });
    if (!ajout) return uri;
    var m = uri.match(/^(data:image\/svg\+xml;utf8,)(.*)$/);
    if (!m) return uri;
    var svg = decodeURIComponent(m[2]), fin = svg.lastIndexOf('</g></svg>');
    if (fin < 0) return uri;
    return m[1] + encodeURIComponent(svg.slice(0, fin) + ajout + svg.slice(fin));
  }
  var avatarScript = null;
  function chargerScript(src, pret) {
    return new Promise(function (ok, ko) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { if (pret()) ok(); else ko(new Error('avatar')); };
      s.onerror = function () { ko(new Error('avatar')); };
      document.head.appendChild(s);
    });
  }
  // Résout avec une fonction choix -> adresse du dessin. Sans avatar-extras.js : Avataaars seul (rien de cassé).
  function chargerAvatar(src) {
    if (!avatarScript) avatarScript = Promise.all([
      window.novaAvatar ? Promise.resolve() : chargerScript(src, function () { return !!window.novaAvatar; }),
      window.novaAvatarExtras ? Promise.resolve() : chargerScript(src.replace(/avatar\.js(\?.*)?$/, 'avatar-extras.js?v=' + AVATAR_EXTRAS_V),
        function () { return true; }).catch(function () {})
    ]).then(function () { return function (choix) { return dessinerAvatar(window.novaAvatar, choix); }; },
      function (e) { avatarScript = null; throw e; });
    return avatarScript;
  }
  function lienMonAvatar() { return lienAccueil('&nova_avatar=1'); }
  // Suivi en salle (js/suivi.js) : dessin d'un avatar d'élève d'après son choix enregistré.
  window.novaAvatarDessin = function (choix, src) { return chargerAvatar(src).then(function (f) { return f(choix); }); };
  // Avatar de la barre : fenêtres ordinaires seulement (demande de l'utilisateur, 2026-11-07 : la place manque à côté
  // de « Terminer » et du chronomètre). Pas en examen (session _exam, chronomètre, Terminer, pastille « Examen en
  // cours »), ni dans une fenêtre d'aide, d'outil ou allégée.
  function barreOrdinaire(barre) {
    var session = (location.search.match(/[?&]session=([^&]*)/) || [])[1] || '';
    if (/_(exam|tool|help|mhelp|light)/.test(session)) return false;
    if (document.getElementById('wimsexam') || document.getElementById('wimsmhelp') || document.getElementById('wimslightpopup')) return false;
    if (document.body.classList.contains('nova-examen') || document.body.classList.contains('nova-examen-session')) return false;
    return !barre.querySelector('.menuitem.chrono, #chrono_exam, a.endexam, .nova-terminer, .nova-examencours');
  }
  // Pièce des jetons : logo de WIMS (img/logo-wims-blanc-v2.svg) cadré sur le centre de son cercle invisible
  // (93,24 ; 153,74), pour qu'il tombe au centre du disque (demande de l'utilisateur, 2026-11-07, maquette A : pièce dorée).
  var PIECE_SVG = '<svg viewBox="33.24 93.74 120 120" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" d="m 68.398532,197.05166 c 15.058946,8.57956 34.389228,-15.02121 34.822798,-43.94077 0.41266,-27.52561 -17.133498,-51.43258 -34.718402,-42.12108 -17.584914,9.31149 -4.468906,36.96212 20.148988,52.58723 23.724794,15.05825 52.099204,11.57787 53.173974,-7.95129 1.07477,-19.52916 -30.77363,-24.11146 -55.82547,-9.84162 -25.624939,14.59628 -32.660849,42.68797 -17.601888,51.26753 z"/></svg>';
  function pieceJeton() {
    var p = document.createElement('span');
    p.className = 'nova-piece';
    p.setAttribute('aria-hidden', 'true');
    p.innerHTML = PIECE_SVG;
    return p;
  }
  // Singulier pour 1, et pour 0 en français (« 0 pièce »).
  function singulier(n) { return n === 1 || (n === 0 && /^fr/.test(document.documentElement.lang || 'fr')); }
  function texteJetons(memo, n) { return ((singulier(n) ? memo.tJeton : memo.tJetons) || '%n').replace('%n', n); }
  // Barre : compteur de jetons puis avatar, à droite. Gain depuis le dernier affichage (memo.vu) : animation A de la
  // maquette (la pièce tourne, « +1 » monte), jouée même si les animations de Nova sont coupées (récompense ponctuelle,
  // utilisateur), jamais si l'appareil demande de réduire les animations (CSS).
  function poserAvatarBarre(memo, gain) {
    var barre = document.getElementById('wimstopbox');
    var ancien = document.querySelector('.nova-avatar-zone');
    if (!barre || !memo || !memo.actif || !barreOrdinaire(barre) || (!memo.uri && typeof memo.jetons !== 'number')) { if (ancien) ancien.remove(); return; }
    var zone = ancien || document.createElement('span');
    zone.className = 'nova-avatar-zone';
    zone.textContent = '';
    if (typeof memo.jetons === 'number') {
      var c = document.createElement('a');
      c.className = 'nova-jetons-barre';
      c.href = lienMonAvatar();
      c.setAttribute('aria-label', texteJetons(memo, memo.jetons) + ' \u2013 ' + (memo.titre || ''));
      c.title = texteJetons(memo, memo.jetons);
      c.appendChild(pieceJeton());
      var nb = document.createElement('span');
      nb.className = 'nova-jetons-nb';
      nb.textContent = gain ? memo.jetons - gain : memo.jetons;
      c.appendChild(nb);
      if (gain) {
        var plus = document.createElement('span');
        plus.className = 'nova-jetons-plus';
        plus.setAttribute('aria-hidden', 'true');
        plus.textContent = '+' + gain;
        c.appendChild(plus);
        c.classList.add('nova-jetons-gain');
        setTimeout(function () { nb.textContent = memo.jetons; }, 550);
        setTimeout(function () { c.classList.remove('nova-jetons-gain'); if (plus.parentNode) plus.remove(); }, 1600);
      }
      zone.appendChild(c);
    }
    if (memo.uri) {
      var a = document.createElement('a');
      a.className = 'nova-avatar-barre';
      a.href = lienMonAvatar();
      a.title = memo.titre || '';
      a.setAttribute('aria-label', memo.titre || '');
      var img = document.createElement('img');
      img.src = memo.uri;
      img.alt = '';
      a.appendChild(img);
      zone.appendChild(a);
    }
    if (!ancien) barre.appendChild(zone);
  }
  function avatarBarre() {
    if (!document.getElementById('nova-eleve') || !cleAvatar()) return;
    var source = document.getElementById('nova-avatar-barre');
    var memo = lireAvatar();
    var gain = 0;
    if (source) {
      var actif = source.getAttribute('data-actif') === 'oui';
      var choix = source.getAttribute('data-choix') || '';
      if (!actif) { memo = null; garderAvatar(null); }
      else {
        var j = source.getAttribute('data-jetons');
        var ancien = memo || {};
        memo = { actif: 1, choix: choix, titre: source.getAttribute('data-titre') || '', uri: ancien.choix === choix ? ancien.uri : '',
          tJeton: source.getAttribute('data-t-jeton') || '', tJetons: source.getAttribute('data-t-jetons') || '',
          jetons: /^[0-9]+$/.test(j || '') ? +j : ancien.jetons, vu: ancien.vu };
        if (typeof memo.jetons === 'number') {
          if (typeof memo.vu === 'number' && memo.jetons > memo.vu) gain = memo.jetons - memo.vu;
          memo.vu = memo.jetons;
        }
        garderAvatar(memo);
        if (choix && !memo.uri) chargerAvatar(source.getAttribute('data-script')).then(function (dessin) {
          memo.uri = dessin(choix);
          garderAvatar(memo);
          poserAvatarBarre(memo);
        }).catch(function () {});
      }
    }
    if (!memo || !memo.actif) return;
    poserAvatarBarre(memo, gain);
    // Menu Profil : « Mon avatar » après le nom.
    var profil = document.querySelector('#wimsmenumodubox .nova-profil');
    if (profil && !profil.querySelector('.profil_avatar')) {
      var d = document.createElement('div');
      d.className = 'menuitem profil_avatar';
      var a = document.createElement('a');
      a.href = lienMonAvatar();
      a.className = 'account';   // Font_Awesome : silhouette (\f007, « .menuitem .account ») ; « user » perdait contre le tiret générique
      var span = document.createElement('span');
      span.textContent = memo.titre;
      a.appendChild(span);
      d.appendChild(a);
      var nom = profil.querySelector('.nova-profil-nom');
      profil.insertBefore(d, nom ? nom.nextSibling : profil.firstChild);
    }
  }

  function avatarPage() {
    var d = document.getElementById('nova-avatar');
    if (!d) return;
    var t = function (n) { return d.getAttribute('data-t-' + n) || ''; };
    var el = function (balise, classe, texte) {
      var e = document.createElement(balise);
      if (classe) e.className = classe;
      if (texte != null) e.textContent = texte;
      return e;
    };
    var etat = {};
    var lire = function (source) {
      var j = (source.getAttribute('data-jetons') || '').split(' ');
      etat.jetons = { dispo: +j[3] || 0, total: +j[4] || 0, jour: +j[5] || 0, max: +j[6] || 10, reste: +j[7] || 1, pc: +j[8] || 0 };
      etat.message = (source.getAttribute('data-message') || '').split(' ')[1] || '-';
      var c = (source.getAttribute('data-choix') || '').split(' ')[1] || '-';
      etat.enregistre = c === '-' ? '' : c;
      etat.elements = {};
      etat.ordre = {};
      (source.getAttribute('data-elements') || '').split(' ').slice(1).forEach(function (x) {
        var p = x.split(':');
        if (p.length !== 3) return;
        (etat.ordre[p[0]] = etat.ordre[p[0]] || []).push(p[1]);
        etat.elements[p[0] + '.' + p[1]] = p[2];
      });
    };
    lire(d);
    var regles = (d.getAttribute('data-regles') || '7 15 10').split(' ');
    var ouvert = function (e) { var s = etat.elements[e] || ''; return s === 'libre' || s === 'achete' || /-1$/.test(s); };
    // Choix courant : l'enregistré, sinon un tirage fixe parmi les éléments libres (d'après le login : chacun le sien).
    var choix = {};
    var graine = 0;
    (d.getAttribute('data-utilisateur') || '').split('').forEach(function (ch) { graine = (graine * 31 + ch.charCodeAt(0)) % 100003; });
    AVATAR_CATEGORIES.forEach(function (k, i) {
      var libres = (etat.ordre[k] || []).filter(function (v) { return etat.elements[k + '.' + v] === 'libre'; });
      if (k === 'accessories' || k === 'facialHair' || k === 'noel') libres = ['aucun'];
      if (k === 'hatColor') return;   // sans choix : couleur du vêtement
      // Peau : tirage parmi les teintes naturelles (le jaune et l'orange restent au choix de l'élève).
      if (k === 'skinColor') libres = libres.filter(function (v) { return v !== 'f8d25c' && v !== 'fd9841'; });
      if (libres.length) choix[k] = libres[(graine + i * 7) % libres.length];
    });
    etat.enregistre.split(',').forEach(function (e) { var i = e.indexOf('.'); if (i > 0) choix[e.slice(0, i)] = e.slice(i + 1); });
    if (!choix.clothingGraphic) choix.clothingGraphic = (etat.ordre.clothingGraphic || ['pizza'])[0];
    if (!choix.hatColor && choix.clothesColor && ouvert('hatColor.' + choix.clothesColor)) choix.hatColor = choix.clothesColor;
    var chaine = function (c) {
      return AVATAR_CATEGORIES.filter(function (k) { return c[k] && ouvert(k + '.' + c[k]); }).map(function (k) { return k + '.' + c[k]; }).join(',');
    };
    var badgesAvatar = {};
    (d.getAttribute('data-niveaux') || '').split(' ').slice(1).forEach(function (x) { var p = x.split(':'); badgesAvatar[p[0]] = [+p[1] || 0, p[2] === '1']; });
    var noms = t('categories').split(',');
    var niveaux = t('niveaux').split(',');
    var nomNiv = function (n) { return n > 0 ? (niveaux[n - 1] || String(n)) : '0'; };
    // Élément de badge débloqué : image du badge au niveau qui l'a ouvert (dossiers d'images des badges, voir CLAUDE.md)
    // et phrase « Débloqué grâce à ton badge … » (demande de l'utilisateur, 2026-11-07).
    var baseTheme = (d.getAttribute('data-script') || '').replace(/js\/avatar\.js$/, '');
    var badgeObtenu = function (s) { return /^badge-[a-z]+-[0-9]+-1$/.test(s); };
    var texteBadge = function (s) { var p = s.split('-'); return t('badge-ok').replace('%b', t(p[1])).replace('%n', nomNiv(+p[2])); };
    var imageBadge = function (s) {
      var p = s.split('-'), dossier = IMAGES_BADGES[p[1]], n = Math.max(1, Math.min(8, +p[2] || 1));
      return dossier ? baseTheme + 'img/badges/' + dossier + '_0' + n + '.webp' : '';
    };

    // Squelette.
    var page = el('div', 'nova-avatar-editeur');
    var cote = el('div', 'nova-avatar-apercu');
    var portrait = el('div', 'nova-avatar-portrait');
    var grand = el('img');
    grand.alt = '';
    portrait.appendChild(grand);
    // Aperçu d'un élément pas encore débloqué sur le grand portrait (maquette validée le 2026-11-07, utilisateur).
    var cadre = el('div', 'nova-avatar-cadre');
    cadre.appendChild(portrait);
    cadre.appendChild(el('span', 'nova-avatar-pastille', t('apercu')));
    cote.appendChild(cadre);
    var ligneJetons = el('p', 'nova-avatar-jetons');
    var jeton = pieceJeton();
    var nbJetons = el('span', 'nova-avatar-nb');
    ligneJetons.appendChild(jeton);
    ligneJetons.appendChild(nbJetons);
    cote.appendChild(ligneJetons);
    var jauge = el('div', 'nova-avatar-jauge');
    jauge.setAttribute('aria-hidden', 'true');
    var barreJauge = el('span');
    jauge.appendChild(barreJauge);
    cote.appendChild(jauge);
    var prochain = el('p', 'nova-avatar-petit nova-avatar-prochain');
    var jour = el('p', 'nova-avatar-petit');
    cote.appendChild(prochain);
    cote.appendChild(jour);
    var actions = el('div', 'nova-avatar-actions');
    var boutonEnr = el('button', 'wims_button nova-avatar-enregistrer', t('enregistrer'));
    boutonEnr.type = 'button';
    var boutonHasard = el('button', 'wims_button wims_secondary_button nova-avatar-hasard', t('hasard'));
    boutonHasard.type = 'button';
    actions.appendChild(boutonEnr);
    actions.appendChild(boutonHasard);
    cote.appendChild(actions);
    var message = el('p', 'nova-avatar-message');
    message.setAttribute('role', 'status');
    cote.appendChild(message);
    page.appendChild(cote);

    var droite = el('div', 'nova-avatar-choix');
    var onglets = el('div', 'nova-avatar-onglets');
    onglets.setAttribute('role', 'tablist');
    // Rangée des catégories défilante : fondu et flèche du côté où il reste des onglets (utilisateur, 2026-11-07).
    // Flèches pour la souris et le doigt seulement (le clavier passe d'un onglet à l'autre).
    var defile = el('div', 'nova-avatar-defile');
    var flecheG = el('button', 'nova-avatar-fleche nova-avatar-fleche-g', '\u2039');
    var flecheD = el('button', 'nova-avatar-fleche nova-avatar-fleche-d', '\u203a');
    [flecheG, flecheD].forEach(function (f, i) {
      f.type = 'button';
      f.tabIndex = -1;
      f.setAttribute('aria-hidden', 'true');
      f.addEventListener('click', function () {
        onglets.scrollBy({ left: (i ? 1 : -1) * Math.max(120, onglets.clientWidth * 0.7), behavior: animationsCoupees() ? 'auto' : 'smooth' });
      });
    });
    defile.appendChild(flecheG);
    defile.appendChild(onglets);
    defile.appendChild(flecheD);
    var bordsOnglets = function () {
      var g = onglets.scrollLeft > 2, dr = onglets.scrollLeft + onglets.clientWidth < onglets.scrollWidth - 2;
      defile.classList.toggle('nova-avatar-a-gauche', g);
      defile.classList.toggle('nova-avatar-a-droite', dr);
    };
    onglets.addEventListener('scroll', bordsOnglets, { passive: true });
    window.addEventListener('resize', bordsOnglets);
    var note = el('p', 'nova-avatar-note');
    var grille = el('div', 'nova-avatar-grille');
    grille.setAttribute('role', 'tabpanel');
    var confirmer = el('div', 'nova-avatar-confirmer');
    confirmer.hidden = true;
    var confImg = el('img');
    confImg.alt = '';
    var confTexte = el('p');
    var confOui = el('button', 'wims_button', t('ouvrir'));
    confOui.type = 'button';
    var confNon = el('button', 'wims_button wims_secondary_button', t('annuler'));
    confNon.type = 'button';
    [confImg, confTexte, confOui, confNon].forEach(function (x) { confirmer.appendChild(x); });
    var legende = el('p', 'nova-avatar-legende');
    [['1', 'nova-avatar-prix', t('leg1')], ['2', 'nova-avatar-prix', t('leg2')], ['\u2605', 'nova-avatar-prix nova-avatar-etoile', t('leg3')]].forEach(function (l) {
      var s = el('span');
      s.appendChild(el('span', l[1], l[0]));
      s.appendChild(document.createTextNode(' ' + l[2]));
      legende.appendChild(s);
    });
    [defile, note, grille, confirmer, legende].forEach(function (x) { droite.appendChild(x); });
    page.appendChild(droite);

    var aide = el('div', 'nova-avatar-regles');
    aide.appendChild(el('h2', '', t('regles')));
    var ul = el('ul');
    // regle3 (délai) retirée de l'affichage le 2026-11-07 (utilisateur) ; le délai compte toujours.
    [t('regle1').replace('%n', regles[0]), t('regle2'), t('regle4').replace('%n', regles[2]), t('regle5')].forEach(function (x) { ul.appendChild(el('li', '', x)); });
    aide.appendChild(ul);
    d.appendChild(page);
    d.appendChild(aide);

    var catActive = 0, enAttente = null, occupe = false, dessin = null;
    var rendu = function (c) { return dessin ? dessin((AVATAR_CATEGORIES.map(function (k) { return c[k] ? k + '.' + c[k] : ''; }).filter(Boolean).join(','))) : ''; };
    var dire = function (texte) { message.textContent = texte || ''; };
    // Éléments proposés : tous, sauf ceux d'un badge qui n'est pas activé dans la classe (utilisateur, 2026-11-07).
    var proposes = function (k) {
      return (etat.ordre[k] || []).filter(function (v) {
        var p = (etat.elements[k + '.' + v] || '').split('-');
        return p[0] !== 'badge' || (badgesAvatar[p[1]] || [0, false])[1];
      });
    };
    var nbOuverts = function (k) { return proposes(k).filter(function (v) { return ouvert(k + '.' + v); }).length; };
    var dessiner = function () {
      var j = etat.jetons;
      nbJetons.textContent = (singulier(j.dispo) ? t('jeton') : t('jetons')).replace('%n', j.dispo);
      barreJauge.style.width = Math.max(0, Math.min(100, j.pc)) + '%';
      prochain.textContent = j.reste === 1 ? t('prochain1') : t('prochain').replace('%n', j.reste);
      jour.textContent = t('jour').replace('%n', j.jour).replace('%m', j.max);
      if (!dessin) return;
      // Aperçu : le choix courant avec l'élément en attente ; « Enregistrer » désactivé tant qu'il est affiché.
      var vu = Object.assign({}, choix);
      if (enAttente) {
        vu[enAttente.k] = enAttente.v;
        if (enAttente.k === 'clothingGraphic') vu.clothing = 'graphicShirt';
        if (enAttente.k === 'accessoriesColor' && (!vu.accessories || vu.accessories === 'aucun' || vu.accessories === 'eyepatch')) vu.accessories = 'prescription02';
      }
      grand.src = rendu(vu);
      cadre.classList.toggle('nova-avatar-essai', !!enAttente);
      // Fond transparent : damier blanc et gris sous l'aperçu (convention, utilisateur, 2026-11-12).
      portrait.classList.toggle('nova-avatar-transparent', vu.backgroundColor === 'transparent');
      boutonEnr.disabled = !!enAttente || occupe;
      boutonEnr.title = enAttente ? t('enr-bloque') : '';
      onglets.textContent = '';
      if (!ongletUtile(AVATAR_CATEGORIES[catActive], choix)) catActive = 0;
      AVATAR_CATEGORIES.forEach(function (k, i) {
        if (!etat.ordre[k]) return;
        if (!ongletUtile(k, choix)) return;   // d'après ce qui est porté (pas seulement essayé)
        var b = el('button', 'nova-avatar-onglet');
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', i === catActive ? 'true' : 'false');
        b.appendChild(document.createTextNode(noms[i] || k));
        b.appendChild(el('span', 'nova-avatar-compte', nbOuverts(k) + '/' + proposes(k).length));
        b.addEventListener('click', function () { catActive = i; enAttente = null; dessiner(); });
        onglets.appendChild(b);
      });
      var k = AVATAR_CATEGORIES[catActive];
      var valeurs = proposes(k);
      note.textContent = k === 'clothingGraphic' ? t('motif') : t('ouverts').replace('%n', nbOuverts(k)).replace('%m', valeurs.length);
      if (k === 'accessoriesColor' && (!choix.accessories || choix.accessories === 'aucun' || choix.accessories === 'eyepatch')) note.textContent += ' ' + t('lunettes');
      grille.textContent = '';
      valeurs.forEach(function (v) {
        var e = k + '.' + v, s = etat.elements[e] || '';
        var essai = Object.assign({}, choix);
        essai[k] = v;
        if (k === 'clothingGraphic') essai.clothing = 'graphicShirt';
        // Couleur des lunettes : aperçu sur des lunettes, même si l'élève n'en porte pas.
        if (k === 'accessoriesColor' && (!choix.accessories || choix.accessories === 'aucun' || choix.accessories === 'eyepatch')) essai.accessories = 'prescription02';
        var porte = choix[k] === v && (k !== 'clothingGraphic' || choix.clothing === 'graphicShirt');
        var essaye = enAttente && enAttente.k === k && enAttente.v === v;
        var b = el('button', 'nova-avatar-tuile' + (ouvert(e) ? '' : ' nova-avatar-ferme') + (porte ? ' nova-avatar-porte' : '') + (essaye ? ' nova-avatar-essaye' : '') + (v === 'transparent' ? ' nova-avatar-transparent' : ''));
        b.type = 'button';
        b.setAttribute('aria-pressed', porte ? 'true' : 'false');
        var nomV = v === 'aucun' ? t('aucun') : v;
        var img = el('img');
        img.alt = '';
        img.src = rendu(essai);
        b.appendChild(img);
        if (!ouvert(e)) {
          var cad = el('span', 'nova-avatar-cadenas');
          cad.setAttribute('aria-hidden', 'true');
          cad.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
          b.appendChild(cad);
        }
        if (s === '1' || s === '2') { b.appendChild(el('span', 'nova-avatar-prix', s)); nomV += ' (' + (s === '1' ? t('leg1') : t('leg2')) + ')'; }
        else if (badgeObtenu(s) && imageBadge(s)) {
          var mini = el('img', 'nova-avatar-badge');
          mini.src = imageBadge(s);
          mini.alt = '';
          b.appendChild(mini);
          nomV += ' (' + texteBadge(s) + ')';
        }
        else if (/^badge-/.test(s)) { b.appendChild(el('span', 'nova-avatar-prix nova-avatar-etoile', '\u2605')); nomV += ' (' + t('leg3') + ')'; }
        b.title = nomV;
        b.setAttribute('aria-label', nomV);
        b.addEventListener('click', function () { cliquer(k, v, b.querySelector('img').src); });
        grille.appendChild(b);
      });
      confirmer.hidden = !enAttente;
      // Onglet choisi visible dans la rangée, puis fondus et flèches à jour.
      var actif = onglets.querySelector('[aria-selected="true"]');
      if (actif && (actif.offsetLeft < onglets.scrollLeft || actif.offsetLeft + actif.offsetWidth > onglets.scrollLeft + onglets.clientWidth)) {
        onglets.scrollLeft = actif.offsetLeft - (onglets.clientWidth - actif.offsetWidth) / 2;
      }
      bordsOnglets();
    };
    var cliquer = function (k, v, uri) {
      var e = k + '.' + v, s = etat.elements[e] || '';
      dire('');
      if (ouvert(e)) {
        choix[k] = v;
        if (k === 'clothingGraphic') choix.clothing = 'graphicShirt';
        enAttente = null;
        if (badgeObtenu(s)) dire(texteBadge(s));
        dessiner();
        return;
      }
      enAttente = { k: k, v: v, s: s };
      confImg.src = uri;
      if (/^badge-/.test(s)) {
        // badge-<clé>-<niveau requis>-<0|1> ; niveau atteint et badge proposé : data-niveaux (« clé:niveau:1|0 »).
        var p = s.split('-'), b = badgesAvatar[p[1]] || [0, 0];
        confTexte.textContent = (b[1] ? t('badge') : t('badge-off')).replace('%b', t(p[1])).replace('%n', nomNiv(+p[2])).replace('%m', nomNiv(b[0]));
        confOui.hidden = true;
      } else {
        var prix = +s;
        confOui.hidden = false;
        confOui.disabled = etat.jetons.dispo < prix;
        confTexte.textContent = etat.jetons.dispo < prix ? (prix === 1 ? t('manque1') : t('manque').replace('%n', prix))
          : (prix === 1 ? t('question') : t('question2')).replace('%n', prix);
      }
      dessiner();
      confirmer.scrollIntoView({ block: 'nearest', behavior: animationsCoupees() ? 'auto' : 'smooth' });
    };
    // Envoi au serveur (accueil, module de confiance) ; sa réponse est la page à jour, dont on relit #nova-avatar.
    var envoyer = function (suite) {
      if (occupe) return Promise.reject(new Error('occupe'));
      occupe = true;
      [boutonEnr, boutonHasard, confOui].forEach(function (b) { b.disabled = true; });
      return fetch(lienAccueil('&nova_avatar=1' + suite), { credentials: 'same-origin' }).then(function (r) { return r.text(); }).then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var source = doc.getElementById('nova-avatar');
        if (!source) throw new Error('page');
        lire(source);
        return etat.message;
      }).finally(function () {
        occupe = false;
        [boutonEnr, boutonHasard, confOui].forEach(function (b) { b.disabled = false; });
      });
    };
    confOui.addEventListener('click', function () {
      if (!enAttente) return;
      var a = enAttente;
      envoyer('&nova_avatar_ouvrir=' + a.k + '.' + a.v).then(function (m) {
        enAttente = null;
        if (m === 'ouvert') { choix[a.k] = a.v; if (a.k === 'clothingGraphic') choix.clothing = 'graphicShirt'; dire(t('ouvert')); }
        else dire(t('refus'));
        // Compteur de la barre à jour, sans animation (une dépense n'est pas un gain).
        var mj = lireAvatar();
        if (mj) { mj.jetons = mj.vu = etat.jetons.dispo; garderAvatar(mj); poserAvatarBarre(mj); }
        dessiner();
      }).catch(function () { dire(t('refus')); });
    });
    confNon.addEventListener('click', function () { enAttente = null; dessiner(); });
    boutonEnr.addEventListener('click', function () {
      var c = chaine(choix);
      envoyer('&nova_avatar_choix=' + c).then(function (m) {
        if (m !== 'choix' && etat.enregistre !== c) { dire(t('refus')); return; }
        dire(t('enregistre'));
        var memo = lireAvatar() || {};
        memo.actif = 1; memo.choix = etat.enregistre; memo.titre = memo.titre || t('titre') || ''; memo.uri = rendu(choix);
        memo.jetons = memo.vu = etat.jetons.dispo;
        garderAvatar(memo);
        poserAvatarBarre(memo);
      }).catch(function () { dire(t('refus')); });
    });
    boutonHasard.addEventListener('click', function () {
      AVATAR_CATEGORIES.forEach(function (k) {
        if (k === 'clothingGraphic') return;
        var ok = (etat.ordre[k] || []).filter(function (v) { return ouvert(k + '.' + v); });
        if (ok.length) choix[k] = ok[Math.floor(Math.random() * ok.length)];
      });
      enAttente = null;
      dire(t('tire'));
      dessiner();
    });
    dessiner();
    if (!etat.enregistre) dire(t('premier'));
    chargerAvatar(d.getAttribute('data-script')).then(function (f) { dessin = f; dessiner(); }).catch(function () { dire(t('erreur')); });
  }

  // Page « Avatars des élèves » de l'enseignant (demande de l'utilisateur, maquette A validée le 2026-11-12) : grille
  // écrite par le serveur (_widgets/avatars-classe.phtml, _procs/avatars-classe.sh), portraits dessinés ici ; détail
  // dans une fenêtre avec Précédent / Suivant (flèches du clavier aussi). Sans avatar enregistré : silhouette grisée (CSS).
  // Trombinoscope : cases « Afficher » (avatar, chaque badge proposé dans la classe) et badges posés au bas du portrait,
  // niveau inscrit dans le badge (maquette B choisie par l'utilisateur le 2026-11-12, avec le niveau de la maquette A).
  // Seuls les badges gagnés sont montrés. Cases gardées dans le navigateur de l'enseignant (localStorage, choix de Claude).
  function trombinoscope(page, eleves, avecAvatar, t, el) {
    var cles = ['fidelite', 'perseverance', 'echauffement', 'top'];
    var niveaux = function (b) {
      var r = {};
      (b.getAttribute('data-niveaux') || '').split(' ').forEach(function (x) {
        var p = x.split(':');
        if (p.length === 3 && p[2] === '1') r[p[0]] = +p[1] || 0;
      });
      return r;
    };
    var proposes = cles.filter(function (k) { return t(k) && (k in niveaux(eleves[0])); });
    var vue = { avatar: avecAvatar };
    proposes.forEach(function (k) { vue[k] = true; });
    var MEMOIRE = 'nova-trombinoscope';
    try {
      var lu = JSON.parse(localStorage.getItem(MEMOIRE) || '{}');
      Object.keys(vue).forEach(function (k) { if (typeof lu[k] === 'boolean') vue[k] = lu[k]; });
    } catch (e) {}
    var base = (page.getAttribute('data-script') || '').replace(/js\/avatar\.js$/, '');
    var image = function (k, n) { return base + 'img/badges/' + IMAGES_BADGES[k] + '_0' + Math.max(1, Math.min(8, n)) + '.webp'; };
    eleves.forEach(function (b) {
      var portrait = b.querySelector('.nova-avatars-portrait');
      if (!portrait) return;
      var cadre = el('span', 'nova-avatars-cadre');
      portrait.parentNode.insertBefore(cadre, portrait);
      cadre.appendChild(portrait);
      cadre.appendChild(el('span', 'nova-avatars-medailles'));
    });
    function appliquer() {
      page.classList.toggle('nova-avatars-sans-portrait', !vue.avatar);
      var montres = proposes.filter(function (k) { return vue[k]; });
      eleves.forEach(function (b) {
        var cadre = b.querySelector('.nova-avatars-cadre');
        if (!cadre) return;
        var med = cadre.querySelector('.nova-avatars-medailles'), niv = niveaux(b);
        med.textContent = '';
        montres.forEach(function (k) {
          if (!niv[k]) return;
          var nom = t(k) + ', ' + t('niveau').replace('%n', niv[k]);
          var m = el('span', 'nova-avatars-medaille');
          m.setAttribute('role', 'img');
          m.setAttribute('aria-label', nom);
          m.title = nom;
          var img = el('img');
          img.alt = '';
          img.src = image(k, niv[k]);
          m.appendChild(img);
          m.appendChild(el('span', 'nova-avatars-niv', String(niv[k])));
          med.appendChild(m);
        });
        if (!med.firstChild && !vue.avatar && montres.length && t('aucun')) med.appendChild(el('span', 'nova-avatars-aucun', t('aucun')));
        var nb = med.querySelectorAll('.nova-avatars-medaille').length;
        med.style.setProperty('--nova-n', Math.max(3, nb));
        med.classList.toggle('nova-avatars-quatre', nb > 3 && vue.avatar);
        cadre.classList.toggle('nova-avatars-medaille-ok', !!med.querySelector('.nova-avatars-medaille'));
      });
    }
    var groupe = document.getElementById('nova-avatars-afficher');
    var options = (avecAvatar ? ['avatar'] : []).concat(proposes);
    if (groupe && options.length > 1) {
      if (t('afficher')) {
        groupe.setAttribute('aria-label', t('afficher').replace(/\s*:\s*$/, ''));
        groupe.appendChild(el('span', 'nova-avatars-afficher-titre', t('afficher')));
      }
      options.forEach(function (k) {
        var label = el('label', 'nova-avatars-case');
        var c = el('input');
        c.type = 'checkbox';
        c.checked = !!vue[k];
        c.addEventListener('change', function () {
          vue[k] = c.checked;
          try { localStorage.setItem(MEMOIRE, JSON.stringify(vue)); } catch (e) {}
          appliquer();
        });
        label.appendChild(c);
        label.appendChild(el('span', null, k === 'avatar' ? t('avatar') : t(k)));
        groupe.appendChild(label);
      });
      groupe.hidden = false;
    }
    appliquer();
  }
  // Liste des participants (adm/class/usermanage, job=userlist ; 2026-11-12, utilisateur) : portrait de l'eleve a gauche de
  // son nom (silhouette sans avatar), qui ouvre la fenetre de la page des avatars (avatarsClasse, sur la grille cachee
  // ecrite par _widgets/avatars-participants.phtml). A appeler APRES avatarsClasse.
  function avatarsParticipants() {
    var page = document.getElementById('nova-avatars');
    var table = document.getElementById('TABLE_userlist');
    if (!page || !table || !page.closest('.nova-avatars-participants')) return;
    var boutons = {};
    [].forEach.call(page.querySelectorAll('.nova-avatars-eleve'), function (b) { boutons[b.getAttribute('data-login')] = b; });
    var dialogue = page.querySelector('dialog'), dernier = null, poses = [];
    var modele = page.getAttribute('data-t-detail') || '%n';
    [].forEach.call(table.querySelectorAll('tbody tr'), function (tr) {
      var cellule = tr.cells[0], a = cellule && cellule.querySelector('a[href*="getuser="]');
      var m = a && /[?&+]getuser=([^&#]+)/.exec(a.getAttribute('href') || '');
      var b = m && boutons[decodeURIComponent(m[1])];
      if (!b || cellule.querySelector('.nova-participant-avatar')) return;
      var v = document.createElement('button');
      v.type = 'button';
      v.className = 'nova-participant-avatar' + (b.getAttribute('data-choix') ? '' : ' nova-avatars-sans');
      v.setAttribute('aria-label', modele.replace('%n', a.textContent.trim()));
      v.title = v.getAttribute('aria-label');
      var portrait = document.createElement('span');
      portrait.className = 'nova-avatars-portrait';
      v.appendChild(portrait);
      cellule.insertBefore(v, cellule.firstChild);
      cellule.classList.add('nova-participant-cellule');
      poses.push([portrait, b]);
      v.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!dialogue) return;
        dernier = v;
        b.click();
      });
    });
    if (dialogue) dialogue.addEventListener('close', function () { if (dernier) setTimeout(function () { dernier.focus(); }, 0); });
    page.addEventListener('nova-avatars-prets', function () {
      poses.forEach(function (x) {
        var img = x[1].querySelector('.nova-avatars-portrait img');
        if (!img) return;
        var i = document.createElement('img');
        i.alt = '';
        i.src = img.src;
        x[0].textContent = '';
        x[0].appendChild(i);
      });
    });
  }
  function avatarsClasse() {
    var page = document.getElementById('nova-avatars');
    if (!page) return;
    var t = function (n) { return page.getAttribute('data-t-' + n) || ''; };
    var el = function (balise, classe, texte) {
      var e = document.createElement(balise);
      if (classe) e.className = classe;
      if (texte != null) e.textContent = texte;
      return e;
    };
    var eleves = [].slice.call(page.querySelectorAll('.nova-avatars-eleve'));
    if (!eleves.length) return;
    var avec = eleves.filter(function (b) { return b.getAttribute('data-choix'); }).length;
    // Avatar coupé, badges actifs (2026-11-12, utilisateur) : la page montre les badges seuls.
    var avecAvatar = page.getAttribute('data-avatar') === 'oui';
    var resume = document.getElementById('nova-avatars-resume');
    if (resume && avecAvatar && t('resume')) resume.textContent = t('resume').replace('%n', eleves.length).replace('%a', avec).replace('%s', eleves.length - avec);
    else if (resume && t('eleves')) resume.textContent = t('eleves').replace('%n', eleves.length);
    trombinoscope(page, eleves, avecAvatar, t, el);
    var dessin = null, dessins = {};
    function poser(cadre, choix) {
      if (!cadre || !choix || !dessin) return;
      if (!dessins[choix]) dessins[choix] = dessin(choix);
      cadre.textContent = '';
      var img = el('img');
      img.alt = '';
      img.src = dessins[choix];
      cadre.appendChild(img);
    }
    // Export (2026-11-12, utilisateur) : dessin d'un eleve en SVG (fenetre de detail), ou tous dans un .zip (bouton de
    // la page). Fichiers « Nom-Prenom.svg », sans accent ; homonymes : identifiant ajoute. Eleves sans avatar : aucun fichier.
    var MARQUES = new RegExp('[' + String.fromCharCode(768) + '-' + String.fromCharCode(879) + ']', 'g');
    function net(x) {
      x = String(x || '');
      if (x.normalize) x = x.normalize('NFD').replace(MARQUES, '');
      return x.replace(/[^0-9A-Za-z_-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
    }
    function nomFichier(b) {
      return [net(b.getAttribute('data-nom')), net(b.getAttribute('data-prenom'))].filter(Boolean).join('-') ||
        net(b.getAttribute('data-login')) || 'avatar';
    }
    function svgDe(choix) {
      if (!choix || !dessin) return '';
      if (!dessins[choix]) dessins[choix] = dessin(choix);
      var m = /^data:image\/svg\+xml;utf8,(.*)$/.exec(dessins[choix]);
      try { return m ? decodeURIComponent(m[1]) : ''; } catch (e) { return ''; }
    }
    function telecharger(blob, nom) {
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = nom;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    }
    // Archive .zip sans compression (les SVG sont petits) : en-tetes locaux, repertoire central, fin de repertoire.
    function archive(fichiers) {
      var table = [], n, k, c;
      for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
      var crc = function (o) { var x = 0xFFFFFFFF; for (var i = 0; i < o.length; i++) x = table[(x ^ o[i]) & 255] ^ (x >>> 8); return (x ^ 0xFFFFFFFF) >>> 0; };
      var d = new Date(), heure = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
      var jour = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
      var bloc = function (taille, champs) {
        var v = new DataView(new ArrayBuffer(taille)), p = 0;
        champs.forEach(function (ch) { if (ch[0] === 2) v.setUint16(p, ch[1], true); else v.setUint32(p, ch[1], true); p += ch[0]; });
        return new Uint8Array(v.buffer);
      };
      var parts = [], centre = [], pos = 0, tc = 0;
      fichiers.forEach(function (fi) {
        var nom = new TextEncoder().encode(fi.nom), t = fi.octets.length;
        // version, drapeaux (noms en UTF-8), methode 0, heure, date, CRC, tailles, longueur du nom, champ supplementaire.
        var commun = [[2, 20], [2, 0x0800], [2, 0], [2, heure], [2, jour], [4, crc(fi.octets)], [4, t], [4, t], [2, nom.length], [2, 0]];
        parts.push(bloc(30, [[4, 0x04034b50]].concat(commun)), nom, fi.octets);
        centre.push(bloc(46, [[4, 0x02014b50], [2, 20]].concat(commun, [[2, 0], [2, 0], [2, 0], [4, 0], [4, pos]])), nom);
        pos += 30 + nom.length + t;
        tc += 46 + nom.length;
      });
      var fin = bloc(22, [[4, 0x06054b50], [2, 0], [2, 0], [2, fichiers.length], [2, fichiers.length], [4, tc], [4, pos], [2, 0]]);
      return new Blob(parts.concat(centre, [fin]), { type: 'application/zip' });
    }
    var exporter = document.getElementById('nova-avatars-exporter');
    if (exporter) exporter.addEventListener('click', function () {
      var pris = {}, fichiers = [];
      eleves.forEach(function (b) {
        var svg = svgDe(b.getAttribute('data-choix'));
        if (!svg) return;
        var nom = nomFichier(b), i = 2;
        if (pris[nom]) nom += '-' + (net(b.getAttribute('data-login')) || i);
        while (pris[nom]) nom = nom.replace(/-[0-9]+$/, '') + '-' + (i++);
        pris[nom] = 1;
        fichiers.push({ nom: nom + '.svg', octets: new TextEncoder().encode(svg) });
      });
      if (fichiers.length) telecharger(archive(fichiers), 'avatars' + (net(page.getAttribute('data-classe')) ? '-' + net(page.getAttribute('data-classe')) : '') + '.zip');
    });
    var dialogue = el('dialog', 'nova-dialogue nova-avatars-dialogue');
    if (typeof dialogue.showModal !== 'function') return;
    dialogue.setAttribute('aria-labelledby', 'nova-avatars-detail-nom');
    var fermer = el('button', 'close-button', '\u00d7');
    fermer.type = 'button';
    fermer.setAttribute('aria-label', t('fermer'));
    var fiche = el('div', 'nova-avatars-fiche');
    var nav = el('div', 'nova-avatars-nav');
    var prec = el('button', 'wims_button wims_secondary_button nova-avatars-prec', t('precedent'));
    var suiv = el('button', 'wims_button wims_secondary_button nova-avatars-suiv', t('suivant'));
    prec.type = suiv.type = 'button';
    nav.appendChild(prec);
    nav.appendChild(suiv);
    dialogue.appendChild(fermer);
    dialogue.appendChild(fiche);
    dialogue.appendChild(nav);
    page.appendChild(dialogue);
    var courant = 0;
    function montrer(i) {
      courant = (i + eleves.length) % eleves.length;
      var b = eleves[courant], choix = b.getAttribute('data-choix') || '';
      var j = (b.getAttribute('data-jetons') || '').split(' ').map(function (x) { return +x || 0; });
      var exercices = t('exercices').replace('%n', j[3] || 0);
      fiche.textContent = '';
      // Badges proposés dans la classe seulement (troisième champ de « niveaux » d'avatar.awk).
      var ul = el('ul', 'nova-avatars-badges');
      (b.getAttribute('data-niveaux') || '').split(' ').forEach(function (x) {
        var p = x.split(':');
        if (p.length !== 3 || p[2] !== '1' || !t(p[0])) return;
        var n = +p[1] || 0;
        ul.appendChild(el('li', n ? null : 'nova-avatars-zero', t(p[0]) + ' \u00b7 ' + (n ? t('niveau').replace('%n', n) : '\u2013')));
      });
      if (!avecAvatar) {
        var seul = el('div', 'nova-avatars-texte');
        var titre = el('h2', null, (b.querySelector('.nova-avatars-nom') || {}).textContent || '');
        titre.id = 'nova-avatars-detail-nom';
        seul.appendChild(titre);
        seul.appendChild(el('p', 'nova-avatars-login', b.getAttribute('data-login') || ''));
        if (ul.firstChild) seul.appendChild(ul);
        fiche.appendChild(seul);
        fiche.className = 'nova-avatars-fiche nova-avatars-fiche-badges';
        return;
      }
      var grand = el('div', 'nova-avatars-grand' + (choix ? '' : ' nova-avatars-sans'));
      // Fond transparent (choisi, ou aucun fond) : damier, comme le grand aperçu de « Mon avatar ».
      if (choix && !/(^|,)backgroundColor\.(?!transparent(,|$))/.test(choix)) grand.classList.add('nova-avatar-transparent');
      poser(grand, choix);
      var texte = el('div', 'nova-avatars-texte');
      var nomEl = b.querySelector('.nova-avatars-nom');
      var nom = el('h2', null, nomEl ? nomEl.textContent : '');
      nom.id = 'nova-avatars-detail-nom';
      texte.appendChild(nom);
      texte.appendChild(el('p', 'nova-avatars-login', b.getAttribute('data-login') || ''));
      if (!choix) {
        texte.appendChild(el('p', 'nova-avatars-vide', t('sans')));
        if (ul.firstChild) texte.appendChild(ul);
        texte.appendChild(el('p', 'nova-avatars-ligne', t('attente').replace('%n', j[2] || 0) + ' \u00b7 ' + exercices));
      } else {
        var dl = el('dl', 'nova-avatars-chiffres');
        [['gagnees', j[0], 1], ['depensees', j[1]], ['dispo', j[2]]].forEach(function (c) {
          var d = el('div');
          d.appendChild(el('dt', null, t(c[0])));
          var dd = el('dd');
          if (c[2]) dd.appendChild(pieceJeton());
          dd.appendChild(document.createTextNode(String(c[1] || 0)));
          d.appendChild(dd);
          dl.appendChild(d);
        });
        texte.appendChild(dl);
        if (ul.firstChild) texte.appendChild(ul);
        texte.appendChild(el('p', 'nova-avatars-ligne', t('elements').replace('%n', b.getAttribute('data-elements') || '0') + ' \u00b7 ' + exercices));
        // Enregistrer le dessin de cet eleve (2026-11-12, utilisateur) : une fois avatar.js charge.
        if (dessin && t('enregistrer') && window.TextEncoder) {
          var enr = el('button', 'wims_button wims_secondary_button nova-avatars-enregistrer', t('enregistrer'));
          enr.type = 'button';
          enr.addEventListener('click', function () {
            var svg = svgDe(choix);
            if (svg) telecharger(new Blob([svg], { type: 'image/svg+xml' }), nomFichier(b) + '.svg');
          });
          texte.appendChild(enr);
        }
      }
      fiche.appendChild(grand);
      fiche.appendChild(texte);
    }
    eleves.forEach(function (b, i) {
      b.addEventListener('click', function () {
        montrer(i);
        if (!dialogue.open) dialogue.showModal();
        fermer.focus();
      });
    });
    var retour = function () { var b = eleves[courant]; if (b) b.focus(); };
    dialogue.addEventListener('close', retour);
    fermer.addEventListener('click', function () { dialogue.close(); });
    dialogue.addEventListener('click', function (e) { if (e.target === dialogue) dialogue.close(); });
    prec.addEventListener('click', function () { montrer(courant - 1); });
    suiv.addEventListener('click', function () { montrer(courant + 1); });
    dialogue.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); montrer(courant - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); montrer(courant + 1); }
    });
    if (avecAvatar) chargerAvatar(page.getAttribute('data-script')).then(function (f) {
      dessin = f;
      eleves.forEach(function (b) { poser(b.querySelector('.nova-avatars-portrait'), b.getAttribute('data-choix')); });
      // Dessins prets : la liste des participants les recopie (avatarsParticipants).
      page.dispatchEvent(new CustomEvent('nova-avatars-prets'));
      if (exporter && avec && window.TextEncoder && window.Blob) exporter.hidden = false;
      if (dialogue.open) montrer(courant);
    }).catch(function () {});
  }

  /* ===== js/src/70-enseignant.js : pages de l'enseignant (replis, restriction d'accès, liens de connexion, désactivation, DM, configuration, zones dépendantes) ===== */
  /* Retour en haut : la pastille (cadre.css) n'apparaît qu'après une demi-hauteur d'écran de
   * défilement. WIMS ne pose son widget (_widgets/topback.phtml) que dans tail, doctail et user : pas
   * sur l'accueil enseignant d'une classe ni sur celui du site, pourtant longs. Nova le crée alors,
   * pour que la règle soit la même partout. Le lien vide de WIMS reçoit un nom accessible. */
  /* Accueil d'une structure, enseignant (2026-11-10, utilisateur, maquette A) : bouton « Replier les n classes » à côté de
   * chaque niveau qui a des classes ; replié, il ne reste que les programmes et leurs cours. Choix gardé sur le serveur
   * pour l'enseignant (header.phtml : #nova-replis, .nova_replis_<login>), envoyé à l'accueil en arrière-plan (fetch,
   * 1,2 s après le dernier clic : deux requêtes à moins d'1 s sont mal servies ; aussi au départ de la page). Niveau
   * repéré par le 2e numéro du paramètre class= de ses liens (2945398/1/101 : niveau 1). */
  function replisClasses() {
    var source = document.getElementById('nova-replis');
    var regle = document.getElementById('nova-replis-style');
    if (!source) return;
    var idNiveau = function (li) {
      var liens = li.querySelectorAll('a[href*="class="]');
      for (var i = 0; i < liens.length; i++) {
        var m = /[?&+]class=[0-9]+(?:%2F|\/)([0-9]+)/.exec(liens[i].getAttribute('href') || '');
        if (m) return m[1];
      }
      return '';
    };
    var niveaux = [].filter.call(document.querySelectorAll('.wimsbody ul.wims_subclasses > li'), function (li) {
      return li.querySelector(':scope > .wims_classes_direct_level') && li.querySelector(':scope > ul > li > .wims_classes_direct_class') && idNiveau(li);
    });
    var replies = (source.getAttribute('data-valeur') || '').split('.').filter(function (v) { return /^[0-9]+$/.test(v); });
    var attente = null;
    var envoyer = function (garder) {
      if (attente) { clearTimeout(attente); attente = null; }
      if (!window.fetch) return;
      fetch(lienAccueil('&nova_replis=' + ['n'].concat(replies).join('.')), { credentials: 'same-origin', keepalive: !!garder }).catch(function () { /* choix perdu */ });
    };
    window.addEventListener('pagehide', function () { if (attente) envoyer(true); });
    var texte = function (cle, n) { return (source.getAttribute('data-' + cle + (n === 1 ? '1' : '')) || '').replace('%1', n); };
    niveaux.forEach(function (li, k) {
      var id = idNiveau(li);
      var n = li.querySelectorAll(':scope > ul > li > .wims_classes_direct_class').length;
      var liste = li.querySelector(':scope > ul');
      if (!liste.id) liste.id = 'nova-replis-' + k;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'nova-replis-bouton';
      b.setAttribute('aria-controls', liste.id);
      var poser = function (replie) {
        li.classList.toggle('nova-replie', replie);
        b.setAttribute('aria-expanded', replie ? 'false' : 'true');
        b.textContent = texte(replie ? 'afficher' : 'replier', n);
      };
      poser(replies.indexOf(id) >= 0);
      b.addEventListener('click', function () {
        var replie = !li.classList.contains('nova-replie');
        poser(replie);
        replies = replies.filter(function (v) { return v !== id; });
        if (replie) replies.push(id);
        if (attente) clearTimeout(attente);
        attente = setTimeout(function () { envoyer(false); }, 1200);
      });
      li.querySelector(':scope > .wims_classes_direct_level').insertAdjacentElement('afterend', b);
    });
    if (regle) regle.remove();
  }

  /* Restriction d'accès d'une classe (adm/class/config, job=access ; 2026-11-10, utilisateur, maquette A) : formulaire au-dessus
   * du champ de WIMS (accessdef), qui passe dans « Réglage expert » replié. Heures interdites chaque jour (une plage qui passe
   * minuit = deux lignes), périodes entre deux dates, portée « class » ou « class exercise ». Lignes de Nova entre
   * « # Nova : debut » et « # Nova : fin », EN TÊTE du champ (WIMS applique la première ligne qui convient) ; une règle en
   * double n'est écrite qu'une fois (utilisateur). Au chargement, les lignes de ce format écrites à la main sont reprises
   * dans le formulaire, sauf s'il existe une règle d'accès sans « ! » (les remonter en tête en changerait le sens).
   * Sémantique de WIMS (src/lines.c, checkhostt) : « > » et « < » comparent la date du jour, jokers remplacés par
   * l'heure courante, fin comprise à la minute près ; pas de jour de la semaine. Réglage « textes » : champ de WIMS seul. */
  function accesClasse() {
    var zone = document.getElementById('accessdef');
    var gab = document.getElementById('nova-acces');
    if (!zone || !gab || !zone.form || document.querySelector('.nova-acces') || standard('textes')) return;
    var t = function (c) { return gab.getAttribute('data-' + c) || ''; };
    var DEBUT = '# Nova : debut', FIN = '# Nova : fin';
    var RE = /^\s*(class(?:\s+exercise)?)\s*:\s*!\s*>(\*{8}|\d{8})\.(\d\d:\d\d)\s+<(\*{8}|\d{8})\.(\d\d:\d\d)\s*$/i;
    var etat = { plages: [], periodes: [], portee: 'class' };
    var norm = function (l) { return l.trim().replace(/\s+/g, ' ').toLowerCase(); };
    var dateIso = function (d) { return d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8); };
    // Champ -> lignes de Nova (à reprendre) et lignes à la main (gardées) ; absorber : reprendre aussi les lignes à la main.
    var lire = function (absorber) {
      var lignes = zone.value.split(/\r?\n/), nova = [], main = [], dans = false;
      lignes.forEach(function (l) {
        var s = l.trim();
        if (s === DEBUT) { dans = true; return; }
        if (s === FIN) { dans = false; return; }
        (dans ? nova : main).push(l);
      });
      var accepte = main.some(function (l) { var s = l.trim(); return s && s[0] !== '#' && /:/.test(s) && !/^[^:]*:\s*!/.test(s); });
      var reprises = nova.filter(function (l) { return RE.test(l); });
      var portee = reprises.length ? RE.exec(reprises[0])[1].replace(/\s+/g, ' ').toLowerCase() : null;
      if (absorber && !accepte) {
        main = main.filter(function (l) {
          var m = RE.exec(l);
          if (!m) return true;
          var p = m[1].replace(/\s+/g, ' ').toLowerCase();
          if (portee === null) portee = p;
          if (p !== portee) return true;
          reprises.push(l);
          return false;
        });
      }
      var jours = [], periodes = [];
      reprises.forEach(function (l) {
        var m = RE.exec(l);
        if (m[2] === '********' && m[4] === '********') jours.push({ de: m[3], a: m[5] });
        else if (/^\d{8}$/.test(m[2]) && /^\d{8}$/.test(m[4])) periodes.push({ d1: dateIso(m[2]), h1: m[3], d2: dateIso(m[4]), h2: m[5] });
        else main.push(l);   // jokers mêlés : laissés tels quels
      });
      // Plage qui passe minuit : « de X à 23:59 » + « de 00:00 à Y » = « de X à Y ».
      var plages = [];
      jours.forEach(function (p) {
        if (p.a === '23:59' && p.de !== '00:00') {
          var suite = jours.filter(function (q) { return q.de === '00:00' && q.a !== '23:59' && !q.pris; })[0];
          if (suite) { suite.pris = true; plages.push({ de: p.de, a: suite.a }); return; }
        }
        if (!p.pris) plages.push({ de: p.de, a: p.a });
      });
      plages = plages.filter(function (p) { return !jours.some(function (q) { return q.pris && q.de === p.de && q.a === p.a; }) || p.de !== '00:00'; });
      etat = { plages: plages, periodes: periodes, portee: portee === 'class exercise' ? 'class exercise' : 'class' };
      while (main.length && !main[main.length - 1].trim()) main.pop();
      return main;
    };
    var main = lire(true);
    var valide = function (p) { return p.d1 && p.d2 && (p.d1 + (p.h1 || '00:00')) < (p.d2 + (p.h2 || '23:59')); };
    var generer = function () {
      var pre = etat.portee + ':! ', L = [];
      etat.plages.forEach(function (p) {
        if (!p.de || !p.a || p.de === p.a) return;
        if (p.de < p.a) L.push(pre + '>********.' + p.de + ' <********.' + p.a);
        else { L.push(pre + '>********.' + p.de + ' <********.23:59'); L.push(pre + '>********.00:00 <********.' + p.a); }
      });
      etat.periodes.forEach(function (p) {
        if (valide(p)) L.push(pre + '>' + p.d1.replace(/-/g, '') + '.' + (p.h1 || '00:00') + ' <' + p.d2.replace(/-/g, '') + '.' + (p.h2 || '23:59'));
      });
      return L;
    };
    // Écrit le champ : bloc Nova puis lignes à la main, chaque règle une seule fois (commentaires et lignes vides gardés).
    var ecrire = function () {
      var vues = {}, sortie = [];
      var ajouter = function (l) {
        var s = l.trim();
        if (s && s[0] !== '#') { var k = norm(s); if (vues[k]) return; vues[k] = true; }
        sortie.push(l);
      };
      var L = generer();
      if (L.length) { sortie.push(DEBUT); L.forEach(ajouter); sortie.push(FIN); }
      main.forEach(ajouter);
      zone.value = sortie.join('\n');
      return L;
    };
    var heure = function (h) { var m = /^(\d\d):(\d\d)$/.exec(h || ''); return m ? (+m[1]) + ' h' + (m[2] === '00' ? '' : ' ' + m[2]) : ''; };
    var date = function (d) { return d ? d.split('-').reverse().join('/') : ''; };
    var remplir = function (txt, v) { return v.reduce(function (s, x, i) { return s.replace('%' + (i + 1), x); }, txt); };

    var el = function (tag, classe, texte) { var e = document.createElement(tag); if (classe) e.className = classe; if (texte) e.textContent = texte; return e; };
    var croix = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
    var plus = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>';
    var bouton = function (classe, texte, icone) { var b = el('button', classe); b.type = 'button'; b.innerHTML = icone || ''; b.appendChild(document.createTextNode(texte)); return b; };
    var champ = function (type, valeur, etiquette, id) {
      var i = el('input', 'nova-acces-champ'); i.type = type; i.value = valeur || ''; if (id) i.id = id; if (etiquette) i.setAttribute('aria-label', etiquette); return i;
    };
    var label = function (pour, texte) { var l = el('label', '', texte); l.htmlFor = pour; return l; };
    var carte = function (titre, aide) {
      var f = el('fieldset', 'nova-acces-carte'); f.appendChild(el('legend', '', titre));
      if (aide) f.appendChild(el('p', 'nova-acces-aide', aide));
      return f;
    };
    var racine = el('div', 'nova-acces');
    var cJour = carte(t('titre-jour'), t('aide-jour')), lJour = el('div', 'nova-acces-liste');
    var bJour = el('div', 'nova-acces-actions');
    var addPlage = bouton('wims_button wims_secondary_button', t('ajouter-plage'), plus), nuit = bouton('wims_button wims_secondary_button', t('nuit'));
    bJour.appendChild(addPlage); bJour.appendChild(nuit);
    cJour.appendChild(lJour); cJour.appendChild(bJour);
    var cPer = carte(t('titre-periodes'), t('aide-periodes')), lPer = el('div', 'nova-acces-liste');
    var addPer = bouton('wims_button wims_secondary_button', t('ajouter-periode'), plus);
    var bPer = el('div', 'nova-acces-actions'); bPer.appendChild(addPer);
    cPer.appendChild(lPer); cPer.appendChild(bPer);
    var cPortee = carte(t('titre-portee')), choix = el('div', 'nova-acces-choix');
    [['class', t('tout')], ['class exercise', t('exo')]].forEach(function (c, k) {
      var l = el('label'), r = el('input'); r.type = 'radio'; r.name = 'nova_acces_portee'; r.value = c[0]; r.id = 'nova-acces-portee-' + k;
      l.htmlFor = r.id; l.appendChild(r); l.appendChild(document.createTextNode(' ' + c[1])); choix.appendChild(l);
    });
    cPortee.appendChild(choix);
    var cRes = carte(t('titre-resume')), resume = el('p', 'nova-acces-resume');
    var dLignes = el('details', 'nova-acces-lignes'), pre = el('pre');
    dLignes.appendChild(el('summary', '', t('lignes'))); dLignes.appendChild(pre);
    cRes.appendChild(resume); cRes.appendChild(dLignes);
    [cJour, cPer, cPortee, cRes].forEach(function (c) { racine.appendChild(c); });

    // Le champ de WIMS (libellé, Aide, zone) dans « Réglage expert », replié.
    var expert = el('details', 'nova-acces-expert'), resumeExpert = el('summary');
    expert.appendChild(resumeExpert);
    expert.appendChild(el('p', 'nova-acces-aide', t('expert-aide')));
    var lab = zone.form.querySelector('label[for="accessdef"]');
    var aideWims = zone.form.querySelector('a[href*="accessconf"]');
    var bloc = zone.closest('.wimscenter') || zone;
    var place = lab || bloc;
    place.parentNode.insertBefore(racine, place);
    if (lab) { var tete = el('div', 'nova-acces-tete'); tete.appendChild(lab); if (aideWims) tete.appendChild(aideWims); expert.appendChild(tete); }
    expert.appendChild(bloc);
    racine.appendChild(expert);

    var afficher = function () {
      lJour.textContent = ''; lPer.textContent = '';
      etat.plages.forEach(function (p, i) {
        var li = el('div', 'nova-acces-ligne');
        var de = champ('time', p.de, '', 'nova-acces-de-' + i), a = champ('time', p.a, '', 'nova-acces-a-' + i);
        li.appendChild(label(de.id, t('de'))); li.appendChild(de); li.appendChild(label(a.id, t('a'))); li.appendChild(a);
        var note = el('span', 'nova-acces-note', t('lendemain')); note.hidden = !(p.de && p.a && p.de > p.a); li.appendChild(note);
        de.addEventListener('change', function () { p.de = de.value; note.hidden = !(p.de && p.a && p.de > p.a); maj(); });
        a.addEventListener('change', function () { p.a = a.value; note.hidden = !(p.de && p.a && p.de > p.a); maj(); });
        var x = bouton('nova-acces-retirer', '', croix); x.setAttribute('aria-label', t('retirer-plage')); x.title = t('retirer-plage');
        x.addEventListener('click', function () { etat.plages.splice(i, 1); afficher(); maj(); });
        li.appendChild(x); lJour.appendChild(li);
      });
      etat.periodes.forEach(function (p, i) {
        var li = el('div', 'nova-acces-ligne');
        var d1 = champ('date', p.d1, '', 'nova-acces-du-' + i), h1 = champ('time', p.h1, t('heure-debut'));
        var d2 = champ('date', p.d2, '', 'nova-acces-au-' + i), h2 = champ('time', p.h2, t('heure-fin'));
        [[d1.id, t('du'), d1, h1], [d2.id, t('au'), d2, h2]].forEach(function (g) {
          var moitie = el('span', 'nova-acces-moitie');
          moitie.appendChild(label(g[0], g[1])); moitie.appendChild(g[2]); moitie.appendChild(g[3]);
          li.appendChild(moitie);
        });
        var note = el('span', 'nova-acces-note', t('incomplet'));
        var verifier = function () { note.hidden = valide(p); };
        verifier(); li.appendChild(note);
        [[d1, 'd1'], [h1, 'h1'], [d2, 'd2'], [h2, 'h2']].forEach(function (c) { c[0].addEventListener('change', function () { p[c[1]] = c[0].value; verifier(); maj(); }); });
        var x = bouton('nova-acces-retirer', '', croix); x.setAttribute('aria-label', t('retirer-periode')); x.title = t('retirer-periode');
        x.addEventListener('click', function () { etat.periodes.splice(i, 1); afficher(); maj(); });
        li.appendChild(x); lPer.appendChild(li);
      });
      choix.querySelectorAll('input').forEach(function (r) { r.checked = r.value === etat.portee; });
    };
    var maj = function () {
      var L = ecrire();
      pre.textContent = L.join('\n');
      dLignes.hidden = !L.length;
      var morceaux = etat.plages.filter(function (p) { return p.de && p.a && p.de !== p.a; }).map(function (p) {
        return remplir(t(p.de > p.a ? 'chaque-jour-lendemain' : 'chaque-jour'), [heure(p.de), heure(p.a)]);
      }).concat(etat.periodes.filter(valide).map(function (p) {
        return remplir(t('periode'), [date(p.d1), heure(p.h1 || '00:00'), date(p.d2), heure(p.h2 || '23:59')]);
      }));
      var vus = {};
      morceaux = morceaux.filter(function (m) { if (vus[m]) return false; vus[m] = true; return true; });
      resume.textContent = morceaux.length ? remplir(t(etat.portee === 'class' ? 'resume-tout' : 'resume-exo'), [morceaux.join(', ')]) : t('aucune');
      var regles = {};
      L.forEach(function (l) { regles[norm(l)] = 'nova'; });
      main.forEach(function (l) { var s = l.trim(); if (s && s[0] !== '#' && !regles[norm(s)]) regles[norm(s)] = 'main'; });
      var n = Object.keys(regles).filter(function (k) { return regles[k] === 'main'; }).length;
      resumeExpert.textContent = n ? remplir(t('expert-n'), [String(n)]) : t('expert');
    };
    addPlage.addEventListener('click', function () { etat.plages.push({ de: '12:00', a: '14:00' }); afficher(); maj(); });
    nuit.addEventListener('click', function () { etat.plages.push({ de: '20:30', a: '07:00' }); afficher(); maj(); });
    addPer.addEventListener('click', function () {
      var j = new Date(), iso = function (x) { return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2); };
      var fin = new Date(j.getTime() + 7 * 864e5);
      etat.periodes.push({ d1: iso(j), h1: '00:00', d2: iso(fin), h2: '23:59' }); afficher(); maj();
    });
    choix.addEventListener('change', function (e) { if (e.target.name === 'nova_acces_portee') { etat.portee = e.target.value; maj(); } });
    // Champ modifié à la main : les lignes de Nova y sont relues, le reste gardé.
    zone.addEventListener('change', function () { main = lire(false); afficher(); maj(); });
    zone.form.addEventListener('submit', function (e) {
      if (document.activeElement === zone) main = lire(false);
      ecrire();
      // « Enregistrer » (pas « Abandonner ») : la page suivante propose de propager (2026-11-10, utilisateur).
      if (e.submitter && e.submitter.name === 'save') { try { sessionStorage.setItem('nova-acces-enregistre', String(Date.now())); } catch (x) { /* sans stockage */ } }
    });
    afficher(); maj();
    propagerAcces(racine);
  }

  /* Après l'enregistrement d'une restriction d'accès sur une structure (portail, groupement, niveau ; 2026-11-10,
   * utilisateur, maquette) : message « enregistrée », et, si des zones dépendantes ont une autre restriction
   * (header.phtml, #nova-ecarts-acces, propager.sh … acces ecarts), proposition de la leur appliquer. L'application passe
   * par la propagation de WIMS (job=propagate, propagate=access : access.conf recopié tel quel), en arrière-plan. */
  function propagerAcces(racine) {
    var quand = null;
    try { quand = +sessionStorage.getItem('nova-acces-enregistre'); sessionStorage.removeItem('nova-acces-enregistre'); } catch (e) { quand = null; }
    if (!quand || Date.now() - quand > 120000) return;
    var liste = document.getElementById('nova-ecarts-acces');
    var t = function (c) { return liste ? liste.getAttribute('data-' + c) || '' : ''; };
    var message = function (texte, alerte) {
      var m = document.createElement('div');
      m.className = 'wims_msg ' + (alerte ? 'alert' : 'success');
      m.setAttribute('role', 'status');
      m.textContent = texte;
      return m;
    };
    if (!liste || !t('enregistre')) return;
    var ok = message(t('enregistre'));
    racine.parentNode.insertBefore(ok, racine);
    var zones = liste.querySelectorAll('li');
    var n = zones.length;
    if (!n) return;
    var boite = document.createElement('div');
    boite.className = 'nova-acces-propager';
    var q = document.createElement('p');
    q.className = 'nova-acces-propager-titre';
    q.textContent = n === 1 ? t('question1') : t('question').replace('%1', n);
    var texte = document.createElement('p');
    texte.textContent = t('texte');
    var det = document.createElement('details');
    var som = document.createElement('summary');
    som.textContent = t('voir');
    var ul = document.createElement('ul');
    zones.forEach(function (li) { var x = document.createElement('li'); x.textContent = li.textContent; ul.appendChild(x); });
    det.appendChild(som); det.appendChild(ul);
    var actions = document.createElement('div');
    actions.className = 'nova-acces-actions';
    var oui = document.createElement('button');
    oui.type = 'button'; oui.className = 'wims_button';
    oui.textContent = n === 1 ? t('appliquer1') : t('appliquer').replace('%1', n);
    var non = document.createElement('button');
    non.type = 'button'; non.className = 'wims_button wims_secondary_button';
    non.textContent = t('non');
    actions.appendChild(oui); actions.appendChild(non);
    [q, texte, det, actions].forEach(function (x) { boite.appendChild(x); });
    racine.parentNode.insertBefore(boite, racine);
    non.addEventListener('click', function () { boite.remove(); });
    oui.addEventListener('click', function () {
      oui.disabled = non.disabled = true;
      oui.textContent = t('attente');
      var fin = function (reussi) { boite.replaceWith(message(reussi ? (n === 1 ? t('fait1') : t('fait').replace('%1', n)) : t('erreur'), !reussi)); };
      if (!window.fetch) { fin(false); return; }
      setTimeout(function () {
        fetch(lienSession('&cmd=reply&job=propagate&propagate=access&confirm=1'), { credentials: 'same-origin' })
          .then(function (r) { return r.text(); })
          .then(function (html) { fin(/wims_msg success/.test(html)); })
          .catch(function () { fin(false); });
      }, 1000);
    });
  }

  /* Liens de connexion (scripts/adm/class/links.phtml, page Liens de connexion de la configuration ; 2026-11-10,
   * maquette A, utilisateur) : une carte par lien (Lien pour vous, pour vos eleves, pour les enseignants, inscription
   * des enseignants), le lien entier dans un champ et un bouton Copier ; QR code de WIMS dans la carte des eleves ;
   * numero de la classe dans sa carte. Liste de WIMS reconnue a ses liens (texte = adresse) ; un lien inconnu : rien
   * n'est change. Reglage standard : textes. Textes : header.phtml #nova-liens-textes. */
  function liensConnexion() {
    var t = document.getElementById('nova-liens-textes');
    var corps = document.querySelector('.wimsbody');
    if (!t || !corps) return;
    var source = corps.querySelector('ul.nova-liens-source');
    if (standard('textes')) return;
    var tx = function (k) { return t.getAttribute('data-' + k) || ''; };
    var dec = function (h) { try { return decodeURIComponent(h); } catch (e) { return h; } };
    var role = function (h) {
      h = dec(dec(h));
      if (/type=authsupervisor/.test(h)) return 'vous';
      if (/module=adm\/class\/reguser/.test(h)) return 'insc';
      if (/authtype=teacher/.test(h)) return 'ens';
      if (/type=authparticipant/.test(h)) return /subclass=yes/.test(h) ? 'eleves' : 'ens';
      if (/[?&]enter=/.test(h)) return 'eleves';
      return '';
    };
    var liste = null, items = [];
    Array.prototype.some.call(corps.querySelectorAll('ul'), function (ul) {
      var lis = Array.prototype.filter.call(ul.children, function (li) { return li.tagName === 'LI'; });
      if (!lis.length || lis.length > 6) return false;
      var res = lis.map(function (li) {
        var a = li.querySelector('a[href]');
        if (!a || a.textContent.trim() !== a.getAttribute('href').trim()) return null;
        var r = role(a.getAttribute('href'));
        return r ? { li: li, href: a.href, role: r } : null;
      });
      if (res.some(function (x) { return !x; }) || !res.some(function (x) { return x.role === 'vous' || x.role === 'eleves'; })) return false;
      liste = ul; items = res;
      return true;
    });
    if (!liste || source) return;
    var structure = /^[234]$/.test(t.getAttribute('data-type') || '') || items.some(function (x) { return x.role === 'ens' || x.role === 'insc'; });
    var icones = {
      vous: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
      eleves: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
      ens: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
      insc: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>',
      numero: '<line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/>'
    };
    var etat = null;
    var copier = function (texte, bouton, champ) {
      var libelle = bouton.textContent;
      var fini = function (ok) {
        bouton.textContent = ok ? tx('copie') + ' \u2713' : libelle;
        if (bouton._nova) clearTimeout(bouton._nova);
        if (ok) bouton._nova = setTimeout(function () { bouton.textContent = libelle; }, 2000);
        else { if (champ) { champ.focus(); champ.select(); } if (etat) etat.textContent = tx('echec'); }
      };
      var repli = function () {
        var z = document.createElement('textarea');
        z.value = texte; z.setAttribute('readonly', ''); z.style.position = 'fixed'; z.style.opacity = '0';
        document.body.appendChild(z); z.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        z.remove(); fini(ok);
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(texte).then(function () { fini(true); }, repli);
      else repli();
    };
    var carte = function (cle, titre) {
      var c = document.createElement('section');
      c.className = 'nova-lien-carte nova-lien-' + cle;
      var h = document.createElement('p');
      h.className = 'nova-lien-titre';
      var puce = document.createElement('span');
      puce.className = 'nova-lien-puce';
      puce.setAttribute('aria-hidden', 'true');
      puce.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + icones[cle] + '</svg>';
      h.appendChild(puce);
      h.appendChild(document.createTextNode(titre));
      c.appendChild(h);
      return c;
    };
    var aide = function (c, texte) {
      if (!texte) return;
      var p = document.createElement('p'); p.className = 'nova-lien-aide'; p.textContent = texte; c.appendChild(p);
    };
    var bouton = function (texte) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'wims_button'; b.textContent = texte; return b;
    };
    var qrScript = null;
    var chargerQr = function () {
      if (window.qrcode) return Promise.resolve(window.qrcode);
      if (!qrScript) qrScript = new Promise(function (ok, ko) {
        var sc = document.createElement('script');
        sc.src = t.getAttribute('data-qr-script') || '';
        sc.onload = function () { if (window.qrcode) ok(window.qrcode); else ko(new Error('qr')); };
        sc.onerror = function () { qrScript = null; ko(new Error('qr')); };
        document.head.appendChild(sc);
      });
      return qrScript;
    };
    // Dessin sur un canevas : modules noirs sur blanc, marge de 4 modules (norme), taille = module x echelle.
    var dessinQr = function (lib, texte, echelle) {
      var q = lib(0, 'M');
      q.addData(texte);
      q.make();
      var n = q.getModuleCount(), marge = 4, cote = (n + 2 * marge) * echelle;
      var cv = document.createElement('canvas');
      cv.width = cv.height = cote;
      var g = cv.getContext('2d');
      g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, cote, cote);
      g.fillStyle = '#000000';
      for (var r = 0; r < n; r++) for (var k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect((k + marge) * echelle, (r + marge) * echelle, echelle, echelle);
      return cv;
    };
    var qrCode = function (c, lien, wims) {
      var bloc = document.createElement('div');
      bloc.className = 'nova-lien-qr';
      var image = document.createElement('div');
      image.className = 'nova-lien-qr-image';
      if (wims && wims.querySelector('img, svg, canvas')) image.appendChild(wims);
      bloc.appendChild(image);
      var cote = document.createElement('div');
      cote.className = 'nova-lien-qr-texte';
      aide(cote, tx('qr'));
      var actions = document.createElement('div');
      actions.className = 'nova-lien-qr-actions';
      var grand = bouton(tx('agrandir'));
      var charger = bouton(tx('telecharger'));
      grand.classList.add('wims_secondary_button');
      charger.classList.add('wims_secondary_button');
      actions.appendChild(grand); actions.appendChild(charger);
      cote.appendChild(actions);
      bloc.appendChild(cote);
      bloc.hidden = true;
      c.appendChild(bloc);
      chargerQr().then(function (lib) {
        if (!image.firstChild) {
          var img = document.createElement('img');
          img.src = dessinQr(lib, lien, 4).toDataURL('image/png');
          img.alt = tx('qr-alt');
          image.appendChild(img);
        }
        bloc.hidden = false;
        grand.addEventListener('click', function () {
          var d = document.createElement('dialog');
          d.className = 'nova-dialogue nova-qr-grand';
          d.setAttribute('aria-label', tx('qr-alt'));
          var h = document.createElement('p');
          h.className = 'nova-qr-grand-titre';
          h.textContent = tx('eleves');
          var gi = document.createElement('img');
          gi.src = dessinQr(lib, lien, 16).toDataURL('image/png');
          gi.alt = tx('qr-alt');
          var u = document.createElement('p');
          u.className = 'nova-qr-grand-url';
          u.textContent = lien;
          var f = bouton(tx('fermer'));
          f.addEventListener('click', function () { d.close(); });
          d.addEventListener('close', function () { d.remove(); });
          d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
          [h, gi, u, f].forEach(function (z) { d.appendChild(z); });
          document.body.appendChild(d);
          if (d.showModal) d.showModal(); else d.setAttribute('open', '');
        });
        // Flyers a imprimer (2026-11-10, utilisateur : 30 par page A4, 5 x 6, texte seul WIMS - <classe>) : js/flyers.js charge au clic ; nom de la
        // classe modifiable, garde dans ce navigateur (localStorage nova-flyers-nom|<classe>).
        var numero = (/[?&]class=([0-9/]+)/.exec(dec(lien)) || [])[1] || '';
        var cleNom = 'nova-flyers-nom|' + numero;
        var fl = document.createElement('div');
        fl.className = 'nova-lien-flyers';
        var lab = document.createElement('label');
        var idNom = 'nova-flyers-nom';
        lab.setAttribute('for', idNom);
        lab.textContent = tx('fl-nom');
        var lf = document.createElement('div');
        lf.className = 'nova-lien-ligne';
        var champNom = document.createElement('input');
        champNom.type = 'text'; champNom.id = idNom; champNom.className = 'nova-lien-nom';
        var nomWims = (t.getAttribute('data-nom') || '').trim();
        var garde = null;
        try { garde = localStorage.getItem(cleNom); } catch (e) { garde = null; }
        champNom.value = garde || nomWims;
        champNom.addEventListener('change', function () {
          try {
            var v = champNom.value.trim();
            if (v && v !== nomWims) localStorage.setItem(cleNom, v); else localStorage.removeItem(cleNom);
          } catch (e) { }
        });
        var bf = bouton(tx('flyers'));
        lf.appendChild(champNom); lf.appendChild(bf);
        fl.appendChild(lab); fl.appendChild(lf);
        aide(fl, tx('fl-aide'));
        c.appendChild(fl);
        var flyScript = null;
        bf.addEventListener('click', function () {
          if (!flyScript) flyScript = new Promise(function (ok, ko) {
            if (window.novaFlyersPdf) { ok(); return; }
            var sc = document.createElement('script');
            sc.src = t.getAttribute('data-script-flyers') || '';
            sc.onload = function () { if (window.novaFlyersPdf) ok(); else ko(new Error('flyers')); };
            sc.onerror = function () { flyScript = null; ko(new Error('flyers')); };
            document.head.appendChild(sc);
          });
          flyScript.then(function () {
            var nom = champNom.value.trim() || nomWims || numero;
            var pdf = window.novaFlyersPdf({ qrcode: lib, lien: lien, nom: 'WIMS - ' + nom, format: 'mini' });
            var url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
            var a = document.createElement('a');
            a.href = url;
            a.download = 'flyers-' + (nom.normalize ? nom.normalize('NFD') : nom).replace(/[^0-9A-Za-z_-]+/g, '-').replace(/^-+|-+$/g, '') + '.pdf';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
          }, function () { if (etat) etat.textContent = tx('echec'); });
        });
        charger.addEventListener('click', function () {
          var cv = dessinQr(lib, lien, 16);
          var nom = 'qrcode-' + ((/[?&]class=([0-9/]+)/.exec(dec(lien)) || [])[1] || 'classe').replace(/\//g, '-') + '.png';
          var fin = function (url) {
            var a = document.createElement('a');
            a.href = url; a.download = nom;
            document.body.appendChild(a); a.click(); a.remove();
          };
          if (cv.toBlob) cv.toBlob(function (b) { var url = URL.createObjectURL(b); fin(url); setTimeout(function () { URL.revokeObjectURL(url); }, 60000); }, 'image/png');
          else fin(cv.toDataURL('image/png'));
        });
      }).catch(function () {
        // Bibliotheque introuvable : le QR code de WIMS seul, s'il y en a un, sans les boutons.
        if (image.firstChild) { actions.remove(); bloc.hidden = false; }
      });
    };
    var boite = document.createElement('div');
    boite.className = 'nova-liens';
    etat = document.createElement('p');
    etat.className = 'nova-lien-etat';
    etat.setAttribute('role', 'status');
    items.forEach(function (x) {
      var titre = tx(x.role);
      var c = carte(x.role, titre);
      aide(c, tx(x.role === 'eleves' && structure ? 'eleves-aide-s' : x.role + '-aide'));
      var ligne = document.createElement('div');
      ligne.className = 'nova-lien-ligne';
      var champ = document.createElement('input');
      champ.type = 'text'; champ.readOnly = true; champ.className = 'nova-lien-url'; champ.value = x.href;
      champ.setAttribute('aria-label', titre);
      champ.addEventListener('focus', function () { champ.select(); });
      var b = bouton(tx('copier'));
      b.addEventListener('click', function () { copier(x.href, b, champ); });
      ligne.appendChild(champ); ligne.appendChild(b);
      c.appendChild(ligne);
      // QR code (2026-11-10, utilisateur) : celui de WIMS s'il en produit un (QRencode_open=yes et qrencode sur le
      // serveur, scripts/adm/QRcode.phtml), sinon dessine par Nova (js/qrcode.js, charge a la demande) ; boutons
      // Agrandir (projection) et Telecharger (PNG), toujours d'apres le dessin de Nova.
      if (x.role === 'eleves') qrCode(c, x.href, x.li.querySelector('.wimscenter'));
      boite.appendChild(c);
    });
    // Numero de la classe (span.wims_code_words du dernier paragraphe) et mention Important de WIMS.
    var code = null, n = liste.nextSibling, retirer = [];
    while (n) {
      if (n.nodeType === 1 && n.querySelector && n.querySelector('.wims_code_words')) { code = n.querySelector('.wims_code_words'); retirer.push(n); break; }
      if (n.nodeType === 1 && !/^(SPAN|B|STRONG|BR|EM)$/.test(n.tagName)) break;
      retirer.push(n); n = n.nextSibling;
    }
    if (code && code.textContent.trim()) {
      var num = code.textContent.trim();
      var c = carte('numero', tx(structure ? 'numero-s' : 'numero') + ' : ');
      c.classList.add('nova-lien-numero-carte');
      var m = document.createElement('span'); m.className = 'nova-lien-num'; m.textContent = num;
      c.firstChild.appendChild(m);
      var texte = document.createElement('div'); texte.className = 'nova-lien-num-texte';
      texte.appendChild(c.firstChild);
      aide(texte, tx('numero-aide'));
      c.appendChild(texte);
      var bn = bouton(tx('copier-num'));
      bn.classList.add('wims_secondary_button');
      bn.addEventListener('click', function () { copier(num, bn, null); });
      c.appendChild(bn);
      boite.appendChild(c);
    } else retirer = [];
    boite.appendChild(etat);
    var avant = liste.previousSibling;
    liste.parentNode.insertBefore(boite, liste);
    liste.classList.add('nova-liens-source');
    liste.hidden = true;
    retirer.forEach(function (x) { if (x.parentNode) x.parentNode.removeChild(x); });
    if (avant && avant.nodeType === 3 && /:\s*$/.test(avant.textContent)) avant.textContent = '';
  }

  /* Page « Notes » de l'enseignant (adm/class/userscore, main.phtml, tableau #TABLE_userlist ; demande de
   * l'utilisateur, 2026-11-08).
   * (a) Case « Masquer la moyenne », décochée par défaut, dans le cadre du choix des colonnes ; choix gardé par le
   *     navigateur (localStorage nova-notes-sans-moyenne). Colonne repérée par th.average (affichage « notes », sans
   *     notes manuelles) : la cellule de même rang de chaque ligne, pied du tableau compris, est cachée.
   * (b) En-têtes « Examen k » et « Feuille k » : titre, lu dans la liste de choix de la page ; « Examen k : titre » en
   *     info-bulle. Une case par type (« Afficher le titre au lieu du numéro », 2026-11-09, utilisateur), cochée par
   *     défaut (décochée avec le réglage « Textes du thème standard »), gardée par le navigateur
   *     (localStorage nova-titres-examens, nova-titres-feuilles : 1 ou 0). */
  /* « Créer le DM noté » (demande de l'utilisateur, 2026-11-08 ; DM WIMS = examen d'entraînement + examen noté au même
   * contenu, cf. badge Échauffement). Accueil de l'enseignant (#TABLE_supervisor_exam) : bouton dans la colonne Action
   * d'un examen dont le titre porte un mot de --nova-echauffement-entrainement, s'il n'existe pas d'examen au même titre
   * avec un mot de --nova-echauffement-note. Le clic lit la description du dernier DM noté (dernier examen « noté » dont
   * un entraînement porte le même titre : fiche de l'examen, textarea desc), puis ouvre la duplication de WIMS
   * (adm/class/exam, job=duplicate : copie « En préparation », sa fiche ouverte). Nova y remplit titre (mot
   * d'entraînement remplacé par celui du dernier DM noté, sinon « noté »), description (celle du dernier DM noté, sinon
   * celle de l'entraînement, mot remplacé), sessions (--nova-dm-note-essais, 3), et enregistre. La copie reste en
   * préparation (choix de l'utilisateur). Plan gardé en sessionStorage (nova-dm-note) deux minutes. */
  /* « Désactiver quand même » (demande de l'utilisateur, 2026-11-08) : page où WIMS refuse de désactiver un examen ou
   * une feuille partagés avec d'autres classes, si la classe l'a permis (--nova-desactivation-forcee). header.phtml pose
   * #nova-forcer quand seuls le partage (ou, pour une feuille, son usage dans un examen) bloquent ; bouton sous
   * le message de WIMS, alerte (conséquences) dans un <dialog class="nova-dialogue">, puis l'accueil fait la
   * désactivation (nova_desactiver=exam:N ou sheet:N, _procs/desactiver.sh) et affiche le résultat (#nova-propage). */
  /* Contenu de l'avertissement « Désactiver quand même » (risques, sauvegarde de la classe cochée par défaut, étapes,
   * échec), mis dans le dialogue d. f : élément aux attributs data-… de _widgets/desactiver.phtml (#nova-forcer, de la
   * page ou d'une page lue en arrière-plan). retour : page ouverte après la désactivation (défaut : celle de la ressource).
   * Utilisé par forcerDesactivation (page de refus de WIMS) et confirmationsRessources (fenêtre, 2026-11-12). */
  function remplirForcer(f, d, n, retour) {
    var ul = document.createElement('ul');
    var points = (f.getAttribute('data-points') || '').split('|');
    // Feuille dont des exercices sont dans un examen (contourné aussi, 2026-11-08) : un point de plus, en deuxième.
    if (/examen/.test(f.getAttribute('data-examen') || '') && f.getAttribute('data-point-examen')) points.splice(1, 0, f.getAttribute('data-point-examen'));
    // Examen déjà commencé par des élèves (contourné depuis le 2026-11-12, utilisateur) : un point de plus s'il manque.
    var pointCommence = f.getAttribute('data-point-commence') || '';
    if (/commence/.test(f.getAttribute('data-examen') || '') && pointCommence && points.join('|').indexOf(pointCommence) < 0) points.splice(1, 0, pointCommence);
    points.forEach(function (t) {
      if (!t.trim()) return;
      var li = document.createElement('li');
      li.textContent = t.trim();
      ul.appendChild(li);
    });
    d.appendChild(ul);
    var actions = document.createElement('div');
    actions.className = 'wimscenter';
    var annuler = document.createElement('button');
    annuler.type = 'button';
    annuler.className = 'wims_button wims_secondary_button';
    annuler.textContent = f.getAttribute('data-annuler') || 'Cancel';
    var ok = document.createElement('a');
    ok.className = 'wims_button wims_warning';
    ok.setAttribute('role', 'button');
    ok.href = lienAccueil('&nova_desactiver=' + f.getAttribute('data-type') + ':' + n);
    // Sans passer par l'accueil (2026-11-09) : retour à la page de l'examen ou de la feuille, avec le message.
    var desactiver = function () {
      var t = f.getAttribute('data-type');
      actionAccueil('&nova_desactiver=' + t + ':' + n, retour || lienSession('&cmd=new&module=adm%2Fclass%2F' + t + '&' + t + '=' + n));
    };
    // Sauvegarde de la classe avant de désactiver (2026-11-10, utilisateur, maquette ; case cochée par défaut) : la
    // sauvegarde complète de WIMS (adm/class/config, job=arch, job2=download, selection=all), .zip, sinon .tgz (serveur
    // sans la commande « zip » : WIMS répond « l'archivage n'a pas abouti », vu sur le banc). Libellé sans extension
    // (2026-11-12, utilisateur : « annonce un .zip, c'est un .tgz qui arrive ») ; l'étape 2 donne le nom du fichier. Deux requêtes (l'entrée dans le module ignore job=…), 1,5 s d'écart,
    // puis le fichier (lien getfile de la page) récupéré et enregistré par le navigateur. Échec : rien n'est désactivé.
    var caseSauver = document.createElement('label');
    caseSauver.className = 'nova-forcer-sauver';
    var cocher = document.createElement('input');
    cocher.type = 'checkbox';
    cocher.checked = true;
    var libSauver = document.createElement('span');
    var gras = document.createElement('b');
    gras.textContent = f.getAttribute('data-sauver') || 'Download a backup of the class first';
    libSauver.appendChild(gras);
    if (f.getAttribute('data-sauver-aide')) {
      var aideSauver = document.createElement('span');
      aideSauver.className = 'nova-forcer-sauver-aide';
      aideSauver.textContent = f.getAttribute('data-sauver-aide');
      libSauver.appendChild(aideSauver);
    }
    caseSauver.appendChild(cocher);
    caseSauver.appendChild(libSauver);
    d.appendChild(caseSauver);
    var libelleOk = function () { ok.textContent = cocher.checked ? (f.getAttribute('data-ok-sauver') || 'Back up, then deactivate') : (f.getAttribute('data-ok') || 'Deactivate anyway'); };
    cocher.addEventListener('change', libelleOk);
    var suivi = document.createElement('ol');
    suivi.className = 'nova-forcer-etapes';
    suivi.hidden = true;
    var etapes = ['etape1', 'etape2', 'etape3'].map(function (k) {
      var li = document.createElement('li');
      li.textContent = (f.getAttribute('data-' + k) || '').replace(/\s*:?\s*%1/, '');
      suivi.appendChild(li);
      return li;
    });
    d.appendChild(suivi);
    var etape = function (i) { etapes.forEach(function (li, j) { li.className = j < i ? 'fait' : j === i ? 'encours' : ''; }); };
    var pause = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var sauvegarder = function () {
      var essayer = function (formats) {
        if (!formats.length) return Promise.reject(new Error('archive'));
        return fetch(lienSession('&cmd=reply&job=arch&job2=download&selection=all&format=' + formats[0]), { credentials: 'same-origin' })
          .then(function (r) { return r.text(); })
          .then(function (html) {
            var a = new DOMParser().parseFromString(html, 'text/html').querySelector('.wimsbody a[href*="getfile/"]');
            if (!a) return pause(1500).then(function () { return essayer(formats.slice(1)); });
            return a.getAttribute('href');
          });
      };
      return fetch(lienSession('&cmd=new&module=adm%2Fclass%2Fconfig'), { credentials: 'same-origin' })
        .then(function () { return pause(1500); })
        .then(function () { return essayer(['zip', 'tgz']); })
        .then(function (href) {
          var nom = decodeURIComponent((/getfile\/([^?]+)/.exec(href) || [])[1] || 'classe.zip');
          etapes[1].textContent = (f.getAttribute('data-etape2') || '%1').replace('%1', nom);
          etape(1);
          return pause(1500).then(function () { return fetch(href, { credentials: 'same-origin' }); }).then(function (r) {
            if (!r.ok) throw new Error('fichier');
            return r.blob();
          }).then(function (blob) {
            if (!blob.size) throw new Error('vide');
            var lien = document.createElement('a');
            lien.href = URL.createObjectURL(blob);
            lien.download = nom.replace(/~/g, '-');
            document.body.appendChild(lien);
            lien.click();
            setTimeout(function () { URL.revokeObjectURL(lien.href); lien.remove(); }, 60000);
          });
        });
    };
    var echec = document.createElement('p');
    echec.className = 'nova-forcer-echec';
    echec.hidden = true;
    echec.setAttribute('role', 'alert');
    echec.textContent = f.getAttribute('data-echec') || 'The backup failed: nothing was deactivated.';
    d.appendChild(echec);
    var sansSauver = document.createElement('button');
    sansSauver.type = 'button';
    sansSauver.className = 'wims_button wims_secondary_button';
    sansSauver.textContent = f.getAttribute('data-sans') || 'Deactivate without backup';
    sansSauver.hidden = true;
    sansSauver.addEventListener('click', function () { sansSauver.disabled = true; annuler.disabled = true; etape(2); desactiver(); });
    ok.addEventListener('click', function (e) {
      e.preventDefault();
      if (ok.getAttribute('aria-disabled') === 'true') return;
      ok.setAttribute('aria-disabled', 'true');
      ok.classList.add('disabled');
      if (!cocher.checked || !window.fetch || !window.Promise) { desactiver(); return; }
      ul.hidden = true; caseSauver.hidden = true; echec.hidden = true; sansSauver.hidden = true;
      annuler.disabled = true;
      suivi.hidden = false;
      libelleOk();
      etape(0);
      sauvegarder().then(function () { etape(2); return pause(1500); }).then(desactiver).catch(function () {
        etapes[0].className = 'echec';
        echec.hidden = false; sansSauver.hidden = false;
        ok.textContent = f.getAttribute('data-reessayer') || 'Try again';
        annuler.disabled = false;
        ok.removeAttribute('aria-disabled');
        ok.classList.remove('disabled');
      });
    });
    libelleOk();
    actions.appendChild(annuler);
    actions.appendChild(sansSauver);
    actions.appendChild(ok);
    d.appendChild(actions);
    return { annuler: annuler, ok: ok };
  }

  function forcerDesactivation() {
    var f = document.getElementById('nova-forcer');
    var corps = document.querySelector('.wimsbody');
    if (!f || !corps || document.querySelector('.nova-forcer-bouton') || typeof document.createElement('dialog').showModal !== 'function') return;
    // Seulement si la classe l'a permis (page Apparence, --nova-desactivation-forcee: oui ; 2026-11-08, utilisateur).
    if (getComputedStyle(document.documentElement).getPropertyValue('--nova-desactivation-forcee').replace(/["']/g, '').trim() !== 'oui') return;
    var placer = function (el) {
      var msg = corps.querySelector('.wims_msg, .oef_error, .wims_warning:not(.wims_button)');
      if (msg) msg.parentNode.insertBefore(el, msg.nextSibling);
      else corps.insertBefore(el, corps.firstChild);
    };
    // Refus de Nova aussi (examen déjà commencé) : dit, plutôt que rien (2026-11-08).
    if (f.getAttribute('data-refus')) {
      var r = document.createElement('p');
      r.className = 'nova-forcer-ligne nova-forcer-refus';
      r.textContent = f.getAttribute('data-refus');
      placer(r);
      return;
    }
    var n = f.getAttribute('data-n');
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'wims_button wims_warning nova-forcer-bouton';
    b.textContent = f.getAttribute('data-bouton') || 'Deactivate anyway...';
    var d = document.createElement('dialog');
    d.className = 'nova-dialogue nova-forcer';
    var h = document.createElement('h1');
    h.id = 'nova-forcer-titre';
    h.textContent = (f.getAttribute('data-titre') || 'Deactivate %1 despite sharing?').replace('%1', n);
    d.setAttribute('aria-labelledby', h.id);
    d.appendChild(h);
    var fait = remplirForcer(f, d, n, null);
    var annuler = fait.annuler;
    document.body.appendChild(d);
    annuler.addEventListener('click', function () { d.close(); });
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    b.addEventListener('click', function () { d.showModal(); annuler.focus(); });
    var p = document.createElement('p');
    p.className = 'nova-forcer-ligne';
    p.appendChild(b);
    placer(p);
  }

  function dmNote() {
    var textes = document.getElementById('nova-textes');
    var texte = function (cle, defaut) { return (textes && textes.getAttribute('data-texte-' + cle)) || defaut; };
    var lireSS = function (k) { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } };
    var ecrireSS = function (k, v) { try { if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
    var plat = function (t) { return (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); };
    var cs = getComputedStyle(document.documentElement);
    var mots = function (v, defaut) { return (texteCss(cs.getPropertyValue(v)) || defaut).split(',').map(plat).filter(Boolean); };
    var motsT = mots('--nova-echauffement-entrainement', 'entrainement');
    var motsN = mots('--nova-echauffement-note', 'not\u00e9, test');
    // Mot-clé de DM WIMS obligatoire (2026-11-08, utilisateur : « DMWIMS » ou « DM », éventuellement suivi d'un numéro).
    var motsD = mots('--nova-dm-mots', 'DMWIMS, DM');
    var estDM = function (titre) {
      var p = ' ' + plat(titre) + ' ';
      return motsD.some(function (d) { return new RegExp(' ' + d + '[0-9]* ').test(p); });
    };
    // Mot du titre (tel qu'écrit) qui appartient à la liste, et reste du titre (plat) sans lui.
    var role = function (titre, liste) {
      var mot = null;
      (titre.match(/[\p{L}\p{N}]+/gu) || []).some(function (m) { if (liste.indexOf(plat(m)) >= 0) { mot = m; return true; } return false; });
      if (!mot) return null;
      var reste = (' ' + plat(titre) + ' ').replace(' ' + plat(mot) + ' ', ' ').trim();
      return { mot: mot, reste: reste };
    };
    var remplacer = function (t, mot, par) {
      return t.replace(/[\p{L}\p{N}]+/gu, function (m) { return plat(m) === plat(mot) ? par : m; });
    };

    // 3. Page qui suit l'enregistrement : message.
    var fait = lireSS('nova-dm-note-fait');
    if (fait && Date.now() - fait.quand < 120000) {
      ecrireSS('nova-dm-note-fait', null);
      var corps = document.querySelector('.wimsbody');
      if (corps) {
        var msg = document.createElement('p');
        msg.className = 'wims_msg success nova-dm-note-fait';
        msg.setAttribute('role', 'status');
        msg.textContent = texte('dm-note-fait', 'Graded homework created: \u00ab %1 \u00bb. It stays in preparation: check it, then activate it.').replace('%1', fait.titre);
        var h = corps.querySelector('h1');
        if (h) h.parentNode.insertBefore(msg, h.nextSibling); else corps.insertBefore(msg, corps.firstChild);
      }
    }

    // 2. Fiche de la copie (adm/class/exam après job=duplicate) : remplir et enregistrer.
    var plan = lireSS('nova-dm-note');
    var titreChamp = document.querySelector('.wimsbody form input[name="title"]');
    if (plan && titreChamp) {
      ecrireSS('nova-dm-note', null);
      var form = titreChamp.form;
      var essais = form.querySelector('input[name="tries"]');
      var desc = form.querySelector('textarea[name="desc"]');
      var enregistrer = form.querySelector('input[type="submit"][name="save"]');
      // Garde-fous : plan récent, copie en préparation (sessions modifiables), titre encore celui de l'entraînement.
      if (Date.now() - plan.quand > 120000 || !essais || essais.readOnly || !enregistrer || titreChamp.value.trim() !== plan.source.trim()) return;
      titreChamp.value = plan.titre;
      essais.value = plan.essais;
      var description = plan.desc !== null ? plan.desc : (desc ? remplacer(desc.value, plan.motT, plan.motN) : null);
      var envoyer = function () {
        if (desc && description !== null) {
          desc.value = description;
          var ed = window.tinymce && window.tinymce.get && window.tinymce.get(desc.id);
          if (ed) ed.setContent(description);
        }
        ecrireSS('nova-dm-note-fait', { titre: plan.titre, quand: Date.now() });
        if (form.requestSubmit) form.requestSubmit(enregistrer); else enregistrer.click();
      };
      // L'éditeur de WIMS (TinyMCE) recopie son contenu dans le textarea à l'envoi : attendre qu'il soit prêt (3 s au plus).
      var n = 0;
      var attendre = function () {
        var ed = desc && window.tinymce && window.tinymce.get && window.tinymce.get(desc.id);
        if ((ed && ed.initialized) || !window.tinymce || ++n > 30) envoyer(); else setTimeout(attendre, 100);
      };
      if (document.readyState === 'complete') attendre(); else window.addEventListener('load', attendre);
      return;
    }

    // 1. Accueil de l'enseignant : boutons.
    var table = document.getElementById('TABLE_supervisor_exam');
    if (!table || table.querySelector('.nova-dm-note')) return;
    var examens = [];
    Array.prototype.forEach.call(table.querySelectorAll('tbody tr'), function (tr) {
      var a = tr.querySelector('a[href*="module=adm%2Fclass%2Fexam"][href*="exam="]:not([href*="job="])');
      var m = a && /[?&+]exam=(\d+)/.exec(a.getAttribute('href'));
      if (!m) return;
      var titre = a.textContent.replace(/\s+/g, ' ').trim();
      var dm = estDM(titre);
      examens.push({ n: +m[1], titre: titre, lien: a.href, action: tr.lastElementChild, t: dm ? role(titre, motsT) : null, note: dm ? role(titre, motsN) : null });
    });
    var restesT = {}, restesN = {};
    examens.forEach(function (e) { if (e.t) restesT[e.t.reste] = true; else if (e.note) restesN[e.note.reste] = true; });
    // Dernier DM noté : le plus grand numéro parmi les « notés » qui ont leur entraînement.
    var modele = examens.filter(function (e) { return !e.t && e.note && restesT[e.note.reste]; }).sort(function (x, y) { return y.n - x.n; })[0] || null;
    examens.forEach(function (e) {
      if (!e.t || restesN[e.t.reste] || !e.action) return;
      var b = document.createElement('a');
      // À côté de la pastille d'état (etatsRessources, colonne Action fusionnée) : même bouton que « Modifier ».
      var cellule = e.action.querySelector('.nova-etat-cellule');
      b.className = cellule ? 'nova-etat-modifier nova-dm-note' : 'wims_button nova-dm-note';
      b.setAttribute('role', 'button');
      var libelleDM = document.createElement('span');
      libelleDM.textContent = texte('dm-note', 'Create the graded homework');
      if (cellule) {
        var icoDM = document.createElement('span');
        icoDM.className = 'nova-etat-ico';
        icoDM.setAttribute('aria-hidden', 'true');
        icoDM.setAttribute('data-icone', 'copie');
        b.appendChild(icoDM);
      }
      b.appendChild(libelleDM);
      b.title = texte('dm-note-aide', 'Copy of this exam with the same exercises, %1 sessions, kept in preparation').replace('%1', 3);
      b.href = e.lien + '&+cmd=new&+job=duplicate';
      b.addEventListener('click', function (ev) {
        var motN = modele ? modele.note.mot : texte('dm-note-mot', 'graded');
        var essaisN = parseInt(cs.getPropertyValue('--nova-dm-note-essais').replace(/["']/g, ''), 10) || 3;
        var p = { source: e.titre, titre: remplacer(e.titre, e.t.mot, motN), motT: e.t.mot, motN: motN, essais: essaisN, desc: null, quand: Date.now() };
        if (!ecrireSS('nova-dm-note', p)) return;   // sans stockage : la duplication de WIMS seule
        ev.preventDefault();
        b.classList.add('disabled');
        b.setAttribute('aria-disabled', 'true');
        libelleDM.textContent = texte('dm-note-encours', 'Creating\u2026');
        var suite = function () { setTimeout(function () { location.href = b.href; }, 1500); };   // 2 requêtes à < 1 s : la 2e est mal servie
        if (!modele) { suite(); return; }
        fetch(modele.lien, { credentials: 'same-origin' }).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
          var html = new TextDecoder('windows-1252').decode(buf);
          var d = new DOMParser().parseFromString(html, 'text/html').querySelector('textarea[name="desc"]');
          if (d) { p.desc = d.value; ecrireSS('nova-dm-note', p); }
        }).catch(function () { /* description de l'entraînement */ }).then(suite);
      });
      if (cellule) { cellule.appendChild(b); return; }
      e.action.appendChild(document.createTextNode(' '));
      e.action.appendChild(b);
    });
  }

  /* Configuration et maintenance d'une classe, d'un groupement ou d'un portail (adm/class/config, page d'entrée ;
   * 2026-11-11, utilisateur : comme l'administration du serveur, maquette B). Les listes de WIMS deviennent des cartes :
   * un groupe sans titre = une carte ; « <strong>titre</strong> (aide) + sous-liste » = titre de groupe, puis sa carte.
   * Ligne = icône (d'après la cible du lien), libellé, description sans parenthèses, chevron ; ligne entière cliquable
   * (les autres liens de la ligne restent au-dessus). « Actualiser les index » garde ses boutons. Nœuds déplacés, pas
   * copiés (onclick de WIMS gardés) ; cartes gardent la classe wims_nopuce (rubriqueReglages, liensConnexion). Réglage
   * standard « listes ». */
  var CONFIG_ICONES = [
    [/#nova-reglages/, 'nova'], [/job=connectlink/, 'lien'], [/job=arch/, 'disque'], [/job=security/, 'bouclier'],
    [/job=clean/, 'balai'], [/job=propagate/, 'propager'], [/job=authtype/, 'cle'], [/job=list(?![a-z])/, 'curseurs'],
    [/adm(%2F|\/)class(%2F|\/)sequence/, 'sequence'], [/job=oefdefault/, 'crayon'], [/job=present/, 'palette'],
    [/adm(%2F|\/)forum/, 'forum'], [/adm(%2F|\/)class(%2F|\/)motd/, 'portevoix'], [/adm(%2F|\/)class(%2F|\/)cdt/, 'cahier'],
    [/adm(%2F|\/)class(%2F|\/)livret/, 'livret'], [/job=access/, 'cadenas'], [/job=grestrict/, 'jauge'],
    [/job=neighbor/, 'users'], [/job=connect(?![a-z])/, 'serveur'], [/adm(%2F|\/)light/, 'oeil']
  ];
  // Ligne d'une page de liens de configuration (icône en pastille, libellé, description ; maquette B) : configurationClasse,
  // securiteClasse.
  // Description : nœuds qui suivent le libellé (texte, autres liens), parenthèses de WIMS retirées.
  var configDescription = function (noeuds) {
    var span = document.createElement('span');
    span.className = 'nova-cfg-desc';
    noeuds.forEach(function (n) { span.appendChild(n); });
    span.normalize();
    while (span.firstChild && span.firstChild.nodeType === 3 && !span.firstChild.nodeValue.trim()) span.removeChild(span.firstChild);
    var premier = span.firstChild, dernier = span.lastChild;
    if (premier && premier.nodeType === 3) premier.nodeValue = premier.nodeValue.replace(/^\s*\(\s*/, '');
    if (dernier && dernier.nodeType === 3) dernier.nodeValue = dernier.nodeValue.replace(/\s*\)?[\s.,]*$/, '');
    return span.textContent.trim() ? span : null;
  };
  var configIcone = function (h) {
    for (var i = 0; i < CONFIG_ICONES.length; i++) if (CONFIG_ICONES[i][0].test(h)) return CONFIG_ICONES[i][1];
    return '';
  };
  var configLigne = function (li) {
    var ico = document.createElement('span');
    ico.className = 'nova-cfg-ico';
    ico.setAttribute('aria-hidden', 'true');
    var noeuds = Array.prototype.slice.call(li.childNodes);
    var boutons = noeuds.filter(function (n) { return n.nodeType === 1 && n.matches('a.wims_button, a.wims_button_help'); });
    li.classList.add('nova-cfg-ligne');
    if (boutons.length) {
      // « Actualiser les index » : libellé (texte avant le premier bouton), puis les boutons.
      li.classList.add('nova-cfg-index');
      ico.setAttribute('data-icone', 'maj');
      var tete = document.createElement('span');
      tete.className = 'nova-cfg-tete nova-cfg-libelle';
      tete.textContent = noeuds.filter(function (n) { return n.nodeType === 3; }).map(function (n) { return n.nodeValue; }).join(' ').replace(/\s+/g, ' ').trim();
      var div = document.createElement('div');
      div.className = 'nova-cfg-boutons';
      boutons.forEach(function (b) { div.appendChild(b); });
      li.textContent = '';
      li.appendChild(ico); li.appendChild(tete); li.appendChild(div);
      return li;
    }
    var a = noeuds.filter(function (n) { return n.nodeType === 1 && n.tagName === 'A'; })[0];
    if (!a) return li;
    ico.setAttribute('data-icone', configIcone(a.getAttribute('href') || ''));
    a.classList.add('nova-cfg-lien');
    var tete2 = document.createElement('span');
    tete2.className = 'nova-cfg-tete';
    var apres = noeuds.slice(noeuds.indexOf(a) + 1);
    var tags = apres.filter(function (n) { return n.nodeType === 1 && n.classList.contains('nova-tag-nouveau'); });
    apres = apres.filter(function (n) { return tags.indexOf(n) < 0; });
    noeuds.slice(0, noeuds.indexOf(a)).forEach(function (n) { if (n.nodeType === 3) li.removeChild(n); });
    tete2.appendChild(a);
    tags.forEach(function (t) { tete2.appendChild(t); });
    var d = configDescription(apres);
    li.textContent = '';
    li.appendChild(ico); li.appendChild(tete2);
    if (d) li.appendChild(d);
    return li;
  };
  // Page « Activités de gestion de sécurité » (adm/class/config, job=security ; 2026-11-12, utilisateur : « jolifie ») : même
  // carte que la page d'entrée (maquette B). « Changer le mot de passe » : libellé et deux boutons (classe, enseignant) ;
  // « Autres définitions… dans la configuration de la classe » : toute la phrase dans le lien. Réglage « listes ».
  function securiteClasse() {
    if (standard('listes')) return;
    var corps = document.querySelector('.wimsbody');
    var mdp = corps && corps.querySelector(':scope > ul > li > a[href*="passwd"][href*="job=class"]');
    if (!mdp || corps.querySelector('.nova-cfg')) return;
    var ul = mdp.parentNode.parentNode;
    var bloc = document.createElement('div');
    bloc.className = 'nova-cfg nova-securite';
    var carte = document.createElement('ul');
    carte.className = 'wims_nopuce nova-cfg-carte';
    bloc.appendChild(carte);
    Array.prototype.slice.call(ul.children).forEach(function (li) {
      if (li.tagName !== 'LI') return;
      var liens = li.querySelectorAll(':scope > a');
      if (li.querySelector(':scope > a[href*="passwd"]')) {
        Array.prototype.forEach.call(liens, function (a) { a.classList.add('wims_button', 'wims_secondary_button'); });
        carte.appendChild(configLigne(li));
        li.querySelector('.nova-cfg-ico').setAttribute('data-icone', 'cle');
        var t = li.querySelector('.nova-cfg-tete');
        if (t) t.textContent = t.textContent.replace(/[\s:,\u00a0]+$/, '');
        return;
      }
      var a = liens[0];
      if (a && /job=list(?![a-z])/.test(a.href)) {
        // Texte avant le lien rentré dedans : « Autres définitions de sécurité dans la configuration de la classe ».
        var avant = '';
        while (li.firstChild && li.firstChild !== a) { avant += li.firstChild.textContent; li.removeChild(li.firstChild); }
        a.textContent = (avant.replace(/\s+/g, ' ').trim() + ' ' + a.textContent.replace(/\s+/g, ' ').trim()).trim();
      }
      if (a && a.lastChild && a.lastChild.nodeType === 3) a.lastChild.nodeValue = a.lastChild.nodeValue.replace(/[\s.]+$/, '');
      carte.appendChild(configLigne(li));
      if (a && /job=log/.test(a.href)) li.querySelector('.nova-cfg-ico').setAttribute('data-icone', 'historique');
    });
    ul.parentNode.replaceChild(bloc, ul);
  }
  function configurationClasse() {
    if (standard('listes')) return;
    var corps = document.querySelector('.wimsbody');
    if (!corps) return;
    var config = /adm(%2F|\/)class(%2F|\/)config/;
    var arch = corps.querySelector('ul.wims_nopuce > li > a[href*="job=arch"]');
    if (!arch || !config.test(arch.href) || corps.querySelector('.nova-cfg')) return;
    var enfants = function (el, tag) { return Array.prototype.filter.call(el.children, function (c) { return c.tagName === tag; }); };
    var nettoyer = function (s) { return s.replace(/\s+/g, ' ').trim().replace(/^\(\s*/, '').replace(/\s*\)?[\s.,]*$/, '').replace(/\s*\)$/, ''); };
    var listes = Array.prototype.filter.call(corps.querySelectorAll('ul.wims_nopuce'), function (ul) {
      return !ul.closest('ul.wims_nopuce ul') && Array.prototype.some.call(ul.querySelectorAll('a[href]'), function (x) { return config.test(x.href); });
    });
    listes.forEach(function (ul) {
      var bloc = document.createElement('div');
      bloc.className = 'nova-cfg';
      var carte = null;
      var nouvelleCarte = function () {
        carte = document.createElement('ul');
        carte.className = 'wims_nopuce nova-cfg-carte';
        bloc.appendChild(carte);
      };
      var ajouter = function (li) { if (!carte) nouvelleCarte(); carte.appendChild(configLigne(li)); };
      var prec = ul.previousElementSibling;
      if (prec && prec.tagName === 'H2') bloc.appendChild(prec);
      enfants(ul, 'LI').forEach(function (li) {
        var titre = enfants(li, 'STRONG')[0];
        var sous = enfants(li, 'UL')[0];
        if (titre) {
          var t = document.createElement('div');
          t.className = 'nova-cfg-titre';
          t.textContent = titre.textContent.trim();
          var texte = Array.prototype.filter.call(li.childNodes, function (n) { return n.nodeType === 3; }).map(function (n) { return n.nodeValue; }).join(' ');
          texte = nettoyer(texte);
          if (texte) {
            var sd = document.createElement('span');
            sd.className = 'nova-cfg-desc';
            sd.textContent = texte;
            t.appendChild(sd);
          }
          bloc.appendChild(t);
          carte = null;
          if (sous) { enfants(sous, 'LI').forEach(ajouter); carte = null; }
        } else if (sous && !enfants(li, 'A').length) {
          enfants(sous, 'LI').forEach(ajouter);
          carte = null;
        } else ajouter(li);
      });
      // Préférences d'affichage : paragraphe qui suit la liste de configuration, mis en carte à la suite.
      var p = ul.nextElementSibling;
      if (p && p.tagName === 'P' && p.firstElementChild && p.firstElementChild.tagName === 'A' && /adm(%2F|\/)light/.test(p.firstElementChild.href)) {
        var lp = document.createElement('li');
        while (p.firstChild) lp.appendChild(p.firstChild);
        p.parentNode.removeChild(p);
        nouvelleCarte();
        carte.appendChild(configLigne(lp));
      }
      ul.parentNode.replaceChild(bloc, ul);
    });
    // Deux onglets (2026-11-11, utilisateur) : « Sauvegarde et maintenance » et « Configuration », titres = h2 de WIMS.
    var blocs = [].slice.call(corps.querySelectorAll('.nova-cfg'));
    var titres = blocs.map(function (b) { var h = b.querySelector(':scope > h2'); return h ? h.textContent.trim() : ''; });
    if (blocs.length < 2 || titres.some(function (t) { return !t; })) return;
    var onglets = document.createElement('div');
    onglets.className = 'nova-cfg-onglets';
    blocs[0].parentNode.insertBefore(onglets, blocs[0]);
    blocs.forEach(function (b, i) {
      var sec = document.createElement('section');
      sec.className = 'nova-onglet';
      sec.setAttribute('data-onglet', i ? 'configuration' : 'maintenance');
      sec.setAttribute('data-titre', titres[i]);
      sec.appendChild(b);
      onglets.appendChild(sec);
    });
    ongletsReglages(onglets, titres.join(', '), 'nova-cfg-onglet');
  }

  /* Configuration globale d'une classe, d'un groupement ou d'un portail (adm/class/config, job=list ; 2026-11-12,
   * utilisateur, maquette A) : la carte de la classe montre l'essentiel, « Plus de réglages (n) » ouvre langue, date
   * d'expiration, postes sûrs, enseignant connecté, moyennes et intervalles de connexion ; Feuilles, Examens et Avancé
   * repliés, titre et résumé (réglages changés, sinon « réglages par défaut de WIMS ») dans un bouton. Pastille
   * « modifié » sur un pli qui contient un réglage différent de la valeur par défaut de WIMS (list.phtml : !default),
   * tenue à jour pendant la saisie. Page toujours repliée à l'arrivée (rien de gardé). Réglage standard « listes ». */
  var CG_CACHES = ['up_lang', 'up_expiration', 'up_secure', 'up_supconnectshowed', 'up_hideaverage', 'up_utime'];
  var CG_DEFAUTS = {
    up_secure: 'all', up_supconnectshowed: 'no', up_hideaverage: 'no', up_utime: '15',
    up_exolog: '2', up_mexolog: 'no', up_exotitleform: '0', up_authscoresuspend: 'yes', up_option: '', up_topscores: '0',
    up_anonymtopscores: 'yes', up_examlog: 'max', up_examshow: 'yes', up_examscore_withoutip: 'no', up_optionex: '', up_ent: '',
    modtoolchg: false
  };
  // Page « Sauvegarde et restauration » (adm/class/config, job=arch ; 2026-11-12, utilisateur) : les liens zip, tgz,
  // tar.gz deviennent des boutons de telechargement (CSS, des le premier affichage) ; ici, seulement les separateurs
  // (« , », « ou », « . ») retires et les boutons groupes. Reglage « Feuilles et examens en liste ».
  function formatsSauvegarde() {
    if (standard('listes')) return;
    var sel = '[href*="job2=download"][href*="format="]';
    var liens = document.querySelectorAll('.wimsbody a.wims_label' + sel);
    if (liens.length < 2) return;
    var groupe = document.createElement('span');
    groupe.className = 'nova-formats';
    liens[0].parentNode.insertBefore(groupe, liens[0]);
    var restants = liens.length, n = groupe.nextSibling;
    while (n) {
      var suiv = n.nextSibling;
      if (n.nodeType === 1 && n.matches('a.wims_label' + sel)) { groupe.appendChild(n); restants--; }
      else if (n.nodeType === 3 && n.nodeValue.trim().length <= 4) { if (restants > 0 || /^[\s.]*$/.test(n.nodeValue)) n.remove(); }
      else break;
      if (!restants && !(suiv && suiv.nodeType === 3 && /^[\s.]*$/.test(suiv.nodeValue))) break;
      n = suiv;
    }
  }
  function configurationGlobale() {
    var tx = document.getElementById('nova-cg-textes');
    var job = document.querySelector('.wimsbody input[name="up_job"][value="list"]');
    if (!tx || !job || standard('listes')) return;
    var cadres = Array.prototype.filter.call(job.parentNode.children, function (c) { return c.tagName === 'FIELDSET' && c.classList.contains('property_fields'); });
    if (cadres.length < 2 || cadres[0].classList.contains('nova-cg')) return;
    var t = function (c, d) { return tx.getAttribute('data-' + c) || d; };
    var el = function (tag, classe, texte) { var e = document.createElement(tag); if (classe) e.className = classe; if (texte) e.textContent = texte; return e; };
    var chevron = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    var n = 0;
    var ident = function () { n += 1; return 'nova-cg-' + n; };
    // Un champ est « modifié » si une de ses commandes connues s'écarte de la valeur par défaut de WIMS.
    var modifie = function (champ) {
      return Array.prototype.some.call(champ.querySelectorAll('[name]'), function (c) {
        if (!Object.prototype.hasOwnProperty.call(CG_DEFAUTS, c.name)) return false;
        var d = CG_DEFAUTS[c.name];
        if (c.type === 'checkbox') return c.checked !== d;
        if (d === 'max') {
          var max = Math.max.apply(null, Array.prototype.map.call(c.options || [], function (o) { return parseInt(o.value, 10) || 0; }));
          return parseInt(c.value, 10) !== max;
        }
        return c.value.trim() !== d;
      });
    };
    var nom = function (champ) {
      var l = champ.querySelector(':scope > label, :scope > strong');
      if (!l) return '';
      l = l.cloneNode(true);
      Array.prototype.forEach.call(l.querySelectorAll('.nova-cg-pastille'), function (x) { x.remove(); });
      return l.textContent.replace(/\s+/g, ' ').replace(/[\s:]+$/, '').trim();
    };
    var valeur = function (champ) {
      return Array.prototype.map.call(champ.querySelectorAll('[name]'), function (c) {
        if (c.type === 'hidden') return '';
        if (c.type === 'checkbox') return c.checked ? '\u2713' : '';
        if (c.tagName === 'SELECT') return c.selectedIndex >= 0 ? c.options[c.selectedIndex].textContent.trim() : '';
        return c.value.trim();
      }).filter(Boolean).join(' / ');
    };
    var pastille = function () { var p = el('span', 'nova-cg-pastille', t('modifie', 'changed')); return p; };
    var plis = [];
    // Carte de la classe : réglages secondaires rangés après un bouton « Plus de réglages (n) ».
    var classe = cadres[0];
    classe.classList.add('nova-cg', 'nova-cg-replie');
    var caches = Array.prototype.filter.call(classe.children, function (c) {
      return c.classList.contains('field') && CG_CACHES.some(function (k) { return c.querySelector('[name="' + k + '"]'); });
    });
    if (caches.length) {
      var plus = el('button', 'nova-cg-plus');
      plus.type = 'button';
      plus.id = ident();
      var libelle = el('span', 'nova-cg-plus-texte');
      plus.appendChild(libelle);
      plus.insertAdjacentHTML('beforeend', chevron);
      classe.appendChild(plus);
      caches.forEach(function (c) { c.classList.add('nova-cg-cache'); classe.appendChild(c); });
      var majPlus = function () {
        var o = !classe.classList.contains('nova-cg-replie');
        libelle.textContent = o ? t('moins', 'Fewer settings') : t('plus', 'More settings (%1)').replace('%1', caches.length);
        plus.setAttribute('aria-expanded', o ? 'true' : 'false');
      };
      plus.addEventListener('click', function () { classe.classList.toggle('nova-cg-replie'); majPlus(); });
      majPlus();
      plis.push({ bouton: plus, champs: caches, resume: null });
    } else classe.classList.remove('nova-cg-replie');
    // Feuilles, Examens, Avancé : repliés, la légende de WIMS reste (nom du cadre pour les lecteurs d'écran).
    cadres.slice(1).forEach(function (f) {
      var legende = f.querySelector(':scope > legend');
      var champs = Array.prototype.filter.call(f.children, function (c) { return c.classList.contains('field'); });
      if (!legende || !champs.length) return;
      f.classList.add('nova-cg', 'nova-cg-section', 'nova-cg-replie');
      var b = el('button', 'nova-cg-entete');
      b.type = 'button';
      b.setAttribute('aria-expanded', 'false');
      var texte = el('span', 'nova-cg-entete-texte');
      texte.appendChild(el('span', 'nova-cg-titre', legende.textContent.trim()));
      var resume = el('span', 'nova-cg-resume');
      texte.appendChild(resume);
      b.appendChild(texte);
      b.insertAdjacentHTML('beforeend', chevron);
      legende.classList.add('nova-cache-visuel');
      f.insertBefore(b, legende.nextSibling);
      b.addEventListener('click', function () {
        var o = f.classList.toggle('nova-cg-replie') === false;
        b.setAttribute('aria-expanded', o ? 'true' : 'false');
      });
      plis.push({ bouton: b, champs: champs, resume: resume });
    });
    // Pastilles et résumés, refaits à chaque saisie.
    var maj = function () {
      plis.forEach(function (p) {
        var changes = p.champs.filter(function (c) {
          var m = modifie(c);
          c.classList.toggle('nova-cg-modifie', m);
          var lib = c.querySelector(':scope > label, :scope > strong');
          var pa = c.querySelector('.nova-cg-pastille');
          if (m && !pa && lib) lib.appendChild(pastille());
          else if (!m && pa) pa.remove();
          return m;
        });
        var pb = p.bouton.querySelector('.nova-cg-pastille');
        if (changes.length && !pb) p.bouton.insertBefore(pastille(), p.bouton.lastElementChild);
        else if (!changes.length && pb) pb.remove();
        if (p.resume) {
          p.resume.textContent = changes.length ? changes.map(function (c) {
            var v = valeur(c);
            return nom(c) + (v ? ' : ' + v : '');
          }).join(' \u00b7 ') : t('defaut', 'WIMS default settings');
        }
      });
    };
    maj();
    job.form.addEventListener('change', maj);
    job.form.addEventListener('input', maj);
    var actions = job.parentNode.querySelector(':scope > .actions');
    if (actions) actions.classList.add('nova-cg-actions');
  }

  /* Capacité de la classe (adm/class/config, scripts/adm/class/quotafree.proc ; 2026-11-12, utilisateur, maquette A) :
   * titre à gauche, « occupé sur total (p %) » à droite, jauge fine (la barre de WIMS, restylée par le CSS), légende à
   * pastilles ; au-delà de 80 % occupés (utilisé + réservé), orange et message. Nombres lus dans le texte de WIMS
   * (titre « … (150 Mo) », légende « Utilisé: 1Mo ») : s'il ne se lit pas, rien ne change. Réglage standard « listes ». */
  function capaciteClasse() {
    var q = document.querySelector('.wims_quotafree');
    var tx = document.getElementById('nova-capacite-textes');
    if (!q || !tx || q.classList.contains('nova-capacite') || standard('listes')) return;
    var titre = q.querySelector(':scope > .wimscenter');
    var barre = q.querySelector(':scope > .quota-bar');
    var legende = q.querySelector(':scope > p.formHelp');
    if (!titre || !barre || !legende) return;
    var mt = titre.textContent.replace(/\s+/g, ' ').trim().match(/^(.*?)\s*\(\s*([0-9.]+)\s*([^)]*?)\s*\)$/);
    if (!mt) return;
    var total = parseFloat(mt[2]), unite = mt[3];
    var lu = function (sp) {
      var m = sp.textContent.replace(/\s+/g, ' ').trim().match(/^(.*?)\s*:\s*(-?[0-9.]+)/);
      return m ? { nom: m[1], val: parseFloat(m[2]) } : null;
    };
    var parts = { alert: null, warning: null, libre: null };
    Array.prototype.forEach.call(legende.querySelectorAll('.quota-legend'), function (sp) {
      var k = sp.classList.contains('alert') ? 'alert' : sp.classList.contains('warning') ? 'warning' : 'libre';
      parts[k] = lu(sp);
    });
    if (!parts.alert || !parts.libre || !(total > 0)) return;
    var nb = function (x) { return (Math.round(x * 10) / 10).toLocaleString(document.documentElement.lang || undefined) + '\u00a0' + unite; };
    var occupe = parts.alert.val + (parts.warning ? Math.max(0, parts.warning.val) : 0);
    var pc = Math.min(100, Math.round(occupe / total * 100));
    var plein = occupe / total > 0.8;
    var deux = /^fr/.test(document.documentElement.lang || '') ? '\u00a0: ' : ': ';
    var tete = document.createElement('div');
    tete.className = 'nova-capacite-tete';
    var b = document.createElement('b');
    b.textContent = mt[1];
    var sp = document.createElement('span');
    sp.textContent = (tx.getAttribute('data-sur') || '%u / %t (%p %)').replace('%u', nb(occupe)).replace('%t', nb(total)).replace('%p', pc);
    tete.appendChild(b);
    tete.appendChild(sp);
    var ul = document.createElement('ul');
    ul.className = 'nova-capacite-legende';
    [['utilise', parts.alert], ['reserve', parts.warning], ['libre', parts.libre]].forEach(function (x) {
      if (!x[1] || (x[0] === 'reserve' && !(x[1].val > 0))) return;
      var li = document.createElement('li');
      li.className = 'nova-capacite-' + x[0];
      li.textContent = x[1].nom + deux + nb(Math.max(0, x[1].val));
      ul.appendChild(li);
    });
    q.replaceChild(tete, titre);
    q.replaceChild(ul, legende);
    if (plein) {
      q.classList.add('nova-capacite-pleine');
      var p = document.createElement('p');
      p.className = 'nova-capacite-alerte';
      p.textContent = tx.getAttribute('data-plein') || '';
      if (p.textContent) q.appendChild(p);
    }
    // Hors des onglets de configurationClasse (WIMS l'écrit après les listes) : à la fin de « Sauvegarde et maintenance ».
    var maint = document.querySelector('.nova-onglet[data-onglet="maintenance"] > .nova-cfg');
    if (maint) {
      var avant = q.parentNode;
      maint.appendChild(q);
      if (avant && avant.tagName === 'P' && !avant.textContent.trim() && !avant.children.length) avant.parentNode.removeChild(avant);
    }
    q.classList.add('nova-capacite');
  }

  /* Zones dépendantes (adm/class/config, job=propagate ; demande de l'utilisateur, 2026-10-08) : cases « Apparence du thème
   * Nova » et « Badges Nova » (séparées le 2026-11-07, utilisateur) ajoutées à la liste de WIMS. Cochées, l'envoi envoie
   * d'abord les autres cases à WIMS (s'il y en a), puis ouvre l'accueil avec nova_propager=apparence|badges|tout :
   * header.phtml (module de confiance) y recopie les blocs Nova choisis de la feuille de la structure dans celles de ses
   * zones et pose #nova-propage, message affiché ici en tête de page. */
  function propagationNova() {
    var fait = document.getElementById('nova-propage');
    var corps = document.querySelector('.wimsbody');
    if (fait && fait.textContent.trim() && corps) {
      var msg = document.createElement('div');
      msg.className = 'wims_msg ' + (fait.getAttribute('data-etat') === 'erreur' ? 'alert' : 'success');
      msg.setAttribute('role', 'status');
      msg.textContent = fait.textContent.trim();
      corps.insertBefore(msg, corps.firstChild);
    }
    var cases = document.querySelectorAll('.wimsbody input[type="checkbox"][name="propagate"]');
    if (!cases.length || !cases[0].form || document.getElementById('propagate_nova_apparence')) return;
    var form = cases[0].form, liste = cases[0].closest('ul');
    var textes = document.getElementById('nova-textes');
    var ajouter = function (partie, defaut) {
      var li = document.createElement('li');
      var c = document.createElement('input');
      c.type = 'checkbox'; c.id = 'propagate_nova_' + partie; c.value = partie;
      var label = document.createElement('label');
      label.htmlFor = c.id;
      label.textContent = (textes && textes.getAttribute('data-texte-propager-' + partie)) || defaut;
      li.appendChild(c); li.appendChild(label);
      if (liste) liste.appendChild(li); else cases[cases.length - 1].parentNode.appendChild(li);
      return c;
    };
    var nova = [ajouter('apparence', 'Nova theme appearance'), ajouter('badges', 'Nova badges')];
    // Tout cocher / tout décocher (2026-11-11, utilisateur) : deux boutons au-dessus de la liste, cases de Nova comprises ;
    // chacun grisé quand il n'a plus d'effet.
    if (liste) {
      var toutes = function () { return liste.querySelectorAll('input[type="checkbox"]'); };
      var barreTout = document.createElement('div');
      barreTout.className = 'nova-tout';
      var bouton = function (cle, defaut, valeur) {
        var bt = document.createElement('button');
        bt.type = 'button';
        bt.className = 'nova-tout-' + (valeur ? 'cocher' : 'decocher');
        bt.textContent = (textes && textes.getAttribute('data-texte-propager-' + cle)) || defaut;
        bt.addEventListener('click', function () {
          Array.prototype.forEach.call(toutes(), function (c) { if (!c.disabled) c.checked = valeur; });
          etat();
        });
        barreTout.appendChild(bt);
        return bt;
      };
      var cocher = bouton('tout', 'Select all', true), decocher = bouton('rien', 'Clear all', false);
      var etat = function () {
        var l = Array.prototype.slice.call(toutes());
        cocher.disabled = l.every(function (c) { return c.checked || c.disabled; });
        decocher.disabled = !l.some(function (c) { return c.checked; });
      };
      liste.addEventListener('change', etat);
      liste.parentNode.insertBefore(barreTout, liste);
      etat();
    }
    form.addEventListener('submit', function (e) {
      var choisies = nova.filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
      if (!choisies.length) return;
      // Propagation faite par header.phtml dans la requête même du formulaire (2026-11-09 ; avant : par l'accueil, où
      // l'enseignant restait) : paramètre dans l'adresse (lue par QUERY_STRING), le formulaire part normalement.
      var p = 'nova_propager=' + (choisies.length > 1 ? 'tout' : choisies[0]);
      if ((form.getAttribute('method') || 'get').toLowerCase() === 'post') {
        var cible = (form.getAttribute('action') || 'wims.cgi').replace(/[?&]nova_propager=[a-z]+/, '');
        form.setAttribute('action', cible + (cible.indexOf('?') < 0 ? '?' : '&') + p);
      } else {
        var cache = form.querySelector('input[name="nova_propager"]') || document.createElement('input');
        cache.type = 'hidden'; cache.name = 'nova_propager'; cache.value = p.split('=')[1];
        form.appendChild(cache);
      }
    });
  }

  /* Page Réglages de Nova d'un portail ou d'un groupement (demande de l'utilisateur, 2026-11-07) : alerte en
   * tête de la carte quand des zones dépendantes ont d'autres réglages Nova (#nova-ecarts, header.phtml), avec la liste
   * repliée, « Appliquer ces réglages à toutes les zones » (propagation par l'accueil, réglages ENREGISTRÉS : bouton
   * désactivé dès qu'un champ de la page change) et « Plus tard » (referme jusqu'à la prochaine visite). */
  function ecartsZones() {
    var src = document.getElementById('nova-ecarts');
    if (!src) return;
    var t = function (n) { return src.getAttribute('data-' + n) || ''; };
    // Page Réglages de Nova (2026-11-08) : une seule alerte pour ses deux blocs ; « Appliquer » propage ce qui diffère.
    var bloc = document.querySelector('.wimsbody .nova-reglages');
    if (!bloc || bloc.querySelector('.nova-ecarts')) return;
    var parties = ['apparence', 'badges'].filter(function (p) { return src.querySelector('li[data-partie="' + p + '"]'); });
    if (!parties.length) return;
    var partie = parties.length > 1 ? 'tout' : parties[0];
    var vus = {};
    var zones = [].filter.call(src.querySelectorAll('li[data-partie]'), function (z) {
      var k = z.textContent.trim();
      if (vus[k]) return false;
      vus[k] = true;
      return true;
    });
    (function () {
      var el = function (balise, classe, texte) {
        var e = document.createElement(balise);
        if (classe) e.className = classe;
        if (texte != null) e.textContent = texte;
        return e;
      };
      var n = zones.length;
      var alerte = el('div', 'nova-ecarts wims_msg warning');
      alerte.setAttribute('role', 'status');
      alerte.appendChild(el('p', 'nova-ecarts-titre', (n === 1 ? t('titre1') : t('titre').replace('%n', n)).replace('%q', t('quoi-' + partie))));
      alerte.appendChild(el('p', '', n === 1 ? t('texte1') : t('texte')));
      var details = el('details', 'nova-app-detail');
      details.appendChild(el('summary', '', t('voir')));
      var ul = el('ul');
      [].forEach.call(zones, function (z) { ul.appendChild(el('li', '', z.textContent)); });
      details.appendChild(ul);
      alerte.appendChild(details);
      var actions = el('p', 'nova-ecarts-actions');
      var appliquer = el('a', 'wims_button', t('appliquer'));
      // Propagation faite par header.phtml sur la page même (2026-11-09) : lien de la rubrique + nova_propager.
      var rubrique = document.querySelector('#wimsmenumodubox .nova_reglages > a');
      appliquer.href = rubrique ? rubrique.href.split('#')[0] + '&nova_propager=' + partie + '#nova-reglages' : lienAccueil('&nova_propager=' + partie);
      var plusTard = el('button', 'nova-ecarts-plus-tard wims_button wims_secondary_button', t('plus-tard'));
      plusTard.type = 'button';
      plusTard.addEventListener('click', function () { alerte.remove(); });
      actions.appendChild(appliquer); actions.appendChild(plusTard);
      alerte.appendChild(actions);
      var attente = el('p', 'nova-ecarts-attente', t('attente'));
      attente.hidden = true;
      alerte.appendChild(attente);
      bloc.insertBefore(alerte, bloc.firstChild);
      var modifie = function (e) {
        if (alerte.contains(e.target)) return;
        appliquer.setAttribute('aria-disabled', 'true');
        appliquer.removeAttribute('href');
        attente.hidden = false;
      };
      bloc.addEventListener('input', modifie);
      bloc.addEventListener('change', modifie);
    })();
  }

  /* Page de préparation d'une feuille ou d'un examen (adm/class/sheet, adm/class/exam ; demande de l'utilisateur, 2026-11-12).
   * Statut (maquette 2) : bandeau coloré, icône, nom de l'état (texte de WIMS), phrase qui dit ce que voient les élèves
   * (#nova-fiche-textes, f/e + numéro de l'état = classe wims_status_N), boutons de WIMS déplacés tels quels (liens GET).
   * Réglages (maquette 4) : chaque .field.box qui suit les zones de texte devient une tuile (icône, libellé, « ? » rond,
   * réglage) ; Oui/Non en bascule. Poids, règle de calcul et individualisation derrière « Options avancées » (utilisateur,
   * même jour), état gardé dans le navigateur. Réglage standard « listes ». */
  var FICHE_ICONES = [
    ['expdate', 'calendrier', 1], ['weight', 'balance', 1], ['formulaA', 'calcul', 1], ['indivtechvar', 'engrenage', 1],
    ['exodescshow', 'oeil'], ['prpage', 'fichier'], ['allowtype', 'cadenas'], ['duration', 'chrono'], ['tries', 'repete'],
    ['cutt', 'ciseaux', 1], ['exammode', 'ecran', 1]
  ];
  function ficheRessource() {
    var tx = document.getElementById('nova-fiche-textes');
    if (!tx || standard('listes')) return;
    var etat = document.querySelector('.wimsbody fieldset.property_fields .field .wims_status');
    var cadre = etat ? etat.closest('fieldset') : document.querySelector('.wimsbody form input[name="job"][value="text"]');
    if (cadre && cadre.tagName !== 'FIELDSET') cadre = cadre.form && cadre.form.querySelector('fieldset.property_fields');
    if (!cadre || cadre.classList.contains('nova-fiche')) return;
    var mod = cadre.form && cadre.form.querySelector('input[name="module"]');
    var type = mod && /exam/.test(mod.value) ? 'e' : 'f';
    cadre.classList.add('nova-fiche');
    if (etat) ficheStatut(etat, tx, type);
    ficheTuiles(cadre, tx);
    ficheEditeurs(cadre, tx);
  }
  function ficheStatut(etat, tx, type) {
    var champ = etat.closest('.field');
    var m = /wims_status_(\d)/.exec(etat.className);
    var n = m ? m[1] : '0';
    var mot = Array.prototype.filter.call(champ.childNodes, function (c) { return c !== etat && !(c.nodeType === 1 && c.tagName === 'A'); })
      .map(function (c) { return c.textContent; }).join(' ').replace(/\s+/g, ' ').trim();
    var boutons = Array.prototype.slice.call(champ.querySelectorAll('a.wims_button'));
    var bandeau = document.createElement('div');
    bandeau.className = 'nova-statut nova-statut-' + n;
    var ico = document.createElement('span');
    ico.className = 'nova-statut-ico';
    ico.setAttribute('aria-hidden', 'true');
    var texte = document.createElement('span');
    texte.className = 'nova-statut-texte';
    if (mot) { var sr = document.createElement('span'); sr.className = 'nova-cache-visuel'; sr.textContent = mot + ' : '; texte.appendChild(sr); }
    var nom = document.createElement('strong');
    nom.textContent = etat.textContent.replace(/\s+/g, ' ').trim().replace(/\s*\+\s*/g, ' + ');
    texte.appendChild(nom);
    var phrase = tx.getAttribute('data-' + type + n);
    if (phrase) { var p = document.createElement('span'); p.className = 'nova-statut-expl'; p.textContent = phrase; texte.appendChild(p); }
    var actions = document.createElement('span');
    actions.className = 'nova-statut-actions';
    boutons.forEach(function (b) {
      var job = /job=([a-z_]+)/.exec(b.href);
      if (job) b.setAttribute('data-nova-action', job[1] === 'expire' && n !== '1' ? 'montrer' : job[1]);
      actions.appendChild(b);
    });
    etat.hidden = true;
    champ.textContent = '';
    champ.classList.add('nova-statut-champ');
    bandeau.appendChild(ico); bandeau.appendChild(texte); bandeau.appendChild(actions);
    champ.appendChild(bandeau);
    champ.appendChild(etat);
  }
  function ficheTuiles(cadre, tx) {
    var champs = Array.prototype.filter.call(cadre.children, function (c) {
      return c.classList.contains('field') && !c.classList.contains('nova-statut-champ') && !c.querySelector('textarea, #title, .wims_status');
    });
    if (!champs.length) return;
    var cle = function (c) {
      for (var i = 0; i < FICHE_ICONES.length; i++) {
        var k = FICHE_ICONES[i][0];
        if (c.querySelector('[name="' + k + '"], a[href*="special_parm=' + k + '&"], a[href$="special_parm=' + k + '"]')) return FICHE_ICONES[i];
      }
      return null;
    };
    var grille = document.createElement('div');
    grille.className = 'nova-tuiles';
    cadre.insertBefore(grille, champs[0]);
    var avancees = [], multiples = [];
    champs.forEach(function (c) {
      var k = cle(c);
      c.classList.add('nova-tuile');
      if (k && k[0] === 'allowtype') c.classList.add('nova-tuile-large');
      var tete = document.createElement('div');
      tete.className = 'nova-tuile-tete';
      var ico = document.createElement('span');
      ico.className = 'nova-tuile-ico';
      ico.setAttribute('aria-hidden', 'true');
      if (k) ico.setAttribute('data-icone', k[1]);
      tete.appendChild(ico);
      var libelle = c.querySelector(':scope > label, :scope > strong');
      var aide = c.querySelector(':scope > a.wims_button_help');
      if (libelle) { libelle.classList.add('nova-tuile-nom'); tete.appendChild(libelle); }
      if (aide) {
        var t = aide.textContent.trim();
        aide.classList.add('nova-tuile-aide');
        aide.classList.remove('float_right');
        aide.setAttribute('title', t);
        aide.textContent = '';
        var s = document.createElement('span'); s.className = 'nova-cache-visuel'; s.textContent = t; aide.appendChild(s);
        tete.appendChild(aide);
      }
      // Valeur en texte seul (individualisation, mode d'affichage) : dans un span.
      Array.prototype.slice.call(c.childNodes).forEach(function (n) {
        if (n.nodeType === 3 && n.nodeValue.trim()) {
          var v = document.createElement('span'); v.className = 'nova-tuile-valeur'; v.textContent = n.nodeValue.trim();
          c.replaceChild(v, n);
        }
      });
      // Boutons radio de WIMS (input + label, séparés par des virgules) : bascule.
      var radios = c.querySelectorAll(':scope > input[type="radio"]');
      if (radios.length) {
        var bascule = document.createElement('span');
        bascule.className = 'nova-app-choix nova-tuile-choix';
        bascule.setAttribute('role', 'radiogroup');
        c.insertBefore(bascule, radios[0]);
        Array.prototype.forEach.call(radios, function (r) {
          var l = r.id && c.querySelector('label[for="' + r.id + '"]');
          if (!l) return;
          l.insertBefore(r, l.firstChild);
          bascule.appendChild(l);
        });
        Array.prototype.slice.call(c.childNodes).forEach(function (n) {
          if (n.nodeType === 1 && n.classList.contains('nova-tuile-valeur') && /^[,\s]*$/.test(n.textContent.replace(/,/g, ''))) c.removeChild(n);
        });
      }
      Array.prototype.forEach.call(c.querySelectorAll(':scope > br.clearall'), function (b) { b.remove(); });
      if (radios.length > 2) multiples.push(c);
      // Réglage (champs, unité, aide) sur une ligne qui passe à la ligne au besoin.
      var corps = document.createElement('div');
      corps.className = 'nova-tuile-corps';
      Array.prototype.slice.call(c.childNodes).forEach(function (n) {
        if (n.nodeType === 3 && !n.nodeValue.trim()) { c.removeChild(n); return; }
        corps.appendChild(n);
      });
      c.appendChild(corps);
      c.insertBefore(tete, c.firstChild);
      grille.appendChild(c);
      if (k && k[0] === 'cutt') coupuresExamen(c, tx);
      if (k && k[2]) { c.classList.add('nova-tuile-avancee'); avancees.push(c); }
    });
    // Tuile double (deux parts de la ligne) seulement si ses choix ne tiennent pas sur une ligne dans une tuile normale
    // (2026-11-12, utilisateur : « Page de présentation » prenait deux tiers de la ligne pour rien). Mesure refaite au
    // redimensionnement, au chargement des polices et à l'ouverture des options avancées.
    var doubles = function () {
      multiples.forEach(function (c) { c.classList.remove('nova-tuile-double'); });
      multiples.filter(function (c) {
        var choix = c.querySelector('.nova-tuile-choix'), corps = c.querySelector('.nova-tuile-corps');
        if (!choix || !corps || !corps.clientWidth) return false;
        var w = choix.offsetWidth - choix.clientWidth;
        Array.prototype.forEach.call(choix.children, function (l) { w += l.getBoundingClientRect().width; });
        return w > corps.clientWidth + 0.5;
      }).forEach(function (c) { c.classList.add('nova-tuile-double'); });
    };
    if (multiples.length) {
      doubles();
      var attente;
      window.addEventListener('resize', function () { clearTimeout(attente); attente = setTimeout(doubles, 100); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(doubles);
    }
    if (!avancees.length) return;
    var memo = 'nova-fiche-avancees';
    var bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'nova-fiche-avances';
    bouton.textContent = tx.getAttribute('data-avances') || 'Advanced options';
    var ouvrir = function (o) {
      grille.classList.toggle('nova-avances-ouvertes', o);
      bouton.setAttribute('aria-expanded', o ? 'true' : 'false');
      try { localStorage.setItem(memo, o ? '1' : '0'); } catch (e) { /* rien */ }
      if (multiples.length) doubles();
    };
    var ouvert = false;
    try { ouvert = localStorage.getItem(memo) === '1'; } catch (e) { /* fermé */ }
    bouton.addEventListener('click', function () { ouvrir(!grille.classList.contains('nova-avances-ouvertes')); });
    grille.parentNode.insertBefore(bouton, grille.nextSibling);
    ouvrir(ouvert);
  }

  /* Heures de coupure d'un examen (2026-11-12, utilisateur : « interface graphique comme Restriction d'accès ») : une ligne
   * par heure (date + heure, retirer), « Ajouter », champ de WIMS (cutt, « aaaammjj.hh:mm » séparées par des espaces,
   * exam/var.proc) tenu à jour et rangé dans « Réglage expert » replié. Mots non compris gardés tels quels en fin de champ. */
  function coupuresExamen(tuile, tx) {
    var zone = tuile.querySelector('input[name="cutt"]');
    if (!zone) return;
    var t = function (c) { return tx.getAttribute('data-cut-' + c) || ''; };
    var el = function (tag, classe, texte) { var e = document.createElement(tag); if (classe) e.className = classe; if (texte) e.textContent = texte; return e; };
    var deux = function (n) { return ('0' + n).slice(-2); };
    var heures = [], autres = [];
    zone.value.split(/[\s,;]+/).forEach(function (w) {
      var m = /^(\d{4})(\d\d)(\d\d)\.(\d\d?):(\d\d)$/.exec(w);
      if (m) heures.push({ d: m[1] + '-' + m[2] + '-' + m[3], h: deux(m[4]) + ':' + m[5] });
      else if (w) autres.push(w);
    });
    var ferme = zone.disabled || zone.readOnly;
    var racine = el('div', 'nova-coupures');
    racine.appendChild(el('p', 'nova-coupures-aide', t('aide')));
    var liste = el('div', 'nova-acces-liste');
    var vide = el('p', 'nova-coupures-vide', t('aucune'));
    racine.appendChild(liste); racine.appendChild(vide);
    var ecrire = function () {
      zone.value = heures.filter(function (x) { return x.d && x.h; }).map(function (x) { return x.d.replace(/-/g, '') + '.' + x.h; })
        .sort().concat(autres).join(' ') || ' ';   // champ vide ignoré par WIMS (rien effacé) ; une espace efface (vu le 2026-11-12)
    };
    var croix = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
    var plus = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>';
    var afficher = function () {
      liste.textContent = '';
      vide.hidden = heures.length > 0;
      heures.forEach(function (x, i) {
        var li = el('div', 'nova-acces-ligne');
        var d = el('input', 'nova-acces-champ'); d.type = 'date'; d.value = x.d; d.id = 'nova-coupure-' + i; d.disabled = ferme;
        var h = el('input', 'nova-acces-champ'); h.type = 'time'; h.value = x.h; h.setAttribute('aria-label', t('a')); h.disabled = ferme;
        var l = el('label', '', t('le')); l.htmlFor = d.id;
        li.appendChild(l); li.appendChild(d); li.appendChild(el('span', '', t('a'))); li.appendChild(h);
        d.addEventListener('change', function () { x.d = d.value; ecrire(); });
        h.addEventListener('change', function () { x.h = h.value; ecrire(); });
        if (!ferme) {
          var b = el('button', 'nova-acces-retirer'); b.type = 'button'; b.innerHTML = croix;
          b.setAttribute('aria-label', t('retirer')); b.title = t('retirer');
          b.addEventListener('click', function () { heures.splice(i, 1); ecrire(); afficher(); });
          li.appendChild(b);
        }
        liste.appendChild(li);
      });
    };
    if (!ferme) {
      var actions = el('div', 'nova-acces-actions');
      var ajout = el('button', 'wims_button wims_secondary_button'); ajout.type = 'button'; ajout.innerHTML = plus;
      ajout.appendChild(document.createTextNode(t('ajouter')));
      ajout.addEventListener('click', function () {
        var j = new Date(Date.now() + 36e5);
        heures.push({ d: j.getFullYear() + '-' + deux(j.getMonth() + 1) + '-' + deux(j.getDate()), h: deux(j.getHours()) + ':00' });
        ecrire(); afficher();
        var champs = liste.querySelectorAll('input[type="date"]');
        if (champs.length) champs[champs.length - 1].focus();
      });
      actions.appendChild(ajout);
      racine.appendChild(actions);
    }
    // Champ de WIMS dans « Réglage expert » ; s'il est modifié à la main, l'interface le relit.
    var expert = el('details', 'nova-acces-expert');
    expert.appendChild(el('summary', '', t('expert')));
    expert.appendChild(el('p', 'nova-coupures-aide', t('format')));
    zone.addEventListener('change', function () {
      heures = []; autres = [];
      zone.value.split(/[\s,;]+/).forEach(function (w) {
        var m = /^(\d{4})(\d\d)(\d\d)\.(\d\d?):(\d\d)$/.exec(w);
        if (m) heures.push({ d: m[1] + '-' + m[2] + '-' + m[3], h: deux(m[4]) + ':' + m[5] });
        else if (w) autres.push(w);
      });
      afficher();
    });
    zone.parentNode.insertBefore(racine, zone);
    expert.appendChild(zone);
    racine.appendChild(expert);
    tuile.classList.add('nova-tuile-large');
    afficher();
  }

  /* Texte d'explication et Commentaires (2026-11-12, utilisateur) : précision de WIMS (.formHelp) à droite du libellé ;
   * éditeur TinyMCE (WIMS, 400 px) à la hauteur du texte, jusqu'à 400 px au plus (ascenseur au-delà, comme avant).
   * Commentaires : éditeur replié par défaut (classe nova-com-ferme : l'éditeur n'est PAS déplacé, son iframe se
   * rechargerait), aperçu du texte et bouton pour l'ouvrir. */
  function ficheEditeurs(cadre, tx) {
    ['desc', 'comment'].forEach(function (id) {
      var zone = document.getElementById(id);
      var champ = zone && zone.closest('.field');
      if (!champ || champ.parentNode !== cadre) return;
      var lab = champ.querySelector(':scope > label'), aide = champ.querySelector(':scope > .formHelp');
      if (lab) {
        var tete = document.createElement('div');
        tete.className = 'nova-champ-tete';
        champ.insertBefore(tete, lab);
        tete.appendChild(lab);
        if (aide) tete.appendChild(aide);
      }
      editeurAjuste(id);
      // Zone vidée : WIMS ignore un champ vide et garde l'ancien texte ; une espace l'efface (vu le 2026-11-12, sans nova.js aussi).
      // Par « formdata », qui vient après tous les « submit » (TinyMCE, initialisé après nova.js, recopie son texte au sien).
      if (zone.form && !zone.form.novaVides) {
        zone.form.novaVides = true;
        zone.form.addEventListener('formdata', function (e) {
          ['desc', 'comment'].forEach(function (k) {
            var v = e.formData.get(k);
            if (typeof v === 'string' && !v.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '').trim()) e.formData.set(k, ' ');
          });
        });
      }
      if (id === 'comment' && tete) commentairesReplies(champ, tete, zone, tx);
    });
  }
  // Hauteur d'un éditeur TinyMCE de WIMS = hauteur de son contenu (bornée) ; suit la saisie et un éditeur réactivé.
  function editeurAjuste(id) {
    var MAX = 400, MIN = 72;
    var ajuster = function (ed) {
      var cont = ed.getContainer(), ifr = ed.iframeElement, corps = ed.getBody();
      if (!cont || !ifr || !corps || !cont.offsetHeight) return;
      var h = 0;
      Array.prototype.forEach.call(corps.children, function (c) {
        var bas = c.offsetTop + c.offsetHeight + (parseFloat(ed.getWin().getComputedStyle(c).marginBottom) || 0);
        if (bas > h) h = bas;
      });
      h += (parseFloat(ed.getWin().getComputedStyle(corps).paddingBottom) || 0) + (parseFloat(ed.getWin().getComputedStyle(corps).marginBottom) || 0);
      var autour = cont.offsetHeight - ifr.offsetHeight;
      cont.style.height = Math.max(MIN + autour, Math.min(MAX, Math.ceil(h) + autour + 4)) + 'px';
    };
    var brancher = function (ed) {
      if (!ed || ed.id !== id || ed.novaAjuste) return;
      ed.novaAjuste = true;
      var lancer = function () { ajuster(ed); };
      var pret = function () {
        lancer();
        ed.on('input change keyup SetContent NodeChange Undo Redo', lancer);
        // TinyMCE fait défiler la PAGE vers le curseur avant que l'éditeur ait grandi (2026-11-12, utilisateur : page qui
        // descend à chaque ligne) : agrandir d'abord, puis défiler l'éditeur seul, et la page seulement si le curseur sort de l'écran.
        ed.on('ScrollIntoView', function (e) {
          e.preventDefault();
          lancer();
          var el = e.elm && e.elm.nodeType === 1 ? e.elm : e.elm && e.elm.parentNode;
          if (!el || !el.getBoundingClientRect) return;
          var win = ed.getWin(), r = el.getBoundingClientRect();
          if (r.bottom > win.innerHeight) win.scrollBy(0, r.bottom - win.innerHeight + 4);
          else if (r.top < 0) win.scrollBy(0, r.top - 4);
          r = el.getBoundingClientRect();
          var cadre = ed.iframeElement.getBoundingClientRect();
          var bas = cadre.top + Math.min(r.bottom, cadre.height), haut = cadre.top + Math.max(r.top, 0);
          if (bas > window.innerHeight) window.scrollBy(0, bas - window.innerHeight + 8);
          else if (haut < 0) window.scrollBy(0, haut - 8);
        });
        ed.getWin().addEventListener('load', lancer);
        setTimeout(lancer, 400);
        // Texte qui change de taille sans saisie (feuille de style ou police de l'éditeur chargée tard, image, largeur de la
        // fenêtre) ou éditeur invisible à sa création (onglet, commentaires repliés) : remesurer (2026-11-12, utilisateur :
        // hauteur ajustée seulement après un clic dans le texte).
        var prevu = false;
        var bientot = function () { if (prevu) return; prevu = true; requestAnimationFrame(function () { prevu = false; lancer(); }); };
        var RO = ed.getWin().ResizeObserver || window.ResizeObserver;
        if (RO) {
          var veille = new RO(bientot);
          veille.observe(ed.getBody());
          Array.prototype.forEach.call(ed.getBody().children, function (c) { veille.observe(c); });
          ed.on('SetContent NodeChange', function () { Array.prototype.forEach.call(ed.getBody().children, function (c) { veille.observe(c); }); });
          if (window.ResizeObserver) new window.ResizeObserver(bientot).observe(ed.getContainer());
        }
        var polices = ed.getDoc().fonts;
        if (polices && polices.ready) polices.ready.then(bientot);
      };
      if (ed.initialized) pret(); else ed.on('init', pret);
      ed.novaAjuster = lancer;
    };
    var essai = function () {
      if (!window.tinymce || !tinymce.on) return false;
      tinymce.on('AddEditor', function (e) { brancher(e.editor); });
      brancher(tinymce.get(id));
      return true;
    };
    if (!essai()) window.addEventListener('load', essai);
  }
  function commentairesReplies(champ, tete, zone, tx) {
    var apercu = document.createElement('p');
    apercu.className = 'nova-com-apercu';
    var bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'nova-com-bouton';
    var texte = function () {
      var d = new DOMParser().parseFromString(zone.value || '', 'text/html');
      return (d.body.textContent || '').replace(/\s+/g, ' ').trim();
    };
    var montrer = function (ouvert) {
      champ.classList.toggle('nova-com-ferme', !ouvert);
      bouton.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
      var t = texte();
      apercu.textContent = t.length > 200 ? t.slice(0, 200) + '\u2026' : t;
      apercu.hidden = ouvert || !t;
      bouton.textContent = tx.getAttribute('data-com-' + (ouvert ? 'replier' : t ? 'modifier' : 'ecrire')) || '';
      if (ouvert && window.tinymce) {
        var ed = tinymce.get(zone.id);
        if (ed && ed.novaAjuster) setTimeout(ed.novaAjuster, 0);
      }
    };
    bouton.addEventListener('click', function () {
      if (window.tinymce) { var ed = tinymce.get(zone.id); if (ed) ed.save(); }
      montrer(champ.classList.contains('nova-com-ferme'));
    });
    tete.parentNode.insertBefore(apercu, tete.nextSibling);
    tete.appendChild(bouton);
    montrer(false);
  }

  /* « Activer l'éditeur » de WIMS (scripts/js/external/tinymce.phtml) : tinymce.execCommand('mceAddEditor', true, id) échoue
   * avec TinyMCE 6 (« Cannot set properties of undefined (setting 'external_plugins') », aussi sans nova.js, 2026-11-12) : l'éditeur
   * ne revient pas. Nova garde la configuration passée à tinymce.init (capterTinymce, appelée dès l'exécution de nova.js, AVANT
   * l'appel de WIMS au chargement de la page) et relance l'éditeur avec elle. */
  var configTinymce = null;
  function capterTinymce() {
    var tm = window.tinymce;
    if (!tm || typeof tm.init !== 'function' || tm.novaCapte) return;
    tm.novaCapte = true;
    var init = tm.init;
    tm.init = function (config) {
      if (config && typeof config === 'object' && !configTinymce) configTinymce = config;
      return init.apply(this, arguments);
    };
  }
  // Écouteur du document en capture : passe avant le onclick de WIMS (liens créés après le démarrage de nova.js) et l'arrête.
  function editeursReactivables() {
    if (document.novaReactivables) return;
    document.novaReactivables = true;
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('.wysiwyg_btns a[onclick*="mceAddEditor"]');
      var m = a && /mceAddEditor',\s*\w+,\s*'([^']+)'/.exec(a.getAttribute('onclick') || '');
      if (!m || !configTinymce || !window.tinymce) return;
      e.preventDefault();
      e.stopPropagation();
      var id = m[1];
      if (!window.tinymce.get(id)) {
        var c = {};
        for (var k in configTinymce) if (Object.prototype.hasOwnProperty.call(configTinymce, k)) c[k] = configTinymce[k];
        c.selector = '#' + id;
        window.tinymce.init(c);
      }
      a.classList.add('hidden_btn');
      if (a.previousElementSibling) a.previousElementSibling.classList.remove('hidden_btn');
    }, true);
  }

  /* Menus des pastilles d'état (accueil de l'enseignant, séquences) : un seul ouvert à la fois, placé sous la pastille,
   * clavier (flèches, Échap, Tab). Créé une fois par page. */
  var menusEtatPartages = null;
  function menusEtat() {
    if (menusEtatPartages) return menusEtatPartages;
    var ouvert = null;

    function fermer(rendre) {
      if (!ouvert) return;
      ouvert.menu.hidden = true;
      ouvert.bouton.setAttribute('aria-expanded', 'false');
      if (rendre) ouvert.bouton.focus();
      ouvert = null;
    }
    function items(menu) { return Array.prototype.slice.call(menu.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')); }
    // Sous la pastille (au-dessus s'il manque de place) ; suit la pastille au défilement, fermé si elle quitte l'écran.
    function placer() {
      if (!ouvert) return;
      var menu = ouvert.menu, r = ouvert.bouton.getBoundingClientRect(), w = menu.offsetWidth, h = menu.offsetHeight;
      var vw = document.documentElement.clientWidth, vh = window.innerHeight;
      if (r.bottom < 0 || r.top > vh || !r.width) { fermer(false); return; }
      var gauche = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, vw - w - 8));
      var haut = r.bottom + 6;
      if (haut + h > vh - 8 && r.top - 6 - h > 8) haut = r.top - 6 - h;
      menu.style.left = Math.round(gauche) + 'px';
      menu.style.top = Math.round(haut) + 'px';
    }
    function ouvrir(bouton, menu, focus) {
      fermer(false);
      menu.hidden = false;
      bouton.setAttribute('aria-expanded', 'true');
      ouvert = { bouton: bouton, menu: menu };
      placer();
      if (focus && ouvert) { var l = items(menu); if (l.length) l[0].focus(); }
    }
    document.addEventListener('mousedown', function (ev) {
      if (ouvert && !ouvert.menu.contains(ev.target) && !ouvert.bouton.contains(ev.target)) fermer(false);
    }, true);
    document.addEventListener('keydown', function (ev) { if (ouvert && ev.key === 'Escape') { ev.preventDefault(); fermer(true); } });
    document.addEventListener('nova-fermer-menus', function () { fermer(false); });
    window.addEventListener('scroll', placer, true);
    window.addEventListener('resize', placer);
    function brancher(pastille, menu) {
      pastille.setAttribute('aria-haspopup', 'menu');
      pastille.setAttribute('aria-expanded', 'false');
      pastille.setAttribute('aria-controls', menu.id);
      pastille.addEventListener('click', function () {
        if (ouvert && ouvert.menu === menu) fermer(false);
        else ouvrir(pastille, menu, false);
      });
      pastille.addEventListener('keydown', function (ev) {
        if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); ouvrir(pastille, menu, true); }
      });
      menu.addEventListener('keydown', function (ev) {
        var l2 = items(menu), i = l2.indexOf(document.activeElement);
        if (ev.key === 'Escape') { ev.preventDefault(); fermer(true); }
        else if (ev.key === 'Tab') fermer(false);
        else if (ev.key === 'ArrowDown') { ev.preventDefault(); if (l2.length) l2[(i + 1) % l2.length].focus(); }
        else if (ev.key === 'ArrowUp') { ev.preventDefault(); if (l2.length) l2[(i - 1 + l2.length) % l2.length].focus(); }
        else if (ev.key === 'Home') { ev.preventDefault(); if (l2.length) l2[0].focus(); }
        else if (ev.key === 'End') { ev.preventDefault(); if (l2.length) l2[l2.length - 1].focus(); }
      });
      document.body.appendChild(menu);
    }
    menusEtatPartages = { brancher: brancher, fermer: fermer };
    return menusEtatPartages;
  }

  /* États des ressources sur l'accueil de l'enseignant (2026-11-12, utilisateur, maquette M1) : colonnes « Statut » et
   * « Action » fusionnées. La pastille d'état ouvre le menu des actions de WIMS (liens déplacés tels quels : GET, avec
   * leurs confirmations), chacune avec son effet (#nova-statuts-textes, _widgets/statuts-ressources.phtml). États :
   * feuille, examen, devoir libre, vote = wims_status_0..3 (préparation, actif, expiré, caché et expiré) ; outil, document
   * ajouté, glossaire = 0 caché, 1 visible ; document de la classe = droits des élèves (0..2). Documents de la classe et
   * votes n'ont que « Modifier » : pastille sans menu, « Modifier » à côté. Réglage std-listes. */
  function etatsRessources() {
    var tx = document.getElementById('nova-statuts-textes');
    if (!tx || standard('listes')) return;
    var t = function (c) { return tx.getAttribute('data-' + c) || ''; };
    var TYPES = ['sheet', 'exam', 'freework', 'vote', 'tool', 'glossary', 'doc'];
    var LETTRE = { sheet: 'f', exam: 'e', freework: 'd' };
    var el = function (tag, classe, texte) { var e = document.createElement(tag); if (classe) e.className = classe; if (texte) e.textContent = texte; return e; };
    var icone = function (nom) { var s = el('span', 'nova-etat-ico'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('data-icone', nom); return s; };
    var majuscule = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
    var numero = 0, menus = menusEtat();

    // Une action du menu : le lien de WIMS, avec icône, libellé et effet.
    function action(a, type, etat) {
      var job = (/[?&]\+?job=([a-z_]+)/.exec(a.getAttribute('href') || '') || [])[1] || '';
      var k = LETTRE[type], libelle = a.textContent.trim(), ico = 'crayon', effet = '', groupe = 0;
      if (job === 'prep_activate') { ico = 'lecture'; effet = t('activer-' + k); }
      else if (job === 'expire' && etat === 3) { ico = 'oeil'; effet = t('montrer'); }
      else if (job === 'expire') { ico = 'horloge'; effet = t('expirer-' + k); }
      else if (job === 'hide') { ico = 'oeil-barre'; effet = t('cacher'); }
      else if (job === 'reactivate') { ico = 'retour'; libelle = t('reactiver') || libelle; effet = t(type === 'freework' ? 'reactiver-d' : 'reactiver-n'); }
      else if (job === 'chstatus') { ico = etat === 1 ? 'oeil-barre' : 'oeil'; effet = t(etat === 1 ? 'cacher' : 'montrer'); }
      else if (job === 'archive') { ico = 'archive'; effet = t('archiver'); groupe = 1; }
      else if (job === 'deactivate') { ico = 'marche'; effet = t('desactiver'); groupe = 2; }
      else if (job === 'prep_erase' || job === 'deldoc') { ico = 'corbeille'; effet = t('effacer'); groupe = 2; }
      a.className = 'nova-etat-action' + (groupe === 2 ? ' nova-etat-danger' : '');
      a.setAttribute('role', 'menuitem');
      a.setAttribute('tabindex', '-1');
      a.textContent = '';
      a.appendChild(icone(ico));
      var texte = el('span', 'nova-etat-texte', libelle);
      if (effet) texte.appendChild(el('small', '', effet));
      a.appendChild(texte);
      return { noeud: a, groupe: groupe };
    }

    function ligne(tr) {
      var cellules = tr.querySelectorAll(':scope > td');
      if (cellules.length < 3) return null;
      var actions = cellules[cellules.length - 1], cellule = cellules[cellules.length - 2];
      var marque = cellule.firstElementChild && /status_/.test(cellule.firstElementChild.className) ? cellule.firstElementChild : cellule;
      var m = /\bwims_(?:(?:tool|doc)_)?status_(\d)\b/.exec(marque.className);
      if (!m) return null;
      var type = null;
      for (var i = 0; i < TYPES.length && !type; i++) {
        var c = 'wims_' + TYPES[i] + '_item';
        if (cellules[0].classList.contains(c) || cellules[0].querySelector('.' + c)) type = TYPES[i];
      }
      if (!type) return null;
      return { tr: tr, actions: actions, cellule: cellule, marque: marque, etat: +m[1], type: type };
    }

    function transformer(l) {
      var etat = l.etat, type = l.type;
      var liens = Array.prototype.slice.call(l.actions.querySelectorAll('a[href]'));
      var visibilite = type === 'tool' || type === 'glossary' || (type === 'doc' && liens.some(function (a) { return /job=chstatus/.test(a.href); }));
      var droits = type === 'doc' && !visibilite;
      var texte = l.marque.textContent.replace(/\s+/g, ' ').trim();
      if (!visibilite && !droits && etat === 3) texte = texte.split('+')[0].trim();
      texte = majuscule(texte);
      var ton, ico;
      if (visibilite) { ton = etat === 1 ? 'ok' : 'neutre'; ico = etat === 1 ? 'oeil' : 'oeil-barre'; }
      else if (droits) { ton = etat === 2 ? 'ok' : 'neutre'; ico = 'livre'; }
      else { ton = etat === 0 ? 'neutre' : (etat === 1 ? 'ok' : 'attention'); ico = ['crayon', 'coche', 'horloge', 'oeil-barre'][etat] || 'crayon'; }
      var contenu = el('span', 'nova-etat-cellule');
      var sansMenu = droits || type === 'vote';
      var pastille = el(sansMenu ? 'span' : 'button', 'nova-etat nova-etat-' + ton);
      pastille.appendChild(icone(ico));
      pastille.appendChild(el('span', 'nova-etat-nom', texte));
      contenu.appendChild(pastille);
      if (sansMenu) {
        liens.forEach(function (a) { a.className = 'nova-etat-modifier'; a.insertBefore(icone('crayon'), a.firstChild); contenu.appendChild(a); });
      } else {
        pastille.type = 'button';
        pastille.appendChild(el('span', 'nova-etat-chevron'));
        var menu = el('div', 'nova-etat-menu');
        menu.id = 'nova-etat-menu-' + (++numero);
        menu.setAttribute('role', 'menu');
        menu.hidden = true;
        var titre = l.tr.querySelector(':scope > td:nth-child(2)');
        if (titre) menu.setAttribute('aria-label', titre.textContent.replace(/\s+/g, ' ').trim());
        var faits = liens.map(function (a) { return action(a, type, etat); });
        // Feuille ou examen en préparation sans exercice : WIMS ne propose pas « Activer » ; Nova le montre grisé.
        if ((type === 'sheet' || type === 'exam') && etat === 0 && !liens.some(function (a) { return /job=prep_activate/.test(a.href); })) {
          var vide = el('span', 'nova-etat-action');
          vide.setAttribute('role', 'menuitem');
          vide.setAttribute('aria-disabled', 'true');
          vide.appendChild(icone('lecture'));
          var tv = el('span', 'nova-etat-texte', t('activer'));
          tv.appendChild(el('small', '', t('vide')));
          vide.appendChild(tv);
          faits.unshift({ noeud: vide, groupe: 0 });
        }
        [0, 1, 2].forEach(function (g) {
          var du = faits.filter(function (f) { return f.groupe === g; });
          if (!du.length) return;
          if (g > 0 && menu.childNodes.length && !menu.querySelector(':scope > hr')) { var hr = el('hr'); hr.setAttribute('role', 'separator'); menu.appendChild(hr); }
          du.forEach(function (f) { menu.appendChild(f.noeud); });
        });
        menus.brancher(pastille, menu);
      }
      l.cellule.textContent = '';
      l.cellule.appendChild(contenu);
      l.cellule.setAttribute('data-text', texte);
      l.actions.parentNode.removeChild(l.actions);
    }

    var cadres = document.querySelectorAll('.wimsbody :is(#wims_supervisor_doc, #wims_supervisor_sheet, #wims_supervisor_exam, #wims_supervisor_vote, #wims_supervisor_tool, #wims_supervisor_freework) table');
    Array.prototype.forEach.call(cadres, function (table) {
      var lignes = Array.prototype.map.call(table.querySelectorAll(':scope > tbody > tr'), ligne);
      // Une ligne non reconnue : tableau laissé à WIMS (colonnes inchangées).
      if (!lignes.length || lignes.some(function (l) { return !l; })) { table.classList.add('nova-etats-non'); return; }
      var colonne = lignes[0].actions.cellIndex;
      lignes.forEach(transformer);
      Array.prototype.forEach.call(table.querySelectorAll(':scope > thead > tr'), function (tr) {
        if (tr.cells.length > colonne && tr.cells[colonne] === tr.lastElementChild) tr.removeChild(tr.cells[colonne]);
      });
      table.classList.add('nova-etats');
    });
  }

  /* Séquences pédagogiques, vue de l'enseignant (2026-11-12, utilisateur, maquette B ; adm/class/sequence, job=show).
   * Barre de titre : poignée, chevron (replier), titre, pastille d'état qui ouvre le menu (Activer ou Désactiver, Effacer :
   * liens de WIMS, Effacer confirmé par confirmationsRessources), « Modifier », flèches Monter / Descendre (script de
   * Nova, pas moveup). Replis gardés par navigateur et par classe (localStorage). Glisser-déposer par la poignée : carte
   * repliée qui suit le pointeur, silhouette à sa place, les autres s'écartent ; requête en arrière-plan (nova_seq_de,
   * nova_seq_vers : _widgets/sequences.phtml, _procs/sequences.sh), puis la page est relue (numéros et liens de WIMS),
   * même position à l'écran. Ressources de chaque séquence : petites pastilles d'état. Réglage std-listes. */
  function sequencesEnseignant() {
    var tx = document.getElementById('nova-seq-textes');
    if (!tx || standard('listes')) return;
    var t = function (k, n) { return (tx.getAttribute('data-' + k) || '').replace('%1', n == null ? '' : n); };
    var el = function (tag, classe, texte) { var e = document.createElement(tag); if (classe) e.className = classe; if (texte) e.textContent = texte; return e; };
    var icone = function (nom) { var s = el('span', 'nova-etat-ico'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('data-icone', nom); return s; };
    var majuscule = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
    var propre = function (s) { return majuscule(s.replace(/\s+/g, ' ').replace(/^\s*\(\s*|\s*\)\s*$/g, '').trim()); };
    var lire = function (cle, k) { try { return JSON.parse(k.getItem(cle) || 'null'); } catch (e) { return null; } };
    var ecrire = function (cle, v, k) { try { if (v === null) k.removeItem(cle); else k.setItem(cle, JSON.stringify(v)); } catch (e) { /* sans stockage */ } };
    var mc = document.querySelector('meta[name="nova-classe"]');
    var clePlis = 'nova_seq_plis_' + (mc ? mc.content : '');

    var cartes = Array.prototype.filter.call(document.querySelectorAll('.wimsbody div.wims_seq[id^="wims_seq_"]'), function (d) {
      return d.querySelector(':scope > .wims_content_seq > .wims_seq_actions') && d.querySelector(':scope > h2.wims_title_seq');
    });
    if (!cartes.length) return;
    var numero = function (d) { return +d.id.replace('wims_seq_', ''); };
    var plis = lire(clePlis, localStorage) || [];
    var menus = menusEtat(), occupe = false;

    function plier(d, oui) {
      var b = d.querySelector('.nova-seq-plier'), c = d.querySelector(':scope > .wims_content_seq');
      d.classList.toggle('nova-seq-pliee', oui);
      if (c) c.hidden = oui;
      b.setAttribute('aria-expanded', oui ? 'false' : 'true');
      b.setAttribute('aria-label', t(oui ? 'deplier' : 'plier'));
      b.title = t(oui ? 'deplier' : 'plier');
    }
    function garderPlis() {
      plis = cartes.filter(function (d) { return d.classList.contains('nova-seq-pliee'); }).map(numero);
      ecrire(clePlis, plis.length ? plis : null, localStorage);
    }
    // Position à l'écran de la carte qui va bouger, retrouvée après le rechargement.
    function garderVue(d, n) { ecrire('nova_seq_vue', { n: n, y: Math.round(d.getBoundingClientRect().top) }, sessionStorage); }

    cartes.forEach(function (d, i) {
      var n = numero(d), h2 = d.querySelector(':scope > h2.wims_title_seq'), contenu = d.querySelector(':scope > .wims_content_seq');
      var actions = contenu.querySelector(':scope > .wims_seq_actions');
      var lien = function (job) { return actions.querySelector('a[href*="job=' + job + '"]'); };
      var modifier = lien('addseq'), monter = lien('moveup'), effacer = lien('delete'), bascule = lien('changeopt');
      var statut = h2.querySelector('.wims_status');
      var tete = el('div', 'nova-seq-tete');
      h2.parentNode.insertBefore(tete, h2);

      var poignee = el('span', 'nova-seq-poignee');
      poignee.title = t('glisser');
      poignee.appendChild(icone('poignee'));
      if (cartes.length > 1) tete.appendChild(poignee);
      var chevron = el('button', 'nova-seq-plier');
      chevron.type = 'button';
      chevron.appendChild(icone('replier'));
      contenu.id = contenu.id || 'nova-seq-contenu-' + n;
      chevron.setAttribute('aria-controls', contenu.id);
      chevron.addEventListener('click', function () { plier(d, !d.classList.contains('nova-seq-pliee')); garderPlis(); });
      tete.appendChild(chevron);
      tete.appendChild(h2);
      var titre = (h2.querySelector('.wims_title_item') || h2).textContent.replace(/\s+/g, ' ').trim();

      if (statut) {
        var etat = +((/wims_status_(\d)/.exec(statut.className) || [])[1] || 0);
        var pastille = el(bascule || effacer ? 'button' : 'span', 'nova-etat nova-etat-' + (etat === 1 ? 'ok' : 'neutre'));
        pastille.appendChild(icone(etat === 1 ? 'coche' : 'crayon'));
        pastille.appendChild(el('span', 'nova-etat-nom', propre(statut.textContent)));
        statut.parentNode.removeChild(statut);
        tete.appendChild(pastille);
        if (bascule || effacer) {
          pastille.type = 'button';
          pastille.appendChild(el('span', 'nova-etat-chevron'));
          var menu = el('div', 'nova-etat-menu');
          menu.id = 'nova-seq-menu-' + n;
          menu.setAttribute('role', 'menu');
          menu.setAttribute('aria-label', titre);
          menu.hidden = true;
          var action = function (a, ico, effet, danger) {
            var libelle = a.textContent.trim();
            a.className = 'nova-etat-action' + (danger ? ' nova-etat-danger' : '');
            a.setAttribute('role', 'menuitem');
            a.setAttribute('tabindex', '-1');
            a.textContent = '';
            a.appendChild(icone(ico));
            var tt = el('span', 'nova-etat-texte', libelle);
            tt.appendChild(el('small', '', effet));
            a.appendChild(tt);
            menu.appendChild(a);
          };
          if (bascule) {
            var activer = /[?&]option=1/.test(bascule.getAttribute('href'));
            action(bascule, activer ? 'lecture' : 'oeil-barre', t(activer ? 'activer' : 'desactiver'));
          }
          if (bascule && effacer) { var hr = el('hr'); hr.setAttribute('role', 'separator'); menu.appendChild(hr); }
          if (effacer) action(effacer, 'corbeille', t('effacer'), true);
          menus.brancher(pastille, menu);
        }
      }
      if (modifier) {
        modifier.className = 'nova-etat-modifier nova-seq-modifier';
        modifier.insertBefore(icone('crayon'), modifier.firstChild);
        tete.appendChild(modifier);
      }
      // Monter, Descendre : le script de Nova (comme le glisser), pas moveup de WIMS (2026-11-13, utilisateur : « Descendre »
      // par moveup de la suivante bougeait d'autres cartes). Grisés en tête et en fin de liste.
      if (cartes.length > 1) {
        var groupe = el('div', 'nova-seq-deplacer');
        var fleche = function (sens, actif, cible) {
          var f = el(actif ? 'button' : 'span', 'nova-seq-fleche');
          f.appendChild(icone(sens === 'monter' ? 'fleche-haut' : 'fleche-bas'));
          f.setAttribute('aria-label', t(sens));
          f.title = t(sens);
          if (!actif) f.setAttribute('aria-disabled', 'true');
          else {
            f.type = 'button';
            f.addEventListener('click', function () {
              if (occupe) return;
              var autre = cartes[cible - 1];
              if (autre) autre.parentNode.insertBefore(d, cible < n ? autre : autre.nextSibling);
              enregistrer(d, n, cible);
            });
          }
          groupe.appendChild(f);
        };
        fleche('monter', i > 0, n - 1);
        fleche('descendre', i < cartes.length - 1, n + 1);
        tete.appendChild(groupe);
      }
      if (monter) monter.remove();
      actions.parentNode.removeChild(actions);
      d.classList.add('nova-seq');
      plier(d, plis.indexOf(n) >= 0);

      // Ressources : petites pastilles d'état, sans parenthèses.
      Array.prototype.forEach.call(contenu.querySelectorAll('li > .wims_status'), function (s) {
        var e = +((/wims_status_(\d)/.exec(s.className) || [])[1] || 0);
        s.classList.add('nova-etat', 'nova-etat-petit', 'nova-etat-' + (e === 1 ? 'ok' : e === 0 ? 'neutre' : 'attention'));
        s.textContent = propre(s.textContent);
      });
    });

    // Barre au-dessus de la liste : nombre de séquences, Tout replier, Tout déplier.
    var outils = el('div', 'nova-seq-outils');
    outils.appendChild(el('p', 'nova-seq-compte', cartes.length === 1 ? t('compte-1') : t('compte', cartes.length)));
    var etatEnvoi = el('p', 'nova-seq-envoi');
    etatEnvoi.setAttribute('role', 'status');
    outils.appendChild(etatEnvoi);
    var boutons = el('div', 'nova-seq-tout');
    [['tout-plier', 'tout-replier', true], ['tout-deplier', 'tout-deplier', false]].forEach(function (b) {
      var x = el('button', 'nova-seq-tout-b');
      x.type = 'button';
      x.appendChild(icone(b[1]));
      x.appendChild(document.createTextNode(t(b[0])));
      x.addEventListener('click', function () { cartes.forEach(function (d) { plier(d, b[2]); }); garderPlis(); });
      boutons.appendChild(x);
    });
    if (cartes.length > 1) outils.appendChild(boutons);
    cartes[0].parentNode.insertBefore(outils, cartes[0]);

    // Retour après un déplacement : même position à l'écran, carte marquée un instant.
    var vue = lire('nova_seq_vue', sessionStorage);
    ecrire('nova_seq_vue', null, sessionStorage);
    if (vue && document.getElementById('wims_seq_' + vue.n)) {
      var arrivee = document.getElementById('wims_seq_' + vue.n);
      window.scrollBy(0, arrivee.getBoundingClientRect().top - vue.y);
      arrivee.classList.add('nova-seq-arrivee');
      setTimeout(function () { arrivee.classList.remove('nova-seq-arrivee'); }, 1600);
    }

    // Déplacement enregistré (flèches, glisser) : requête en arrière-plan, puis la page est relue.
    function enregistrer(d, de, vers) {
      occupe = true;
      document.documentElement.classList.add('nova-occupe');
      etatEnvoi.textContent = t('enregistrement');
      var nouveau = function (k) {
        if (k === de) return vers;
        if (de < vers && k > de && k <= vers) return k - 1;
        if (de > vers && k >= vers && k < de) return k + 1;
        return k;
      };
      var debut = Date.now();
      var relire = function (attente) {
        setTimeout(function () { location.href = lienSession('&cmd=new&module=adm%2Fclass%2Fsequence&job=show'); }, attente);
      };
      fetch(lienSession('&cmd=new&module=adm%2Fclass%2Fsequence&job=show&nova_seq_de=' + de + '&nova_seq_vers=' + vers), { credentials: 'same-origin' })
        .then(function (r) { return r.text(); })
        .then(function (texte) {
          var ok = /id="nova-seq-fait"[^>]*data-resultat="ok"/.test(texte);
          if (!ok) throw new Error('refus');
          plis = plis.map(nouveau);
          ecrire(clePlis, plis.length ? plis : null, localStorage);
          garderVue(d, vers);
          debut = Date.now();
          relire(1500);
        })
        .catch(function () {
          etatEnvoi.textContent = t('erreur');
          relire(Math.max(2500, 1500 - (Date.now() - debut)));
        });
    }

    // Glisser-déposer par la poignée (souris, doigt, stylet ; 2026-11-13, utilisateur) : la carte suit le pointeur, repliée
    // le temps du glisser ; à sa place, une silhouette de carte repliée (pointillés) ; les autres cartes s'écartent pour
    // lui faire place (glissement animé seulement si les animations sont permises).
    function glisser(d, ev) {
      var anime = !animationsCoupees();
      var r0 = d.getBoundingClientRect(), rang0 = cartes.indexOf(d), boucle = 0, dernier = ev.clientY;
      var autres = cartes.filter(function (c) { return c !== d; });
      var parent = d.parentNode, cs = getComputedStyle(d);
      var ecart = ev.clientY - r0.top;
      d.classList.add('nova-seq-souleve', 'nova-seq-pliee-glisse');
      var hauteur = d.getBoundingClientRect().height;
      if (ecart > hauteur - 8) ecart = hauteur / 2;
      var place = el('div', 'nova-seq-place');
      place.setAttribute('aria-hidden', 'true');
      place.style.height = Math.round(hauteur) + 'px';
      place.style.marginTop = cs.marginTop;
      place.style.marginBottom = cs.marginBottom;
      place.style.marginLeft = cs.marginLeft;
      place.style.marginRight = cs.marginRight;
      // Positions avant un changement, pour faire glisser les cartes de l'ancienne place à la nouvelle.
      var positions = function () { return autres.map(function (c) { return c.getBoundingClientRect().top; }); };
      var glissement = function (avant) {
        if (!anime) return;
        autres.forEach(function (c, k) {
          var dy = avant[k] - c.getBoundingClientRect().top;
          if (Math.abs(dy) > 1 && c.animate) c.animate([{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], { duration: 160, easing: 'ease-out' });
        });
      };
      var avant = positions();
      parent.insertBefore(place, d);
      d.style.left = Math.round(r0.left) + 'px';
      d.style.width = Math.round(r0.width) + 'px';
      d.style.top = Math.round(dernier - ecart) + 'px';
      d.classList.add('nova-seq-volant');
      glissement(avant);
      document.documentElement.classList.add('nova-seq-glisse');
      menus.fermer(false);
      // Milieu des voisines, déduit de la silhouette (jamais animée) : leurs positions à l'écran glissent encore.
      var espace = function (a, b) { return Math.max(parseFloat(getComputedStyle(a).marginBottom) || 0, parseFloat(getComputedStyle(b).marginTop) || 0); };
      var voisine = function (sens) {
        var x = sens < 0 ? place.previousElementSibling : place.nextElementSibling;
        while (x && autres.indexOf(x) < 0) x = x === d ? (sens < 0 ? x.previousElementSibling : x.nextElementSibling) : null;
        return x;
      };
      function suivre() {
        d.style.top = Math.round(dernier - ecart) + 'px';
        var bouge = false, av = positions();
        for (var garde = 0; garde < cartes.length; garde++) {
          var r = place.getBoundingClientRect(), prec = voisine(-1), suiv = voisine(1);
          if (prec && dernier < r.top - espace(prec, place) - prec.offsetHeight / 2) { parent.insertBefore(place, prec); bouge = true; }
          else if (suiv && dernier > r.bottom + espace(place, suiv) + suiv.offsetHeight / 2) { parent.insertBefore(place, suiv.nextSibling); bouge = true; }
          else break;
        }
        if (bouge) glissement(av);
      }
      function defiler() {
        var marge = 72, v = 0;
        if (dernier < marge) v = -Math.ceil((marge - dernier) / 4);
        else if (dernier > window.innerHeight - marge) v = Math.ceil((dernier - window.innerHeight + marge) / 4);
        if (v) { window.scrollBy(0, v); suivre(); }
        boucle = requestAnimationFrame(defiler);
      }
      function bouger(e) { dernier = e.clientY; suivre(); }
      function rangPlace() {
        var k = 0;
        for (var x = parent.firstElementChild; x && x !== place; x = x.nextElementSibling) if (autres.indexOf(x) >= 0) k++;
        return k;
      }
      function finir(garder) {
        cancelAnimationFrame(boucle);
        document.removeEventListener('pointermove', bouger);
        document.removeEventListener('pointerup', lacher);
        document.removeEventListener('pointercancel', annuler);
        document.removeEventListener('keydown', echap, true);
        var rang = garder ? rangPlace() : rang0;
        var av = positions();
        if (rang !== rang0) parent.insertBefore(d, place);
        place.remove();
        d.classList.remove('nova-seq-souleve', 'nova-seq-pliee-glisse', 'nova-seq-volant');
        d.style.left = d.style.width = d.style.top = '';
        document.documentElement.classList.remove('nova-seq-glisse');
        glissement(av);
        if (rang === rang0) return;
        enregistrer(d, numero(d), rang + 1);
      }
      function lacher() { finir(true); }
      function annuler() { finir(false); }
      function echap(e) { if (e.key === 'Escape') { e.preventDefault(); finir(false); } }
      document.addEventListener('pointermove', bouger);
      document.addEventListener('pointerup', lacher);
      document.addEventListener('pointercancel', annuler);
      document.addEventListener('keydown', echap, true);
      boucle = requestAnimationFrame(defiler);
    }
    cartes.forEach(function (d) {
      var p = d.querySelector('.nova-seq-poignee');
      if (!p) return;
      p.addEventListener('pointerdown', function (ev) {
        if (occupe || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
        ev.preventDefault();
        glisser(d, ev);
      });
    });
  }

  /* Option « numéro seul, sans mot générique » des séquences (2026-11-12, utilisateur) : choisie par l'enseignant
   * (page Configurer, case de Nova ; enregistrée dans seq/.def par _widgets/sequences.phtml), montrée à tous : en-tête
   * « 3 » en pastille au lieu de « Chapitre 3 ». Option de la classe, pas une transformation par défaut : hors réglages std. */
  function sequencesNumero() {
    var seul = !!document.getElementById('nova-seq-numero');
    if (seul) {
      Array.prototype.forEach.call(document.querySelectorAll('.wimsbody .wims_seq_id'), function (s) {
        var m = /(\d+)\s*$/.exec(s.textContent);
        if (m) s.textContent = m[1];
        s.classList.add('nova-seq-num');
      });
    }
    var tx = document.getElementById('nova-seq-textes'), champ = document.querySelector('.wimsbody input#seq_Title');
    var form = champ && champ.form;
    if (!tx || !form) return;
    var cle = 'nova-seq-numero-case';
    var lab = document.createElement('label');
    lab.className = 'nova-seq-numero-choix';
    var c = document.createElement('input');
    c.type = 'checkbox';
    c.id = cle;
    c.checked = seul;
    lab.appendChild(c);
    lab.appendChild(document.createTextNode(' ' + tx.getAttribute('data-numero')));
    var aide = document.createElement('p');
    aide.className = 'nova-seq-numero-aide';
    aide.textContent = tx.getAttribute('data-numero-aide');
    champ.parentNode.appendChild(lab);
    champ.parentNode.appendChild(aide);
    var suivre = function () { champ.readOnly = c.checked; champ.classList.toggle('nova-seq-mot-inutile', c.checked); };
    c.addEventListener('change', suivre);
    suivre();
    // Paramètre inconnu du module : passé dans l'adresse du formulaire (lu par le widget dans QUERY_STRING).
    form.addEventListener('submit', function (ev) {
      var b = ev.submitter;
      if (b && b.name !== 'seq_set') return;
      var v = 'nova_seq_numero=' + (c.checked ? 'oui' : 'non');
      if ((form.getAttribute('method') || 'get').toLowerCase() === 'get') {
        var h = form.querySelector('input[name="nova_seq_numero"]') || document.createElement('input');
        h.type = 'hidden'; h.name = 'nova_seq_numero'; h.value = c.checked ? 'oui' : 'non';
        form.appendChild(h);
      } else {
        var act = (form.getAttribute('action') || 'wims.cgi').replace(/[?&]nova_seq_numero=[a-z]*/, '');
        form.setAttribute('action', act + (act.indexOf('?') >= 0 ? '&' : '?') + v);
      }
    });
  }

  /* Fenêtres de confirmation des ressources (2026-11-12, utilisateur, maquettes) : au lieu des pages d'avertissement de
   * WIMS, une fenêtre de Nova. Liens du menu de la pastille d'état (accueil) et du bandeau (feuille, examen).
   * - Activer ou effacer une feuille ou un examen, effacer un document ou un outil : la page de WIMS ne fait que demander
   *   (job=prep_…, deldoc sans step) ; lue en arrière-plan, son texte va dans la fenêtre, « Oui » de WIMS au bouton.
   * - Désactiver (feuille, examen, devoir libre) : WIMS désactive tout de suite quand rien ne s'y oppose ; envoyé sans
   *   fenêtre (choix de l'utilisateur : fenêtre seulement si WIMS a quelque chose à dire), puis selon la réponse :
   *   confirmation (scores effacés), contournement de Nova (#nova-forcer : remplirForcer, sauvegarde cochée), refus.
   * - Effacer un devoir libre : WIMS efface sans rien demander ; Nova demande.
   * Deux requêtes à moins d'1 s dans une session : la seconde est mal servie (1,5 s d'écart). Réglage std-listes. */
  function confirmationsRessources() {
    var tx = document.getElementById('nova-confirm-textes');
    if (!tx || standard('listes') || !window.fetch || !window.TextDecoder || !window.DOMParser || typeof document.createElement('dialog').showModal !== 'function') return;
    var t = function (k, n) { return (tx.getAttribute('data-' + k) || '').replace('%1', n == null ? '' : n); };
    var el = function (tag, classe, texte) { var e = document.createElement(tag); if (classe) e.className = classe; if (texte) e.textContent = texte; return e; };
    var icone = function (nom) { var s = el('span', 'nova-etat-ico'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('data-icone', nom); return s; };
    var occupe = false, dlg = null;

    function contexte(a) {
      var href = a.getAttribute('href') || '';
      var c = { href: a.href, job: (/[?&]\+?job=([a-z_]+)/.exec(href) || [])[1] || '', type: null, n: null, titre: '', accueil: false };
      ['sheet', 'exam', 'freework', 'doc', 'tool', 'seq'].some(function (k) {
        var m = new RegExp('[?&]\\+?' + k + '=(\\d+)').exec(href);
        if (m) { c.type = k; c.n = m[1]; }
        return !!m;
      });
      var menu = a.closest('.nova-etat-menu');
      if (menu) { c.accueil = true; c.titre = menu.getAttribute('aria-label') || ''; }
      if (!c.type) {
        var mod = document.querySelector('.wimsbody form input[name="module"]');
        var mm = mod && /adm\/class\/(sheet|exam)$/.exec(mod.value);
        if (mm) c.type = mm[1];
        var h = document.querySelector('.wimsbody h1.wims_title');
        var mn = h && /(\d+)\s*$/.exec(h.textContent.trim());
        if (mn) c.n = mn[1];
        var champ = document.querySelector('.wimsbody input#title');
        if (champ) c.titre = champ.value;
      }
      return c;
    }
    function flux(c) {
      if ((c.type === 'sheet' || c.type === 'exam') && (c.job === 'prep_activate' || c.job === 'prep_erase')) return 'lire';
      if ((c.type === 'doc' || c.type === 'tool') && c.job === 'deldoc') return 'lire';
      if (c.job === 'deactivate' && (c.type === 'sheet' || c.type === 'exam' || c.type === 'freework')) return 'envoyer';
      if (c.type === 'freework' && c.job === 'prep_erase') return 'nova';
      if (c.type === 'seq' && c.job === 'delete') return 'seq';
      return null;
    }
    // Page de la ressource ou accueil, à ouvrir après l'action (cmd=new : valable après une requête en arrière-plan).
    function suite(c) { return c.accueil ? lienAccueil('') : lienSession('&cmd=new&module=adm%2Fclass%2F' + c.type + '&' + c.type + '=' + c.n); }
    function aller(href, debut) { setTimeout(function () { location.href = href; }, Math.max(0, 1500 - (Date.now() - (debut || 0)))); }
    function lire(href) {
      return fetch(href, { credentials: 'same-origin' }).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
        return new DOMParser().parseFromString(new TextDecoder('windows-1252').decode(buf), 'text/html');
      });
    }

    // La fenêtre : icône, titre, nom de la ressource ; corps et boutons remplis ensuite.
    function fenetre(ico, ton, titre, sous) {
      if (dlg) dlg.remove();
      var d = el('dialog', 'nova-dialogue nova-conf');
      var fermer = el('button', 'close-button', '\u00d7');
      fermer.type = 'button';
      fermer.setAttribute('aria-label', t('b-fermer'));
      fermer.addEventListener('click', function () { if (!bloque()) d.close(); });
      d.appendChild(fermer);
      var tete = el('div', 'nova-conf-tete');
      var rond = el('span', 'nova-conf-ico nova-conf-' + ton);
      rond.appendChild(icone(ico));
      tete.appendChild(rond);
      var bloc = el('div');
      var h = el('h1', '', titre);
      h.id = 'nova-conf-titre';
      bloc.appendChild(h);
      if (sous) bloc.appendChild(el('p', 'nova-conf-sous', sous));
      tete.appendChild(bloc);
      d.appendChild(tete);
      d.setAttribute('aria-labelledby', h.id);
      var corps = el('div', 'nova-conf-corps');
      d.appendChild(corps);
      var boutons = el('div', 'nova-conf-boutons');
      d.appendChild(boutons);
      var bloque = function () { var a = d.querySelector('.wimscenter .wims_secondary_button'); return !!(a && a.disabled); };
      d.addEventListener('cancel', function (e) { if (bloque()) e.preventDefault(); });
      d.addEventListener('click', function (e) { if (e.target === d && !bloque()) d.close(); });
      d.addEventListener('close', function () { d.remove(); if (dlg === d) dlg = null; });
      document.body.appendChild(d);
      dlg = d;
      d.showModal();
      return { d: d, corps: corps, boutons: boutons };
    }
    function bouton(f, texte, genre, action) {
      var b = el('button', 'nova-conf-b' + (genre ? ' nova-conf-' + genre : ''), texte);
      b.type = 'button';
      b.addEventListener('click', function () { action(b); });
      f.boutons.appendChild(b);
      return b;
    }
    function annuler(f) { return bouton(f, t('b-annuler'), '', function () { f.d.close(); }); }

    // Texte de WIMS d'une page lue : ce qui suit le titre du module, sans ses boutons ni ses formulaires.
    function messageWims(doc) {
      var corps = doc.querySelector('.wimsbody');
      if (!corps) return null;
      var bloc = el('div', 'nova-conf-wims');
      var depart = corps.querySelector('#wims_class');
      for (var x = depart ? depart.nextSibling : corps.firstChild; x; x = x.nextSibling) {
        if (x.nodeType === 8) continue;
        if (x.nodeType === 1 && x.matches('form, fieldset, table, #wims_supervisor_list, #wimsmenumodubox')) break;
        if (x.nodeType === 1 && x.matches('script, style, template, #nova-forcer, #nova-propage, .nova-ariane')) continue;
        bloc.appendChild(document.importNode(x, true));
      }
      Array.prototype.forEach.call(bloc.querySelectorAll('script, style, input, select, textarea, button, iframe, form'), function (e) { e.remove(); });
      Array.prototype.forEach.call(bloc.querySelectorAll('a[href*="cmd=reply"], a[href*="cmd=resume"]'), function (a) {
        var c = a.closest('.wimscenter, p') || a;
        if (bloc.contains(c)) c.remove();
      });
      // Message de WIMS dans un cadre « alert » : le cadre est la fenêtre.
      var seul = bloc.children.length === 1 && !bloc.firstElementChild.previousSibling && bloc.firstElementChild.matches('.wims_msg.alert') ? bloc.firstElementChild : null;
      if (!seul) { var e1 = bloc.firstElementChild; if (e1 && e1.matches('.wims_msg.alert') && !bloc.textContent.replace(e1.textContent, '').trim()) seul = e1; }
      if (seul) { while (seul.firstChild) bloc.insertBefore(seul.firstChild, seul); seul.remove(); }
      // Comptes qui ont travaillé (désactivation d'une feuille) : liste repliée.
      Array.prototype.forEach.call(bloc.querySelectorAll('p.tt'), function (p) {
        var noms = p.textContent.trim().split(/\s+/).filter(Boolean);
        var det = el('details', 'nova-conf-comptes');
        det.appendChild(el('summary', '', t('comptes', noms.length)));
        det.appendChild(el('p', 'tt', noms.join(' ')));
        var avant = p.previousSibling;
        if (avant && avant.nodeType === 3 && avant.nodeValue.trim()) avant.remove();
        p.parentNode.replaceChild(det, p);
      });
      return bloc.textContent.trim() ? bloc : null;
    }
    function erreur(f) {
      f.corps.textContent = '';
      f.corps.appendChild(el('p', 'nova-conf-erreur', t('erreur')));
      f.boutons.textContent = '';
      bouton(f, t('b-fermer'), 'p', function () { f.d.close(); });
    }

    // Activer, effacer : la page de WIMS ne fait que demander.
    function demander(c) {
      var activer = c.job === 'prep_activate';
      var f = fenetre(activer ? 'lecture' : 'corbeille', activer ? 'a' : 'r', t((activer ? 'activer-' : 'effacer-') + c.type, c.n), c.titre);
      f.corps.appendChild(el('p', 'nova-conf-attente', '\u2026'));
      lire(c.href).then(function (doc) {
        var debut = Date.now();
        var motif = activer ? /job=activate\b/ : c.job === 'deldoc' ? /step=1/ : /job=erase\b/;
        var oui = Array.prototype.filter.call(doc.querySelectorAll('.wimsbody a[href*="cmd=reply"]'), function (a) { return motif.test(a.getAttribute('href')); })[0];
        var msg = messageWims(doc);
        f.corps.textContent = '';
        if (msg) f.corps.appendChild(msg);
        if (!oui) {
          bouton(f, t('b-page'), '', function () { location.href = c.href; });
          bouton(f, t('b-fermer'), 'p', function () { f.d.close(); });
          return;
        }
        annuler(f);
        bouton(f, t(activer ? 'b-activer' : 'b-effacer'), activer ? 'p' : 'r', function (b) { b.disabled = true; aller(oui.href, debut); }).focus();
      }).catch(function () { erreur(f); });
    }

    // Désactiver : envoyé tout de suite ; fenêtre seulement si WIMS a quelque chose à dire.
    function desactiver(c) {
      document.documentElement.classList.add('nova-occupe');
      lire(c.href).then(function (doc) {
        document.documentElement.classList.remove('nova-occupe');
        var debut = Date.now();
        var forcer = doc.getElementById('nova-forcer');
        var oui = doc.querySelector('.wimsbody a[href*="job=deactivate"][href*="confirm=yes"]');
        var msg = messageWims(doc);
        var cause = function (f) {
          if (!msg) return;
          var boite = el('div', 'nova-conf-cause');
          boite.appendChild(el('b', '', t('wims-refuse')));
          boite.appendChild(msg);
          f.corps.appendChild(boite);
        };
        if (forcer && !forcer.hasAttribute('data-refus')) {
          var titreF = (forcer.getAttribute('data-titre') || '').replace('%1', c.n);
          var f1 = fenetre('alerte', 'r', titreF || t('refus-' + c.type, c.n), c.titre);
          cause(f1);
          f1.boutons.remove();
          var fait = remplirForcer(forcer, f1.d, c.n, c.accueil ? lienAccueil('') : null);
          fait.annuler.addEventListener('click', function () { f1.d.close(); });
          fait.ok.focus();
          return;
        }
        if (oui) {
          var travail = !!(msg && msg.querySelector('.nova-conf-comptes'));
          var f2 = fenetre('alerte', 'r', travail && c.type === 'sheet' ? t('travail-sheet', c.n) : t('desactiver-' + c.type, c.n), c.titre);
          if (msg) f2.corps.appendChild(msg);
          annuler(f2);
          bouton(f2, t(travail ? 'b-scores' : 'b-desactiver'), 'r', function (b) { b.disabled = true; aller(oui.href, debut); });
          return;
        }
        var fait0 = doc.querySelector('.wimsbody .field .wims_status_0, .wimsbody .wims_msg.success') ||
          (function () { var tb = doc.getElementById('TABLE_supervisor_' + c.type); var tr = tb && tb.querySelectorAll('tbody > tr')[c.n - 1]; return tr && tr.querySelector('.wims_status_0'); })();
        if (fait0 || !msg) { aller(suite(c), debut); return; }
        // Refus : raison de WIMS, et ce que Nova en dit (classe qui ne permet pas de passer outre…).
        var f3 = fenetre('alerte', 'r', t('refus-' + c.type, c.n), c.titre);
        cause(f3);
        if (forcer && forcer.getAttribute('data-refus')) f3.corps.appendChild(el('p', '', forcer.getAttribute('data-refus')));
        bouton(f3, t('b-fermer'), 'p', function () { f3.d.close(); }).focus();
        f3.d.addEventListener('close', function () { aller(suite(c), debut); });
      }).catch(function () {
        document.documentElement.classList.remove('nova-occupe');
        erreur(fenetre('alerte', 'r', t('desactiver-' + c.type, c.n), c.titre));
      });
    }

    // Effacer un devoir libre : WIMS ne demande rien.
    function effacerDevoir(c) {
      var f = fenetre('corbeille', 'r', t('effacer-freework', c.n), c.titre);
      f.corps.appendChild(el('p', '', t('fw-effacer')));
      annuler(f).focus();
      bouton(f, t('b-effacer'), 'r', function (b) { b.disabled = true; location.href = c.href; });
    }

    // Effacer une séquence (menu de sa pastille, sequencesEnseignant) : WIMS efface sans rien demander ; Nova demande.
    function effacerSequence(c) {
      var f = fenetre('corbeille', 'r', t('effacer-seq', c.n), c.titre);
      f.corps.appendChild(el('p', '', t('seq-effacer')));
      annuler(f).focus();
      bouton(f, t('b-effacer'), 'r', function (b) { b.disabled = true; location.href = c.href; });
    }

    document.addEventListener('click', function (ev) {
      if (ev.defaultPrevented || ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
      var a = ev.target.closest && ev.target.closest('.nova-etat-menu a[href], .nova-statut-actions a[href]');
      if (!a) return;
      var c = contexte(a), genre = c.type && c.n ? flux(c) : null;
      if (!genre) return;
      ev.preventDefault();
      document.dispatchEvent(new CustomEvent('nova-fermer-menus'));
      if (occupe) return;
      occupe = true;
      setTimeout(function () { occupe = false; }, 1500);
      if (genre === 'lire') demander(c);
      else if (genre === 'envoyer') desactiver(c);
      else if (genre === 'seq') effacerSequence(c);
      else effacerDevoir(c);
    });
  }

  /* ===== js/src/80-reglages.js : pages Apparence et « Réglages de Nova », réglages lus dans les feuilles ===== */
  /* Page Apparence de la maintenance du site (gestionnaire ; demande de l'utilisateur, 2026-10-06,
   * maquette A) : carte « Réglages de Nova » (template#nova-apparence, header.phtml) au-dessus du formulaire
   * de WIMS, avec les champs cachés de celui-ci (session, module…) ; les réglages de WIMS sans effet avec Nova
   * (data-sans-effet : conf_N) repliés derrière « Les afficher ». */
  function apparenceNova() {
    var modele = document.getElementById('nova-apparence');
    var formWims = document.querySelector('.wimsbody form input[name="save"]');
    formWims = formWims && formWims.form;
    if (!modele || !formWims || !modele.content) return;
    var bloc = modele.content.cloneNode(true);
    var form = bloc.querySelector('form.nova-app');
    Array.prototype.forEach.call(formWims.querySelectorAll('input[type="hidden"]'), function (h) { form.appendChild(h.cloneNode(true)); });
    formWims.parentNode.insertBefore(bloc, formWims);
    pageApparence(formWims, modele);
    var sans = (modele.getAttribute('data-sans-effet') || '').split(',').filter(Boolean);
    replierSansEffet(sans.map(function (n) { var c = formWims.querySelector('[name="' + n + '"]'); return c && c.closest('li'); }), modele);
  }

  // Page Apparence (site ou classe) : largeur limitée et aide près de son libellé (CSS, .nova-page-apparence) ;
  // « Couleur de fond des menus », couleur d'accent de Nova, devient « Couleur du thème » (demandes de
  // l'utilisateur, 2026-10-06).
  function pageApparence(form, modele) {
    document.body.classList.add('nova-page-apparence');
    var champ = form.querySelector('[name="' + modele.getAttribute('data-champ-theme') + '"]');
    var label = champ && document.querySelector('label[for="' + champ.id + '"]');
    var texte = modele.getAttribute('data-couleur-theme');
    if (label && texte && !standard('textes')) {
      var noeud = Array.prototype.filter.call(label.childNodes, function (n) { return n.nodeType === 3 && n.nodeValue.trim(); })[0];
      if (noeud) noeud.nodeValue = texte + ' '; else label.insertBefore(document.createTextNode(texte + ' '), label.firstChild);
    }
  }

  // Réglages de WIMS sans effet avec Nova : repliés derrière « Les afficher » (maquette A, 2026-10-06).
  function replierSansEffet(lignes, modele) {
    lignes = lignes.filter(Boolean);
    if (!lignes.length) return;
    lignes.forEach(function (li) { li.hidden = true; li.classList.add('nova-sans-effet'); });
    lignes.sort(function (a, b) { return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; });
    var repli = document.createElement('p');
    repli.className = 'nova-app-repli';
    var texte = document.createElement('span');
    texte.textContent = lignes.length + ' ' + modele.getAttribute('data-masques') + ' ';
    var bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'nova-app-repli-bouton';
    bouton.textContent = modele.getAttribute('data-afficher');
    bouton.setAttribute('aria-expanded', 'false');
    bouton.addEventListener('click', function () {
      var ouvrir = bouton.getAttribute('aria-expanded') !== 'true';
      lignes.forEach(function (li) { li.hidden = !ouvrir; });
      bouton.setAttribute('aria-expanded', ouvrir ? 'true' : 'false');
      bouton.textContent = modele.getAttribute(ouvrir ? 'data-masquer' : 'data-afficher');
    });
    repli.appendChild(texte);
    repli.appendChild(bouton);
    // En bas du cadre, avant ses boutons (Enregistrer…), sur toute la largeur ; sinon après la liste (ul).
    var dernier = lignes[lignes.length - 1];
    var cadre = dernier.closest('fieldset');
    var actions = cadre && cadre.querySelector(':scope > .wimsform, :scope > .actions, :scope > .wimscenter');
    if (actions) cadre.insertBefore(repli, actions);
    else {
      var apres = dernier.parentNode.tagName === 'UL' ? dernier.parentNode : dernier;
      apres.parentNode.insertBefore(repli, apres.nextSibling);
    }
  }

  /* Page Apparence de la configuration d'une classe, d'un groupement ou d'un portail (adm/class/config ;
   * demande de l'utilisateur, 2026-10-06) : même carte, mais les choix sont écrits dans la zone de texte de la
   * feuille de style de la classe (#pr_cssfile), en un bloc « html:root { --nova-… } » (pas de « : » en début
   * de ligne : WIMS lit cette feuille par !record, qui y couperait), enregistré par le bouton de WIMS. La zone
   * reçoit d'abord la feuille complète (#nova-css-classe-complete) : WIMS la tronque au premier « :root ». */
  /* Page « Réglages de Nova » (demande de l'utilisateur, 2026-11-08, maquette B : onglets) : rubrique de la configuration
   * d'une classe, d'un groupement ou d'un portail (local.phtml, rubriqueReglages). C'est la page Apparence de WIMS
   * (job=present#nova-reglages, html.nova-page-reglages posée par le script de tête), dont le formulaire est masqué : il
   * sert à enregistrer la feuille de style (#pr_cssfile, WIMS : scripts/setdefr.proc). Deux blocs, propagés à part :
   * « Nova : reglages de la page Apparence » (champs nova_c_…, reglagesApparence) et « Nova : badges » (champs data-cle,
   * DM WIMS compris, reglagesBadges). Chaque bloc n'est réécrit que si l'un de ses champs a changé : sinon la classe
   * garderait toutes les valeurs en dur et ne suivrait plus le portail ou le site (vu le 2026-10-09).
   * Sur la page Apparence elle-même : réglages de WIMS seulement, et un lien vers cette page. */
  function apparenceClasse() {
    var racine = document.documentElement;
    var modele = document.getElementById('nova-reglages-classe');
    var zone = document.getElementById('pr_cssfile');
    if (!modele || !modele.content || !zone || !zone.form) { racine.classList.remove('nova-page-reglages'); return; }
    var formWims = zone.form;
    var complet = document.getElementById('nova-css-classe-complete');
    var texteComplet = complet ? complet.textContent.trim() : '';
    if (texteComplet && zone.value.trim() !== texteComplet) zone.value = texteComplet;
    // Même adresse, autre ancre (lien de la page, menu) : le navigateur ne recharge pas. Recharger pour changer de page.
    window.addEventListener('hashchange', function () {
      if (/^#nova(-|%2D)(badges(-|%2D))?reglages$/i.test(location.hash) !== racine.classList.contains('nova-page-reglages')) location.reload();
    });
    if (!racine.classList.contains('nova-page-reglages')) {
      var menu = document.querySelector('#wimsmenumodubox .nova_reglages > a');
      var p = document.createElement('p');
      p.className = 'wims_msg info nova-rg-lien';
      p.appendChild(document.createTextNode(modele.getAttribute('data-lien') + ' '));
      var a = document.createElement('a');
      a.href = menu ? menu.href : location.href.split('#')[0] + '#nova-reglages';
      a.textContent = modele.getAttribute('data-lien-texte');
      p.appendChild(a);
      formWims.parentNode.insertBefore(p, formWims);
      pageApparence(formWims, modele);
      var sans = (modele.getAttribute('data-sans-effet') || '').split(',').filter(Boolean);
      // « Transférer un fichier css » partage son cadre avec la zone de texte (où Nova écrit) : seul son
      // paragraphe est replié (data-sans-effet-ligne ; demande de l'utilisateur, 2026-10-07).
      var lignesSeules = (modele.getAttribute('data-sans-effet-ligne') || '').split(',').filter(Boolean);
      replierSansEffet(sans.map(function (n) { var c = formWims.querySelector('[name="' + n + '"]'); return c && c.closest('.field, li'); })
        .concat(lignesSeules.map(function (n) { var c = formWims.querySelector('[name="' + n + '"]'); return c && c.closest('p'); })), modele);
      return;
    }
    formWims.parentNode.insertBefore(modele.content.cloneNode(true), formWims);
    var carte = formWims.previousElementSibling;
    // Retour d'un enregistrement (script de tête) : ancre remise sans recharger, message.
    if (racine.classList.contains('nova-reglages-retour')) {
      try { sessionStorage.removeItem('nova-reglages-enregistre'); } catch (e) { /* rien */ }
      try { history.replaceState(null, '', location.href.split('#')[0] + '#nova-reglages'); } catch (e) { /* adresse gardée */ }
      var ok = document.createElement('p');
      ok.className = 'wims_msg success nova-rg-enregistre';
      ok.setAttribute('role', 'status');
      ok.textContent = modele.getAttribute('data-enregistre') || 'Saved.';
      carte.insertBefore(ok, carte.firstChild);
    }
    var nom = modele.getAttribute('data-titre');
    var titre = document.querySelector('.wimsbody h1.wims_title');
    if (titre) titre.textContent = nom;
    document.title = nom;
    // Fil d'Ariane : dernier élément (« * » sur la page Apparence de WIMS) au nom de la page.
    var fil = document.querySelector('ul.breadcrumbs > li:last-child');
    if (fil) {
      var marche = document.createTreeWalker(fil, NodeFilter.SHOW_TEXT);
      for (var mot = marche.nextNode(); mot; mot = marche.nextNode()) {
        if (!mot.nodeValue.trim() || mot.parentNode.closest('.show-for-sr')) continue;
        mot.nodeValue = nom;
        break;
      }
    }
    couleurTheme(carte, formWims, modele);
    var app = reglagesApparence(carte, zone, modele);
    var bdg = reglagesBadges(carte, zone);
    motsCles(carte, modele);
    var onglets = ongletsReglages(carte, nom);
    // Réglages de « Mon activité » (2026-11-08, utilisateur) : dépliés d'office quand la page est sur « Oui », masqués
    // sur « Non » (ils ne servent à rien). Ses dates de vacances ne bloquent alors plus l'enregistrement.
    var actDetail = carte.querySelector('.nova-app-activite > details.nova-app-detail');
    var activiteOui = function () { var r = carte.querySelector('input[name="nova_c_activite"]:checked'); return !!r && r.value === 'oui'; };
    if (actDetail) {
      actDetail.open = true;
      actDetail.classList.add('nova-rg-deplie');
      var suivreActivite = function () { actDetail.hidden = !activiteOui(); };
      [].forEach.call(carte.querySelectorAll('input[name="nova_c_activite"]'), function (r) { r.addEventListener('change', suivreActivite); });
      suivreActivite();
    }
    var enregistrer = carte.querySelector('.nova-app-enregistrer');
    var envoi = formWims.querySelector('input[name="save"]');
    if (enregistrer && envoi) enregistrer.addEventListener('click', function () {
      if ((!actDetail || activiteOui()) && app.erreurs()) { onglets.montrer('eleves'); app.montrer(); return; }   // dates non comprises : rien d'envoyé
      if (app.touche()) app.ecrire();
      if (bdg.touche()) bdg.ecrire();
      try { sessionStorage.setItem('nova-reglages-enregistre', JSON.stringify({ quand: Date.now() })); } catch (e) { /* page Apparence au retour */ }
      envoi.click();
    });
    racine.classList.add('nova-reglages-prete');
  }

  /* « Couleur du thème » dans l'onglet Affichage (demande de l'utilisateur, 2026-11-12) : relié au champ de WIMS
   * (pr_refcolor, « Couleur de fond des menus », formulaire masqué de la page), enregistré avec lui : c'est la même
   * couleur que sur la page Apparence. Gris de WIMS (#676767, personne ne l'a choisi) : la couleur en vigueur est
   * montrée, rien n'est écrit tant que l'enseignant n'y touche pas. Aperçu en direct sur la page. */
  function couleurTheme(carte, form, modele) {
    var choix = carte.querySelector('.nova-app-couleur-choix');
    if (!choix) return;
    var champ = form.querySelector('[name="' + modele.getAttribute('data-champ-theme') + '"]');
    if (!champ) { choix.closest('.nova-app-ligne').hidden = true; return; }
    var hexa = /^#[0-9a-f]{6}$/i;
    var v = (champ.value || '').trim();
    if (!hexa.test(v) || /^#676767$/i.test(v)) {
      v = getComputedStyle(document.documentElement).getPropertyValue('--nova-accent').trim();
      if (!hexa.test(v)) v = '#7a3b69';
    }
    choix.value = v.toLowerCase();
    choix.addEventListener('input', function () {
      champ.value = choix.value;
      document.documentElement.style.setProperty('--nova-accent', choix.value);
    });
  }

  // Bloc « Nova : reglages de la page Apparence » : champs nova_c_… (affichage, élèves, interrupteur des badges, avancés).
  function reglagesApparence(carte, zone, modele) {
    var cles = ['animations', 'entree-directe', 'clavier-maths', 'badges', 'activite', 'fil-fixe', 'decorations', 'desactivation-forcee'].concat(CLES_STANDARD.map(function (k) { return 'std-' + k; }));
    // Nombres (page « Mon activité », 2026-10-08) : champ vide = valeur héritée (portail, groupement, site).
    var nombres = ['activite-seuil', 'activite-objectif', 'activite-heures', 'activite-notes'];
    var marque = '/* Nova : reglages de la page Apparence */';
    // La carte lit la zone de texte : au chargement, et quand le prof modifie lui-même le bloc Nova.
    var bloc = function () { return /\/\* Nova : reglages de la page Apparence \*\/\s*html:root\s*\{([^}]*)\}/.exec(zone.value); };
    var lire = function () {
      var lus = {};
      (zone.value.match(/--nova-[a-z-]+\s*:\s*(oui|non)/g) || []).forEach(function (d) {
        var m = /--nova-([a-z-]+)\s*:\s*(oui|non)/.exec(d); lus[m[1]] = m[2];
      });
      cles.forEach(function (k) {
        // Valeur de la feuille de la classe, sinon valeur en vigueur (site, portail).
        var v = lus[k] || getComputedStyle(document.documentElement).getPropertyValue('--nova-' + k).trim().replace(/["']/g, '');
        var r = carte.querySelector('input[name="nova_c_' + k + '"][value="' + (v === 'oui' ? 'oui' : 'non') + '"]');
        if (r) r.checked = true;
      });
      nombres.forEach(function (k) {
        var champ = carte.querySelector('input[name="nova_c_' + k + '"]');
        if (!champ) return;
        var m = new RegExp('--nova-' + k + '\\s*:\\s*(\\d+)').exec(zone.value);
        champ.value = m ? m[1] : '';
        champ.placeholder = getComputedStyle(document.documentElement).getPropertyValue('--nova-' + k).trim();
      });
      // Rubriques masquées aux élèves : bloc de la classe s'il le dit, sinon valeur en vigueur (site, structure).
      var m2 = /--nova-masques-eleves\s*:\s*([^;}\n]*)/.exec(zone.value);
      var mc2 = /--nova-communication-eleves\s*:\s*(oui|non)/.exec(zone.value);
      var masques = m2 ? m2[1].trim().split(/[\s,]+/) : mc2 ? (mc2[1] === 'non' ? ['communication'] : []) : rubriquesMasquees(getComputedStyle(document.documentElement));
      carte.querySelectorAll('input[name="nova_c_masque"]').forEach(function (c) { c.checked = masques.indexOf(c.value) >= 0; });
    };
    lire();
    var vac = vacancesApparence(carte, zone, modele);
    var ecrire = function () {
      var decl = cles.map(function (k) {
        var r = carte.querySelector('input[name="nova_c_' + k + '"]:checked');
        return '--nova-' + k + ': ' + (r ? r.value : 'non') + ';';
      }).join(' ');
      nombres.forEach(function (k) {
        var champ = carte.querySelector('input[name="nova_c_' + k + '"]');
        var v = champ ? champ.value.trim() : '';
        if (/^\d+$/.test(v)) decl += ' --nova-' + k + ': ' + v + ';';
      });
      var choisies = [].filter.call(carte.querySelectorAll('input[name="nova_c_masque"]'), function (c) { return c.checked; }).map(function (c) { return c.value; });
      if (carte.querySelector('input[name="nova_c_masque"]')) decl += ' --nova-masques-eleves: ' + (choisies.join(' ') || 'aucune') + ';';
      // Autres déclarations --nova-… de l'ancien bloc (réglages ajoutés plus tard, ou écrits à la main) : gardées.
      var ancien = /\/\* Nova : reglages de la page Apparence \*\/\s*html:root\s*\{([^}]*)\}/.exec(zone.value);
      (ancien ? ancien[1].match(/--nova-[a-z0-9-]+\s*:\s*[^;}]+/g) || [] : []).forEach(function (d) {
        var k = /--nova-([a-z0-9-]+)/.exec(d)[1];
        if (cles.indexOf(k) < 0 && nombres.indexOf(k) < 0 && k !== 'masques-eleves' && k !== 'communication-eleves' && k !== 'vacances') decl += ' ' + d.trim() + ';';
      });
      // Vacances (2026-11-07) : écrites ici seulement, retirées des autres blocs (ancien bloc des badges).
      decl += vac.decl();
      var reste = zone.value.replace(/\/\* Nova : reglages de la page Apparence \*\/\s*html:root\s*\{[^}]*\}\s*/g, '')
        .replace(/\s*--nova-vacances\s*:[^;}]*;?/g, '').trim();
      zone.value = (reste ? reste + '\n\n' : '') + blocCss(marque, decl);
    };
    var touche = false;
    carte.addEventListener('change', function (e) { if (/^nova_c_/.test(e.target.name || '')) touche = true; });
    return { ecrire: ecrire, touche: function () { return touche; }, erreurs: vac.erreurs, montrer: vac.montrer };
  }

  /* Vacances de « Mon activité » (demande de l'utilisateur, 2026-11-07, maquette validée) : héritées (portail, groupement),
   * aucune, zone A, B, C (dates officielles livrées avec Nova : #nova-vacances-zones, _procs/vacances-zones.txt) ou dates
   * personnalisées (une période par ligne). Résumé des dates de l'année scolaire en cours pour une zone. Renvoie decl()
   * (déclaration à écrire, vide si héritée), erreurs() (lignes non comprises) et montrer(). */
  function vacancesEnLignes(v) {
    return (v || '').split(/\s+/).map(function (p) {
      var m = /^(\d{4})(\d\d)(\d\d)-(\d{4})(\d\d)(\d\d)$/.exec(p);
      return m ? m[3] + '/' + m[2] + '/' + m[1] + ' - ' + m[6] + '/' + m[5] + '/' + m[4] : '';
    }).filter(Boolean).join('\n');
  }
  // Lignes « JJ/MM/AAAA - JJ/MM/AAAA » (aussi « du … au … ») en périodes AAAAMMJJ-AAAAMMJJ ; lignes non comprises à part.
  function lirePeriodes(texte) {
    var bonnes = [], mauvaises = [];
    var deux = function (n) { return ('0' + n).slice(-2); };
    (texte || '').split('\n').forEach(function (l) {
      var t = l.trim();
      if (!t) return;
      var m = /^(?:du\s+)?(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(?:-|\u2013|au|\u00e0)\s*(\d{1,2})\/(\d{1,2})\/(\d{4})$/i.exec(t);
      if (m && m[3] + deux(m[2]) + deux(m[1]) <= m[6] + deux(m[5]) + deux(m[4])) bonnes.push(m[3] + deux(m[2]) + deux(m[1]) + '-' + m[6] + deux(m[5]) + deux(m[4]));
      else mauvaises.push(t);
    });
    return { periodes: bonnes, mauvaises: mauvaises };
  }
  function vacancesApparence(carte, zone, modele) {
    var bloc = carte.querySelector('.nova-app-vac');
    var vide = { decl: function () { return ''; }, erreurs: function () { return 0; }, montrer: function () {} };
    if (!bloc) return vide;
    var t = function (n) { return modele.getAttribute('data-' + n) || ''; };
    var radios = [].slice.call(bloc.querySelectorAll('input[name="nova_c_vacances"]'));
    var resume = bloc.querySelector('.nova-app-vac-resume'), saisie = bloc.querySelector('.nova-app-vac-saisie');
    var dates = bloc.querySelector('.nova-app-vac-dates'), erreur = bloc.querySelector('.nova-app-vac-erreur');
    var source = document.getElementById('nova-vacances-zones');
    var lignes = (source ? source.textContent : '').split('\n').map(function (l) { return l.trim().split(/\s+/); }).filter(function (c) { return c.length === 4; });
    var noms = t('vac-noms').split(','), cles = ['Toussaint', 'Noel', 'Hiver', 'Printemps', 'Ete'];
    var jm = function (d) { return d.slice(6, 8) + '/' + d.slice(4, 6); };
    var nomZone = function (v) { return t('vac-zone') + ' ' + v.slice(5).toUpperCase(); };
    var resumeZone = function (v) {
      var auj = new Date(), y = auj.getFullYear();
      var an = auj.getMonth() >= 7 ? y + '-' + (y + 1) : (y - 1) + '-' + y;   // d\u00e8s ao\u00fbt : l'ann\u00e9e qui vient
      var z = v.slice(5).toUpperCase();
      var items = lignes.filter(function (c) { return c[0] === z && c[1] === an; }).map(function (c) {
        var i = cles.indexOf(c[2]), nom = i >= 0 && noms[i] ? noms[i] : c[2], p = c[3].split('-');
        return c[2] === 'Ete' ? nom + ' ' + t('vac-ete').replace('%d', jm(p[0])) : nom + ' ' + jm(p[0]) + ' \u2013 ' + jm(p[1]);
      });
      return items.length ? nomZone(v) + ', ' + an + ' : ' + items.join(' \u00b7 ') : t('vac-manque').replace('%a', an);
    };
    var herite = (bloc.getAttribute('data-herite') || '').trim();
    var decrire = function (v) {
      if (/^zone-[abc]$/.test(v)) return nomZone(v);
      var r = radios.filter(function (x) { return x.value === (v === 'aucune' || !v ? 'aucune' : 'dates'); })[0];
      return r ? r.parentNode.textContent.trim() : v;
    };
    var etiquette = bloc.querySelector('.nova-app-vac-herite span');
    if (etiquette && herite) etiquette.textContent = t('vac-herite-de').replace('%h', etiquette.textContent.trim()).replace('%v', decrire(herite));
    // Valeur de la classe : dernière déclaration de sa feuille (ancien bloc des badges compris).
    var toutes = zone.value.match(/--nova-vacances\s*:\s*[^;}\n]*/g) || [];
    var propre = toutes.length ? toutes[toutes.length - 1].replace(/--nova-vacances\s*:\s*/, '').replace(/["']/g, '').trim() : '';
    var choix = !propre ? (radios.some(function (r) { return r.value === ''; }) ? '' : 'aucune')
      : propre === 'aucune' ? 'aucune' : /^zone-[abc]$/.test(propre) ? propre : 'dates';
    if (choix === 'dates') dates.value = vacancesEnLignes(propre);
    radios.forEach(function (r) { r.checked = r.value === choix; });
    var valeur = function () { var r = radios.filter(function (x) { return x.checked; })[0]; return r ? r.value : ''; };
    var montrer = function () {
      var m = valeur() === 'dates' ? lirePeriodes(dates.value).mauvaises : [];
      erreur.hidden = !m.length;
      erreur.textContent = m.length ? t('erreur-vacances') + ' ' + m.join(' ; ') : '';
      return m.length;
    };
    var maj = function () {
      var v = valeur(), effective = v === '' ? herite : v;
      saisie.hidden = v !== 'dates';
      resume.textContent = /^zone-[abc]$/.test(effective) ? resumeZone(effective) : effective === 'aucune' ? t('vac-resume-aucune') : '';
      resume.hidden = !resume.textContent;
      montrer();
    };
    radios.forEach(function (r) { r.addEventListener('change', maj); });
    dates.addEventListener('input', montrer);
    maj();
    return {
      decl: function () {
        var v = valeur();
        if (v === '') return '';
        if (v !== 'dates') return ' --nova-vacances: ' + v + ';';
        var p = lirePeriodes(dates.value).periodes;
        return ' --nova-vacances: ' + (p.length ? p.join(' ') : 'aucune') + ';';
      },
      erreurs: montrer,
      montrer: function () { if (montrer()) dates.focus(); }
    };
  }

  // Bloc de réglages Nova dans une feuille de style : une déclaration par ligne (demande de l'utilisateur,
  // 2026-10-07). Aucune ligne ne commence par « : » (WIMS couperait la feuille, voir apparenceClasse).
  function blocCss(marque, decl) {
    var lignes = decl.split(';').map(function (d) { return d.trim(); }).filter(Boolean);
    return marque + '\nhtml:root {\n' + lignes.map(function (d) { return '  ' + d + ';'; }).join('\n') + '\n}';
  }

  /* Bloc « Nova : badges » (2026-10-07 ; page Réglages de Nova depuis le 2026-11-08) : badges proposés
   * (--nova-badges-actifs), un champ par réglage nommé par data-cle (paliers, règles, couleur, avatar, DM WIMS) ; vide =
   * valeur héritée (portail, groupement, site), montrée en exemple. L'interrupteur général (--nova-badges) est dans
   * l'autre bloc. */
  function reglagesBadges(carte, zone) {
    var valeur = function (texte, cle) {
      var m = new RegExp('--nova-' + cle + '\\s*:\\s*([^;}\\n]*)').exec(texte);
      return m ? m[1].trim().replace(/["']/g, '') : '';
    };
    var herite = getComputedStyle(document.documentElement);
    var champs = Array.prototype.slice.call(carte.querySelectorAll('[data-cle]'));
    champs.forEach(function (c) {
      var k = c.getAttribute('data-cle'), v = valeur(zone.value, k);
      var h = texteCss(herite.getPropertyValue('--nova-' + k));
      if (c.type === 'checkbox') c.checked = (v || h || 'oui') !== 'non';
      else if (c.tagName === 'SELECT') {
        // Liste (couleur personnelle, 2026-11-07) : première option = valeur héritée, nommée d'après elle.
        c.value = v;
        var oh = h && c.querySelector('option[value="' + h + '"]'), o0 = c.options[0];
        if (o0 && o0.value === '' && oh) o0.textContent = (o0.getAttribute('data-texte') || '%s').replace('%s', oh.textContent);
      }
      else { c.value = v; c.placeholder = h; }
    });
    // Badges proposés : liste de la feuille, sinon héritée, sinon tous.
    var proposes = (valeur(zone.value, 'badges-actifs') || herite.getPropertyValue('--nova-badges-actifs').trim().replace(/["']/g, '') || 'tous').split(/[\s,]+/);
    var cases = Array.prototype.slice.call(carte.querySelectorAll('.nova-bdg-actif'));
    var suivre = function () {
      cases.forEach(function (c) {
        var detail = carte.querySelector('.nova-bdg-detail[data-badge="' + c.value + '"]');
        if (detail) detail.hidden = !c.checked;
      });
    };
    cases.forEach(function (c) { c.checked = proposes.indexOf('tous') >= 0 || proposes.indexOf(c.value) >= 0; c.addEventListener('change', suivre); });
    suivre();
    var touche = false;
    carte.addEventListener('change', function (e) { if (e.target.hasAttribute('data-cle') || e.target.classList.contains('nova-bdg-actif')) touche = true; });
    carte.addEventListener('input', function (e) { if (e.target.hasAttribute('data-cle')) touche = true; });
    var marque = '/* Nova : badges */';
    var ecrire = function () {
      var choisis = cases.filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
      var decl = '--nova-badges-actifs: ' + (choisis.length ? choisis.join(' ') : 'aucun') + ';';
      champs.forEach(function (c) {
        var k = c.getAttribute('data-cle');
        if (c.type === 'checkbox') { decl += ' --nova-' + k + ': ' + (c.checked ? 'oui' : 'non') + ';'; return; }
        if (c.tagName === 'SELECT') { if (/^[a-z0-9]+$/.test(c.value)) decl += ' --nova-' + k + ': ' + c.value + ';'; return; }
        // Listes de mots (mots-clés des DM WIMS, 2026-11-06 et 2026-11-08) : lettres, chiffres, espaces, virgules.
        if (c.classList.contains('nova-app-mots')) {
          var mots = c.value.split(',').map(function (m) { return m.replace(/[^0-9A-Za-z\u00c0-\u00ff' -]+/g, ' ').replace(/\s+/g, ' ').trim(); }).filter(Boolean).join(', ');
          if (mots) decl += ' --nova-' + k + ': ' + mots + ';';
          return;
        }
        var v = c.classList.contains('nova-app-paliers') ? (c.value.match(/\d+/g) || []).slice(0, 8).join(' ') : c.value.trim().replace(',', '.');
        if (v && (c.classList.contains('nova-app-paliers') || /^\d+(\.\d+)?$/.test(v))) decl += ' --nova-' + k + ': ' + v + ';';
      });
      // Vacances d'un ancien bloc des badges : gardées telles quelles jusqu'au prochain enregistrement de l'autre bloc.
      var ancienBloc = /\/\* Nova : badges \*\/\s*html:root\s*\{([^}]*)\}/.exec(zone.value);
      var vacAncienne = ancienBloc && /--nova-vacances\s*:\s*([^;}\n]*)/.exec(ancienBloc[1]);
      if (vacAncienne && vacAncienne[1].trim()) decl += ' --nova-vacances: ' + vacAncienne[1].trim() + ';';
      // Ancien bloc retiré, et ces réglages retirés des autres blocs (écrits là avant cette page).
      var reste = zone.value.replace(/\/\* Nova : badges \*\/\s*html:root\s*\{[^}]*\}\s*/g, '')
        .replace(/\s*--nova-(badges-actifs|fidelite-[a-z]+|perseverance-[a-z]+|echauffement-[a-z]+|top-[a-z]+|couleur-[a-z-]+|avatar(-[a-z]+)*|dm-[a-z-]+)\s*:[^;}]*;?/g, '').trim();
      zone.value = (reste ? reste + '\n\n' : '') + blocCss(marque, decl);
    };
    return { ecrire: ecrire, touche: function () { return touche; } };
  }

  /* Mots-clés (DM WIMS, 2026-11-08, maquette) : étiquettes avec × pour retirer, champ et « Ajouter ». Le champ d'origine
   * (input.nova-app-mots, data-cle) garde la valeur, « mot, mot » ; vide = valeur héritée, montrée telle quelle avec la
   * mention « valeur par défaut ». Le dernier mot ne se retire pas (une liste vide reviendrait à la valeur héritée). */
  function motsCles(carte, modele) {
    var t = function (n) { return modele.getAttribute('data-mots-' + n) || ''; };
    var plat = function (m) { return (m || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); };
    var liste = function (v) { return (v || '').split(',').map(function (m) { return m.replace(/\s+/g, ' ').trim(); }).filter(Boolean); };
    [].forEach.call(carte.querySelectorAll('input.nova-app-mots'), function (champ) {
      var boite = document.createElement('div');
      boite.className = 'nova-puces';
      champ.classList.add('nova-puces-source');
      champ.parentNode.insertBefore(boite, champ.nextSibling);
      var nomChamp = (carte.querySelector('label[for="' + champ.id + '"]') || {}).firstChild;
      nomChamp = nomChamp && nomChamp.nodeType === 3 ? nomChamp.nodeValue.trim() : '';
      var poser = function (mots, focus) {
        champ.value = mots.join(', ');
        champ.dispatchEvent(new Event('change', { bubbles: true }));
        dessiner(focus);
      };
      var dessiner = function (focus) {
        boite.textContent = '';
        var propres = liste(champ.value), mots = propres.length ? propres : liste(champ.placeholder);
        mots.forEach(function (m) {
          var p = document.createElement('span');
          p.className = 'nova-puce';
          p.appendChild(document.createTextNode(m));
          if (mots.length > 1) {
            var x = document.createElement('button');
            x.type = 'button';
            x.className = 'nova-puce-retirer';
            x.textContent = '\u00d7';
            x.setAttribute('aria-label', t('retirer') + ' ' + m);
            x.addEventListener('click', function () { poser(mots.filter(function (y) { return y !== m; }), 'ajout'); });
            p.appendChild(x);
          }
          boite.appendChild(p);
        });
        if (!propres.length && mots.length) {
          var d = document.createElement('span');
          d.className = 'nova-puces-defaut';
          d.textContent = t('defaut');
          boite.appendChild(d);
        }
        var ajout = document.createElement('span');
        ajout.className = 'nova-puces-ajout';
        var saisie = document.createElement('input');
        saisie.type = 'text';
        saisie.autocomplete = 'off';
        saisie.spellcheck = false;
        saisie.placeholder = t('placeholder');
        saisie.setAttribute('aria-label', t('placeholder') + (nomChamp ? ' (' + nomChamp + ')' : ''));
        var bouton = document.createElement('button');
        bouton.type = 'button';
        bouton.className = 'wims_button wims_secondary_button';
        bouton.textContent = t('ajouter');
        var ajouter = function () {
          var nouveaux = liste(saisie.value.replace(/[^0-9A-Za-z\u00c0-\u00ff' ,-]+/g, ' '));
          if (!nouveaux.length) { saisie.focus(); return; }
          var tous = mots.slice();
          nouveaux.forEach(function (n) { if (!tous.some(function (y) { return plat(y) === plat(n); })) tous.push(n); });
          poser(tous, 'ajout');
        };
        bouton.addEventListener('click', ajouter);
        saisie.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ajouter(); } });
        ajout.appendChild(saisie);
        ajout.appendChild(bouton);
        boite.appendChild(ajout);
        if (propres.length && champ.placeholder) {
          var retour = document.createElement('button');
          retour.type = 'button';
          retour.className = 'nova-puces-retablir';
          retour.textContent = t('retablir');
          retour.addEventListener('click', function () { poser([], 'ajout'); });
          boite.appendChild(retour);
        }
        if (focus === 'ajout') saisie.focus();
      };
      dessiner();
    });
  }

  /* Onglets de la page Réglages de Nova (maquette B, utilisateur, 2026-11-08) : un panneau par section.nova-onglet
   * (data-onglet, data-titre), boutons role=tab (flèches, Début, Fin), liste déroulante au téléphone (comme
   * ongletsCompacts). Onglet ouvert gardé pour la session (sessionStorage). Tous les champs restent dans la page : un
   * seul enregistrement. */
  function ongletsReglages(carte, nom, memoire) {
    memoire = memoire || 'nova-reglages-onglet';
    var panneaux = [].slice.call(carte.querySelectorAll('section.nova-onglet'));
    var cleOf = function (p) { return p.getAttribute('data-onglet'); };
    var barre = document.createElement('div');
    barre.className = 'nova-onglets';
    barre.setAttribute('role', 'tablist');
    barre.setAttribute('aria-label', nom);
    var choix = document.createElement('select');
    choix.className = 'nova-onglets-liste';
    choix.setAttribute('aria-label', nom);
    var boutons = panneaux.map(function (p) {
      var cle = cleOf(p), id = 'nova-onglet-' + cle;
      p.id = id + '-panneau';
      p.setAttribute('role', 'tabpanel');
      p.setAttribute('aria-labelledby', id);
      var b = document.createElement('button');
      b.type = 'button';
      b.id = id;
      b.className = 'nova-onglet-bouton' + (p.classList.contains('nova-onglet-avances') ? ' nova-onglet-danger' : '');
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', p.id);
      b.setAttribute('data-onglet', cle);
      b.textContent = p.getAttribute('data-titre');
      barre.appendChild(b);
      var o = document.createElement('option');
      o.value = cle;
      o.textContent = p.getAttribute('data-titre');
      choix.appendChild(o);
      return b;
    });
    var montrer = function (cle, focus) {
      if (!panneaux.some(function (p) { return cleOf(p) === cle; })) cle = cleOf(panneaux[0]);
      panneaux.forEach(function (p) { p.hidden = cleOf(p) !== cle; });
      boutons.forEach(function (b) {
        var oui = b.getAttribute('data-onglet') === cle;
        b.setAttribute('aria-selected', oui ? 'true' : 'false');
        b.tabIndex = oui ? 0 : -1;
        b.classList.toggle('nova-actif', oui);
        if (oui && focus) b.focus();
      });
      choix.value = cle;
      try { sessionStorage.setItem(memoire, cle); } catch (e) { /* sans stockage : premier onglet */ }
    };
    boutons.forEach(function (b, i) {
      b.addEventListener('click', function () { montrer(b.getAttribute('data-onglet')); });
      b.addEventListener('keydown', function (e) {
        var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? boutons.length - 1 : null;
        if (j === null) return;
        e.preventDefault();
        j = (j + boutons.length) % boutons.length;
        montrer(boutons[j].getAttribute('data-onglet'), true);
      });
    });
    choix.addEventListener('change', function () { montrer(choix.value); });
    carte.insertBefore(choix, carte.firstChild);
    carte.insertBefore(barre, carte.firstChild);
    var garde = null;
    try { garde = sessionStorage.getItem(memoire); } catch (e) { garde = null; }
    montrer(garde);
    return { montrer: montrer };
  }

  // Rubrique « Réglages de Nova » dans la page Configuration et maintenance d'une classe, d'un groupement ou d'un
  // portail, juste après « Apparence » (2026-10-07 : « Badges Nova » ; 2026-11-08, utilisateur : tous les réglages).
  // Étiquette « Nouveau » (2026-11-08, utilisateur : Réglages de Nova, menu de gauche et liste de la configuration).
  function tagNouveau(parent) {
    if (parent.querySelector('.nova-tag-nouveau')) return;
    var textes = document.getElementById('nova-textes');
    var tag = document.createElement('span');
    tag.className = 'nova-tag-nouveau';
    tag.textContent = (textes && textes.getAttribute('data-texte-nouveau')) || 'New';
    parent.appendChild(document.createTextNode(' '));
    parent.appendChild(tag);
  }
  function rubriqueReglages() {
    var app = document.querySelector('.wimsbody ul.wims_nopuce li > a[href*="job=present"]');
    if (!app || !/module=adm%2Fclass%2Fconfig|module=adm\/class\/config/.test(app.href) || document.querySelector('.nova-rubrique-reglages')) return;
    var textes = document.getElementById('nova-textes');
    var t = function (nom, defaut) { return (textes && textes.getAttribute('data-texte-' + nom)) || defaut; };
    var li = document.createElement('li');
    li.className = 'nova-rubrique-reglages';
    var a = document.createElement('a');
    a.href = app.href.split('#')[0] + '#nova-reglages';
    a.textContent = t('rubrique-reglages', 'Nova settings');
    li.appendChild(a);
    tagNouveau(li);
    li.appendChild(document.createTextNode(' ' + t('rubrique-reglages-aide', '')));
    var apres = app.closest('li');
    apres.parentNode.insertBefore(li, apres.nextSibling);
  }
  function reglagesStandard() {
    var d = document.documentElement;
    var cs = getComputedStyle(d);
    var actifs = CLES_STANDARD.filter(function (k) {
      var oui = cs.getPropertyValue('--nova-std-' + k).trim().replace(/["']/g, '') === 'oui';
      d.classList.toggle('nova-std-' + k, oui);
      return oui;
    });
    // Fil d'Ariane fixe des profs et admins (2026-10-09) : « non » le laisse défiler.
    d.classList.toggle('nova-fil-libre', cs.getPropertyValue('--nova-fil-fixe').trim().replace(/["']/g, '') === 'non');
    // Rubriques masquées aux élèves (même mémoire de session, jetons « sans-communication », « sans-liens »).
    var masques = rubriquesMasquees(cs);
    var jetons = actifs.slice();
    ['communication', 'liens'].forEach(function (r) {
      var sans = masques.indexOf(r) >= 0;
      d.classList.toggle('nova-sans-' + r, sans);
      if (sans) jetons.push('sans-' + r);
    });
    // Décorations de saison (2026-11-11, utilisateur) : activées sauf « non » ; jeton « sans-deco » pour le script de tête.
    var deco = cs.getPropertyValue('--nova-decorations').trim().replace(/["']/g, '') !== 'non';
    if (!deco) jetons.push('sans-deco');
    decorationsSaison(deco);
    // Pour le script de tête des pages suivantes de cette classe (la feuille de la classe arrive après lui).
    var mc = document.querySelector('meta[name="nova-classe"]');
    try { sessionStorage.setItem('nova-std-' + (mc ? mc.content : ''), jetons.join(' ')); } catch (e) { /* sans stockage */ }
    // Menu enseignant complet par défaut, tant que l'enseignant n'a rien choisi lui-même.
    var choix = null;
    var nmr = window.novaMenu;
    try { choix = localStorage.getItem('nova_menu' + (nmr && nmr.suffixe || '')); } catch (e) { /* sans stockage */ }
    if (choix === null && !(nmr && nmr.inverse)) d.classList.toggle('nova-menu-simple', actifs.indexOf('menu-complet') < 0);
  }
  /* Décorations de saison de la barre (2026-11-11, utilisateur : guirlande et flocons en décembre ; d'autres fêtes
   * viendront). html.nova-saison-<nom> (_css/decorations.css), posée tôt par le script de tête (même table des saisons,
   * À TENIR À JOUR dans htmlheader.phtml), confirmée ici : réglage --nova-decorations, jamais en examen. Date de l'appareil. */
  var SAISONS = [{ nom: 'noel', mois: [12] }];
  function decorationsSaison(deco) {
    var d = document.documentElement, mois = new Date().getMonth() + 1;
    var session = (location.search.match(/[?&]session=([^&]*)/) || [])[1] || '';
    var examen = /_exam/.test(session) || !!document.getElementById('wimsexam') || document.body.classList.contains('nova-examen') ||
      document.body.classList.contains('nova-examen-session') || !!document.querySelector('#wimstopbox .menuitem.chrono, #chrono_exam, a.endexam');
    SAISONS.forEach(function (s) { d.classList.toggle('nova-saison-' + s.nom, deco && !examen && s.mois.indexOf(mois) >= 0); });
    // Scintillement de la guirlande (2026-11-11) : seulement si les animations de Nova sont activées.
    d.classList.toggle('nova-scintille', !animationsCoupees());
  }
  // Rubriques masquées aux élèves (2026-10-08) : --nova-masques-eleves s'il est posé (liste, « aucune »), sinon l'ancien
  // --nova-communication-eleves: non.
  function rubriquesMasquees(cs) {
    var liste = cs.getPropertyValue('--nova-masques-eleves').trim().replace(/["']/g, '');
    if (liste && liste !== 'defaut') return liste.split(/[\s,]+/).filter(function (r) { return r === 'communication' || r === 'liens'; });
    return cs.getPropertyValue('--nova-communication-eleves').trim().replace(/["']/g, '') === 'non' ? ['communication'] : [];
  }

  /* Réglages de Nova posés dans la feuille de surcharge du portail ou du groupement (demande de
   * l'utilisateur, 2026-10-06) : WIMS ne charge que la feuille de la classe courante. user.phtml (accueil)
   * transmet la feuille de la structure (#nova-css-structure) ; ses déclarations --nova-… sont gardées pour
   * la structure (meta nova-structure, sessionStorage) et posées sur toutes ses pages par html { … } :
   * plus fortes que les défauts de Nova (:where(:root)), plus faibles que la feuille de la classe (:root). */
  function reglagesStructure() {
    // Réglages du site (log/nova.conf, page Apparence de la maintenance ; header.phtml les transmet sur les
    // pages où ils sont lisibles) : posés d'abord, la structure puis la classe l'emportent.
    poserReglages(document.getElementById('nova-css-site'), 'nova-reglages-site', 'nova-reglages-site');
    var meta = document.querySelector('meta[name="nova-structure"]');
    var structure = meta && meta.getAttribute('content');
    if (!structure) return;
    poserReglages(document.getElementById('nova-css-structure'), 'nova-reglages-' + structure, 'nova-reglages-structure');
  }
  // Déclarations --nova-… d'une feuille transmise (source), gardées sous « cle » pour les pages qui ne la
  // reçoivent pas, posées par html { … } (après les précédentes : la dernière posée l'emporte).
  function poserReglages(source, cle, id) {
    var decl = null;
    if (source) {
      decl = (source.textContent.match(/--nova-[a-z0-9-]+\s*:\s*[^;}\n]+/g) || []).join(';');
      try { sessionStorage.setItem(cle, decl); } catch (e) { /* sans stockage : cette page seulement */ }
    } else {
      try { decl = sessionStorage.getItem(cle); } catch (e) { decl = null; }
    }
    if (!decl) return;
    var style = document.createElement('style');
    style.id = id;
    style.textContent = 'html { ' + decl + '; }';
    document.head.appendChild(style);
  }

  /* ===== js/src/99-demarrage.js : appel de toutes les fonctions, fin de la fonction englobante ===== */
  function demarrer() { feuilleAJour(); menuEleve(); placerMenu(); piedDePage(); messageReporte(); propagationNova(); reglagesStructure(); reglagesStandard(); activiteLien(); menuServeur(); reconnexionCas(); apparenceNova(); apparenceClasse(); ecartsZones(); rubriqueReglages(); configurationClasse(); configurationGlobale(); securiteClasse(); formatsSauvegarde(); capaciteClasse(); ficheRessource(); etatsRessources(); sequencesEnseignant(); sequencesNumero(); confirmationsRessources(); editeursReactivables(); if (animationsCoupees()) document.documentElement.classList.add('nova-sans-animation'); autreExamen(); coursUnique(); oeilMotDePasse(); focusConnexion(); parcours(); parcoursExamen(); courseExercice(); feuilleExercices(); panneaux(); revelations(); accordeons(); menusDeroulants(); infobulles(); modeExamen(); profilLateral(); badges(); couleurPerso(); pastilleBadges(); avatarBarre(); avatarPage(); avatarsClasse(); avatarsParticipants(); chronoExercice(); retourEleve(); scores(); notesExamens(); libellesNotes(); examExercices(); carrousel(); notesNaN(); signesExamens(); notesColonnes(); dmNote(); forcerDesactivation(); legendeTypes(); clavierMaths(); claviersReponse(); glisserTactile(); dominos(); tuiles(); tuilesCorrigees(); associations(); aideExamen(); derniereConnexion(); imagesCliquables(); retourReponse(); boutonsCollants(); focusSuite(); initialiser(); chronometre(); serieEtapes(); typesExamen(); pagesExamen(); barreCompacte(); basculeMenu(); replisClasses(); cellulesCliquables(); accesClasse(); liensConnexion(); sectionsRepliables(); retourEnHaut(); enLigne(); centrerBarre(); adresseNette(); }
  capterTinymce();   // avant le tinymce.init de WIMS (au chargement de la page)
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
