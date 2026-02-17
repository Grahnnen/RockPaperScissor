# RockPaperScissor

A real-time multiplayer Rock Paper Scissors game with an RPG-inspired interface.  
This project uses Firebase Realtime Database for multiplayer synchronization and vanilla JavaScript for all client logic.

---

## Features

- Real-time multiplayer using Firebase Realtime Database  
- Room-based matchmaking with shareable room codes  
- Lobby screen with name and avatar selection  
- Turn-based gameplay with synchronized results  
- Round and match history panels  
- Automatic room cleanup when the host disconnects  
- Persistent player profile using `localStorage`  
- Runs entirely in the browser (no backend server)

---

## Live Demo

https://Grahnnen.github.io/RockPaperScissor/

---

## How It Works

1. A player enters a name and selects an avatar.
2. The player creates a room or joins one using a room code.
3. Both players submit a choice (rock, paper, or scissors).
4. The host resolves the round and writes the result to Firebase.
5. Both players receive the update and see the outcome.
6. Rounds continue until match end.

---

## Technical Stack

- **Frontend:** HTML, CSS, JavaScript  
- **Realtime Backend:** Firebase Realtime Database  
- **Hosting:** GitHub Pages  
- No backend server or build tools required

---

## Installation (Local Development)

To run locally:

1. Clone the repository:
   ```sh
   git clone https://github.com/Grahnnen/RockPaperScissor.git
Open index.html in a browser.

Enter your Firebase config in the <script> near the top of index.html.

Enable Realtime Database in the Firebase Console and set appropriate rules.

Start creating and joining rooms.

No build step required.

## Firebase Setup
Your project currently includes sample Firebase configuration files (firebase.json and database.rules.json).
Make sure:

Realtime Database is enabled.

Rules allow read/write access for testing.

Realtime Database URL matches the one in index.html. 

## Notes
This is an educational/demo project.

Client-side Firebase config is visible by design.

No authentication is used; rooms are temporary and removed automatically. 

## Author
Robin (Grahnnen) — System Development student focusing on frontend and real-time web applications.
