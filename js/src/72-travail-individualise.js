  /* ===== js/src/72-travail-individualise.js : travail individualisé, carte de réglage de la page de présentation d'une feuille (suspendu : TI_ACTIF ; sorti de 70-enseignant.js le 2026-11-19, revue de structure) ===== */
  /* Travail individualisé (TI, 2026-11-18, utilisateur ; maquette https://claude.ai/artifact/9UtPLmgMtKheLgsQqf9yXf) :
   * carte en tête de l'onglet « Page de présentation » d'une feuille (adm/class/sheet, #prpage), seulement si la feuille
   * a une page de présentation (réglage de WIMS). Elle lit les titres des exercices (#td_exo_<k>, cellule suivante) et
   * les groupe comme le moteur (ti/moteur-ti.src : même nom sans « * » ni virgule = même type de tâche, nombre de « * »
   * = niveau ; niveau en double rangé dans « Autres exercices »). Réglages : mode, seuil, ordre (glisser par la poignée,
   * flèches). « Écrire » relit le moteur sur le serveur (windows-1252), y remplace les lignes ti_mode, ti_seuil,
   * ti_ordre, garde les textes tx_ de la page en place, puis envoie le formulaire de WIMS (job=prpage). La page de
   * l'élève refait le regroupement elle-même à chaque affichage : la carte n'est qu'une aide. Textes :
   * lang/enseignant-textes.phtml (:ti) ; adresse du moteur : #nova-ti-moteur (header.phtml). */
  function travailIndividualise() {
    if (!TI_ACTIF) return;
    var tx = document.getElementById('nova-ti-textes');
    var src = document.getElementById('nova-ti-moteur');
    var panneau = document.getElementById('prpage');
    var zone = panneau && panneau.querySelector('textarea[name="wims_deposit"]');
    if (!tx || !src || !zone || !zone.form) return;
    // Réglage « Travail individualisé » (site, structure ou classe ; 2026-11-18, utilisateur) : désactivé par défaut.
    if (racineStyle().getPropertyValue('--nova-travail-individualise').replace(/["']/g, '').trim() !== 'oui') return;
    var t = function (k, a, b, c) {
      return (tx.getAttribute('data-' + k) || '').replace('%1', a == null ? '' : a).replace('%2', b == null ? '' : b).replace('%3', c == null ? '' : c);
    };
    var el = function (tag, classe, texte) { var e = document.createElement(tag); if (classe) e.className = classe; if (texte != null) e.textContent = texte; return e; };
    var etoiles = function (n) { return new Array(n + 1).join('*').replace(/\*/g, String.fromCharCode(9733)); };

    // Exercices de la feuille, groupés comme par le moteur.
    var exos = [];
    for (var k = 1; k <= 64; k++) {
      var td = document.getElementById('td_exo_' + k);
      if (!td || !td.nextElementSibling) break;
      var titre = td.nextElementSibling.textContent.replace(/\s+/g, ' ').trim();
      var nom = titre.replace(/\*/g, '').replace(/,/g, '').replace(/\s+/g, ' ').trim();
      exos.push({ n: k, nom: nom, niveau: nom ? (titre.match(/\*/g) || []).length : 0, virgule: titre.indexOf(',') >= 0 });
    }
    var groupes = [], parNom = {}, autres = [], alertes = [];
    exos.forEach(function (e) {
      if (e.virgule && e.niveau) alertes.push(t('virgule', e.n));
      if (!e.niveau) { autres.push(e); return; }
      var g = parNom[e.nom];
      if (!g) { g = parNom[e.nom] = { nom: e.nom, niveaux: {} }; groupes.push(g); }
      if (g.niveaux[e.niveau]) { alertes.push(t('doublon', e.nom, e.niveau, e.n)); autres.push(e); return; }
      g.niveaux[e.niveau] = e;
    });
    groupes.forEach(function (g) {
      var max = Math.max.apply(null, Object.keys(g.niveaux).map(Number));
      for (var lv = 1; lv < max; lv++) if (!g.niveaux[lv]) alertes.push(t('manque', g.nom, lv));
    });

    // Page en place : version du moteur et réglages.
    var actuel = zone.value;
    var marque = /Travail individualise \(theme Nova\) - version (\d+)/;
    var mVersion = marque.exec(actuel);
    var reglage = function (type, nom) {
      var r = new RegExp('\\\\def\\{' + type + ' ' + nom + '=([^}\\n]*)\\}').exec(actuel);
      return r ? r[1].trim() : null;
    };
    var mode = mVersion && reglage('text', 'ti_mode') === 'evaluation' ? 'evaluation' : 'entrainement';
    var seuil = mVersion ? parseInt(reglage('integer', 'ti_seuil'), 10) : NaN;
    if (!(seuil >= 0 && seuil <= 100)) seuil = 80;
    var voulu = mVersion ? (reglage('text', 'ti_ordre') || '').split(',').map(function (s) { return s.trim(); }) : [];
    var ordre = voulu.filter(function (n) { return parNom[n]; });
    groupes.forEach(function (g) { if (ordre.indexOf(g.nom) < 0) ordre.push(g.nom); });

    // Carte.
    var carte = el('section', 'nova-ti-carte');
    carte.setAttribute('aria-labelledby', 'nova-ti-carte-titre');
    var h = el('h3', 'nova-ti-carte-titre', t('titre'));
    h.id = 'nova-ti-carte-titre';
    carte.appendChild(h);
    carte.appendChild(el('p', 'nova-ti-aide', t('intro')));
    var ligne = function (libelle, pour) {
      var d = el('div', 'nova-ti-ligne');
      var l = el(pour ? 'label' : 'span', 'nova-ti-libelle', libelle);
      if (pour) l.htmlFor = pour; else l.id = 'nova-ti-lib-' + Math.random().toString(36).slice(2, 8);
      d.appendChild(l);
      var v = el('div', 'nova-ti-valeur');
      d.appendChild(v);
      carte.appendChild(d);
      return { valeur: v, libelle: l };
    };

    var etat = el('p', 'nova-ti-etat');
    etat.setAttribute('role', 'status');
    var change = function () { etat.textContent = t('modifie'); etat.classList.add('nova-ti-modifie'); };

    // Mode.
    var lm = ligne(t('mode'));
    var seg = el('div', 'nova-ti-segment');
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-labelledby', lm.libelle.id);
    var aideMode = el('p', 'nova-ti-aide');
    var boutonsMode = ['entrainement', 'evaluation'].map(function (m) {
      var b = el('button', '', t(m));
      b.type = 'button';
      b.addEventListener('click', function () { if (mode !== m) { mode = m; majMode(); change(); } });
      seg.appendChild(b);
      return b;
    });
    var majMode = function () {
      boutonsMode[0].setAttribute('aria-pressed', mode === 'entrainement' ? 'true' : 'false');
      boutonsMode[1].setAttribute('aria-pressed', mode === 'evaluation' ? 'true' : 'false');
      aideMode.textContent = t('aide-' + mode);
    };
    majMode();
    lm.valeur.appendChild(seg);
    lm.valeur.appendChild(aideMode);

    // Seuil.
    var ls = ligne(t('seuil'), 'nova-ti-seuil');
    var bloc = el('div', 'nova-ti-seuil');
    var curseur = el('input');
    curseur.type = 'range'; curseur.id = 'nova-ti-seuil'; curseur.min = '50'; curseur.max = '100'; curseur.step = '5';
    curseur.value = String(seuil);
    var sortie = el('output', '', seuil + ' %');
    sortie.htmlFor = 'nova-ti-seuil';
    curseur.addEventListener('input', function () { seuil = +curseur.value; sortie.textContent = seuil + ' %'; change(); });
    bloc.appendChild(curseur);
    bloc.appendChild(sortie);
    ls.valeur.appendChild(bloc);
    ls.valeur.appendChild(el('p', 'nova-ti-aide', t('aide-seuil')));

    // Ordre des types de tâche.
    var bo = el('div', 'nova-ti-bloc-ordre');
    var lo = el('p', 'nova-ti-libelle', t('ordre'));
    lo.id = 'nova-ti-lib-ordre';
    bo.appendChild(lo);
    var liste = el('ol', 'nova-ti-ordre');
    liste.setAttribute('aria-labelledby', 'nova-ti-lib-ordre');
    if (groupes.length) {
      bo.appendChild(el('p', 'nova-ti-aide', t('aide-ordre')));
      ordre.forEach(function (n) {
        var g = parNom[n];
        var niv = Object.keys(g.niveaux).map(Number).sort(function (a, b) { return a - b; });
        var li = el('li');
        li.setAttribute('data-nom', n);
        var poignee = el('span', 'nova-ti-poignee');
        poignee.setAttribute('aria-hidden', 'true');
        poignee.title = t('glisser', n);
        li.appendChild(poignee);
        var nm = el('span', 'nova-ti-nom', n);
        nm.appendChild(el('small', '', niv.map(etoiles).join(' ') + ' \u00b7 ' + t('exercices', niv.map(function (v) { return g.niveaux[v].n; }).join(', '))));
        li.appendChild(nm);
        var fl = el('span', 'nova-ti-fleches');
        [['monter', -1], ['descendre', 1]].forEach(function (f) {
          var b = el('button', 'nova-ti-' + f[0]);
          b.type = 'button';
          b.setAttribute('aria-label', t(f[0], n));
          b.title = t(f[0], n);
          b.addEventListener('click', function () {
            var voisin = f[1] < 0 ? li.previousElementSibling : li.nextElementSibling;
            if (!voisin) return;
            if (f[1] < 0) liste.insertBefore(li, voisin); else liste.insertBefore(voisin, li);
            majFleches(); change(); b.focus();
          });
          fl.appendChild(b);
        });
        li.appendChild(fl);
        poignee.addEventListener('pointerdown', function (ev) { if (ev.isPrimary && (ev.pointerType !== 'mouse' || ev.button === 0)) glisser(li, ev); });
        liste.appendChild(li);
      });
      bo.appendChild(liste);
    } else {
      var aucun = el('p', 'wims_msg warning nova-ti-alerte', t('aucun'));
      bo.appendChild(aucun);
    }
    if (autres.length) {
      var la = el('ol', 'nova-ti-ordre nova-ti-autres');
      var li = el('li', 'nova-ti-fixe');
      li.appendChild(el('span'));
      var nm = el('span', 'nova-ti-nom', t('autres'));
      nm.appendChild(el('small', '', t('autres-detail') + ' \u00b7 ' + t('exercices', autres.map(function (e) { return e.n; }).join(', '))));
      li.appendChild(nm);
      la.appendChild(li);
      bo.appendChild(la);
    }
    carte.appendChild(bo);
    function majFleches() {
      var lis = liste.children;
      for (var i = 0; i < lis.length; i++) {
        lis[i].querySelector('.nova-ti-monter').disabled = i === 0;
        lis[i].querySelector('.nova-ti-descendre').disabled = i === lis.length - 1;
      }
    }
    majFleches();
    // Glisser : la ligne suit le pointeur et prend la place de la voisine dont elle dépasse le milieu.
    function glisser(li, ev) {
      ev.preventDefault();
      var y0 = ev.clientY, haut0 = li.offsetTop, avant = li.previousElementSibling;
      li.classList.add('nova-ti-glisse');
      var bouger = function (e) {
        var d = e.clientY - y0;
        for (var garde = 0; garde < 64; garde++) {
          var centre = haut0 + d + li.offsetHeight / 2, p = li.previousElementSibling, s = li.nextElementSibling;
          if (p && centre < p.offsetTop + p.offsetHeight / 2) liste.insertBefore(li, p);
          else if (s && centre > s.offsetTop + s.offsetHeight / 2) liste.insertBefore(s, li);
          else break;
        }
        li.style.transform = 'translateY(' + Math.round(haut0 + d - li.offsetTop) + 'px)';
      };
      var finir = function () {
        document.removeEventListener('pointermove', bouger);
        document.removeEventListener('pointerup', finir);
        document.removeEventListener('pointercancel', finir);
        li.style.transform = '';
        li.classList.remove('nova-ti-glisse');
        majFleches();
        if (li.previousElementSibling !== avant) change();
      };
      document.addEventListener('pointermove', bouger);
      document.addEventListener('pointerup', finir);
      document.addEventListener('pointercancel', finir);
    }

    // Alertes.
    if (alertes.length) {
      var al = el('div', 'wims_msg warning nova-ti-alerte');
      al.setAttribute('role', 'note');
      var ul = el('ul');
      alertes.forEach(function (a) { ul.appendChild(el('li', '', a)); });
      al.appendChild(ul);
      carte.appendChild(al);
    }

    // État de la page en place, puis écriture.
    var moteur = null, versionMoteur = null;
    var etatInitial = function () {
      etat.classList.remove('nova-ti-modifie');
      if (!actuel.trim()) etat.textContent = t('etat-aucune');
      else if (!mVersion) etat.textContent = t('etat-autre');
      else if (versionMoteur && +versionMoteur > +mVersion[1]) etat.textContent = t('etat-ancienne', mVersion[1], versionMoteur);
      else etat.textContent = t('etat-ti', mVersion[1]);
    };
    var adresse = src.getAttribute('data-src');
    var lireMoteur = function () {
      if (moteur) return Promise.resolve(moteur);
      return fetch(adresse, { cache: 'no-cache', credentials: 'same-origin' }).then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.arrayBuffer();
      }).then(function (b) {
        var s = new TextDecoder('windows-1252').decode(b);
        var v = marque.exec(s);
        if (!v) throw new Error('moteur');
        moteur = s; versionMoteur = v[1];
        return s;
      });
    };
    lireMoteur().then(function () { if (!etat.classList.contains('nova-ti-modifie') && !etat.classList.contains('nova-ti-fait')) etatInitial(); }).catch(function () { /* relu à l'écriture */ });
    etatInitial();

    var actions = el('div', 'nova-ti-actions');
    var ecrire = el('button', 'nova-ti-ecrire', t('ecrire'));
    ecrire.type = 'button';
    var question = el('div', 'nova-ti-question');
    question.hidden = true;
    question.appendChild(el('span', '', t('remplacer-question')));
    var oui = el('button', 'nova-ti-ecrire', t('remplacer'));
    oui.type = 'button';
    var non = el('button', 'nova-ti-annuler', t('annuler'));
    non.type = 'button';
    question.appendChild(oui);
    question.appendChild(non);
    actions.appendChild(ecrire);
    actions.appendChild(question);
    carte.appendChild(etat);
    carte.appendChild(actions);

    var remplacerLigne = function (s, type, nom, valeur) {
      return s.replace(new RegExp('\\\\def\\{' + type + ' ' + nom + '=[^}\\n]*\\}'), function () { return '\\def{' + type + ' ' + nom + '=' + valeur + '}'; });
    };
    var envoyer = function () {
      ecrire.disabled = oui.disabled = true;
      lireMoteur().then(function (s) {
        s = remplacerLigne(s, 'text', 'ti_mode', mode);
        s = remplacerLigne(s, 'integer', 'ti_seuil', seuil);
        var noms = Array.prototype.map.call(liste.children, function (li) { return li.getAttribute('data-nom'); });
        s = remplacerLigne(s, 'text', 'ti_ordre', noms.join(','));
        // Textes de la page en place (modifiés à la main) : gardés.
        if (mVersion) (actuel.match(/\\def\{text tx_[a-z_]+=[^\n]*\}/g) || []).forEach(function (l) {
          var nom = /tx_[a-z_]+/.exec(l)[0];
          s = s.replace(new RegExp('\\\\def\\{text ' + nom + '=[^\\n]*\\}'), function () { return l; });
        });
        zone.value = s;
        try { sessionStorage.setItem('nova-ti-ecrit', String(Date.now())); } catch (e) { /* sans stockage */ }
        var save = zone.form.querySelector('input[type="submit"][name="save"]');
        if (zone.form.requestSubmit && save) zone.form.requestSubmit(save); else if (save) save.click(); else zone.form.submit();
      }).catch(function () {
        etat.textContent = t('erreur');
        etat.classList.add('nova-ti-modifie');
        ecrire.disabled = oui.disabled = false;
      });
    };
    ecrire.addEventListener('click', function () {
      if (actuel.trim() && !mVersion) { ecrire.hidden = true; question.hidden = false; oui.focus(); return; }
      envoyer();
    });
    oui.addEventListener('click', envoyer);
    non.addEventListener('click', function () { question.hidden = true; ecrire.hidden = false; ecrire.focus(); });

    panneau.insertBefore(carte, panneau.firstChild);

    // Page qui suit l'écriture : message, et l'onglet « Page de présentation » rouvert.
    var quand = 0;
    try { quand = +sessionStorage.getItem('nova-ti-ecrit') || 0; sessionStorage.removeItem('nova-ti-ecrit'); } catch (e) { /* sans stockage */ }
    if (quand && Date.now() - quand < 120000) {
      etat.textContent = t('ecrit');
      etat.classList.add('nova-ti-fait');
      var onglet = document.querySelector('a[href="#prpage"]');
      if (onglet) setTimeout(function () { onglet.click(); }, 0);
    }
  }
