
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
    var ul = document.createElement('ul');
    var points = (f.getAttribute('data-points') || '').split('|');
    // Feuille dont des exercices sont dans un examen (contourné aussi, 2026-11-08) : un point de plus, en deuxième.
    if (/examen/.test(f.getAttribute('data-examen') || '') && f.getAttribute('data-point-examen')) points.splice(1, 0, f.getAttribute('data-point-examen'));
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
      actionAccueil('&nova_desactiver=' + t + ':' + n, lienSession('&cmd=new&module=adm%2Fclass%2F' + t + '&' + t + '=' + n));
    };
    // Sauvegarde de la classe avant de désactiver (2026-11-10, utilisateur, maquette ; case cochée par défaut) : la
    // sauvegarde complète de WIMS (adm/class/config, job=arch, job2=download, selection=all), .zip, sinon .tgz (serveur
    // sans « zip » : pack.sh échoue, vu sur le banc). Deux requêtes (l'entrée dans le module ignore job=…), 1,5 s d'écart,
    // puis le fichier (lien getfile de la page) récupéré et enregistré par le navigateur. Échec : rien n'est désactivé.
    var caseSauver = document.createElement('label');
    caseSauver.className = 'nova-forcer-sauver';
    var cocher = document.createElement('input');
    cocher.type = 'checkbox';
    cocher.checked = true;
    var libSauver = document.createElement('span');
    var gras = document.createElement('b');
    gras.textContent = f.getAttribute('data-sauver') || 'Download a backup of the class first (.zip)';
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
    sansSauver.addEventListener('click', function () { sansSauver.disabled = true; etape(2); desactiver(); });
    ok.addEventListener('click', function (e) {
      e.preventDefault();
      if (ok.getAttribute('aria-disabled') === 'true') return;
      ok.setAttribute('aria-disabled', 'true');
      ok.classList.add('disabled');
      if (!cocher.checked || !window.fetch || !window.Promise) { desactiver(); return; }
      ul.hidden = true; caseSauver.hidden = true; echec.hidden = true; sansSauver.hidden = true;
      suivi.hidden = false;
      libelleOk();
      etape(0);
      sauvegarder().then(function () { etape(2); return pause(1500); }).then(desactiver).catch(function () {
        etapes[0].className = 'echec';
        echec.hidden = false; sansSauver.hidden = false;
        ok.textContent = f.getAttribute('data-reessayer') || 'Try again';
        ok.removeAttribute('aria-disabled');
        ok.classList.remove('disabled');
      });
    });
    libelleOk();
    actions.appendChild(annuler);
    actions.appendChild(sansSauver);
    actions.appendChild(ok);
    d.appendChild(actions);
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
      b.className = 'wims_button nova-dm-note';
      b.setAttribute('role', 'button');
      b.textContent = texte('dm-note', 'Create the graded homework');
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
        b.textContent = texte('dm-note-encours', 'Creating\u2026');
        var suite = function () { setTimeout(function () { location.href = b.href; }, 1500); };   // 2 requêtes à < 1 s : la 2e est mal servie
        if (!modele) { suite(); return; }
        fetch(modele.lien, { credentials: 'same-origin' }).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
          var html = new TextDecoder('windows-1252').decode(buf);
          var d = new DOMParser().parseFromString(html, 'text/html').querySelector('textarea[name="desc"]');
          if (d) { p.desc = d.value; ecrireSS('nova-dm-note', p); }
        }).catch(function () { /* description de l'entraînement */ }).then(suite);
      });
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
  function configurationClasse() {
    if (standard('listes')) return;
    var corps = document.querySelector('.wimsbody');
    if (!corps) return;
    var config = /adm(%2F|\/)class(%2F|\/)config/;
    var arch = corps.querySelector('ul.wims_nopuce > li > a[href*="job=arch"]');
    if (!arch || !config.test(arch.href) || corps.querySelector('.nova-cfg')) return;
    var enfants = function (el, tag) { return Array.prototype.filter.call(el.children, function (c) { return c.tagName === tag; }); };
    var nettoyer = function (s) { return s.replace(/\s+/g, ' ').trim().replace(/^\(\s*/, '').replace(/\s*\)?[\s.,]*$/, '').replace(/\s*\)$/, ''); };
    // Description : nœuds qui suivent le libellé (texte, autres liens), parenthèses de WIMS retirées.
    var description = function (noeuds) {
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
    var icone = function (h) {
      for (var i = 0; i < CONFIG_ICONES.length; i++) if (CONFIG_ICONES[i][0].test(h)) return CONFIG_ICONES[i][1];
      return '';
    };
    var ligne = function (li) {
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
      ico.setAttribute('data-icone', icone(a.getAttribute('href') || ''));
      a.classList.add('nova-cfg-lien');
      var tete2 = document.createElement('span');
      tete2.className = 'nova-cfg-tete';
      var apres = noeuds.slice(noeuds.indexOf(a) + 1);
      var tags = apres.filter(function (n) { return n.nodeType === 1 && n.classList.contains('nova-tag-nouveau'); });
      apres = apres.filter(function (n) { return tags.indexOf(n) < 0; });
      noeuds.slice(0, noeuds.indexOf(a)).forEach(function (n) { if (n.nodeType === 3) li.removeChild(n); });
      tete2.appendChild(a);
      tags.forEach(function (t) { tete2.appendChild(t); });
      var d = description(apres);
      li.textContent = '';
      li.appendChild(ico); li.appendChild(tete2);
      if (d) li.appendChild(d);
      return li;
    };
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
      var ajouter = function (li) { if (!carte) nouvelleCarte(); carte.appendChild(ligne(li)); };
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
        carte.appendChild(ligne(lp));
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
    var avancees = [];
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
      if (radios.length > 2) c.classList.add('nova-tuile-double');
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
