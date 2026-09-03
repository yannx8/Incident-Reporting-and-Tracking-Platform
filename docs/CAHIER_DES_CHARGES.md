# CAHIER DES CHARGES
## Incident Reporting & Tracking Platform
Conception détaillée et développement d'une application web de signalement et de suivi d'incidents géolocalisés

Élément | Valeur
---|---
Nature | Cahier des charges fonctionnel et technique consolidé — version enrichie phase de conception
Version | 2.0
Date | 3 septembre 2026
Périmètre | MVP de bout en bout, multi-tenant
Sources | Brief initial + décisions de conception + Linear + GitHub + présente phase de conception détaillée
Stack cible | React/TypeScript/Vite, Node.js/Express/TypeScript, Prisma, PostgreSQL, Leaflet/OSM
Statut | Document vivant — à faire évoluer à chaque décision de conception significative

Note de version 2.0 : cette édition enrichit la version 1.0 avec des règles métier détaillées, un modèle de données au niveau des champs, des règles de validation, un catalogue d'erreurs, un contrat d'API étendu et des critères de conception d'interface, afin de servir de référence directement exploitable pendant la phase de conception détaillée et le développement.

## Sommaire
## 1. Objet et contexte
## 2. Problématique
## 3. Vision et objectifs
## 4. Périmètre et priorités
## 5. Principes directeurs
## 6. Acteurs et rôles
## 7. Parcours utilisateurs
## 8. Workflow de l'incident
## 9. Exigences fonctionnelles
## 10. Règles métier
## 11. Modèle de données
## 12. Règles de validation des champs
## 13. Géolocalisation et cartographie
## 14. Notifications
## 15. Historique et audit
## 16. Gestion des pièces jointes
## 17. Interfaces et UX
## 18. API REST
## 19. Catalogue des erreurs
## 20. Architecture technique
## 21. Sécurité
## 22. Exigences non fonctionnelles
## 23. Tests et assurance qualité
## 24. Déploiement et exploitation
## 25. Documentation et livrables
## 26. Plan de réalisation
## 27. Critères de recette
## 28. Hors périmètre
## 29. Traçabilité Linear
## 30. État actuel du dépôt
## 31. Glossaire
## Annexe A. Matrice de permissions
## Annexe B. Trace d'une requête de création d'incident
## Annexe C. Règle de gouvernance du projet
## Annexe D. Exemples de payloads API

## 1. Objet et contexte
Le projet vise à centraliser le signalement, la localisation, l'affectation, le suivi et la clôture d'incidents rencontrés dans une organisation disposant de sites ou espaces physiques.
Le brief initial cite comme exemples les pannes d'éclairage, les problèmes de voirie, les équipements défectueux, les problèmes de sécurité et les dégradations d'infrastructures. Il identifie la difficulté de gérer ces signalements lorsqu'ils sont traités de manière informelle, sans traçabilité ni responsabilité claire.
Le système doit donc transformer un signalement ponctuel en dossier opérationnel traçable, tout en conservant le contenu original du reporter comme preuve immuable de ce qui a été observé et déclaré.

### 1.1 Référentiel documentaire
Cette version consolide le document de cadrage fourni au début du projet avec les décisions de conception issues du brainstorming, le backlog et les jalons Linear actuels, l'état d'implémentation observé dans GitHub, ainsi que les compléments de conception détaillée introduits dans la présente révision (règles métier étendues, modèle de données au niveau des champs, contrat d'API, catalogue d'erreurs).
Le brief initial demande explicitement une application fonctionnelle de bout en bout et suffisamment structurée pour être poursuivie et enrichie après la fin du stage.

### 1.2 Public visé par ce document
Le développeur ou l'équipe de développement, pour la conception détaillée et l'implémentation.
Le tuteur académique et le tuteur d'entreprise, pour l'évaluation de la couverture fonctionnelle.
Un futur repreneur du projet, pour comprendre les règles et décisions sans devoir relire le code.

## 2. Problématique
Comment fournir une application web simple et intuitive capable de centraliser les incidents, de les localiser géographiquement, de suivre leur traitement et de donner aux responsables une vision fiable des incidents actifs et résolus ?
La solution doit éviter deux extrêmes : un simple formulaire sans suivi, et une plateforme excessivement complexe. Le MVP privilégie une boucle opérationnelle courte, des règles d'accès explicites et une architecture facile à maintenir.
Trois tensions structurent la conception : (1) rigueur du contrôle d'accès versus simplicité d'usage pour un utilisateur non technique ; (2) traçabilité complète versus effort de développement limité au temps de stage ; (3) ouverture à une évolution multi-organisation versus discipline de périmètre du MVP.

## 3. Vision et objectifs

### 3.1 Vision
Faire de chaque incident un dossier partagé entre les acteurs autorisés, avec une origine immuable, une responsabilité explicite, une progression observable et une clôture contrôlée.

### 3.2 Objectifs
Créer un signalement structuré, daté et localisé.
Associer l'incident à un Site et à une localisation précise.
Vérifier le signalement avant son entrée dans le cycle opérationnel.
Qualifier et affecter l'incident à un Responsable compétent.
Permettre au Responsable de conduire l'intervention de bout en bout.
Conserver progressions, commentaires, preuves et historique sans perte d'information.
Permettre à l'Administrator de vérifier et clôturer chaque dossier.
Présenter une carte opérationnelle fidèle aux permissions de chaque acteur.
Fournir des indicateurs simples et fiables utiles à la décision.
Garantir l'isolation stricte des organisations et des droits.
Le brief initial fixe les objectifs de création, géolocalisation, consultation, affectation, suivi, historique et tableau de bord ; les objectifs de multi-tenant et de RBAC formel constituent une extension de conception décidée pour rendre le produit réutilisable au-delà d'un site pilote.

## 4. Périmètre et priorités

### 4.1 Périmètre MVP
Organisation et Sites.
Comptes, authentification, inscription et vérification.
Membership organisationnel.
RBAC User, Responsable, Administrator.
Chevauchement User + Responsable dans une organisation.
Profils Responsable, spécialités et accès aux Sites.
Création et vérification d'incident.
Immutabilité du signalement original.
Triage et qualification.
Affectation administrative.
Acceptation ou demande de réaffectation.
Progression, commentaires, preuves et résolution.
Clôture administrative.
Audit et notifications de workflow.
Carte Leaflet/OpenStreetMap.
Centre opérationnel et KPI.
Tests unitaires, intégration, E2E critique et sécurité.
Documentation et livraison.

### 4.2 Ordre de priorité
Les fonctionnalités principales sont stabilisées avant les extensions. Cette règle provient directement du brief initial. Le backlog Linear actuel confirme une livraison progressive en 9 jalons, de la fondation à la documentation.

### 4.3 Critères d'arbitrage en cas de conflit de priorité
Lorsqu'un arbitrage est nécessaire pendant le développement, l'ordre de décision est le suivant : sécurité et isolation tenant d'abord, intégrité du workflow ensuite, expérience utilisateur du parcours principal en troisième position, et enfin richesse fonctionnelle secondaire (filtres avancés, statistiques détaillées). Une fonctionnalité qui compromettrait l'isolation tenant ou l'immutabilité du rapport original ne doit jamais être livrée, même pour tenir un délai.

## 5. Principes directeurs
Simple d'abord : modular monolith, pas de microservices pour le MVP.
Server-side first : le serveur est l'autorité pour identité, organisation et permissions.
Tenant isolation : aucune ressource d'une organisation ne doit fuiter vers une autre.
Responsabilité explicite : l'Administrator décide de l'affectation.
Original immuable : le récit du reporter ne doit pas être réécrit.
Historique canonique : AuditEvent est la source de vérité des événements.
Progression distincte : ProgressUpdate n'est pas un commentaire.
État minimal : NEW → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED.
Explicabilité : aucune IA ni optimisation opaque n'est nécessaire au MVP.
Vertical slices : chaque fonctionnalité importante doit fonctionner de bout en bout avant d'ajouter de la complexité.
Fail closed : en cas de doute sur une permission, le système refuse plutôt que d'autoriser par défaut.
Idempotence des écritures sensibles : une même action rejouée par erreur réseau ne doit pas produire un doublon.

## 6. Acteurs et rôles

Acteur | Droits principaux | Restrictions
---|---|---
User | S'inscrire, se vérifier, se connecter, créer et consulter ses signalements, commenter selon les règles. | Ne peut pas modifier/supprimer le rapport original, affecter ou clôturer.
Responsable | Voir ses affectations, accepter, demander réaffectation, intervenir, publier progression, preuves et résolution. | Accès uniquement aux incidents affectés et aux Sites autorisés ; ne peut pas clôturer.
Administrator | Gérer Sites/profils, trier, affecter, surveiller, vérifier et clôturer les incidents de son organisation. | Pouvoir limité à son organisation ; le rôle ne doit pas être accordé implicitement aux autres profils.

### 6.1 RBAC
Les rôles sont des permissions dans un contexte d'organisation. User et Responsable peuvent se cumuler. Un rôle obtenu dans une organisation ne confère aucun droit dans une autre.
Le contrôle doit d'abord établir l'organisation de la ressource, puis évaluer le rôle et les règles opérationnelles. L'ordre de vérification recommandé est : authentification valide, appartenance (membership) active à l'organisation propriétaire de la ressource, rôle suffisant pour l'action demandée, puis règle métier spécifique (par exemple : est-ce le Responsable actuellement affecté ?).

### 6.2 Cycle de vie d'un compte et d'un membership
Un compte User existe indépendamment de toute organisation tant qu'aucun membership n'est créé.
Un membership peut être ACTIVE, SUSPENDED ou REVOKED ; seul ACTIVE autorise les opérations protégées.
La suspension d'un membership ne supprime pas l'historique des actions déjà réalisées par ce membre.
Un Administrator ne peut pas révoquer son propre dernier accès Administrator si cela laisse l'organisation sans aucun Administrator actif.

## 7. Parcours utilisateurs

### 7.1 User
Créer un compte.
Suivre le mécanisme contrôlé d'association à l'organisation.
Terminer la vérification.
Se connecter.
Créer un signalement.
Choisir un Site actif de son organisation.
Saisir titre, description, catégorie, priorité et localisation.
Ajouter une photo si nécessaire.
Vérifier les données avant envoi (écran de confirmation).
Soumettre.
Consulter l'incident et son historique.
Ajouter un commentaire lorsque l'accès est autorisé.
Être notifié lors des changements d'état significatifs (résolution proposée, clôture).

### 7.2 Responsable
Se connecter.
Consulter les incidents affectés.
Examiner les informations opérationnelles (description, localisation, historique, pièces jointes).
Accepter l'affectation ou demander une réaffectation motivée.
Démarrer l'intervention.
Publier des mises à jour structurées.
Ajouter commentaires et preuves.
Soumettre la résolution.
Consulter l'historique de ses propres interventions passées.

### 7.3 Administrator
Se connecter.
Consulter les incidents de l'organisation.
Gérer les Sites et profils Responsables.
Examiner les nouveaux incidents.
Qualifier catégorie, priorité et contexte.
Choisir puis affecter un Responsable.
Surveiller les traitements en cours.
Examiner la résolution proposée.
Clôturer après vérification.
Consulter le dashboard organisationnel.
Réaffecter un incident bloqué ou dont le Responsable est indisponible.

## 8. Workflow de l'incident
NEW → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
La vérification du signalement précède le cycle opérationnel. L'état d'une affectation est porté par Assignment et non par de nouveaux états Incident.

État | Déclencheur | Autorité | Résultat
---|---|---|---
NEW | Incident vérifié | Administrator | Incident prêt au triage/affectation
ASSIGNED | Affectation valide | Administrator | Responsable désigné
IN_PROGRESS | Prise en charge / début intervention | Responsable affecté | Traitement en cours
RESOLVED | Résolution soumise | Responsable affecté | Résolution à vérifier
CLOSED | Résolution vérifiée | Administrator | Dossier terminé

### 8.1 Règles de transition
NEW → ASSIGNED uniquement après affectation valide par Administrator.
ASSIGNED → IN_PROGRESS uniquement après acceptation explicite par le Responsable affecté (pas de démarrage implicite).
IN_PROGRESS → RESOLVED uniquement par le Responsable actuellement affecté, avec une description de résolution non vide.
RESOLVED → CLOSED uniquement par Administrator, après revue de la résolution.
RESOLVED → IN_PROGRESS est autorisé si Administrator rejette la résolution comme insuffisante (retour en traitement), avec motif obligatoire.
Une demande de réaffectation n'ajoute pas un état Incident ; elle est portée par un état propre à Assignment.
Toutes les transitions d'état sont auditables et horodatées côté serveur.
Aucune transition ne peut sauter une étape intermédiaire (pas de NEW → RESOLVED direct).
Pas de cancellation, reopen après clôture, SLA ou escalade complexe dans le MVP.

### 8.2 Garde-fous par transition (préconditions serveur)
Transition | Précondition vérifiée côté serveur
---|---
NEW → ASSIGNED | Incident en NEW ; Responsable ciblé actif, membre du tenant, ayant accès au Site de l'incident.
ASSIGNED → IN_PROGRESS | Assignment active correspond au Responsable authentifié ; incident encore en ASSIGNED.
IN_PROGRESS → RESOLVED | Auteur = Responsable de l'Assignment active ; champ résolution non vide.
RESOLVED → CLOSED | Auteur = Administrator du tenant ; incident encore en RESOLVED (pas déjà clôturé par une autre requête concurrente).
RESOLVED → IN_PROGRESS (rejet) | Auteur = Administrator ; motif de rejet non vide ; Assignment active reste inchangée.

## 9. Exigences fonctionnelles
Chaque exigence est identifiée, classée MUST (obligatoire au MVP) ou SHOULD (souhaitable, non bloquant), et renvoie vers les règles métier (section 10) et règles de validation (section 12) qui la précisent.

### 9.1 Authentification et membership
FR-AUTH-01 | MUST | Inscription: créer un compte avec les informations minimales requises (nom, email, mot de passe).
---|---|---
FR-AUTH-02 | MUST | Association organisationnelle: suit un mécanisme contrôlé ; un organizationId arbitraire fourni par le client ne peut pas créer une appartenance (cf. RM-04, RM-12).
FR-AUTH-03 | MUST | Vérification: un compte non vérifié ne peut pas effectuer les opérations protégées de signalement.
FR-AUTH-04 | MUST | Connexion: un membre vérifié peut ouvrir une session sécurisée.
FR-AUTH-05 | MUST | Déconnexion: la session/token est invalidé selon l'architecture retenue.
FR-AUTH-06 | MUST | Protection API: les credentials absents, invalides ou expirés sont refusés.
FR-AUTH-07 | MUST | Mot de passe oublié: un mécanisme de réinitialisation par lien à usage unique et expiration courte est fourni.
FR-AUTH-08 | SHOULD | Verrouillage après échecs répétés: au-delà d'un seuil de tentatives de connexion invalides, un délai ou un verrouillage temporaire est appliqué (cf. RM-41).

### 9.2 Organisation, Sites et profils
FR-ORG-01 | MUST | Sites: Administrator peut créer, consulter, modifier et désactiver les Sites de son organisation.
---|---|---
FR-ORG-02 | MUST | Cohérence tenant: un Site appartient à une seule organisation.
FR-ORG-03 | MUST | Désactivation non destructive: désactiver un Site ne supprime ni ne masque les incidents historiques qui le référencent.
FR-RESP-01 | MUST | Profil Responsable: Administrator peut configurer un Responsable du même tenant.
FR-RESP-02 | MUST | Spécialités: un Responsable peut avoir plusieurs spécialités.
FR-RESP-03 | MUST | Accès Sites: un Responsable peut avoir plusieurs accès Site, activables/désactivables indépendamment.

### 9.3 Signalement
FR-INC-01 | MUST | Création: seul un User authentifié et vérifié peut soumettre.
---|---|---
FR-INC-02 | MUST | Données: titre, description, catégorie et priorité sont requis (cf. section 12).
FR-INC-03 | MUST | Site: le Site est actif et appartient à l'organisation du reporter.
FR-INC-04 | MUST | Localisation: position manuelle sur carte ou géolocalisation navigateur.
FR-INC-05 | MUST | Horodatage: la date/heure de création est contrôlée côté serveur, jamais fournie par le client.
FR-INC-06 | MUST | Photo: une photo facultative peut être stockée de manière sécurisée (cf. section 16).
FR-INC-07 | MUST | Vérification: le reporter relit un écran de confirmation avant l'envoi final.
FR-INC-08 | MUST | Immutabilité: les champs originaux (titre, description initiale, catégorie initiale, localisation initiale, photo initiale, auteur, date) ne sont plus modifiables par les opérations courantes après soumission.
FR-INC-09 | SHOULD | Brouillon local: le formulaire conserve les données saisies en cas de perte de connexion avant soumission finale (état client uniquement, non persisté serveur).

### 9.4 Consultation
FR-VIEW-01 | MUST | Liste: afficher les incidents selon le rôle, avec pagination.
---|---|---
FR-VIEW-02 | MUST | Recherche: rechercher au minimum sur titre et description.
FR-VIEW-03 | MUST | Filtres: catégorie, priorité, statut et Site lorsque pertinent.
FR-VIEW-04 | MUST | Détail: afficher uniquement les données autorisées pour le rôle courant.
FR-VIEW-05 | MUST | User visibility: User voit ses propres incidents uniquement.
FR-VIEW-06 | MUST | Responsable visibility: Responsable voit ses affectations autorisées (actives et passées).
FR-VIEW-07 | MUST | Administrator visibility: Administrator voit tous les incidents de son organisation.
FR-VIEW-08 | SHOULD | Tri: tri par date de création, priorité ou statut.

### 9.5 Triage et affectation
FR-TRIAGE-01 | MUST | Triage: qualifier catégorie, priorité et contexte sans modifier le récit original.
---|---|---
FR-ASSIGN-01 | MUST | Affectation: seul Administrator peut affecter ou réaffecter.
FR-ASSIGN-02 | MUST | Assignment: l'affectation contient incident, Responsable, auteur et horodatage.
FR-ASSIGN-03 | MUST | Historique: une réaffectation conserve la précédente affectation (jamais écrasée).
FR-ASSIGN-04 | MUST | Éligibilité: lorsque la recommandation est active, organisation, profil actif, Site autorisé et spécialité pertinente sont vérifiés avant de proposer un Responsable.
FR-ASSIGN-05 | MUST | Décision humaine: la recommandation ne déclenche jamais une affectation automatique.

### 9.6 Intervention et résolution
FR-WORK-01 | MUST | Acceptation: Responsable affecté peut accepter, ce qui déclenche ASSIGNED → IN_PROGRESS.
---|---|---
FR-WORK-02 | MUST | Réaffectation: Responsable peut demander une réaffectation motivée sans changer l'état Incident.
FR-PROG-01 | MUST | Progression: seul le Responsable affecté publie les ProgressUpdate.
FR-PROG-02 | MUST | Types: les mises à jour utilisent un petit ensemble de types structurés (cf. 11.1).
FR-COM-01 | MUST | Commentaires: distincts de ProgressUpdate et AuditEvent, visibles selon le rôle.
FR-RES-01 | MUST | Résolution: Responsable affecté peut proposer une résolution depuis IN_PROGRESS.
FR-CLOSE-01 | MUST | Clôture: Administrator vérifie puis clôture.
FR-CLOSE-02 | MUST | Rejet de résolution: Administrator peut renvoyer une résolution jugée insuffisante en IN_PROGRESS avec motif.

### 9.7 Carte, notifications et dashboard
FR-MAP-01 | MUST | Carte: Leaflet + OpenStreetMap.
---|---|---
FR-MAP-02 | MUST | Données: afficher uniquement Sites et incidents autorisés pour le rôle courant.
FR-MAP-03 | MUST | Interaction: un marqueur ouvre la ressource autorisée.
FR-NOTIF-01 | MUST | Workflow: notifier les acteurs lors des événements importants (cf. section 14).
FR-DASH-01 | MUST | KPI: total, statuts, catégories, priorités et tendance temporelle.
FR-DASH-02 | MUST | Isolation: les KPI Administrator sont strictement limités à son organisation.

## 10. Règles métier
Les règles sont regroupées par thème pour faciliter la revue et la traçabilité vers les tests (section 23).

### 10.1 Multi-tenant et RBAC
ID | Règle
---|---
RM-01 | Toute ressource tenant-owned est rattachable à exactement une Organization.
RM-02 | Site et Organization doivent être cohérents (un Site appartient à une seule organisation).
RM-03 | Incident et Site doivent appartenir au même tenant.
RM-04 | Membership porte les rôles dans l'organisation ; un rôle sans membership actif n'a aucun effet.
RM-05 | ResponsableProfile est organisationnel, jamais partagé entre organisations.
RM-06 | ResponsableSite et ResponsableSpecialty ne franchissent jamais un tenant.
RM-07 | Assignment ne peut relier un incident à un Responsable d'un autre tenant.
RM-08 | Accès Responsable = profil actif + Site actif + affectation valide, les trois conditions cumulatives.
RM-12 | Un identifiant fourni par le client (organizationId, siteId, incidentId, responsableId) ne détermine jamais seul l'autorisation ; il est vérifié contre l'état serveur à chaque requête.

### 10.2 Intégrité du signalement
ID | Règle
---|---
RM-09 | Original report immutable après création : titre, description, catégorie initiale, localisation initiale et photo initiale ne peuvent plus être modifiés.
RM-10 | Administrator seul peut clôturer un incident.
RM-11 | AuditEvent est append-only ; aucun événement n'est modifié ou supprimé après écriture.

### 10.3 Validation de saisie
ID | Règle
---|---
RM-13 | Le titre est requis, encodé en UTF-8, 5 à 150 caractères après suppression des espaces superflus.
RM-14 | La description est requise, 10 à 5000 caractères après suppression des espaces superflus.
RM-15 | La catégorie est choisie dans une liste fermée définie au niveau système ou organisation, jamais en texte libre.
RM-16 | La priorité est choisie parmi un ensemble fermé : Basse, Moyenne, Haute, Critique.
RM-17 | Les coordonnées géographiques doivent être des nombres valides : latitude entre -90 et 90, longitude entre -180 et 180.
RM-18 | Une photo jointe respecte un type MIME autorisé (image/jpeg, image/png, image/webp) et une taille maximale de 5 Mo.
RM-19 | Un incident ne peut être créé sans un Site actif rattaché à l'organisation du reporter.
RM-20 | Le nombre de photos par incident est limité à une seule au MVP ; l'extension à un album multi-photos est hors périmètre initial (cf. section 28).

### 10.4 Cycle de vie et transitions
ID | Règle
---|---
RM-21 | Une transition d'état ne peut sauter d'étape intermédiaire.
RM-22 | Une seule Assignment peut être active à la fois pour un incident donné.
RM-23 | Une demande de réaffectation doit inclure un motif non vide.
RM-24 | Une résolution proposée doit inclure une description de résolution non vide.
RM-25 | La clôture ne peut intervenir que depuis l'état RESOLVED.
RM-26 | Un incident clôturé (CLOSED) devient en lecture seule pour tous les rôles : plus de nouveau commentaire, progression ou pièce jointe, sauf action administrative exceptionnelle tracée en audit.
RM-27 | Un Responsable dont l'accès Site ou le profil est désactivé ne peut plus recevoir de nouvelles affectations, mais conserve la visibilité de ses affectations passées.
RM-28 | Une réaffectation ferme (endDate) l'Assignment précédente avant que la nouvelle ne débute ; les deux ne coexistent jamais à l'état actif.

### 10.5 Pièces jointes et notifications
ID | Règle
---|---
RM-29 | Une notification est déclenchée après la transaction métier qui la motive, jamais dans la même transaction base de données.
RM-30 | L'échec d'envoi d'une notification n'annule jamais l'opération métier associée.
RM-31 | Une notification marquée lue ne peut être remise à l'état non-lu que par son destinataire.
RM-32 | Les pièces jointes sont stockées hors base de données ; seules les métadonnées (nom, type MIME, taille, référence de stockage) sont persistées en base.
RM-33 | L'accès à un fichier joint s'effectue via une URL signée à expiration courte, jamais via une URL de stockage publique et permanente.
RM-34 | La suppression physique d'un fichier joint n'est jamais automatique ; toute suppression est une action administrative explicite tracée en audit.

### 10.6 Concurrence et intégrité opérationnelle
ID | Règle
---|---
RM-35 | Deux affectations concurrentes ne peuvent pas être créées pour le même incident ; la création d'Assignment est protégée par une contrainte d'unicité sur (incidentId, isActive=true).
RM-36 | Une mise à jour de statut concurrente est arbitrée par un contrôle de version optimiste (comparaison d'un champ updatedAt ou version) pour éviter d'écraser une transition plus récente.
RM-37 | Chaque AuditEvent est écrit dans la même transaction que l'action métier qu'il décrit, afin qu'aucune action significative ne reste non tracée en cas d'échec partiel.
RM-38 | Un compte suspendu ou révoqué perd immédiatement tout accès aux opérations protégées, indépendamment de la validité résiduelle de son token.
RM-39 | Un Site désactivé n'apparaît plus dans les listes de création de signalement, mais reste visible en lecture sur les incidents existants qui le référencent.
RM-40 | Aucune limite fonctionnelle (visibilité, transition, affectation) ne repose sur une valeur envoyée par le client sans revérification serveur systématique.
RM-41 | Après cinq échecs de connexion consécutifs sur un même compte en moins de quinze minutes, un délai croissant est imposé avant la tentative suivante.

## 11. Modèle de données
Le schéma Prisma comprend les entités suivantes. Les tableaux ci-dessous détaillent les champs des entités centrales pour la phase de conception ; les noms de champs peuvent être ajustés lors de l'implémentation Prisma tout en respectant les contraintes décrites.

### 11.1 Vue d'ensemble des entités
Entité | Fonction
---|---
Organization | Tenant principal.
Site | Lieu opérationnel.
User | Identité.
OrganizationMembership | Appartenance + rôles.
ResponsableProfile | Profil opérationnel.
Specialty | Spécialité.
ResponsableSpecialty | Relation Responsable-spécialité.
ResponsableSite | Relation Responsable-Site.
Incident | Signalement et dossier opérationnel.
Assignment | Responsabilité courante et historique.
ProgressUpdate | Progression structurée.
Comment | Communication libre.
Attachment | Métadonnées de fichiers.
AuditEvent | Historique immuable.
Notification | Notification de workflow.

### 11.2 Vue relationnelle
Organization
|-- Sites
---|---
|-- Memberships
|-- ResponsableProfiles
|-- Specialties
`-- Incidents
ResponsableProfile
|-- ResponsableSpecialties
---|---
|-- ResponsableSites
`-- Assignments
Incident
|-- Site
---|---
|-- Reporter
|-- Assignments
|-- ProgressUpdates
|-- Comments
|-- Attachments
`-- AuditEvents

### 11.3 Détail des champs: Incident
Champ | Type | Contraintes
---|---|---
id | UUID | Clé primaire.
organizationId | UUID | Requis, FK Organization, indexé.
siteId | UUID | Requis, FK Site, doit appartenir au même organizationId (RM-03).
reporterId | UUID | Requis, FK User, immuable après création.
title | String | Requis, 5-150 caractères, immuable (RM-09, RM-13).
description | Text | Requis, 10-5000 caractères, immuable (RM-09, RM-14).
category | Enum | Requis, valeur fermée, immuable après vérification initiale (RM-15).
priority | Enum | Requis : LOW, MEDIUM, HIGH, CRITICAL (RM-16).
latitude | Float | Requis, -90 à 90 (RM-17).
longitude | Float | Requis, -180 à 180 (RM-17).
status | Enum | NEW, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED. Défaut NEW.
resolutionText | Text | Nullable, requis uniquement au passage RESOLVED.
createdAt | DateTime | Généré serveur, immuable.
updatedAt | DateTime | Mis à jour à chaque écriture, utilisé pour le verrouillage optimiste (RM-36).
verifiedAt | DateTime | Nullable, renseigné au passage NEW effectif.

### 11.4 Détail des champs: Assignment
Champ | Type | Contraintes
---|---|---
id | UUID | Clé primaire.
incidentId | UUID | Requis, FK Incident.
responsableProfileId | UUID | Requis, FK ResponsableProfile, même tenant que l'incident (RM-07).
assignedById | UUID | Requis, FK User (Administrator auteur).
status | Enum | PENDING_ACCEPTANCE, ACCEPTED, REASSIGNMENT_REQUESTED, CLOSED (fin de l'affectation).
isActive | Boolean | Une seule ligne active par incident (RM-22, RM-35).
reassignReason | Text | Nullable, requis si demande de réaffectation (RM-23).
startedAt | DateTime | Généré serveur à la création.
endedAt | DateTime | Nullable, renseigné à la clôture de l'affectation ou à la réaffectation (RM-28).

### 11.5 Détail des champs: ProgressUpdate, Comment, Attachment, AuditEvent, Notification
Entité | Champs clés | Contraintes principales
---|---|---
ProgressUpdate | incidentId, authorId, type, note, createdAt | type parmi un ensemble fermé (ex. STARTED, ON_SITE, BLOCKED, UPDATE) ; auteur = Responsable affecté actif (FR-PROG-01).
Comment | incidentId, authorId, body, createdAt | body 1-2000 caractères ; visibilité dérivée du rôle et non stockée en clair sur la ligne.
Attachment | incidentId, uploadedById, mimeType, sizeBytes, storageRef | mimeType et sizeBytes validés à l'upload (RM-18) ; storageRef ne contient jamais d'URL publique permanente (RM-32, RM-33).
AuditEvent | incidentId, actorId, eventType, payload, createdAt | append-only (RM-11) ; payload est un résumé structuré de l'événement, jamais une réécriture du contenu original.
Notification | recipientId, eventType, incidentId, readAt, createdAt | readAt nullable, modifiable uniquement par recipientId (RM-31).

### 11.6 Intégrité
Les clés étrangères composites doivent empêcher les relations inter-organisation lorsque le schéma les couvre.
Les contraintes d'unicité servent à garantir les invariants structurels (par exemple : une seule Assignment active par incident).
Les règles métier qui nécessitent une transaction restent contrôlées par la couche service, pas uniquement par la base.
Les événements d'audit ne sont jamais réécrits pour masquer une action passée.

## 12. Règles de validation des champs
Cette section consolide, pour le formulaire de signalement (le plus critique du parcours User), les règles de validation à appliquer côté client (ergonomie) et côté serveur (sécurité: la validation serveur est seule faisant foi).

Champ | Règle de validation | Exemple de message d'erreur
---|---|---
title | Requis, 5-150 caractères après trim. | Le titre doit contenir entre 5 et 150 caractères.
description | Requis, 10-5000 caractères après trim. | La description doit contenir entre 10 et 5000 caractères.
category | Requis, doit exister dans la liste fermée active. | Catégorie invalide ou inactive.
priority | Requis, une valeur parmi LOW, MEDIUM, HIGH, CRITICAL. | Priorité invalide.
siteId | Requis, Site actif appartenant au tenant du reporter. | Site introuvable ou inactif pour votre organisation.
latitude / longitude | Requis, nombres dans les bornes valides. | Coordonnées géographiques invalides.
photo | Facultatif, type MIME autorisé, taille ≤ 5 Mo, une seule pièce. | Le fichier doit être une image (jpeg, png, webp) de moins de 5 Mo.
reassignReason | Requis si demande de réaffectation, 5-500 caractères. | Merci de préciser le motif de la demande de réaffectation.
resolutionText | Requis pour passer en RESOLVED, 10-3000 caractères. | Merci de décrire la résolution apportée.
comment.body | Requis, 1-2000 caractères après trim. | Le commentaire ne peut pas être vide.
Principe directeur : toute validation présente côté client est reproduite intégralement côté serveur ; le client n'est jamais la seule barrière (cf. RM-40).

## 13. Géolocalisation et cartographie
Localisation manuelle disponible (sélection sur carte).
Géolocalisation navigateur disponible lorsque l'utilisateur l'autorise.
Coordonnées validées avant persistance (cf. RM-17).
Carte basée sur Leaflet/OpenStreetMap.
Marqueurs de Sites et incidents autorisés uniquement pour le rôle courant.
Filtres de carte cohérents avec les filtres de liste (même état, catégorie, priorité, Site).
Pas de tracking temps réel.
Pas de geofencing.
Pas de routing avancé.
Pas de GIS complexe.

### 13.1 Comportement en cas de refus de géolocalisation
Si l'utilisateur refuse la géolocalisation navigateur, le formulaire retombe sur la sélection manuelle par défaut sans bloquer la création du signalement ; l'incident reste soumis à la règle de coordonnées valides (RM-17).

## 14. Notifications
Événement | Destinataire | Finalité
---|---|---
Incident soumis/vérifié | Administrator | Déclencher le traitement.
Incident affecté | Responsable | Informer de la responsabilité.
Acceptation | Administrator | Confirmer la prise en charge.
Demande de réaffectation | Administrator | Permettre une décision.
Progression/blocage | Administrator | Maintenir la visibilité.
Résolution soumise | Administrator | Déclencher la vérification.
Résolution rejetée | Responsable | Reprendre le traitement.
Clôture | Reporter + Responsable | Informer de la fin du dossier.

### 14.1 Canal, contenu et anti-spam
Canal MVP : notification in-app persistée (table Notification), consultable dans une liste dédiée avec statut lu/non lu.
Le contenu d'une notification renvoie vers l'incident concerné et résume l'événement en une phrase, sans dupliquer le contenu original du signalement.
Une notification n'est jamais renvoyée en doublon pour le même événement et le même destinataire (idempotence par clé événement+incident+destinataire).
L'échec d'envoi (si un canal externe est ajouté plus tard) est journalisé mais n'affecte jamais la transaction métier associée (RM-30).

## 15. Historique et audit
L'historique doit permettre de reconstruire les événements significatifs d'un incident sans écraser les faits antérieurs.
Création/vérification.
Triage important.
Affectation/réaffectation.
Acceptation/demande de réaffectation.
Changements d'état.
Progressions importantes.
Résolution.
Rejet de résolution.
Clôture.
Actions administratives sensibles (désactivation de Site, suspension de compte).
L'interface timeline est une lecture d'AuditEvent. Elle ne doit pas créer un deuxième historique indépendant.

## 16. Gestion des pièces jointes
Cette section détaille une exigence du brief (photo facultative) qui a des implications de sécurité et de stockage suffisamment importantes pour mériter une spécification dédiée.

### 16.1 Contraintes
Types MIME autorisés : image/jpeg, image/png, image/webp (RM-18).
Taille maximale : 5 Mo par fichier (RM-18).
Une seule pièce jointe par incident au MVP (RM-20).
Stockage objet externe à la base de données ; seules les métadonnées sont persistées (RM-32).

### 16.2 Cycle de vie d'une pièce jointe
Le client demande une autorisation d'upload (ou envoie le fichier via un endpoint dédié, selon l'architecture de stockage retenue).
Le serveur valide le type MIME et la taille annoncée avant d'accepter le fichier.
Le fichier est stocké dans l'espace objet, sous un chemin incluant organizationId et incidentId pour faciliter l'isolation et l'audit.
Le serveur enregistre les métadonnées (nom original, type, taille, référence de stockage, auteur, date).
La consultation ultérieure génère une URL signée à expiration courte (RM-33), jamais un lien permanent public.

### 16.3 Sécurité spécifique
Le nom de fichier original n'est jamais utilisé tel quel comme chemin de stockage (risque de traversée de répertoire).
Le contenu du fichier est revalidé côté serveur (signature de fichier), pas seulement sur la base de l'extension ou du type MIME déclaré par le client.
L'accès à une pièce jointe applique les mêmes règles de tenant isolation et de rôle que l'incident auquel elle est rattachée.

## 17. Interfaces et UX
L'interface est role-oriented : chaque acteur doit voir ses tâches et informations utiles, sans exposition de données non autorisées.

Écran | User | Responsable | Administrator
---|---|---|---
Accueil | Créer/suivre | Affectations | Pilotage
Liste | Ses incidents | Ses affectations | Organisation
Détail | Rapport + historique autorisé | Espace d'intervention | Vue complète
Création | Oui | Oui si User + Responsable | Non nécessaire
Triage | Non | Non | Oui
Affectation | Non | Non | Oui
Progression | Non | Oui | Lecture
Résolution | Non | Oui | Vérification
Clôture | Non | Non | Oui
Administration | Non | Non | Oui

### 17.1 Écrans MVP
Inscription
Vérification
Connexion
Accueil par rôle
Création/confirmation de signalement
Liste/recherche/filtres
Détail
Historique
Espace Responsable
Centre Administrator
Gestion Sites
Gestion Responsables
Carte
Dashboard

### 17.2 États d'interface à prévoir pour chaque écran de liste/détail
État de chargement : indicateur explicite, jamais un écran vide silencieux.
État vide : message contextuel (ex. "Aucun incident pour le moment") plutôt qu'un tableau vide sans explication.
État d'erreur réseau/serveur : message clair et action de nouvelle tentative, sans exposer de détail technique interne.
État d'accès refusé : redirection ou message explicite plutôt qu'un écran cassé, lorsqu'un utilisateur tente d'accéder à une ressource hors de son périmètre.
État de soumission en cours : désactivation du bouton d'action pour éviter les doubles soumissions (cf. idempotence, section 5).

### 17.3 Accessibilité et ergonomie minimales
Contraste suffisant pour les statuts d'incident (couleur seule insuffisante : toujours coupler couleur et libellé texte).
Formulaire de création utilisable au clavier et lisible sur petit écran (NF-08).
Messages d'erreur de validation affichés au plus près du champ concerné, en langage clair (cf. section 12).

## 18. API REST
L'API expose les ressources du domaine via REST. Les noms définitifs de routes peuvent être adaptés lors de l'implémentation, mais les capacités suivantes sont requises.

### 18.1 Domaines et capacités
Domaine | Capacités
---|---
Health | GET /health
Auth | register, login, logout, session, forgot-password, reset-password
Sites | list, create, update, deactivate
Responsables | list, configure profile, specialties, Sites
Incidents | create, list, detail
Triage | qualification administrative
Assignments | assign, accept, request reassignment, reject resolution
Progress | create/update operational progress
Comments | create/read authorized comments
Resolution | submit resolution
Closure | administrator closure
Attachments | upload, get signed URL
Audit | read authorized history
Notifications | list/read workflow notifications
Map | authorized geographic data
Dashboard | organization-scoped KPIs

### 18.2 Table de routes proposée
Méthode & route | Rôles autorisés | Description
---|---|---
POST /auth/register | Public | Créer un compte.
POST /auth/login | Public | Ouvrir une session.
POST /auth/logout | Authentifié | Invalider la session/token.
GET /sites | User, Responsable, Administrator | Lister les Sites actifs du tenant.
POST /sites | Administrator | Créer un Site.
PATCH /sites/:id | Administrator | Modifier ou désactiver un Site.
POST /responsables | Administrator | Créer/configurer un profil Responsable.
PATCH /responsables/:id/sites | Administrator | Gérer les accès Site d'un Responsable.
POST /incidents | User | Créer un signalement.
GET /incidents | User, Responsable, Administrator | Lister selon le périmètre du rôle.
GET /incidents/:id | User (propriétaire), Responsable (affecté), Administrator | Détail autorisé.
PATCH /incidents/:id/triage | Administrator | Qualifier catégorie/priorité/contexte.
POST /incidents/:id/assignments | Administrator | Affecter ou réaffecter.
POST /assignments/:id/accept | Responsable affecté | Accepter l'affectation.
POST /assignments/:id/reassignment-request | Responsable affecté | Demander une réaffectation motivée.
POST /incidents/:id/progress | Responsable affecté | Publier une mise à jour de progression.
POST /incidents/:id/comments | Selon visibilité rôle | Ajouter un commentaire.
POST /incidents/:id/resolution | Responsable affecté | Soumettre une résolution.
POST /incidents/:id/reject-resolution | Administrator | Rejeter une résolution (retour IN_PROGRESS).
POST /incidents/:id/closure | Administrator | Clôturer l'incident.
POST /incidents/:id/attachments | User (à la création) / rôle autorisé | Uploader une pièce jointe.
GET /incidents/:id/audit | Selon visibilité rôle | Lire l'historique autorisé.
GET /notifications | Authentifié | Lister ses notifications.
PATCH /notifications/:id/read | Destinataire uniquement | Marquer comme lue.
GET /map/incidents | User, Responsable, Administrator | Données géographiques autorisées.
GET /dashboard | Administrator | KPI organisationnels.

### 18.3 Contrat d'une requête protégée
Client → HTTP → Express → authentification → organisation → autorisation → validation → logique métier → Prisma → PostgreSQL → réponse
L'ID d'organisation, de Site ou de ressource fourni par le client est une donnée à vérifier, jamais une preuve de droit (RM-12, RM-40).

### 18.4 Pagination, tri et recherche: conventions proposées
Pagination par curseur ou par page, avec une taille de page par défaut de 20 et un maximum de 100 (valeur indicative à valider en conception détaillée).
Paramètres de requête proposés : page, pageSize, sortBy, sortDir, q (recherche texte), category, priority, status, siteId.
La recherche texte (q) porte au minimum sur title et description (FR-VIEW-02).
Toute réponse de liste inclut le total d'éléments correspondant aux filtres, pour permettre l'affichage de la pagination côté client.

## 19. Catalogue des erreurs
Un format d'erreur homogène facilite le traitement côté frontend et les tests. Format proposé : { "error": { "code": "...", "message": "..." } }.

Code | HTTP | Signification | Exemple de contexte
---|---|---|---
AUTH_REQUIRED | 401 | Aucune session/token valide. | Requête protégée sans en-tête d'authentification.
AUTH_INVALID | 401 | Token invalide ou expiré. | Token expiré non rafraîchi.
ACCOUNT_UNVERIFIED | 403 | Compte non vérifié. | Tentative de création d'incident avant vérification (FR-AUTH-03).
FORBIDDEN_ROLE | 403 | Rôle insuffisant pour l'action. | User tentant de clôturer un incident.
FORBIDDEN_TENANT | 403 | Ressource hors du tenant de l'appelant. | Accès à un incident d'une autre organisation.
FORBIDDEN_NOT_ASSIGNED | 403 | Responsable non affecté à l'incident. | Publication de progression sans Assignment active.
VALIDATION_ERROR | 400 | Champ(s) invalide(s). | Titre trop court (cf. section 12).
NOT_FOUND | 404 | Ressource introuvable ou non visible pour l'appelant. | incidentId inexistant ou hors périmètre.
CONFLICT_STATE | 409 | Transition d'état non autorisée dans l'état courant. | Tentative de clôture depuis IN_PROGRESS.
CONFLICT_CONCURRENT_UPDATE | 409 | Mise à jour concurrente détectée (verrouillage optimiste). | Deux affectations simultanées sur le même incident (RM-35, RM-36).
FILE_TOO_LARGE | 413 | Pièce jointe au-delà de la taille autorisée. | Photo de plus de 5 Mo (RM-18).
UNSUPPORTED_MEDIA_TYPE | 415 | Type de fichier non autorisé. | Upload d'un fichier autre que jpeg/png/webp.
RATE_LIMITED | 429 | Trop de requêtes dans la fenêtre de temps. | Tentatives de connexion répétées (RM-41).
INTERNAL_ERROR | 500 | Erreur serveur non prévue. | Journalisée sans exposer de détail technique au client (NF-06).

## 20. Architecture technique
Couche | Choix
---|---
Frontend | React + TypeScript + Vite
Backend | Node.js + Express + TypeScript
Persistence | Prisma
Database | PostgreSQL
Map | Leaflet + OpenStreetMap
Files | Object storage ; métadonnées en base
Tests | Vitest, Supertest, integration/E2E
Quality | Lint, typecheck, tests, build
CI | GitHub Actions
Versioning | Git + GitHub

### 20.1 Architecture logique
Frontend
|-- Views/pages
---|---
|-- Components
|-- API client
`-- Session/state
Backend
|-- Routes
---|---
|-- Middleware (auth, tenant, role)
|-- Authentication
|-- Authorization
|-- Domain/services
|-- Prisma/persistence
`-- Tests
L'architecture est un modular monolith. Les abstractions doivent être introduites seulement lorsqu'elles répondent à un besoin concret, conformément au principe "simple d'abord" (section 5).

### 20.2 Emplacement de la logique métier
Les règles métier (section 10) sont implémentées dans la couche service, jamais uniquement dans les contrôleurs de routes ni uniquement dans des contraintes de base de données. La base de données porte les invariants structurels (unicité, clés étrangères) ; le service porte les règles conditionnelles (transitions, éligibilité, immuabilité applicative).

## 21. Sécurité

### 21.1 Contrôles obligatoires
Authentification côté serveur.
Membership organisationnel fiable.
Authorization côté serveur, jamais déléguée au client.
Vérification de ownership avant permission.
Contrôle des Sites Responsable.
Contrôle de l'affectation.
Immutabilité du rapport original.
Administrator-only closure.
Protection des pièces jointes.
Audit des actions sensibles.
Hachage des mots de passe avec un algorithme adapté (ex. bcrypt/argon2), jamais en clair ni en réversible.
Expiration et renouvellement contrôlé des sessions/tokens.

### 21.2 Scénarios adverses et mitigation
Scénario | Mitigation
---|---
Changer organizationId dans une requête. | L'organizationId effectif provient du membership serveur, jamais du corps de la requête (RM-12).
Accéder à l'ID d'un incident d'un autre tenant. | Vérification tenant systématique avant toute lecture/écriture (RM-03, RM-07).
Accéder à un incident non affecté en tant que Responsable. | Vérification d'Assignment active avant toute action opérationnelle (RM-08).
Utiliser une autorisation Site inactive. | Vérification de l'état actif du ResponsableSite à chaque action (RM-27).
Modifier ou supprimer le rapport original. | Champs immuables non exposés en écriture après création (RM-09).
Utiliser un rôle User pour une action Administrator. | Vérification de rôle explicite avant chaque action sensible (FR-CLOSE-01, FR-ASSIGN-01).
Accéder à une pièce jointe d'un autre incident/tenant. | URL signée à expiration courte + vérification tenant/rôle avant génération (RM-33).
Réutiliser un token invalide ou expiré. | Vérification d'expiration et de révocation à chaque requête protégée.
Rejouer deux fois la même soumission de résolution (double-clic, retry réseau). | Idempotence applicative et verrouillage optimiste (RM-36).
Uploader un exécutable déguisé en image. | Revalidation du contenu du fichier côté serveur, pas seulement de l'extension (section 16.3).

## 22. Exigences non fonctionnelles
ID | Exigence | Critère
---|---|---
NF-01 | Sécurité | Permissions contrôlées côté serveur, jamais côté client seul.
NF-02 | Isolation | Aucun accès inter-tenant possible, y compris par manipulation de requête.
NF-03 | Intégrité | Contraintes DB + validations métier alignées (section 12).
NF-04 | Maintenabilité | Modules clairs et peu d'abstractions inutiles.
NF-05 | Testabilité | Règles critiques couvertes par des tests automatisés (section 23).
NF-06 | Observabilité | Erreurs exploitables en journal, sans données sensibles ni détail interne exposé au client.
NF-07 | Performance | Requêtes MVP simples et indexées ; temps de réponse cible indicatif sous 300 ms pour les listes en usage normal.
NF-08 | Responsive | Parcours principaux utilisables sur smartphone.
NF-09 | Health | Endpoint de santé disponible et vérifié après déploiement.
NF-10 | Documentation | Installation, API, architecture et usage documentés.
NF-11 | Disponibilité des sessions | Durée de session/token indicative à définir en conception détaillée (ex. token court + renouvellement) ; à valider avec le choix d'architecture d'authentification.
NF-12 | Limitation de débit | Un seuil de tentatives de connexion et d'écritures sensibles par minute est appliqué pour limiter les abus (cf. RM-41).
Les valeurs chiffrées indicatives (temps de réponse, durée de session, seuils de débit) sont des propositions de conception à confirmer avant implémentation ; elles ne figuraient pas dans le brief initial et doivent être validées avec le tuteur ou ajustées selon les contraintes d'hébergement.

## 23. Tests et assurance qualité

### 23.1 Niveaux
Unit : règles métier et permissions.
Integration : API + DB + auth + authorization.
Security : isolation, rôles, Sites, fichiers.
E2E critique : registration → verification → report → triage → assignment → acceptance → progress → resolution → closure.
Manuel : UX, responsive, carte et erreurs.
Bug bash : validation contre les critères d'acceptation.

### 23.2 Cas critiques
ID | Cas | Attendu
---|---|---
T-01 | Membership inactive | Refus des opérations protégées.
T-02 | Cross-org | 403 (FORBIDDEN_TENANT) ou équivalent.
T-03 | User consulte l'incident d'un autre User | Accès refusé (NOT_FOUND ou 403 selon convention retenue).
T-04 | Responsable non affecté agit sur un incident | Accès opérationnel refusé (FORBIDDEN_NOT_ASSIGNED).
T-05 | Site non autorisé | Accès refusé.
T-06 | User + Responsable cumulés | Aucune fuite de permission entre les deux casquettes.
T-07 | Clôture par non-Admin | Refus (FORBIDDEN_ROLE).
T-08 | Modification du rapport original | Refus (champ immuable, RM-09).
T-09 | Assignment invalide (autre tenant) | Refus (RM-07).
T-10 | Audit | Événement conservé, append-only (RM-11).
T-11 | Deux affectations simultanées sur le même incident | Une seule réussit ; l'autre échoue en CONFLICT_CONCURRENT_UPDATE (RM-35).
T-12 | Upload de fichier au-delà de la taille autorisée | Refus FILE_TOO_LARGE (RM-18).
T-13 | Upload d'un type de fichier non autorisé, y compris exécutable renommé | Refus UNSUPPORTED_MEDIA_TYPE (section 16.3).
T-14 | Action sur un incident déjà CLOSED | Refus, incident en lecture seule (RM-26).
T-15 | Résolution rejetée par Administrator | Incident repasse en IN_PROGRESS, motif enregistré, Responsable notifié.
T-16 | Notification déjà lue rouverte par un tiers | Refus, seul le destinataire peut modifier readAt (RM-31).
T-17 | Cinq échecs de connexion consécutifs | Verrouillage temporaire appliqué (RM-41).

## 24. Déploiement et exploitation
Configurer les variables d'environnement sans versionner les secrets.
Provisionner PostgreSQL.
Appliquer les migrations Prisma.
Générer le client Prisma.
Construire frontend et backend.
Configurer le stockage objet si les pièces jointes sont actives.
Déployer.
Vérifier /health.
Vérifier les logs.
Tester une sauvegarde/restauration.
Documenter la procédure.

## 25. Documentation et livrables
Code source complet.
Base de données fonctionnelle.
API documentée.
Application web fonctionnelle.
Tests réalisés.
README d'installation.
Documentation technique.
Documentation utilisateur simplifiée.
Présentation finale.
Rapport de stage.
Ces livrables sont explicitement listés dans le document initial.

## 26. Plan de réalisation
Sprint | Contenu | Cible
---|---|---
0A | Fondation produit, rôles, MVP, UX | Contrat fonctionnel
0B | DB, architecture, repo, CI | Fondation technique
1 | Inscription, vérification, session, rôles, profils/Sites selon backlog | Accès sécurisé
2 | Signalement, vérification, localisation, photo | Premier vertical slice
3 | Liste, recherche, filtres, détail, commentaires, historique | Consultation
4 | Assignment, acceptation, réaffectation, états | Boucle opérationnelle
5 | Carte et géolocalisation | Vue géographique
6 | Monitoring et KPI | Pilotage
7 | Tests, sécurité, bug bash | MVP validé
8 | Documentation et livraison | Produit livrable
Les jalons Linear actuels ciblent progressivement la période août-octobre 2026, avec une date projet au 31 octobre 2026.

## 27. Critères de recette
Un utilisateur peut créer et vérifier son compte.
Un utilisateur vérifié peut se connecter.
Les rôles sont réellement appliqués côté serveur.
Un utilisateur peut créer un signalement complet respectant les règles de validation (section 12).
La localisation fonctionne manuellement et/ou par géolocalisation disponible.
Le rapport original devient immuable.
Administrator peut trier et affecter.
Responsable peut accepter ou demander réaffectation.
Responsable peut publier progression et résolution.
Administrator peut vérifier, rejeter ou clôturer une résolution.
Les frontières organisationnelles sont respectées dans tous les scénarios adverses testés (section 21.2).
Les listes et détails respectent les rôles.
L'historique reconstruit les événements importants.
Les notifications critiques fonctionnent et ne sont jamais dupliquées.
La carte respecte les autorisations.
Les KPI sont organisationnels.
Les pièces jointes respectent les contraintes de type et de taille et ne sont accessibles que via URL signée.
Les tests critiques passent, y compris les cas de concurrence (T-11).
CI passe.
Documentation permet l'installation et l'évaluation.

## 28. Hors périmètre
Affectation automatique par IA.
Machine learning.
Optimisation complexe.
Tracking temps réel.
Geofencing.
Routing avancé.
GIS avancé.
Clustering complexe.
SLA/escalades complexes.
Microservices.
Kafka ou bus distribué.
Redis comme composant obligatoire.
Kubernetes.
Data warehouse/BI.
Analytics prédictives.
Super Administrator.
SSO/MFA avancés sauf besoin justifié.
Infrastructure de fichiers disproportionnée.
Album multi-photos par incident (au-delà d'une photo, cf. RM-20).
Canaux de notification externes (email/SMS/push) au-delà de la notification in-app.

## 29. Traçabilité Linear
Issue | Domaine | Correspondance
---|---|---
GIT-5 | RBAC | Permissions et frontières d'accès
GIT-6 | Scope | Périmètre MVP
GIT-7 | Lifecycle | États de l'incident
GIT-8 | Data model | Entités et invariants
GIT-9 | Architecture | Stack et conventions
GIT-10 | Foundation | Repo, CI, scripts
GIT-11 | UX | Parcours par rôle
GIT-12 | Workflow | Definition of Done
GIT-13 | Registration | Association/vérification
GIT-14 | Responsable | Gestion de profils
GIT-15 | Sites | Gestion organisation/Sites
GIT-16 | Reporting | Signalement
GIT-17 | Triage | Qualification
GIT-18 | Eligibility | Recommandation
GIT-19 | Acceptance | Prise en charge
GIT-20 | Access model | Spécialités/Sites
GIT-22 | Audit | Historique canonique
GIT-24 | Progress | Mises à jour
GIT-25 | Monitoring | Centre opérationnel
GIT-26 | Closure | Résolution/clôture
GIT-27 | Notifications | Événements
GIT-28 | Map | Vue géographique
GIT-29 | Operations | Audit/observabilité/récupération
GIT-30 | Security | Validation finale
GIT-31 | Deployment | Release
GIT-34 | Attachments | Photo
GIT-35 | Consultation | Liste/recherche/filtres
GIT-36 | Detail | Workspace
GIT-37 | Comments | Commentaires
GIT-39 | Assignment | Affectation
GIT-40 | Workflow | Transitions
GIT-42 | Dashboard | KPI
GIT-43 | Testing | Unit/integration/E2E
GIT-44 | Acceptance | Bug bash
GIT-45 | Docs | Documentation technique
GIT-46 | Docs | Documentation utilisateur
Les issues historiques annulées/superseded ne doivent pas créer de fonctionnalités concurrentes. Le backlog actuel conserve notamment GIT-16 comme canonique pour le signalement, GIT-22 pour l'historique et GIT-35/GIT-36 pour la consultation.

## 30. État actuel du dépôt
Cette section ne constitue pas la cible fonctionnelle ; elle indique le niveau d'implémentation observé au moment de la rédaction.
Zone | État observé | Lecture
---|---|---
Repository | Monorepo pnpm frontend/backend | Fondation disponible
Backend | Express/TypeScript avec /health | API métier à développer
Frontend | React/TypeScript avec shell minimal | UI métier à développer
Prisma | Schéma domaine riche | Modèle préparé
Authorization | Module + tests de frontières | Base de sécurité à préserver
CI | Install, Prisma generate, lint, typecheck, tests, build | Barrière qualité disponible
Git | main sur merge PR #5 | Dernière implémentation observée : durcissement authorization
Le dernier commit observé sur main est 8b8fa193, merge de PR #5 consacré à l'autorisation organisationnelle. Le dépôt est donc encore principalement au stade de fondation, tandis que le cahier des charges décrit le produit cible.
Linear indique actuellement GIT-13 et GIT-32 comme Done, alors que le dépôt observé reste très précoce sur l'interface et les routes métier. Toute implémentation doit donc vérifier le code réel plutôt que déduire la complétude uniquement du statut Linear.

## 31. Glossaire
Terme | Définition
---|---
Organization | Tenant logique principal.
Site | Lieu opérationnel.
User | Acteur pouvant signaler et consulter ses incidents.
Responsable | Acteur opérationnel chargé des interventions affectées.
Administrator | Autorité administrative et de clôture.
RBAC | Contrôle d'accès basé sur les rôles.
Tenant isolation | Séparation des données et permissions entre organisations.
Incident | Signalement transformé en dossier opérationnel.
Assignment | Affectation d'un incident à un Responsable.
ProgressUpdate | Mise à jour structurée de l'intervention.
Comment | Message contextuel attribué.
Attachment | Référence/métadonnées d'un fichier.
AuditEvent | Événement immuable d'historique.
Triage | Qualification administrative.
Verrouillage optimiste | Contrôle de concurrence par comparaison de version/date de mise à jour plutôt que par verrou base de données bloquant.
Idempotence | Propriété d'une opération dont la répétition n'a pas d'effet supplémentaire au-delà du premier appel réussi.
MVP | Périmètre minimal permettant de démontrer la boucle complète.

## Annexe A. Matrice de permissions
Action | User | Responsable | Administrator
---|---|---|---
Créer incident | Oui, si vérifié | Oui si rôle User cumulé | Non nécessaire au parcours principal
Lire ses incidents | Oui | Oui si User cumulé | Oui
Lire incident affecté | Non par défaut | Oui | Oui
Lire tous incidents org | Non | Non | Oui
Modifier rapport original | Non | Non | Non
Trier | Non | Non | Oui
Affecter | Non | Non | Oui
Accepter affectation | Non | Oui | Non
Demander réaffectation | Non | Oui | Non
Publier ProgressUpdate | Non | Oui sur affectation active | Lecture
Soumettre résolution | Non | Oui sur affectation active | Vérification / rejet
Clôturer | Non | Non | Oui
Gérer Sites | Non | Non | Oui
Gérer profil Responsable | Non | Non | Oui
Consulter pièce jointe d'un incident | Si propriétaire | Si affecté | Oui, dans son organisation

## Annexe B. Trace d'une requête de création d'incident
Le navigateur envoie POST vers l'API.
Express reçoit la requête.
Le middleware d'authentification identifie l'utilisateur.
Le serveur récupère son membership organisationnel fiable.
Le serveur vérifie que le compte est vérifié.
Les données entrantes sont validées (section 12).
Le Site demandé est recherché dans le tenant.
L'autorisation confirme que le reporter peut créer sur ce Site.
Le service crée l'Incident et son état initial.
Le signalement original est conservé comme donnée immuable.
Un AuditEvent est créé dans la même transaction (RM-37).
Une notification est planifiée après la transaction (RM-29).
Prisma persiste les données dans PostgreSQL.
L'API renvoie la réponse.
Le frontend met à jour l'interface.

## Annexe C. Règle de gouvernance du projet
Linear constitue le référentiel de portée et de livraison. GitHub constitue le référentiel de code réellement livré. Le cahier des charges constitue le référentiel consolidé des besoins et règles du produit. Une fonctionnalité est considérée comme réellement implémentée uniquement lorsque le code, les tests et les critères d'acceptation concordent.

## Annexe D. Exemples de payloads API

D.1 Création d'un incident: requête
POST /incidents
{"siteId": "b3c1...","title": "Eclairage defectueux allee B","description": "Trois lampadaires eteints depuis deux jours.","category": "LIGHTING","priority": "MEDIUM","latitude": 4.0511,"longitude": 9.7679}

D.2 Création d'un incident: réponse
201 Created
{"id": "9f2a...","status": "NEW","title": "Eclairage defectueux allee B","siteId": "b3c1...","createdAt": "2026-09-03T10:15:00Z"}

D.3 Erreur de validation: exemple
400 Bad Request
{"error": {"code": "VALIDATION_ERROR","message": "Le titre doit contenir entre 5 et 150 caracteres."}}

D.4 Conflit de concurrence: exemple
409 Conflict
{"error": {"code": "CONFLICT_CONCURRENT_UPDATE","message": "Cet incident a deja une affectation active."}}
Cahier_des_Charges.md
Displaying Cahier_des_Charges.md.