
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
    if (racineStyle().getPropertyValue('--nova-desactivation-forcee').replace(/["']/g, '').trim() !== 'oui') return;
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
    // Réglages lus seulement sur la page des examens (audit B2, 2026-11-13) : getComputedStyle force un recalcul de la page.
    var cs = null;
    var mots = function (v, defaut) { cs = cs || racineStyle(); return (texteCss(cs.getPropertyValue(v)) || defaut).split(',').map(plat).filter(Boolean); };
    var motsT, motsN, motsD;
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
    motsT = mots('--nova-echauffement-entrainement', 'entrainement');
    motsN = mots('--nova-echauffement-note', 'not\u00e9, test');
    // Mot-clé de DM WIMS obligatoire (2026-11-08, utilisateur : « DMWIMS » ou « DM », éventuellement suivi d'un numéro).
    motsD = mots('--nova-dm-mots', 'DMWIMS, DM');
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

  /* Colonne « No » des tableaux de ressources de l'accueil de l'enseignant (audit D3, 2026-11-13, utilisateur) : l'icône
   * et le numéro seuls ; le mot de WIMS (« Feuille », « Examen », « Document »...) reste lu par les lecteurs d'écran
   * (.nova-num-mot, caché à l'écran) et en info-bulle. Cellule sur une ligne. Réglage « Textes du thème standard ». */
  function numerosRessources() {
    if (standard('textes')) return;
    var cellules = document.querySelectorAll('.wimsbody :is(#wims_supervisor_doc, #wims_supervisor_sheet, #wims_supervisor_exam, #wims_supervisor_vote, #wims_supervisor_tool, #wims_supervisor_freework, #wims_supervisor_glossary) table > tbody > tr > td:first-child:not([data-nova-num])');
    Array.prototype.forEach.call(cellules, function (td) {
      td.setAttribute('data-nova-num', '');
      var marche = document.createTreeWalker(td, NodeFilter.SHOW_TEXT), n, textes = [];
      while ((n = marche.nextNode())) if (n.nodeValue.trim()) textes.push(n);
      if (textes.length !== 1) return;
      var m = /^(\s*)([^\d\s][^\d]*?)([\s\u00a0]*)(\d+)\s*$/.exec(textes[0].nodeValue);
      if (!m) return;
      var mot = document.createElement('span');
      mot.className = 'nova-num-mot';
      mot.textContent = m[2] + ' ';
      textes[0].parentNode.insertBefore(mot, textes[0]);
      textes[0].nodeValue = m[4];
      td.title = (m[2] + ' ' + m[4]).replace(/\s+/g, ' ').trim();
      td.classList.add('nova-num-seul');
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
      function bloquer(e) { if (e.cancelable) e.preventDefault(); }
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
        document.removeEventListener('touchmove', bloquer, { passive: false });
        var sansClic = function (e) { e.stopPropagation(); e.preventDefault(); };
        document.addEventListener('click', sansClic, true);
        setTimeout(function () { document.removeEventListener('click', sansClic, true); }, 0);
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
      document.addEventListener('touchmove', bloquer, { passive: false });
      boucle = requestAnimationFrame(defiler);
    }
    // Toute la barre de titre sert de poignée (2026-11-13, utilisateur), sauf ses boutons et liens. Souris, stylet : le
    // glisser part après 5 px de déplacement (un simple clic reste un clic). Doigt : sur la poignée, tout de suite ; ailleurs
    // dans la barre, après un appui maintenu (sinon la page ne défilerait plus au doigt).
    cartes.forEach(function (d) {
      var tete = d.querySelector(':scope > .nova-seq-tete');
      if (!tete || !d.querySelector('.nova-seq-poignee')) return;
      tete.classList.add('nova-seq-saisissable');
      tete.addEventListener('pointerdown', function (ev) {
        if (occupe || !ev.isPrimary || (ev.pointerType === 'mouse' && ev.button !== 0)) return;
        if (ev.target.closest('button, a, input, select, .nova-etat-menu')) return;
        var surPoignee = !!ev.target.closest('.nova-seq-poignee');
        if (surPoignee && ev.pointerType !== 'mouse') { ev.preventDefault(); glisser(d, ev); return; }
        var x0 = ev.clientX, y0 = ev.clientY, attente = 0;
        var depart = function (e) { arreter(); glisser(d, e); };
        var arreter = function () {
          clearTimeout(attente);
          document.removeEventListener('pointermove', bouge);
          document.removeEventListener('pointerup', arreter);
          document.removeEventListener('pointercancel', arreter);
        };
        var bouge = function (e) {
          var loin = Math.abs(e.clientX - x0) + Math.abs(e.clientY - y0);
          if (ev.pointerType === 'touch') { if (loin > 8) arreter(); }
          else if (loin > 5) depart(e);
        };
        if (ev.pointerType === 'mouse') ev.preventDefault();
        if (ev.pointerType === 'touch') attente = setTimeout(function () { depart({ clientX: x0, clientY: y0 }); if (navigator.vibrate) navigator.vibrate(15); }, 350);
        document.addEventListener('pointermove', bouge);
        document.addEventListener('pointerup', arreter);
        document.addEventListener('pointercancel', arreter);
      });
      // Pas de menu contextuel sur un appui long dans la barre.
      tete.addEventListener('contextmenu', function (e) { if (!e.target.closest('a, button')) e.preventDefault(); });
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

    // Message d'accueil (adm/class/motd) : WIMS efface sans rien demander ; Nova demande (audit C8, 2026-11-14).
    // Lien d'un message (classe ou eleve) ou bouton du formulaire commun (eleves choisis ou tous).
    function effacerMotd(titre, partir) {
      var f = fenetre('corbeille', 'r', titre, '');
      f.corps.appendChild(el('p', '', t('motd-effacer')));
      annuler(f).focus();
      bouton(f, t('b-effacer'), 'r', function (b) { b.disabled = true; partir(); });
    }
    document.addEventListener('click', function (ev) {
      if (ev.defaultPrevented || ev.button !== 0 || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey || !tx.hasAttribute('data-motd-effacer')) return;
      var m = ev.target.closest && ev.target.closest('.wimsbody a.wims_warning[href*="job=delete"], .wimsbody input.wims_warning[type="submit"]');
      if (!m) return;
      var href = m.getAttribute('href') || '';
      var form = m.form;
      if (href ? !/motd/.test(href) : !(form && form.querySelector('input[name="module"][value="adm/class/motd"]'))) return;
      ev.preventDefault();
      if (href) {
        effacerMotd(t(/user=\.CLASS\./.test(href) ? 'motd-classe' : 'motd-eleve'), function () { location.href = m.href; });
        return;
      }
      effacerMotd(t('motd-choix'), function () {
        if (form.requestSubmit) { form.requestSubmit(m); return; }
        var h = document.createElement('input');
        h.type = 'hidden'; h.name = m.name; h.value = m.value;
        form.appendChild(h);
        form.submit();
      });
    }, true);

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

  // Accueil de l'enseignant en cartes (audit D4, 2026-11-14, utilisateur, maquette B) : bienvenue, échéance, Guide,
  // participants connectés et lien des séquences rangés dans une carte, avant celle des onglets (CSS). Cartes : aspect
  // seul, pas de réglage « thème standard ». Masqués avant son passage (contenu.css) : nova-cartes-pretes les révèle.
  function accueilEnseignantCartes() {
    var racine = document.documentElement;
    try {
      var corps = document.querySelector('.wimsbody');
      // Accueil d'une classe, d'un groupement ou d'un portail : onglets des ressources ou moteur de recherche (classe vide).
      var salut = corps && corps.querySelector(':scope > .wims_greetings');
      if (!salut || !racine.classList.contains('nova-role-prof') || !corps.querySelector(':scope > :is(#widget_supervisor_list, #wims_supervisor_search)')) return;
      var carte = document.createElement('section');
      carte.className = 'nova-carte-classe';
      salut.parentNode.insertBefore(carte, salut);
      // Jusqu'au premier bloc qui n'en fait pas partie : onglets, moteur, message de WIMS (« Pour démarrer rapidement »).
      // « Aucun participant connecté » : div.wims_msg juste après le bouton Guide (sans liste), gardé dans la carte.
      var fin = function (e) {
        if (e.nodeType !== 1) return false;
        if (e.matches('#widget_supervisor_list, #wims_supervisor_search, fieldset, form')) return true;
        if (!e.matches('div.wims_msg')) return false;
        var dernier = carte.lastElementChild;
        return !(dernier && dernier.matches('a.wims_button_help, .wims_greetings') && !e.querySelector('ul, ol'));
      };
      for (var x = carte.nextSibling; x && !fin(x);) {
        var suivant = x.nextSibling;
        if (!(x.nodeType === 1 && x.matches('script, style, template'))) carte.appendChild(x);
        x = suivant;
      }
    } finally {
      racine.classList.add('nova-cartes-pretes');
    }
  }

  /* Liaison tableur (adm/class/userscore job=csv ; audit C2, 2026-11-14, utilisateur, maquette validée) : les deux
   * formulaires en cartes (la phrase de WIMS en tête), le format en boutons accolés (la liste de WIMS reste, cachée),
   * les cases en pastilles groupées (Élèves, Feuilles, Indicateur, Examens…, Autres ; pastilles : CSS sur
   * input[name=csvdownload] + label, sans attendre nova.js), l'envoi de fichier en zone de dépôt. Noms techniques de
   * WIMS (sheet3, examduration2…) remplacés par « Feuille 3 », « Examen 2 », gardés en petit : réglage « textes ».
   * Cartes et pastilles : aspect seul. Formulaires masqués avant son passage (contenu.css), secours 3 s. */
  function exportTableur() {
    var racine = document.documentElement;
    var tx = document.getElementById('nova-export-textes');
    var bas = document.querySelector('.wimsbody form input[name="csvtype"][value="download"]');
    if (!tx || !bas) { racine.classList.add('nova-export-pret'); return; }
    var t = function (k, a) { return (tx.getAttribute('data-' + k) || '').replace('%1', a == null ? '' : a); };
    var el = function (tag, classe, texte) { var e = document.createElement(tag); if (classe) e.className = classe; if (texte != null) e.textContent = texte; return e; };
    var nettoyer = function (x) { return x.replace(/[\s\u00a0:]+$/, '').replace(/^[\s\u00a0]+/, ''); };
    // La phrase de WIMS (nœud texte en tête du formulaire) devient le titre de la carte.
    var intro = function (box) {
      var x = box.firstChild;
      for (; x; x = x.nextSibling) if (x.nodeType === 3 && x.nodeValue.trim()) break;
      if (!x) return;
      var h = el('p', 'nova-export-titre', nettoyer(x.nodeValue.replace(/\s+/g, ' ')));
      box.insertBefore(h, x);
      x.remove();
      // Bouton Aide qui suit la phrase : à côté du titre.
      var aide = h.nextElementSibling;
      if (aide && aide.matches('a.wims_button_help')) h.appendChild(aide);
    };
    try {
      // Titre de page : l'entrée du menu qui mène ici (« Liaison tableur »), absente du menu simplifié : texte de Nova.
      var m = document.querySelector('#wimsmenumodubox a[href*="job=csv"]');
      var h1 = document.querySelector('#wims_modu_title1 > h1.wims_title');
      var titre = m ? m.textContent.trim() : t('titre');
      if (titre && h1 && !standard('textes')) { h1.textContent = titre; document.title = titre; }

      var form1 = bas.form, box1 = form1.querySelector('.wims_form') || form1;
      form1.classList.add('nova-export');
      intro(box1);
      // Format : boutons accolés qui pilotent la liste de WIMS.
      var sel = form1.querySelector('select#csvformat');
      if (sel) {
        var seg = el('span', 'nova-export-format');
        seg.setAttribute('role', 'radiogroup');
        Array.prototype.forEach.call(sel.options, function (o) {
          var b = el('button', '', o.textContent.trim().toUpperCase());
          b.type = 'button';
          b.setAttribute('role', 'radio');
          var maj = function () { Array.prototype.forEach.call(seg.children, function (c, i) { c.setAttribute('aria-checked', sel.selectedIndex === i ? 'true' : 'false'); }); };
          b.addEventListener('click', function () { sel.value = o.value; maj(); sel.dispatchEvent(new Event('change', { bubbles: true })); });
          seg.appendChild(b);
          maj();
        });
        Array.prototype.forEach.call(seg.children, function (c, i) { c.setAttribute('aria-checked', sel.selectedIndex === i ? 'true' : 'false'); });
        sel.hidden = true;
        sel.parentNode.insertBefore(seg, sel);
      }
      // Cases : une rangée par groupe.
      var autres = null, groupes = [];
      Array.prototype.forEach.call(form1.querySelectorAll('.field > ul > li'), function (li) {
        var cases = li.querySelectorAll('input[name="csvdownload"]');
        if (!cases.length) return;
        var b = li.querySelector(':scope > b');
        var g = el('div', 'nova-export-groupe');
        var titre = b ? nettoyer(b.textContent.replace(/\s+/g, ' ')) : (!groupes.length ? t('eleves') : '');
        var puces = el('div', 'nova-export-puces');
        Array.prototype.forEach.call(cases, function (c) {
          var lab = li.querySelector('label[for="' + c.id + '"]');
          puces.appendChild(c);
          if (lab) puces.appendChild(lab);
        });
        if (!titre && cases.length === 1) {
          if (!autres) { autres = el('div', 'nova-export-groupe'); autres.appendChild(el('span', 'nova-export-groupe-titre', t('autres'))); autres.appendChild(el('div', 'nova-export-puces')); }
          while (puces.firstChild) autres.lastChild.appendChild(puces.firstChild);
          li.remove();
          return;
        }
        if (titre) g.appendChild(el('span', 'nova-export-groupe-titre', titre));
        g.appendChild(puces);
        li.textContent = '';
        li.appendChild(g);
        groupes.push(g);
      });
      if (autres) {
        var ul = form1.querySelector('.field > ul');
        if (ul) { var li2 = el('li'); li2.appendChild(autres); ul.appendChild(li2); }
      }
      // Libellés lisibles, nom de WIMS en petit.
      if (!standard('textes')) {
        Array.prototype.forEach.call(form1.querySelectorAll('input[name="csvdownload"]'), function (c) {
          var lab = form1.querySelector('label[for="' + c.id + '"]');
          if (!lab || lab.textContent.trim() !== c.value) return;
          var v = c.value, r;
          var lisible = tx.getAttribute('data-col-' + v) ||
            ((r = /^sheet(?:exo)?(\d+)$/.exec(v)) ? t('feuille', r[1]) :
              (r = /^exam(?:exo|duration)?(\d+)$/.exec(v)) ? t('examen', r[1]) :
                (r = /^average(\d+)$/.exec(v)) ? t('moyenne') + (r[1] !== '1' ? ' ' + r[1] : '') : '');
          if (!lisible) return;
          lab.textContent = lisible + ' ';
          lab.appendChild(el('small', 'nova-export-tech', v));
        });
      }
      // Envoi d'un fichier : zone de dépôt.
      var haut = document.querySelector('.wimsbody form input[name="csvtype"][value="upload"]');
      if (haut) {
        var form2 = haut.form, box2 = form2.querySelector('.wims_form') || form2;
        form2.classList.add('nova-export');
        intro(box2);
        var f = form2.querySelector('input[type="file"]');
        if (f) {
          var zone = el('label', 'nova-depot');
          var ligne = el('span', 'nova-depot-texte', t('deposer') + ' ');
          ligne.appendChild(el('strong', '', t('choisir')));
          var nom = el('span', 'nova-depot-nom');
          nom.setAttribute('aria-live', 'polite');
          f.parentNode.insertBefore(zone, f);
          // Libellé de WIMS (« Fichier de données ») avant le champ : retiré, la zone le remplace.
          var prev = zone.previousSibling;
          if (prev && prev.nodeType === 3 && prev.nodeValue.trim()) prev.remove();
          zone.appendChild(f);
          zone.appendChild(ligne);
          zone.appendChild(nom);
          f.addEventListener('change', function () { nom.textContent = f.files && f.files[0] ? f.files[0].name : ''; zone.classList.toggle('nova-depot-plein', !!nom.textContent); });
          ['dragenter', 'dragover'].forEach(function (k) { zone.addEventListener(k, function () { zone.classList.add('nova-depot-survol'); }); });
          ['dragleave', 'drop'].forEach(function (k) { zone.addEventListener(k, function () { zone.classList.remove('nova-depot-survol'); }); });
        }
        var hr = form2.previousElementSibling;
        if (hr && hr.tagName === 'HR') hr.remove();
      }
    } finally {
      racine.classList.add('nova-export-pret');
    }
  }

  /* Message d'accueil (adm/class/motd ; audit C2, 2026-11-14, utilisateur, maquette validée) : les boutons de chaque
   * élève (Modifier, Effacer, Écrire une alerte), empilés dans la dernière colonne, rangés dans un menu « ... » qui
   * s'ouvre dans la cellule (le tableau défile : pas de menu flottant). Réglage « Tableaux du thème standard ». */
  function motdActions() {
    var tx = document.getElementById('nova-confirm-textes');
    var table = document.getElementById('TABLE_userlist');
    if (!tx || !tx.hasAttribute('data-motd-actions') || !table || !table.tBodies[0] || standard('tableaux')) return;
    var menus = [];
    Array.prototype.forEach.call(table.tBodies[0].rows, function (tr) {
      var td = tr.cells[tr.cells.length - 1];
      var liens = td ? td.querySelectorAll('a.wims_button') : [];
      if (liens.length < 2) return;
      var nom = tr.cells[1] ? tr.cells[1].textContent.replace(/\s+/g, ' ').trim() : '';
      var d = document.createElement('details');
      d.className = 'nova-actions';
      var s = document.createElement('summary');
      s.className = 'nova-actions-bouton';
      s.setAttribute('aria-label', tx.getAttribute('data-motd-actions').replace('%1', nom));
      s.title = s.getAttribute('aria-label');
      s.textContent = '\u22ef';
      var liste = document.createElement('div');
      liste.className = 'nova-actions-liste';
      Array.prototype.forEach.call(liens, function (a) { liste.appendChild(a); });
      d.appendChild(s);
      d.appendChild(liste);
      td.textContent = '';
      td.appendChild(d);
      menus.push(d);
      d.addEventListener('toggle', function () {
        if (d.open) menus.forEach(function (m) { if (m !== d) m.open = false; });
      });
    });
    if (!menus.length) return;
    document.addEventListener('click', function (e) { menus.forEach(function (m) { if (m.open && !m.contains(e.target)) m.open = false; }); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      menus.forEach(function (m) { if (m.open) { m.open = false; m.querySelector('summary').focus(); } });
    });
  }
