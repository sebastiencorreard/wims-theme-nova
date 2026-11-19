  /* ===== js/src/71-sequences.js : séquences pédagogiques de l'enseignant (liste, réglages sur la page, page Modifier : informations générales et contenu, classes en partage, numéro seul ; sorties de 70-enseignant.js le 2026-11-19, revue de structure) ===== */
  /* Séquences pédagogiques, vue de l'enseignant (2026-11-12, utilisateur, maquette B ; adm/class/sequence, job=show).
   * Barre de titre : poignée, chevron (replier), titre, pastille d'état qui ouvre le menu (Activer ou Désactiver, Effacer :
   * liens de WIMS, Effacer confirmé par confirmationsRessources), « Modifier », flèches Monter / Descendre (script de
   * Nova, pas moveup). Replis gardés par navigateur et par classe (localStorage). Glisser-déposer par la poignée : carte
   * repliée qui suit le pointeur, silhouette à sa place, les autres s'écartent ; requête en arrière-plan (nova_seq_de,
   * nova_seq_vers : _widgets/sequences.phtml, _procs/sequences.sh), puis la page est relue (numéros et liens de WIMS),
   * même position à l'écran. Ressources de chaque séquence : petites pastilles d'état. Réglage std-listes.
   * Réglages sur la page (2026-11-19, utilisateur, maquette sequences-reglages) : barre au-dessus de la liste (variante A :
   * présentation en séquences, mot générique, numéro seul, Ajouter), enregistrée par le formulaire Configurer de WIMS
   * (lu en arrière-plan, recopié dans la page et envoyé par le navigateur : accents en windows-1252) ; une seule pastille
   * par séquence (variante B) = ce que voient les élèves aujourd'hui, d'après le statut de WIMS et la plage d'affichage
   * (#nova-seq-reglages, fichier .S<n>) ; son menu : Activer ou Désactiver, Affichage aux élèves (fenêtre : toujours,
   * jamais, entre deux dates ; nova_seq_plage, _procs/sequences.sh), Effacer. */
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
    var rg = document.getElementById('nova-seq-reglages');
    // Page Modifier d'une séquence (2026-11-19) : heure du serveur, dates de la classe, classes en partage.
    var rm = document.getElementById('nova-seq-modifier'), src = rg || rm;
    var plages = {};
    if (rg) (rg.getAttribute('data-plages') || '').split(';').forEach(function (x) {
      var m = /^(\d+):([a-z]+)(?:,(\d*),(\d*),(\d))?$/.exec(x);
      if (m) plages[m[1]] = { mode: m[2], debut: m[3] || '', fin: m[4] || '', postes: m[5] === '1' };
    });
    // Classes en partage des séquences (2026-11-19, utilisateur, maquette C) : leurs plages et leurs noms
    // (#nova-seq-reglages, data-partage…). Comparées à celles de la classe par leur forme brute (« 3:cachee »).
    var brut = {}, partage = [];
    if (src) {
      (src.getAttribute('data-plages') || '').split(';').forEach(function (x) { var k = x.split(':')[0]; if (k) brut[k] = x; });
      var pc = (src.getAttribute('data-partage') || '').split(','), pp = (src.getAttribute('data-partage-plages') || '').split('|').slice(1),
        pn = (src.getAttribute('data-partage-noms') || '').split('|').slice(1);
      pc.forEach(function (c, i) {
        if (!c) return;
        var m = {};
        (pp[i] || '').split(';').forEach(function (x) { var k = x.split(':')[0]; if (k) m[k] = x; });
        partage.push({ classe: c, nom: (pn[i] || '').trim() || c, plages: m });
      });
    }
    var lirePlage = function (x) {
      var m = /^\d+:([a-z]+)(?:,(\d*),(\d*),(\d))?$/.exec(x || '');
      return m ? { mode: m[1], debut: m[2] || '', fin: m[3] || '', postes: m[4] === '1' } : null;
    };
    var nombre = function (k, n) { return n === 1 ? t(k + '-1') : t(k, n); };
    var chiffres = function (v) { return (v || '').replace(/\D/g, ''); };
    // Message d'envoi ; en cours : sablier qui tourne (2026-11-19, utilisateur), retiré pour une erreur.
    var annoncer = function (e, texte, enCours) { if (!e) return; e.textContent = texte; e.classList.toggle('nova-en-cours', !!enCours); };
    var maintenant = src ? chiffres(src.getAttribute('data-maintenant')).slice(0, 12) : '';
    // Plage recopiée dans les classes en partage après l'enregistrement de la page Modifier (#nova-seq-copie-fait).
    var copie = document.getElementById('nova-seq-copie-fait'), corps0 = document.querySelector('.wimsbody');
    if (copie && corps0) {
      var nbc = +(copie.getAttribute('data-partage') || 0), okc = copie.getAttribute('data-resultat') === 'ok';
      if (!okc || nbc > 0) {
        var msg = el('div', 'wims_msg ' + (okc ? 'success' : 'alert'), okc ? nombre('partage-fait', nbc) : t('plage-erreur'));
        msg.setAttribute('role', 'status');
        corps0.insertBefore(msg, corps0.firstChild);
      }
    }
    if (rg) barreReglages(cartes.length ? cartes[0] : null);
    if (rm) { modifierSequence(); return; }
    if (!cartes.length) return;
    var numero = function (d) { return +d.id.replace('wims_seq_', ''); };
    var plis = lire(clePlis, localStorage) || [];
    var menus = menusEtat(), occupe = false;

    // Date AAAAMMJJHHMM (heure du serveur) : objet Date local, et texte court (« 30 nov. », heure si elle compte).
    function enDate(v) { return new Date(+v.slice(0, 4), +v.slice(4, 6) - 1, +v.slice(6, 8), +v.slice(8, 10), +v.slice(10, 12)); }
    function texteDate(v, heureSansSens, jour, court) {
      var d = enDate(v), o = { day: 'numeric', month: 'short' };
      if (jour) o.weekday = 'short';
      if (v.slice(0, 4) !== maintenant.slice(0, 4)) o.year = 'numeric';
      var x;
      try { x = d.toLocaleDateString(racineLangue(), o); } catch (e) { x = d.toLocaleDateString(); }
      if (!court && v.slice(8, 12) !== heureSansSens) {
        try { x += ', ' + d.toLocaleTimeString(racineLangue(), { hour: 'numeric', minute: '2-digit' }); } catch (e) { /* sans heure */ }
      }
      return x;
    }
    // Ce que voient les élèves aujourd'hui : statut de WIMS (0 = désactivée), puis la plage (.S<n>).
    function vueEleves(etat, p) {
      var r = function (genre, icone, long, court, detail) { return { genre: genre, icone: icone, long: long, court: court || long, detail: detail || '' }; };
      if (etat !== 1) return r('neutre', 'pause', t('desactivee'));
      if (!p || p.mode === 'tous') return r('ok', 'coche', t('visible'));
      if (p.mode === 'cachee') return r('neutre', 'oeil-barre', t('cachee'));
      if (p.mode === 'technique') return r('attention', 'curseurs', t('technique'));
      var postes = p.postes ? t('postes') : '';
      if (!p.debut && !p.fin) return r('attention', 'ecran', t('postes'));
      if (p.debut && maintenant && maintenant < p.debut) return r('venir', 'horloge', t('a-venir', texteDate(p.debut, '0000', true)), t('des', texteDate(p.debut, '0000', false, true)), postes);
      if (p.fin && maintenant && maintenant > p.fin) return r('neutre', 'horloge', t('terminee', texteDate(p.fin, '2359')), t('terminee-court', texteDate(p.fin, '2359', false, true)), postes);
      if (p.fin) return r('ok', 'oeil', t('visible-jusqu', texteDate(p.fin, '2359')), t('jusqu', texteDate(p.fin, '2359', false, true)), postes);
      return r('ok', 'oeil', t('visible'), '', postes);
    }

    // Fenêtre « Affichage aux élèves » d'une séquence : toujours, jamais, entre deux dates (heure du serveur).
    var fenetre = null;
    // Classes en partage sous l'interrupteur (2026-11-19, utilisateur) : leurs noms à la suite ; celles dont l'affichage diffère
    // en orange, la différence dans une infobulle (survol, clavier ou toucher : data-ouvert). x.diff noté pour l'envoi.
    // ici (facultatif) : affichage de cette classe tel qu'il est en train d'être réglé (page Modifier) ; sinon celui enregistré.
    function classesPartage(n, etat, ici) {
      var brutIci = brut[n] || n + ':tous', liste = el('div', 'nova-seq-classes');
      partage.forEach(function (x) {
        var r = x.plages[n] || n + ':tous';
        x.diff = r !== brutIci;
        var c = el(x.diff ? 'button' : 'span', 'nova-seq-classe' + (x.diff ? ' nova-seq-classe-diff' : ''), x.nom);
        if (x.diff) {
          var detailler = function () {
            var la = vueEleves(etat, lirePlage(r)).long, moi = ici ? ici() : vueEleves(etat, lirePlage(brutIci)).long;
            var detail = t(la === moi ? 'partage-ecart-aligne' : 'partage-ecart', '%1').replace('%1', x.nom).replace('%2', la).replace('%3', moi);
            c.setAttribute('data-detail', detail);
            c.setAttribute('aria-label', detail);
          };
          detailler();
          c.type = 'button';
          c.addEventListener('mouseenter', detailler);
          c.addEventListener('focus', detailler);
          c.addEventListener('click', function () {
            detailler();
            var o = c.hasAttribute('data-ouvert');
            liste.querySelectorAll('[data-ouvert]').forEach(function (e) { e.removeAttribute('data-ouvert'); });
            if (!o) c.setAttribute('data-ouvert', '');
          });
          c.addEventListener('blur', function () { c.removeAttribute('data-ouvert'); });
        }
        liste.appendChild(c);
      });
      return liste;
    }

    function fenetrePlage(n, d, titre, modifier) {
      var p = plages[n] || { mode: 'tous', debut: '', fin: '', postes: false };
      if (fenetre) fenetre.remove();
      var f = fenetre = el('dialog', 'nova-dialogue nova-seq-plage');
      var h = el('h1', '', t('plage-titre'));
      h.id = 'nova-seq-plage-titre';
      f.setAttribute('aria-labelledby', h.id);
      f.appendChild(h);
      f.appendChild(el('p', 'nova-seq-plage-seq', titre));
      var form = el('form', 'nova-seq-plage-form');
      form.method = 'dialog';
      f.appendChild(form);
      var choix = el('div', 'nova-seq-plage-choix');
      form.appendChild(choix);
      // Postes seuls (sans dates) : « toujours » (les postes sont gardés à l'enregistrement).
      var actuel = p.mode === 'plage' && !p.debut && !p.fin ? 'tous' : p.mode;
      var radio = function (v, texte) {
        var l = el('label'), r = el('input');
        r.type = 'radio'; r.name = 'nova-seq-mode'; r.value = v;
        r.checked = v === actuel;
        l.appendChild(r); l.appendChild(document.createTextNode(' ' + texte));
        choix.appendChild(l);
        return r;
      };
      var rTous = radio('tous', t('toujours')), rCache = radio('cachee', t('jamais')), rPlage = radio('plage', t('entre'));
      var dates = el('div', 'nova-seq-plage-dates');
      var champ = function (type, val, lab) {
        var c = el('input'); c.type = type; if (val) c.value = val;
        c.setAttribute('aria-label', lab);
        if (type === 'date' && src) {
          var a = chiffres(src.getAttribute('data-creation')), b = chiffres(src.getAttribute('data-expiration'));
          if (a.length === 8) c.min = a.slice(0, 4) + '-' + a.slice(4, 6) + '-' + a.slice(6, 8);
          if (b.length === 8) c.max = b.slice(0, 4) + '-' + b.slice(4, 6) + '-' + b.slice(6, 8);
        }
        return c;
      };
      var iso = function (v) { return v ? v.slice(0, 4) + '-' + v.slice(4, 6) + '-' + v.slice(6, 8) : ''; };
      var hm = function (v, def) { return v ? v.slice(8, 10) + ':' + v.slice(10, 12) : def; };
      var dDeb = champ('date', iso(p.debut), t('du')), hDeb = champ('time', hm(p.debut, '00:00'), t('du'));
      var dFin = champ('date', iso(p.fin), t('au')), hFin = champ('time', hm(p.fin, '23:59'), t('au'));
      dates.appendChild(el('span', '', t('du'))); dates.appendChild(dDeb); dates.appendChild(hDeb);
      dates.appendChild(el('span', '', t('au'))); dates.appendChild(dFin); dates.appendChild(hFin);
      choix.appendChild(dates);
      var suivre = function () { [dDeb, hDeb, dFin, hFin].forEach(function (c) { c.disabled = !rPlage.checked; }); };
      [rTous, rCache, rPlage].forEach(function (r) { r.addEventListener('change', suivre); });
      [dDeb, dFin].forEach(function (c) { c.addEventListener('input', function () { if (c.value) { rPlage.checked = true; suivre(); } }); });
      // Classes en partage : interrupteur allumé à l'ouverture (2026-11-19, utilisateur ; case auparavant).
      var casePartage = null;
      if (partage.length && p.mode !== 'technique') {
        var bloc = el('div', 'nova-seq-plage-partage');
        var lp = el('label', 'nova-seq-inter');
        casePartage = el('input');
        casePartage.type = 'checkbox'; casePartage.checked = true; casePartage.id = 'nova-seq-plage-partage';
        casePartage.setAttribute('role', 'switch');
        lp.appendChild(casePartage);
        lp.appendChild(el('span', '', nombre('partage-case', partage.length)));
        bloc.appendChild(lp);
        var st = d && d.querySelector('h2 .wims_status');
        bloc.appendChild(classesPartage(n, st ? +((/wims_status_(\d)/.exec(st.className) || [])[1] || 0) : 1));
        form.appendChild(bloc);
      }
      var note = el('p', 'nova-seq-plage-note', t(p.mode === 'technique' ? 'technique-aide' : p.postes ? 'postes-garde' : 'avance'));
      form.appendChild(note);
      var erreur = el('p', 'nova-seq-plage-erreur');
      erreur.setAttribute('role', 'alert');
      form.appendChild(erreur);
      var boutons = el('div', 'wimscenter');
      var annuler = el('button', 'wims_button wims_secondary_button', t('annuler'));
      annuler.type = 'button';
      annuler.addEventListener('click', function () { f.close(); });
      boutons.appendChild(annuler);
      if (p.mode === 'technique') {
        [rTous, rCache, rPlage].forEach(function (r) { r.disabled = true; });
        if (modifier) { var m = el('a', 'wims_button', t('modifier')); m.href = modifier.href; boutons.appendChild(m); }
      } else {
        var ok = el('button', 'wims_button', t('enregistrer'));
        ok.type = 'submit';
        boutons.appendChild(ok);
      }
      form.appendChild(boutons);
      suivre();
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (p.mode === 'technique') return;
        var mode = rTous.checked ? 'tous' : rCache.checked ? 'cachee' : rPlage.checked ? 'plage' : '';
        if (!mode) return;
        var deb = '', fin = '';
        if (mode === 'plage') {
          if (dDeb.value) deb = chiffres(dDeb.value) + chiffres(hDeb.value || '00:00');
          if (dFin.value) fin = chiffres(dFin.value) + chiffres(hFin.value || '23:59');
          if (!deb && !fin) { erreur.textContent = t('date-manque'); return; }
          if (deb && fin && deb >= fin) { erreur.textContent = t('date-ordre'); return; }
        }
        f.close();
        enregistrerPlage(d, n, mode, deb, fin, !!(casePartage && casePartage.checked));
      });
      f.addEventListener('click', function (e) { if (e.target === f) f.close(); });
      document.body.appendChild(f);
      f.showModal();
      (choix.querySelector('input:checked') || rTous).focus();
    }
    /* Page Modifier d'une séquence, onglet Informations générales (2026-11-19, utilisateur, maquette
     * maquettes/sequence-modifier-2026-11-19.html) : UNE pastille comme dans la liste (statut + affichage aux élèves) ; son menu :
     * Activer ou Désactiver, puis les choix d'affichage de WIMS (tous, personne, dates ou postes, variable technique si la classe
     * en a). Restrictions SUR LA PAGE, sous la pastille (utilisateur, pas de fenêtre) : les champs de WIMS eux-mêmes (dates,
     * heures, adresses IP ; tableau de la variable technique), déplacés et restylés ; WIMS les montre ou les cache selon sa liste
     * (toggle_allowtype). Listes Statut et Affichage de WIMS masquées, gardées dans le formulaire : rien n'est enregistré avant
     * « Enregistrer ». Classes en partage : interrupteur allumé ; le champ nova_seq_partage=1 n'est envoyé que si l'affichage a
     * changé ou diffère d'une classe en partage (sinon modifier la description écraserait leur réglage) ; la plage enregistrée
     * par WIMS est recopiée par _widgets/sequences.phtml (la question « pour toutes les classes en partage » de WIMS, qui suit le
     * partage des feuilles, reste à Non, masquée). Description : éditeur à la hauteur du texte, comme un examen. */
    function modifierSequence() {
      var visible = document.getElementById('visible'), type = document.getElementById('allowtype');
      var titreSeq = document.getElementById('seq_title'), cadre = titreSeq && titreSeq.closest('fieldset');
      if (!visible || !type || !cadre || !visible.form) return;
      var form = visible.form, champ = function (id) { return document.getElementById(id); };
      // Numéro donné par le serveur : le lien « Modifier » de WIMS écrit « &+seq=N » et adresseNette raccourcit l'adresse.
      var numeroSeq = (rm && rm.getAttribute('data-seq')) || (/[?&]\+?seq=(\d+)/.exec(location.search) || [])[1] || '';
      var menus = menusEtat();
      var temps = champ('js_restricted_time'), techvar = champ('js_restricted_techvar');
      var CHAMPS = ['allowtype', 'begindscore', 'begintscore', 'enddscore', 'endtscore', 'IPscore', 'allowtechvar'];
      var releve = function () { return CHAMPS.map(function (id) { var c = champ(id); return c ? c.value : ''; }).join('|'); };
      var depart = releve();
      function plageForm() {
        if (type.value === 'all') return { mode: 'tous', debut: '', fin: '', postes: false };
        if (type.value === 'none') return { mode: 'cachee', debut: '', fin: '', postes: false };
        if (type.value === 'techvar') return { mode: 'technique', debut: '', fin: '', postes: false };
        var d1 = champ('begindscore'), h1 = champ('begintscore'), d2 = champ('enddscore'), h2 = champ('endtscore'), ip = champ('IPscore');
        return {
          mode: 'plage',
          debut: d1 && d1.value ? chiffres(d1.value) + chiffres((h1 && h1.value) || '00:00') : '',
          fin: d2 && d2.value ? chiffres(d2.value) + chiffres((h2 && h2.value) || '23:59') : '',
          postes: !!(ip && ip.value.trim())
        };
      }
      [visible.closest('.field') || visible.parentNode, type, form.querySelector('label[for="allowtype"]'),
        type.parentNode.querySelector('.wims_button_help'), form.querySelector('label[for="allowshare"]')].forEach(function (e) {
        if (!e) return;
        if (e.matches('label[for="allowshare"]')) e = e.parentNode;
        e.classList.add('nova-seq-masque');
      });
      var share = form.querySelector('select[name="allowshare"]');
      if (share) share.value = '0';

      var zone = el('div', 'nova-seq-modif-etat');
      var ligne = el('div', 'nova-seq-modif-ligne');
      var pastille = el('button', 'nova-etat nova-seq-etat');
      pastille.type = 'button';
      var menu = el('div', 'nova-etat-menu');
      menu.id = 'nova-seq-modif-menu';
      menu.setAttribute('role', 'menu');
      menu.hidden = true;
      var avis = el('p', 'nova-seq-modif-avis', t('a-enregistrer'));
      avis.hidden = true;
      ligne.appendChild(pastille);
      ligne.appendChild(avis);
      zone.appendChild(ligne);
      // Champs de WIMS sous la pastille : dates et IP (libellé des IP en clair), tableau de la variable technique.
      if (temps) {
        temps.classList.add('nova-seq-modif-temps');
        var lip = temps.querySelector('label[for="IPscore"]');
        if (lip) lip.textContent = t('postes-champ');
        zone.appendChild(temps);
      }
      if (techvar) { techvar.classList.add('nova-seq-modif-technique'); zone.appendChild(techvar); }
      // Interrupteur des classes en partage, et ce qu'elles montrent aujourd'hui.
      var inter = null;
      if (partage.length) {
        var bloc = el('div', 'nova-seq-plage-partage nova-seq-modif-partage');
        var lp = el('label', 'nova-seq-inter');
        inter = el('input');
        inter.type = 'checkbox'; inter.checked = true; inter.id = 'nova-seq-modif-partage';
        inter.setAttribute('role', 'switch');
        lp.appendChild(inter);
        lp.appendChild(el('span', '', nombre('partage-case', partage.length)));
        bloc.appendChild(lp);
        bloc.appendChild(classesPartage(numeroSeq, visible.value === '1' ? 1 : 0, function () {
          return vueEleves(visible.value === '1' ? 1 : 0, plageForm()).long;
        }));
        zone.appendChild(bloc);
      }
      cadre.classList.add('nova-fiche');
      var legende = cadre.querySelector(':scope > legend');
      cadre.insertBefore(zone, legende ? legende.nextSibling : cadre.firstChild);

      var item = function (texte, ico, effet, faire, coche) {
        var b = el('button', 'nova-etat-action');
        b.type = 'button';
        b.setAttribute('role', coche == null ? 'menuitem' : 'menuitemradio');
        if (coche != null) b.setAttribute('aria-checked', coche ? 'true' : 'false');
        b.setAttribute('tabindex', '-1');
        b.appendChild(icone(ico));
        var tt = el('span', 'nova-etat-texte', texte);
        if (effet) tt.appendChild(el('small', '', effet));
        b.appendChild(tt);
        b.addEventListener('click', function () { menus.fermer(false); faire(); });
        menu.appendChild(b);
      };
      var choisir = function (v) {
        return function () {
          if (type.value === v) return;
          type.value = v;
          // onchange de WIMS (toggle_allowtype) : montre ou cache les dates et le tableau de la variable technique.
          type.dispatchEvent(new Event('change', { bubbles: true }));
          suivre();
          var premier = v === 'select' && temps && temps.querySelector('input');
          if (premier) premier.focus();
        };
      };
      function dessiner() {
        var etat = visible.value === '1' ? 1 : 0, vu = vueEleves(etat, plageForm());
        pastille.className = 'nova-etat nova-seq-etat nova-etat-' + vu.genre;
        pastille.textContent = '';
        pastille.appendChild(icone(vu.icone));
        var nom = el('span', 'nova-etat-nom');
        nom.appendChild(el('span', 'nova-seq-long', vu.long));
        nom.appendChild(el('span', 'nova-seq-court', vu.court));
        pastille.appendChild(nom);
        pastille.title = vu.detail || '';
        pastille.appendChild(el('span', 'nova-etat-chevron'));
        menu.textContent = '';
        var commun = partage.length ? ' ' + nombre('partage-commun', partage.length) : '';
        if (etat === 1) item(t('b-desactiver'), 'oeil-barre', t('desactiver') + commun, function () { visible.value = '0'; suivre(); });
        else item(t('b-activer'), 'lecture', t('activer') + commun, function () { visible.value = '1'; suivre(); });
        var hr = el('hr'); hr.setAttribute('role', 'separator'); menu.appendChild(hr);
        item(t('toujours'), 'oeil', '', choisir('all'), type.value === 'all');
        item(t('jamais'), 'oeil-barre', '', choisir('none'), type.value === 'none');
        item(t('restreinte'), 'calendrier', '', choisir('select'), type.value === 'select');
        if (Array.prototype.some.call(type.options, function (x) { return x.value === 'techvar'; }))
          item(t('technique-choix'), 'curseurs', '', choisir('techvar'), type.value === 'techvar');
      }
      function suivre() { avis.hidden = releve() === depart && visible.value === visible.defaultValue; dessiner(); document.dispatchEvent(new Event('nova-seq-modifie')); }
      if (temps) { temps.addEventListener('input', suivre); temps.addEventListener('change', suivre); }
      menus.brancher(pastille, menu);
      dessiner();
      form.addEventListener('formdata', function (e) {
        if (share) e.formData.set('allowshare', '0');
        var diff = partage.some(function (x) { return x.diff; });
        if (inter && inter.checked && (releve() !== depart || diff)) e.formData.set('nova_seq_partage', '1');
      });
      contenuSequence(numeroSeq);
      enregistrerCollant(form);
      editeurAjuste('seq_desc');
      var desc = champ('seq_desc'), cd = desc && (desc.closest('.field') || desc.parentNode);
      var lab = cd && cd.querySelector('label[for="seq_desc"]'), aide = lab && lab.nextElementSibling;
      if (lab && aide && !aide.querySelector('textarea, iframe') && !aide.classList.contains('tox')) {
        var tete = el('div', 'nova-champ-tete');
        cd.insertBefore(tete, lab);
        tete.appendChild(lab);
        tete.appendChild(aide);
      }
    }

    /* Onglet « Contenu de la séquence » de la page Modifier (2026-11-19, utilisateur, maquette A
     * maquettes/sequence-contenu-2026-11-19.html) : deux listes au lieu du tableau de numéros de WIMS. « Dans la séquence »
     * (ordre : poignée à glisser sur ordinateur, flèches, ✕) et « Ressources de la classe » (recherche, filtres par type et
     * « Hors séquence », « + » ou glisser vers la séquence). État de chaque ressource en pastille, sans action (utilisateur),
     * avec un avertissement si les élèves ne la verront pas ; autres séquences de la ressource en étiquette
     * (#nova-seq-contenus). Le tableau de WIMS reste dans le formulaire, masqué : Nova y écrit les rangs (1, 2… ; 0 =
     * retirée) à chaque changement, « Enregistrer » envoie comme avant. */
    function contenuSequence(numeroSeq) {
      var boite = document.getElementById('seqliste'), table = boite && boite.querySelector('table');
      if (!table) return;
      var TYPES = { c: 'doc', doc: 'doc', sheet: 'sheet', exam: 'exam', vote: 'vote', tool: 'tool', glossary: 'glossary', freework: 'freework' };
      var ORDRE = ['sheet', 'exam', 'doc', 'freework', 'vote', 'tool', 'glossary'];
      var items = [];
      table.querySelectorAll('input[type="number"]').forEach(function (inp) {
        var m = /^([a-z]+)_(\d+)$/.exec(inp.name), tr = inp.closest('tr');
        if (!m || !TYPES[m[1]] || !tr) return;
        var cel = tr.querySelector('td'), st = tr.querySelector('td[class*="wims_status_"]');
        var lab = cel && (cel.querySelector('a') || cel);
        var etat = st ? +((/wims_status_(\d)/.exec(st.className) || [])[1] || 0) : 1;
        var texteEtat = '';
        if (st) st.childNodes.forEach(function (x) { if (x.nodeType === 3) texteEtat += x.textContent; });
        items.push({
          cle: m[1] + ' ' + m[2], type: TYPES[m[1]], champ: inp, etat: etat,
          titre: (lab ? lab.textContent : inp.name).replace(/\s+/g, ' ').trim(),
          texteEtat: propre(texteEtat.replace(/\+/g, ' + ')),
          cache: etat === 0 || (etat === 3 && /^(sheet|exam|freework|vote)$/.test(TYPES[m[1]])),
          rang: +inp.value || 0
        });
      });
      if (!items.length) return;
      // Autres séquences de chaque ressource.
      var sc = document.getElementById('nova-seq-contenus'), autres = {};
      var mot = sc ? (sc.getAttribute('data-mot') || '').trim() : '', numSeul = !!document.getElementById('nova-seq-numero');
      if (sc) (sc.getAttribute('data-contenus') || '').split(';').forEach(function (l) {
        var p = l.split('|');
        if (p.length < 3 || p[0] === String(numeroSeq)) return;
        var nomSeq = numSeul ? p[0] : mot ? mot + ' ' + p[0] : t('seq-n', p[0]);
        p[2].split(',').forEach(function (c) {
          c = c.trim();
          if (c) (autres[c] = autres[c] || []).push({ nom: nomSeq, titre: p[1] });
        });
      });
      var dans = items.filter(function (x) { return x.rang > 0; }).sort(function (a, b) { return a.rang - b.rang; });
      var depart = dans.map(function (x) { return x.cle; }).join(',');

      // Tableau de WIMS gardé, masqué.
      var cache = el('div', 'nova-seq-masque');
      while (boite.firstChild) cache.appendChild(boite.firstChild);
      var zone = el('div', 'nova-seq-contenu');
      boite.appendChild(zone);
      boite.appendChild(cache);

      var carte = function (titre) {
        var c = el('section', 'nova-seq-contenu-carte'), tete = el('div', 'nova-seq-contenu-tete');
        tete.appendChild(el('h3', '', titre));
        var compte = el('span', 'nova-seq-contenu-compte');
        tete.appendChild(compte);
        c.appendChild(tete);
        zone.appendChild(c);
        return { carte: c, tete: tete, compte: compte };
      };
      var gauche = carte(t('contenu-dans')), droite = carte(t('contenu-classe'));
      var avis = el('p', 'nova-seq-modif-avis', t('a-enregistrer'));
      avis.hidden = true;
      gauche.tete.appendChild(avis);
      var listeDans = el('ol', 'nova-seq-contenu-liste');
      listeDans.setAttribute('aria-label', t('contenu-dans'));
      gauche.carte.appendChild(listeDans);
      var recherche = el('input', 'nova-seq-contenu-recherche');
      recherche.type = 'search';
      recherche.placeholder = t('contenu-chercher');
      recherche.setAttribute('aria-label', t('contenu-chercher'));
      droite.carte.appendChild(recherche);
      var puces = el('div', 'nova-seq-contenu-filtres');
      puces.setAttribute('role', 'group');
      droite.carte.appendChild(puces);
      var filtre = 'tout';
      var filtres = ['tout'].concat(ORDRE.filter(function (ty) { return items.some(function (x) { return x.type === ty; }); }), ['hors']);
      if (filtres.length === 3) filtres.splice(1, 1);
      filtres.forEach(function (f) {
        var b = el('button', 'nova-seq-contenu-filtre', t(f === 'tout' ? 'contenu-tout' : f === 'hors' ? 'contenu-hors' : 'type-' + f));
        b.type = 'button';
        b.setAttribute('aria-pressed', f === filtre ? 'true' : 'false');
        b.addEventListener('click', function () {
          filtre = f;
          puces.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          dessiner();
        });
        puces.appendChild(b);
      });
      var listeClasse = el('ul', 'nova-seq-contenu-liste');
      listeClasse.setAttribute('aria-label', t('contenu-classe'));
      droite.carte.appendChild(listeClasse);
      var annonce = el('p', 'nova-seq-contenu-annonce');
      annonce.setAttribute('role', 'status');
      zone.appendChild(annonce);

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
      var glisse = null;
      function ligne(x, i, dansSeq) {
        var li = el('li', 'nova-seq-ress' + (x.cache ? ' nova-seq-ress-cachee' : '') + (!dansSeq && dans.indexOf(x) >= 0 ? ' nova-seq-ress-deja' : ''));
        li.setAttribute('data-type', x.type);
        li.setAttribute('data-cle', x.cle);
        var poignee = el('span', 'nova-seq-ress-poignee');
        poignee.appendChild(icone('poignee'));
        poignee.title = t('glisser');
        li.appendChild(poignee);
        var corps = el('span', 'nova-seq-ress-corps');
        corps.appendChild(el('span', 'nova-seq-ress-titre', x.titre));
        var info = el('span', 'nova-seq-ress-info');
        if (x.texteEtat) info.appendChild(el('span', 'nova-seq-ress-etat nova-seq-ress-etat-' + (x.cache ? 'cache' : x.etat === 2 ? 'expire' : 'ok'), x.texteEtat));
        if (x.cache && (dansSeq || dans.indexOf(x) < 0)) info.appendChild(el('span', 'nova-seq-ress-alerte', t('contenu-invisible')));
        (autres[x.cle] || []).forEach(function (a) { var e = el('span', 'nova-seq-ress-autre', a.nom); e.title = a.titre; info.appendChild(e); });
        if (!dansSeq && dans.indexOf(x) >= 0) info.appendChild(el('span', 'nova-seq-ress-autre', t('contenu-deja')));
        corps.appendChild(info);
        li.appendChild(corps);
        var actions = el('span', 'nova-seq-ress-actions');
        if (dansSeq) {
          actions.appendChild(bouton('fleche-haut', t('monter'), function () { deplacer(x, -1); }, i === 0));
          actions.appendChild(bouton('fleche-bas', t('descendre'), function () { deplacer(x, 1); }, i === dans.length - 1));
          actions.appendChild(bouton('corbeille', t('contenu-retirer'), function () { retirer(x); }));
        } else if (dans.indexOf(x) >= 0) {
          actions.appendChild(bouton('coche', t('contenu-deja'), null, true));
        } else {
          actions.appendChild(bouton('plus', t('contenu-ajouter'), function () { ajouter(x, dans.length); }));
        }
        li.appendChild(actions);
        // Glisser (souris) : depuis les deux listes, déposé dans « Dans la séquence ».
        if (dansSeq || dans.indexOf(x) < 0) {
          li.draggable = true;
          li.addEventListener('dragstart', function (ev) {
            glisse = x;
            ev.dataTransfer.effectAllowed = 'move';
            try { ev.dataTransfer.setData('text/plain', x.titre); } catch (e) { }
            li.classList.add('nova-seq-ress-glissee');
          });
          li.addEventListener('dragend', function () { glisse = null; li.classList.remove('nova-seq-ress-glissee'); marque(-1); });
        }
        return li;
      }
      // Place visée dans « Dans la séquence » : avant la ligne dont le milieu est sous le pointeur.
      function rangVise(y) {
        var lis = listeDans.querySelectorAll(':scope > li.nova-seq-ress'), k = lis.length;
        for (var j = 0; j < lis.length; j++) { var r = lis[j].getBoundingClientRect(); if (y < r.top + r.height / 2) { k = j; break; } }
        return k;
      }
      function marque(k) {
        listeDans.querySelectorAll('.nova-seq-ress-vise-avant, .nova-seq-ress-vise-apres').forEach(function (e) { e.classList.remove('nova-seq-ress-vise-avant', 'nova-seq-ress-vise-apres'); });
        listeDans.classList.toggle('nova-seq-contenu-cible', k >= 0);
        if (k < 0) return;
        var lis = listeDans.querySelectorAll(':scope > li.nova-seq-ress');
        if (k < lis.length) lis[k].classList.add('nova-seq-ress-vise-avant');
        else if (lis.length) lis[lis.length - 1].classList.add('nova-seq-ress-vise-apres');
      }
      listeDans.addEventListener('dragover', function (ev) { if (!glisse) return; ev.preventDefault(); marque(rangVise(ev.clientY)); });
      listeDans.addEventListener('dragleave', function (ev) { if (!listeDans.contains(ev.relatedTarget)) marque(-1); });
      listeDans.addEventListener('drop', function (ev) {
        if (!glisse) return;
        ev.preventDefault();
        var x = glisse, k = rangVise(ev.clientY), i = dans.indexOf(x);
        marque(-1);
        if (i >= 0) { dans.splice(i, 1); if (i < k) k--; }
        ajouter(x, k, true);
      });

      function changer(texte, focus) {
        dans.forEach(function (x, i) { x.champ.value = String(i + 1); });
        // 0, pas vide : WIMS (addseq.proc) aligne les valeurs sur la liste des champs, une valeur vide la décale.
        items.forEach(function (x) { if (dans.indexOf(x) < 0) x.champ.value = '0'; });
        avis.hidden = dans.map(function (x) { return x.cle; }).join(',') === depart;
        document.dispatchEvent(new Event('nova-seq-modifie'));
        dessiner();
        if (texte) annonce.textContent = texte;
        if (focus) { var b = focus(); if (b) b.focus(); }
      }
      var chercher = function (liste, x, sel) { var li = liste.querySelector('li[data-cle="' + x.cle + '"]'); return li && li.querySelector(sel); };
      function ajouter(x, k, deja) {
        if (!deja && dans.indexOf(x) >= 0) return;
        dans.splice(Math.max(0, Math.min(k, dans.length)), 0, x);
        changer(t('contenu-ajoute').replace('%1', x.titre));
      }
      function retirer(x) {
        var i = dans.indexOf(x);
        if (i < 0) return;
        dans.splice(i, 1);
        changer(t('contenu-retire').replace('%1', x.titre), function () {
          var suivant = dans[Math.min(i, dans.length - 1)];
          return suivant ? chercher(listeDans, suivant, '.nova-seq-contenu-btn:last-child') : recherche;
        });
      }
      function deplacer(x, d) {
        var i = dans.indexOf(x), j = i + d;
        if (i < 0 || j < 0 || j >= dans.length) return;
        dans.splice(i, 1);
        dans.splice(j, 0, x);
        changer(t('contenu-place').replace('%1', x.titre).replace('%2', j + 1), function () {
          return chercher(listeDans, x, '.nova-seq-contenu-btn:not(:disabled)' + (d < 0 && j > 0 ? '' : d > 0 && j < dans.length - 1 ? ':nth-child(2)' : ''));
        });
      }
      function dessiner() {
        listeDans.textContent = '';
        dans.forEach(function (x, i) { listeDans.appendChild(ligne(x, i, true)); });
        var vide = el('li', 'nova-seq-contenu-vide' + (dans.length ? ' nova-seq-contenu-deposer' : ''), t(dans.length ? 'contenu-deposer' : 'contenu-vide'));
        listeDans.appendChild(vide);
        gauche.compte.textContent = nombre('contenu-compte', dans.length);
        var q = recherche.value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        var vus = items.filter(function (x) {
          if (filtre === 'hors' && (dans.indexOf(x) >= 0 || autres[x.cle])) return false;
          if (filtre !== 'tout' && filtre !== 'hors' && x.type !== filtre) return false;
          return !q || x.titre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').indexOf(q) >= 0;
        });
        listeClasse.textContent = '';
        vus.forEach(function (x, i) { listeClasse.appendChild(ligne(x, i, false)); });
        if (!vus.length) listeClasse.appendChild(el('li', 'nova-seq-contenu-vide', t('contenu-aucun')));
        droite.compte.textContent = nombre('contenu-compte', items.length);
      }
      recherche.addEventListener('input', dessiner);
      dessiner();
    }

    /* « Enregistrer » de la page Modifier d'une séquence (2026-11-19, utilisateur : « tout en bas, peu visible ») : barre
     * collante (barreEnregistrer) ; « Modifié : pensez à enregistrer » dès qu'un onglet a changé (évènement nova-seq-modifie). */
    function enregistrerCollant(form) {
      var bouton = form.querySelector('input[type="submit"][name="save"]'), bloc = bouton && bouton.parentNode;
      if (!bloc || bloc === form) return;
      var regler = barreEnregistrer(bloc, form, t('a-enregistrer'));
      // Titre, description, champs de WIMS (2026-11-19, utilisateur : « je ne vois pas le texte » après avoir changé le titre ou la
      // description) : tout changement compte, sauf la recherche et les filtres de l'onglet Contenu et l'interrupteur des classes
      // en partage (le contenu et l'affichage ont leur propre avis). Description sous TinyMCE : éditeur « sale » (isDirty).
      var touche = false;
      var marquer = function () { if (touche) return; touche = true; document.dispatchEvent(new Event('nova-seq-modifie')); };
      var surChamp = function (e) { if (!e.target.closest('.nova-seq-contenu, .nova-seq-modif-partage')) marquer(); };
      form.addEventListener('input', surChamp);
      form.addEventListener('change', surChamp);
      var suivreEditeur = function (ed) {
        if (!ed || ed.id !== 'seq_desc') return;
        ed.on('input change undo redo ExecCommand', function () { if (ed.isDirty()) marquer(); });
      };
      if (window.tinymce && typeof window.tinymce.on === 'function') {
        window.tinymce.on('AddEditor', function (e) { suivreEditeur(e.editor); });
        if (window.tinymce.get) suivreEditeur(window.tinymce.get('seq_desc'));
      }
      document.addEventListener('nova-seq-modifie', function () {
        regler(touche || Array.prototype.some.call(document.querySelectorAll('.wimsbody .nova-seq-modif-avis'), function (a) { return !a.hidden; }));
      });
    }

    function enregistrerPlage(d, n, mode, deb, fin, aussiPartage) {
      occupe = true;
      document.documentElement.classList.add('nova-occupe');
      annoncer(etatEnvoi, t('enregistrement'), true);
      var debut = Date.now();
      var relire = function (attente) {
        setTimeout(function () { location.href = lienSession('&cmd=new&module=adm%2Fclass%2Fsequence&job=show'); }, attente);
      };
      fetch(lienSession('&cmd=new&module=adm%2Fclass%2Fsequence&job=show&nova_seq_plage=' + n + '&nova_seq_mode=' + mode +
        '&nova_seq_debut=' + deb + '&nova_seq_fin=' + fin + (aussiPartage ? '&nova_seq_partage=1' : '')), { credentials: 'same-origin' })
        .then(function (r) { return r.text(); })
        .then(function (texte) {
          if (!/id="nova-seq-plage-fait"[^>]*data-resultat="ok"/.test(texte)) throw new Error('refus');
          var ecrites = /id="nova-seq-plage-fait"[^>]*data-partage="(\d+)"/.exec(texte);
          if (aussiPartage && ecrites && +ecrites[1] > 0) {
            try { sessionStorage.setItem('nova-message', JSON.stringify({ texte: nombre('partage-fait', +ecrites[1]), etat: '', quand: Date.now() })); } catch (e) { /* message perdu */ }
          }
          garderVue(d, n);
          relire(Math.max(0, 1500 - (Date.now() - debut)));
        })
        .catch(function () {
          annoncer(etatEnvoi, t('plage-erreur'));
          relire(2500);
        });
    }

    // Barre de réglages au-dessus de la liste (variante A) : présentation en séquences, mot générique, numéro seul,
    // Ajouter une séquence. Enregistrement : formulaire Configurer de WIMS lu en arrière-plan, recopié ici, envoyé.
    function barreReglages(avant) {
      var corps = document.querySelector('.wimsbody');
      if (!corps) return;
      var barre = el('div', 'nova-seq-reglages');
      var inter = el('label', 'nova-seq-inter');
      var c = el('input');
      c.type = 'checkbox'; c.id = 'nova-seq-ouvert'; c.setAttribute('role', 'switch');
      c.checked = rg.getAttribute('data-ouvert') === 'yes';
      inter.appendChild(c);
      inter.appendChild(el('span', '', t('ouvert')));
      barre.appendChild(inter);
      var mot = el('span', 'nova-seq-mot');
      var lm = el('label', '', t('mot'));
      lm.htmlFor = 'nova-seq-mot';
      var champ = el('input');
      champ.type = 'text'; champ.id = 'nova-seq-mot'; champ.maxLength = 50;
      champ.value = rg.getAttribute('data-mot') || '';
      var seul = !!document.getElementById('nova-seq-numero');
      var ln = el('label', 'nova-seq-num-choix');
      var cn = el('input');
      cn.type = 'checkbox'; cn.id = 'nova-seq-num-seul'; cn.checked = seul;
      ln.appendChild(cn);
      ln.appendChild(document.createTextNode(' ' + t('numero-court')));
      champ.readOnly = seul;
      mot.appendChild(lm); mot.appendChild(champ); mot.appendChild(ln);
      barre.appendChild(mot);
      var lienAjout = document.querySelector('#wimsmenumodubox a[href*="job=addseq"]');
      var ajout = el('a', 'wims_button nova-seq-ajouter', t('ajouter'));
      ajout.href = lienAjout ? lienAjout.href : lienSession('&cmd=renew&module=adm%2Fclass%2Fsequence&job=addseq');
      ajout.insertBefore(icone('plus'), ajout.firstChild);
      barre.appendChild(ajout);
      var alerte = el('div', 'nova-seq-alerte');
      alerte.setAttribute('role', 'status');
      alerte.appendChild(icone('oeil-barre'));
      alerte.appendChild(el('p', '', t('ouvert-non')));
      var etat = el('p', 'nova-seq-reglages-envoi');
      etat.setAttribute('role', 'status');
      var suivre = function () {
        alerte.hidden = c.checked;
        document.documentElement.classList.toggle('nova-seq-eteint', !c.checked);
      };
      suivre();
      if (avant) avant.parentNode.insertBefore(barre, avant);
      else {
        var x = corps.querySelector('#wims_class');
        var y = x ? x.nextElementSibling : null;
        if (y) y.parentNode.insertBefore(barre, y); else if (x) x.parentNode.appendChild(barre); else corps.appendChild(barre);
      }
      barre.parentNode.insertBefore(etat, barre.nextSibling);
      barre.parentNode.insertBefore(alerte, etat.nextSibling);

      var envoi = false;
      function envoyer() {
        if (envoi || !window.fetch || !window.TextDecoder || !window.DOMParser) return;
        envoi = true;
        [c, champ, cn].forEach(function (x) { x.disabled = true; });
        annoncer(etat, t('enregistrement'), true);
        var debut = Date.now();
        var echec = function () {
          annoncer(etat, t('reglage-erreur'));
          setTimeout(function () { location.href = lienSession('&cmd=new&module=adm%2Fclass%2Fsequence&job=show'); }, 2500);
        };
        fetch(lienSession('&cmd=new&module=adm%2Fclass%2Fsequence&job=config'), { credentials: 'same-origin' })
          .then(function (r) { return r.arrayBuffer(); })
          .then(function (buf) {
            var doc = new DOMParser().parseFromString(new TextDecoder('windows-1252').decode(buf), 'text/html');
            var t0 = doc.querySelector('input[name="seq_Title"]'), f0 = t0 && t0.closest('form');
            if (!f0) throw new Error('formulaire');
            var f = document.createElement('form');
            f.method = 'get';
            f.action = f0.getAttribute('action') || 'wims.cgi';
            f.hidden = true;
            var ajouter = function (nom, val) { var i = document.createElement('input'); i.type = 'hidden'; i.name = nom; i.value = val; f.appendChild(i); };
            Array.prototype.forEach.call(f0.elements, function (x) {
              if (!x.name || x.name === 'seq_abandon' || x.name === 'seq_set' || x.name === 'nova_seq_numero') return;
              if ((x.type === 'radio' || x.type === 'checkbox') && !x.checked) return;
              if (x.type === 'submit' || x.type === 'button') return;
              if (x.name === 'seq_open' || x.name === 'seq_Title') return;
              ajouter(x.name, x.value);
            });
            ajouter('seq_open', c.checked ? 'yes' : 'no');
            ajouter('seq_Title', champ.value.trim() || (rg.getAttribute('data-mot') || ''));
            ajouter('seq_set', '1');
            ajouter('nova_seq_numero', cn.checked ? 'oui' : 'non');
            // WIMS répond par la page Configurer : envoi dans un cadre caché, puis la liste est relue.
            var cadre = document.createElement('iframe');
            cadre.name = 'nova-seq-cadre';
            cadre.hidden = true;
            cadre.setAttribute('aria-hidden', 'true');
            document.body.appendChild(cadre);
            f.target = cadre.name;
            document.body.appendChild(f);
            // Écouteur posé à l'envoi : un cadre vide signale déjà un « load » en entrant dans la page.
            setTimeout(function () {
              cadre.addEventListener('load', function () {
                setTimeout(function () { location.href = lienSession('&cmd=new&module=adm%2Fclass%2Fsequence&job=show'); }, 1500);
              });
              f.submit();
            }, Math.max(0, 1500 - (Date.now() - debut)));
          })
          .catch(echec);
      }
      c.addEventListener('change', function () { suivre(); envoyer(); });
      champ.addEventListener('change', envoyer);
      champ.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); champ.blur(); } });
      cn.addEventListener('change', function () { champ.readOnly = cn.checked; envoyer(); });
    }

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
        var vu = vueEleves(etat, plages[n]);
        // Invisible aux eleves aujourd'hui (desactivee, cachee, terminee, a venir) : carte grisee comme l'affichage en sequences coupe.
        if (vu.genre === 'neutre' || vu.genre === 'venir') d.classList.add('nova-seq-invisible');
        var pastille = el(bascule || effacer || rg ? 'button' : 'span', 'nova-etat nova-seq-etat nova-etat-' + vu.genre);
        pastille.appendChild(icone(vu.icone));
        var nom = el('span', 'nova-etat-nom');
        nom.appendChild(el('span', 'nova-seq-long', vu.long));
        nom.appendChild(el('span', 'nova-seq-court', vu.court));
        pastille.appendChild(nom);
        if (vu.detail) pastille.title = vu.detail;
        // Affichage différent dans des classes en partage : marque « ≠ k » (2026-11-19, utilisateur, maquette C).
        var differentes = partage.filter(function (x) { return (x.plages[n] || n + ':tous') !== (brut[n] || n + ':tous'); });
        if (differentes.length) {
          var diff = el('span', 'nova-seq-diff', '\u2260 ' + differentes.length);
          diff.title = nombre('partage-diff', differentes.length);
          diff.setAttribute('aria-label', diff.title);
          pastille.appendChild(diff);
        }
        statut.parentNode.removeChild(statut);
        tete.appendChild(pastille);
        if (bascule || effacer || rg) {
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
          if (partage.length) {
            var detail = el('div', 'nova-seq-partage-etat');
            detail.setAttribute('role', 'none');
            detail.appendChild(el('b', '', t('partage-titre')));
            partage.forEach(function (x) {
              var r = x.plages[n] || n + ':tous', ligne = el('span', '', x.nom + ' : ');
              if (r === (brut[n] || n + ':tous')) ligne.appendChild(document.createTextNode(t('partage-pareil')));
              else ligne.appendChild(el('strong', '', vueEleves(etat, lirePlage(r)).long));
              detail.appendChild(ligne);
            });
            menu.appendChild(detail);
            var hr0 = el('hr'); hr0.setAttribute('role', 'separator'); menu.appendChild(hr0);
          }
          if (bascule) {
            var activer = /[?&]option=1/.test(bascule.getAttribute('href'));
            // Statut dans seq/, commun aux classes en partage : le dire (2026-11-19).
            action(bascule, activer ? 'lecture' : 'oeil-barre', t(activer ? 'activer' : 'desactiver') + (partage.length ? ' ' + nombre('partage-commun', partage.length) : ''));
          }
          if (rg) {
            var b = el('button', '', t('affichage'));
            b.type = 'button';
            action(b, 'calendrier', t('affichage-effet'));
            (function (seq, d0, ttr, mod) {
              b.addEventListener('click', function () { menus.fermer(false); fenetrePlage(seq, d0, ttr, mod); });
            })(n, d, titre, modifier);
          }
          if ((bascule || rg) && effacer) { var hr = el('hr'); hr.setAttribute('role', 'separator'); menu.appendChild(hr); }
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
      annoncer(etatEnvoi, t('enregistrement'), true);
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
          annoncer(etatEnvoi, t('erreur'));
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

