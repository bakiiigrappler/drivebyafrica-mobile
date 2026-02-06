# Driveby Africa Mobile

Application mobile React Native (Expo) pour la plateforme Driveby Africa.

## Installation

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Puis remplir les valeurs dans .env
```

## Développement

```bash
# Lancer l'application
npm start

# Lancer sur Android
npm run android

# Lancer sur iOS
npm run ios
```

## Structure du Projet

```
mobile-drivebyafrica/
├── app/                    # Écrans (Expo Router)
│   ├── (tabs)/            # Navigation par onglets
│   ├── (auth)/            # Écrans d'authentification
│   ├── vehicle/           # Détails véhicule
│   └── order/             # Détails commande
├── components/            # Composants React
│   ├── ui/               # Composants UI de base
│   ├── vehicles/         # Composants véhicules
│   └── orders/           # Composants commandes
├── hooks/                # Hooks personnalisés
├── lib/                  # Utilitaires (Supabase, etc.)
├── store/                # État global (Zustand)
├── types/                # Types TypeScript
└── constants/            # Couleurs, constantes
```

## Fonctionnalités

- Catalogue de véhicules avec filtres
- Gestion des favoris
- Suivi des commandes
- Notifications
- Profil utilisateur
- Authentification (Email/Mot de passe)

## Technologies

- React Native 0.76
- Expo SDK 52
- Expo Router 4
- Supabase
- Zustand
- TanStack React Query
