
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
