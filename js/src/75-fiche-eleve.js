
  /* ===== js/src/75-fiche-eleve.js : fiche d'un eleve (Proprietes du compte) ===== */

  /* Fiche d'un eleve, « Proprietes du compte » (adm/class/usermanage, job=userprop ; 2026-11-26, utilisateur, maquettes A
   * et 1 de maquettes/proprietes-compte-2026-11-26.html). Trois cartes DANS le formulaire de WIMS (rien n'en sort, l'envoi
   * ne change pas) :
   * - identite : photo (#userlogo) ou initiales, nom, puis les champs de WIMS sans saisie qui precedent les autres
   *   (identifiant, mot de passe, derniere connexion ; vide a la racine d'une structure : masquee) ;
   * - classes : listes de WIMS sans case a cocher (acces d'eleve) en pastilles, teinte et icone de la zone ;
   * - informations : le reste, champs simples (un libelle, une saisie) sur deux colonnes a partir de 640 px.
   * Reglage std notes-enseignant : page de WIMS, seul le bouton d'inscription est ajoute. Textes : #nova-ic-textes
   * (lang/enseignant-textes, etiquette inscription, lu par tail.phtml). Inscription : #nova-inscription (widget
   * inscription-classes, racine d'un portail ou d'un groupement), voir inscriptionDialogue. */
  function ficheEleve() {
    var job = document.querySelector('.wimsbody form input[name="job"][value="userprop"]');
    var fs = job && job.form && job.form.querySelector('fieldset.property_fields');
    if (!fs || fs.classList.contains('nova-pe') || fs.hasAttribute('data-nova-ic')) return;
    var tx = document.getElementById('nova-ic-textes');
    var t = function (k, defaut) { return (tx && tx.getAttribute('data-' + k)) || defaut; };
    var ic = document.getElementById('nova-inscription');
    var el = function (tag, classe, contenu) {
      var e = document.createElement(tag);
      if (classe) e.className = classe;
      if (contenu !== undefined && contenu !== null) e.textContent = contenu;
      return e;
    };
    var login = (job.form.querySelector('input[name="getuser"]') || {}).value || '';
    var valeur = function (n) { var c = job.form.querySelector('input[name="' + n + '"]'); return c ? c.value.trim() : ''; };
    var prenom = valeur('up_firstname'), nom = valeur('up_lastname');
    var nomEleve = (prenom + ' ' + nom).trim() || login;
    var saisie = function (c) { return c.querySelector('input:not([type="hidden"]), select, textarea'); };
    var estListe = function (c) { return c.matches('.field') && c.querySelector('ul') && !saisie(c); };
    var listes = Array.prototype.filter.call(fs.children, estListe);
    var participe = listes[0] || null;

    // Session et compteur de la page (champ du formulaire) : chaque requete suivante a son propre compteur.
    var sesChamp = (job.form.querySelector('input[name="session"]') || {}).value || '';
    var session = sesChamp.split('.')[0], compteur = parseInt(sesChamp.split('.')[1], 10) || 1;
    var adresse = function (suite) { compteur++; return 'wims.cgi?session=' + encodeURIComponent(session) + '.' + compteur + '&lang=' + encodeURIComponent(racineLangue()) + suite; };
    var pause = function () { return new Promise(function (r) { setTimeout(r, 1600); }); };  // 2 requetes a moins d'1 s : la 2e est mal servie
    /* « Effacer le participant » du menu (job=delprep : page de confirmation de WIMS), repris en bouton sur la fiche
     * (2026-11-26, utilisateur) avec un libelle selon le contexte (#nova-fiche-contexte, tail.phtml) : racine d'une
     * structure = supprimer le compte (scripts/adm/class/deluser le met de cote, inscriptions gardees) ; classe ou cours
     * d'une structure = desinscrire, le compte reste ; classe seule = desinscrire (compte mis de cote avec ses notes).
     * L'entree du menu prend le meme libelle, sauf reglage std textes. */
    var contexte = (document.getElementById('nova-fiche-contexte') || { getAttribute: function () { return ''; } }).getAttribute('data-contexte') || '';
    var lienEffacer = document.querySelector('a[href*="job=delprep"]');
    var cleEffacer = contexte === 'racine' ? 'racine' : contexte === 'cours' ? 'cours' : 'classe';
    if (lienEffacer && contexte && !standard('textes') && t('menu-' + cleEffacer, '')) {
      var marche = document.createTreeWalker(lienEffacer, NodeFilter.SHOW_TEXT), dernier = null;
      for (var n = marche.nextNode(); n; n = marche.nextNode()) if (n.nodeValue.trim()) dernier = n;
      if (dernier) dernier.nodeValue = t('menu-' + cleEffacer, '');
    }
    function zoneEffacer() {
      if (!lienEffacer || !contexte || !t('effacer-' + cleEffacer, '')) return null;
      var z = el('div', 'nova-pe-effacer');
      var a = el('a', 'wims_button wims_warning', t('effacer-' + cleEffacer, ''));
      a.href = lienEffacer.href;
      a.setAttribute('role', 'button');
      z.appendChild(a);
      z.appendChild(el('p', 'nova-pe-effacer-note', t('note-' + (contexte === 'seule' ? 'seule' : cleEffacer), '')));
      return z;
    }

    if (standard('notes-enseignant')) {
      fs.setAttribute('data-nova-ic', '');
      var zs = zoneEffacer();
      if (zs) { zs.classList.add('field', 'box'); fs.insertBefore(zs, fs.querySelector(':scope > .wimsform')); }
      if (!ic) return;
      if (!participe) {
        participe = el('div', 'field box');
        participe.appendChild(el('strong', '', t('classes', 'Classes')));
        var premier = fs.querySelector(':scope > .field');
        fs.insertBefore(participe, premier ? premier.nextSibling : null);
      }
      participe.appendChild(boutonInscrire());
      return;
    }

    fs.classList.add('nova-pe');
    var identite = el('div', 'nova-pe-carte nova-pe-identite');
    var tete = el('div', 'nova-pe-tete');
    var rond = el('span', 'nova-pe-rond');
    var photo = document.querySelector('#userlogo img');
    if (photo) {
      var cadrePhoto = photo.closest('#userlogo');
      rond.appendChild(photo);
      rond.classList.add('nova-pe-photo');
      if (cadrePhoto && !cadrePhoto.querySelector('img')) cadrePhoto.hidden = true;
    } else {
      rond.textContent = ((prenom.charAt(0) || '') + (nom.charAt(0) || '')).toUpperCase() || login.charAt(0).toUpperCase();
      rond.setAttribute('aria-hidden', 'true');
    }
    tete.appendChild(rond);
    tete.appendChild(el('h2', 'nova-pe-nom', nomEleve));
    identite.appendChild(tete);
    var meta = el('div', 'nova-pe-meta');
    identite.appendChild(meta);
    var zoneEff = zoneEffacer();
    if (zoneEff) identite.appendChild(zoneEff);

    var classes = null, zonesUl = null;
    if (listes.length || ic) {
      classes = el('div', 'nova-pe-carte nova-pe-classes');
      var ligne = el('div', 'nova-pe-titre-ligne');
      ligne.appendChild(el('h2', 'nova-pe-titre', t('classes', 'Classes')));
      if (ic) ligne.appendChild(boutonInscrire());
      classes.appendChild(ligne);
    }
    var infos = el('div', 'nova-pe-carte nova-pe-infos');
    infos.appendChild(el('h2', 'nova-pe-titre', t('informations', 'Details')));
    var grille = el('div', 'nova-pe-grille');
    infos.appendChild(grille);

    var avant = true;
    Array.prototype.slice.call(fs.children).forEach(function (c) {
      if (c.tagName === 'LEGEND') return;
      if (estListe(c)) {
        c.classList.add('nova-pe-liste');
        if (listes.length === 1) c.classList.add('nova-pe-liste-seule');
        var ul = c.querySelector('ul');
        ul.classList.add('nova-pe-zones');
        Array.prototype.forEach.call(ul.children, function (li) {
          if (!/(^|\s)wims_classes_direct_/.test(li.className)) li.classList.add('wims_classes_direct_class');
          li.textContent = li.textContent.trim();
        });
        if (c === participe) zonesUl = ul;
        classes.appendChild(c);
        return;
      }
      if (avant && !saisie(c)) {
        var lib = c.querySelector('strong, label');
        if (c.matches('.field') && !c.querySelector('a, img, span') && (!lib || c.textContent.trim() === lib.textContent.trim())) c.classList.add('nova-pe-vide');
        meta.appendChild(c);
        return;
      }
      avant = false;
      var cmd = c.querySelectorAll('input:not([type="hidden"]), select, textarea');
      if (c.matches('.field') && cmd.length === 1 && !c.querySelector('.formHelp, a, br, ul') &&
          (cmd[0].tagName === 'SELECT' || /^(text|email|url|number|tel|)$/.test(cmd[0].getAttribute('type') || ''))) c.classList.add('nova-pe-demi');
      grille.appendChild(c);
    });
    if (ic && !zonesUl) {
      zonesUl = el('ul', 'nova-pe-zones');
      zonesUl.appendChild(el('li', 'nova-pe-aucune', t('aucune', 'No class yet.')));
      classes.appendChild(zonesUl);
    }
    fs.appendChild(identite);
    if (classes) fs.appendChild(classes);
    fs.appendChild(infos);

    if (ic && zonesUl) {
      var inscrit = (ic.getAttribute('data-inscrit') || '').split(',').filter(Boolean);
      var nouvelles = [];
      try { nouvelles = JSON.parse(sessionStorage.getItem('nova-ic-nouvelles') || '[]'); sessionStorage.removeItem('nova-ic-nouvelles'); } catch (e) { /* stockage refuse */ }
      Array.prototype.forEach.call(zonesUl.querySelectorAll(':scope > li:not(.nova-pe-aucune)'), function (li, i) {
        var zone = inscrit[i];
        if (!zone) return;
        li.setAttribute('data-zone', zone);
        if (nouvelles.indexOf(zone) >= 0) li.classList.add('nova-pe-nouvelle');
        // Retirer d'une classe : groupement seulement (Gestion des inscriptions de WIMS ; rien de tel a la racine d'un portail).
        if (ic.getAttribute('data-structure') !== '2') return;
        var x = el('button', 'nova-pe-retirer', '\u00d7');
        x.type = 'button';
        x.setAttribute('aria-label', t('retirer', 'Remove from %1').replace('%1', li.textContent));
        x.title = x.getAttribute('aria-label');
        x.addEventListener('click', function () { retraitDialogue(zone, li.firstChild ? li.firstChild.nodeValue : li.textContent); });
        li.appendChild(x);
      });
    }

    function boutonInscrire() {
      var b = el('button', 'wims_button nova-pe-inscrire', t('inscrire', 'Enrol in a class'));
      b.type = 'button';
      b.addEventListener('click', inscriptionDialogue);
      return b;
    }

    /* Fenetre d'inscription : classes de la structure (portail : rangees par niveau), celles de l'eleve cochees et
     * grisees, recherche sans accents. */
    function inscriptionDialogue() {
      if (typeof document.createElement('dialog').showModal !== 'function') return;
      var inscrit = (ic.getAttribute('data-inscrit') || '').split(',').filter(Boolean);
      var zones = Array.prototype.map.call(ic.children, function (li) {
        return { zone: li.getAttribute('data-zone'), type: li.getAttribute('data-type'), nom: li.textContent.trim() };
      });
      var niveaux = {};
      zones.forEach(function (z) { if (z.type === 'level') niveaux[z.zone] = z.nom; });
      var d = el('dialog', 'nova-dialogue nova-ic-dialogue');
      d.setAttribute('aria-labelledby', 'nova-ic-titre');
      var h = el('h1', '', t('titre', 'Enrol %1').replace('%1', nomEleve));
      h.id = 'nova-ic-titre';
      d.appendChild(h);
      var fermer = el('button', 'close-button', '\u00d7');
      fermer.type = 'button';
      fermer.setAttribute('aria-label', t('fermer', 'Close'));
      fermer.addEventListener('click', function () { d.close(); });
      d.appendChild(fermer);
      d.appendChild(el('p', 'nova-ic-aide', t('aide', '')));
      var cherche = el('input', 'nova-ic-chercher');
      cherche.type = 'search';
      cherche.placeholder = t('chercher', 'Search for a class');
      cherche.setAttribute('aria-label', cherche.placeholder);
      d.appendChild(cherche);
      var choix = el('div', 'nova-ic-choix');
      d.appendChild(choix);
      var rien = el('p', 'nova-ic-rien', t('rien', 'No class found.'));
      rien.hidden = true;
      d.appendChild(rien);
      var erreur = el('p', 'nova-ic-erreur');
      erreur.setAttribute('role', 'alert');
      d.appendChild(erreur);
      var cases = [], niveauCourant = null, libres = 0;
      zones.forEach(function (z) {
        if (z.type !== 'class') return;
        var parent = z.zone.replace(/\/[^/]*$/, '');
        if (niveaux[parent] && parent !== niveauCourant) {
          niveauCourant = parent;
          var n = el('div', 'nova-ic-niveau', niveaux[parent]);
          n.setAttribute('data-niveau', parent);
          choix.appendChild(n);
        }
        var l = el('label', 'nova-ic-classe');
        l.setAttribute('data-niveau', parent);
        var c = el('input');
        c.type = 'checkbox';
        c.value = z.zone;
        l.appendChild(c);
        l.appendChild(el('span', '', z.nom));
        if (inscrit.indexOf(z.zone) >= 0) {
          c.checked = true; c.disabled = true;
          l.classList.add('nova-ic-deja');
          l.appendChild(el('small', '', t('deja', 'already enrolled')));
        } else libres++;
        choix.appendChild(l);
        cases.push(c);
      });
      if (!libres) { rien.textContent = t('toutes', ''); rien.hidden = false; cherche.hidden = true; }
      var boutons = el('div', 'wimscenter');
      var annuler = el('button', 'wims_button wims_secondary_button', t('annuler', 'Cancel'));
      annuler.type = 'button';
      annuler.addEventListener('click', function () { d.close(); });
      var valider = el('button', 'wims_button', t('valider-0', 'Enrol'));
      valider.type = 'button';
      valider.disabled = true;
      boutons.appendChild(annuler);
      boutons.appendChild(valider);
      d.appendChild(boutons);
      var choisies = function () { return cases.filter(function (c) { return c.checked && !c.disabled; }).map(function (c) { return c.value; }); };
      choix.addEventListener('change', function () {
        var n = choisies().length;
        valider.disabled = !n;
        valider.textContent = !n ? t('valider-0', 'Enrol') : n === 1 ? t('valider-1', 'Enrol in 1 class') : t('valider-n', 'Enrol in %1 classes').replace('%1', n);
        Array.prototype.forEach.call(choix.querySelectorAll('.nova-ic-classe'), function (l) { l.classList.toggle('nova-ic-coche', l.firstChild.checked && !l.firstChild.disabled); });
      });
      var MARQUES = new RegExp('[' + String.fromCharCode(768) + '-' + String.fromCharCode(879) + ']', 'g');
      var plat = function (s) { return (s || '').normalize('NFD').replace(MARQUES, '').toLowerCase(); };
      cherche.addEventListener('input', function () {
        var q = plat(cherche.value.trim()), vus = {}, total = 0;
        Array.prototype.forEach.call(choix.querySelectorAll('.nova-ic-classe'), function (l) {
          var ok = !q || plat(l.textContent).indexOf(q) >= 0;
          l.hidden = !ok;
          if (ok) { total++; vus[l.getAttribute('data-niveau')] = true; }
        });
        Array.prototype.forEach.call(choix.querySelectorAll('.nova-ic-niveau'), function (n) { n.hidden = !vus[n.getAttribute('data-niveau')]; });
        rien.textContent = t('rien', 'No class found.');
        rien.hidden = total > 0;
      });
      valider.addEventListener('click', function () {
        var liste = choisies();
        if (!liste.length) return;
        erreur.textContent = '';
        valider.disabled = annuler.disabled = true;
        valider.textContent = t('en-cours', '...');
        var envoi = ic.getAttribute('data-structure') === '4' ? inscrirePortail(liste) : inscriptionsGroupement(liste, 0);
        envoi.then(function (ok) {
          if (!ok) throw new Error('refus');
          try { sessionStorage.setItem('nova-ic-nouvelles', JSON.stringify(liste)); } catch (e) { /* stockage refuse */ }
          rechargerFiche();
        }).catch(function () {
          erreur.textContent = t('erreur', 'Enrolment failed.');
          annuler.disabled = false;
          valider.disabled = false;
          valider.textContent = t('valider-0', 'Enrol');
        });
      });
      d.addEventListener('close', function () { d.remove(); });
      d.addEventListener('click', function (e) { if (e.target === d && !annuler.disabled) d.close(); });
      document.body.appendChild(d);
      d.showModal();
      (libres ? cherche : annuler).focus();
    }

    /* Confirmation du retrait d'une classe (groupement). */
    function retraitDialogue(zone, nomClasse) {
      if (typeof document.createElement('dialog').showModal !== 'function') return;
      var d = el('dialog', 'nova-dialogue nova-ic-dialogue');
      d.setAttribute('aria-labelledby', 'nova-ic-titre');
      var h = el('h1', '', t('retirer-titre', 'Remove %1 from %2?').replace('%1', nomEleve).replace('%2', nomClasse));
      h.id = 'nova-ic-titre';
      d.appendChild(h);
      d.appendChild(el('p', 'nova-ic-aide', t('retirer-aide', '')));
      var erreur = el('p', 'nova-ic-erreur');
      erreur.setAttribute('role', 'alert');
      d.appendChild(erreur);
      var boutons = el('div', 'wimscenter');
      var annuler = el('button', 'wims_button wims_secondary_button', t('annuler', 'Cancel'));
      annuler.type = 'button';
      annuler.addEventListener('click', function () { d.close(); });
      var ok = el('button', 'wims_button wims_warning', t('retirer-ok', 'Remove'));
      ok.type = 'button';
      ok.addEventListener('click', function () {
        erreur.textContent = '';
        ok.disabled = annuler.disabled = true;
        ok.textContent = t('retrait-en-cours', '...');
        inscriptionsGroupement([zone], 1).then(function (r) {
          if (!r) throw new Error('refus');
          rechargerFiche();
        }).catch(function () {
          erreur.textContent = t('retrait-erreur', 'Removal failed.');
          ok.disabled = annuler.disabled = false;
          ok.textContent = t('retirer-ok', 'Remove');
        });
      });
      boutons.appendChild(annuler);
      boutons.appendChild(ok);
      d.appendChild(boutons);
      d.addEventListener('close', function () { d.remove(); });
      document.body.appendChild(d);
      d.showModal();
      annuler.focus();
    }

    function rechargerFiche() {
      pause().then(function () { location.href = adresse('&module=adm/class/usermanage&job=userprop&getuser=' + encodeURIComponent(login)); });
    }

    /* Portail : import CSV d'une ligne « login,participate » depuis la racine (adm/class/userscore, job=csv,
     * csv/upload.proc). WIMS AJOUTE les classes a celles de l'eleve (scripts/adm/class/adduser) ; plusieurs classes
     * separees par des espaces. Fichier en ASCII : fetch suffit (pas d'accent a transmettre). Nova refait ensuite les
     * listes de participants des zones (_widgets/participants-zones.phtml, lu par tail.phtml a l'import). */
    function inscrirePortail(liste) {
      return fetch(adresse('&module=adm/class/userscore&job=csv'), { credentials: 'same-origin' }).then(function (r) { return r.text(); }).then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var f = Array.prototype.filter.call(doc.forms, function (x) { return x.querySelector('input[name="csvtype"][value="upload"]'); })[0];
        if (!f) throw new Error('formulaire');
        var fd = new FormData();
        Array.prototype.forEach.call(f.querySelectorAll('input[type="hidden"]'), function (i) { fd.append(i.name, i.value); });
        fd.append('wims_deposit', new Blob(['login,participate\n' + login + ',' + liste.join(' ') + '\n'], { type: 'text/csv' }), 'nova-inscription.csv');
        return pause().then(function () { return fetch(f.getAttribute('action'), { method: 'POST', body: fd, credentials: 'same-origin' }); });
      }).then(function (r) { return r.text(); }).then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        return Array.prototype.some.call(doc.querySelectorAll('.wims_msg.success .wims_login'), function (s) {
          return s.textContent.split(/[\s,]+/).indexOf(login) >= 0;
        });
      });
    }

    /* Groupement : page « Gestion des inscriptions » (job=regmanage) dans un cadre cache, envoyee par le navigateur (le
     * libelle du bouton, traduit, peut porter des accents : fetch l'enverrait en UTF-8). bouton 0 = inscrire, 1 = retirer.
     * Reussite lue dans le tableau renvoye : coche (U+2705) de la ligne de l'eleve, colonne de chaque classe. */
    function inscriptionsGroupement(liste, bouton) {
      return new Promise(function (fini, echec) {
        var cadre = document.createElement('iframe');
        cadre.hidden = true;
        cadre.setAttribute('aria-hidden', 'true');
        var etape = 0;
        var garde = setTimeout(function () { cadre.remove(); echec(new Error('delai')); }, 30000);
        var fin = function (ok) { clearTimeout(garde); cadre.remove(); fini(ok); };
        cadre.addEventListener('load', function () {
          var doc = cadre.contentDocument;
          // Un cadre vide signale un chargement en entrant dans la page (about:blank) : pas encore la reponse de WIMS.
          if (!doc || !/wims\.cgi/.test(doc.location.href)) return;
          var f = doc && Array.prototype.filter.call(doc.forms, function (x) { return x.querySelector('input[name="listsclassch"]'); })[0];
          var u = f && f.querySelector('input[name="listuser"][value="' + login.replace(/["\\]/g, '') + '"]');
          if (!f || !u) { fin(false); return; }
          if (etape === 1) {
            var tr = u.closest('tr'), entetes = Array.prototype.slice.call(f.querySelectorAll('input[name="listsclassch"]'));
            var cellules = tr ? tr.children : [];
            fin(liste.every(function (z) {
              var j = entetes.map(function (c) { return c.value; }).indexOf(z);
              var td = j >= 0 ? cellules[j + 2] : null;
              var coche = !!td && td.textContent.indexOf('\u2705') >= 0;
              return bouton === 0 ? coche : !coche;
            }));
            return;
          }
          etape = 1;
          u.checked = true;
          var manque = liste.some(function (z) {
            var c = f.querySelector('input[name="listsclassch"][value="' + z + '"]');
            if (c) c.checked = true;
            return !c;
          });
          var envoi = f.querySelectorAll('input[type="submit"][name="action"]')[bouton];
          if (manque || !envoi) { fin(false); return; }
          pause().then(function () { envoi.click(); });
        });
        document.body.appendChild(cadre);
        cadre.src = adresse('&module=adm/class/usermanage&job=regmanage');
      });
    }
  }
