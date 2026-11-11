
  /* ===== js/src/61-couleur.js : couleur personnelle (« Ma couleur ») ===== */
  // Fenêtre « Mes badges » : un onglet par badge proposé (Régularité, Persévérance, Échauffement ; maquette du 2026-10-09). Chaque
  // panneau : image et niveau, règle, chiffres, ce qui reste, les 8 niveaux. Données de user.phtml (#nova-badges).
  /* Couleur personnelle d'un élève (demande de l'utilisateur, 2026-11-07) : palette lisible (texte blanc, contraste ≥ 3,5:1),
   * débloquée par le niveau d'un badge choisi par l'enseignant (--nova-couleur-badge, --nova-couleur-niveau), puis 8 dégradés
   * pré-établis à un niveau plus élevé du même badge (--nova-couleur-degrade ; maquette v2 validée le 2026-11-07). Choix gardé
   * pour toute la structure sur le serveur (.nova_couleur_<login>, header.phtml) et, pour l'appliquer avant l'affichage de
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
