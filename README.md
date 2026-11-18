# VELMARA: Streets of Gold

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/mmr9759/gta6-01-v4/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/mmr9759/gta6-01-v4/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game for the make.fun **gta6-01** bounty — built from scratch in plain HTML5 Canvas + JavaScript, no libraries, no network requests, no Rockstar/GTA assets.

You are **Riko Vale**, fresh out and hungry in the sun-soaked city of **Velmara** (3600×2600, eight districts from the Old Port to Palm Court). Steal cars, run taxi fares, dodge the Velmara PD, and work five chained story missions from Mara Voss and Dante Cole — from a first pickup at the docks to the final gold run across the whole city.

## What is in the game

- **Open world on foot and by car** — 6 original car models (Comet Sedan, Aurora GT, Falcon S, City Cab, Hauler Van, Luxor Coupe), traffic that follows the road graph, 42 pedestrians, parks, beaches and a marina.
- **Wanted system 0–5 stars** — stealing cars, shooting, hitting pedestrians and ramming police raise the heat; patrol cars chase along the roads and foot cops try to bust you. Hide and the heat cools off.
- **5 chained missions + taxi fares** — each with a gold marker, a guide arrow and a cash reward ($400 → $1,500); taxi autopilot follows the road graph to the fare.
- **Combat** — mouse-aim shooting, punching, car ramming, bullets, particles, wrecked cars.
- **HUD + minimap** — cash, health bar, five big wanted stars, mission objective banner, and a 220×160 live minimap with the mission marker, police blips and a day/night clock.
- **Day/night cycle** — dusk and night darken the city, headlights and street glow come on.
- **Synthesised audio** — WebAudio engine hum, sirens, gunshots, cash chimes and a bassline groove. No audio files.
- **Save** — cash, mission progress, wanted level and position autosave to localStorage every 5 seconds.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot, drive in a car |
| Shift | Run |
| E | Enter / exit a car (parked cars are there for the taking) |
| Mouse click | Shoot (on foot) |
| F | Punch |
| Space | Handbrake |
| G | Taxi autopilot to the mission marker |
| M | Mute · P pause · R respawn after Busted/Wasted |

## Play it

Serve `game/` with any static file server and open `index.html` in desktop Chrome — for example `node serve.ts` if present, or `python3 -m http.server` inside `game/`.

## Files

- `game/src/config.js` — tuning, car models, mission definitions, districts
- `game/src/world.js` — city generation, road graph, two-circle building collision
- `game/src/missions.js` — the five-mission story chain and taxi fares
- `game/src/police.js` — wanted stars, patrol cars, foot cops, busts
- `game/src/render.js` — city, cars, HUD, minimap, day/night, title screen
- `game/src/audio.js` — synthesised WebAudio sounds and music
- `game/src/main.js` — game loop, input, driving, combat, save/load
- `main.ts` — the entry program: copies `game/` + `screenshots/` to `/output` and writes `dossier.json`

Everything — city, characters, vehicles, names, story, art, sounds and music — is original.
