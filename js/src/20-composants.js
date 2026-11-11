
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
    var blocs = Array.prototype.filter.call(document.querySelectorAll('.wimsbody .send_answer, .wimsbody .oef_buttons, #oef_actions:has(.nova-revenir-liste)'), function (b) { return b.querySelector('input[type="submit"], a, button'); });
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
