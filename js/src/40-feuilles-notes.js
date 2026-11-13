
  /* ===== js/src/40-feuilles-notes.js : cartes de feuille, scores, notes ===== */
  function feuilleExercices() {
    if (standard('listes')) return;   // réglage « Feuilles et examens en liste »
    if (feuilleProgression()) return;
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

  /* « Mes notes » de l'élève et détail du travail d'un élève vu par l'enseignant (adm/class/userscore, getuser.phtml ;
   * audit A3, maquette A choisie par l'utilisateur le 2026-11-13). Les tableaux de WIMS deviennent des cartes :
   * - moyenne globale (div.wimscenter > b) : grand chiffre, phrase « min/moy/max » de WIMS, barre 0..max avec la plage de
   *   la classe, sa moyenne et l'élève ;
   * - examens (#TABLE_exam) : examens notés en pastille, les autres repliés (« N examens pas encore passés ») ;
   * - une carte repliée (<details>) par feuille (table[id^=TABLE_sheet]) : étiquette (« Chapitre 1 », « Feuille 1 »), titre,
   *   note en pastille, barre à segments (qualité de chaque exercice), indicateurs de WIMS ; ouverte : une ligne par
   *   exercice (qualité en pastille de couleur, autres colonnes en petit, essais en petits carrés lus dans l'info-bulle
   *   de WIMS), points requis et poids dits une fois s'ils sont communs, puis les infos de gauche de WIMS et le lien.
   * Colonnes lues par leur en-tête : un exercice pas fait a toujours nb_indic+1 cases « -- » (WIMS), même si l'en-tête en
   * a moins (en-tête sans « Réussite » au chapitre 2 du banc). Tableaux d'origine gardés, cachés (hidden).
   * Réglages « Mes notes de l'élève » / « Détail d'un élève (enseignant) » du thème standard : notes-eleve,
   * notes-enseignant (tableaux de WIMS). Avant nova.js, les tableaux sont cachés par le CSS (secours 3 s). */
  function notesDetail() {
    // Titre « Mes notes » de l'élève (2026-11-13, utilisateur) : page marquée par le gabarit (#nova-notes-titre, élève,
    // job=getuser), qui cache le titre de WIMS jusqu'ici. Réglage notes-eleve : titre de WIMS.
    var h1 = document.getElementById('nova-notes-titre') && document.querySelector('#wims_modu_title1 > h1.wims_title');
    if (h1 && !h1.hasAttribute('data-nova-titre')) {
      var txT = document.getElementById('nova-notes-textes');
      if (!standard('notes-eleve') && txT && txT.getAttribute('data-titre')) h1.textContent = txT.getAttribute('data-titre');
      h1.setAttribute('data-nova-titre', '');
    }
    var examens = document.getElementById('TABLE_exam');
    var feuilles = document.querySelectorAll('.wimsbody table.wimstable[id^="TABLE_sheet"]:not([data-nova-detail])');
    if (!examens && !feuilles.length) return;
    var mu = document.querySelector('meta[name="nova-utilisateur"]');
    var prof = !!(mu && mu.content === 'supervisor');
    var tous = Array.prototype.slice.call(feuilles);
    if (examens && !examens.hasAttribute('data-nova-detail')) tous.push(examens);
    if (standard(prof ? 'notes-enseignant' : 'notes-eleve')) {
      tous.forEach(function (t) { t.setAttribute('data-nova-detail', 'std'); });
      return;
    }
    var tx = document.getElementById('nova-notes-textes');
    var texte = function (n, defaut) { return (tx && tx.getAttribute('data-' + n)) || defaut; };
    var POINT = ' ' + String.fromCharCode(183) + ' ', TIRET = String.fromCharCode(8211);
    var propre = function (s) { return (s || '').replace(/\s+/g, ' ').trim(); };
    var nombre = function (s) { var m = /-?\d+(?:[.,]\d+)?/.exec(s || ''); return m ? parseFloat(m[0].replace(',', '.')) : NaN; };
    // Niveau Nova d'une note sur 10 (palette A, decisions/eleve.md) : arrondi comme WIMS (adm/class/colors).
    var niveau = function (v) {
      if (isNaN(v)) return 'np';
      if (v <= 0) return 'zero';
      if (v <= 3) return 'rouge';
      if (v <= 6) return 'orange';
      if (v <= 8) return 'jaune';
      return 'vert';
    };
    var el = function (tag, classe, contenu) {
      var e = document.createElement(tag);
      if (classe) e.className = classe;
      if (contenu !== undefined && contenu !== null) e.textContent = contenu;
      return e;
    };
    var pluriel = function (n, un, plusieurs, m) { return (n > 1 ? plusieurs : un).replace('%1', n).replace('%2', m === undefined ? '' : m); };
    // Sauts de ligne « spacer » de WIMS avant un tableau remplacé (scripts de tri sautés) : retirés, la carte a sa marge.
    var sansSauts = function (e) {
      var p = e.previousElementSibling;
      while (p && (p.tagName === 'SCRIPT' || (p.tagName === 'BR' && p.classList.contains('spacer')))) {
        var q = p.previousElementSibling;
        if (p.tagName === 'BR') p.parentNode.removeChild(p);
        p = q;
      }
    };
    var cacher = function (t, carte) {
      var bloc = t.closest('.table-scroll, .wims_scrollable') || t;
      bloc.parentNode.insertBefore(carte, bloc);
      bloc.hidden = true;
      t.setAttribute('data-nova-detail', '');
      sansSauts(carte);
    };
    var pastille = function (valeur, max, classe) {
      var v = propre(valeur);
      var p = el('span', 'nova-nd-pastille' + (classe ? ' ' + classe : ''), isNaN(nombre(v)) ? TIRET + (max ? '/' + max : '') : v.replace(/\s+/g, '') + (max && v.indexOf('/') < 0 ? '/' + max : ''));
      if (isNaN(nombre(v))) p.classList.add('nova-nd-vide');
      return p;
    };

    // Moyenne globale (sans notes manuelles ; masquée par la classe : rien).
    var moy = null;
    Array.prototype.some.call(document.querySelectorAll('.wimsbody div.wimscenter'), function (d) {
      if (d.querySelector(':scope > b') && /\/\s*\d/.test(d.textContent) && !d.closest('table')) { moy = d; return true; }
      return false;
    });
    if (moy && !moy.hasAttribute('data-nova-detail')) {
      moy.setAttribute('data-nova-detail', '');
      var b = moy.querySelector(':scope > b'), petit = moy.querySelector('.small');
      var avant = '', apres = '';
      for (var n = moy.firstChild; n && n !== b; n = n.nextSibling) avant += n.textContent;
      for (n = b.nextSibling; n && n !== petit; n = n.nextSibling) apres += n.textContent;
      var max = nombre(apres) || 20;
      var carteM = el('div', 'nova-nd-carte nova-nd-moyenne');
      var haut = el('div', 'nova-nd-moy-haut');
      haut.appendChild(el('span', 'nova-nd-grand', propre(b.textContent)));
      var lib = el('div', 'nova-nd-moy-texte');
      lib.appendChild(el('div', 'nova-nd-moy-titre', propre(avant).replace(/\s*:\s*$/, '') + ' /' + max));
      if (petit) lib.appendChild(el('div', 'nova-nd-petit', propre(petit.textContent)));
      haut.appendChild(lib);
      carteM.appendChild(haut);
      var vals = petit ? /([\d.,]+)\s*\/\s*([\d.,]+)\s*\/\s*([\d.,]+)\s*$/.exec(propre(petit.textContent)) : null;
      var moi = nombre(b.textContent);
      if (!isNaN(moi)) {
        var pc = function (v) { return Math.max(0, Math.min(100, 100 * v / max)) + '%'; };
        var ech = el('div', 'nova-nd-echelle');
        ech.setAttribute('aria-hidden', 'true');
        if (vals) {
          var plage = el('span', 'nova-nd-plage');
          plage.style.left = pc(nombre(vals[1]));
          plage.style.right = 'calc(100% - ' + pc(nombre(vals[3])) + ')';
          ech.appendChild(plage);
          var mc = el('span', 'nova-nd-moy-classe');
          mc.style.left = pc(nombre(vals[2]));
          ech.appendChild(mc);
        }
        var m1 = el('span', 'nova-nd-moi');
        m1.style.left = pc(moi);
        m1.setAttribute('data-texte', prof ? texte('eleve', 'student') : texte('moi', 'you'));
        ech.appendChild(m1);
        carteM.appendChild(ech);
        var leg = el('div', 'nova-nd-legende');
        leg.setAttribute('aria-hidden', 'true');
        [0, max / 2, max].forEach(function (v) { leg.appendChild(el('span', '', String(v))); });
        carteM.appendChild(leg);
      }
      moy.parentNode.insertBefore(carteM, moy);
      moy.hidden = true;
    }

    // Examens.
    if (examens && !examens.hasAttribute('data-nova-detail')) {
      var cap = examens.querySelector('caption');
      var thNote = examens.querySelectorAll('thead th');
      var maxE = thNote.length ? (/\/\s*(\d+)/.exec(thNote[thNote.length - 1].textContent) || [])[1] : '';
      var bloc = el('section', 'nova-nd');
      bloc.appendChild(el('h2', 'nova-nd-titre-sec', propre(cap ? cap.textContent : '')));
      var carteE = el('div', 'nova-nd-carte'), restants = [];
      Array.prototype.forEach.call(examens.querySelectorAll('tbody > tr'), function (tr) {
        var td = tr.cells;
        if (td.length < 3 || tr.querySelector('th')) return;   // en-tête rangé dans tbody (<caption> dans <thead> chez WIMS)
        var ligne = el('div', 'nova-nd-ligne');
        ligne.appendChild(el('span', 'nova-nd-num', propre(td[0].textContent)));
        ligne.appendChild(el('span', 'nova-nd-nom', propre(td[1].textContent)));
        ligne.appendChild(pastille(td[2].textContent, maxE));
        if (isNaN(nombre(td[2].textContent))) restants.push(ligne); else carteE.appendChild(ligne);
      });
      if (restants.length) {
        var rep = el('details', 'nova-nd-restants');
        rep.appendChild(el('summary', '', pluriel(restants.length, texte('examen-restant', '%1 exam not taken yet'), texte('examens-restants', '%1 exams not taken yet'))));
        restants.forEach(function (l) { rep.appendChild(l); });
        carteE.appendChild(rep);
      }
      bloc.appendChild(carteE);
      cacher(examens, bloc);
    }

    // Feuilles.
    var section = null;
    Array.prototype.forEach.call(feuilles, function (t, rang) {
      var ths = Array.prototype.slice.call(t.querySelectorAll('thead tr:last-child > th'));
      var noms = ths.map(function (th) { var tt = th.querySelector('.wims_tooltip'); return propre(tt ? tt.firstChild.textContent : th.textContent); });
      var tete = t.querySelector('thead tr:first-child > th');
      var gauche = tete && tete.querySelector('.float_left'), droite = tete && tete.querySelector('ul.float_right');
      var lien = tete && tete.querySelector('a[href*="adm%2Fsheet"], a[href*="adm/sheet"]');
      var chapeau = '';
      if (gauche) { for (var nn = gauche.firstChild; nn; nn = nn.nextSibling) if (nn.nodeName !== 'UL') chapeau += nn.textContent; } else if (tete) chapeau = tete.textContent;
      chapeau = propre(chapeau.replace(/\u00a0/g, ' '));
      var coupe = /^(.*?)\s+:\s+(.*)$/.exec(chapeau);
      var carte = el('details', 'nova-nd-carte nova-nd-feuille');
      var thead = t.querySelector('thead[id]');
      if (thead) carte.id = 'nova-' + thead.id;
      var resume = el('summary', 'nova-nd-entete');
      var bloc1 = el('div', 'nova-nd-entete-haut');
      var noms1 = el('div', 'nova-nd-noms');
      noms1.appendChild(el('div', 'nova-nd-etiquette', coupe ? coupe[1] : ''));
      noms1.appendChild(el('div', 'nova-nd-nom-feuille', coupe ? coupe[2] : chapeau));
      bloc1.appendChild(noms1);
      var aide = null, indicateurs = [];
      if (droite) Array.prototype.forEach.call(droite.querySelectorAll(':scope > li'), function (li, i) {
        var a = li.querySelector('a.wims_button_help');
        if (a) aide = a;
        var s = '';
        for (var k = li.firstChild; k; k = k.nextSibling) if (k !== a) s += k.textContent;
        s = propre(s);
        if (i === 0) {
          var mm = /:\s*(.*)$/.exec(s);
          bloc1.appendChild(pastille(mm ? mm[1] : s, ''));
        } else indicateurs.push(s.replace(/\s*:\s*/, ' : ').replace(/\s+(\/|%)/g, '$1'));
      });
      bloc1.appendChild(el('span', 'nova-nd-chevron'));
      resume.appendChild(bloc1);
      // Exercices.
      var lignes = [], communs = {}, faits = 0;
      var iQual = noms.length > 4 ? 4 : -1;
      Array.prototype.forEach.call(t.querySelectorAll('tbody > tr'), function (tr) {
        var td = Array.prototype.slice.call(tr.cells);
        if (td.length < 2) return;
        var fait = td.length === noms.length && iQual >= 0 && !isNaN(nombre(td[iQual].textContent)) && propre(td[iQual].textContent) !== '--';
        var qual = fait ? nombre(td[iQual].textContent) : NaN;
        if (fait) faits++;
        var infos = [];
        [2, 3].forEach(function (c) {
          if (!td[c] || !noms[c]) return;
          var v = propre(td[c].textContent);
          if (!(c in communs)) communs[c] = v; else if (communs[c] !== v) communs[c] = null;
        });
        var essais = null;
        if (fait) td.forEach(function (cel, c) {
          if (c < 5 || !noms[c]) return;
          var tt = cel.querySelector('.wims_tooltip');
          if (tt) {
            infos.push(noms[c] + ' : ' + propre(tt.firstChild.textContent));
            var graines = tt.querySelectorAll('.wims_seed_item');
            if (graines.length) {
              essais = el('span', 'nova-nd-essais');
              essais.setAttribute('aria-hidden', 'true');
              var liste = Array.prototype.slice.call(graines);
              if (liste.length > 20) { essais.appendChild(el('span', 'nova-nd-plus', String.fromCharCode(8230))); liste = liste.slice(-20); }
              liste.forEach(function (g) {
                var v = parseFloat(g.getAttribute('title'));
                var c2 = el('i', 'nova-nd-n-' + (isNaN(v) ? 'np' : niveau(Math.round(v))));
                c2.title = g.getAttribute('title') || '';
                essais.appendChild(c2);
              });
            }
          } else infos.push(noms[c] + ' : ' + propre(cel.textContent));
        });
        lignes.push({ td: td, fait: fait, qual: qual, infos: infos, essais: essais });
      });
      var pNote = bloc1.querySelector('.nova-nd-pastille');
      if (pNote && lignes.length && !faits) pNote.classList.add('nova-nd-vide');   // rien de commencé : grise (maquette A)
      var seg = el('div', 'nova-nd-segments');
      seg.setAttribute('aria-hidden', 'true');
      lignes.forEach(function (l) { seg.appendChild(el('i', 'nova-nd-n-' + niveau(Math.ceil(l.qual)))); });
      if (lignes.length) resume.appendChild(seg);
      var bas = indicateurs.slice();
      if (lignes.length) bas.push(faits ? pluriel(faits, texte('commence', '%1 of %2 exercises started'), texte('commences', '%1 of %2 exercises started'), lignes.length) : texte('pas-commence', 'Not started yet'));
      resume.appendChild(el('div', 'nova-nd-petit', bas.join(POINT)));
      carte.appendChild(resume);
      lignes.forEach(function (l) {
        var ex = el('div', 'nova-nd-ex' + (l.fait ? '' : ' nova-nd-pas-fait'));
        ex.appendChild(el('span', 'nova-nd-num', propre(l.td[0].textContent)));
        var corps = el('div', 'nova-nd-ex-corps');
        corps.appendChild(el('div', 'nova-nd-ex-titre', propre(l.td[1].textContent)));
        var infos = l.infos.slice();
        [2, 3].forEach(function (c) { if (communs[c] === null && l.td[c]) infos.unshift(noms[c] + ' : ' + propre(l.td[c].textContent)); });
        var d = el('div', 'nova-nd-ex-infos', l.fait ? infos.join(POINT) : texte('pas-fait', 'Not done yet'));
        if (l.essais) d.appendChild(l.essais);
        corps.appendChild(d);
        ex.appendChild(corps);
        var q = el('span', 'nova-nd-qualite nova-nd-n-' + niveau(Math.ceil(l.qual)), l.fait ? propre(l.td[iQual].textContent) : TIRET);
        if (l.fait && noms[iQual]) q.title = noms[iQual];
        ex.appendChild(q);
        carte.appendChild(ex);
      });
      // Pied : points requis et poids communs, infos de gauche de WIMS (état, poids, formule, min/moy/max), aide, lien.
      var pied = el('div', 'nova-nd-pied'), morceaux = [];
      [2, 3].forEach(function (c) { if (communs[c]) morceaux.push(noms[c] + ' : ' + communs[c]); });
      var piedTexte = el('span', 'nova-nd-pied-texte');
      if (morceaux.length) piedTexte.appendChild(el('span', '', morceaux.join(POINT) + ' ' + texte('tous', '(all exercises)')));
      // Infos de la feuille (état, poids de la feuille, formule, min/moy/max), précédées de « Chapitre 1 : » : le poids
      // de la feuille ne se confond pas avec celui des exercices.
      var infosF = [];
      if (gauche) Array.prototype.forEach.call(gauche.querySelectorAll('li'), function (li) { var s2 = propre(li.textContent); if (s2) infosF.push(s2.replace(/\s*:\s*/, ' : ')); });
      if (infosF.length) piedTexte.appendChild(el('span', '', (coupe ? coupe[1] + ' : ' : '') + infosF.join(POINT)));
      if (piedTexte.firstChild) pied.appendChild(piedTexte);
      var actions = el('span', 'nova-nd-actions');
      if (aide) actions.appendChild(aide);
      if (lien) { lien.className = (lien.className + ' nova-nd-lien').trim(); lien.textContent = texte('ouvrir', 'Open the worksheet'); actions.appendChild(lien); }
      if (actions.firstChild) pied.appendChild(actions);
      if (pied.firstChild) carte.appendChild(pied);
      if (!section) {
        section = el('section', 'nova-nd');
        section.appendChild(el('h2', 'nova-nd-titre-sec', texte('feuilles', 'Worksheets')));
        cacher(t, section);
      } else {
        var blocT = t.closest('.table-scroll, .wims_scrollable') || t;
        blocT.hidden = true;
        t.setAttribute('data-nova-detail', '');
        sansSauts(blocT);
      }
      section.appendChild(carte);
    });
    // Feuille visée par l'adresse (#sheetN) : ouverte.
    var h = /^#sheet(\d+)$/.exec(location.hash);
    var cible = h && document.getElementById('nova-sheet' + h[1]);
    if (cible) { cible.open = true; cible.scrollIntoView(); }
  }

  /* Feuille vue par l'élève, progression d'abord (audit D2, 2026-11-14, utilisateur, maquette B) : en tête, une carte
   * « n exercices réussis sur N » (segments colorés par la qualité), la validité de la feuille (texte de WIMS) et
   * « Mode entraînement », interrupteur à la place de « Suspendre l'enregistrement » / « Réactiver » (mêmes liens) ;
   * par exercice, un état (Réussi, En cours, À faire), une barre de points et « x / R points », la qualité en petit.
   * Scores de WIMS (adm/sheet/class.phtml) : « Qualité: m/10 », puis « Réussite: p% » (ou meilleure réussite, ou
   * niveau /10 selon la sévérité de la feuille), « Points requis:R », éventuellement « Essais: a/b » ; lus par la forme
   * des valeurs, pas par les libellés (toutes langues). Réglage « Feuilles et examens en liste » (feuilleExercices) ;
   * sous-titre « Feuille n » : réglage « textes ». Sans textes (#nova-feuille-textes, élève seulement) : étiquettes. */
  function feuilleProgression() {
    var tx = document.getElementById('nova-feuille-textes');
    var liste = document.querySelector('.wimsbody ol.wims_sheet_list');
    var racine = document.documentElement;
    if (!tx || !liste) { racine.classList.add('nova-feuille-prete'); return false; }
    var t = function (k, a, b) { return (tx.getAttribute('data-' + k) || '').replace('%1', a == null ? '' : a).replace('%2', b == null ? '' : b); };
    var el = function (tag, classe, texte) { var e = document.createElement(tag); if (classe) e.className = classe; if (texte != null) e.textContent = texte; return e; };
    var num = function (v) { return parseFloat(String(v).replace(',', '.')); };
    var niveau = function (q) { var n = Math.round(q); return n <= 0 ? 'zero' : n <= 3 ? 'rouge' : n <= 6 ? 'orange' : n <= 8 ? 'jaune' : 'vert'; };
    try {
      // Sous-titre « Feuille d'exercices No1 » : « Feuille 1 ».
      var st = document.querySelector('#wims_modu_title1 > h2.wims_subtitle');
      var mn = st && /(\d+)\D*$/.exec(st.textContent);
      if (mn && !standard('textes') && t('feuille', mn[1])) st.textContent = t('feuille', mn[1]);

      var exos = [];
      Array.prototype.forEach.call(liste.querySelectorAll(':scope > li.wims_exo_item'), function (li) {
        var bloc = li.querySelector('.wims_sheet_score');
        if (!bloc || li.classList.contains('nova-exo-b')) return;
        var texte = bloc.textContent.replace(/\s+/g, ' ').trim(), re = /([^:\d][^:]*?)\s*:\s*([\d.,]+(?:\s*\/\s*[\d.,]+)?\s*%?)/g, m, jetons = [];
        while ((m = re.exec(texte))) jetons.push({ lib: m[1].trim(), val: m[2].replace(/\s+/g, '') });
        if (!jetons.length || !/\//.test(jetons[0].val)) return;
        var e = { li: li, qualite: num(jetons[0].val), libQualite: jetons[0].lib, valQualite: jetons[0].val, p: null, pourcent: false, requis: null, autres: [] };
        jetons.slice(1).forEach(function (j) {
          if (e.p === null && /%$/.test(j.val)) { e.p = num(j.val); e.pourcent = true; }
          else if (e.p === null && /\/10$/.test(j.val) && e.requis === null) { e.p = num(j.val) * 10; e.prog = j; }
          else if (e.requis === null && /^[\d.,]+$/.test(j.val)) e.requis = num(j.val);
          else e.autres.push(j);
        });
        if (e.p === null || isNaN(e.p)) return;
        var essais = Array.prototype.some.call(li.querySelectorAll('.wims_seed_item'), function (x) { return /^\d/.test(x.getAttribute('title') || ''); });
        e.etat = e.p >= 100 ? 'reussi' : (e.p > 0 || e.qualite > 0 || essais) ? 'cours' : 'faire';
        exos.push(e);
      });
      if (!exos.length) return false;

      exos.forEach(function (e) {
        var li = e.li, bloc = li.querySelector('.wims_sheet_score');
        li.classList.add('nova-exo-b');
        var etat = el('span', 'nova-etat-exo nova-etat-' + e.etat, t('etat-' + e.etat));
        li.insertBefore(etat, li.querySelector(':scope > a') ? li.querySelector(':scope > a').nextSibling : li.firstChild);
        var barre = el('div', 'nova-barre-reussite');
        barre.setAttribute('aria-hidden', 'true');
        var plein = el('span');
        plein.style.width = Math.max(0, Math.min(100, e.p)) + '%';
        if (e.p >= 100) barre.setAttribute('data-plein', '');
        barre.appendChild(plein);
        var ligne = el('div', 'nova-exo-chiffres');
        var gauche = e.pourcent && e.requis ? t('points', Math.round(Math.min(100, e.p) * e.requis / 100), e.requis)
          : e.prog ? e.prog.lib + ' ' + e.prog.val : Math.round(e.p) + ' %';
        ligne.appendChild(el('span', 'nova-exo-points', gauche));
        var droite = [e.libQualite.toLowerCase() + ' ' + e.valQualite].concat(e.autres.map(function (j) { return j.lib.toLowerCase() + ' ' + j.val; }));
        ligne.appendChild(el('span', 'nova-exo-qualite', droite.join(' \u00b7 ')));
        bloc.textContent = '';
        bloc.appendChild(barre);
        bloc.appendChild(ligne);
      });

      // Carte d'en-tête : résumé, validité, mode entraînement.
      var corps = document.querySelector('.wimsbody');
      var feuille = liste.closest('.wims_sheet');
      var carte = el('section', 'nova-feuille-etat');
      var n = exos.filter(function (e) { return e.etat === 'reussi'; }).length;
      var tete = el('div', 'nova-feuille-resume');
      tete.appendChild(el('strong', '', t(n > 1 ? 'reussis' : 'reussi', n, exos.length)));
      carte.appendChild(tete);
      var seg = el('div', 'nova-feuille-segments');
      seg.setAttribute('aria-hidden', 'true');
      exos.forEach(function (e) { seg.appendChild(el('i', e.etat === 'faire' ? 'nova-seg-np' : 'nova-seg-' + niveau(e.qualite))); });
      carte.appendChild(seg);
      var validite = corps.querySelector(':scope > p#name_student1');
      if (validite) { validite.classList.add('nova-feuille-validite'); carte.appendChild(validite); }
      var lien = corps.querySelector(':scope > a.wims_button:is([href*="job=suspend"], [href*="job=reopen"])');
      if (lien) {
        var actif = /job=reopen/.test(lien.getAttribute('href'));
        // Texte de WIMS juste avant le lien (« L'enregistrement des notes est ouvert. » ou « … suspendu ») : remplacé.
        var avant = lien.previousSibling;
        while (avant && avant.nodeType === 3 && !avant.nodeValue.trim()) avant = avant.previousSibling;
        if (avant && avant.nodeType === 3) avant.remove();
        var mode = el('a', 'nova-entrainement');
        mode.href = lien.href;
        mode.setAttribute('role', 'switch');
        mode.setAttribute('aria-checked', actif ? 'true' : 'false');
        var txt = el('span', 'nova-entrainement-texte');
        txt.appendChild(el('strong', '', t('entrainement')));
        txt.appendChild(el('span', '', t('entrainement-aide')));
        mode.appendChild(txt);
        mode.appendChild(el('span', 'nova-interrupteur'));
        mode.title = lien.textContent.trim();
        carte.appendChild(mode);
        lien.remove();
      }
      (feuille || liste).parentNode.insertBefore(carte, feuille || liste);
      return true;
    } finally {
      racine.classList.add('nova-feuille-prete');
    }
  }
