# Store facts — T20 Super Over Trumps (only what the code does)

Summary: a cricket trump-card duel game. 60 handcrafted rival duels in 6 chapters, 121 cricketer cards with real T20I/ODI/Test career stats (stats as of 2025-06-30), stat-pick duels of one 6-ball over with a Super Over tiebreak, Aggressive/Safe stances, power cards, format weights, earned packs with visible odds.

- Ladder: 60 handcrafted rival duels in 6 chapters of 10 (Gully Greens, Aggro Alley, Power Pavilion, Format Fortress, Twist Town, Grand Super Series) — src/game/specs.ts, src/game/units.json
- Duel: one 6-ball over per hand of 6 cards; balls alternate callers; pick 1 of 6 stats (Runs, Average, Strike Rate, Wickets, Economy, Catches); margin bands pay 1/2/3/4/6 runs; ties go to a 2-run pot — src/game/duel.ts, src/game/cards.ts
- Super Over: tied duels go to a 3-ball Super Over with a deterministic final tiebreak — src/game/duel.ts
- Stances: Aggressive (win x2; loss gives +2 and a wicket) and Safe (win capped at 2; loss gives 1) — src/game/duel.ts
- Power cards: Free Hit, Review, Powerplay (one use each per duel) and Wildcard stat swap (once per over) — src/game/duel.ts
- Formats: T20, ODI and Test careers with different stat weights; Captain bonus +15% on a card's signature stat — src/game/cards.ts, src/game/duel.ts
- Twists: Fog of War (rival's called card face-down), Mega Pot (ties stack up to 8 runs), target chases with a wicket limit, two-over and best-of-three-over boss duels — src/game/duel.ts, src/game/specs.ts
- Rival AI: 5 personalities (Balanced, Cautious, Gambler, Aggro, Baiter) with a public swipe rule each, plus readable modifiers on some rivals (Ace Swing: its ace is always swiped Aggressive; Scripted Swipes: a fixed stance pattern each over); skill rises from 0.20 to about 0.95 along the ladder; it uses only public information — src/game/duel.ts
- Cards: 121 international cricketers from 10 countries, cartoon avatars, altered name spellings, rarity common/rare/epic/legendary, every card shows "stats as of 2025-06-30" — data/cricketerStats.json, src/game/cards.ts
- Stars: 1-3 per rival (win, the rival's margin goal, its mastery goal), 180 in total; chapter star chests at 10/20/30 stars — src/game/duel.ts, src/game/economy.ts
- Packs: earned only (never sold); 4 kinds (Gully 3 cards, Club 4, Pro 5, Legend 5) with visible odds; pity: a rare+ at least every 5 packs, an epic+ at least every 20 — src/game/economy.ts
- Form: duplicate cards give Form Points → Bronze/Silver/Gold/Platinum (+0/2/3.5/5% in ladder play) — src/game/economy.ts
- Daily Chase: one seeded hand, rival and run target per date, the same for every player — src/game/economy.ts
- Streaks: daily login rewards (60-180 coins) with a Club Pack every 7th day; win-streak coin multiplier up to x2 — src/game/economy.ts, src/screens/DailyScreen.tsx
- Quick Duel vs AI from your 12-card deck (6 dealt per duel) — src/game/economy.ts, src/screens/DeckScreen.tsx
- Online Quick Duel: finds a real opponent for up to 8 s, otherwise an AI rival plays; live duels between two people use fair power-matched hands and plain T20I stats; 8 fixed emotes, no chat — src/screens/OnlineScreen.tsx, src/screens/PvpScreen.tsx, src/game/pvp.ts
- Room codes: create a room and share its 6-character code, or join a friend's code from an on-screen keypad — src/screens/OnlineScreen.tsx
- Leaderboards: today's Daily Chase board and a most-wins board (online) — src/screens/DailyScreen.tsx, src/screens/OnlineScreen.tsx
- Deck builder: 12-card deck from your collection (tap a slot, tap a card) and a captain ("Make captain" on a deck slot or in the card sheet; gold "C" badge; defaults to the deck's strongest card); the captain is always dealt in Quick Duels and gets +15% on their signature stat — src/screens/DeckScreen.tsx, src/game/meta.ts, src/game/economy.ts
- Albums: 10 country pages; a completed page pays 300 coins + a Pro Pack — src/screens/AlbumScreen.tsx, src/game/meta.ts
- Card detail: T20I / ODI / Test tabs (matches, runs, average, strike rate, high score, 100s/50s, wickets, bowling average, economy, best bowling, catches), the stats-as-of line and the card's Form tier — src/components/CardDetail.tsx
- Pack opening: reveal ceremony card by card, visible odds table, pity counters, 1 free Gully Pack per rewarded video (up to 3 a day) — src/screens/PacksScreen.tsx
- Shop: a Remove Ads row at the top (store price, one-time; hidden once bought), 4 direct-buy cards a day at fixed coin prices (300/900/2500/6000 by rarity), coin bundles from the store (500 / 3000 coins), 50 free coins per rewarded video, Restore purchases with an on-screen result — src/screens/ShopScreen.tsx
- Season Track: 30-day seasons with 25 tiers (60 Season Points each); SP from play (ladder win 20 + 10 per star, other wins 20, Daily Chase 15, album page 50, daily reward 10, lost duel 5); a Free lane (coins, Gully/Club/Pro Packs, Form Points for your captain) and a Star lane with bigger rewards (up to a Legend Pack) that opens at 30 ladder stars — never sold — src/screens/SeasonScreen.tsx, src/game/economy.ts, src/game/meta.ts
- Duel screen aids: each stat row shows how many of the rival's remaining cards it beats; the rival's deck strip greys out spent cards; answers preview win/lose before you commit; a coach line on every rule-teaching rival; tutorial hand on rivals 1-2 — src/screens/DuelScreen.tsx
- Coach hint (rewarded video) highlights the best card and stat; after 3 losses in a row the next ladder duel gives a free Review — src/screens/DuelScreen.tsx, src/game/duelView.ts
- Settings: sound, music, vibration, colour-blind mode, reduced motion, daily reminders, share, restore purchases, privacy policy — src/ui/SettingsPopup.tsx
