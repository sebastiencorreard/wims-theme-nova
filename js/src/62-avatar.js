
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
      if (exporter && avec && window.TextEncoder && window.Blob) exporter.hidden = false;
      if (dialogue.open) montrer(courant);
    }).catch(function () {});
  }
