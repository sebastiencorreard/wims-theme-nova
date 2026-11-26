  /* Zones de travail de l'accueil d'un portail, en bandes par niveau (2026-11-27, utilisateur : « inspire-toi de la
   * presentation de Gestion de structure, sans les boutons d'actions »). Meme dessin que le plan du portail
   * (76-plan-portail.js, classes nova-pp-*), sans panneau ni acces : chaque niveau, programme, cours ou classe est un lien
   * de WIMS. Donnees : la liste de WIMS elle-meme (modules/home/subclasses_supervisor.phtml, scripts/adm/class/graphclass),
   * gardee dans la page, masquee ; aucun fichier lu sur le serveur. Une zone non supervisee y est un texte sans lien (le
   * niveau d'un cours, par exemple) : son code vient du premier lien en dessous. Un cours (L/C/P) apparait sous sa classe et
   * sous son programme : une seule tuile, au nom de la classe. Textes : #nova-za-textes (_widgets/zones-accueil.phtml).
   * Reglage std « listes » : liste de WIMS. */
  function zonesAccueil() {
    var tx = document.getElementById('nova-za-textes');
    var style = document.getElementById('nova-za-style');
    var fin = function () { if (style) style.remove(); };
    if (!tx || standard('listes')) { fin(); return; }
    try { zonesAccueilBandes(tx); } finally { fin(); }
  }
  function zonesAccueilBandes(tx) {
    var details = [].filter.call(document.querySelectorAll('.wimsbody details'), function (d) { return d.querySelector(':scope > ul.wims_subclasses'); })[0];
    if (!details || details.querySelector('.nova-za')) return;
    var liste = details.querySelector(':scope > ul.wims_subclasses');
    var racine = tx.getAttribute('data-portail') || '';
    if (!racine) return;
    var t = function (k, d) { return tx.getAttribute('data-' + k) || d; };
    var el = function (tag, classe, texte) { var e = document.createElement(tag); if (classe) e.className = classe; if (texte != null) e.textContent = texte; return e; };
    var plat = function (s) { return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase(); };
    var moi = plat(t('moi', ''));
    var codeDe = function (a) {
      var m = /[?&+]class=([0-9A-Za-z%\/]+)/.exec(a.getAttribute('href') || '');
      if (!m) return '';
      var c = decodeURIComponent(m[1]);
      return c.indexOf(racine + '/') === 0 ? c.slice(racine.length + 1) : '';
    };
    var TYPES = { level: 'level', 'class': 'class', program: 'prog', course: 'course' };
    var zones = {}, ordre = [], autres = [];
    Array.prototype.forEach.call(liste.querySelectorAll('span[class*="wims_classes_direct_"]'), function (span) {
      var tw = (/wims_classes_direct_([a-z]+)/.exec(span.className) || [])[1] || '';
      var a = span.querySelector('a[href]');
      var code = a ? codeDe(a) : '';
      if (!code && !a) {
        var li = span.closest('li'), dessous = li && li.querySelector('ul a[href*="class="]');
        var c2 = dessous ? codeDe(dessous) : '', p = c2.split('/');
        if (c2) code = tw === 'level' ? p[0] : tw === 'class' && p.length > 1 ? p[0] + '/' + p[1] : tw === 'program' && p.length > 1 ? p[0] + '/' + p[p.length - 1].replace(/[a-z]+$/, '') : '';
      }
      var nom = (a ? a.textContent : span.textContent.replace(/\s*\([^)]*\)\s*$/, '')).replace(/\s+/g, ' ').trim();
      var reste = a ? span.textContent.replace(a.textContent, '').replace(/\s+/g, ' ').trim() : '';
      var prof = (/^\((.*)\)$/.exec(reste) || [])[1] || '';
      if (!code || !TYPES[tw]) { if (a) autres.push({ nom: nom, lien: a.href, tw: tw, prof: prof }); return; }
      var z = zones[code];
      if (!z) { z = zones[code] = { code: code, type: TYPES[tw], tw: tw, nom: nom, lien: '', prof: '' }; ordre.push(code); }
      if (a && !z.lien) z.lien = a.href;
      if (prof && !z.prof) z.prof = prof;
    });
    if (!ordre.length) return;
    var partie = function (code, type) {
      var p = code.split('/');
      if (type === 'level') return p[0];
      if (type === 'class') return p[0] + '/' + p[1];
      if (type === 'prog') return p[0] + '/' + (p[2] || '').replace(/[a-z]+$/, '');
      return code;
    };
    var niveaux = [];
    ordre.forEach(function (c) { var n = c.split('/')[0]; if (niveaux.indexOf(n) < 0) niveaux.push(n); });
    var tri = function (a, b) { return a.nom.localeCompare(b.nom, undefined, { numeric: true, sensitivity: 'base' }); };
    var CLASSE_ZONE = { level: 'wims_classes_direct_level', prog: 'wims_classes_direct_program', 'class': 'wims_classes_direct_class', course: 'wims_classes_direct_course' };
    var puce = function (z, type, nom) {
      var e = el(z && z.lien ? 'a' : 'span', 'nova-pp-puce ' + CLASSE_ZONE[type], z ? z.nom : nom);
      if (z && z.lien) e.href = z.lien;
      return e;
    };
    // Une tuile : lien sur toute la tuile ; nom de la classe ; responsable s'il n'est pas l'utilisateur ; lien discret
    // vers la classe elle-meme (participants, inscriptions) quand l'utilisateur la supervise.
    var tuile = function (z, nom, classe) {
      var d = el('div', 'nova-pp-tuile nova-za-tuile ' + CLASSE_ZONE[z.type]);
      if (/reguser/.test(z.lien)) d.classList.add('nova-pp-sans-cours');
      var a = el('a', 'nova-za-lien');
      a.href = z.lien;
      a.title = z.nom;
      a.appendChild(el('b', '', nom));
      d.appendChild(a);
      if (z.prof && plat(z.prof) !== moi) d.appendChild(el('small', 'nova-pp-qui-resp', z.prof));
      if (classe && classe.lien && classe !== z) {
        var c = el('a', 'nova-za-classe');
        c.href = classe.lien;
        c.title = t('classe', 'Class %1').replace('%1', classe.nom);
        c.setAttribute('aria-label', c.title);
        d.appendChild(c);
      }
      return d;
    };
    var rangee = function (items) {
      var r = el('div', 'nova-pp-tuiles');
      items.sort(tri).forEach(function (x) { r.appendChild(tuile(x.z, x.nom, x.classe)); });
      return r;
    };
    var plan = el('div', 'nova-pp-plan nova-za');
    niveaux.forEach(function (n) {
      var dans = function (type) { return ordre.filter(function (c) { return zones[c].type === type && c.split('/')[0] === n; }).map(function (c) { return zones[c]; }); };
      var cours = dans('course'), classes = dans('class');
      var progs = [];
      dans('prog').forEach(function (p) { progs.push(p.code); });
      cours.forEach(function (k) { var p = partie(k.code, 'prog'); if (progs.indexOf(p) < 0) progs.push(p); });
      var avecCours = {};
      var itemsDe = function (prog) {
        var vus = {};
        return cours.filter(function (k) { return !prog || partie(k.code, 'prog') === prog; }).map(function (k) {
          var c = zones[partie(k.code, 'class')];
          avecCours[partie(k.code, 'class')] = true;
          var nom = c ? c.nom : k.nom;
          vus[nom] = (vus[nom] || 0) + 1;
          return { z: k, nom: vus[nom] > 1 ? nom + ' (' + vus[nom] + ')' : nom, classe: c };
        });
      };
      var bande = el('section', 'nova-pp-bande');
      var tete = el('div', 'nova-pp-tete');
      var nom = el('div', 'nova-pp-nom');
      nom.appendChild(puce(zones[n], 'level', n));
      tete.appendChild(nom);
      bande.appendChild(tete);
      var lignes = [];
      if (progs.length <= 1) {
        if (progs.length && zones[progs[0]]) tete.appendChild(puce(zones[progs[0]], 'prog'));
        lignes.push([null, itemsDe(progs[0] || null)]);
      } else {
        progs.forEach(function (p) { lignes.push([p, itemsDe(p)]); });
      }
      var seules = classes.filter(function (c) { return !avecCours[c.code] && c.lien; }).map(function (c) { return { z: c, nom: c.nom, classe: null }; });
      if (lignes.length === 1) {
        bande.appendChild(rangee(lignes[0][1].concat(seules)));
      } else {
        var bloc = el('div', 'nova-pp-lignes');
        lignes.forEach(function (l) {
          if (!l[1].length) return;
          var ligne = el('div', 'nova-pp-ligne');
          ligne.appendChild(zones[l[0]] ? puce(zones[l[0]], 'prog') : el('span'));
          ligne.appendChild(rangee(l[1]));
          bloc.appendChild(ligne);
        });
        if (seules.length) {
          var ls = el('div', 'nova-pp-ligne');
          ls.appendChild(el('span'));
          ls.appendChild(rangee(seules));
          bloc.appendChild(ls);
        }
        bande.appendChild(bloc);
      }
      plan.appendChild(bande);
    });
    if (autres.length) {
      var ba = el('section', 'nova-pp-bande');
      var ta = el('div', 'nova-pp-tete');
      ta.appendChild(el('div', 'nova-pp-nom nova-za-autres', t('autres', 'Other areas')));
      ba.appendChild(ta);
      var ra = el('div', 'nova-pp-tuiles');
      autres.forEach(function (x) {
        var d = el('div', 'nova-pp-tuile nova-za-tuile wims_classes_direct_' + x.tw);
        var a = el('a', 'nova-za-lien');
        a.href = x.lien;
        a.appendChild(el('b', '', x.nom));
        d.appendChild(a);
        if (x.prof && plat(x.prof) !== moi) d.appendChild(el('small', 'nova-pp-qui-resp', x.prof));
        ra.appendChild(d);
      });
      ba.appendChild(ra);
      plan.appendChild(ba);
    }
    liste.hidden = true;
    liste.insertAdjacentElement('afterend', plan);
  }
