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
