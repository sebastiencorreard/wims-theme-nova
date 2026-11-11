
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
