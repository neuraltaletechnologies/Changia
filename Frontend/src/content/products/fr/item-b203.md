---
title: 'Don par poussée instantanée'
description: 'MVP Module 3'
main:
  id: 3
  content: |
    Le module 3 prend en charge la collecte de terrain. Un responsable de campagne parle à un donateur potentiel, obtient son accord sur un montant, saisit le numéro de téléphone du donateur et le montant, puis envoie une demande de paiement. Le donateur reçoit l'invite autorisée de la passerelle mobile money et ne confirme qu'avec son PIN.
  imgCard: '@/images/product-image-3.avif'
  imgMain: '@/images/product-image-main-3.avif'
  imgAlt: 'Responsable envoyant une demande de don par poussée depuis un téléphone'
tabs:
  - id: 'tabs-with-card-item-1'
    dataTab: '#tabs-with-card-1'
    title: 'Description'
  - id: 'tabs-with-card-item-2'
    dataTab: '#tabs-with-card-2'
    title: 'Périmètre'
  - id: 'tabs-with-card-item-3'
    dataTab: '#tabs-with-card-3'
    title: 'Acceptation'
longDescription:
  title: 'Une collecte qui va à la rencontre du donateur'
  subTitle: |
    Changia ne stocke, ne voit et ne demande jamais le PIN mobile money d'un donateur. Le PIN n'est saisi que dans l'invite contrôlée par l'opérateur ou la passerelle, et aucun don n'est enregistré tant qu'un callback vérifié n'a pas confirmé le succès.
  btnTitle: 'Contactez l’équipe pour en savoir plus'
  btnURL: '#'
descriptionList:
  - title: 'Espace de travail du responsable'
    subTitle: 'Liste des campagnes assignées, progression des campagnes et synthèse de performance du responsable.'
  - title: 'Recherche et capture de donateurs'
    subTitle: "Recherchez dans la base, sélectionnez un donateur existant ou ajoutez-en un nouveau avec un statut de consentement enregistré."
  - title: 'Formulaire de demande par poussée'
    subTitle: 'Campagne, téléphone du donateur, nom facultatif, montant convenu et confirmation avant envoi, avec renvoi contrôlé.'
specificationsLeft:
  - title: 'Statut de la demande'
    subTitle: 'En attente, réussie, échouée, expirée ou annulée ; le renvoi est contrôlé pour éviter les doublons.'
  - title: 'Consentement et règles'
    subTitle: "Le responsable enregistre l'accord ; il ne peut pas demander au-delà des règles de campagne ni hors des campagnes assignées."
  - title: 'Anti-harcèlement'
    subTitle: "Une limite de débit et un délai de refroidissement entre les demandes évitent le harcèlement et les tentatives en double."
  - title: 'Reçus et progression'
    subTitle: 'Remerciement/reçu après succès et mise à jour de la progression via le canal autorisé.'
specificationsRight:
  - title: 'Rapports du responsable'
    subTitle: 'Ses propres demandes, taux de réussite, montants collectés et totaux quotidiens ou par campagne assignée.'
  - title: 'Sécurité'
    subTitle: "Aucun accès aux retraits par les responsables ; les demandes ne peuvent être révoquées que par annulation."
  - title: "Piste d'audit"
    subTitle: "Identité du responsable, horodatage, campagne, montant demandé, numéro du donateur et références de la passerelle sont enregistrés."
  - title: 'Coût recommandé'
    subTitle: "TZS 200 000 en développement unique ; l'onboarding marchand et le KYC de la passerelle sont fournis par le client."
tableData:
  - feature: ['Spécification', 'Valeur']
    description:
      - ['Frais de développement', 'TZS 200 000']
      - ['Résultat principal', 'Don par poussée piloté par le responsable avec callback vérifié']
      - ['Facturation', 'Une fois, par module approuvé']
      - ['Dépendance', 'Capacité de poussée de la passerelle et onboarding marchand']
      - ['Acceptation', 'Test vérifié compté exactement une fois']
blueprints:
  first: '@/images/blueprint-1.avif'
  second: '@/images/blueprint-2.avif'
---