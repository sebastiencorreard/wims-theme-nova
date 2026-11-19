  /* ===== js/src/74-feuille-contenu.js : contenu d'une feuille en liste, série d'exercices et ses paramètres (2026-11-19) ===== */
  /* Contenu d'une feuille (adm/class/sheet, onglet « Contenu de la feuille » ; 2026-11-19, utilisateur, maquette
   * maquettes/feuille-contenu-2026-11-19.html, variante B). Le tableau de WIMS (scripts/adm/sheet/sheetcontent.phtml) est
   * gardé, masqué ; une carte par série : poignée, numéro, titre (lien de WIMS : essayer), étiquettes (points, poids, nombre
   * d'exercices, dépendances, besoin d'aide, commentaire), flèches, pastille « Modifier » et son menu (menusEtat : Modifier la
   * série, Paramètres des exercices, Essayer, Effacer confirmé par Nova).
   * Déplacement enregistré TOUT DE SUITE (utilisateur) : une requête job=moveto de WIMS (var.proc, sheetexam.shift : la série
   * movesource est placée au rang movetarget, dépendances recalées par WIMS), envoyée en arrière-plan ; la page renvoyée
   * fournit le nouveau tableau, qui remplace l'ancien. 1,5 s entre deux requêtes (une session sert mal deux requêtes à moins
   * d'1 s). Feuille active (pas de lien Effacer : WIMS ne permet plus ni d'effacer ni de déplacer) : lecture, bandeau
   * d'information. Textes : #nova-feuille-textes (lang/enseignant-textes, feuille_contenu). Réglage std-listes. */
  function feuilleContenu() {
    var tx = document.getElementById('nova-feuille-textes');
    if (!tx || standard('listes') || !window.fetch || !window.DOMParser || !window.TextDecoder) return;
    var cel0 = document.querySelector('.wimsbody td[id^="td_exo_"]');
    var table = cel0 && cel0.closest('table');
    if (!table || table.closest('.nova-fc-masque')) return;
    var t = function (k, a, b) { return (tx.getAttribute('data-' + k) || '').replace('%1', a == null ? '' : a).replace('%2', b == null ? '' : b); };
    var el = function (tag, classe, texte) { var e = document.createElement(tag); if (classe) e.className = classe; if (texte) e.textContent = texte; return e; };
    var icone = function (nom) { var s = el('span', 'nova-etat-ico'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('data-icone', nom); return s; };
    var propre = function (s) { return (s || '').replace(/\s+/g, ' ').trim(); };
    var menus = menusEtat();

    var masque = el('div', 'nova-fc-masque');
    var zone = el('section', 'nova-fc');
    table.parentNode.insertBefore(zone, table);
    table.parentNode.insertBefore(masque, table);
    masque.appendChild(table);
    var annonce = el('p', 'nova-seq-contenu-annonce');
    annonce.setAttribute('role', 'status');
    var occupe = false, derniere = Date.now(), series = [], modifiable = false, glisse = null;

    // Lecture du tableau de WIMS : une série par ligne qui a sa cellule td_exo_<n>.
    function lire(tab) {
      var res = [];
      tab.querySelectorAll('td[id^="td_exo_"]').forEach(function (c) {
        var tr = c.parentNode, td = tr.querySelectorAll(':scope > td');
        var n = +c.id.replace('td_exo_', '');
        if (!n || td.length < 10) return;
        var a = td[1].querySelector('a[href]');
        var liens = Array.prototype.slice.call(tr.querySelectorAll('a[href]'));
        var trouver = function (job) { return liens.filter(function (x) { return new RegExp('[?&]\\+?job=' + job + '(&|$)').test(x.getAttribute('href')); })[0] || null; };
        var exos = 0, href = a ? a.getAttribute('href') : '';
        href.split('&').forEach(function (p) {
          var m = /^\+?exo=(.*)$/.exec(p);
          if (m) exos += decodeURIComponent(m[1].replace(/\+/g, ' ')).split(',').filter(function (v) { return v.trim(); }).length;
        });
        res.push({
          n: n, titre: a ? propre(a.textContent) : propre(td[1].textContent), essayer: a ? a.href : '',
          desc: propre(td[2].textContent), points: propre(td[3].textContent), poids: propre(td[4].textContent),
          qnum: +propre(td[5].textContent) || 0, exos: exos, dep: propre(td[6].textContent), com: propre(td[7].textContent),
          aides: td[8].querySelectorAll('li').length, modifier: trouver('prep_modify'), effacer: trouver('delete')
        });
      });
      return res;
    }

    // Adresse de WIMS pour placer la série n au rang r : celle de « Modifier » de la ligne, job changé.
    function adresseDeplacer(s, r) {
      var h = s.modifier && s.modifier.href;
      if (!h || !/job=prep_modify/.test(h)) return '';
      return h.replace(/([?&]\+?)job=prep_modify(&\+?)modif=\d+/, '$1job=moveto$2movesource=' + s.n + '$2movetarget=' + r);
    }
    function deplacer(s, r) {
      if (occupe || r === s.n || r < 1 || r > series.length) return;
      var url = adresseDeplacer(s, r);
      if (!url) return;
      occupe = true;
      zone.classList.add('nova-fc-occupe');
      etat.textContent = t('enreg');
      etat.classList.add('nova-en-cours');
      etat.hidden = false;
      var titre = s.titre;
      setTimeout(function () {
        derniere = Date.now();
        fetch(url, { credentials: 'same-origin' }).then(function (rep) { return rep.arrayBuffer(); }).then(function (buf) {
          var doc = new DOMParser().parseFromString(new TextDecoder('windows-1252').decode(buf), 'text/html');
          var c = doc.querySelector('.wimsbody td[id^="td_exo_"]'), nouv = c && c.closest('table');
          if (!nouv) throw new Error('tableau');
          var neuf = document.importNode(nouv, true);
          masque.replaceChild(neuf, table);
          table = neuf;
          series = lire(table);
          occupe = false;
          zone.classList.remove('nova-fc-occupe');
          etat.hidden = true;
          etat.classList.remove('nova-en-cours');
          derniere = Date.now();
          dessiner();
          annonce.textContent = t('deplace', titre, r);
          var li = liste.querySelector('li[data-n="' + r + '"]');
          if (li && focusApres) { var b = li.querySelector(focusApres); if (b && !b.disabled) b.focus(); else li.querySelector('.nova-etat').focus(); }
          focusApres = null;
        }).catch(function () {
          occupe = false;
          zone.classList.remove('nova-fc-occupe');
          etat.classList.remove('nova-en-cours');
          etat.textContent = t('erreur');
          etat.classList.add('nova-fc-erreur');
        });
      }, Math.max(0, 1500 - (Date.now() - derniere)));
    }
    var focusApres = null;

    function confirmerEffacer(s) {
      var d = el('dialog', 'nova-dialogue nova-conf');
      var fermer = el('button', 'close-button', '\u00d7');
      fermer.type = 'button';
      fermer.setAttribute('aria-label', t('b-fermer'));
      fermer.addEventListener('click', function () { d.close(); });
      d.appendChild(fermer);
      var tete = el('div', 'nova-conf-tete'), rond = el('span', 'nova-conf-ico nova-conf-r'), bloc = el('div');
      rond.appendChild(icone('corbeille'));
      tete.appendChild(rond);
      var h = el('h1', '', t('conf-titre', s.n));
      h.id = 'nova-fc-conf-titre';
      bloc.appendChild(h);
      bloc.appendChild(el('p', 'nova-conf-sous', s.titre));
      tete.appendChild(bloc);
      d.appendChild(tete);
      d.setAttribute('aria-labelledby', h.id);
      var corps = el('div', 'nova-conf-corps');
      corps.appendChild(el('p', 'nova-conf-p', t('conf-texte')));
      d.appendChild(corps);
      var boutons = el('div', 'nova-conf-boutons');
      var non = el('button', 'nova-conf-b', t('b-annuler'));
      non.type = 'button';
      non.addEventListener('click', function () { d.close(); });
      var oui = el('button', 'nova-conf-b nova-conf-r', t('effacer'));
      oui.type = 'button';
      oui.addEventListener('click', function () { oui.disabled = true; non.disabled = true; location.href = s.effacer.href; });
      boutons.appendChild(non);
      boutons.appendChild(oui);
      d.appendChild(boutons);
      d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
      d.addEventListener('close', function () { d.remove(); });
      document.body.appendChild(d);
      d.showModal();
      non.focus();
    }

    function action(lien, ico, libelle, effet, danger) {
      var a = el(lien ? 'a' : 'button', 'nova-etat-action' + (danger ? ' nova-etat-danger' : ''));
      if (lien) a.href = lien; else a.type = 'button';
      a.setAttribute('role', 'menuitem');
      a.setAttribute('tabindex', '-1');
      a.appendChild(icone(ico));
      var tt = el('span', 'nova-etat-texte', libelle);
      if (effet) tt.appendChild(el('small', '', effet));
      a.appendChild(tt);
      return a;
    }
    var numeroMenu = 0;
    function pastille(s) {
      var b = el('button', 'nova-etat nova-fc-modifier');
      b.type = 'button';
      b.appendChild(icone('crayon'));
      b.appendChild(el('span', 'nova-etat-nom', t('modifier')));
      b.appendChild(el('span', 'nova-etat-chevron'));
      b.setAttribute('aria-label', t('modifier') + ' : ' + s.titre);
      var menu = el('div', 'nova-etat-menu');
      menu.id = 'nova-fc-menu-' + (++numeroMenu);
      menu.setAttribute('role', 'menu');
      menu.setAttribute('aria-label', s.titre);
      menu.hidden = true;
      if (s.modifier) menu.appendChild(action(s.modifier.href, 'crayon', t('modifier-serie'), t('modifier-serie-d')));
      if (s.modifier && modifiable) menu.appendChild(action(s.modifier.href + '#nova-parametres', 'curseurs', t('parametres'), t('parametres-d')));
      if (s.essayer) menu.appendChild(action(s.essayer, 'lecture', t('essayer'), t('essayer-d')));
      if (s.effacer) {
        menu.appendChild(el('hr'));
        var ef = action(null, 'corbeille', t('effacer'), t('effacer-d'), true);
        ef.addEventListener('click', function () { document.dispatchEvent(new Event('nova-fermer-menus')); confirmerEffacer(s); });
        menu.appendChild(ef);
      }
      menus.brancher(b, menu);
      return b;
    }
    function bouton(ico, texte, faire, inactif) {
      var b = el('button', 'nova-seq-contenu-btn');
      b.type = 'button';
      b.setAttribute('aria-label', texte);
      b.title = texte;
      b.appendChild(icone(ico));
      if (inactif) b.disabled = true; else b.addEventListener('click', faire);
      return b;
    }
    function etiquette(texte, genre, titre) {
      var e = el('span', 'nova-fc-info' + (genre ? ' nova-fc-info-' + genre : ''), texte);
      if (titre) e.title = titre;
      return e;
    }
    function ligne(s, i) {
      var li = el('li', 'nova-fc-exo');
      li.setAttribute('data-n', s.n);
      if (modifiable) {
        var poignee = el('span', 'nova-seq-ress-poignee nova-fc-poignee');
        poignee.appendChild(icone('poignee'));
        poignee.title = t('glisser');
        li.appendChild(poignee);
      }
      li.appendChild(el('span', 'nova-fc-num', String(s.n)));
      var corps = el('span', 'nova-fc-corps');
      // Lien non glissable : saisi par le titre, c'est la ligne qui se déplace.
      if (s.essayer) { var a = el('a', 'nova-fc-titre', s.titre); a.href = s.essayer; a.draggable = false; corps.appendChild(a); }
      else corps.appendChild(el('span', 'nova-fc-titre', s.titre));
      if (s.desc) corps.appendChild(el('span', 'nova-fc-desc', s.desc));
      var infos = el('span', 'nova-fc-infos');
      if (s.points !== '') infos.appendChild(etiquette(s.points === '1' ? t('points-1') : t('points', s.points)));
      if (s.poids !== '') infos.appendChild(etiquette(t('poids', s.poids)));
      if (s.qnum) infos.appendChild(etiquette(s.exos > s.qnum ? t('parmi', s.qnum, s.exos) : s.qnum === 1 ? t('serie-1') : t('serie', s.qnum)));
      if (s.dep) infos.appendChild(etiquette(t('dep', s.dep), 'lien'));
      if (s.aides) infos.appendChild(etiquette(t('aide')));
      if (s.com) infos.appendChild(etiquette(t('com'), '', s.com));
      corps.appendChild(infos);
      li.appendChild(corps);
      if (modifiable) {
        var fl = el('span', 'nova-fc-fleches');
        fl.appendChild(bouton('fleche-haut', t('monter'), function () { focusApres = '.nova-fc-fleches button:first-child'; deplacer(s, s.n - 1); }, i === 0));
        fl.appendChild(bouton('fleche-bas', t('descendre'), function () { focusApres = '.nova-fc-fleches button:last-child'; deplacer(s, s.n + 1); }, i === series.length - 1));
        li.appendChild(fl);
      }
      var act = el('span', 'nova-fc-actions');
      act.appendChild(pastille(s));
      li.appendChild(act);
      if (modifiable) {
        li.draggable = true;
        li.addEventListener('dragstart', function (ev) {
          if (occupe) { ev.preventDefault(); return; }
          glisse = s;
          ev.dataTransfer.effectAllowed = 'move';
          try { ev.dataTransfer.setData('text/plain', s.titre); } catch (e) { /* rien */ }
          li.classList.add('nova-seq-ress-glissee');
        });
        li.addEventListener('dragend', function () { glisse = null; li.classList.remove('nova-seq-ress-glissee'); marque(-1); });
      }
      return li;
    }
    // Rang visé : avant la ligne dont le milieu est sous le pointeur (0 = en tête, longueur = en fin).
    function rangVise(y) {
      var lis = liste.querySelectorAll(':scope > li.nova-fc-exo'), k = lis.length;
      for (var j = 0; j < lis.length; j++) { var r = lis[j].getBoundingClientRect(); if (y < r.top + r.height / 2) { k = j; break; } }
      return k;
    }
    function marque(k) {
      liste.querySelectorAll('.nova-seq-ress-vise-avant, .nova-seq-ress-vise-apres').forEach(function (e) { e.classList.remove('nova-seq-ress-vise-avant', 'nova-seq-ress-vise-apres'); });
      if (k < 0) return;
      var lis = liste.querySelectorAll(':scope > li.nova-fc-exo');
      if (k < lis.length) lis[k].classList.add('nova-seq-ress-vise-avant');
      else if (lis.length) lis[lis.length - 1].classList.add('nova-seq-ress-vise-apres');
    }

    var carte = el('div', 'nova-fc-carte');
    var tete = el('div', 'nova-fc-tete');
    tete.appendChild(el('h3', '', t('titre')));
    var compte = el('span', 'nova-seq-contenu-compte');
    tete.appendChild(compte);
    var etat = el('span', 'nova-fc-etat');
    etat.hidden = true;
    tete.appendChild(etat);
    carte.appendChild(tete);
    var liste = el('ol', 'nova-seq-contenu-liste nova-fc-liste');
    liste.setAttribute('aria-label', t('titre'));
    carte.appendChild(liste);
    liste.addEventListener('dragover', function (ev) { if (!glisse) return; ev.preventDefault(); marque(rangVise(ev.clientY)); });
    liste.addEventListener('dragleave', function (ev) { if (!liste.contains(ev.relatedTarget)) marque(-1); });
    liste.addEventListener('drop', function (ev) {
      if (!glisse) return;
      ev.preventDefault();
      var s = glisse, k = rangVise(ev.clientY);
      marque(-1);
      // k = place avant la k-ième ligne (0..n) ; rang final de la série déplacée.
      var r = k + 1 > s.n ? k : k + 1;
      focusApres = '.nova-etat';
      deplacer(s, r);
    });

    function dessiner() {
      liste.textContent = '';
      series.forEach(function (s, i) { liste.appendChild(ligne(s, i)); });
      compte.textContent = series.length === 1 ? t('compte-1') : t('compte', series.length);
    }

    series = lire(table);
    modifiable = series.some(function (s) { return s.effacer; });
    if (!modifiable && series.length) {
      var avis = el('p', 'nova-ex-lecture-avis');
      avis.appendChild(icone('cadenas'));
      avis.appendChild(el('span', '', t('active')));
      zone.appendChild(avis);
    }
    // Boutons de WIMS au-dessus du tableau (« Ajouter un travail », « Version imprimable ») : alignés sur la liste.
    var hautListe = zone.parentNode && zone.parentNode.id === 'list' ? Array.prototype.filter.call(zone.parentNode.children, function (e) { return e.tagName === 'A' && e.classList.contains('wims_button'); }) : [];
    if (hautListe.length) {
      var barre = el('div', 'nova-fc-boutons');
      hautListe.forEach(function (b) { barre.appendChild(b); });
      zone.insertBefore(barre, zone.firstChild);
    }
    zone.appendChild(carte);
    zone.appendChild(annonce);
    dessiner();
  }

  /* Page « Modification d'une série d'exercices » (adm/class/sheet, job=prep_modify, exomodify.phtml ; 2026-11-19, utilisateur,
   * maquette feuille-contenu, section 3). Description et commentaires comme sur la page de la feuille (ficheEditeurs : hauteur
   * du texte, commentaires repliés). « Paramètres de la série » (texte brut de WIMS, exercices OEF) : résumé en phrases lu dans
   * ce texte (scripts/oef/exo.init : intro_expert=yes = réglage expert, sinon tout découle de qcmlevel), texte brut dépliable.
   * Adresse avec #nova-parametres (menu de la liste, feuilleContenu) : la page s'ouvre sur ce bloc. Réglage std-listes. */
  var SEVERITE = { qcm: [3, 3, 4, 5, 5, 6, 7, 8, 8], bonne: [1, 1, 1, 1, 1, 1, 0, 0, 0], sol: [1, 1, 1, 0, 0, 0, 0, 0, 0],
    hint: [1, 1, 1, 1, 1, 0, 0, 0, 0], qcmbonne: [1, 1, 1, 1, 0, 0, 0, 0, 0], penal: [0, 0, 0, 0, 0, 1, 1, 1, 1] };
  function serieModifier() {
    var tx = document.getElementById('nova-feuille-textes'), ftx = document.getElementById('nova-fiche-textes');
    var desc = document.getElementById('mod_desc');
    var cadre = desc && desc.closest('fieldset.property_fields');
    if (!tx || !ftx || !cadre || standard('listes') || cadre.classList.contains('nova-fiche') || !cadre.form || !cadre.form.querySelector('input[name="job"][value="modify"]')) return;
    var t = function (k, a, b) { return (tx.getAttribute('data-' + k) || '').replace('%1', a == null ? '' : a).replace('%2', b == null ? '' : b); };
    var el = function (tag, classe, texte) { var e = document.createElement(tag); if (classe) e.className = classe; if (texte) e.textContent = texte; return e; };
    cadre.classList.add('nova-fiche', 'nova-serie');
    ['mod_desc', 'mod_comment'].forEach(function (id) {
      var zone = document.getElementById(id), champ = zone && zone.closest('.field');
      if (!champ) return;
      var lab = champ.querySelector(':scope > label'), aide = champ.querySelector(':scope > .formHelp');
      if (!lab) return;
      var tete = el('div', 'nova-champ-tete');
      champ.insertBefore(tete, lab);
      tete.appendChild(lab);
      if (aide) tete.appendChild(aide);
      editeurAjuste(id);
      if (id === 'mod_comment') commentairesReplies(champ, tete, zone, ftx);
    });

    var pre = cadre.querySelector('.field > pre');
    var champ = pre && pre.parentNode;
    if (!champ) return;
    champ.id = 'nova-parametres';
    champ.classList.add('nova-serie-param');
    var lignes = pre.textContent.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    var p = {}, exos = {};
    (lignes[1] || '').split(';').forEach(function (x) {
      var i = x.indexOf('=');
      if (i < 1) return;
      var k = x.slice(0, i).trim(), v = x.slice(i + 1).trim();
      if (k === 'exo') v.split(',').forEach(function (e) { e = e.trim(); if (e && e !== '0') exos[e] = 1; });
      else if (k === 'intro_check') (p[k] = p[k] || []).push(v);
      else p[k] = v;
    });
    var nb = function (k, def) { var v = parseFloat(p[k]); return isNaN(v) ? def : v; };
    var lignesRes = [];
    var ajouter = function (nom, valeur) { if (valeur) lignesRes.push([nom, valeur]); };
    var nExos = Object.keys(exos).length, qnum = nb('qnum', 1);
    if (nExos) ajouter(t('p-exos'), nExos === 1 ? t('p-exos-1') : t('p-exos-v', nExos));
    ajouter(t('p-serie'), (qnum === 1 ? t('p-serie-1') : t('p-serie-v', qnum)) + (qnum > 1 ? (nb('random', 1) === 0 ? t('p-fixe') : t('p-hasard')) : ''));
    var d = (p.scoredelay || '').split(',').map(function (x) { return parseInt(x, 10) || 0; });
    ajouter(t('p-chrono'), !d[0] ? t('p-chrono-aucun') : d[1] > d[0] ? t('p-chrono-2', d[0], d[1]) : t('p-chrono-1', d[0]));
    var expert = p.intro_expert === 'yes', check = p.intro_check || [];
    var quand = function (v, toujoursEn) {
      v = parseInt(v, 10);
      if (v === 0) return t('p-jamais');
      if (v === -1) return toujoursEn ? t('p-toujours') : t('p-expire');
      if (v === -2) return t('p-expire');
      return t('p-version', v);
    };
    var aides;
    if (expert) {
      var sr = nb('seedrepeat', 0);
      ajouter(t('p-version-nom'), sr >= 2 ? t('p-version-n', sr) : t('p-version-0'));
      aides = [
        t('p-bonne') + ' : ' + (check.indexOf('3') >= 0 ? t('p-version', 1) : quand(p.intro_good == null ? 1 : p.intro_good)),
        t('p-sol') + ' : ' + quand(p.intro_presentsol != null && p.intro_sol == null ? (+p.intro_presentsol) - 1 : p.intro_sol == null ? 1 : p.intro_sol),
        t('p-feed') + ' : ' + quand(p.intro_feed == null ? 1 : p.intro_feed, true),
        t('p-hint') + ' : ' + (check.indexOf('4') >= 0 ? t('p-toujours') : quand(p.intro_hint == null ? 1 : p.intro_hint, true))
      ];
      ajouter(t('p-aides'), aides.join(' ; '));
      var pow = function (v) { v = parseFloat(v); return v >= 2 ? t('p-pow-2') : v > 1 ? t('p-pow-15') : t('p-pow-1'); };
      var score = [t('p-score-q', pow(p.intro_expow))];
      if (qnum > 1) score.push(t('p-score-s', pow(p.intro_sepow)));
      score.push(t('p-precw', p.intro_precw || '0.9'));
      ajouter(t('p-score'), score.join(' ; '));
      var qcm = [t('p-qcm-v', p.intro_qcmpresent || 4)];
      if (check.indexOf('1') >= 0) qcm.push(t('p-qcm-bonne'));
      if (check.indexOf('2') >= 0) qcm.push(t('p-qcm-penal'));
      ajouter(t('p-qcm'), qcm.join(' ; '));
      if (p.intro_calc === '1' || p.intro_calc === '2') ajouter(t('p-calc'), t('p-calc-' + p.intro_calc));
      lignesRes.unshift([t('p-reglage'), t('p-expert')]);
    } else {
      var s = Math.max(1, Math.min(9, nb('qcmlevel', 3))) - 1;
      lignesRes.unshift([t('p-reglage'), t('p-simple', s + 1)]);
      aides = [t('p-bonne') + ' : ' + (SEVERITE.bonne[s] ? t('p-oui') : t('p-non')), t('p-sol') + ' : ' + (SEVERITE.sol[s] ? t('p-oui') : t('p-non')),
        t('p-hint') + ' : ' + (SEVERITE.hint[s] ? t('p-oui') : t('p-non'))];
      ajouter(t('p-aides'), aides.join(' ; '));
      var q2 = [t('p-qcm-v', SEVERITE.qcm[s])];
      if (SEVERITE.qcmbonne[s]) q2.push(t('p-qcm-bonne'));
      if (SEVERITE.penal[s]) q2.push(t('p-qcm-penal'));
      ajouter(t('p-qcm'), q2.join(' ; '));
    }
    var boite = el('div', 'nova-serie-resume');
    var module = el('p', 'nova-serie-module', lignes[0] || '');
    var dl = el('dl', 'nova-serie-dl');
    lignesRes.forEach(function (r) { dl.appendChild(el('dt', '', r[0])); dl.appendChild(el('dd', '', r[1])); });
    boite.appendChild(dl);
    var details = el('details', 'nova-serie-brut');
    details.appendChild(el('summary', '', t('p-brut')));
    pre.parentNode.insertBefore(boite, pre);
    details.appendChild(module);
    details.appendChild(pre);
    var bas = el('div', 'nova-serie-bas');
    bas.appendChild(details);
    var bouton = champ.querySelector(':scope > a.wims_button');
    if (bouton) { bouton.classList.remove('float_right'); bas.appendChild(bouton); }
    boite.appendChild(bas);
    if (location.hash === '#nova-parametres') {
      champ.classList.add('nova-serie-param-vise');
      setTimeout(function () { champ.scrollIntoView({ block: 'center' }); if (bouton) bouton.focus({ preventScroll: true }); }, 300);
    }
  }

  /* Paramètres d'un exercice OEF (page d'accueil du module, #oef_intro_params ; ouverte aussi depuis une série de feuille ;
   * 2026-11-19, utilisateur, maquette feuille-contenu, section 4, puis « les mêmes boutons pour les autres cartes »).
   * Dans toutes les cartes : chaque groupe de boutons radio en boutons (.nova-app-choix : les radios de WIMS déplacés dans
   * leur libellé, rien de simulé) ; une liste déroulante courte (au plus 10 choix, pas multiple : nombre d'exercices d'une
   * série, nombre de choix d'un QCM) en boutons qui la règlent (elle reste, cachée, dans le formulaire) ; une case à cocher
   * en bouton à bascule (même principe). Aides : choix « jamais / toujours / après l'expiration » d'un côté, numéros de
   * version de l'autre (même groupe de radios). WIMS (scripts/oef/intromenu_expert.phtml) donne le même id à « toujours » et
   * « après l'expiration » du feedback et de l'indication : le libellé du second cochait le premier ; Nova donne un id
   * propre à chaque choix. Réglage std-listes. */
  function aidesOef() {
    var zone = document.getElementById('oef_intro_params');
    if (!zone || standard('listes') || zone.classList.contains('nova-params')) return;
    zone.classList.add('nova-params');
    var VERSIONS = /^intro_(good|sol|feed|hint)$/;
    var vus = {};
    zone.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(function (r) {
      if (r.id && vus[r.id]) {
        var lab = r.nextElementSibling && r.nextElementSibling.tagName === 'LABEL' ? r.nextElementSibling : null;
        var id = 'nova-' + r.name + '-' + String(r.value).replace(/[^0-9a-z]/gi, 'm');
        r.id = id;
        if (lab) lab.htmlFor = id;
      }
      if (r.id) vus[r.id] = true;
    });
    var libelleDe = function (champ, r) {
      var l = r.nextElementSibling && r.nextElementSibling.tagName === 'LABEL' ? r.nextElementSibling : null;
      return l || (r.id ? champ.querySelector('label[for="' + r.id + '"]') : null);
    };
    var groupe = function (cl, nom) {
      var g = document.createElement('span');
      g.className = 'nova-app-choix ' + cl;
      g.setAttribute('role', 'radiogroup');
      if (nom) g.setAttribute('aria-label', nom);
      return g;
    };
    // Reste de WIMS autour des boutons déplacés : enveloppes vides retirées ; un bloc qui ne garde que du texte (« ou à partir
    // de l'étude de la version… de la série d'exercices ») est caché ; virgules seules retirées.
    var nettoyer = function (champ) {
      champ.querySelectorAll('span.wims_formradio').forEach(function (sp) { if (!sp.querySelector('input, label') && !sp.textContent.trim()) sp.remove(); });
      Array.prototype.slice.call(champ.childNodes).forEach(function (n) {
        if (n.nodeType === 3 && /^[\s,;]*$/.test(n.textContent)) n.remove();
        else if (n.nodeType === 1 && n.tagName === 'DIV' && !n.classList.contains('formHelp') && !n.classList.contains('nova-param-ligne')) {
          Array.prototype.slice.call(n.childNodes).forEach(function (m) { if (m.nodeType === 3 && /^[\s,;]*$/.test(m.textContent)) m.remove(); });
          if (!n.children.length || !n.querySelector('*:not(br)')) n.classList.add('nova-param-source');
        }
      });
    };
    zone.querySelectorAll('.field').forEach(function (champ) {
      if (champ.querySelector('.field')) return;
      var nomEl = champ.querySelector(':scope > strong') || Array.prototype.filter.call(champ.querySelectorAll(':scope > label'), function (l) { return !l.querySelector('input'); })[0] || null;
      var nom = nomEl ? nomEl.textContent.replace(/\s+/g, ' ').replace(/\s*:\s*$/, '').trim() : '';
      var radios = Array.prototype.slice.call(champ.querySelectorAll('input[type="radio"]'));
      var cases = Array.prototype.slice.call(champ.querySelectorAll('input[type="checkbox"]'));
      var liste = champ.querySelector('select:not([multiple])');
      var ligne = document.createElement('div');
      ligne.className = 'nova-param-ligne';
      if (radios.length >= 2) {
        var avecVersions = VERSIONS.test(radios[0].name);
        var choix = groupe('nova-param-choix', nom), versions = groupe('nova-param-versions', nom), lien = '';
        var avant = radios[0].closest('.field > *') || radios[0];
        radios.forEach(function (r) {
          var lab = libelleDe(champ, r);
          if (!lab) return;
          var version = avecVersions && +r.value >= 1;
          if (version && !lien) {
            var n = r.previousSibling, tx = '';
            while (n && n.nodeType === 3) { tx = n.textContent + tx; n = n.previousSibling; }
            lien = tx.replace(/\s+/g, ' ').replace(/^[\s,]*(ou|or|o|oder|of)\s+/i, '').trim();
          }
          lab.insertBefore(r, lab.firstChild);
          (version ? versions : choix).appendChild(lab);
        });
        ligne.appendChild(choix);
        if (versions.childNodes.length) {
          var bloc = document.createElement('span');
          bloc.className = 'nova-param-bloc-versions';
          if (lien) { var sp = document.createElement('span'); sp.className = 'nova-param-lien'; sp.textContent = lien; bloc.appendChild(sp); versions.setAttribute('aria-label', nom + ' : ' + lien); }
          bloc.appendChild(versions);
          ligne.appendChild(bloc);
        }
        champ.insertBefore(ligne, avant);
      } else if (cases.length && !radios.length) {
        cases.forEach(function (c) {
          var lab = libelleDe(champ, c);
          if (!lab) return;
          lab.insertBefore(c, lab.firstChild);
          lab.classList.add('nova-param-case');
          var g = document.createElement('span');
          g.className = 'nova-app-choix nova-param-cases';
          g.appendChild(lab);
          ligne.appendChild(g);
        });
        champ.insertBefore(ligne, champ.firstChild);
      } else if (liste && liste.options.length > 1 && liste.options.length <= 10) {
        var g2 = groupe('nova-param-versions nova-param-liste', nom);
        Array.prototype.forEach.call(liste.options, function (o) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'nova-param-option';
          b.textContent = o.textContent.trim();
          b.setAttribute('role', 'radio');
          b.addEventListener('click', function () { liste.value = o.value; liste.dispatchEvent(new Event('change', { bubbles: true })); maj(); });
          g2.appendChild(b);
        });
        var maj = function () { Array.prototype.forEach.call(g2.children, function (b, k) { b.setAttribute('aria-checked', liste.selectedIndex === k ? 'true' : 'false'); b.tabIndex = liste.selectedIndex === k ? 0 : -1; }); };
        liste.addEventListener('change', maj);
        g2.addEventListener('keydown', function (ev) {
          var k = liste.selectedIndex, d = ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? 1 : ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1 : 0;
          if (!d) return;
          ev.preventDefault();
          k = Math.max(0, Math.min(liste.options.length - 1, k + d));
          g2.children[k].click();
          g2.children[k].focus();
        });
        maj();
        liste.classList.add('nova-param-source');
        liste.parentNode.insertBefore(ligne, liste);
        ligne.appendChild(g2);
      } else if (nomEl && nomEl.tagName === 'LABEL' && champ.querySelector(':scope > input:not([type]), :scope > input[type="text"], :scope > input[type="number"]')) {
        // Champ à saisir (chronomètre) : même présentation, nom à gauche, champ et unité à droite.
        var saisie = champ.querySelector(':scope > input:not([type]), :scope > input[type="text"], :scope > input[type="number"]');
        champ.insertBefore(ligne, saisie);
        ligne.appendChild(saisie);
      } else return;
      champ.classList.add('nova-param-champ');
      if (nomEl) nomEl.classList.add('nova-param-nom');
      nettoyer(champ);
      // Texte de WIMS resté à côté (« exercices. ») : à la suite des boutons, pas dans une case de la grille.
      Array.prototype.slice.call(champ.childNodes).forEach(function (n) {
        if (n.nodeType === 3 && n.textContent.trim()) { var u = document.createElement('span'); u.className = 'nova-param-unite'; u.textContent = n.textContent.trim(); ligne.appendChild(u); n.remove(); }
      });
      var aide = champ.querySelector(':scope > .formHelp');
      if (aide && !aide.textContent.trim()) aide.remove();
    });
  }
