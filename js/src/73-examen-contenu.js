  /* ===== js/src/73-examen-contenu.js : contenu d'un examen en deux listes (2026-11-19) ===== */
  /* Contenu d'un examen (adm/class/exam, onglet Contenu ; 2026-11-19, utilisateur, maquette
   * maquettes/examen-contenu-2026-11-19.html). À gauche, une carte par exercice de l'examen : WIMS donne à chaque élève UN des
   * exercices de feuille qu'elle contient (au hasard s'il y en a plusieurs). Titre et poids sur la carte, dépendances, options
   * et commentaire sous « Plus de réglages » (course : commentaire seul, comme WIMS). À droite, les feuilles actives (WIMS ne
   * prend ses exercices que là) et leurs exercices : glisser sur une carte (ajouté) ou sur la zone du bas (nouvelle carte),
   * ou « + » (menu : nouvel exercice, dans l'exercice k). Un clic sur un exercice ouvre son aperçu : le vrai exercice, dans
   * la session « nouvelle fenêtre » de WIMS (<session>_new, celle du lien du tableau de WIMS), la page n'est pas touchée.
   * « Enregistrer » collant (barreEnregistrer) : contenu entier en une requête (nova_ex_n, nova_ex_contenu en hexadecimal
   * latin-1 ; _widgets/examen-contenu.phtml, _procs/examen.sh ecrire, mêmes contrôles que WIMS). Examen actif : lecture et
   * aperçu seulement. Données : #nova-ex-contenu (examen.sh lire). Réglage std-listes : tableau de WIMS. */
  function examenContenu() {
    var src = document.getElementById('nova-ex-contenu'), tx = document.getElementById('nova-ex-textes');
    var panneau = document.getElementById('examcontent');
    if (!src || !tx || !panneau || standard('listes') || panneau.querySelector('.nova-ex')) return;
    var t = function (k, a, b) { return (tx.getAttribute('data-' + k) || '').replace('%1', a == null ? '' : a).replace('%2', b == null ? '' : b); };
    var el = function (tag, classe, texte) { var e = document.createElement(tag); if (classe) e.className = classe; if (texte != null) e.textContent = texte; return e; };
    var icone = function (nom) { var s = el('span', 'nova-etat-ico'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('data-icone', nom); return s; };
    // Textes de WIMS gardés avec leurs entités (« G&eacute;n&eacute;ralit&eacute;s ») : rendus en clair.
    var clair = function (s) { var d = document.createElement('textarea'); d.innerHTML = s || ''; return d.value.replace(/\s+/g, ' ').trim(); };
    var modifiable = src.getAttribute('data-etat') === '0';
    var course = src.getAttribute('data-mode') === '1';
    var numero = src.getAttribute('data-examen') || '';

    var feuilles = [], exos = {}, cour = null;
    Array.prototype.forEach.call(src.children, function (x) {
      if (x.tagName === 'B') {
        cour = { num: x.getAttribute('data-s'), titre: clair(x.getAttribute('data-t')), hors: x.hasAttribute('data-hors'), exos: [] };
        feuilles.push(cour);
      } else if (x.classList.contains('e') && cour) {
        var cle = x.getAttribute('data-e') || '';
        var e = { cle: cle, feuille: cour.num, n: cle.split('.')[1], titre: clair(x.getAttribute('data-t')) || cle, module: x.getAttribute('data-m') || '', params: x.getAttribute('data-a') || '' };
        cour.exos.push(e);
        exos[cle] = e;
      }
    });
    var cartes = Array.prototype.filter.call(src.children, function (x) { return x.classList.contains('x'); }).map(function (x) {
      return {
        poids: x.getAttribute('data-p') || '1', titre: clair(x.getAttribute('data-n')),
        // WIMS écrit la liste « 1.23, 1.25, 1.26 » (virgule et espace ; vu chez l'utilisateur, 2026-11-19 : seul le premier gardé).
        choix: (x.getAttribute('data-c') || '').split(/[\s,]+/).filter(function (c) { return /^\d+\.\d+$/.test(c); }),
        dep: x.getAttribute('data-d') || '', opt: x.getAttribute('data-o') || '', com: x.getAttribute('data-k') || '', ouvert: false
      };
    });
    var etat = function () { return JSON.stringify(cartes.map(function (c) { return [c.poids, c.titre, c.choix.join(','), c.dep, c.opt, c.com]; })); };
    var depart = etat();
    var nomExo = function (cle) { var e = exos[cle]; return e ? e.titre : cle; };
    var etiquette = function (cle) { return 'F' + cle.replace('.', String.fromCharCode(0xB7)); };

    // Mise en place : le contenu de WIMS (tableau ou message) est gardé, caché.
    var garde = el('div', 'nova-ex-wims');
    garde.hidden = true;
    while (panneau.firstChild) garde.appendChild(panneau.firstChild);
    panneau.appendChild(garde);
    var zone = el('div', 'nova-ex nova-seq-contenu' + (modifiable ? '' : ' nova-ex-lecture'));
    panneau.appendChild(zone);
    var carteBloc = function (titre) {
      var c = el('section', 'nova-seq-contenu-carte'), tete = el('div', 'nova-seq-contenu-tete');
      tete.appendChild(el('h3', '', titre));
      var compte = el('span', 'nova-seq-contenu-compte');
      tete.appendChild(compte);
      c.appendChild(tete);
      zone.appendChild(c);
      return { carte: c, tete: tete, compte: compte };
    };
    var gauche = carteBloc(t('titre-gauche'));
    var resultat = src.getAttribute('data-resultat') || '';
    if (resultat) {
      var r = /^ok(\d+)$/.exec(resultat);
      gauche.carte.appendChild(el('p', 'nova-ex-resultat' + (r ? '' : ' nova-ex-resultat-refus'), r ? (r[1] === '1' ? t('fait-1') : t('fait', r[1])) : t('refus', resultat)));
    }
    if (!modifiable) gauche.carte.appendChild(el('p', 'nova-ex-lecture-avis', t('lecture')));
    var liste = el('ol', 'nova-ex-cartes');
    liste.setAttribute('aria-label', t('titre-gauche'));
    gauche.carte.appendChild(liste);
    var droite = feuilles.some(function (f) { return !f.hors; }) || modifiable ? carteBloc(t('titre-droite')) : null;
    var recherche = null, listeFeuilles = null;
    if (droite) {
      recherche = el('input', 'nova-seq-contenu-recherche');
      recherche.type = 'search';
      recherche.placeholder = t('chercher');
      recherche.setAttribute('aria-label', t('chercher'));
      droite.carte.appendChild(recherche);
      listeFeuilles = el('div', 'nova-ex-feuilles');
      droite.carte.appendChild(listeFeuilles);
    }
    var annonce = el('p', 'nova-seq-contenu-annonce');
    annonce.setAttribute('role', 'status');
    zone.appendChild(annonce);
    var dire = function (s) { annonce.textContent = ''; setTimeout(function () { annonce.textContent = s; }, 30); };

    // Bouton « Enregistrer » collant, sous les deux listes.
    var regler = function () {};
    if (modifiable) {
      var pied = el('div', 'nova-ex-enreg');
      var bEnr = el('button', 'wims_button nova-ex-enregistrer', t('enregistrer'));
      bEnr.type = 'button';
      pied.appendChild(bEnr);
      panneau.appendChild(pied);
      regler = barreEnregistrer(pied, zone, t('a-enregistrer'));
      bEnr.addEventListener('click', enregistrer);
      window.addEventListener('beforeunload', function (e) { if (!envoi && etat() !== depart) { e.preventDefault(); e.returnValue = ''; } });
    }
    var envoi = false;
    function changer(texte) {
      regler(etat() !== depart);
      if (texte) dire(texte);
    }

    var bouton = function (ico, texte, faire, inactif) {
      var b = el('button', 'nova-seq-contenu-btn');
      b.type = 'button';
      b.setAttribute('aria-label', texte);
      b.title = texte;
      b.appendChild(icone(ico));
      if (inactif) b.disabled = true;
      else b.addEventListener('click', faire);
      return b;
    };

    // ---- Glisser-déposer (souris ; au téléphone : « + » et flèches). glisse = { genre: 'exo'|'pastille'|'carte', cle, de }.
    var glisse = null;
    var viser = function (cible, classe) {
      Array.prototype.forEach.call(zone.querySelectorAll('.nova-ex-vise, .nova-ex-vise-avant'), function (x) { if (x !== cible) x.classList.remove('nova-ex-vise', 'nova-ex-vise-avant'); });
      if (cible) cible.classList.add(classe);
    };
    var cibleDepot = function (li, k) {
      li.addEventListener('dragover', function (e) {
        if (!glisse) return;
        e.preventDefault();
        viser(li, glisse.genre === 'carte' && k != null ? 'nova-ex-vise-avant' : 'nova-ex-vise');
      });
      li.addEventListener('dragleave', function (e) { if (!li.contains(e.relatedTarget)) li.classList.remove('nova-ex-vise', 'nova-ex-vise-avant'); });
      li.addEventListener('drop', function (e) {
        if (!glisse) return;
        e.preventDefault();
        var g = glisse;
        glisse = null;
        viser(null);
        if (g.genre === 'carte') { if (k != null) deplacerCarte(g.de, k > g.de ? k - 1 : k); else deplacerCarte(g.de, cartes.length - 1); return; }
        if (g.genre === 'pastille') {
          if (g.de === k) return;
          cartes[g.de].choix = cartes[g.de].choix.filter(function (c) { return c !== g.cle; });
        }
        ajouter(g.cle, k);
      });
    };
    var source = function (noeud, donnees) {
      noeud.draggable = true;
      noeud.addEventListener('dragstart', function (e) {
        e.stopPropagation();
        glisse = donnees;
        try { e.dataTransfer.setData('text/plain', donnees.cle || ''); e.dataTransfer.effectAllowed = 'move'; } catch (x) { /* ancien navigateur */ }
        noeud.classList.add('nova-ex-glisse');
      });
      noeud.addEventListener('dragend', function () { glisse = null; noeud.classList.remove('nova-ex-glisse'); viser(null); });
    };

    // ---- Actions.
    function ajouter(cle, k) {
      if (!exos[cle]) return;
      if (k == null || !cartes[k]) {
        cartes.push({ poids: '1', titre: nomExo(cle), choix: [cle], dep: '', opt: '', com: '', ouvert: false });
        k = cartes.length - 1;
      } else if (cartes[k].choix.indexOf(cle) < 0) {
        cartes[k].choix.push(cle);
      }
      dessiner();
      changer(t('ajoute', nomExo(cle), k + 1));
    }
    function retirer(k, cle) {
      cartes[k].choix = cartes[k].choix.filter(function (c) { return c !== cle; });
      dessiner();
      changer(t('retire', nomExo(cle)));
      var suite = liste.querySelector('li.nova-ex-carte[data-k="' + k + '"] .nova-ex-voir, li.nova-ex-carte[data-k="' + k + '"] input');
      if (suite) suite.focus();
    }
    function supprimer(k) {
      var titre = cartes[k].titre;
      cartes.splice(k, 1);
      dessiner();
      changer(t('retire', titre));
      var suite = liste.querySelector('li.nova-ex-carte[data-k="' + Math.min(k, cartes.length - 1) + '"] input.nova-ex-titre');
      if (suite) suite.focus();
    }
    function deplacerCarte(de, vers, focus) {
      if (vers < 0 || vers >= cartes.length || de === vers) return;
      var c = cartes.splice(de, 1)[0];
      cartes.splice(vers, 0, c);
      dessiner();
      changer(t('place', de + 1, vers + 1));
      if (focus) {
        var b = liste.querySelector('li.nova-ex-carte[data-k="' + vers + '"] button[data-action="' + focus + '"]:not(:disabled)') ||
          liste.querySelector('li.nova-ex-carte[data-k="' + vers + '"] input.nova-ex-titre');
        if (b) b.focus();
      }
    }

    // ---- Menu de « + » : nouvel exercice, ou dans l'exercice k.
    var menu = null;
    function fermerMenu(rendre) {
      if (!menu) return;
      var b = menu.novaBouton;
      menu.remove();
      menu = null;
      document.removeEventListener('pointerdown', horsMenu, true);
      if (rendre && b) b.focus();
    }
    function horsMenu(e) { if (menu && !menu.contains(e.target) && e.target !== menu.novaBouton) fermerMenu(false); }
    function ouvrirMenu(b, cle, apres) {
      fermerMenu(false);
      menu = el('div', 'nova-ex-menu');
      menu.setAttribute('role', 'menu');
      menu.novaBouton = b;
      menu.appendChild(el('p', 'nova-ex-menu-titre', t('menu-titre', nomExo(cle))));
      var item = function (texte, k) {
        var i = el('button', 'nova-ex-menu-item', texte);
        i.type = 'button';
        i.setAttribute('role', 'menuitem');
        if (k != null && cartes[k].choix.indexOf(cle) >= 0) i.disabled = true;
        i.addEventListener('click', function () { fermerMenu(false); ajouter(cle, k); if (apres) apres(); });
        menu.appendChild(i);
      };
      item('+ ' + t('nouveau'), null);
      cartes.forEach(function (c, k) { item(t('dans', k + 1, c.titre || nomExo(c.choix[0] || '')), k); });
      // Dans la fenêtre d'aperçu (couche du dessus du navigateur) : le menu y est posé, sinon il passerait dessous.
      (b.closest('dialog') || document.body).appendChild(menu);
      var r = b.getBoundingClientRect(), l = Math.min(innerWidth - menu.offsetWidth - 8, Math.max(8, r.right - menu.offsetWidth));
      var h = r.bottom + 4 + menu.offsetHeight > innerHeight - 8 ? Math.max(8, r.top - 4 - menu.offsetHeight) : r.bottom + 4;
      menu.style.left = l + 'px';
      menu.style.top = h + 'px';
      menu.addEventListener('keydown', function (e) {
        var items = Array.prototype.filter.call(menu.querySelectorAll('.nova-ex-menu-item'), function (x) { return !x.disabled; });
        var i = items.indexOf(document.activeElement);
        if (e.key === 'Escape') { e.preventDefault(); fermerMenu(true); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
        else if (e.key === 'Tab') fermerMenu(false);
      });
      document.addEventListener('pointerdown', horsMenu, true);
      var premier = menu.querySelector('.nova-ex-menu-item:not(:disabled)');
      if (premier) premier.focus();
    }

    // ---- Aperçu d'un exercice : fenêtre avec le vrai exercice (session <s>_new de WIMS ; compteur : une requête identique à la
    // précédente serait resservie telle quelle, sans nouveau tirage).
    var fenetre = null;
    function apercu(cle) {
      var e = exos[cle];
      if (!e || typeof document.createElement('dialog').showModal !== 'function') return;
      var m = /session=([^&.]+)/.exec(lienSession('')), session = m ? decodeURIComponent(m[1]) : '';
      if (!session) return;
      var adresse = function () {
        return 'wims.cgi?wims_window=new&session=' + encodeURIComponent(session + '_new') + '.' + (Date.now() % 100000) +
          '&lang=' + encodeURIComponent(racineLangue()) + '&module=' + encodeURIComponent(e.module) + '&cmd=new&' + e.params.replace(/^[&?]+/, '');
      };
      if (fenetre) fenetre.remove();
      var f = fenetre = el('dialog', 'nova-dialogue nova-ex-apercu');
      var tete = el('div', 'nova-ex-apercu-tete');
      var h = el('h1', '', e.titre);
      h.id = 'nova-ex-apercu-titre';
      f.setAttribute('aria-labelledby', h.id);
      var titres = el('div', 'nova-ex-apercu-titres');
      titres.appendChild(h);
      titres.appendChild(el('p', 'nova-ex-apercu-sous', t('apercu-sous', e.feuille, e.n)));
      tete.appendChild(titres);
      var fermer = el('button', 'close-button', String.fromCharCode(0xD7));
      fermer.type = 'button';
      fermer.setAttribute('aria-label', t('fermer'));
      fermer.addEventListener('click', function () { f.close(); });
      tete.appendChild(fermer);
      f.appendChild(tete);
      var cadre = el('iframe', 'nova-ex-apercu-cadre');
      cadre.title = e.titre;
      cadre.src = adresse();
      f.appendChild(cadre);
      // Échap dans l'exercice (cadre de même origine) : ferme aussi la fenêtre.
      cadre.addEventListener('load', function () {
        // Page de l'exercice sans barre, fil d'Ariane ni menu de WIMS (html.nova-apercu-exo, cadre.css) : seul l'exercice compte.
        try {
          cadre.contentDocument.documentElement.classList.add('nova-apercu-exo');
          cadre.contentDocument.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') f.close(); });
        } catch (x) { /* autre origine */ }
      });
      var bas = el('div', 'nova-ex-apercu-pied');
      var nouvel = el('button', 'wims_button wims_secondary_button', t('nouvel-enonce'));
      nouvel.type = 'button';
      nouvel.addEventListener('click', function () { cadre.src = adresse(); });
      bas.appendChild(nouvel);
      bas.appendChild(el('span', 'nova-ex-apercu-espace'));
      if (modifiable) {
        var ajout = el('button', 'wims_button wims_secondary_button', t('ajouter-a'));
        ajout.type = 'button';
        ajout.setAttribute('aria-haspopup', 'menu');
        ajout.addEventListener('click', function () { ouvrirMenu(ajout, cle, function () { f.close(); }); });
        bas.appendChild(ajout);
      }
      var ok = el('button', 'wims_button', t('fermer'));
      ok.type = 'button';
      ok.addEventListener('click', function () { f.close(); });
      bas.appendChild(ok);
      f.appendChild(bas);
      f.addEventListener('click', function (ev) { if (ev.target === f) f.close(); });
      f.addEventListener('close', function () { fermerMenu(false); f.remove(); if (fenetre === f) fenetre = null; });
      document.body.appendChild(f);
      f.showModal();
      fermer.focus();
    }

    // ---- Dessin de la liste de gauche.
    function dessiner() {
      liste.textContent = '';
      var n = cartes.length;
      gauche.compte.textContent = n === 1 ? t('compte-1') : t('compte', n);
      cartes.forEach(function (c, k) {
        var li = el('li', 'nova-ex-carte' + (c.choix.length ? '' : ' nova-ex-carte-vide'));
        li.setAttribute('data-k', k);
        var tete = el('div', 'nova-ex-carte-tete');
        if (modifiable) {
          var poignee = el('span', 'nova-ex-poignee');
          poignee.title = t('glisser');
          poignee.appendChild(icone('poignee'));
          source(poignee, { genre: 'carte', de: k });
          tete.appendChild(poignee);
        }
        tete.appendChild(el('span', 'nova-ex-num', String(k + 1)));
        var titre = el('input', 'nova-ex-titre');
        titre.type = 'text';
        titre.maxLength = 100;
        titre.value = c.titre;
        titre.setAttribute('aria-label', t('titre') + ' ' + (k + 1));
        titre.readOnly = !modifiable;
        titre.addEventListener('input', function () { c.titre = titre.value; changer(); });
        tete.appendChild(titre);
        if (modifiable) {
          var act = el('span', 'nova-ex-actions');
          var b1 = bouton('fleche-haut', t('monter'), function () { deplacerCarte(k, k - 1, 'monter'); }, k === 0);
          b1.setAttribute('data-action', 'monter');
          var b2 = bouton('fleche-bas', t('descendre'), function () { deplacerCarte(k, k + 1, 'descendre'); }, k === n - 1);
          b2.setAttribute('data-action', 'descendre');
          act.appendChild(b1);
          act.appendChild(b2);
          act.appendChild(bouton('corbeille', t('supprimer'), function () { supprimer(k); }));
          tete.appendChild(act);
        }
        li.appendChild(tete);
        var pastilles = el('div', 'nova-ex-pastilles');
        c.choix.forEach(function (cle) {
          var p = el('span', 'nova-ex-pastille' + (exos[cle] ? '' : ' nova-ex-pastille-inconnue'));
          var voir = el('button', 'nova-ex-voir');
          voir.type = 'button';
          voir.appendChild(el('b', '', etiquette(cle)));
          voir.appendChild(document.createTextNode(' ' + nomExo(cle)));
          if (exos[cle]) voir.addEventListener('click', function () { apercu(cle); });
          else voir.disabled = true;
          p.appendChild(voir);
          if (modifiable) {
            var ote = el('button', 'nova-ex-ote', String.fromCharCode(0x2715));
            ote.type = 'button';
            ote.setAttribute('aria-label', t('retirer', nomExo(cle)));
            ote.title = ote.getAttribute('aria-label');
            ote.addEventListener('click', function () { retirer(k, cle); });
            p.appendChild(ote);
            source(p, { genre: 'pastille', cle: cle, de: k });
          }
          pastilles.appendChild(p);
        });
        li.appendChild(pastilles);
        if (c.choix.length > 1) li.appendChild(el('p', 'nova-ex-hasard', t('hasard', c.choix.length)));
        if (modifiable && !c.choix.length) li.appendChild(el('p', 'nova-ex-deposer', t('deposer-carte')));
        var bas = el('div', 'nova-ex-carte-pied');
        var lp = el('label', 'nova-ex-poids');
        lp.appendChild(document.createTextNode(t('poids') + ' '));
        var poids = el('input');
        poids.type = 'number';
        poids.min = '0';
        poids.max = '10';
        poids.step = 'any';
        poids.value = c.poids;
        poids.readOnly = !modifiable;
        poids.addEventListener('input', function () { c.poids = poids.value; changer(); });
        lp.appendChild(poids);
        bas.appendChild(lp);
        var plus = el('button', 'nova-ex-plus', c.ouvert ? t('moins') : t('plus'));
        plus.type = 'button';
        plus.setAttribute('aria-expanded', c.ouvert ? 'true' : 'false');
        bas.appendChild(plus);
        li.appendChild(bas);
        var reglages = el('div', 'nova-ex-reglages');
        reglages.id = 'nova-ex-reglages-' + k;
        plus.setAttribute('aria-controls', reglages.id);
        reglages.hidden = !c.ouvert;
        var champ = function (libelle, valeur, lire, max) {
          var l = el('label', 'nova-ex-champ');
          l.appendChild(el('span', '', libelle));
          var i = el('input');
          i.type = 'text';
          i.value = valeur;
          i.maxLength = max;
          i.readOnly = !modifiable;
          i.addEventListener('input', function () { lire(i.value); changer(); });
          l.appendChild(i);
          reglages.appendChild(l);
        };
        if (!course) {
          champ(t('dependances'), c.dep, function (v) { c.dep = v; }, 100);
          var lo = el('label', 'nova-ex-option');
          var co = el('input');
          co.type = 'checkbox';
          co.checked = /autogen/.test(c.opt);
          co.disabled = !modifiable;
          co.addEventListener('change', function () { c.opt = co.checked ? 'autogen' : ''; changer(); });
          lo.appendChild(co);
          lo.appendChild(document.createTextNode(' autogen'));
          var bo = el('div', 'nova-ex-champ');
          bo.appendChild(el('span', '', t('options')));
          bo.appendChild(lo);
          reglages.appendChild(bo);
        }
        champ(t('commentaire'), c.com, function (v) { c.com = v; }, 2000);
        li.appendChild(reglages);
        plus.addEventListener('click', function () {
          c.ouvert = !c.ouvert;
          reglages.hidden = !c.ouvert;
          plus.textContent = c.ouvert ? t('moins') : t('plus');
          plus.setAttribute('aria-expanded', c.ouvert ? 'true' : 'false');
        });
        if (modifiable) cibleDepot(li, k);
        liste.appendChild(li);
      });
      if (modifiable) {
        var neuf = el('li', 'nova-ex-nouveau', n ? t('deposer-nouveau') : t('vide'));
        cibleDepot(neuf, null);
        liste.appendChild(neuf);
      }
      dessinerDroite();
    }

    // ---- Liste de droite : feuilles actives et leurs exercices.
    var ouvertes = {};
    function dessinerDroite() {
      if (!listeFeuilles) return;
      var q = (recherche.value || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9. ]/g, '');
      var sansAccent = function (s) { return s.toLowerCase().normalize('NFD').replace(/[^a-z0-9. ]/g, ''); };
      var ou = {};
      cartes.forEach(function (c, k) { c.choix.forEach(function (cle) { (ou[cle] = ou[cle] || []).push(k + 1); }); });
      listeFeuilles.textContent = '';
      var actives = feuilles.filter(function (f) { return !f.hors; });
      droite.compte.textContent = '';
      if (!actives.length) { listeFeuilles.appendChild(el('p', 'nova-ex-aucun', t('aucune-feuille'))); return; }
      var trouve = 0;
      actives.forEach(function (f, i) {
        var lignes = f.exos.filter(function (e) { return !q || sansAccent(e.titre + ' ' + e.cle + ' ' + f.titre).indexOf(q) >= 0; });
        if (!lignes.length) return;
        trouve += lignes.length;
        var d = el('details', 'nova-ex-feuille');
        d.open = q ? true : ouvertes[f.num] != null ? ouvertes[f.num] : i === 0;
        d.addEventListener('toggle', function () { if (!q) ouvertes[f.num] = d.open; });
        var s = el('summary', 'nova-ex-feuille-tete');
        s.appendChild(el('span', 'nova-ex-feuille-titre', t('feuille', f.num) + ' ' + String.fromCharCode(0xB7) + ' ' + f.titre));
        s.appendChild(el('span', 'nova-seq-contenu-compte', f.exos.length === 1 ? t('compte-1') : t('compte', f.exos.length)));
        d.appendChild(s);
        var ul = el('ul', 'nova-ex-exos');
        lignes.forEach(function (e) {
          var li = el('li', 'nova-ex-exo' + (ou[e.cle] ? ' nova-ex-exo-pris' : ''));
          li.setAttribute('data-cle', e.cle);
          if (modifiable) {
            var p = el('span', 'nova-ex-poignee');
            p.title = t('glisser');
            p.appendChild(icone('poignee'));
            li.appendChild(p);
            source(li, { genre: 'exo', cle: e.cle });
          }
          var corps = el('span', 'nova-ex-exo-corps');
          var voir = el('button', 'nova-ex-voir');
          voir.type = 'button';
          voir.appendChild(el('b', '', e.cle));
          voir.appendChild(document.createTextNode(' ' + e.titre));
          voir.addEventListener('click', function () { apercu(e.cle); });
          corps.appendChild(voir);
          if (ou[e.cle]) corps.appendChild(el('span', 'nova-seq-ress-autre', t('deja', ou[e.cle].join(', '))));
          li.appendChild(corps);
          if (modifiable) {
            var b = bouton('plus', t('ajouter', e.titre), function () { ouvrirMenu(b, e.cle); });
            b.setAttribute('aria-haspopup', 'menu');
            li.appendChild(b);
          }
          ul.appendChild(li);
        });
        d.appendChild(ul);
        listeFeuilles.appendChild(d);
      });
      if (!trouve) listeFeuilles.appendChild(el('p', 'nova-ex-aucun', t('aucun')));
    }
    if (recherche) recherche.addEventListener('input', dessinerDroite);

    // ---- Enregistrer : contenu entier, octets windows-1252 en hexadecimal (accents gardés quel que soit l'encodage de l'adresse).
    var W = { 0x20AC: 0x80, 0x201A: 0x82, 0x192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x2C6: 0x88, 0x2030: 0x89,
      0x160: 0x8A, 0x2039: 0x8B, 0x152: 0x8C, 0x17D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95,
      0x2013: 0x96, 0x2014: 0x97, 0x2DC: 0x98, 0x2122: 0x99, 0x161: 0x9A, 0x203A: 0x9B, 0x153: 0x9C, 0x17E: 0x9E, 0x178: 0x9F };
    var hex = function (s) {
      var o = '';
      for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        if (c > 255) c = W[c] || 63;
        o += (c < 16 ? '0' : '') + c.toString(16);
      }
      return o;
    };
    function enregistrer() {
      if (envoi) return;
      var rs = String.fromCharCode(30), us = String.fromCharCode(31);
      var texte = cartes.filter(function (c) { return c.choix.length; }).map(function (c) {
        return [String(c.poids).replace(',', '.'), c.choix.join(', '), c.titre, c.dep, c.opt, c.com].map(function (v) { return String(v).replace(/[\x1e\x1f\r\n]/g, ' '); }).join(us);
      }).join(rs);
      envoi = true;
      bEnr.disabled = true;
      bEnr.textContent = t('enregistrement');
      bEnr.classList.add('nova-en-cours');
      location.href = lienSession('&cmd=new&module=adm%2Fclass%2Fexam&exam=' + encodeURIComponent(numero) + '&nova_ex_n=' + encodeURIComponent(numero) + '&nova_ex_contenu=' + hex(texte));
    }
    dessiner();
  }
