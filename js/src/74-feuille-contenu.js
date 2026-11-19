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
      var act = el('span', 'nova-fc-actions');
      act.appendChild(pastille(s));
      li.appendChild(act);
      // Flèches tout à droite de la carte, après « Modifier » (2026-11-19, utilisateur).
      if (modifiable) {
        var fl = el('span', 'nova-fc-fleches');
        fl.appendChild(bouton('fleche-haut', t('monter'), function () { focusApres = '.nova-fc-fleches button:first-child'; deplacer(s, s.n - 1); }, i === 0));
        fl.appendChild(bouton('fleche-bas', t('descendre'), function () { focusApres = '.nova-fc-fleches button:last-child'; deplacer(s, s.n + 1); }, i === series.length - 1));
        li.appendChild(fl);
      }
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

    // « Enregistrer » et « Abandonner » de WIMS (div.wimsform) : barre collante en bas de l'écran (2026-11-19, utilisateur) ;
    // « Modifié : pensez à enregistrer » dès qu'un champ de la page (description sous TinyMCE comprise) ou un paramètre a changé.
    var envoiW = cadre.form.querySelector('input[type="submit"]'), blocW = envoiW && envoiW.parentNode;
    var barre = { modifie: false, parametres: false, avis: null, regler: function () {} };
    if (blocW && blocW !== cadre.form) {
      var reglerW = barreEnregistrer(blocW, cadre.form, t('sp-modifie'));
      barre.avis = blocW.querySelector('.nova-seq-enreg-avis');
      barre.regler = function () { if (barre.avis) barre.avis.textContent = t('sp-modifie'); reglerW(barre.modifie || barre.parametres); };
      var marquer = function () { if (barre.modifie) return; barre.modifie = true; barre.regler(); };
      var surChamp = function (e) { if (!e.target.closest('.nova-sp')) marquer(); };
      cadre.form.addEventListener('input', surChamp);
      cadre.form.addEventListener('change', surChamp);
      if (window.tinymce && tinymce.on) tinymce.on('AddEditor', function (e) {
        var ed = e.editor;
        if (ed && /^mod_(desc|comment)$/.test(ed.id)) ed.on('input change undo redo ExecCommand', function () { if (ed.isDirty()) marquer(); });
      });
    }

    var pre = cadre.querySelector('.field > pre');
    var champ = pre && pre.parentNode;
    if (!champ) return;
    champ.id = 'nova-parametres';
    champ.classList.add('nova-serie-param');
    var lignes = pre.textContent.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    // Feuille en préparation, module OEF : éditeur des paramètres (serieEditeur) ; texte brut de WIMS dépliable sous lui.
    var modele = document.getElementById('nova-serie-exos');
    if (modele && cadre.form && modele.getAttribute('data-parm')) {
      var brut = el('details', 'nova-serie-brut');
      brut.appendChild(el('summary', '', t('p-brut')));
      pre.parentNode.insertBefore(brut, pre);
      brut.appendChild(el('p', 'nova-serie-module', lignes[0] || ''));
      brut.appendChild(pre);
      var bas0 = el('div', 'nova-serie-bas');
      champ.insertBefore(bas0, brut);
      bas0.appendChild(brut);
      var wims = champ.querySelector(':scope > a.wims_button');
      if (wims) wims.classList.add('nova-fc-masque');
      serieEditeur(champ, modele, cadre.form, t, el, barre);
      return;
    }
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

  /* Éditeur des paramètres d'une série, sur la page « Modification de la série » (2026-11-19, utilisateur, maquette
   * serie-parametres : « Note et QCM » et liste des exercices du module repliés par défaut). Feuille en préparation, module
   * OEF (_widgets/serie-exos.phtml écrit #nova-serie-exos : titres du module, ligne des paramètres, feuille, série).
   * Valeurs de départ lues comme WIMS les lit (scripts/oef/exo.init, get_presentgood.proc : intro_check=3 ou qcmlevel pour la
   * bonne réponse, intro_check=4 pour l'indication, intro_presentsol pour la solution). Paramètres réécrits comme le
   * formulaire de WIMS les envoie (expert : intro_*, sans qcmlevel ; simplifié : qcmlevel) ; ceux que Nova ne connaît pas
   * (confparm…, lang_choice) gardés ; exotrymax laissé à WIMS (chseries.proc le reprend de l'enregistrement).
   * Enregistrement, seulement si un paramètre a changé : le formulaire de la page part d'abord dans un cadre caché (job=modify,
   * qui travaille sur les anciens paramètres : tableau d'ordre de WIMS masqué, laissé tel quel), puis la requête du lien
   * « Remplacer dans la feuille » de WIMS (job=chseries, iniparm) ouvre la page de la feuille. */
  function serieEditeur(champ, modele, form, t, el, barre) {
    var bouton = champ.querySelector(':scope > a.wims_button');
    var paires = [];
    (modele.getAttribute('data-parm') || '').split('&').forEach(function (x) {
      var i = x.indexOf('=');
      if (i > 0) paires.push([x.slice(0, i).trim(), x.slice(i + 1).trim()]);
    });
    var val = function (k) { for (var i = paires.length - 1; i >= 0; i--) if (paires[i][0] === k) return paires[i][1]; return null; };
    var tous = function (k) { return paires.filter(function (q) { return q[0] === k; }).map(function (q) { return q[1]; }); };
    var ent = function (v, def, min, max) { v = parseInt(v, 10); return isNaN(v) ? def : Math.max(min, Math.min(max, v)); };
    var titres = {}, module = [];
    Array.prototype.forEach.call(modele.content.querySelectorAll('i[data-n]'), function (i) {
      var n = i.getAttribute('data-n');
      if (!(n in titres)) module.push(n);
      titres[n] = i.getAttribute('data-t') || n;
    });
    var titre = function (n) { return titres[n] || n; };

    // ---- Valeurs de départ
    var exos = [];
    tous('exo').forEach(function (v) { v.split(',').forEach(function (e) { e = e.trim(); if (e && e !== '0' && exos.indexOf(e) < 0) exos.push(e); }); });
    var check = tous('intro_check').join(',').split(',');
    var coche = function (c) { return check.indexOf(c) >= 0; };
    var expert = val('intro_expert') === 'yes', niveau = ent(val('qcmlevel'), 1, 1, 9), s = niveau - 1;
    var d = (val('scoredelay') || '').split(',').map(function (x) { return parseInt(x, 10) || 0; });
    var parmi = function (v, liste, def) { return liste.indexOf(v) >= 0 ? v : def; };
    var depart = { exos: exos, qnum: ent(val('qnum'), 1, 1, 9), fixe: val('random') === '0', chrono: d[0] > 0, d1: d[0] > 0 ? String(d[0]) : '',
      d2: d[1] > d[0] ? String(d[1]) : '', seed: ent(val('seedrepeat'), 0, 0, 6), expert: expert, niveau: niveau };
    if (expert) {
      var good = val('intro_good') == null ? 1 : ent(val('intro_good'), 1, -1, 6);
      if (coche('3')) good = 1;
      if (val('qcmlevel') != null) good = SEVERITE.bonne[s];
      depart.good = good;
      depart.sol = val('intro_presentsol') != null && val('intro_presentsol') !== '' ? ent(+val('intro_presentsol') - 1, 1, -1, 6) : ent(val('intro_sol'), 1, -1, 6);
      depart.feed = ent(val('intro_feed'), 1, -2, 6);
      depart.hint = coche('4') ? -1 : ent(val('intro_hint'), 1, -2, 6);
      depart.expow = parmi(val('intro_expow'), ['1', '1.5', '2'], '1');
      depart.sepow = parmi(val('intro_sepow'), ['1', '1.5', '2'], '1');
      depart.precw = parmi(val('intro_precw'), ['0.9', '0.5', '0.2'], '0.9');
      depart.qcm = ent(val('intro_qcmpresent'), 4, 2, 8);
      depart.bonne = coche('1');
      depart.penal = coche('2');
      depart.calc = parmi(val('intro_calc'), ['0', '1', '2'], '0');
    } else {
      // Passage au réglage expert : on part de ce que la sévérité donnait.
      depart.good = SEVERITE.bonne[s]; depart.sol = SEVERITE.sol[s]; depart.feed = 1; depart.hint = SEVERITE.hint[s];
      depart.expow = '1'; depart.sepow = '1'; depart.precw = '0.9'; depart.qcm = SEVERITE.qcm[s];
      depart.bonne = !!SEVERITE.qcmbonne[s]; depart.penal = !!SEVERITE.penal[s]; depart.calc = '0';
    }
    var st = JSON.parse(JSON.stringify(depart));

    var GERES = /^(exo|qnum|random|scoredelay|seedrepeat|qcmlevel|exotrymax|intro_(expert|expow|sepow|precw|good|sol|feed|hint|calc|qcmpresent|check|presentsol))$/;
    function parametres(e) {
      var o = e.exos.map(function (x) { return 'exo=' + x; });
      var d1 = parseInt(e.d1, 10) || 0, d2 = parseInt(e.d2, 10) || 0;
      o.push('qnum=' + e.qnum, 'scoredelay=' + (e.chrono && d1 > 0 ? d1 + (d2 > d1 ? ',' + d2 : '') : ''), 'seedrepeat=' + e.seed);
      if (e.expert) {
        o.push('intro_expert=yes', 'intro_qcmpresent=' + e.qcm, 'intro_good=' + e.good, 'intro_sol=' + e.sol, 'intro_feed=' + e.feed,
          'intro_hint=' + e.hint, 'intro_expow=' + e.expow, 'intro_sepow=' + e.sepow, 'intro_precw=' + e.precw, 'intro_calc=' + e.calc);
        if (e.bonne) o.push('intro_check=1');
        if (e.penal) o.push('intro_check=2');
      } else o.push('qcmlevel=' + e.niveau);
      if (e.fixe) o.push('random=0');
      paires.forEach(function (q) { if (!GERES.test(q[0])) o.push(q[0] + '=' + q[1]); });
      return o.join('&');
    }
    var initial = parametres(depart);

    // ---- Briques : boutons à choix unique, bascule, ligne
    var majs = [];
    function choix(options, lire, ecrire, classe, nom) {
      var g = el('span', 'nova-app-choix ' + (classe || 'nova-param-choix'));
      g.setAttribute('role', 'radiogroup');
      if (nom) g.setAttribute('aria-label', nom);
      var bs = options.map(function (o) {
        var b = el('button', 'nova-param-option', o[1]);
        b.type = 'button';
        b.setAttribute('role', 'radio');
        b.addEventListener('click', function () { ecrire(o[0]); change(); });
        g.appendChild(b);
        return b;
      });
      g.addEventListener('keydown', function (ev) {
        var k = bs.indexOf(document.activeElement), dd = ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? 1 : ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1 : 0;
        if (!dd || k < 0) return;
        ev.preventDefault();
        k = Math.max(0, Math.min(bs.length - 1, k + dd));
        bs[k].click();
        bs[k].focus();
      });
      majs.push(function () {
        var v = String(lire()), un = false;
        bs.forEach(function (b, k) { var oui = String(options[k][0]) === v; b.setAttribute('aria-checked', oui ? 'true' : 'false'); b.tabIndex = oui ? 0 : -1; un = un || oui; });
        if (!un && bs[0]) bs[0].tabIndex = 0;
      });
      return g;
    }
    function bascule(texte, lire, ecrire) {
      var g = el('span', 'nova-app-choix nova-param-cases');
      var lab = el('label', 'nova-param-case');
      var c = el('input');
      c.type = 'checkbox';
      lab.appendChild(c);
      lab.appendChild(document.createTextNode(texte));
      c.addEventListener('change', function () { ecrire(c.checked); change(); });
      majs.push(function () { c.checked = !!lire(); });
      g.appendChild(lab);
      return g;
    }
    function ligne(nom, sous) {
      var l = el('div', 'nova-sp-ligne'), n = el('div', 'nova-sp-nom', nom), v = el('div', 'nova-sp-val');
      if (sous) n.appendChild(el('small', '', sous));
      l.appendChild(n);
      l.appendChild(v);
      return l;
    }
    var rang = function () { return el('div', 'nova-sp-rang'); };
    var nombres = function (de, a) { var o = []; for (var i = de; i <= a; i++) o.push([i, String(i)]); return o; };
    var majuscule = function (x) { return x.charAt(0).toUpperCase() + x.slice(1); };

    var ed = el('div', 'nova-sp nova-params');

    // ---- Exercices
    var lExos = ligne(t('p-exos'));
    var compte = el('small', '');
    lExos.firstChild.appendChild(compte);
    var choisis = el('ol', 'nova-sp-choisis');
    var alerte = el('p', 'nova-sp-alerte', t('sp-aucun'));
    lExos.lastChild.appendChild(choisis);
    lExos.lastChild.appendChild(alerte);
    var cases = {};
    if (module.length) {
      var det = el('details', 'nova-sp-exos');
      det.appendChild(el('summary', '', t('sp-choisir', module.length)));
      var cherche = el('input', 'nova-sp-cherche');
      cherche.type = 'search';
      cherche.placeholder = t('sp-chercher');
      cherche.setAttribute('aria-label', t('sp-chercher'));
      cherche.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') ev.preventDefault(); });
      var liste = el('div', 'nova-sp-exos-liste');
      var m = /session=([^&.]+)/.exec(lienSession('')), session = m ? decodeURIComponent(m[1]) : '';
      module.forEach(function (n) {
        var l = el('div', 'nova-sp-exo');
        var lab = el('label');
        var c = el('input');
        c.type = 'checkbox';
        c.addEventListener('change', function () {
          var i = st.exos.indexOf(n);
          if (c.checked && i < 0) st.exos.push(n); else if (!c.checked && i >= 0) st.exos.splice(i, 1);
          change();
        });
        cases[n] = c;
        lab.appendChild(c);
        lab.appendChild(el('span', '', titre(n)));
        l.appendChild(lab);
        if (session) {
          var a = el('a', 'nova-sp-essayer', t('essayer'));
          a.target = '_blank';
          a.rel = 'noopener';
          a.addEventListener('click', function () {
            a.href = 'wims.cgi?wims_window=new&session=' + encodeURIComponent(session + '_new') + '.' + (Date.now() % 100000) + '&lang=' +
              encodeURIComponent(racineLangue()) + '&module=' + encodeURIComponent(modele.getAttribute('data-module')) + '&cmd=new&exo=' + encodeURIComponent(n);
          });
          a.href = '#';
          l.appendChild(a);
        }
        l.setAttribute('data-cherche', (titre(n) + ' ' + n).toLowerCase());
        liste.appendChild(l);
      });
      cherche.addEventListener('input', function () {
        var q = cherche.value.trim().toLowerCase();
        Array.prototype.forEach.call(liste.children, function (l) { l.hidden = !!q && l.getAttribute('data-cherche').indexOf(q) < 0; });
      });
      var corps = el('div', 'nova-sp-exos-corps');
      corps.appendChild(cherche);
      corps.appendChild(liste);
      det.appendChild(corps);
      lExos.lastChild.appendChild(det);
    }
    majs.push(function () {
      compte.textContent = st.exos.length === 1 ? t('sp-choisis-1', '', module.length || 1) : t('sp-choisis', st.exos.length, Math.max(module.length, st.exos.length));
      if (!module.length) compte.textContent = st.exos.length === 1 ? t('p-exos-1') : t('p-exos-v', st.exos.length);
      alerte.hidden = st.exos.length > 0;
      Object.keys(cases).forEach(function (n) { cases[n].checked = st.exos.indexOf(n) >= 0; });
      choisis.classList.toggle('nova-sp-ordre', st.fixe);
      choisis.textContent = '';
      st.exos.forEach(function (n, i) {
        var li = el('li', 'nova-sp-choisi');
        li.appendChild(el('span', 'nova-sp-choisi-titre', titre(n)));
        var fl = function (ico, texte, dd, inactif) {
          var b = el('button', 'nova-seq-contenu-btn');
          b.type = 'button';
          b.title = texte;
          b.setAttribute('aria-label', texte + ' : ' + titre(n));
          var ic = el('span', 'nova-etat-ico');
          ic.setAttribute('aria-hidden', 'true');
          ic.setAttribute('data-icone', ico);
          b.appendChild(ic);
          if (inactif) b.disabled = true;
          else b.addEventListener('click', function () { st.exos.splice(i, 1); st.exos.splice(i + dd, 0, n); change(); var x = choisis.children[i + dd]; if (x) x.querySelector('button[title="' + texte + '"]').focus(); });
          return b;
        };
        if (st.fixe && st.exos.length > 1) {
          li.appendChild(fl('fleche-haut', t('monter'), -1, i === 0));
          li.appendChild(fl('fleche-bas', t('descendre'), 1, i === st.exos.length - 1));
        }
        var x = el('button', 'nova-sp-retirer', String.fromCharCode(0xD7));
        x.type = 'button';
        x.title = t('sp-retirer');
        x.setAttribute('aria-label', t('sp-retirer') + ' : ' + titre(n));
        x.addEventListener('click', function () { st.exos.splice(i, 1); change(); });
        li.appendChild(x);
        choisis.appendChild(li);
      });
    });
    ed.appendChild(lExos);

    // ---- Par série, ordre
    var lSerie = ligne(t('p-serie'), t('sp-serie-aide'));
    var r1 = rang();
    r1.appendChild(choix(nombres(1, 9), function () { return st.qnum; }, function (v) { st.qnum = v; }, 'nova-param-versions', t('p-serie')));
    lSerie.lastChild.appendChild(r1);
    var r2 = rang();
    r2.appendChild(bascule(t('sp-ordre'), function () { return st.fixe; }, function (v) { st.fixe = v; }));
    r2.appendChild(el('span', 'nova-sp-petit', t('sp-ordre-aide')));
    lSerie.lastChild.appendChild(r2);
    ed.appendChild(lSerie);

    // ---- Chronomètre : « Note réduite après [d1] s, nulle après [d2] s. »
    var lChrono = ligne(t('p-chrono'));
    var r3 = rang();
    r3.appendChild(bascule(t('sp-chrono-case'), function () { return st.chrono; }, function (v) { st.chrono = v; if (v && !st.d1) st.d1 = '60'; }));
    var phrase = el('span', 'nova-sp-petit nova-sp-temps');
    var champs = {};
    t('sp-chrono-phrase', '%1', '%2').split(/(%[12])/).forEach(function (morceau) {
      if (morceau === '%1' || morceau === '%2') {
        var k = morceau === '%1' ? 'd1' : 'd2', c = el('input', 'nova-sp-nombre');
        c.type = 'number';
        c.min = '1';
        c.inputMode = 'numeric';
        c.setAttribute('aria-label', t('p-chrono') + ' ' + morceau.slice(1));
        c.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') ev.preventDefault(); });
        c.addEventListener('input', function () { st[k] = c.value.replace(/[^0-9]/g, ''); change(true); });
        champs[k] = c;
        phrase.appendChild(c);
      } else if (morceau) phrase.appendChild(document.createTextNode(morceau));
    });
    var erreurTemps = el('p', 'nova-sp-alerte', t('sp-chrono-erreur'));
    r3.appendChild(phrase);
    lChrono.lastChild.appendChild(r3);
    lChrono.lastChild.appendChild(erreurTemps);
    majs.push(function (frappe) {
      phrase.hidden = !st.chrono;
      if (!frappe) { champs.d1.value = st.d1; champs.d2.value = st.d2; }
      erreurTemps.hidden = !st.chrono || !st.d2 || (parseInt(st.d2, 10) || 0) > (parseInt(st.d1, 10) || 0);
    });
    ed.appendChild(lChrono);

    // ---- Nouvel essai
    var lSeed = ligne(t('p-version-nom'), t('sp-essai-sous'));
    var r4 = rang();
    r4.appendChild(choix(nombres(0, 6), function () { return st.seed; }, function (v) { st.seed = v; }, 'nova-param-versions', t('p-version-nom')));
    lSeed.lastChild.appendChild(r4);
    lSeed.lastChild.appendChild(el('p', 'nova-sp-petit', t('sp-essai-aide')));
    ed.appendChild(lSeed);

    // ---- Réglage
    var lReg = ligne(t('p-reglage'));
    var r5 = rang();
    r5.appendChild(choix([[0, t('sp-simple')], [1, t('sp-expert')]], function () { return st.expert ? 1 : 0; }, function (v) { st.expert = !!v; }, '', t('p-reglage')));
    lReg.lastChild.appendChild(r5);
    ed.appendChild(lReg);

    // Simplifié : sévérité
    var lSev = ligne(t('sp-severite'));
    var r6 = rang();
    r6.appendChild(choix(nombres(1, 9), function () { return st.niveau; }, function (v) { st.niveau = v; }, 'nova-param-versions', t('sp-severite')));
    lSev.lastChild.appendChild(r6);
    var effet = el('p', 'nova-sp-petit');
    lSev.lastChild.appendChild(effet);
    lSev.lastChild.appendChild(el('p', 'nova-sp-petit', t('sp-severite-aide')));
    ed.appendChild(lSev);
    majs.push(function () {
      var k = st.niveau - 1, on = function (x) { return x ? t('p-oui') : t('p-non'); };
      var q = [t('p-qcm-v', SEVERITE.qcm[k])];
      if (SEVERITE.qcmbonne[k]) q.push(t('p-qcm-bonne'));
      if (SEVERITE.penal[k]) q.push(t('p-qcm-penal'));
      effet.textContent = majuscule(t('p-bonne')) + ' : ' + on(SEVERITE.bonne[k]) + ' ; ' + t('p-sol') + ' : ' + on(SEVERITE.sol[k]) + ' ; ' +
        t('p-hint') + ' : ' + on(SEVERITE.hint[k]) + '. ' + t('p-qcm') + ' : ' + q.join(', ') + '.';
      lSev.hidden = st.expert;
    });

    // Expert : aides
    var lAides = ligne(t('p-aides'));
    [['good', t('p-bonne'), false], ['sol', t('p-sol'), false], ['feed', t('p-feed'), true], ['hint', t('p-hint'), true]].forEach(function (a) {
      var r = el('div', 'nova-sp-rang nova-sp-aide');
      r.appendChild(el('span', 'nova-sp-aide-nom', majuscule(a[1])));
      var quand = [[0, t('p-jamais')]];
      if (a[2]) quand.push([-1, t('p-toujours')], [-2, t('p-expire')]); else quand.push([-1, t('p-expire')]);
      var lire = function () { return st[a[0]]; }, ecrire = function (v) { st[a[0]] = v; };
      r.appendChild(choix(quand, lire, ecrire, '', majuscule(a[1])));
      var bloc = el('span', 'nova-param-bloc-versions');
      bloc.appendChild(el('span', 'nova-param-lien', t('sp-des')));
      bloc.appendChild(choix(nombres(1, 6), lire, ecrire, 'nova-param-versions', majuscule(a[1]) + ' : ' + t('sp-des')));
      r.appendChild(bloc);
      lAides.lastChild.appendChild(r);
    });
    ed.appendChild(lAides);

    // Expert : note et QCM, repliés
    var nq = el('details', 'nova-sp-repli');
    nq.appendChild(el('summary', '', t('sp-noteqcm')));
    var pow = [['1', t('sp-aucune')], ['1.5', t('sp-faible')], ['2', t('sp-forte')]];
    var lEx = ligne(t('sp-expow'));
    lEx.lastChild.appendChild(choix(pow, function () { return st.expow; }, function (v) { st.expow = v; }, '', t('sp-expow')));
    nq.appendChild(lEx);
    var lSe = ligne(t('sp-sepow'));
    lSe.lastChild.appendChild(choix(pow, function () { return st.sepow; }, function (v) { st.sepow = v; }, '', t('sp-sepow')));
    nq.appendChild(lSe);
    var lPr = ligne(t('sp-precw'));
    lPr.lastChild.appendChild(choix([['0.9', '0.9'], ['0.5', '0.5'], ['0.2', '0.2']], function () { return st.precw; }, function (v) { st.precw = v; }, '', t('sp-precw')));
    nq.appendChild(lPr);
    var lQ = ligne(t('p-qcm'));
    var r7 = rang();
    r7.appendChild(choix(nombres(2, 8), function () { return st.qcm; }, function (v) { st.qcm = v; }, 'nova-param-versions', t('p-qcm')));
    r7.appendChild(el('span', 'nova-sp-petit', t('sp-qcm-choix')));
    lQ.lastChild.appendChild(r7);
    var r8 = rang();
    r8.appendChild(bascule(majuscule(t('p-qcm-bonne')), function () { return st.bonne; }, function (v) { st.bonne = v; }));
    r8.appendChild(bascule(majuscule(t('p-qcm-penal')), function () { return st.penal; }, function (v) { st.penal = v; }));
    lQ.lastChild.appendChild(r8);
    nq.appendChild(lQ);
    var lC = ligne(t('p-calc'));
    lC.lastChild.appendChild(choix([['0', t('p-non')], ['1', t('p-calc-1')], ['2', t('p-calc-2')]], function () { return st.calc; }, function (v) { st.calc = v; }, '', t('p-calc')));
    nq.appendChild(lC);
    ed.appendChild(nq);
    majs.push(function () { lAides.hidden = nq.hidden = !st.expert; lSe.hidden = st.qnum < 2; });

    // ---- Pied : page de WIMS, annuler
    var bas = el('div', 'nova-sp-bas');
    if (bouton) {
      var w = el('a', 'nova-sp-wims', t('sp-wims'));
      w.href = bouton.href;
      bas.appendChild(w);
    }
    bas.appendChild(el('span', 'nova-sp-petit', t('sp-gardes')));
    var annuler = el('button', 'wims_button wims_secondary_button nova-sp-annuler', t('sp-annuler'));
    annuler.type = 'button';
    annuler.addEventListener('click', function () { st = JSON.parse(JSON.stringify(depart)); change(); });
    bas.appendChild(annuler);
    ed.appendChild(bas);

    var valide = function () { return st.exos.length > 0 && erreurTemps.hidden; };
    function change(frappe) {
      majs.forEach(function (f) { f(frappe); });
      var modifie = parametres(st) !== initial;
      barre.parametres = modifie;
      barre.regler();
      annuler.hidden = !modifie;
      ed.classList.toggle('nova-sp-modifiee', modifie);
    }

    // Tableau d'ordre de WIMS (exo_order.phtml, ordre fixé) : l'ordre se règle dans la liste des choisis.
    var ordreWims = form.querySelector('input[name^="update_ex"]');
    if (ordreWims && ordreWims.closest('.field')) ordreWims.closest('.field').classList.add('nova-fc-masque');

    // ---- Enregistrement
    var parti = false;
    form.addEventListener('submit', function (ev) {
      if (parti || parametres(st) === initial) return;
      ev.preventDefault();
      if (!valide()) { change(); (st.exos.length ? champs.d1 : ed).scrollIntoView({ block: 'center' }); return; }
      parti = true;
      var nouveau = parametres(st);
      if (barre.avis) { barre.avis.textContent = t('sp-enreg'); barre.avis.hidden = false; }
      var cible = el('iframe', 'nova-fc-masque');
      cible.hidden = true;
      cible.style.display = 'none';
      cible.name = 'nova-sp-envoi';
      cible.title = t('sp-enreg');
      document.body.appendChild(cible);
      var avant = form.target;
      form.target = cible.name;
      var suite = lienSession('&cmd=reply&module=adm%2Fclass%2Fsheet&job=chseries&num=' + encodeURIComponent(modele.getAttribute('data-feuille') + ',' +
        modele.getAttribute('data-serie')) + '&iniparm=' + encodeURIComponent(nouveau));
      setTimeout(function () {
        cible.addEventListener('load', function () {
          var ok = false;
          try { ok = !cible.contentDocument.querySelector('input[name="job"][value="modify"]'); } catch (x) { ok = false; }
          if (!ok) { parti = false; form.target = avant; if (barre.avis) { barre.avis.textContent = t('sp-erreur'); barre.avis.hidden = false; } return; }
          setTimeout(function () { location.href = suite; }, 1500);
        }, { once: true });
        if (form.requestSubmit) form.requestSubmit(ev.submitter && ev.submitter.form === form ? ev.submitter : undefined); else form.submit();
      }, 0);
    });

    champ.insertBefore(ed, champ.querySelector(':scope > .nova-serie-bas') || null);
    change();
    if (location.hash === '#nova-parametres') {
      champ.classList.add('nova-serie-param-vise');
      setTimeout(function () { champ.scrollIntoView({ block: 'start' }); }, 300);
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
