/* Nova — menu latéral sur téléphone et tablette.
 * Ajoute à la barre du haut un bouton qui ouvre et ferme le menu (#wimsmenumodubox) ; fermeture
 * aussi par Échap, par un clic hors du menu ou en suivant un lien. Sans JavaScript, le menu
 * reste dans la page : rien ne se perd. Aucune dépendance (jQuery n'est pas requis).
 */
(function () {
  'use strict';
  /* Animations : COUPÉES par défaut (--nova-animations: non, jetons.css) ; un enseignant ou un
   * administrateur les active par une surcharge CSS : :root { --nova-animations: oui; }. Le réglage
   * « réduire les animations » de l'appareil les coupe toujours. Demandes de l'utilisateur, 2026-10-05. */
  function animationsCoupees() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    var v = getComputedStyle(document.documentElement).getPropertyValue('--nova-animations').trim().toLowerCase();
    return !/^["']?(oui|yes|on|1)["']?$/.test(v);
  }
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
      if (!restants.length) liCompte.remove();
      var droite = document.createElement('div');
      droite.className = 'wimsmenu menu nova-avant-terminer';
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
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8"></circle>' +
      '<path d="M12 9v4l2.5 2.5M9 2h6"></path></svg>';
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
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8"></circle>' +
      '<path d="M12 9v4l2.5 2.5M9 2h6"></path></svg><span class="nova-chrono-libelle"></span>' +
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
    // Nouvelle entree Participants : gardee une fois, puis personnalisable comme les autres.
    if (nm && !nm.inverse && document.querySelector('#wimsmenumodubox .nova_suivi') && nm.garde.indexOf('suivi_v1') < 0) {
      if (nm.garde.indexOf('nova_suivi') < 0) nm.garde.push('nova_suivi');
      nm.garde.push('suivi_v1');
      ecrire('nova_menu_garde', JSON.stringify(nm.garde));
      ecrire('nova_menu_envoi', valeurMenu());
      var styleSuivi = document.getElementById('nova-menu-style');
      if (styleSuivi) styleSuivi.textContent = nm.style(nm.garde);
    }
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
    var bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'nova-menu-bascule';
    var afficher = function () {
      var simple = racine.classList.contains('nova-menu-simple');
      bouton.textContent = texte(simple ? 'voir-tout' : 'simplifier');
      bouton.setAttribute('aria-pressed', simple ? 'false' : 'true');
      // modtool (liste des entrées cachées) : rien de caché, rien à basculer.
      var nm = window.novaMenu;
      bouton.hidden = racine.classList.contains('nova-menu-edition') || !!(nm && nm.inverse && !nm.garde.length);
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
          var vue = (garde.indexOf(cle(item)) >= 0) !== !!nm.inverse;   // modtool : liste des entrées cachées
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
    if (standard('navigation')) return;   // réglage « Navigation complète pour l'élève » : fil d'Ariane
    if (!document.getElementById('nova-eleve') || document.body.classList.contains('nova-examen-session')) return;
    var barre = document.getElementById('wimstopbox');
    var fil = document.querySelector('.breadcrumbs');
    if (!barre || !fil || barre.querySelector('.menuitem.back, .menuitem.chrono')) return;
    // Le lien « Chapitre » qu'ajoute WIMS sur la page d'une feuille (module=home&seq=N) mène à la page
    // d'une seule séquence, sans onglets : on remonte à l'accueil de la classe, où WIMS rouvre l'onglet
    // d'origine (adm/tabscript, sessionStorage) — comme le retour depuis un examen.
    var liens = Array.prototype.filter.call(fil.querySelectorAll('a[href]'), function (a) {
      return !/[?&+]module=home(&|$)/.test(a.getAttribute('href')) || !/[?&+]seq=/.test(a.getAttribute('href'));
    });
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
    var notes = {}, max = source.getAttribute('data-max') || '10', libelle = source.getAttribute('data-libelle') || 'Note';
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
    if (tableau) tableau.querySelectorAll('tr').forEach(function (tr) {
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
        eleve: reponseEleve ? tr.children[1] : null, juste: reponseEleve ? tr.children[2].querySelector('div.inline.tt') : null, champs: [] });
    });
    // Lignes sans état (« voir l'analyse », renvois) : sans conséquence s'il y a des conditions, qui donnent
    // alors le verdict ; sinon, WIMS tel quel, et l'animation suit la note (noteSeule).
    if (!lignes.length || (inconnues && !conditions)) { reponse.classList.add('nova-retour-pret'); noteSeule(reponse); return; }

    // Réponses réaffichées dans l'énoncé, rattachées à leur ligne par le renvoi [k].
    document.querySelectorAll('.oefstatement div[class*="oef_ind"]').forEach(function (champ) {
      var m = /\boef_ind(good|bad|partial|prec|neutral)\b/.exec(champ.className);
      if (!m) return;
      var renvoi = champ.nextElementSibling;
      var nom = renvoi && renvoi.tagName === 'SUP' ? renvoi.textContent.trim() : '';
      var ligne = lignes.filter(function (l) { return nom && l.nom === nom; })[0];
      var etat = ligne ? ligne.etat : { good: 'bonne', bad: 'mauvaise', partial: 'partielle', prec: 'precision' }[m[1]];
      if (ligne) ligne.champs.push(champ);
      if (etat === 'mauvaise') champ.classList.add('nova-faux');
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
      etoiles(boite);
    } else if (lignes.length === 1) {
      titre.textContent = libelle(lignes[0].etat);
      completer(titre, lignes[0]);
      eleve(lignes[0]);
    } else if (lignes.some(function (l) { return l.etat === 'bonne'; })) {
      // Réponses justes et à revoir mêlées : deux colonnes, « Justes » | « À revoir » (maquette A, choisie par
      // l'utilisateur le 2026-10-08). Chaque ligne : [k], la réponse de l'élève, et pour une réponse à revoir
      // la bonne réponse de WIMS (déplacée, MathJax compris).
      var justes = lignes.filter(function (l) { return l.etat === 'bonne'; }).length;
      titre.textContent = texte(justes > 1 ? 'justes-sur' : 'juste-sur', justes > 1 ? '%1 correct answers out of %2' : '%1 correct answer out of %2')
        .replace('%1', justes).replace('%2', lignes.length);
      boite.className = 'nova-verdict nova-verdict-mixte';
      var colonnes = document.createElement('div');
      colonnes.className = 'nova-verdict-colonnes';
      var colonne = function (cle, nom) {
        var c = document.createElement('div');
        c.className = 'nova-verdict-colonne nova-verdict-colonne-' + cle;
        var t = document.createElement('p');
        t.className = 'nova-verdict-colonne-titre';
        t.textContent = nom;
        c.appendChild(t);
        var ul = document.createElement('ul');
        c.appendChild(ul);
        colonnes.appendChild(c);
        return ul;
      };
      var listeJustes = colonne('justes', texte('justes', 'Correct'));
      var listeRevoir = colonne('revoir', texte('a-revoir', 'To review'));
      lignes.forEach(function (ligne) {
        var li = document.createElement('li');
        if (ligne.nom) {
          var num = document.createElement('span');
          num.className = 'nova-verdict-num';
          num.textContent = /^\d+$/.test(ligne.nom) ? '[' + ligne.nom + ']' : ligne.nom + ' :';
          li.appendChild(num);
        }
        var contenu = document.createElement('span');
        li.appendChild(contenu);
        var donnee = ligne.eleve && ligne.eleve.textContent.trim() ? document.createElement('span') : null;
        if (donnee) {
          while (ligne.eleve.firstChild) donnee.appendChild(ligne.eleve.firstChild);
          if (ligne.etat === 'mauvaise') donnee.className = 'nova-faux';
          contenu.appendChild(donnee);
        }
        if (ligne.etat === 'bonne') { listeJustes.appendChild(li); return; }
        if (ligne.etat !== 'mauvaise') contenu.appendChild(document.createTextNode((donnee ? ' \u2014 ' : '') + libelle(ligne.etat)));
        if (ligne.juste) {
          contenu.appendChild(document.createTextNode((donnee || ligne.etat !== 'mauvaise' ? ' \u2192 ' : '') + texte('bonne-etait', 'the correct answer was') + ' '));
          ligne.juste.classList.add('nova-verdict-juste');
          contenu.appendChild(ligne.juste);
        } else if (!donnee && ligne.etat === 'mauvaise') contenu.appendChild(document.createTextNode(libelle('mauvaise')));
        listeRevoir.appendChild(li);
      });
      corps.appendChild(colonnes);
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

  // Petites étoiles (CSS : .nova-etoiles, sans animation si l'élève la refuse), centrées sur la place du
  // bouton « Valider » à l'envoi (demande de l'utilisateur, 2026-10-05) : position fixe, toujours à l'écran ;
  // à défaut (envoi ancien ou inconnu), sur l'élément donné.
  function etoiles(el) {
    if (animationsCoupees()) return;
    var nuee = document.createElement('span');
    nuee.className = 'nova-etoiles';
    nuee.setAttribute('aria-hidden', 'true');
    var place = null;
    try {
      place = JSON.parse(sessionStorage.getItem('nova-valider') || 'null');
      sessionStorage.removeItem('nova-valider');
    } catch (e) { place = null; }
    if (place && Date.now() - place.quand < 120000 && place.w > 0) {
      nuee.classList.add('nova-etoiles-valider');
      nuee.style.left = Math.max(0, Math.min(place.l, innerWidth - place.w)) + 'px';
      nuee.style.top = Math.max(60, Math.min(place.t, innerHeight - place.h)) + 'px';
      nuee.style.width = place.w + 'px';
      nuee.style.height = place.h + 'px';
      el = document.body;
    }
    var couleurs = ['var(--nova-note-jaune)', 'var(--nova-accent)', 'var(--nova-note-jaune)', 'var(--nova-note-vert)'];
    for (var i = 0; i < 12; i++) {
      var s = document.createElement('span');
      s.textContent = '\u2605';
      s.style.setProperty('--x', (20 + i * 60 / 11) + '%');
      s.style.setProperty('--dx', ((i - 5.5) * 9 + Math.random() * 16 - 8).toFixed(0) + 'px');
      s.style.setProperty('--h', (-70 - Math.random() * 50).toFixed(0) + 'px');
      s.style.setProperty('--d', (Math.random() * 0.35).toFixed(2) + 's');
      s.style.setProperty('--t', (11 + Math.random() * 9).toFixed(0) + 'px');
      s.style.setProperty('--r', (Math.random() * 120 - 60).toFixed(0) + 'deg');
      s.style.setProperty('--c', couleurs[i % couleurs.length]);
      nuee.appendChild(s);
    }
    if (el !== document.body) el.classList.add('nova-etoile-source');
    el.appendChild(nuee);
    setTimeout(function () { if (nuee.parentNode) nuee.parentNode.removeChild(nuee); }, 2500);
  }

  // Réponse fausse : toute la page vibre, brièvement (demande de l'utilisateur, 2026-10-05).
  function vibrer() {
    if (animationsCoupees()) return;
    var racine = document.documentElement;
    racine.classList.add('nova-vibre');
    setTimeout(function () { racine.classList.remove('nova-vibre'); }, 600);
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
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/>' +
      '<path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h.01M18 13h.01M8 16h8"/></svg>';
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
  function apparenceClasse() {
    var modele = document.getElementById('nova-apparence-classe');
    var zone = document.getElementById('pr_cssfile');
    if (!modele || !modele.content || !zone || !zone.form) return;
    var formWims = zone.form;
    var complet = document.getElementById('nova-css-classe-complete');
    var texteComplet = complet ? complet.textContent.trim() : '';
    if (texteComplet && zone.value.trim() !== texteComplet) zone.value = texteComplet;
    var bloc = modele.content.cloneNode(true);
    formWims.parentNode.insertBefore(bloc, formWims);
    var carte = formWims.previousElementSibling;
    var cles = ['animations', 'entree-directe', 'clavier-maths', 'badges', 'activite', 'fil-fixe'].concat(CLES_STANDARD.map(function (k) { return 'std-' + k; }));
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
    // Bloc réécrit seulement si le prof a touché à la carte, ou si un bloc présent au chargement a disparu : sinon la
    // classe garderait toutes les valeurs en dur et ne suivrait plus le portail ou le site (vu le 2026-10-09).
    var touche = false, blocAuChargement = !!bloc();
    carte.addEventListener('change', function () { touche = true; ecrire(); });
    // Surcharge réécrite à la volée (demande de l'utilisateur, 2026-10-08) : zone de texte modifiée à la main, bloc
    // Nova présent → la carte suit la zone ; bloc effacé (par inadvertance) → aussitôt réécrit d'après la carte.
    // Et à l'enregistrement par le bouton de WIMS, dans les mêmes cas.
    zone.addEventListener('change', function () { if (bloc()) lire(); else if (touche || blocAuChargement) ecrire(); });
    formWims.addEventListener('submit', function (e) {
      if (vac.erreurs()) { e.preventDefault(); vac.montrer(); return; }   // dates non comprises : rien d'envoyé
      if (touche || (blocAuChargement && !bloc())) ecrire();
    });
    var enregistrer = carte.querySelector('.nova-app-enregistrer');
    var envoi = formWims.querySelector('input[name="save"]');
    if (enregistrer && envoi) enregistrer.addEventListener('click', function () { touche = true; ecrire(); envoi.click(); });
    pageApparence(formWims, modele);
    var sans = (modele.getAttribute('data-sans-effet') || '').split(',').filter(Boolean);
    // « Transférer un fichier css » partage son cadre avec la zone de texte (où Nova écrit) : seul son
    // paragraphe est replié (data-sans-effet-ligne ; demande de l'utilisateur, 2026-10-07).
    var lignesSeules = (modele.getAttribute('data-sans-effet-ligne') || '').split(',').filter(Boolean);
    replierSansEffet(sans.map(function (n) { var c = formWims.querySelector('[name="' + n + '"]'); return c && c.closest('.field, li'); })
      .concat(lignesSeules.map(function (n) { var c = formWims.querySelector('[name="' + n + '"]'); return c && c.closest('p'); })), modele);
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

  /* Page « Badges Nova » (demande de l'utilisateur, 2026-10-07) : rubrique de la configuration d'une classe,
   * d'un groupement ou d'un portail (rubriqueBadges). C'est la page Apparence (job=present#nova-badges-reglages,
   * repérée par le script de tête : html.nova-page-badges) : sa carte et le formulaire de WIMS sont masqués ;
   * la carte « Badges Nova » (template#nova-badges-classe) écrit le bloc « Nova : badges » dans la feuille de
   * style (#pr_cssfile), enregistrée par le bouton de WIMS. Badges proposés (--nova-badges-actifs), paliers de
   * chaque badge, vacances ; vides = valeur héritée (portail, groupement, site). L'interrupteur général
   * (--nova-badges) reste dans la carte Apparence. */
  function badgesClasse() {
    var racine = document.documentElement;
    if (!racine.classList.contains('nova-page-badges')) return;
    var modele = document.getElementById('nova-badges-classe');
    var zone = document.getElementById('pr_cssfile');
    if (!modele || !modele.content || !zone || !zone.form) { racine.classList.remove('nova-page-badges'); return; }
    var formWims = zone.form;
    var bloc = modele.content.cloneNode(true);
    formWims.parentNode.insertBefore(bloc, formWims);
    var carte = formWims.previousElementSibling;
    var titre = document.querySelector('.wimsbody h1.wims_title');
    if (titre) titre.textContent = modele.getAttribute('data-titre');
    document.title = modele.getAttribute('data-titre');
    // Fil d'Ariane : dernier élément (« * » sur la page Apparence de WIMS) au nom de la page.
    var fil = document.querySelector('ul.breadcrumbs > li:last-child');
    if (fil) {
      var marche = document.createTreeWalker(fil, NodeFilter.SHOW_TEXT);
      for (var mot = marche.nextNode(); mot; mot = marche.nextNode()) {
        if (!mot.nodeValue.trim() || mot.parentNode.closest('.show-for-sr')) continue;
        mot.nodeValue = modele.getAttribute('data-titre');
        break;
      }
    }
    // Badges (2026-10-07) : paliers et vacances de la feuille de la classe ; vides = valeur héritée (portail,
    // groupement, site), montrée en exemple dans le champ.
    var valeur = function (texte, cle) {
      var m = new RegExp('--nova-' + cle + '\\s*:\\s*([^;}\\n]*)').exec(texte);
      return m ? m[1].trim().replace(/["']/g, '') : '';
    };
    var herite = getComputedStyle(document.documentElement);
    // Champs des badges (paliers, exercices par semaine, règle de Persévérance, examens ; 2026-10-09) : un champ par
    // réglage, nommé par data-cle ; vide = valeur héritée (portail, groupement, site), montrée en exemple.
    var champs = Array.prototype.slice.call(carte.querySelectorAll('[data-cle]'));
    champs.forEach(function (c) {
      var k = c.getAttribute('data-cle'), v = valeur(zone.value, k);
      var h = herite.getPropertyValue('--nova-' + k).trim().replace(/["']/g, '');
      if (c.type === 'checkbox') c.checked = (v || h || 'oui') !== 'non';
      else if (c.tagName === 'SELECT') {
        // Liste (couleur personnelle, 2026-11-07) : première option = valeur héritée, nommée d'après elle.
        c.value = v;
        var oh = h && c.querySelector('option[value="' + h + '"]'), o0 = c.options[0];
        if (o0 && o0.value === '' && oh) o0.textContent = (o0.getAttribute('data-texte') || '%s').replace('%s', oh.textContent);
      }
      else { c.value = v; c.placeholder = h; }
    });
    // Interrupteur général (page Apparence) : rappelé en tête, avec le lien.
    var actif = valeur(zone.value, 'badges') || herite.getPropertyValue('--nova-badges').trim().replace(/["']/g, '');
    var etat = carte.querySelector('.nova-bdg-etat-texte');
    if (etat) etat.textContent = modele.getAttribute(actif === 'oui' ? 'data-etat-oui' : 'data-etat-non');
    var lienApp = carte.querySelector('.nova-bdg-apparence');
    if (lienApp) lienApp.href = location.href.split('#')[0];
    if (lienApp) lienApp.addEventListener('click', function () { racine.classList.remove('nova-page-badges'); });
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
    var marque = '/* Nova : badges */';
    var ecrire = function () {
      var choisis = cases.filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
      var decl = '--nova-badges-actifs: ' + (choisis.length ? choisis.join(' ') : 'aucun') + ';';
      champs.forEach(function (c) {
        var k = c.getAttribute('data-cle');
        if (c.type === 'checkbox') { decl += ' --nova-' + k + ': ' + (c.checked ? 'oui' : 'non') + ';'; return; }
        if (c.tagName === 'SELECT') { if (/^[a-z0-9]+$/.test(c.value)) decl += ' --nova-' + k + ': ' + c.value + ';'; return; }
        // Listes de mots (titres des DM d'Échauffement, 2026-11-06) : lettres, chiffres, espaces, virgules.
        if (c.classList.contains('nova-app-mots')) {
          var mots = c.value.split(',').map(function (m) { return m.replace(/[^0-9A-Za-z\u00c0-\u00ff' -]+/g, ' ').replace(/\s+/g, ' ').trim(); }).filter(Boolean).join(', ');
          if (mots) decl += ' --nova-' + k + ': ' + mots + ';';
          return;
        }
        var v = c.classList.contains('nova-app-paliers') ? (c.value.match(/\d+/g) || []).slice(0, 8).join(' ') : c.value.trim().replace(',', '.');
        if (v && (c.classList.contains('nova-app-paliers') || /^\d+(\.\d+)?$/.test(v))) decl += ' --nova-' + k + ': ' + v + ';';
      });
      // Vacances (2026-11-07) : réglées sur la page Apparence (« Mon activité ») ; celles d'un ancien bloc des badges sont
      // gardées telles quelles jusqu'au prochain enregistrement de la page Apparence, qui les reprend.
      var ancienBloc = /\/\* Nova : badges \*\/\s*html:root\s*\{([^}]*)\}/.exec(zone.value);
      var vacAncienne = ancienBloc && /--nova-vacances\s*:\s*([^;}\n]*)/.exec(ancienBloc[1]);
      if (vacAncienne && vacAncienne[1].trim()) decl += ' --nova-vacances: ' + vacAncienne[1].trim() + ';';
      // Ancien bloc retiré, et ces réglages retirés des autres blocs (écrits là avant cette page).
      var reste = zone.value.replace(/\/\* Nova : badges \*\/\s*html:root\s*\{[^}]*\}\s*/g, '')
        .replace(/\s*--nova-(badges-actifs|fidelite-[a-z]+|perseverance-[a-z]+|echauffement-[a-z]+|top-[a-z]+|couleur-[a-z]+|avatar(-[a-z]+)*)\s*:[^;}]*;?/g, '').trim();
      zone.value = (reste ? reste + '\n\n' : '') + blocCss(marque, decl);
    };
    var enregistrer = carte.querySelector('.nova-app-enregistrer');
    var envoi = formWims.querySelector('input[name="save"]');
    if (enregistrer && envoi) enregistrer.addEventListener('click', function () {
      ecrire();
      envoi.click();
    });
    racine.classList.add('nova-badges-prete');
  }

  // Rubrique « Badges Nova » dans la page Configuration et maintenance d'une classe, d'un groupement ou d'un
  // portail, juste après « Apparence » (demande de l'utilisateur, 2026-10-07).
  /* Page Apparence d'une classe : dans l'aide de l'interrupteur des badges, « Badges Nova » devient un lien vers la
   * rubrique (adresse de l'entrée du menu, local.phtml ; demande de l'utilisateur, 2026-11-04). */
  function lienRubriqueBadges() {
    var aide = document.querySelector('#nova-app-c4 .nova-app-aide'), cible = document.querySelector('#wimsmenumodubox .nova_badges > a');
    if (!aide || !cible || aide.querySelector('a') || aide.childNodes.length !== 1 || aide.firstChild.nodeType !== 3) return;
    var textes = document.getElementById('nova-textes');
    var nom = (textes && textes.getAttribute('data-texte-rubrique-badges')) || 'Badges Nova';
    var texte = aide.firstChild.nodeValue, i = texte.indexOf(nom);
    if (i < 0) return;
    var lien = document.createElement('a');
    lien.href = cible.href;
    lien.textContent = nom;
    aide.textContent = '';
    aide.appendChild(document.createTextNode(texte.slice(0, i)));
    aide.appendChild(lien);
    aide.appendChild(document.createTextNode(texte.slice(i + nom.length)));
  }
  function rubriqueBadges() {
    var app = document.querySelector('.wimsbody ul.wims_nopuce li > a[href*="job=present"]');
    if (!app || !/module=adm%2Fclass%2Fconfig|module=adm\/class\/config/.test(app.href) || document.querySelector('.nova-rubrique-badges')) return;
    var textes = document.getElementById('nova-textes');
    var t = function (nom, defaut) { return (textes && textes.getAttribute('data-texte-' + nom)) || defaut; };
    var li = document.createElement('li');
    li.className = 'nova-rubrique-badges';
    var a = document.createElement('a');
    a.href = app.href.split('#')[0] + '#nova-badges-reglages';
    a.textContent = t('rubrique-badges', 'Badges Nova');
    li.appendChild(a);
    li.appendChild(document.createTextNode(' ' + t('rubrique-badges-aide', '')));
    var apres = app.closest('li');
    apres.parentNode.insertBefore(li, apres.nextSibling);
  }

  /* Rapprocher Nova du thème standard (demande de l'utilisateur, 2026-10-07) : sept réglages --nova-std-…
   * (page Apparence, section repliée). Le script de tête pose html.nova-std-<réglage> avant l'affichage ;
   * recalculé ici, une fois les réglages du site et de la structure posés (reglagesStructure). */
  var CLES_STANDARD = ['menus', 'navigation', 'reponse', 'examens', 'textes', 'listes', 'menu-complet', 'dominos'];
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
    // Pour le script de tête des pages suivantes de cette classe (la feuille de la classe arrive après lui).
    var mc = document.querySelector('meta[name="nova-classe"]');
    try { sessionStorage.setItem('nova-std-' + (mc ? mc.content : ''), jetons.join(' ')); } catch (e) { /* sans stockage */ }
    // Menu enseignant complet par défaut, tant que l'enseignant n'a rien choisi lui-même.
    var choix = null;
    var nmr = window.novaMenu;
    try { choix = localStorage.getItem('nova_menu' + (nmr && nmr.suffixe || '')); } catch (e) { /* sans stockage */ }
    if (choix === null && !(nmr && nmr.inverse)) d.classList.toggle('nova-menu-simple', actifs.indexOf('menu-complet') < 0);
  }
  function standard(k) { return document.documentElement.classList.contains('nova-std-' + k); }
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
    titre.textContent = (textes && textes.getAttribute('data-profil')) || 'Profil';
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
    Array.prototype.forEach.call(liCompte.querySelectorAll('#user_links > li' + (standard('navigation') ? '' : ':not(.nova-lien-complet)') + ' a[href]'), function (a) { ajouter(a); });
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
        bouton.setAttribute('aria-label', (textes && textes.getAttribute('data-texte-fermer')) || 'Fermer');
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
    // Case visée.
    var glisse = null, rafId = 0, derniere = null;
    var marquer = function (z) {
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

  /* Indication et Aide d'un exercice pendant un examen : WIMS les écrit en texte inactif (scripts/oef/Main.phtml :
   * <span class="disabled_link"> au lieu du bouton, dans une session _exam), y compris avec le thème Standard. Nova
   * les montre comme ses boutons d'aide, grisés, avec une info-bulle (demande de l'utilisateur, 2026-10-08). Main.phtml
   * écrit l'Indication puis l'Aide ; l'Aide se reconnaît à son texte (wims_name_help). */
  function aideExamen() {
    var inactifs = document.querySelectorAll('#oef_helphint > span.disabled_link');
    if (!inactifs.length) return;
    var textes = document.getElementById('nova-textes');
    var bulle = (textes && textes.getAttribute('data-texte-indisponible-examen')) || 'Non disponible pendant un examen';
    Array.prototype.forEach.call(inactifs, function (sp) {
      var aide = /^(aide|help|hilfe|ayuda|aiuto)$/i.test(sp.textContent.trim());
      sp.classList.add('wims_button_help', 'nova-inactif');
      if (!document.getElementById(aide ? 'oef_help' : 'oef_hint')) sp.id = aide ? 'oef_help' : 'oef_hint';   // icône du jeu de WIMS
      sp.setAttribute('aria-disabled', 'true');
      sp.setAttribute('role', 'button');
      sp.title = bulle;
    });
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
      msg.className = 'wims_msg success';
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
    form.addEventListener('submit', function (e) {
      var choisies = nova.filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
      if (!choisies.length) return;
      e.preventDefault();
      var accueil = lienAccueil('&nova_propager=' + (choisies.length > 1 ? 'tout' : choisies[0]));
      var suite = function () { location.href = accueil; };
      if (![].some.call(cases, function (c) { return c.checked; })) { suite(); return; }
      var donnees = new FormData(form);
      var bouton = form.querySelector('input[type="submit"][name="confirm"]');
      if (bouton) donnees.append('confirm', bouton.value);
      var methode = (form.getAttribute('method') || 'get').toLowerCase();
      var cible = form.getAttribute('action') || location.pathname;
      var envoi = methode === 'post' ? fetch(cible, { method: 'POST', body: donnees, credentials: 'same-origin' })
        : fetch(cible + (cible.indexOf('?') < 0 ? '?' : '&') + new URLSearchParams(donnees).toString(), { credentials: 'same-origin' });
      envoi.then(suite, suite);
    });
  }

  /* Pages Apparence et Badges Nova d'un portail ou d'un groupement (demande de l'utilisateur, 2026-11-07) : alerte en
   * tête de la carte quand des zones dépendantes ont d'autres réglages Nova (#nova-ecarts, header.phtml), avec la liste
   * repliée, « Appliquer ces réglages à toutes les zones » (propagation par l'accueil, réglages ENREGISTRÉS : bouton
   * désactivé dès qu'un champ de la page change) et « Plus tard » (referme jusqu'à la prochaine visite). */
  function ecartsZones() {
    var src = document.getElementById('nova-ecarts');
    if (!src) return;
    var t = function (n) { return src.getAttribute('data-' + n) || ''; };
    var cibles = { apparence: '.wimsbody .nova-app:not(.nova-badges-reglages)', badges: '.wimsbody .nova-badges-reglages' };
    Object.keys(cibles).forEach(function (partie) {
      var zones = src.querySelectorAll('li[data-partie="' + partie + '"]');
      var bloc = document.querySelector(cibles[partie]);
      if (!zones.length || !bloc || bloc.querySelector('.nova-ecarts')) return;
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
      appliquer.href = lienAccueil('&nova_propager=' + partie);
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
    });
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

  function placerMenu() {
    var menu = document.getElementById('wimsmenumodubox');
    // Classe connue du jeu Font_Awesome de WIMS ; le jeu default reste sans icone.
    if (menu) {
      var suivi = menu.querySelector('.nova_suivi > a');
      if (suivi) suivi.classList.add('eye');
      var badgesNova = menu.querySelector('.nova_badges > a');
      if (badgesNova) badgesNova.classList.add('heart');
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
      lien.textContent = (textes && textes.getAttribute('data-texte-mes-badges')) || 'Mes badges';
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
  // Fenêtre « Mes badges » : un onglet par badge proposé (Régularité, Persévérance, Échauffement ; maquette du 2026-10-09). Chaque
  // panneau : image et niveau, règle, chiffres, ce qui reste, les 8 niveaux. Données de user.phtml (#nova-badges).
  /* Couleur personnelle d'un élève (demande de l'utilisateur, 2026-11-07) : palette lisible (texte blanc, contraste ≥ 3,5:1),
   * débloquée par le niveau d'un badge choisi par l'enseignant (--nova-couleur-badge, --nova-couleur-niveau). Choix gardé
   * pour toute la structure sur le serveur (.nova_couleur_<login>, header.phtml) et, pour l'appliquer avant l'affichage de
   * chaque page (htmlheader.phtml), dans localStorage sous nova-couleur|<structure ou classe>|<login>. */
  // Palette (2026-11-07, utilisateur : 10 couleurs, du spectre entier, claires et foncées, texte blanc lisible ≥ 3,5:1).
  var PALETTE = [['corail', '#E0442E'], ['orange', '#D35400'], ['ambre', '#B87400'], ['vert', '#1E9447'], ['sapin', '#2E6B3A'],
    ['turquoise', '#008C95'], ['azur', '#0A7BD6'], ['nuit', '#1F3A6E'], ['violet', '#7B1FE0'], ['rose', '#D1106B']];
  function cleCouleur() {
    var meta = function (n) { var m = document.querySelector('meta[name="' + n + '"]'); return m ? m.content : ''; };
    var racine = meta('nova-structure') || meta('nova-classe').split('/')[0], u = meta('nova-utilisateur');
    return racine && u ? 'nova-couleur|' + racine + '|' + u : '';
  }
  function poserCouleur(nom) {
    var c = PALETTE.filter(function (p) { return p[0] === nom; })[0], cle = cleCouleur();
    if (c) document.documentElement.style.setProperty('--nova-accent', c[1]);
    else document.documentElement.style.removeProperty('--nova-accent');
    try { if (cle) { if (c) localStorage.setItem(cle, c[1]); else localStorage.removeItem(cle); } } catch (e) { /* sans stockage : cette page seulement */ }
  }
  // Accueil de l'élève (#nova-couleur, user.phtml) : la valeur du serveur fait foi (vide : badges ou réglage coupés).
  function couleurPerso() {
    var source = document.getElementById('nova-couleur');
    if (source) poserCouleur(source.getAttribute('data-couleur') || '');
  }
  // Carte « Ta récompense » dans l'onglet du badge qui débloque la couleur.
  function carteCouleur(d, niveau, requis, nomNiveau) {
    var a = function (n) { return d.getAttribute('data-' + n) || ''; };
    var carte = document.createElement('div');
    carte.className = 'nova-couleur-carte' + (niveau >= requis ? '' : ' nova-couleur-verrou');
    var h = document.createElement('p');
    h.className = 'nova-couleur-titre';
    h.textContent = a('coul-titre');
    carte.appendChild(h);
    var aide = document.createElement('p');
    aide.className = 'nova-couleur-aide';
    carte.appendChild(aide);
    if (niveau < requis) { aide.textContent = a('coul-verrou').replace('%s', nomNiveau); return carte; }
    aide.textContent = a('coul-aide');
    var noms = a('coul-noms').split(',');
    var actuelle = (document.getElementById('nova-couleur') || d).getAttribute('data-couleur') || '';
    var etat = document.createElement('p');
    etat.className = 'nova-couleur-etat';
    etat.setAttribute('aria-live', 'polite');
    var liste = document.createElement('div');
    liste.className = 'nova-couleur-liste';
    var boutons = [];
    var choisir = function (nom, envoyer) {
      actuelle = nom;
      boutons.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-couleur') === nom ? 'true' : 'false'); });
      var i = PALETTE.findIndex(function (p) { return p[0] === nom; });
      etat.textContent = i >= 0 ? a('coul-choisie').replace('%s', noms[i] || nom) : '';
      poserCouleur(nom);
      var source = document.getElementById('nova-couleur');
      if (source) source.setAttribute('data-couleur', nom === 'classe' ? '' : nom);
      if (envoyer) { var u = lienAccueil('&nova_couleur=' + nom); if (u) fetch(u, { credentials: 'same-origin' }).catch(function () {}); }
    };
    PALETTE.forEach(function (p, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'nova-couleur-pastille';
      b.style.background = p[1];
      b.setAttribute('data-couleur', p[0]);
      b.setAttribute('aria-label', noms[i] || p[0]);
      b.title = noms[i] || p[0];
      b.addEventListener('click', function () { choisir(p[0], true); });
      boutons.push(b);
      liste.appendChild(b);
    });
    carte.appendChild(liste);
    var classe = document.createElement('button');
    classe.type = 'button';
    classe.className = 'nova-couleur-classe';
    classe.textContent = a('coul-classe');
    classe.addEventListener('click', function () { choisir('classe', true); });
    carte.appendChild(classe);
    carte.appendChild(etat);
    choisir(actuelle, false);
    return carte;
  }

  /* Avatar de l'élève (demande de l'utilisateur, maquette validée le 2026-11-07) : Avataaars de DiceBear (js/avatar.js,
   * chargé seulement quand il faut dessiner). Jetons gagnés en réussissant des exercices, éléments ouverts avec eux ou
   * par les badges : tout est calculé et vérifié sur le serveur (_procs/avatar.awk, _widgets/avatar.phtml) ; ici,
   * seulement l'affichage. Le choix enregistré et son dessin sont gardés dans localStorage
   * (nova-avatar|<structure ou classe>|<login>) pour la barre et le menu Profil de toutes les pages ; l'accueil
   * (#nova-avatar-barre, user.phtml) dit ce qui vaut. Seuls l'élève et ses enseignants voient l'avatar. */
  var AVATAR_CATEGORIES = ['top', 'hairColor', 'skinColor', 'eyes', 'eyebrows', 'mouth', 'accessories', 'facialHair',
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
  // Choix « top.bob,eyes.happy,… » -> options de DiceBear.
  function optionsAvatar(choix) {
    var c = {};
    (choix || '').split(',').forEach(function (e) { var i = e.indexOf('.'); if (i > 0) c[e.slice(0, i)] = e.slice(i + 1); });
    var o = { seed: 'nova', nose: ['default'], topProbability: 100 };
    ['top', 'hairColor', 'skinColor', 'eyes', 'eyebrows', 'mouth', 'clothing', 'clothesColor', 'clothingGraphic', 'backgroundColor'].forEach(function (k) {
      if (c[k]) o[k] = [c[k]];
    });
    if (c.clothesColor) o.hatColor = [c.clothesColor];
    if (!c.accessories || c.accessories === 'aucun') o.accessoriesProbability = 0; else { o.accessories = [c.accessories]; o.accessoriesProbability = 100; }
    if (!c.facialHair || c.facialHair === 'aucun') o.facialHairProbability = 0;
    else { o.facialHair = [c.facialHair]; o.facialHairProbability = 100; if (c.hairColor) o.facialHairColor = [c.hairColor]; }
    return o;
  }
  var avatarScript = null;
  function chargerAvatar(src) {
    if (window.novaAvatar) return Promise.resolve(window.novaAvatar);
    if (!avatarScript) avatarScript = new Promise(function (ok, ko) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { if (window.novaAvatar) ok(window.novaAvatar); else ko(new Error('avatar')); };
      s.onerror = function () { avatarScript = null; ko(new Error('avatar')); };
      document.head.appendChild(s);
    });
    return avatarScript;
  }
  function lienMonAvatar() { return lienAccueil('&nova_avatar=1'); }
  // Suivi en salle (js/suivi.js) : dessin d'un avatar d'élève d'après son choix enregistré.
  window.novaAvatarDessin = function (choix, src) { return chargerAvatar(src).then(function (f) { return f(optionsAvatar(choix)); }); };
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
  function poserAvatarBarre(memo) {
    var barre = document.getElementById('wimstopbox');
    var ancien = document.querySelector('.nova-avatar-barre');
    if (!barre || !memo || !memo.uri || !barreOrdinaire(barre)) { if (ancien) ancien.remove(); return; }
    var a = ancien || document.createElement('a');
    a.className = 'nova-avatar-barre';
    a.href = lienMonAvatar();
    a.title = memo.titre || '';
    a.setAttribute('aria-label', memo.titre || '');
    var img = a.querySelector('img') || a.appendChild(document.createElement('img'));
    img.src = memo.uri;
    img.alt = '';
    if (!ancien) barre.appendChild(a);
  }
  function avatarBarre() {
    if (!document.getElementById('nova-eleve') || !cleAvatar()) return;
    var source = document.getElementById('nova-avatar-barre');
    var memo = lireAvatar();
    if (source) {
      var actif = source.getAttribute('data-actif') === 'oui';
      var choix = source.getAttribute('data-choix') || '';
      if (!actif) { memo = null; garderAvatar(null); }
      else {
        memo = { actif: 1, choix: choix, titre: source.getAttribute('data-titre') || '', uri: memo && memo.choix === choix ? memo.uri : '' };
        garderAvatar(memo);
        if (choix && !memo.uri) chargerAvatar(source.getAttribute('data-script')).then(function (dessin) {
          memo.uri = dessin(optionsAvatar(choix));
          garderAvatar(memo);
          poserAvatarBarre(memo);
        }).catch(function () {});
      }
    }
    if (!memo || !memo.actif) return;
    poserAvatarBarre(memo);
    // Menu Profil : « Mon avatar » après le nom.
    var profil = document.querySelector('#wimsmenumodubox .nova-profil');
    if (profil && !profil.querySelector('.profil_avatar')) {
      var d = document.createElement('div');
      d.className = 'menuitem profil_avatar';
      var a = document.createElement('a');
      a.href = lienMonAvatar();
      a.className = 'user';
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
      if (k === 'accessories' || k === 'facialHair') libres = ['aucun'];
      // Peau : tirage parmi les teintes naturelles (le jaune et l'orange restent au choix de l'élève).
      if (k === 'skinColor') libres = libres.filter(function (v) { return v !== 'f8d25c' && v !== 'fd9841'; });
      if (libres.length) choix[k] = libres[(graine + i * 7) % libres.length];
    });
    etat.enregistre.split(',').forEach(function (e) { var i = e.indexOf('.'); if (i > 0) choix[e.slice(0, i)] = e.slice(i + 1); });
    if (!choix.clothingGraphic) choix.clothingGraphic = (etat.ordre.clothingGraphic || ['pizza'])[0];
    var chaine = function (c) {
      return AVATAR_CATEGORIES.filter(function (k) { return c[k] && ouvert(k + '.' + c[k]); }).map(function (k) { return k + '.' + c[k]; }).join(',');
    };
    var badgesAvatar = {};
    (d.getAttribute('data-niveaux') || '').split(' ').slice(1).forEach(function (x) { var p = x.split(':'); badgesAvatar[p[0]] = [+p[1] || 0, p[2] === '1']; });
    var noms = t('categories').split(',');
    var niveaux = t('niveaux').split(',');

    // Squelette.
    var page = el('div', 'nova-avatar-editeur');
    var cote = el('div', 'nova-avatar-apercu');
    var portrait = el('div', 'nova-avatar-portrait');
    var grand = el('img');
    grand.alt = '';
    portrait.appendChild(grand);
    cote.appendChild(portrait);
    var ligneJetons = el('p', 'nova-avatar-jetons');
    var jeton = el('span', 'nova-avatar-jeton', 'J');
    jeton.setAttribute('aria-hidden', 'true');
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
    [onglets, note, grille, confirmer, legende].forEach(function (x) { droite.appendChild(x); });
    page.appendChild(droite);

    var aide = el('div', 'nova-avatar-regles');
    aide.appendChild(el('h2', '', t('regles')));
    var ul = el('ul');
    [t('regle1').replace('%n', regles[0]), t('regle2'), t('regle3').replace('%n', regles[1]), t('regle4').replace('%n', regles[2]), t('regle5')].forEach(function (x) { ul.appendChild(el('li', '', x)); });
    aide.appendChild(ul);
    d.appendChild(page);
    d.appendChild(aide);

    var catActive = 0, enAttente = null, occupe = false, dessin = null;
    var rendu = function (c) { return dessin ? dessin(optionsAvatar(AVATAR_CATEGORIES.map(function (k) { return c[k] ? k + '.' + c[k] : ''; }).filter(Boolean).join(','))) : ''; };
    var dire = function (texte) { message.textContent = texte || ''; };
    var nbOuverts = function (k) { return (etat.ordre[k] || []).filter(function (v) { return ouvert(k + '.' + v); }).length; };
    var dessiner = function () {
      var j = etat.jetons;
      nbJetons.textContent = (j.dispo === 1 ? t('jeton') : t('jetons')).replace('%n', j.dispo);
      barreJauge.style.width = Math.max(0, Math.min(100, j.pc)) + '%';
      prochain.textContent = j.reste === 1 ? t('prochain1') : t('prochain').replace('%n', j.reste);
      jour.textContent = t('jour').replace('%n', j.jour).replace('%m', j.max);
      if (!dessin) return;
      grand.src = rendu(choix);
      onglets.textContent = '';
      AVATAR_CATEGORIES.forEach(function (k, i) {
        if (!etat.ordre[k]) return;
        var b = el('button', 'nova-avatar-onglet');
        b.type = 'button';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', i === catActive ? 'true' : 'false');
        b.appendChild(document.createTextNode(noms[i] || k));
        b.appendChild(el('span', 'nova-avatar-compte', nbOuverts(k) + '/' + etat.ordre[k].length));
        b.addEventListener('click', function () { catActive = i; enAttente = null; dessiner(); });
        onglets.appendChild(b);
      });
      var k = AVATAR_CATEGORIES[catActive];
      var valeurs = etat.ordre[k] || [];
      note.textContent = k === 'clothingGraphic' ? t('motif') : t('ouverts').replace('%n', nbOuverts(k)).replace('%m', valeurs.length);
      grille.textContent = '';
      valeurs.forEach(function (v) {
        var e = k + '.' + v, s = etat.elements[e] || '';
        var essai = Object.assign({}, choix);
        essai[k] = v;
        if (k === 'clothingGraphic') essai.clothing = 'graphicShirt';
        var porte = choix[k] === v && (k !== 'clothingGraphic' || choix.clothing === 'graphicShirt');
        var b = el('button', 'nova-avatar-tuile' + (ouvert(e) ? '' : ' nova-avatar-ferme') + (porte ? ' nova-avatar-porte' : ''));
        b.type = 'button';
        b.setAttribute('aria-pressed', porte ? 'true' : 'false');
        var nomV = v === 'aucun' ? t('aucun') : v;
        var img = el('img');
        img.alt = '';
        img.src = rendu(essai);
        b.appendChild(img);
        if (s === '1' || s === '2') { b.appendChild(el('span', 'nova-avatar-prix', s)); nomV += ' (' + (s === '1' ? t('leg1') : t('leg2')) + ')'; }
        else if (/^badge-/.test(s)) { b.appendChild(el('span', 'nova-avatar-prix nova-avatar-etoile', '\u2605')); nomV += ' (' + t('leg3') + ')'; }
        b.title = nomV;
        b.setAttribute('aria-label', nomV);
        b.addEventListener('click', function () { cliquer(k, v, b.querySelector('img').src); });
        grille.appendChild(b);
      });
      confirmer.hidden = !enAttente;
    };
    var cliquer = function (k, v, uri) {
      var e = k + '.' + v, s = etat.elements[e] || '';
      dire('');
      if (ouvert(e)) {
        choix[k] = v;
        if (k === 'clothingGraphic') choix.clothing = 'graphicShirt';
        enAttente = null;
        dessiner();
        return;
      }
      enAttente = { k: k, v: v, s: s };
      confImg.src = uri;
      if (/^badge-/.test(s)) {
        // badge-<clé>-<niveau requis>-<0|1> ; niveau atteint et badge proposé : data-niveaux (« clé:niveau:1|0 »).
        var p = s.split('-'), b = badgesAvatar[p[1]] || [0, 0];
        var nomNiv = function (n) { return n > 0 ? (niveaux[n - 1] || String(n)) : '0'; };
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
        dessiner();
      }).catch(function () { dire(t('refus')); });
    });
    confNon.addEventListener('click', function () { enAttente = null; dessiner(); });
    boutonEnr.addEventListener('click', function () {
      var c = chaine(choix);
      envoyer('&nova_avatar_choix=' + c).then(function (m) {
        if (m !== 'choix' && etat.enregistre !== c) { dire(t('refus')); return; }
        dire(t('enregistre'));
        var memo = { actif: 1, choix: etat.enregistre, titre: (lireAvatar() || {}).titre || t('titre') || '', uri: rendu(choix) };
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
    var badgeCoul = reg[9] || 'aucun', requisCoul = +reg[10] || 2;
    var lignesNiv = { fidelite: mf, perseverance: mp, echauffement: mh, top: mt };
    panneaux.forEach(function (p) {
      if (p[0] !== badgeCoul) return;
      var detail = p[2], aide = detail.querySelector('.nova-badge-aide');
      var carte = carteCouleur(d, +lignesNiv[p[0]][2] || 0, requisCoul, noms[requisCoul - 1] || String(requisCoul));
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
  function racineLangue() { return document.documentElement.lang || 'fr'; }

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

  function demarrer() { placerMenu(); piedDePage(); propagationNova(); reglagesStructure(); reglagesStandard(); activiteLien(); menuServeur(); reconnexionCas(); apparenceNova(); apparenceClasse(); badgesClasse(); ecartsZones(); rubriqueBadges(); lienRubriqueBadges(); if (animationsCoupees()) document.documentElement.classList.add('nova-sans-animation'); autreExamen(); coursUnique(); oeilMotDePasse(); focusConnexion(); parcours(); parcoursExamen(); courseExercice(); feuilleExercices(); panneaux(); revelations(); accordeons(); menusDeroulants(); infobulles(); modeExamen(); profilLateral(); badges(); couleurPerso(); avatarBarre(); avatarPage(); chronoExercice(); retourEleve(); scores(); notesExamens(); libellesNotes(); examExercices(); carrousel(); notesNaN(); legendeTypes(); clavierMaths(); claviersReponse(); glisserTactile(); dominos(); aideExamen(); derniereConnexion(); imagesCliquables(); retourReponse(); boutonsCollants(); focusSuite(); initialiser(); chronometre(); serieEtapes(); typesExamen(); pagesExamen(); barreCompacte(); basculeMenu(); sectionsRepliables(); retourEnHaut(); centrerBarre(); }
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
