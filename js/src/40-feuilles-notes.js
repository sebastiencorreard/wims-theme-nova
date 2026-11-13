
  /* ===== js/src/40-feuilles-notes.js : cartes de feuille, scores, notes ===== */
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
  /* Mesure groupée (audit B2, 2026-11-13) : l'ancienne boucle masquait une case puis relisait scrollWidth, une mise en
   * page complète par case et par barre (226 ms sur l'accueil de l'élève, processeur ralenti six fois). Ici, pour
   * toutes les barres à la fois : tout remettre, lire les largeurs (1 mise en page), poser les « +k » d'essai, les lire
   * (1 mise en page), écrire, puis vérifier si une case de moins tient (1 mise en page). Même résultat que la boucle : le moins de cases masquées pour que la ligne tienne. */
  function ajusterHistoriques(liste) {
    var largeur = function (e) { var r = e.getBoundingClientRect(); return r.width; };
    liste.forEach(function (h) {
      Array.prototype.forEach.call(h.cases, function (li) { li.classList.remove('nova-ancienne'); });
      if (h.plus.parentNode) h.plus.remove();
      if (h.plus2 && h.plus2.parentNode) h.plus2.remove();
    });
    var aReduire = liste.filter(function (h) {
      h.dispo = h.barre.clientWidth;
      h.trop = h.ol.scrollWidth - h.dispo;
      if (!h.dispo || h.trop <= 0) return false;
      var cs = getComputedStyle(h.ol);
      h.gap = parseFloat(cs.columnGap) || 0;
      h.w = Array.prototype.map.call(h.cases, function (li) {
        var c = getComputedStyle(li);
        return largeur(li) + (parseFloat(c.marginLeft) || 0) + (parseFloat(c.marginRight) || 0);
      });
      return true;
    });
    if (!aReduire.length) return;
    // « +k » d'essai : un chiffre, et deux si plus de dix cases peuvent être masquées.
    aReduire.forEach(function (h) {
      h.plus.textContent = '+8';
      h.ol.insertBefore(h.plus, h.cases[0]);
      if (h.n > 10) {
        h.plus2 = h.plus2 || h.plus.cloneNode(false);
        h.plus2.textContent = '+88';
        h.ol.insertBefore(h.plus2, h.cases[0]);
      }
    });
    aReduire.forEach(function (h) {
      h.wPlus1 = largeur(h.plus) + h.gap;
      h.wPlus2 = h.plus2 && h.plus2.parentNode ? largeur(h.plus2) + h.gap : h.wPlus1;
    });
    aReduire.forEach(function (h) {
      if (h.plus2 && h.plus2.parentNode) h.plus2.remove();
      var reste = h.trop, k;
      for (k = 1; k < h.n; k++) {
        reste -= h.w[k - 1] + h.gap;
        if (reste + (k < 10 ? h.wPlus1 : h.wPlus2) <= 0) break;
      }
      if (k >= h.n) k = h.n - 1;
      for (var i = 0; i < k; i++) h.cases[i].classList.add('nova-ancienne');
      h.k = k;
      // Les chiffres d'essai (« +8 », « +88 ») peuvent être plus larges que le vrai « +k » : essayer une case de moins.
      if (k > 1) { h.cases[k - 1].classList.remove('nova-ancienne'); h.plus.textContent = '+' + (k - 1); }
    });
    aReduire.forEach(function (h) {
      if (h.k > 1 && h.ol.scrollWidth <= h.dispo) h.k--;
    });
    aReduire.forEach(function (h) {
      var k = h.k;
      if (k > 1) h.cases[k - 1].classList.add('nova-ancienne');
      h.plus.textContent = '+' + k;
      h.plus.title = Array.prototype.slice.call(h.cases, 0, k).map(function (li) {
        var a = li.querySelector('a'); return a ? a.textContent.trim() : '';
      }).join(' \u00B7 ');
    });
  }

  function historique(barre, cases) {
    barre.classList.add('nova-score-examen');
    var n = cases.length;
    cases[n - 1].classList.add('nova-derniere');
    var plus = document.createElement('li');
    plus.className = 'nova-plus-anciennes';
    var h = { barre: barre, cases: cases, n: n, ol: cases[0].parentNode, plus: plus };
    var ajuster = function () { ajusterHistoriques([h]); };
    if (window.ResizeObserver) {
      var largeur = -1, attente = 0;
      new ResizeObserver(function () {
        if (largeur < 0) { largeur = barre.clientWidth; return; }   // premier appel : déjà ajusté par scores()
        if (barre.clientWidth === largeur) return;
        largeur = barre.clientWidth;
        cancelAnimationFrame(attente);
        attente = requestAnimationFrame(ajuster);
      }).observe(barre);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajuster);
    return h;
  }

  function scores() {
    if (standard('listes')) return;   // réglage « Feuilles et examens en liste »
    var historiques = [];
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
      if (notes) { historiques.push(historique(barre, cases)); return; }
      if (barre.closest('li.wims_exam_item')) return;   // examen : pas de compteur de feuille
      var reussis = barre.querySelectorAll('ol > li.wims_exo_done').length;
      var compte = document.createElement('span');
      compte.className = 'nova-score-compte';
      compte.textContent = reussis + '/' + cases.length;
      barre.appendChild(compte);
    });
    ajusterHistoriques(historiques);
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
    var notes = {}, max = source.getAttribute('data-max') || '10', libelle = source.getAttribute('data-libelle') || 'Score';
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

  function notesColonnes() {
    var mm = document.querySelector('meta[name="nova-module"]');
    var table = document.getElementById('TABLE_userlist');
    if (!mm || mm.content !== 'adm/class/userscore' || !table || table.hasAttribute('data-nova-notes')) return;
    table.setAttribute('data-nova-notes', '');
    var textes = document.getElementById('nova-textes');
    var texte = function (n, defaut) { return (textes && textes.getAttribute('data-texte-' + n)) || defaut; };
    var choix = document.querySelector('select[name="showsheet"]');
    var cadre = choix && choix.closest('fieldset');
    // Case du cadre « Choix des données » (sinon au-dessus du tableau), choix gardé par le navigateur.
    var ajouterCase = function (id, libelle, cle, defaut, appliquer) {
      var actif = defaut;
      try { var v = localStorage.getItem(cle); if (v !== null) actif = v === '1'; } catch (e) { /* sans stockage : défaut */ }
      var champ = document.createElement('div');
      champ.className = 'field box nova-notes-option';
      var c = document.createElement('input');
      c.type = 'checkbox';
      c.id = id;
      c.checked = actif;
      var lib = document.createElement('label');
      lib.htmlFor = id;
      lib.textContent = libelle;
      champ.appendChild(c);
      champ.appendChild(lib);
      c.addEventListener('change', function () {
        appliquer(c.checked);
        try { localStorage.setItem(cle, c.checked ? '1' : '0'); } catch (e) { /* cette page seulement */ }
      });
      if (cadre) {
        var envoi = cadre.querySelector(':scope > .wimsform');
        cadre.insertBefore(champ, envoi || null);
      } else {
        var avant = table.closest('.wims_scrollable, .table-scroll') || table;
        avant.parentNode.insertBefore(champ, avant);
      }
      appliquer(actif);
    };
    // (b) Titre au lieu du numéro (examens : 2026-11-08 ; feuilles et cases : 2026-11-09, utilisateur). Titres lus dans
    // la liste de choix (option « 3 » = « 2/3: titre » pour la feuille 3, « E4 » = « Examen 4: titre »). Cochées par
    // défaut, sauf réglage « Textes du thème standard ».
    var titres = { feuille: {}, examen: {} };
    if (choix) Array.prototype.forEach.call(choix.options, function (o) {
      var m = /^(E?)(\d+)$/.exec(o.value);
      var i = o.textContent.indexOf(':');
      if (m && i >= 0 && o.textContent.slice(i + 1).trim()) titres[m[1] ? 'examen' : 'feuille'][m[2]] = o.textContent.slice(i + 1).trim();
    });
    var types = [
      ['feuille', 'nova-titres-feuilles', texte('titres-feuilles', 'Worksheets: show the title instead of the number'), function () {
        return Array.prototype.map.call(table.querySelectorAll('thead th a[href*="numshowsheet"]'), function (a) { return [a.closest('th'), a]; });
      }],
      ['examen', 'nova-titres-examens', texte('titres-examens', 'Exams: show the title instead of the number'), function () {
        return Array.prototype.map.call(table.querySelectorAll('thead th.name_exam'), function (th) { return [th, th]; });
      }]
    ];
    types.forEach(function (t) {
      if (!Object.keys(titres[t[0]]).length) return;
      var cellules = t[3]().map(function (x) {
        var origine = x[1].textContent.trim();
        var m = /(\d+)$/.exec(origine);
        return { th: x[0], el: x[1], origine: origine, titre: m && titres[t[0]][m[1]] };
      }).filter(function (c) { return c.titre; });
      ajouterCase(t[1], t[2], t[1], !standard('textes'), function (oui) {
        cellules.forEach(function (c) {
          c.el.textContent = '';
          if (oui) {
            var s = document.createElement('span');
            s.className = 'nova-titre-examen';
            s.textContent = c.titre;
            c.el.appendChild(s);
            c.th.title = c.origine + ' : ' + c.titre;
          } else {
            c.el.textContent = c.origine;
            c.th.removeAttribute('title');
          }
        });
      });
    });
    // (a) Masquer la moyenne.
    var moy = table.querySelector('thead th.average');
    if (!moy) return;
    var rang = Array.prototype.indexOf.call(moy.parentNode.children, moy);
    ajouterCase('nova-sans-moyenne', texte('masquer-moyenne', 'Hide the average'), 'nova-notes-sans-moyenne', false, function (oui) {
      Array.prototype.forEach.call(table.rows, function (tr) {
        var c = tr.cells[rang];
        if (c) c.classList.toggle('nova-col-masquee', oui);
      });
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
