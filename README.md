# 🇫🇷 GeoGuessr France (clone perso)

Un petit projet perso qui recrée l’expérience de **GeoGuessr**, mais **uniquement en France**.  
Le joueur est placé aléatoirement dans Google Street View (majoritairement en villes/villages, parfois en campagne),  
puis doit deviner la localisation en cliquant sur une **mini-carte**.  
Un score est calculé en fonction de la distance entre la vraie position et la supposition.

---

## ✨ Fonctionnalités

- 🗺️ **Street View plein écran** (API Google Maps JS).
- 📍 **Mini-carte interactive** en bas à droite (guess + markers).
- 🔎 **Spawn aléatoire en France** :
  - 85 % des cas → villes/villages,
  - 15 % des cas → routes perdues.
- 🎯 **Validation** :
  - Affiche la vraie position et la devinette,
  - Calcule la **distance** et le **score (0–5000)**.
- 📊 **Écran résultat** avec carte récap et bouton *Manche suivante*.
- 🎨 Thème sombre moderne (sobre et épuré).

---

## ⚙️ Stack technique

- [React + Vite](https://vitejs.dev/) ⚡
- [TypeScript](https://www.typescriptlang.org/)
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
  - Street View
  - Maps
- CSS pur (custom, thème sombre)

---

## 🚀 Installation

### 1. Cloner le repo
```bash
git clone https://github.com/ton-pseudo/geoguessr-fr.git
cd geoguessr-fr
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Ajouter ta clé Google Maps
Crée un fichier `.env` à la racine :

```env
VITE_GOOGLE_MAPS_API_KEY=ta_cle_google
```

> ⚠️ Active bien les **APIs Google Maps JavaScript** et **Street View** dans la [Google Cloud Console](https://console.cloud.google.com/).

### 4. Lancer le projet
```bash
npm run dev
```

Le projet sera disponible sur `http://localhost:5173/`.

---

## 🏗️ Améliorations prévues

- [ ] Mode “5 manches” avec total des scores.
- [ ] Timer pour chaque manche ⏱️
- [ ] Classement / leaderboard (optionnel).
- [ ] Mode “déplacements interdits” ou “chrono”.
- [ ] Améliorer le pool de villes pour + de variété.

---

## 📄 Licence

Projet perso à but d’apprentissage.  
**Usage personnel uniquement** (les APIs Google Maps/Street View sont soumises aux conditions de Google).