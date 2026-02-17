Rock Paper Scissors – RPG Multiplayer

A real-time multiplayer Rock Paper Scissors game with an RPG-inspired interface, built using vanilla JavaScript and Firebase Realtime Database.

The project focuses on real-time state synchronization, client-side architecture, and UI/UX design rather than complex game mechanics.

Features

Real-time multiplayer using Firebase Realtime Database

Room-based matchmaking with shareable room codes

Lobby screen with name and avatar selection

Turn-based gameplay with synchronized results

Match and round history tracking

Automatic room cleanup when the host disconnects

Persistent player profile using localStorage

Fully client-side application

Technical Overview

Frontend: HTML, CSS, Vanilla JavaScript
Realtime Backend: Firebase Realtime Database
Hosting: GitHub Pages

Architecture highlights:

Lobby logic separated from game logic

Firebase used as the single source of truth

Host-authoritative round resolution

Presence tracking via Firebase .info/connected

How to Play

Open the game in your browser

Enter a player name and select an avatar

Create a match or join one using a room code

Both players choose Rock, Paper, or Scissors

Results are revealed simultaneously

After the final round, start a new match or leave the room

Live Demo

https://Grahnnen.github.io/RockPaperScissor/

Project Structure
images/
style.css
firebase.js
lobby.js
game.js
index.html

Notes

This project is intended for educational purposes

Firebase API keys are exposed by design for client-side applications

No authentication is used; rooms are temporary and auto-cleaned

Author

Robin
System Development student focusing on frontend and real-time web applications
