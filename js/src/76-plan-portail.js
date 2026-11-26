  /* ===== js/src/76-plan-portail.js : plan du portail (Gestion de structure) ===== */

  /* Plan du portail (2026-11-26, utilisateur, maquettes 1 a 4 de maquettes/structure-plan-2026-11-26.html) : premiere page
   * de « Gestion de structure » (adm/class/gateway, job=first), administrateur a la racine d'un portail. Donnees :
   * #nova-plan-donnees (_widgets/plan-portail.phtml, _procs/plan-portail.sh) ; textes : #nova-pp-textes
   * (lang/enseignant-textes, etiquette plan). Reglage std tableaux : page de WIMS seule.
   * - Une bande par niveau. Un seul programme : niveau et programme en tete, une tuile par classe (le cours de la classe,
   *   au nom de la classe) ; une classe sans cours en pointille. Aucun ou plusieurs programmes : une ligne par programme.
   *   Tuile : effectif, et le responsable seulement si ce n'est pas l'administrateur (choix de l'utilisateur).
   * - Un clic sur un niveau, un programme, une classe ou un cours ouvre un panneau (dialog) : raccourcis, puis le
   *   formulaire de proprietes de WIMS (lu sur la page de la zone, envoye par le navigateur dans un cadre cache : accents
   *   en windows-1252) en deux onglets, Proprietes et Acces ; autres acces de gestion ajoutes ou retires par les liens de
   *   WIMS (actype=add|del). Effacer = page de confirmation de WIMS.
   * - Acces sur demande : interrupteur (pastilles sur les tuiles, ligne par bande ; localStorage nova-pp-acces) et
   *   tableau « Qui a acces a quoi » (bouton Enseignants).
   * Les tableaux de WIMS restent dans la page, caches, derriere un bouton. Une requete a la fois, 1,6 s d'ecart (deux
   * requetes a moins d'1 s dans une session : la seconde est mal servie). */
  function planPortail() {
    var src = document.getElementById('nova-plan-donnees');
    var corps = document.querySelector('.wimsbody');
    if (!src || !corps || standard('tableaux') || document.getElementById('nova-pp')) return;
    var lignes = Array.prototype.slice.call(src.children);
    if (lignes.some(function (l) { return l.getAttribute('data-t') === 'trop'; })) return;
    var tx = document.getElementById('nova-pp-textes');
    var t = function (k, defaut) { return (tx && tx.getAttribute('data-' + k)) || defaut; };
    var el = function (tag, classe, contenu) {
      var e = document.createElement(tag);
      if (classe) e.className = classe;
      if (contenu !== undefined && contenu !== null) e.textContent = contenu;
      return e;
    };
    var portail = src.getAttribute('data-portail') || '';
    var MARQUES = new RegExp('[' + String.fromCharCode(768) + '-' + String.fromCharCode(879) + ']', 'g');
    var plat = function (s) { return (s || '').normalize('NFD').replace(MARQUES, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); };
    var admin = src.getAttribute('data-admin') || '';

    // Donnees
    var profs = {}, zones = {}, ordre = [], racineG = [];
    lignes.forEach(function (l) {
      var ty = l.getAttribute('data-t');
      if (ty === 'teacher') { profs[l.getAttribute('data-l')] = l.textContent.trim(); return; }
      if (ty === 'root') { racineG = (l.getAttribute('data-g') || '').split(' ').filter(Boolean); return; }
      var z = l.getAttribute('data-z');
      if (!z) return;
      zones[z] = { z: z, type: ty, titre: l.textContent.trim(), r: l.getAttribute('data-r') || 'supervisor',
        n: parseInt(l.getAttribute('data-n'), 10) || 0, s: l.getAttribute('data-s') || '', p: l.getAttribute('data-p') === '1',
        g: (l.getAttribute('data-g') || '').split(' ').filter(Boolean) };
      ordre.push(z);
    });
    var nomDe = function (login) { return login === 'supervisor' ? (admin || t('administrateur', 'administrator')) : (profs[login] || login); };
    // L'administrateur peut aussi avoir un compte d'enseignant a son nom : c'est encore « moi ».
    var estMoi = function (login) { return login === 'supervisor' || (!!admin && plat(profs[login] || '') === plat(admin)); };
    var initiales = function (login) {
      var mots = nomDe(login).split(/[\s-]+/).filter(Boolean);
      return ((mots[0] || '').charAt(0) + (mots.length > 1 ? mots[mots.length - 1].charAt(0) : '')).toUpperCase() || '?';
    };
    var parent = function (z) { return z.replace(/\/[^/]*$/, ''); };
    var tri = function (a, b) { return zones[a].titre.localeCompare(zones[b].titre, undefined, { numeric: true, sensitivity: 'base' }); };
    var niveaux = ordre.filter(function (z) { return zones[z].type === 'level'; });
    var dans = function (niv, type) { return ordre.filter(function (z) { return zones[z].type === type && parent(z) === niv; }); };
    // Cours « niveau/classe/prog » : classe = deux premiers segments, programme = niveau + numero sans lettre (201b = 2e cours).
    var coursDe = function (classe, prog) {
      return ordre.filter(function (z) {
        if (zones[z].type !== 'course') return false;
        var s = z.split('/');
        return s.length === 3 && s[0] + '/' + s[1] === classe && s[0] + '/' + s[2].replace(/[^0-9]/g, '') === prog;
      });
    };
    var eleves = function (n) { return (n === 0 ? t('eleves-0', '0 students') : n === 1 ? t('eleves-1', '%1 student') : t('eleves-n', '%1 students')).replace('%1', n); };

    // Session, compteur, requetes
    var session = '', compteur = 1;
    Array.prototype.forEach.call(document.querySelectorAll('a[href*="session="], input[name="session"]'), function (x) {
      var v = x.tagName === 'INPUT' ? 'session=' + x.value : x.getAttribute('href');
      var m = /session=([A-Za-z0-9]+)\.(\d+)/.exec(v);
      if (!m) return;
      if (!session) session = m[1];
      if (m[1] === session) compteur = Math.max(compteur, parseInt(m[2], 10));
    });
    if (!session) return;
    var adresse = function (suite) { compteur++; return 'wims.cgi?session=' + session + '.' + compteur + '&lang=' + encodeURIComponent(racineLangue()) + suite; };
    var dernier = Date.now(), file = Promise.resolve();
    var attendre = function () { return new Promise(function (r) { setTimeout(r, Math.max(0, 1600 - (Date.now() - dernier))); }); };
    // garde : requete abandonnee si elle ne sert plus quand vient son tour (panneau remplace par un autre).
    var lire = function (suite, garde) {
      var p = file.then(attendre).then(function () {
        if (garde && !garde()) throw new Error('abandon');
        dernier = Date.now();
        return fetch(adresse(suite), { credentials: 'same-origin' });
      }).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
        dernier = Date.now();
        return new DOMParser().parseFromString(new TextDecoder('windows-1252').decode(buf), 'text/html');
      });
      file = p.catch(function () { /* la suite de la file continue */ });
      return p;
    };
    var aller = function (suite) { attendre().then(function () { location.href = adresse(suite); }); };
    // Message d'erreur de WIMS (main.phtml du module : div.wims_msg.alert), sans l'avertissement de fin de session
    // (themes/_widgets/session_warn.phtml, #sess_dialog2, present et cache dans chaque page).
    var refus = function (doc) {
      var a = Array.prototype.filter.call(doc.querySelectorAll('.wims_msg.alert'), function (x) { return !x.closest('[id^="sess_dialog"]'); })[0];
      return a ? (a.textContent.replace(/\s+/g, ' ').trim() || '?') : '';
    };
    var rechargerPlan = function (rouvrir) {
      try { if (rouvrir) sessionStorage.setItem('nova-pp-rouvrir', JSON.stringify({ z: rouvrir.z, onglet: rouvrir.onglet, quand: Date.now() })); } catch (e) { /* panneau non rouvert */ }
      aller('&cmd=reply&job=first');
    };
    var JOB = { level: 'level', prog: 'prog', 'class': 'class', course: 'course' };
    var pageZone = function (z) { var ty = zones[z].type; return '&cmd=reply&job=' + JOB[ty] + (ty === 'course' ? '&cparent=class' : '') + '&' + JOB[ty] + '=' + encodeURIComponent(z); };
    var entrer = function (z, suite) {
      try { if (suite) sessionStorage.setItem('nova-pp-suite', JSON.stringify({ quoi: suite, quand: Date.now() })); } catch (e) { /* suite perdue */ }
      aller('&module=adm/class/classes&type=authsupervisor&class=' + encodeURIComponent(portail + '/' + z) + '&auth_user=supervisor');
    };

    // Page : les tableaux de WIMS (sauf titres et messages) vont dans un bloc cache.
    var plan = el('div', 'nova-pp');
    plan.id = 'nova-pp';
    var origine = el('div', 'nova-pp-origine');
    origine.hidden = true;
    Array.prototype.slice.call(corps.children).forEach(function (c) {
      if (c === src || c.matches('h1, h2, .title_box, .wims_msg, #nova-pp-textes, script, template') || c.id === 'nova-plan-donnees') return;
      origine.appendChild(c);
    });

    var acces = false;
    try { acces = localStorage.getItem('nova-pp-acces') === '1'; } catch (e) { /* pas de memoire */ }
    var outils = el('div', 'nova-pp-outils');
    var bouton = function (texte, action, classe) {
      var b = el('button', 'wims_button' + (classe ? ' ' + classe : ''), texte);
      b.type = 'button';
      b.addEventListener('click', action);
      return b;
    };
    outils.appendChild(bouton(t('niveau-ajouter', 'Add a level'), function () { aller('&cmd=reply&job=addlevel'); }, 'wims_secondary_button'));
    outils.appendChild(bouton(t('enseignants', 'Teachers (%1)').replace('%1', Object.keys(profs).length), quiAcces, 'wims_secondary_button'));
    outils.appendChild(bouton(t('sauvegarder', 'Back up'), function () { aller('&cmd=reply&job=backstruct'); }, 'wims_secondary_button'));
    var inter = el('button', 'nova-pp-interrupteur');
    inter.type = 'button';
    inter.setAttribute('role', 'switch');
    inter.appendChild(el('span', 'nova-pp-glissiere'));
    inter.appendChild(el('span', '', t('acces', 'Show access')));
    var montrerAcces = function (oui) {
      acces = oui;
      inter.setAttribute('aria-checked', oui ? 'true' : 'false');
      plan.classList.toggle('nova-pp-avec-acces', oui);
      try { localStorage.setItem('nova-pp-acces', oui ? '1' : '0'); } catch (e) { /* pas de memoire */ }
    };
    inter.addEventListener('click', function () { montrerAcces(!acces); });
    outils.appendChild(inter);
    plan.appendChild(outils);

    // Une puce de zone (niveau, programme), cliquable : ouvre le panneau.
    var CLASSE_ZONE = { level: 'wims_classes_direct_level', prog: 'wims_classes_direct_program', 'class': 'wims_classes_direct_class', course: 'wims_classes_direct_course' };
    var puce = function (z) {
      var b = el('button', 'nova-pp-puce ' + CLASSE_ZONE[zones[z].type], zones[z].titre);
      b.type = 'button';
      b.setAttribute('data-zone', z);
      b.addEventListener('click', function () { panneau(z); });
      return b;
    };
    var pastillesAcces = function (z) {
      var d = zones[z], p = el('span', 'nova-pp-acces');
      var r = el('span', 'nova-pp-pa nova-pp-pa-resp', initiales(d.r));
      r.title = t('leg-resp', 'manager') + ' : ' + nomDe(d.r);
      p.appendChild(r);
      d.g.forEach(function (g) { var x = el('span', 'nova-pp-pa', '+ ' + initiales(g)); x.title = t('leg-gestion', 'other management access') + ' : ' + nomDe(g); p.appendChild(x); });
      if (d.s && d.s !== 'all') { var s = el('span', 'nova-pp-pa nova-pp-pa-postes', t('acces-postes', 'trusted hosts')); s.title = d.s; p.appendChild(s); }
      return p;
    };
    var tuile = function (z, nom) {
      var d = zones[z];
      var b = el('button', 'nova-pp-tuile ' + CLASSE_ZONE[d.type]);
      b.type = 'button';
      b.setAttribute('data-zone', z);
      b.title = d.titre;
      b.appendChild(el('b', '', nom || d.titre));
      b.appendChild(el('small', '', eleves(d.n)));
      if (!estMoi(d.r)) b.appendChild(el('small', 'nova-pp-qui-resp', nomDe(d.r)));
      b.appendChild(pastillesAcces(z));
      b.addEventListener('click', function () { panneau(z); });
      return b;
    };
    var tuileSansCours = function (classe, prog) {
      var b = el('button', 'nova-pp-tuile nova-pp-sans-cours');
      b.type = 'button';
      b.setAttribute('data-zone', classe);
      b.appendChild(el('b', '', zones[classe].titre));
      b.appendChild(el('small', '', t('ouvrir-cours', 'Open the course')));
      b.addEventListener('click', function () { panneau(classe, null, prog); });
      return b;
    };
    var ajoutClasse = function (niv) {
      var b = el('button', 'nova-pp-ajout', '+');
      b.type = 'button';
      b.title = t('classe-ajouter', 'Add a class');
      b.setAttribute('aria-label', b.title);
      b.addEventListener('click', function () { aller('&cmd=reply&job=addclass&level=' + encodeURIComponent(niv)); });
      return b;
    };
    var rangee = function (niv, classes, prog) {
      var r = el('div', 'nova-pp-tuiles');
      classes.forEach(function (c) {
        if (!prog) { r.appendChild(tuile(c)); return; }
        var cs = coursDe(c, prog);
        if (!cs.length) r.appendChild(tuileSansCours(c, prog));
        cs.forEach(function (k, i) { r.appendChild(tuile(k, zones[c].titre + (i ? ' (' + (i + 1) + ')' : ''))); });
      });
      r.appendChild(ajoutClasse(niv));
      return r;
    };
    var resume = function (z) { return nomDe(zones[z].r) + (zones[z].g.length ? ', ' + t('acces-gestion', 'management access %1').replace('%1', zones[z].g.map(nomDe).join(', ')) : ''); };

    var bandes = el('div', 'nova-pp-plan');
    niveaux.forEach(function (niv) {
      var progs = dans(niv, 'prog'), classes = dans(niv, 'class').sort(tri);
      var bande = el('section', 'nova-pp-bande');
      bande.setAttribute('data-zone', niv);
      var tete = el('div', 'nova-pp-tete');
      var nom = el('div', 'nova-pp-nom');
      nom.appendChild(puce(niv));
      nom.appendChild(el('span', 'nova-pp-effectif', eleves(zones[niv].n)));
      tete.appendChild(nom);
      bande.appendChild(tete);
      if (progs.length === 1) {
        tete.appendChild(puce(progs[0]));
        bande.appendChild(rangee(niv, classes, progs[0]));
      } else {
        var lignesProg = el('div', 'nova-pp-lignes');
        if (!progs.length) {
          var lc = el('div', 'nova-pp-ligne');
          lc.appendChild(el('span', 'nova-pp-sans-prog', t('aucun-programme', 'No programme')));
          lc.appendChild(rangee(niv, classes, null));
          lignesProg.appendChild(lc);
        }
        progs.forEach(function (p) {
          var l = el('div', 'nova-pp-ligne');
          l.appendChild(puce(p));
          l.appendChild(rangee(niv, classes, p));
          lignesProg.appendChild(l);
        });
        bande.appendChild(lignesProg);
      }
      var ajoutProg = el('button', 'nova-pp-lien', t('programme-ajouter', 'Add a programme'));
      ajoutProg.type = 'button';
      ajoutProg.addEventListener('click', function () { aller('&cmd=reply&job=addprog&level=' + encodeURIComponent(niv)); });
      tete.appendChild(ajoutProg);
      // Acces du niveau (interrupteur) : responsables du niveau et des programmes, mot de passe des classes.
      var al = el('p', 'nova-pp-acces-niveau');
      al.appendChild(el('span', '', t('acces-niveau', 'Level: %1').replace('%1', resume(niv))));
      progs.forEach(function (p) { al.appendChild(el('span', '', t('acces-prog', '%1: %2').replace('%1', zones[p].titre).replace('%2', resume(p)))); });
      if (classes.length) {
        var avec = classes.filter(function (c) { return zones[c].p; }).length;
        al.appendChild(el('span', '', t('acces-mdp', 'Class enrolment passwords: %1 of %2').replace('%1', avec).replace('%2', classes.length)));
      }
      bande.appendChild(al);
      bandes.appendChild(bande);
    });
    if (!niveaux.length) bandes.appendChild(el('p', 'nova-pp-vide', t('aucun-niveau', 'No level yet.')));
    plan.appendChild(bandes);
    var leg = el('p', 'nova-pp-legende');
    [['nova-pp-pa nova-pp-pa-resp', 'AB', 'leg-resp', 'manager'], ['nova-pp-pa', '+ AB', 'leg-gestion', 'other management access'], ['nova-pp-pa nova-pp-pa-postes', t('acces-postes', 'trusted hosts'), 'leg-postes', 'access limited to some computers']].forEach(function (x) {
      var s = el('span');
      s.appendChild(el('span', x[0], x[1]));
      s.appendChild(document.createTextNode(' ' + t(x[2], x[3])));
      leg.appendChild(s);
    });
    plan.appendChild(leg);
    var voirWims = el('button', 'nova-pp-lien nova-pp-voir-wims', t('page-wims', 'WIMS tables'));
    voirWims.type = 'button';
    voirWims.setAttribute('aria-expanded', 'false');
    voirWims.addEventListener('click', function () {
      origine.hidden = !origine.hidden;
      voirWims.setAttribute('aria-expanded', origine.hidden ? 'false' : 'true');
    });
    plan.appendChild(voirWims);
    corps.appendChild(plan);
    corps.appendChild(origine);
    montrerAcces(acces);

    /* Panneau d'une zone. prog : programme dont la classe n'a pas de cours (tuile en pointille). onglet : 'acces'. */
    /* Panneau NON modal (2026-11-26, utilisateur) : la page reste visible et cliquable ; un clic sur une autre zone
     * remplace le panneau. Grand ecran : html.nova-pp-ouvert reserve sa place a droite (le plan se resserre) et le
     * panneau commence sous la barre du haut. Echap ou la croix le ferment. */
    function panneau(z, onglet, prog) {
      if (typeof document.createElement('dialog').show !== 'function') { aller(pageZone(z)); return; }
      var ancien = document.querySelector('dialog.nova-pp-panneau');
      if (ancien) ancien.close();
      var d = zones[z], ty = d.type;
      var dlg = el('dialog', 'nova-dialogue nova-pp-panneau');
      dlg.setAttribute('aria-labelledby', 'nova-pp-titre');
      var ent = el('div', 'nova-pp-p-tete');
      ent.appendChild(el('span', 'nova-pp-p-type ' + CLASSE_ZONE[ty], t('type-' + ty, ty)));
      var classeDuCours = ty === 'course' ? zones[z.split('/')[0] + '/' + z.split('/')[1]] : null;
      var h = el('h1', '', classeDuCours ? classeDuCours.titre : d.titre);
      h.id = 'nova-pp-titre';
      ent.appendChild(h);
      ent.appendChild(el('p', 'nova-pp-p-meta', eleves(d.n) + ' \u00b7 ' + t('code', 'code %1').replace('%1', portail + '/' + z) + (ty === 'course' ? ' \u00b7 ' + d.titre : '')));
      dlg.appendChild(ent);
      var fermer = el('button', 'close-button', '\u00d7');
      fermer.type = 'button';
      fermer.setAttribute('aria-label', t('fermer', 'Close'));
      fermer.addEventListener('click', function () { dlg.close(); });
      dlg.appendChild(fermer);

      // Raccourcis
      var rac = el('div', 'nova-pp-raccourcis');
      var r = function (texte, action, second) { rac.appendChild(bouton(texte, action, second ? 'wims_secondary_button' : '')); };
      r(t('entrer', 'Enter'), function () { entrer(z); });
      if (ty === 'course') {
        r(t('notes', 'Grades'), function () { entrer(z, 'notes'); }, true);
        r(t('participants', 'Participants'), function () { entrer(z, 'participants'); }, true);
        r(t('examens', 'Exams'), function () { entrer(z, 'examens'); }, true);
      } else if (ty === 'prog') {
        r(t('feuilles', 'Worksheets'), function () { entrer(z, 'feuilles'); }, true);
        r(t('examens', 'Exams'), function () { entrer(z, 'examens'); }, true);
      } else if (ty === 'class') {
        r(t('participants', 'Participants'), function () { entrer(z, 'participants'); }, true);
      } else if (ty === 'level') {
        r(t('classe-ajouter', 'Add a class'), function () { aller('&cmd=reply&job=addclass&level=' + encodeURIComponent(z)); }, true);
      }
      dlg.appendChild(rac);
      var erreur = el('p', 'nova-pp-erreur');
      erreur.setAttribute('role', 'alert');
      // Classe : ouvrir le cours de chaque programme du niveau qui n'en a pas (WIMS : addcourse, confirm).
      if (ty === 'class') {
        dans(parent(z), 'prog').filter(function (p) { return !coursDe(z, p).length; }).forEach(function (p) {
          var b = bouton(t('ouvrir-cours-prog', 'Open the %1 course').replace('%1', zones[p].titre), function () {
            b.disabled = true;
            erreur.textContent = '';
            lire('&cmd=reply&job=addcourse&cparent=class&class=' + encodeURIComponent(z) + '&courseclass=' + encodeURIComponent(z) + '&courseprog=' + encodeURIComponent(p) + '&confirm=yes').then(function (doc) {
              var e = refus(doc);
              if (e) throw new Error(e);
              rechargerPlan();
            }).catch(function (e) { erreur.textContent = t('erreur', 'WIMS refused: %1').replace('%1', e.message); b.disabled = false; });
          }, 'nova-pp-ouvrir' + (p === prog ? ' nova-pp-vise' : ''));
          rac.appendChild(b);
        });
      }

      // Onglets
      var onglets = el('div', 'nova-pp-onglets');
      onglets.setAttribute('role', 'tablist');
      var vuP = el('div', 'nova-pp-vue'), vuA = el('div', 'nova-pp-vue');
      var oP = el('button', '', t('onglet-proprietes', 'Properties')), oA = el('button', '', t('onglet-acces', 'Access'));
      var choisir = function (a) {
        oP.setAttribute('aria-selected', a ? 'false' : 'true');
        oA.setAttribute('aria-selected', a ? 'true' : 'false');
        vuP.hidden = a; vuA.hidden = !a;
      };
      [oP, oA].forEach(function (o, i) { o.type = 'button'; o.setAttribute('role', 'tab'); o.addEventListener('click', function () { choisir(i === 1); }); onglets.appendChild(o); });
      dlg.appendChild(onglets);
      var form = el('form', 'nova-pp-form');
      form.method = 'post';
      form.action = 'wims.cgi';
      form.appendChild(vuP);
      form.appendChild(vuA);
      dlg.appendChild(form);
      dlg.appendChild(erreur);
      vuP.appendChild(el('p', 'nova-pp-attente', t('chargement', 'Loading...')));

      // Autres acces de gestion (liens de WIMS, tout de suite)
      var gest = el('div', 'nova-pp-gestion');
      gest.appendChild(el('strong', '', t('autres', 'Other management access')));
      var ul = el('ul', 'nova-pp-gens');
      var actionAcces = function (actype, login) {
        erreur.textContent = '';
        lire(pageZone(z) + '&actype=' + actype + '&more=' + encodeURIComponent(login)).then(function (doc) {
          var e = refus(doc);
          if (e) throw new Error(e);
          rechargerPlan({ z: z, onglet: 'acces' });
        }).catch(function (e) { erreur.textContent = t('erreur', 'WIMS refused: %1').replace('%1', e.message); });
      };
      d.g.forEach(function (g) {
        var li = el('li', '', nomDe(g));
        var x = el('button', 'nova-pp-retirer', '\u00d7');
        x.type = 'button';
        x.setAttribute('aria-label', t('retirer', 'Remove %1').replace('%1', nomDe(g)));
        x.title = x.getAttribute('aria-label');
        x.addEventListener('click', function () { x.disabled = true; actionAcces('del', g); });
        li.appendChild(x);
        ul.appendChild(li);
      });
      if (!d.g.length) ul.appendChild(el('li', 'nova-pp-aucun', t('aucun-autre', 'None')));
      gest.appendChild(ul);
      var libres = Object.keys(profs).filter(function (l) { return l !== d.r && d.g.indexOf(l) < 0; });
      if (libres.length) {
        var ligneAjout = el('div', 'nova-pp-ajout-gestion');
        var sel = el('select');
        sel.setAttribute('aria-label', t('autres', 'Other management access'));
        libres.forEach(function (l) { var o = el('option', '', nomDe(l)); o.value = l; sel.appendChild(o); });
        ligneAjout.appendChild(sel);
        var ajouter = bouton(t('ajouter', 'Add'), function () { ajouter.disabled = true; actionAcces('add', sel.value); }, 'wims_secondary_button');
        ligneAjout.appendChild(ajouter);
        gest.appendChild(ligneAjout);
      }
      gest.appendChild(el('p', 'nova-pp-aide', t('autres-aide', '')));

      // Formulaire de proprietes de WIMS
      lire(pageZone(z), function () { return dlg.isConnected; }).then(function (doc) {
        var fs = doc.querySelector('form fieldset.property_fields');
        var f = fs && fs.closest('form');
        var job = f && f.querySelector('input[name="job"]');
        if (!f || !job || job.value !== JOB[ty]) throw new Error(refus(doc) || 'formulaire');
        vuP.textContent = '';
        var VERS_ACCES = /^(sup|pass|pass2|passs|passs2|sechost)$/;
        var champsAcces = [];
        Array.prototype.forEach.call(fs.querySelectorAll(':scope > .field'), function (c) {
          var saisies = c.querySelectorAll('input, select, textarea');
          if (!saisies.length) return;   // « montrer les mots de passe » : lien seul
          var copie = document.importNode(c, true);
          // Texte nu (espaces, &nbsp; de WIMS) : une case vide dans la grille du champ.
          Array.prototype.forEach.call(Array.prototype.slice.call(copie.childNodes), function (n) { if (n.nodeType === 3 && !n.nodeValue.replace(/[\s\u00a0]+/g, '')) n.remove(); });
          if (saisies[0].name === 'sup') Array.prototype.forEach.call(copie.querySelectorAll('.formHelp'), function (x) { x.remove(); });
          Array.prototype.forEach.call(copie.querySelectorAll('a[href]'), function (a) { a.target = '_blank'; a.rel = 'noopener'; });
          // Mots de passe : WIMS ecrit « Mot de passe » deux fois (inscription, responsable) avec la precision dessous ;
          // libelles explicites (textes mdp-...), precision retiree.
          var lib = copie.querySelector('label'), nomChamp = saisies[0].name;
          if (lib && /^pass/.test(nomChamp) && t('mdp-' + nomChamp, '')) {
            lib.textContent = t('mdp-' + nomChamp, '');
            Array.prototype.forEach.call(copie.querySelectorAll('.formHelp'), function (x) { x.remove(); });
          }
          if (VERS_ACCES.test(nomChamp)) champsAcces.push(copie); else vuP.appendChild(copie);
        });
        champsAcces.forEach(function (c, i) {
          vuA.appendChild(c);
          if (i === 0) vuA.appendChild(gest);   // apres le responsable
        });
        if (!champsAcces.length) vuA.appendChild(gest);
        var caches = { session: '', lang: racineLangue(), cmd: 'reply', job: JOB[ty] };
        caches[JOB[ty]] = z;
        if (ty === 'course') caches.cparent = 'class';
        Object.keys(caches).forEach(function (k) { var i = el('input'); i.type = 'hidden'; i.name = k; i.value = caches[k]; form.appendChild(i); });
        var envoi = f.querySelector('input[type="submit"][name="confirm"]');
        var pied = el('div', 'wimscenter');
        pied.appendChild(bouton(t('annuler', 'Cancel'), function () { dlg.close(); }, 'wims_secondary_button'));
        var ok = el('button', 'wims_button', t('enregistrer', 'Save'));
        ok.type = 'submit';
        ok.name = 'confirm';
        ok.value = envoi ? envoi.value : 'confirm';
        pied.appendChild(ok);
        form.appendChild(pied);
        var danger = el('div', 'nova-pp-danger');
        var lienEff = el('a', 'wims_button wims_warning', t('effacer-' + ty, 'Delete...'));
        lienEff.href = '#';
        lienEff.setAttribute('role', 'button');
        lienEff.addEventListener('click', function (e) { e.preventDefault(); aller('&cmd=reply&job=del' + JOB[ty] + (ty === 'course' ? '&cparent=class' : '') + '&del=' + encodeURIComponent(z)); });
        danger.appendChild(lienEff);
        dlg.appendChild(danger);
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          if (!form.reportValidity()) return;
          ok.disabled = true;
          erreur.textContent = '';
          ok.textContent = t('enregistrement', 'Saving...');
          envoyer().then(function (doc) {
            var refuse = refus(doc);
            if (refuse) throw new Error(refuse);
            rechargerPlan();
          }).catch(function (er) {
            erreur.textContent = t('erreur', 'WIMS refused: %1').replace('%1', er.message);
            ok.disabled = false;
            ok.textContent = t('enregistrer', 'Save');
          });
        });
        // Envoi par le navigateur (encodage de la page) dans un cadre cache ; le bouton porte le nom « confirm ».
        function envoyer() {
          return file.then(attendre).then(function () {
            return new Promise(function (fini, echec) {
              var nom = 'nova-pp-cadre-' + Date.now();
              var cadre = document.createElement('iframe');
              cadre.name = nom;
              cadre.hidden = true;
              cadre.setAttribute('aria-hidden', 'true');
              var garde = setTimeout(function () { cadre.remove(); echec(new Error('delai')); }, 30000);
              cadre.addEventListener('load', function () {
                var doc = cadre.contentDocument;
                if (!doc || !/wims\.cgi/.test(doc.location.href)) return;
                clearTimeout(garde);
                dernier = Date.now();
                fini(doc);
                setTimeout(function () { cadre.remove(); }, 0);
              });
              document.body.appendChild(cadre);
              form.target = nom;
              compteur++;
              form.querySelector('input[name="session"]').value = session + '.' + compteur;
              var c = el('input');
              c.type = 'hidden'; c.name = 'confirm'; c.value = ok.value;
              form.appendChild(c);
              dernier = Date.now();
              HTMLFormElement.prototype.submit.call(form);
              c.remove();
            });
          });
        }
      }).catch(function (e) {
        if (!dlg.isConnected) return;
        vuP.textContent = '';
        var p = el('p', 'nova-pp-erreur', t('erreur-chargement', 'The WIMS page could not be read.') + (e && e.message && e.message !== 'formulaire' ? ' ' + e.message : ''));
        vuP.appendChild(p);
        var a = el('a', 'nova-pp-lien', t('ouvrir-wims', 'Open the WIMS page'));
        a.href = '#';
        a.addEventListener('click', function (ev) { ev.preventDefault(); aller(pageZone(z)); });
        vuP.appendChild(a);
        vuA.appendChild(gest);
      });

      choisir(onglet === 'acces');
      var marquer = function (oui) {
        Array.prototype.forEach.call(plan.querySelectorAll('[data-zone="' + z + '"]'), function (x) { x.classList.toggle('nova-pp-choisi', oui); if (x.matches('button')) x.setAttribute('aria-expanded', oui ? 'true' : 'false'); });
      };
      var echap = function (e) { if (e.key === 'Escape' && !document.querySelector('dialog.nova-pp-qui')) dlg.close(); };
      dlg.addEventListener('close', function () {
        marquer(false);
        document.removeEventListener('keydown', echap);
        dlg.remove();
        if (!document.querySelector('dialog.nova-pp-panneau')) document.documentElement.classList.remove('nova-pp-ouvert');
      });
      document.addEventListener('keydown', echap);
      // Sous la barre du haut et sous le fil d'Ariane colle (cadre.css), qui passent au-dessus du panneau.
      var haut = 0;
      ['#wimstopbox', 'body > nav:has(> .breadcrumbs)'].forEach(function (sel) {
        var x = document.querySelector(sel);
        if (x && (sel === '#wimstopbox' || getComputedStyle(x).position === 'sticky')) haut = Math.max(haut, x.getBoundingClientRect().bottom);
      });
      if (haut) dlg.style.setProperty('--nova-pp-haut', haut + 'px');
      document.body.appendChild(dlg);
      document.documentElement.classList.add('nova-pp-ouvert');
      dlg.show();
      marquer(true);
      h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
    }

    /* « Qui a acces a quoi » : enseignants en lignes, portail puis niveaux en colonnes. Responsable de toutes les zones
     * d'un niveau = « tout » ; sinon les zones nommees, un clic ouvre l'onglet Acces de la zone. */
    function quiAcces() {
      if (typeof document.createElement('dialog').showModal !== 'function') { aller('&cmd=reply&job=teacher'); return; }
      var dlg = el('dialog', 'nova-dialogue nova-pp-qui');
      dlg.setAttribute('aria-labelledby', 'nova-pp-qui-titre');
      var h = el('h1', '', t('qui-titre', 'Who can access what'));
      h.id = 'nova-pp-qui-titre';
      dlg.appendChild(h);
      var fermer = el('button', 'close-button', '\u00d7');
      fermer.type = 'button';
      fermer.setAttribute('aria-label', t('fermer', 'Close'));
      fermer.addEventListener('click', function () { dlg.close(); });
      dlg.appendChild(fermer);
      var barre = el('div', 'nova-pp-outils');
      barre.appendChild(bouton(t('ajouter-enseignant', 'Add a teacher'), function () { aller('&cmd=reply&job=addteacher'); }));
      barre.appendChild(bouton(t('comptes', 'Teacher accounts'), function () { aller('&cmd=reply&job=teacher'); }, 'wims_secondary_button'));
      dlg.appendChild(barre);
      var defile = el('div', 'nova-pp-defile');
      var table = el('table', 'nova-pp-table');
      var thead = el('thead'), trh = el('tr');
      trh.appendChild(el('th', '', t('enseignant', 'Teacher')));
      trh.appendChild(el('th', '', t('portail', 'Portal')));
      niveaux.forEach(function (n) { trh.appendChild(el('th', '', zones[n].titre)); });
      thead.appendChild(trh);
      table.appendChild(thead);
      var tbody = el('tbody');
      var court = function (z) {
        var ty = zones[z].type;
        if (ty === 'course') { var c = z.split('/'); return (zones[c[0] + '/' + c[1]] || zones[z]).titre; }
        return zones[z].titre;
      };
      ['supervisor'].concat(Object.keys(profs)).forEach(function (login) {
        var tr = el('tr');
        var th = el('th', '', nomDe(login));
        th.setAttribute('scope', 'row');
        th.appendChild(el('small', '', login));
        tr.appendChild(th);
        var tdP = el('td');
        if (login === 'supervisor') tdP.appendChild(el('span', 'nova-pp-marque nova-pp-m-resp', t('administrateur', 'administrator')));
        else if (racineG.indexOf(login) >= 0) tdP.appendChild(el('span', 'nova-pp-marque nova-pp-m-gest', t('leg-gestion-court', 'management')));
        else tdP.appendChild(el('span', 'nova-pp-rien', '\u2014'));
        tr.appendChild(tdP);
        niveaux.forEach(function (n) {
          var td = el('td');
          var toutes = ordre.filter(function (z) { return z === n || z.indexOf(n + '/') === 0; });
          var resp = toutes.filter(function (z) { return zones[z].r === login; });
          var gestion = toutes.filter(function (z) { return zones[z].g.indexOf(login) >= 0; });
          // Une classe et son cours portent le meme nom : une seule marque (le cours ouvert au clic) ; niveau et programme
          // nommes avec leur type (meme nom dans un college). Responsable de plus de la moitie : « tout sauf … ».
          var sansAutres = toutes.filter(function (z) { return resp.indexOf(z) < 0; });
          if (resp.length && !sansAutres.length) td.appendChild(marque('nova-pp-m-resp', t('tout', 'everything'), n));
          else if (resp.length > toutes.length / 2) {
            var m = marque('nova-pp-m-resp', t('tout-sauf', 'everything except %1').replace('%1', regrouper(sansAutres).map(function (x) { return x.nom; }).join(', ')), n);
            td.appendChild(m);
          } else regrouper(resp).forEach(function (x) { td.appendChild(marque('nova-pp-m-resp', x.nom, x.z)); });
          regrouper(gestion).forEach(function (x) { td.appendChild(marque('nova-pp-m-gest', x.nom, x.z)); });
          if (!resp.length && !gestion.length) td.appendChild(el('span', 'nova-pp-rien', '\u2014'));
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      function regrouper(liste) {
        var vus = {}, res = [];
        liste.forEach(function (z) {
          var ty = zones[z].type;
          var nom = ty === 'level' || ty === 'prog' ? t('type-' + ty, ty).toLowerCase() + ' ' + zones[z].titre : court(z);
          if (vus[nom]) { if (ty === 'course') vus[nom].z = z; return; }
          vus[nom] = { nom: nom, z: z };
          res.push(vus[nom]);
        });
        return res;
      }
      function marque(classe, texte, z) {
        var b = el('button', 'nova-pp-marque ' + classe, texte);
        b.type = 'button';
        b.title = zones[z].titre;
        b.addEventListener('click', function () { dlg.close(); panneau(z, 'acces'); });
        return b;
      }
      table.appendChild(tbody);
      defile.appendChild(table);
      dlg.appendChild(defile);
      var l = el('p', 'nova-pp-legende');
      [['nova-pp-marque nova-pp-m-resp', t('leg-resp', 'manager')], ['nova-pp-marque nova-pp-m-gest', t('leg-gestion-court', 'management')]].forEach(function (x) { l.appendChild(el('span', x[0], x[1])); });
      l.appendChild(el('span', '', t('leg-tout', '')));
      dlg.appendChild(l);
      dlg.addEventListener('close', function () { dlg.remove(); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
      document.body.appendChild(dlg);
      dlg.showModal();
      fermer.focus();
    }

    // Panneau a rouvrir apres un changement d'acces (rechargerPlan).
    var re = null;
    try { re = JSON.parse(sessionStorage.getItem('nova-pp-rouvrir') || 'null'); sessionStorage.removeItem('nova-pp-rouvrir'); } catch (e) { re = null; }
    if (re && zones[re.z] && Date.now() - re.quand < 60000) panneau(re.z, re.onglet);
  }

  /* Suite d'un raccourci du plan du portail (planPortail, entrer) : apres l'entree dans la zone (accueil de la zone,
   * module home), page demandee. Notes, Participants : liens du menu de WIMS ; Feuilles, Examens : onglet de l'accueil. */
  function planPortailSuite() {
    var v = null;
    try { v = JSON.parse(sessionStorage.getItem('nova-pp-suite') || 'null'); } catch (e) { v = null; }
    if (!v) return;
    try { sessionStorage.removeItem('nova-pp-suite'); } catch (e) { /* rien */ }
    if (Date.now() - v.quand > 60000) return;
    var MODULES = { notes: 'adm%2Fclass%2Fuserscore', participants: 'adm%2Fclass%2Fusermanage' };
    if (MODULES[v.quoi]) {
      var a = Array.prototype.filter.call(document.querySelectorAll('#wimsmenumodubox a[href], .wimsbody a[href]'), function (x) {
        var h = x.getAttribute('href').replace(/\//g, '%2F');
        return h.indexOf('module=' + MODULES[v.quoi]) >= 0 && !/[?&]\+?job=/.test(h);
      })[0];
      if (a) setTimeout(function () { location.href = a.href; }, 1200);
      return;
    }
    var onglet = { feuilles: 'wims_supervisor_sheet', examens: 'wims_supervisor_exam' }[v.quoi];
    var lien = onglet && document.querySelector('a[href="#' + onglet + '"]');
    if (lien) setTimeout(function () { lien.click(); }, 300);
  }
