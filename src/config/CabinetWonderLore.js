const NEW_ART_ROOT = '/art/generated/nova-swarm/vfx/cabinet-wonders';

function wonder(id, title, signalClass, history, fieldNote, {
  palette = [0x7df9ff, 0xb6a1ff, 0xff70d7],
  pitchScale = 1,
  art = `${NEW_ART_ROOT}/nova-wonder-${id.replaceAll('_', '-')}-20260725.png`
} = {}) {
  return Object.freeze({
    id,
    title,
    signalClass,
    history,
    fieldNote,
    palette: Object.freeze(palette),
    pitchScale,
    art
  });
}

export const CABINET_WONDER_DEFINITIONS = Object.freeze([
  wonder(
    'ghost_fleet_salute',
    'The Last Salute',
    'Orphaned fleet memory',
    `No registry admits the fleet existed. It appears without drive signatures: six translucent warships in the parade formation of the vanished Helios Guard, bows turned away from battle. The Guard disappeared while escorting three thousand refugee sleepers through the Verona Fold. Their final transmission contained no distress call, only every ship's bell sounding once.

When the fleet crosses a live combat lane, the phantoms salute the Cabinet rather than the pilot. Black-box analysis found names etched inside their light—passengers born decades after the disappearance. Either the Guard is still carrying its people somewhere time cannot reach, or the salute is being sent backward by survivors who remember being saved. No weapon has ever struck the ghosts. No pilot who returned their salute has died in that sector.`,
    'Do not fire. Hold course and return the salute.',
    {
      palette: [0x7df9ff, 0xb6a1ff, 0xff70d7],
      pitchScale: 0.92,
      art: `${NEW_ART_ROOT}/nova-wonder-ghost-fleet-salute-20260722.png`
    }
  ),
  wonder(
    'starwhale_constellation',
    'Orison of the Starwhale',
    'Migratory stellar life',
    `Old navigators insisted the dark had animals in it, vast enough to mistake centuries for heartbeats. The Starwhale was their favorite lie until Surveyor Ilyan Kreel mapped the same living constellation in seven systems on the same night. Kreel followed it for nineteen years. His last chart ends inside a blue giant with one handwritten sentence: IT IS GOING HOME.

The creature now surfaces briefly wherever the Swarm tears too many holes in local space. Its bones are lines of cold fire; dead suns glow along its spine. Instruments register a song below the frequency of gravity. Cabinet linguists slowed one phrase by a factor of nine million and heard what may be a name—or a mother calling across the age of the universe. The Starwhale never looks at the battle. It looks beyond it, toward something still farther away.`,
    'Watch the tail. Its final star points toward the safest open lane.',
    {
      palette: [0xe8fbff, 0x7df9ff, 0xffef9a],
      pitchScale: 1.08,
      art: `${NEW_ART_ROOT}/nova-wonder-starwhale-constellation-20260722.png`
    }
  ),
  wonder(
    'aurora_crown',
    'Crown of the Unclaimed',
    'Sovereignty anomaly',
    `The Crown first appeared above the throneworld of House Meridia on the night every claimant was assassinated. It hovered over the empty palace for nine minutes, bright enough to turn midnight gold, then folded itself into the polar aurora and vanished. Since then it has appeared at the fall of twelve empires. Each time, every surviving monarch dreams of taking it. Each wakes with both hands burned.

No material exists beneath the light. The jewels are captive magnetic storms, and the central arch contains a map of borders that have not been drawn yet. Swarm admirals break formation when they see it, as if receiving an older command. The Cabinet's least popular theory says the Crown is not seeking a ruler. It is patiently identifying civilizations mature enough to refuse one.`,
    'The Crown does not grant authority. It tests whether you can fly past it.',
    {
      palette: [0x66ffd1, 0x7a8cff, 0xff62d8],
      pitchScale: 1.2,
      art: `${NEW_ART_ROOT}/nova-wonder-aurora-crown-20260722.png`
    }
  ),
  wonder(
    'singularity_bloom',
    'The Black Garden',
    'Gravitational flora',
    `At the center of the Bloom is a singularity no larger than a seed. Around it grow petals of bent starlight, opening only when ships are near enough to witness them. The first expedition named it a natural lens. The second found the first expedition's faces reflected in the petals—older, peaceful, and standing beneath an unfamiliar sky.

Every opening reveals a different impossible future. In one, the Swarm never came. In another, the Cabinet is worshipped in a city built after humanity's extinction. The images cannot be recorded; cameras capture only darkness and a sound like soil being turned. Pilots remember the visions with perfect clarity until they try to describe them. Then a single detail is always missing: whether they were alive in the future they saw.`,
    'Look once. Never choose a future while under fire.',
    {
      palette: [0x9a7dff, 0xff65d8, 0x63f4ff],
      pitchScale: 0.74,
      art: `${NEW_ART_ROOT}/nova-wonder-singularity-bloom-20260722.png`
    }
  ),
  wonder(
    'celestial_koi_procession',
    'Pilgrims of the Glass River',
    'Vacuum-borne pilgrims',
    `The koi swim through vacuum along a river detectable only by instruments built before Earth lost its moon. Each fish is longer than a carrier and transparent enough to show small constellations turning beneath its scales. They travel in silence toward the ruins of Nacre Station, where the last ocean from Earth was kept in a sphere of artificial gravity.

Once every thirty-three years, the procession circles the dry station and sheds a rain of luminous scales. Inside each scale is a drop of salt water containing living plankton with no genetic ancestor on record. The Swarm refuses to enter the river while the koi are passing. Cabinet archivists believe the creatures are not mourning the stolen ocean. They are bringing pieces of other oceans to keep it company.`,
    'Cross behind the final pilgrim. The Glass River bends hostile fire away.',
    {
      palette: [0xffd36a, 0xff6fcf, 0x75f7ff],
      pitchScale: 1.14,
      art: `${NEW_ART_ROOT}/nova-wonder-celestial-koi-procession-20260722.png`
    }
  ),
  wonder(
    'prismatic_supernova',
    'The Sevenfold Dawn',
    'Impossible stellar death',
    `A supernova should happen once. The Sevenfold Dawn has happened seven times, in seven colors, around the same unbroken star. The first flash erased a Swarm armada. The second restored every ship as harmless crystal. The third made each crystal vessel transmit a childhood memory belonging to someone on the observing crew.

The star remains young and quiet between deaths. Deep scans reveal seven concentric shells moving inward rather than out, as though the explosions are returning from futures that failed to occur. A sealed Nova memorandum calls the phenomenon a rehearsal. It does not say what the star is rehearsing for. The next color is absent from every known spectrum, but pilots sometimes dream it the night before the Dawn appears.`,
    'The light is harmless to hulls. It is not harmless to certainty.',
    {
      palette: [0xffffff, 0x73efff, 0xff78d7],
      pitchScale: 1.32,
      art: `${NEW_ART_ROOT}/nova-wonder-prismatic-supernova-20260722.png`
    }
  ),
  wonder(
    'warp_cathedral',
    'Cathedral at Impossible Speed',
    'Transluminal architecture',
    `The Cathedral never slows down. It moves between systems faster than causality, yet its windows show candles burning in still air. Pilgrims who docked with it claim the nave is larger than the orbit it crosses. They heard a choir singing every mayday that had ever gone unanswered, arranged into a harmony too beautiful to forgive.

No builder left a mark. The altar is a navigation console with one destination engraved into its brass: HOME, followed by coordinates that change for every observer. Those who enter alone return minutes later, aged by exactly the number of years since they last felt safe. Those who enter together do not return at all—but new voices join the choir. The Cabinet records the structure as architecture because calling it a ship would imply someone is steering.`,
    'Admire it from the lane. Never follow the HOME coordinate.',
    {
      palette: [0x61f7ff, 0x8d7cff, 0xffd86b],
      pitchScale: 0.84,
      art: `${NEW_ART_ROOT}/nova-wonder-warp-cathedral-20260722.png`
    }
  ),
  wonder(
    'quantum_eclipse',
    'The Eclipse That Remembered',
    'Retrocausal occlusion',
    `The dark disc has no mass and blocks no ordinary light. It eclipses events. When it passes over a battlefield, one moment disappears from every recording and every mind—except the Cabinet's. The machine prints a receipt for the missing second, listing damage that never occurred and names of pilots who were never born.

During the Cinder Mutiny, the Eclipse removed the shot that began the war. Peace lasted eleven minutes before history noticed the contradiction and rebuilt the conflict around a different bullet. Since then, the phenomenon has followed the Cabinet at a respectful distance. Some engineers believe it is feeding on abandoned timelines. Others think it is returning stolen moments one at a time, and that somewhere ahead waits a second containing every life the universe edited out.`,
    'If the instruments skip, trust your position—not your memory.',
    {
      palette: [0xffc86b, 0xff5ec9, 0x79eaff],
      pitchScale: 0.68,
      art: `${NEW_ART_ROOT}/nova-wonder-quantum-eclipse-20260722.png`
    }
  ),
  wonder(
    'nebula_jellyfish',
    'The Lantern Mothers',
    'Interstellar nursery organisms',
    `They drift out of emission nebulae in groups of nine, bells filled with warm stellar gas. Within each translucent body, infant suns pulse in time with a slow electrical hymn. Early miners hunted them for fusion fuel until a wounded Mother opened and released a star that screamed across every radio band for three days.

The remaining creatures gathered the newborn and carried it beyond mapped space. Decades later, the miners' abandoned colony was found intact, warmed by a gentle blue sun that had not existed on any chart. Around it floated nine empty bells. The Cabinet now classifies the Mothers as a nursery civilization: neither animal nor machine, but caretakers older than planets. Swarm weapons go quiet in their presence. Whether from reverence or fear remains unknown.`,
    'Dim unnecessary systems. The Mothers approach calm vessels more closely.',
    {
      palette: [0x8c7dff, 0x67ffe0, 0xff78dc],
      pitchScale: 0.98,
      art: `${NEW_ART_ROOT}/nova-wonder-nebula-jellyfish-20260722.png`
    }
  ),
  wonder(
    'phoenix_comet',
    "Ashwing's Return",
    'Cyclic comet intelligence',
    `Ashwing burns through the galaxy once every eleven centuries, a bird-shaped comet whose wings contain the ashes of ruined worlds. Civilizations along its route once believed it caused extinction. The oldest surviving records say the opposite: it arrives only after a world has already chosen the fire.

When Ashwing passed dying Talassa, its tail gathered the planet's oceans as vapor and carried them into darkness. Eleven centuries later it returned, shedding rain over a barren moon where descendants of Talassa's refugees had settled. In that rain were seeds, salt, and recordings of voices lost in the evacuation. The Phoenix does not resurrect worlds. It preserves what the survivors were too broken to carry. Its next return is early. The Cabinet has not yet determined whose ashes are aboard.`,
    'Fly beneath the left wing. The wake clears a clean lane through debris.',
    {
      palette: [0xffee8a, 0xff7a57, 0xff59cb],
      pitchScale: 1.26,
      art: `${NEW_ART_ROOT}/nova-wonder-phoenix-comet-20260722.png`
    }
  ),
  wonder(
    'astral_leviathan_library',
    'The Leviathan Library',
    'Living archive megafauna',
    `The Leviathan carries a library in the luminous chambers beneath its ribs. Each chamber holds the complete memory of a species that vanished without leaving ruins. It does not collect books; it collects the final person who remembers why the books mattered.

Explorer Sera Venn entered through an open gill and found a reading room prepared in her childhood language. On its central desk lay the unwritten memoir of her future life, ending with her decision to remain aboard. Venn escaped by refusing to read the last page. The Leviathan still follows her descendants, opening the same chamber whenever one is alone. Cabinet scans now show a new shelf marked HUMANITY. It is empty, freshly dusted, and waiting.`,
    'The shelves can see curiosity. Keep your eyes on the exit.',
    { palette: [0x78f7ff, 0xb28cff, 0xffd36a], pitchScale: 0.78 }
  ),
  wonder(
    'celestial_manta_procession',
    'The Mantas of Quiet Meridian',
    'Pilgrim void fauna',
    `Every Manta bears a city of lights across its back, but no vessel has reached those cities. The creatures glide along the Quiet Meridian, a route older than the stars it connects. Their formation always leaves one empty place.

The lost survey ship Kindness attempted to occupy that place. For six minutes it flew with the procession and received transmissions from its own crew, speaking from thousands of years in the future. They begged the captain not to leave. Kindness broke away; its hull returned, empty except for a single old woman who claimed she had been the ship's youngest passenger. She died smiling before she could explain. The Mantas still keep the empty place, perfectly sized for Kindness.`,
    'Never join the formation. A vacant place can still belong to someone.',
    { palette: [0x70efff, 0x8b8cff, 0xffc66b], pitchScale: 0.94 }
  ),
  wonder(
    'void_lotus_engine',
    'The Lotus Engine',
    'Precursor creation machine',
    `The Lotus opens one petal every million years. Inside each is a mechanism that assembles a law of physics, tests it on a tiny universe, then either releases it or closes the petal forever. Gravity may be one of its successful drafts. Mercy may be another.

Nova physicist Amara Sloane watched a petal close around a universe where time moved backward. Before the seal formed, its inhabitants transmitted a warning in perfect human speech: DO NOT LET IT FINISH YOU. The Engine has since turned one unopened petal toward the Cabinet. Its inner gears match the machine's oldest components down to scratches and repair welds. Either the Cabinet was built from the Lotus—or it is the next law awaiting trial.`,
    'Do not approach the central seed. Its scale changes when measured.',
    { palette: [0x72ffd5, 0x7f8cff, 0xff63d4], pitchScale: 0.82 }
  ),
  wonder(
    'crystalline_moon_orchard',
    'The Orchard of Broken Moons',
    'Selenic cultivation site',
    `The orchard grows moons from branches of transparent stone. They begin as silver fruit, acquire craters as they ripen, then detach and drift toward star systems with empty skies. No gardener has ever been seen.

One fruit cracked before maturity and revealed an ocean, weather, and a coastal city inhabited by people who believed their moon had always existed. When the shell sealed again, every citizen looked up at the same moment. They could see the survey crew through the crystal. Months later their finished moon was planted around an uninhabited planet—yet radio telescopes still receive the city's evening broadcasts from inside it. The Cabinet suspects moons are not made here. They are rescued, memories and all, from worlds that have lost their place.`,
    'Ripe moons cast shadows before they detach. Do not occupy the shadow.',
    { palette: [0x85eaff, 0xa37dff, 0xffd477], pitchScale: 1.03 }
  ),
  wonder(
    'solar_harp_gates',
    'The Harps at Dawn Gate',
    'Heliophonic transit relic',
    `Two gates stand on opposite sides of a dead system, strung with filaments of solar wind. When a star rises anywhere in the galaxy, one string vibrates. Together they perform a dawn that never ends.

The refugee fleet Aurora passed between the Harps after ninety days without power. The music restarted every reactor and woke every sleeper, but one child heard a second melody underneath: coordinates sung in her mother's voice. Those coordinates led to a habitable world no map contained. Years later, the child returned to thank the builders. The gates played her own voice, older than she was, warning her to leave before the final chord. She obeyed. The system vanished at sunrise.`,
    'Pass on the resting beat. The bright strings are doors, not decoration.',
    { palette: [0xffd96c, 0x69f4ff, 0xc078ff], pitchScale: 1.18 }
  ),
  wonder(
    'nebula_stag_sanctuary',
    'The Stag of Nacre Veil',
    'Guardian constellation',
    `The Stag walks only where refugees are hiding. Its antlers span light-years, sheltering ships inside a moving forest of nebula dust. Pursuers lose navigation, memory, and eventually the desire to continue.

During the Nine-Moon Purge, the Stag concealed forty thousand civilians for a winter that lasted twelve seconds outside the Veil. The refugees emerged twenty years older, carrying children born beneath constellations no external observer had seen. Every child drew the same antlered figure guarding a locked white door. The oldest now dream that the door is opening. The Stag has begun appearing without refugees nearby, wounded by something that leaves no mark except missing stars.`,
    'Stay below the antlers. Whatever hunts the Stag searches above them.',
    { palette: [0x82efff, 0xa979ff, 0xffd36a], pitchScale: 0.88 }
  ),
  wonder(
    'comet_dragon_ribbon',
    'The Ribbon Dragon',
    'Cometary oath-form',
    `The Dragon is a promise made visible. Its body forms whenever two enemies swear the same impossible oath beneath a comet. It circles the witnesses until one keeps the vow or both are dead.

Admirals Kael and Veyra summoned it when they promised to evacuate a world before resuming their war. The Dragon guided every civilian ship through the minefield, then remained between the admirals' fleets. Neither would fire through it. They died of old age under an unfinished truce, and their grandchildren inherited the waiting war. The Dragon still carries the original comet in its mouth. Some nights its ribbon-body spells a final clause no translator agrees upon: perhaps FORGIVE, perhaps REMEMBER, perhaps BEGIN.`,
    `A vow has right of way. Do not cross the Dragon's loop.`,
    { palette: [0x69dcff, 0x916dff, 0xffc56a], pitchScale: 1.11 }
  ),
  wonder(
    'orbital_ring_garden',
    'Garden of the Patient Orbit',
    'Autonomous memorial habitat',
    `The Garden circles a star that went dark before humans learned its name. Every flower opens toward the missing light. Its roots weave through orbital rings, drawing warmth from memory rather than radiation.

Caretaker drones maintain one empty path from the outer gate to a bench overlooking the dead sun. On the bench is a cup that remains hot. DNA inside belongs to Lio Mar, architect of the first civilian habitat, who vanished centuries before the Garden was discovered. His private letters describe designing the place for someone who promised to meet him “after the last sunrise.” Each century the drones add another ring and widen the path. They are not preserving a grave. They are making room for the guest.`,
    'The flowers close around weapon heat. Coast through quietly.',
    { palette: [0x69ffd0, 0x6fd9ff, 0xff8bd8], pitchScale: 1.06 }
  ),
  wonder(
    'mirrored_galaxy_palace',
    'Palace of Opposite Stars',
    'Parallax sovereignty construct',
    `Every surface in the Palace reflects a different galaxy. Step left and see one where humanity conquered the Swarm. Step right and see one where no human ever evolved. The central mirror shows no reflection at all.

Queen Tamsin entered seeking a future in which her son survived. She returned with the boy beside her, healthy and laughing—but every mirror thereafter showed an empty throne and a civilization mourning the queen she had exchanged. Tamsin destroyed her own records and lived as a mechanic under another name. The boy became the finest navigator of his age. On his deathbed he confessed that the Palace had sent him not from another future, but from the central mirror. He had never cast a reflection.`,
    'Never choose the kinder mirror until you know what it considers payment.',
    { palette: [0x7eeaff, 0xc07dff, 0xffd56d], pitchScale: 0.76 }
  ),
  wonder(
    'abyssal_nautilus_oracle',
    'The Nautilus Below Night',
    'Prophetic deep-space organism',
    `The Nautilus swims beneath space, surfacing where gravity grows thin. Its shell contains chambers arranged in the order disasters will happen. Each new chamber forms around an object taken from the coming event.

The Cabinet once recovered a child's red boot from a chamber labeled with Earth's coordinates. No child matching it existed. Twelve years later, during the Luna evacuation, a girl wearing the other boot was pulled from a collapsing shuttle. She survived because the rescue crew recognized it. The Oracle has now grown a chamber holding a small brass key stamped with the Cabinet's serial number. No keyhole aboard the machine matches it. Yet every midnight, something inside the Cabinet tries the door.`,
    'The newest chamber predicts proximity, not inevitability.',
    { palette: [0x5fe8ff, 0x8877ff, 0xff74d2], pitchScale: 0.72 }
  ),
  wonder(
    'plasma_butterfly_cathedral',
    'The Chrysalis Basilica',
    'Metamorphic sanctuary',
    `The Basilica begins as a single plasma butterfly. When threatened, it unfolds into towers, arches, and stained wings large enough to shelter a fleet. Inside, every sound becomes colored light.

The monks of Ash Chapel entered during a Swarm siege and lived within it for seven generations. They emerged speaking in gestures because language had become visible to them. Their descendants could see lies as bruised violet shapes around the speaker. Governments hunted them; the Basilica returned and carried them away. It still opens for ships broadcasting an honest confession. The Cabinet tested this with a fabricated distress call and was ignored. When its oldest maintenance log accidentally transmitted—“I am afraid of being the last machine awake”—the doors opened immediately.`,
    'The Basilica distinguishes distress from performance. Speak plainly.',
    { palette: [0xff6fd4, 0x66f3ff, 0xffd66b], pitchScale: 1.22 }
  ),
  wonder(
    'starforged_titan_hand',
    'The Hand That Set Orion',
    'Macrocosmic artisan remnant',
    `The Hand is larger than a solar system, yet appears small enough to cross in seconds. Its fingers are lattices of newborn suns. Ancient charts show it placing constellations where navigators would need them millennia later.

In the palm lies the fossil imprint of a much smaller hand. Human proportions. Cabinet dating places the imprint two billion years before Earth formed. Scholar Edda Vale proposed that humanity did not evolve into the makers; the makers remembered humanity before it existed and built the sky to guide us toward them. Vale disappeared after mapping the Hand's latest gesture. The stars it moved now form a perfect arrow aimed at a region every telescope renders as blank.`,
    'Do not follow the fingertip without a route home.',
    { palette: [0x72e9ff, 0x8f7cff, 0xffd06a], pitchScale: 0.7 }
  ),
  wonder(
    'cosmic_hourglass_sea',
    'The Sea Between Seconds',
    'Temporal ocean vessel',
    `Two glass oceans flow through the Hourglass: one made of moments already lived, the other of moments abandoned before they began. Ships reflected in the upper sea appear as they remember themselves. In the lower, they appear as the people they disappointed.

Captain Orrin emptied a vial from the lower ocean over his dead crew. For one minute they returned, not as ghosts but as lives they might have lived: gardeners, teachers, parents, strangers who had never boarded his ship. They forgave him because in their histories he had done nothing wrong. Then the sand reversed and took them back. Orrin spent the rest of his life guarding the Hourglass from anyone desperate enough to call that mercy.`,
    'Time pours both ways here. Maintain thrust through the waist.',
    { palette: [0x69efff, 0x9c73ff, 0xffce70], pitchScale: 0.8 }
  ),
  wonder(
    'singing_planet_rings',
    'The Choir of Unmoored Worlds',
    'Planetary resonance assembly',
    `Seven planets orbit nothing, their rings touching like the strings of an instrument. Each world sings one note through gravity. Together they perform a chord that makes damaged machines remember their original shape.

The worlds are empty except for identical stone theaters facing the sky. In every theater, one seat is occupied by a pressure suit containing dust and a ticket printed in modern Nova code. The date is always tomorrow. When the Swarm approached, the planets changed key and every hostile drive shut down. One theater then transmitted applause. Cabinet analysts found an eighth note hidden beneath the chord—a human heartbeat, impossibly loud, waiting for the orchestra to tune around it.`,
    'Let the chord complete. Engine corrections introduce dangerous dissonance.',
    { palette: [0x74edff, 0xa077ff, 0xffce6a], pitchScale: 1.16 }
  ),
  wonder(
    'constellation_wolf_pack',
    'The Wolves Beyond Polaris',
    'Protective stellar pack',
    `The Pack runs along the edge of mapped space, driving something ahead of it. Their bodies are star maps; their eyes are dead pulsars. Every century one Wolf turns back and patrols the frontier alone.

Settlers once mistook the lone animal for a threat and fired. It did not retaliate. It lay across the colony's sky for nine nights, bleeding constellations, while an unseen presence tested every perimeter from the dark. On the tenth night the Wolf rose, scarred but alive, and the pressure vanished. The colony has left its orbital guns silent ever since. The full Pack is now running toward human space rather than away. Whatever they have hunted since the first stars is coming here to hide.`,
    'The Pack guards the boundary. Stay on the side they face away from.',
    { palette: [0x63dcff, 0x8c72ff, 0xffd276], pitchScale: 0.9 }
  ),
  wonder(
    'aurora_phoenix_nest',
    'Nest of the First Fire',
    'Stellar rebirth sanctuary',
    `The Phoenix builds its nest from auroras stolen from worlds with no magnetic field. Inside rest seven eggs, each containing the last sunrise of a dead civilization.

One egg hatched during the Siege of Pale Harbor. The chick spread wings made of morning and every exhausted pilot remembered why they had enlisted before the uniforms and casualty lists. The defenders held. At dawn the chick dissolved, leaving a tiny city alive inside the empty shell. Its citizens remember Pale Harbor as a myth from their own ancient past. The mother guards six remaining eggs and one fresh hollow. Cabinet thermals show the hollow is exactly the size and temperature of Earth's final sunrise.`,
    'The nest responds to shields, not weapons. Arrive as a guardian.',
    { palette: [0xff8ad8, 0x67e7ff, 0xffd36f], pitchScale: 1.24 }
  ),
  wonder(
    'prism_whale_calf_dance',
    'The Glass Calf Lesson',
    'Stellar migration rite',
    `An adult Prism Whale teaches its calf to bend light around danger. Their dance appears playful until the surrounding stars shift aside, opening a corridor through space that did not exist moments before.

The first crew to follow found a hidden system filled with wrecked arks from dozens of species. None bore battle damage. Every vessel had arrived safely and been abandoned, tables laid and engines warm. At the system's center floated thousands of calves, practicing the same dance without adults. The crew fled before the lesson ended. Since then, parent and calf sometimes circle the Cabinet, leaving a corridor pointed toward that nursery. The calf is growing. The parent is becoming transparent.`,
    'Observe the turn, but decline the corridor.',
    { palette: [0x6fe8ff, 0xae87ff, 0xffd47a], pitchScale: 1.05 }
  ),
  wonder(
    'black_hole_chandelier',
    'Chandelier of the Last Banquet',
    'Singularity court relic',
    `The Chandelier hangs in open space above a black hole set like a dark jewel. Crystal pendants orbit it without falling, each containing the final toast of a civilization consumed by the singularity.

At irregular intervals a table appears beneath the lights, laid for guests whose names are engraved on the chairs. Navigator Pella Rune found her own name and sat down. She returned unable to eat ordinary food, claiming she had dined on memories with kings from extinct suns. Her place remains set, the glass half full. The newest chair bears no name—only the Cabinet's symbol and a date three days after the universe is predicted to end.`,
    'Do not accept an invitation whose host is gravity.',
    { palette: [0xffd06d, 0x8578ff, 0x66eaff], pitchScale: 0.66 }
  ),
  wonder(
    'floating_island_temple',
    'The Temple Without Ground',
    'Exiled sanctuary world',
    `The island carries soil from a planet erased from every astronomical record. Starlight waterfalls pour from its cliffs and return through the roots. At the summit stands a temple with one locked room and bells that ring only in vacuum.

Refugee Niko Dae lived there for a year while one hour passed outside. The monks never showed their faces. They taught him the names of stars that had been removed from history for sheltering fugitives. Before he left, they asked him to deliver a seed to Earth. He died before doing so; the seed remains in Cabinet storage, germinating whenever someone says the missing planet's name. Unfortunately, no living person remembers how to pronounce it.`,
    'The waterfalls fall toward memory. Their current can pull a ship sideways.',
    { palette: [0x65eeff, 0xa779ff, 0xffcf70], pitchScale: 0.93 }
  ),
  wonder(
    'luminous_jelly_crown',
    'The Medusan Coronation',
    'Collective sovereign organism',
    `The Crown is formed by nine luminous drifters joining bells and nerves around an empty center. During formation they broadcast the coronation oath of Queen Istra, whose kingdom sank beneath a methane sea.

Istra refused evacuation until every citizen escaped. Her final capsule never launched. Centuries later, divers found no body—only nine juvenile organisms circling her crown. When the creatures gather now, a woman's silhouette appears in the center and asks each nearby ship to state whom it would save last. Answers judged unworthy cause only the lights to dim. One pilot answered “myself.” The Crown bowed, and his entire crew woke safely on the far side of a supernova.`,
    'The question is not a riddle. Answer as though someone will remember.',
    { palette: [0xff79d9, 0x66eaff, 0xffd06d], pitchScale: 1.13 }
  ),
  wonder(
    'cosmic_bonsai_world',
    'The Gardener of Small Heavens',
    'Pocket-cosmos cultivation',
    `Each branch of the Bonsai holds a complete star system in miniature. Seasons cross its leaves in seconds. Civilizations rise, look outward, and discover the enormous watching universe before a human observer can finish a breath.

Master gardener Oru claimed the tree was a school, not a specimen. He spent forty years adjusting one branch to save a blue world from its dying sun. When he succeeded, a vessel no larger than dust escaped the miniature system, crossed the glass, and landed in his palm. Its occupants presented him with a seed containing our own galaxy. Oru planted it and disappeared. The new tree is still too small to see without magnification, but something inside has begun pruning us.`,
    'Avoid the roots. Scale is an agreement the tree can revoke.',
    { palette: [0x71ffd4, 0x6ce7ff, 0xffd06f], pitchScale: 0.97 }
  ),
  wonder(
    'starlight_train_bridge',
    'The Midnight Line',
    'Causality transit service',
    `The train arrives at stations that were demolished before their tracks were built. Its windows show passengers asleep beneath newspapers dated tomorrow. No conductor is visible, but every platform clock stops at 00:01.

Mechanic Jo Bell boarded to retrieve her brother, missing since the first Swarm breach. She found him elderly, traveling backward toward the day he disappeared. They shared one station between their lives. He gave her a suitcase and warned her never to open it before his birth. Jo kept the promise. The suitcase is now aboard the Cabinet, still locked, softly announcing stations in a child's voice. The next stop bears the coordinates of the player's current battle.`,
    'The bridge is a timetable. Cross only after the final carriage.',
    { palette: [0x6ce9ff, 0x9c7cff, 0xffcf6a], pitchScale: 1.09 }
  ),
  wonder(
    'cosmic_serpent_ouroboros',
    'The Serpent Around Forever',
    'Closed-time guardian',
    `The Serpent swallows its own tail around a galaxy that contains no present—only beginnings and endings. Ships entering the ring emerge carrying scars from battles they have not yet fought.

Admiral Saye entered seeking foreknowledge of the Swarm. She returned victorious, old, and horrified, then spent her remaining years preventing the decisions that had led to victory. Every prevention made her scars deeper. On her final day she understood: the ring had shown not fate, but the cost of treating the future as ammunition. She ordered her medals melted into a small golden scale. That scale now travels along the Serpent's body, never reaching the mouth.`,
    'Do not chase the tail. Circular routes collect circular debts.',
    { palette: [0x69eaff, 0x9477ff, 0xffcb67], pitchScale: 0.69 }
  ),
  wonder(
    'dimensional_doorway_forest',
    'The Forest of Open Doors',
    'Interworld refugee network',
    `Every doorway opens onto a different version of the same forest clearing. Some show summer, some ash, some a sky crowded with unfamiliar moons. Footprints cross between them but never appear in the space between.

The Doorwardens were once believed to be smugglers. Their recovered journals reveal a quieter purpose: moving children out of universes moments before those universes ended. The last Warden sealed herself on the wrong side to hold a door open. Her lantern is visible in every clearing, drawing closer over centuries. Recently one doorway began showing the Cabinet parked beneath the trees, empty and rusted. Its door is open from the other side.`,
    'A door is safest when you can still see the battle through it.',
    { palette: [0x67eeff, 0xa375ff, 0xffd16a], pitchScale: 0.85 }
  ),
  wonder(
    'radiant_astrolabe',
    'Astrolabe of the Missing North',
    'Absolute navigation relic',
    `The Astrolabe points toward a direction absent from three-dimensional space. Following it requires turning a ship through an angle instruments refuse to display.

Cartographer Mina Ser made the turn and vanished for four seconds. She returned with frost on her hair and a map of a continent beneath the universe, where lost objects accumulate: wedding rings, extinct languages, forgotten gods, and every spacecraft whose final position was never known. At the continent's pole stood a lighthouse flashing the Cabinet's identification code. Ser destroyed the map, but her compass needle still points there. Whenever the Astrolabe appears, the needle spins once for every newly missing person.`,
    'True north is not always a place worth reaching.',
    { palette: [0xffd16c, 0x6aeaff, 0x9d79ff], pitchScale: 0.75 }
  ),
  wonder(
    'galactic_crown_flotilla',
    'The Sovereign Flotilla',
    'Ceremonial stellar convoy',
    `Crown-shaped vessels orbit a blue star in perfect court formation. They contain no crews, no controls, and no interiors—only rooms made of exterior surface, as if designed for beings who live on boundaries.

Every thousand orbits the central star issues a decree in neutrinos. The latest named a human salvage pilot “temporary sovereign of all unowned light.” She laughed, accepted, and ordered the flotilla to free every captured sun in Swarm territory. For one hour, stellar prisons opened across the front. Then the pilot vanished from all records except her own ship, which still insists its captain is on the bridge. The flotilla now carries one additional crown, small enough for a human head.`,
    'Court formation yields to no vessel. Pass outside the smallest crown.',
    { palette: [0xffd36c, 0x68eaff, 0xb278ff], pitchScale: 1.17 }
  ),
  wonder(
    'nebula_peacock_fan',
    'The Peacock at Eventide',
    'Cosmic display intelligence',
    `The Peacock opens its tail only before a star goes dark. Each eye in the fan shows the final beautiful thing witnessed on one world beneath that star: a hand held, a joke finished, rain on a roof.

The people of Vesper mistook the display for an omen and fled. Their sun did not die. Instead, every eye showed the same image—a child in the evacuation crowd looking back at the bird. That child later became the engineer who prevented the collapse. When she died, the Peacock returned and added her repair manual to its tail as a new constellation. It may not predict endings. It may show the small moments from which survival can be built.`,
    'Count the eyes that repeat. Repetition marks the event that can still change.',
    { palette: [0x64e8ff, 0x9278ff, 0xffcb70], pitchScale: 1.28 }
  ),
  wonder(
    'celestial_clockwork_angel',
    'The Angel of Measured Mercy',
    'Judicial rescue automaton',
    `The Angel appears over doomed ships and calculates whether rescue would cause more suffering than loss. Its rings turn once for every possible future. Its wings close when judgment is complete.

During the Red Choir disaster, the calculation lasted three seconds. The Angel saved one maintenance drone and allowed ten thousand people to die. The drone later repaired a relay that evacuated an entire sector. Survivors called the choice monstrous until the drone revealed a hidden recording: the Angel had asked every dying passenger for consent, inside the fraction of a second between heartbeats. All but one said yes. The dissenting voice remains inside its central ring, still arguing after six centuries.`,
    'Its mercy is arithmetic. Do not assume the equation excludes you.',
    { palette: [0xffd372, 0x69e8ff, 0xa17cff], pitchScale: 0.73 }
  ),
  wonder(
    'void_crystal_reef',
    'The Reef Where Silence Grows',
    'Vacuum ecology',
    `The Reef blooms around wrecks whose final transmissions were never received. Crystal coral feeds on unsent words, growing brightest near sealed recorders and dead radios.

Salvagers harvesting a branch heard thousands of messages at once: apologies, coordinates, ordinary complaints, and lullabies from species no archive knew. One voice belonged to the salvager cutting the crystal. It calmly described his death five minutes later. He stopped, and survived. The voice continued describing a life he never lived, growing older through the Reef's song. He visits every year to hear what that other self became. Recently the voice has begun asking him to bring the Cabinet.`,
    'Open comms receive the Reef. Closed comms become part of it.',
    { palette: [0x69f1ff, 0xb179ff, 0xffbf70], pitchScale: 0.86 }
  ),
  wonder(
    'solar_sail_ballet',
    'The Heliochrome Ballet',
    'Autonomous memorial performance',
    `The sails dance around invisible sunlight, changing formation with the grace of trained bodies. Their choreography matches a ballet performed once on Earth during the final peaceful night before the Exodus.

Choreographer Lian Vos died before the launch. Her dancers carried the score into space, but their ark was lost. Centuries later the sails appeared, performing movements never written in the surviving score. Motion analysis revealed navigation vectors hidden in every turn. Following them led to the missing ark, preserved inside a lightless pocket with its passengers still asleep. The final movement remains unperformed. It requires a sixty-first sail, and the Cabinet's silhouette fits the empty role exactly.`,
    'The dancers leave a lane for the absent partner. Do not improvise inside it.',
    { palette: [0xffd16e, 0x67eaff, 0x9a76ff], pitchScale: 1.21 }
  ),
  wonder(
    'cosmic_music_box',
    'Music Box of the Unfinished Dance',
    'Mnemonic performance engine',
    `The box plays a melody that each listener remembers from childhood, even when no two listeners share a culture or species. Glass dancers orbit its mechanism, always one step short of touching.

Diplomat Sana Reeve opened it during a failed peace summit. Enemy delegates heard the same lullaby their mothers had sung, and the war paused long enough to exchange prisoners. Then one dancer completed the missing step. Everyone in the room remembered a childhood spent together on a planet that never existed. The shared memories lasted after the music stopped and made renewed war impossible. That peace endures, but every survivor dreams of returning to the nonexistent planet. The box may create empathy—or homesickness for worlds it has erased.`,
    'Let the melody end before making promises you remember from elsewhere.',
    { palette: [0xffd476, 0x6beaff, 0xb06fff], pitchScale: 1.15 }
  ),
  wonder(
    'star_nursery_orbs',
    'Cradles of the Small Suns',
    'Stellar incubation array',
    `Each glass orb contains a newborn star and a whispering caretaker intelligence. The cradles drift far from galaxies, where the infants cannot burn inhabited worlds while learning to shine.

One orb cracked during a Swarm bombardment. The infant panicked, flaring toward supernova. Every other cradle moved around it and began singing gravitationally, slowing the explosion into a warm pulse. The damaged star survived but now flickers in a rhythm matching human distress code. Cabinet linguists translated the pattern: NOT HURT. AFRAID. The oldest cradle has changed course toward it, carrying a sun red and enormous with age. A parent, perhaps, coming across the dark.`,
    'Weapons heat frightens the infants. Cross on minimal thrust.',
    { palette: [0x70eaff, 0xa679ff, 0xffca70], pitchScale: 1.04 }
  ),
  wonder(
    'quantum_snowflake',
    'The Snowflake That Never Melts',
    'Probability crystal',
    `No two snowflakes are alike; this one contains every shape it could have taken. Its branches divide whenever observed, each crystal edge holding a different decision.

Physicist Bram Eno touched it and returned with sixty-four conflicting memories of the same moment. In half, he had refused. In one, the Snowflake spoke through him: “Uniqueness is only ignorance of the neighboring pattern.” Eno spent his life mapping the branches and found a dark gap where every possible version of himself stopped existing. The gap moves one branch closer whenever the Snowflake appears. He died years ago, but his map continues updating in fresh handwriting.`,
    'Observation multiplies the branches. Make one decision and leave.',
    { palette: [0x70f3ff, 0xb87bff, 0xffd27a], pitchScale: 1.3 }
  ),
  wonder(
    'galaxy_waterfall',
    'The Falls of Many Heavens',
    'Cosmological transfer channel',
    `Galaxies pour through crystal arches like luminous water. Each spiral remains intact while falling, though billions of years pass between the crest and the basin.

The explorer Nia Ward dropped a beacon into the flow. It returned upstream before she released it, carrying a message in her own hand: DO NOT BUILD THE DAM. Decades later, the Swarm began assembling a gravity lattice around the lower arch. Ward destroyed it, and the Falls briefly reversed. For one second the sky filled with galaxies that had already reached the end of time. Every one was dark except a single point moving toward the observer. The point is brighter each time the Falls return.`,
    'The mist is accelerated history. Shields cannot stop age.',
    { palette: [0x65e8ff, 0x8e70ff, 0xffc970], pitchScale: 0.71 }
  ),
  wonder(
    'alien_observatory',
    'The Observatory of the Absent Eye',
    'Precursor surveillance monument',
    `The Observatory's lens points at a nebula shaped like an open eye, but no image appears on its instruments. Instead, the observer becomes visible to something on the far side.

Archaeologist Vale Rook looked through for four seconds. He saw an empty chair in a room larger than a moon. Dust covered everything except two fresh footprints leading toward him. Rook sealed the lens and fled. Years later, every portrait of him began showing the same room in the background. The chair is closer now. After Rook died, the effect transferred to photographs of the Cabinet. No one has looked through the lens again, yet the Observatory has begun rotating to follow the machine.`,
    'A telescope can be a doorway with excellent optics.',
    { palette: [0xffcf70, 0x67e8ff, 0x9e72ff], pitchScale: 0.64 }
  ),
  wonder(
    'aurora_dragonfly_swarm',
    'Dragonflies of the Prism Bloom',
    'Stellar pollinator swarm',
    `The Dragonflies carry sparks between crystal flowers growing in magnetic storms. Wherever they feed, new auroras appear on worlds whose skies were dead.

Colonists on barren Hush watched the insects circle their planet for a week. On the eighth night the atmosphere lit green and violet, revealing enormous words written across the poles in an extinct language. Translation yielded a love letter from the planet's vanished moon. The moon had been destroyed before life evolved, yet it apologized for leaving. The Dragonflies moved on, carrying pollen made of lunar dust. Every spring since, a small new moon appears over Hush for one night, a little larger than before.`,
    'Their flight path marks magnetic currents. Ride beside it, never through it.',
    { palette: [0x6feaff, 0xff7cdb, 0xffd06e], pitchScale: 1.27 }
  ),
  wonder(
    'comet_flower_meadow',
    'Meadow of the Long Return',
    'Cometary seed field',
    `The flowers bloom only in the wakes of comets that have completed a million-year orbit. Their roots hold the memory of every world the comet passed.

Botanist Aya Fen touched one blossom and smelled rain from Earth before the oceans boiled. Another held dust from a planet where humans will stand in forty thousand years. She collected no samples. Instead she planted her wedding ring in the field, asking the next orbit to carry a memory of her wife beyond the Sun's death. The ring later appeared in a flower opening beside the Cabinet—weathered by ages that have not happened, engraved with a reply: I REMEMBER YOU TOO.`,
    'The meadow grows along old trajectories. Follow stems, avoid the blooms.',
    { palette: [0xff7ed9, 0x68eaff, 0xffcb69], pitchScale: 1.12 }
  ),
  wonder(
    'crystal_orbital_city',
    'Aurelia, City Around a Heart',
    'Living orbital metropolis',
    `Aurelia's streets orbit a crystal that beats once every hour. The city is immaculate, powered, and completely empty. Trains arrive. Doors open. Meals cool on tables set for residents who never appear.

A Nova team stayed overnight and dreamed a full lifetime there—jobs, friendships, children, old age. They woke after eight minutes, grieving people they could name but had never met. One refused to leave and became visible only in reflections, waving from a crowded avenue. The crystal's heartbeat accelerated. Aurelia may not be abandoned; its citizens may live entirely in the shared dream, inviting travelers to increase the population. The city recently constructed a docking ring shaped for the Cabinet.`,
    'Autopilot accepts Aurelia as home. Override before proximity.',
    { palette: [0x66eaff, 0xae78ff, 0xffd069], pitchScale: 0.95 }
  ),
  wonder(
    'celestial_fox_constellation',
    'The Moon-Thieves',
    'Mythogenic stellar pair',
    `The two Foxes chase a crescent moon across the dark. Whenever one catches it, the moon vanishes from a real sky for exactly one night.

On Tern, that night concealed an evacuation from the Swarm. Children were told the Foxes had stolen the moon to hide them. Years later, one child became a pilot and encountered the pair. She jokingly asked them to return it. The Foxes stopped, bowed, and released hundreds of missing moons—each from a different world, each carrying the light of a night when someone escaped unseen. The moons formed a road toward Tern. At its end stood the pilot's childhood home, preserved in starlight, with her parents waiting on the porch.`,
    'When the Foxes bow, hold position. The hidden road is crossing.',
    { palette: [0x6aeaff, 0x9c76ff, 0xffcb72], pitchScale: 1.19 }
  ),
  wonder(
    'luminous_world_tree',
    'Yggra of the Far Dark',
    'Galactic biosphere ancestor',
    `Galaxies fruit in Yggra's crown. Its roots descend beyond the observable universe, drinking from a darkness older than space. Each falling leaf becomes a comet carrying the chemistry of life.

The Swarm once cut a branch. Every inhabited world in the local cluster suffered the same wound: forests split, coral whitened, sleeping people woke crying without knowing why. The branch regrew around the attacking fleet and flowered. Inside each blossom was a peaceful version of one attacker, living the life they might have chosen. The fleet surrendered without negotiation. Yggra still bears the scar, and within it grows a small metal seed matching the alloy of the Cabinet.`,
    'The roots move when harmed. Treat the entire sky as living ground.',
    { palette: [0x70ffd0, 0x68eaff, 0xffd072], pitchScale: 0.77 }
  ),
  wonder(
    'nebula_seahorse_caravan',
    'Caravan of the Garden-Bearers',
    'Migratory habitat fauna',
    `Each Seahorse carries a sealed garden beneath its ribs: soil, rain, insects, and one sleeping gardener. The Caravan follows routes between worlds sterilized by war.

When a Seahorse reaches a dead planet, the gardener wakes, opens the glass, and begins again. None has ever returned to the Caravan. The largest creature bears a garden whose sleeper is still awake. She has watched ten thousand companions depart and refuses her own world because it is not dead enough to need her. Her transmissions are lullabies naming every restored planet. The newest verse names Earth, then corrects itself: NOT YET. NOT YET. NOT YET.`,
    'Garden globes are fragile. Keep combat below the Caravan.',
    { palette: [0x65e8ff, 0xa175ff, 0xffce6a], pitchScale: 0.99 }
  ),
  wonder(
    'prism_eclipse_mandala',
    'Mandala of the Hidden Sun',
    'Stellar mourning instrument',
    `The Mandala forms around an eclipse whose star cannot be found behind it. Its geometry is rebuilt from light emitted by people at the moment they forgive someone.

During the Long Siege, hatred kept the pattern incomplete for years. A dying gunner forgave the enemy pilot who had killed her brother, and the final prism ignited. The hidden sun shone through, healing radiation burns across both fleets. The ceasefire lasted one day—long enough to bury the dead together. Since then the Mandala appears near conflicts approaching the same choice. Its dark center contains no star. It contains the single act of forgiveness no one has managed yet.`,
    'The central shadow opens when weapons cease. It never opens first.',
    { palette: [0x68eaff, 0xa47aff, 0xffce69], pitchScale: 0.83 }
  ),
  wonder(
    'starship_graveyard_rebirth',
    'The Fleet That Became a Bird',
    'Collective wreck transfiguration',
    `Thousands of wrecks drift together until their running lights form a Phoenix. The vessels come from wars separated by millennia, yet every black box contains the same final command: FORM ON ME.

Commander Idris issued those words while covering a retreat. His ship was destroyed before anyone could obey. The command traveled instead, crossing dead channels and centuries, calling abandoned hulls into formation. When the Phoenix spreads its wings, each wreck briefly restores itself and completes the maneuver it died attempting. No enemies are present. The fleet is not fighting anymore. It is practicing the rescue until, somewhere in time, Idris and his people finally make it home.`,
    'The formation treats live ships as survivors. Stay inside the wings.',
    { palette: [0xff7bd6, 0x68eaff, 0xffcf70], pitchScale: 1.25 }
  ),
  wonder(
    'cosmic_lantern_festival',
    'Lanterns for the Unreturned',
    'Interstellar remembrance rite',
    `No one launches the Lanterns. They rise from empty space wherever a ship is declared lost without witnesses. Each contains a warm room, a set table, and a doorway opening onto the missing crew's idea of home.

Families once tried boarding them. The rooms welcomed each visitor but led only to another lantern, then another, deeper into the spiral. Rescue teams heard laughter ahead and followed until their tethers ran out. One returned carrying a bowl of soup still hot from her grandmother's kitchen. The grandmother had died on Earth a century earlier. The Lanterns may guide the lost home—or build a home where lost people can stop searching. The distinction matters mostly to those left behind.`,
    'Do not follow the innermost lights. Their route has no return vector.',
    { palette: [0xffd06c, 0x6beaff, 0xa574ff], pitchScale: 1.08 }
  ),
  wonder(
    'radiant_comet_throne',
    'The Throne of No Return',
    'Vacant stellar office',
    `The Throne is woven from comet tails and cooled coronas. It appears before people offered enough power to become someone else.

General Marek sat during the collapse of the Outer Line. He rose knowing every enemy position and won the war in one night. Afterward he could no longer recognize his daughter, his own face, or the meaning of mercy. The Throne had not granted knowledge; it had replaced every memory that did not serve command. Marek spent his last years searching the stars for the man who had sat down. The seat remains empty, but its back now displays the exact tactical map surrounding the Cabinet.`,
    'Power offered without a price list has already taken payment.',
    { palette: [0xffd16a, 0x6deaff, 0x9b72ff], pitchScale: 0.74 }
  ),
  wonder(
    'moon_cathedral_bridges',
    'The Crescent Cloisters',
    'Lunar pilgrimage chain',
    `Cathedral bridges join moons stolen from different systems. Gravity changes at every arch. Pilgrims can walk from one world's night into another's without seeing daylight.

The order maintaining the bridges takes a vow never to ask where the moons came from. Novice Elian broke it. He discovered each moon had once watched over a civilization moments before extinction. The Cloisters preserve their final nights so darkness is never the last thing those worlds owned. At the highest bridge, Elian found Earth's moon waiting—whole, blue-lit, and older than the ruin orbiting humanity's birthplace. The monks sealed the arch before he crossed. Its bells have rung every time the Cabinet survived a boss wave.`,
    'Each arch reverses local down. Level wings before crossing.',
    { palette: [0x78eaff, 0xa176ff, 0xffd16e], pitchScale: 0.91 }
  ),
  wonder(
    'void_pearl_shell',
    'The Pearl at the End of Sound',
    'Acoustic extinction artifact',
    `The Shell closes around the final sound made by a dying world. Pressure turns the sound into a pearl of perfect silence.

When opened near living ships, the Pearl plays nothing—and every listener hears the voice they most regret not answering. Pilot Ren heard a routine call from his father, ignored before launch. He answered aloud. The Pearl replied in his father's voice, describing years they had never shared. Ren left the service and went home. The Shell has opened sixty times since, each conversation ending with a choice rather than a prophecy. Its newest pearl is still forming, fed by transmissions from battles that have not happened.`,
    'Silence is the signal. Reduce audio gain and watch instruments.',
    { palette: [0x77eaff, 0xbf82ff, 0xffd173], pitchScale: 0.62 }
  ),
  wonder(
    'astral_clockwork_orrery',
    'Orrery of Borrowed Worlds',
    'Cosmological clockwork',
    `The Orrery's jeweled planets correspond to real worlds, but not their current positions. Turning one gear moves nothing visible—until decades later, when a planet completes an orbit it should have missed.

Engineer Sol Kade used the mechanism to pull a colony away from a supernova. The colony survived, but an uninhabited world elsewhere moved into the fatal path. On that world, ruins appeared overnight, filled with statues of people accusing Kade by name. The mechanism balances histories, not masses. Every saved world creates a lost one complete with the past it would need to mourn itself. One gear bears Earth's symbol and has already begun turning without a hand.`,
    'Do not touch the clockwork. Even an idle gear may be paying an old debt.',
    { palette: [0xffd06d, 0x6deaff, 0xa277ff], pitchScale: 0.68 }
  ),
  wonder(
    'aurora_ribbon_dancers',
    'The Dancers at Zero Hour',
    'Binary stellar memory',
    `Two ribbon spirits dance around a star paused at the instant before collapse. One moves forward through the choreography, the other backward. They meet only at the beginning and the end.

The dance was first recorded by lovers serving on opposite sides of a war. Each believed the other dead. Watching from separate ships, they recognized movements from a private dance on their wedding night and broke formation to meet beneath the star. The fleets fired; the star resumed time and swallowed every weapon, leaving the two ships untouched. The dancers have repeated the performance ever since. Sometimes a third ribbon appears for one step, shaped like the child the lovers never had.`,
    'Their crossing marks the still point. Hold there until the star exhales.',
    { palette: [0x69eaff, 0xff76d5, 0xffd06c], pitchScale: 1.2 }
  ),
  wonder(
    'celestial_crane_migration',
    'The Cranes of the Final Sky',
    'Cosmic soul-carrier myth',
    `The Cranes migrate from dying stars toward a sky no telescope can see. Each carries a ribbon of light containing the dreams of people who died before fulfilling them.

During the fall of Sable Station, a child asked one Crane to carry her dream of becoming a pilot. Years later, an unknown ace appeared at desperate battles, flying with impossible skill and leaving no transponder trace. Cockpit recordings captured a child's laughter. The ace vanished when Sable's last survivor died peacefully. Now one Crane follows the Cabinet instead of the flock. Its ribbon contains thousands of tiny ships, all flying onward. Perhaps dreams do not need their dreamers forever.`,
    'Migration lanes belong to the dead and the unfinished. Yield gently.',
    { palette: [0x6deaff, 0x9b72ff, 0xffcd6a], pitchScale: 1.23 }
  )
]);

export const CABINET_WONDER_DEFINITION_BY_ID = Object.freeze(
  Object.fromEntries(CABINET_WONDER_DEFINITIONS.map((entry) => [entry.id, entry]))
);
