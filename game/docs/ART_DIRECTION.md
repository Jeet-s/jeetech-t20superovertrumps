# Art direction — T20 Super Over Trumps: Cricket Card Duels

Target: .agf/art/target.png (vs big-studio games EA SPORTS FC Soccer Mobile 27 -0.5, Top Eleven Be a Soccer Manager +1, Cricket League +1.5 → net +0.7 (need ≥ 0)). Every screen must look like it.

## Style
Premium stadium-night cartoon-realism: chunky, semi-stylised cricketer avatars and objects rendered with soft cel-shaded volumes plus glossy painterly highlights, in the vein of EA FC Mobile card polish and Clash Royale toy-like materials. Thick deep-navy outer outlines (3-4px at 1080 wide) with thinner inner colour-keyed lines, rounded corners everywhere, and bevelled, embossed surfaces. Lighting is a warm golden-hour key from top-left with cool teal-blue rim light from stadium floodlights behind; floodlight bokeh, lens-flare streaks and a faint haze give depth. Materials: lacquered red cricket-ball leather with stitched cream seams, polished gold trims with specular streaks, brushed navy enamel card faces, frosted glass HUD plates, striped mown-grass velvet for the table. Foil holographic sheen sweeps across rare cards. Shading is three-tone with a soft ambient-occlusion gradient and drop shadows that lift cards off the pitch. Mood: electric, celebratory, competitive yet friendly (Everyone-rated, no violence); saturated but disciplined colour, one hero focal point per screen, generous negative space, high-contrast legible numerals, colour-blind-safe icon shapes paired with every colour cue.

## Palette
#0B1F4B #C8102E #F5B82E #1F9D55 #2E8BFF #FFF4D6

UI kit tokens (src/ui/theme.ts): {"primary":"#C8102E","primaryDark":"#8E0A20","secondary":"#2E8BFF","secondaryDark":"#1654B8","accent":"#F5B82E","accentDark":"#B87A0A","bgTop":"#12306E","bgBottom":"#0A1A12","ink":"#0B1F4B"}

## Screen spec
- **background**: Dusk floodlit cricket stadium, blurred crowd with bokeh lights, deep navy sky fading to green outfield; a darkened vignette and subtle gradient keep the centre calm. Slow parallax drift on light beams.
- **board**: The duel table is a mown-grass felt pitch with alternating light/dark stripes and cream crease lines, bevelled gold-edged rim; the opponent card zone at top, the player's card zone at centre-bottom, with a centre pot slot glowing when a tie is carried. Aggression swipe zones appear as a subtle up flame chevron (red, with flame icon) and a down shield chevron (blue, with shield icon).
- **pieces**: Cards are portrait rounded rectangles with navy enamel body, gold bevelled frame, a large avatar window with team-neutral colour backdrop and rarity-coloured foil, a role icon badge, and six stat rows (each with icon, label and bold numeral) as chunky pill bars. Rarity tiers by frame: bronze, silver, gold, platinum holo. The selected stat row glows gold with a pulsing outline; the winning stat turns green with a tick, the losing one red with a cross. The hidden opponent card shows a navy back with a gold ball crest.
- **hud**: Top scoreboard strip in frosted navy glass with gold rim: both run totals in large numerals, the over label, and 6 ball-tracker pips (filled red = won, blue = lost, gold = tie pot, hollow = pending, each with a distinct shape). Corner pause button and coin/gem pills with glossy icons. The power-card tray sits at the bottom as three round-cornered slots with icons and use counters; a circular emote button sits at bottom right.
- **buttons**: Chunky pill buttons with a 3D lip: primary red with a gold top highlight and a 6px darker base, secondary blue, accent gold for rewards. Glossy top-half sheen, navy outline, inner stroke, pressed state sinks 4px with a darkened tone. Minimum 48dp target. Icons accompany all colour-coded states.
- **typography**: Heavy condensed italic display face for titles and numerals (sports-broadcast feel) with a gold-to-cream gradient fill, navy outline and drop shadow; a clean rounded humanist sans for body and stat labels in cream on navy. Large tabular numerals for stats.
- **popups**: Rounded navy panels with a gold bevelled border, a ribbon header, soft dark scrim behind with blur, and a pop-in with overshoot. A reward popup features a radial sunburst behind the item, with a gold CTA button. The pack-odds panel is a clear, legible table.
- **fx**: Aggressive swipe: red-orange flame trail and glow around the card. Safe swipe: blue hex shield shimmer. Winning stat: gold spark burst plus a cartoon run-number pop (1/2/3/4/6) with confetti on 4 and 6. Wicket: stumps tumble in a puff of dust, shown as a cartoon with no violence. Pot: swirling golden ring. Pack reveals: light rays, rarity-colour flash, foil glint sweep.
- **motion**: Snappy 150-250ms ease-out transitions; cards flip in 3D with a slight bounce, the stat comparison counts up as the numbers tick, the margin bar slides to convert to runs; screen shake only on sixes and wickets (small); idle cards breathe with a subtle float and foil shimmer; haptic ticks on tap, confirm and result.

## Assets (assets/art, indexed in src/art.ts)
- `bg_stadium_dusk` (background, 1080x1920): Duel and home background
- `bg_gully_golden` (background, 1080x1920): Splash, ladder chapter 1 and tutorial
- `bg_trophy_night` (background, 1080x1920): Results, pack opening and season track
- `card_face_frame` (ui, 359x512): Player card frame template
- `card_back` (ui, 363x512): Hidden opponent card and deck piles
- `rarity_foil_overlay` (fx, 497x512): Platinum and gold holo overlay on rare cards
- `pitch_table_board` (ui, 512x417): Duel board surface and tray
- `hud_scoreboard_plate` (ui, 512x376): Top scoreboard strip
- `ball_pip_set` (sprite, 512x140): Ball tracker states
- `btn_primary_red` (ui, 512x289): Primary CTA button plate
- `btn_secondary_blue` (ui, 512x341): Secondary button plate
- `icon_power_cards` (ui, 512x253): Power card tray icons
- `icon_rewards` (sprite, 512x512): Reward icons
- `fx_aggressive_flame` (fx, 368x512): Aggressive swipe trail
- `fx_safe_shield` (fx, 434x512): Safe swipe shimmer
- `hero_ballie_key_art` (character, 512x445): Title screen hero key art
- `logo` (ui, 900x467): the game logo — title/home screen and anywhere the name appears
