/* ---------- Animated cartoon-figure diagram renderer ---------- */
const FIG_SKIN = '#F2B88C';
const FIG_SHORTS = '#2B3A55';
const FIG_SHOE = '#20242E';
const FIG_INK = '#20242E';

function poseSegments(p){
  return {
    torso: [p.s, p.h],
    armU1: [p.s, p.arm1.el], armL1: [p.arm1.el, p.arm1.ha],
    armU2: [p.s, p.arm2.el], armL2: [p.arm2.el, p.arm2.ha],
    legU1: [p.h, p.leg1.k], legL1: [p.leg1.k, p.leg1.f],
    legU2: [p.h, p.leg2.k], legL2: [p.leg2.k, p.leg2.f]
  };
}
function poseJoints(p){
  return { head:p.head, hand1:p.arm1.ha, hand2:p.arm2.ha, foot1:p.leg1.f, foot2:p.leg2.f };
}

function lerpPt(a,b,t){ return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t]; }

/* Builds a "relaxed" version of a held pose by easing limbs back toward the
   body, used as the opposite end of a gentle breathing loop for stretches
   and single-pose isometric holds. */
function restVariant(pose, factor){
  function relax(base, mid, end){
    const newMid = lerpPt(base, mid, 1-factor*0.5);
    const newEnd = lerpPt(newMid, end, 1-factor);
    return {mid:newMid, end:newEnd};
  }
  const a1 = relax(pose.s, pose.arm1.el, pose.arm1.ha);
  const a2 = relax(pose.s, pose.arm2.el, pose.arm2.ha);
  const l1 = relax(pose.h, pose.leg1.k, pose.leg1.f);
  const l2 = relax(pose.h, pose.leg2.k, pose.leg2.f);
  const hdx = (pose.head[0]-pose.s[0]) * (1 - factor*0.3);
  const hdy = (pose.head[1]-pose.s[1]) * (1 - factor*0.3);
  return {
    head: [pose.s[0]+hdx, pose.s[1]+hdy],
    s: pose.s, h: pose.h,
    arm1:{el:a1.mid, ha:a1.end}, arm2:{el:a2.mid, ha:a2.end},
    leg1:{k:l1.mid, f:l1.end}, leg2:{k:l2.mid, f:l2.end}
  };
}

function animLine(key, frames, color, width, keyTimesStr, durStr){
  const segs = frames.map(f=>poseSegments(f)[key]);
  const x1 = segs.map(s=>s[0][0]).join(';'), y1 = segs.map(s=>s[0][1]).join(';');
  const x2 = segs.map(s=>s[1][0]).join(';'), y2 = segs.map(s=>s[1][1]).join(';');
  return `<line x1="${segs[0][0][0]}" y1="${segs[0][0][1]}" x2="${segs[0][1][0]}" y2="${segs[0][1][1]}" stroke="${color}" stroke-width="${width}" stroke-linecap="round">
    <animate attributeName="x1" values="${x1}" keyTimes="${keyTimesStr}" dur="${durStr}" repeatCount="indefinite"/>
    <animate attributeName="y1" values="${y1}" keyTimes="${keyTimesStr}" dur="${durStr}" repeatCount="indefinite"/>
    <animate attributeName="x2" values="${x2}" keyTimes="${keyTimesStr}" dur="${durStr}" repeatCount="indefinite"/>
    <animate attributeName="y2" values="${y2}" keyTimes="${keyTimesStr}" dur="${durStr}" repeatCount="indefinite"/>
  </line>`;
}
function animCircle(key, frames, r, fill, keyTimesStr, durStr){
  const pts = frames.map(f=>poseJoints(f)[key]);
  const cx = pts.map(p=>p[0]).join(';'), cy = pts.map(p=>p[1]).join(';');
  return `<circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="${r}" fill="${fill}">
    <animate attributeName="cx" values="${cx}" keyTimes="${keyTimesStr}" dur="${durStr}" repeatCount="indefinite"/>
    <animate attributeName="cy" values="${cy}" keyTimes="${keyTimesStr}" dur="${durStr}" repeatCount="indefinite"/>
  </circle>`;
}

function cartoonFigureAnim(frames, keyTimesArr, durSeconds, accentColor){
  const keyTimesStr = keyTimesArr.join(';');
  const dur = durSeconds + 's';
  let svg = `<line x1="4" y1="113" x2="96" y2="113" stroke="#000" stroke-width="1.5" opacity="0.08"/>`;
  // legs
  svg += animLine('legU1', frames, FIG_SHORTS, 9, keyTimesStr, dur);
  svg += animLine('legL1', frames, FIG_SKIN, 7, keyTimesStr, dur);
  svg += animLine('legU2', frames, FIG_SHORTS, 9, keyTimesStr, dur);
  svg += animLine('legL2', frames, FIG_SKIN, 7, keyTimesStr, dur);
  svg += animCircle('foot1', frames, 4.5, FIG_SHOE, keyTimesStr, dur);
  svg += animCircle('foot2', frames, 4.5, FIG_SHOE, keyTimesStr, dur);
  // torso
  svg += animLine('torso', frames, accentColor, 13, keyTimesStr, dur);
  // arms
  svg += animLine('armU1', frames, accentColor, 8, keyTimesStr, dur);
  svg += animLine('armL1', frames, FIG_SKIN, 6.5, keyTimesStr, dur);
  svg += animLine('armU2', frames, accentColor, 8, keyTimesStr, dur);
  svg += animLine('armL2', frames, FIG_SKIN, 6.5, keyTimesStr, dur);
  svg += animCircle('hand1', frames, 3.8, FIG_SKIN, keyTimesStr, dur);
  svg += animCircle('hand2', frames, 3.8, FIG_SKIN, keyTimesStr, dur);
  // head + face (rigid group riding along with head position)
  const h0 = frames[0].head;
  const dxdy = frames.map(f=>`${f.head[0]-h0[0]},${f.head[1]-h0[1]}`).join(';');
  svg += `<g>
    <animateTransform attributeName="transform" type="translate" values="${dxdy}" keyTimes="${keyTimesStr}" dur="${dur}" repeatCount="indefinite"/>
    <circle cx="${h0[0]}" cy="${h0[1]}" r="9" fill="${FIG_SKIN}"/>
    <path d="M ${h0[0]-8} ${h0[1]-4} Q ${h0[0]} ${h0[1]-15} ${h0[0]+8} ${h0[1]-4} Q ${h0[0]+6} ${h0[1]-8} ${h0[0]} ${h0[1]-8} Q ${h0[0]-6} ${h0[1]-8} ${h0[0]-8} ${h0[1]-4} Z" fill="${accentColor}" opacity="0.85"/>
    <circle cx="${h0[0]-3}" cy="${h0[1]-1}" r="1.2" fill="${FIG_INK}"/>
    <circle cx="${h0[0]+3}" cy="${h0[1]-1}" r="1.2" fill="${FIG_INK}"/>
    <path d="M ${h0[0]-3} ${h0[1]+3} Q ${h0[0]} ${h0[1]+6} ${h0[0]+3} ${h0[1]+3}" stroke="${FIG_INK}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
  </g>`;
  return `<svg viewBox="0 0 100 122" class="diagram" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`;
}

/* Public helpers used by app.js */
function stretchDiagramAnim(stretchObj, color){
  const hold = stretchObj.poses[0];
  const rest = restVariant(hold, 0.5);
  return cartoonFigureAnim([rest, hold, hold, rest], [0,0.4,0.7,1], 3.2, color);
}
function strengthDiagramAnim(strengthObj, color){
  if(strengthObj.poses.length===1){
    const p = strengthObj.poses[0];
    const rest = restVariant(p, 0.35);
    return cartoonFigureAnim([rest, p, p, rest], [0,0.4,0.7,1], 2.6, color);
  }
  const [a,b] = strengthObj.poses;
  return cartoonFigureAnim([a,b,a], [0,0.5,1], 1.7, color);
}

/* ---------- STRETCHES ---------- */
const STRETCHES = [
{ id:'st_quad', name:'Standing Quad Stretch', target:'Quads', hold:'30s each side',
  poses:[{head:[50,14],s:[50,27],h:[47,58],
    arm1:{el:[58,42],ha:[64,66]}, arm2:{el:[36,32],ha:[26,26]},
    leg1:{k:[45,86],f:[43,112]}, leg2:{k:[55,74],f:[62,66]}}],
  steps:[
    'Stand tall, holding a wall or chair for balance if needed.',
    'Bend one knee, bringing your heel toward your glutes.',
    'Grab your ankle and gently pull it closer, keeping knees together.',
    'Keep your torso upright — don\u2019t lean forward.',
    'Hold, then switch sides.'
  ], tip:'Keep your standing knee soft, not locked, to protect the joint.'},

{ id:'st_hamstring', name:'Seated Hamstring Stretch', target:'Hamstrings', hold:'30s each side',
  poses:[{head:[55,45],s:[50,38],h:[35,72],
    arm1:{el:[58,55],ha:[70,68]}, arm2:{el:[55,58],ha:[68,72]},
    leg1:{k:[60,73],f:[88,75]}, leg2:{k:[60,76],f:[88,79]}}],
  steps:[
    'Sit on the floor with both legs extended straight in front of you.',
    'Flex your feet, toes pointing up.',
    'Hinge forward from the hips, reaching toward your toes.',
    'Keep your back long rather than rounding through the shoulders.',
    'Hold, breathing steadily.'
  ], tip:'It\u2019s fine if you can\u2019t reach your toes — bend knees slightly if hamstrings are very tight.'},

{ id:'st_calf', name:'Wall Calf Stretch', target:'Calves', hold:'30s each side',
  poses:[{head:[70,16],s:[68,28],h:[62,58],
    arm1:{el:[76,35],ha:[88,32]}, arm2:{el:[74,38],ha:[86,38]},
    leg1:{k:[58,80],f:[52,112]}, leg2:{k:[70,90],f:[85,110]}}],
  steps:[
    'Face a wall, hands pressed against it at shoulder height.',
    'Step one foot back, keeping the back leg straight and heel flat on the floor.',
    'Bend your front knee and lean into the wall until you feel a stretch in the back calf.',
    'Keep the back foot pointed straight ahead.',
    'Hold, then switch sides.'
  ], tip:'For a deeper stretch lower down the calf, bend the back knee slightly while keeping the heel down.'},

{ id:'st_hipflexor', name:'Kneeling Hip Flexor Stretch', target:'Hip flexors', hold:'30s each side',
  poses:[{head:[45,25],s:[45,36],h:[45,64],
    arm1:{el:[52,48],ha:[55,60]}, arm2:{el:[38,48],ha:[35,60]},
    leg1:{k:[35,86],f:[30,110]}, leg2:{k:[60,105],f:[75,108]}}],
  steps:[
    'Kneel on one knee (use a mat or towel for padding), other foot planted in front, knee bent 90°.',
    'Keep your torso tall and engage your glutes on the kneeling side.',
    'Gently shift your hips forward until you feel a stretch at the front of the back hip.',
    'Avoid letting your lower back arch — squeeze your abs slightly.',
    'Hold, then switch sides.'
  ], tip:'Tight hip flexors are common in runners and can pull on the lower back — this one\'s worth doing daily.'},

{ id:'st_glute', name:'Standing Figure-4 Glute Stretch', target:'Glutes / piriformis', hold:'30s each side',
  poses:[{head:[48,16],s:[48,28],h:[46,58],
    arm1:{el:[55,45],ha:[58,55]}, arm2:{el:[40,42],ha:[36,50]},
    leg1:{k:[42,86],f:[40,112]}, leg2:{k:[58,72],f:[64,70]}}],
  steps:[
    'Stand tall, holding onto a wall or chair for balance.',
    'Cross one ankle over the opposite knee, shin roughly parallel to the floor.',
    'Slowly bend your standing leg, sitting your hips back slightly.',
    'Keep your chest lifted and the crossed ankle flexed.',
    'Hold, then switch sides.'
  ], tip:'This one targets the glutes and piriformis, which can tighten up and cause hip or lower-back tightness in runners.'},

{ id:'st_itband', name:'Standing IT Band Stretch', target:'IT band / outer hip', hold:'30s each side',
  poses:[{head:[62,20],s:[58,30],h:[50,60],
    arm1:{el:[68,20],ha:[78,10]}, arm2:{el:[42,42],ha:[38,52]},
    leg1:{k:[52,86],f:[60,112]}, leg2:{k:[46,88],f:[38,110]}}],
  steps:[
    'Stand tall and cross one leg behind the other.',
    'Reach the same-side arm overhead and lean your torso away from that side.',
    'Push your hip out to the side to deepen the stretch along the outer thigh.',
    'Keep both feet flat and grounded.',
    'Hold, then switch sides.'
  ], tip:'A tight IT band is a common cause of outer-knee pain in runners — this stretch plus foam rolling can help.'},

{ id:'st_butterfly', name:'Butterfly Stretch', target:'Inner thighs / groin', hold:'45s',
  poses:[{head:[50,50],s:[48,42],h:[48,76],
    arm1:{el:[42,58],ha:[38,72]}, arm2:{el:[54,58],ha:[58,72]},
    leg1:{k:[30,88],f:[46,90]}, leg2:{k:[66,88],f:[50,90]}}],
  steps:[
    'Sit on the floor and bring the soles of your feet together.',
    'Let your knees fall open toward the ground.',
    'Hold your feet and gently hinge forward from the hips.',
    'Keep your spine long rather than rounding.',
    'Hold, breathing deeply.'
  ], tip:'Never bounce in a stretch — ease in gradually and let the muscle relax.'},

{ id:'st_downdog', name:'Downward Dog', target:'Calves / hamstrings / back', hold:'30-45s',
  poses:[{head:[55,55],s:[50,50],h:[35,40],
    arm1:{el:[65,65],ha:[78,90]}, arm2:{el:[63,68],ha:[76,92]},
    leg1:{k:[25,70],f:[18,110]}, leg2:{k:[28,72],f:[22,110]}}],
  steps:[
    'Start on hands and knees, hands slightly ahead of your shoulders.',
    'Tuck your toes and lift your hips up and back, forming an inverted V.',
    'Press your heels toward the floor (they don\u2019t need to touch).',
    'Keep a slight bend in the knees if your hamstrings are tight.',
    'Hold, pedaling the heels gently if it helps.'
  ], tip:'A great full-body reset — stretches calves, hamstrings, and the back all at once.'},
];

/* ---------- STRENGTH (bodyweight, legs & core) ---------- */
const STRENGTH = [
// LEGS
{ id:'sx_squat', cat:'leg', name:'Bodyweight Squat', target:'Quads / glutes', reps:'3 sets x 15 reps',
  poses:[
    {head:[50,16],s:[50,28],h:[48,55], arm1:{el:[40,35],ha:[32,40]}, arm2:{el:[58,35],ha:[66,40]}, leg1:{k:[45,85],f:[43,112]}, leg2:{k:[52,85],f:[54,112]}},
    {head:[50,42],s:[50,54],h:[48,74], arm1:{el:[35,50],ha:[26,42]}, arm2:{el:[62,50],ha:[70,42]}, leg1:{k:[34,80],f:[40,112]}, leg2:{k:[60,80],f:[56,112]}}
  ],
  steps:[
    'Stand with feet shoulder-width apart, toes slightly out.',
    'Push your hips back and bend your knees, lowering as if sitting into a chair.',
    'Keep your chest up and weight in your heels/midfoot.',
    'Lower until thighs are roughly parallel to the floor.',
    'Drive through your heels to stand back up.'
  ], tip:'Track your knees over your toes — don\u2019t let them cave inward.'},

{ id:'sx_lunge', cat:'leg', name:'Reverse Lunge', target:'Glutes / quads / balance', reps:'3 sets x 10 each leg',
  poses:[
    {head:[50,16],s:[50,28],h:[48,55], arm1:{el:[40,35],ha:[34,42]}, arm2:{el:[58,35],ha:[64,42]}, leg1:{k:[46,85],f:[45,112]}, leg2:{k:[50,85],f:[51,112]}},
    {head:[50,20],s:[50,32],h:[48,60], arm1:{el:[40,40],ha:[34,48]}, arm2:{el:[58,40],ha:[64,48]}, leg1:{k:[38,84],f:[34,112]}, leg2:{k:[62,95],f:[75,105]}}
  ],
  steps:[
    'Stand tall with hands on hips or extended for balance.',
    'Step one foot straight back, lowering your back knee toward the floor.',
    'Keep your front shin vertical, knee tracking over your ankle.',
    'Push through your front heel to return to standing.',
    'Alternate legs, or complete all reps on one side then switch.'
  ], tip:'A reverse lunge is gentler on the knees than a forward lunge — good for runners.'},

{ id:'sx_glutebridge', cat:'leg', name:'Single-Leg Glute Bridge', target:'Glutes / hamstrings', reps:'3 sets x 12 each leg',
  poses:[
    {head:[20,90],s:[32,88],h:[50,90], arm1:{el:[30,95],ha:[20,100]}, arm2:{el:[30,80],ha:[20,75]}, leg1:{k:[62,78],f:[75,90]}, leg2:{k:[68,60],f:[70,35]}},
    {head:[20,88],s:[32,84],h:[50,74], arm1:{el:[30,92],ha:[20,96]}, arm2:{el:[30,78],ha:[20,73]}, leg1:{k:[62,76],f:[75,90]}, leg2:{k:[68,55],f:[70,28]}}
  ],
  steps:[
    'Lie on your back, one knee bent with foot flat on the floor, other leg extended straight up.',
    'Press through the planted heel and lift your hips toward the ceiling.',
    'Squeeze your glute at the top — keep hips level, don\u2019t let them rotate.',
    'Lower with control and repeat.',
    'Switch legs.'
  ], tip:'Weak glutes are a common cause of runner\'s knee — this one directly strengthens them.'},

{ id:'sx_wallsit', cat:'leg', name:'Wall Sit', target:'Quads (isometric)', reps:'3 sets x 30-45s hold',
  poses:[
    {head:[75,20],s:[74,32],h:[70,60], arm1:{el:[62,45],ha:[55,52]}, arm2:{el:[80,45],ha:[88,52]}, leg1:{k:[50,60],f:[48,90]}, leg2:{k:[52,58],f:[50,92]}}
  ],
  steps:[
    'Stand with your back against a wall, feet shoulder-width, out in front of you.',
    'Slide down until your knees are bent to roughly 90°.',
    'Keep your back flat against the wall and knees over your ankles.',
    'Hold the position, breathing steadily.',
    'Slide back up to stand when done.'
  ], tip:'A pure isometric burner — great for building quad endurance for downhill running.'},

{ id:'sx_calfraise', cat:'leg', name:'Calf Raise', target:'Calves', reps:'3 sets x 20 reps',
  poses:[
    {head:[50,16],s:[50,28],h:[48,58], arm1:{el:[40,38],ha:[34,46]}, arm2:{el:[58,38],ha:[64,46]}, leg1:{k:[46,86],f:[44,112]}, leg2:{k:[52,86],f:[54,112]}},
    {head:[50,10],s:[50,22],h:[48,52], arm1:{el:[40,34],ha:[34,42]}, arm2:{el:[58,34],ha:[64,42]}, leg1:{k:[46,80],f:[44,105]}, leg2:{k:[52,80],f:[54,105]}}
  ],
  steps:[
    'Stand tall, feet hip-width apart (use a wall or chair for balance if needed).',
    'Rise up onto the balls of your feet as high as you can.',
    'Pause briefly at the top, squeezing your calves.',
    'Lower slowly back down with control.',
    'For extra difficulty, do these one leg at a time.'
  ], tip:'Strong calves help absorb impact and can reduce Achilles and shin issues.'},

// CORE
{ id:'sx_plank', cat:'core', name:'Forearm Plank', target:'Core (isometric)', reps:'3 sets x 30-45s hold',
  poses:[
    {head:[90,58],s:[78,58],h:[40,58], arm1:{el:[78,75],ha:[78,92]}, arm2:{el:[76,76],ha:[76,93]}, leg1:{k:[20,60],f:[7,90]}, leg2:{k:[18,62],f:[5,92]}}
  ],
  steps:[
    'Get into a forearm plank: elbows under shoulders, forearms flat on the floor.',
    'Extend your legs back, resting on your toes.',
    'Keep your body in one straight line from head to heels.',
    'Brace your abs and squeeze your glutes — don\u2019t let your hips sag or pike up.',
    'Hold, breathing steadily throughout.'
  ], tip:'Quality over duration — a strict 20s plank beats a sagging 60s one.'},

{ id:'sx_sideplank', cat:'core', name:'Side Plank', target:'Obliques / hips', reps:'3 sets x 20-30s each side',
  poses:[
    {head:[72,50],s:[62,48],h:[35,50], arm1:{el:[64,60],ha:[64,78]}, arm2:{el:[55,35],ha:[52,16]}, leg1:{k:[16,52],f:[4,55]}, leg2:{k:[17,50],f:[5,53]}}
  ],
  steps:[
    'Lie on your side, propped up on one forearm, elbow under your shoulder.',
    'Stack your feet (or stagger them for more stability).',
    'Lift your hips off the ground so your body forms a straight line.',
    'Extend your top arm toward the ceiling.',
    'Hold, then switch sides.'
  ], tip:'Strong obliques and hips help control the side-to-side sway that creeps in late in a run.'},

{ id:'sx_birddog', cat:'core', name:'Bird Dog', target:'Core / lower back / balance', reps:'3 sets x 10 each side',
  poses:[
    {head:[75,55],s:[68,55],h:[40,58], arm1:{el:[70,68],ha:[70,86]}, arm2:{el:[65,70],ha:[65,88]}, leg1:{k:[25,70],f:[15,90]}, leg2:{k:[30,72],f:[20,92]}},
    {head:[80,48],s:[68,52],h:[40,58], arm1:{el:[86,44],ha:[99,40]}, arm2:{el:[65,70],ha:[65,88]}, leg1:{k:[15,53],f:[0,48]}, leg2:{k:[30,72],f:[20,92]}}
  ],
  steps:[
    'Start on hands and knees, hands under shoulders, knees under hips.',
    'Keep your back flat and core braced.',
    'Extend one arm straight forward and the opposite leg straight back.',
    'Hold briefly, keeping hips and shoulders square to the floor.',
    'Return to start and switch sides.'
  ], tip:'Move slowly — the goal is control and balance, not speed.'},

{ id:'sx_deadbug', cat:'core', name:'Dead Bug', target:'Deep core / low back', reps:'3 sets x 10 each side',
  poses:[
    {head:[15,80],s:[28,80],h:[50,80], arm1:{el:[32,60],ha:[32,42]}, arm2:{el:[32,60],ha:[32,42]}, leg1:{k:[58,60],f:[70,60]}, leg2:{k:[58,60],f:[70,60]}},
    {head:[15,80],s:[28,80],h:[50,80], arm1:{el:[10,65],ha:[-4,50]}, arm2:{el:[32,60],ha:[32,42]}, leg1:{k:[65,75],ha:[85,78]}, leg2:{k:[58,60],f:[70,60]}}
  ],
  steps:[
    'Lie on your back, arms reaching straight up, knees bent 90° over your hips (tabletop).',
    'Press your lower back into the floor and brace your core.',
    'Slowly extend one arm overhead and the opposite leg out straight, hovering just above the floor.',
    'Return to start without your back arching off the floor.',
    'Alternate sides.'
  ], tip:'A rock-solid deep core keeps your form from breaking down late in long runs.'},

{ id:'sx_superman', cat:'core', name:'Superman', target:'Lower back / glutes', reps:'3 sets x 12 reps',
  poses:[
    {head:[85,88],s:[75,88],h:[45,88], arm1:{el:[90,85],ha:[100,82]}, arm2:{el:[92,90],ha:[102,92]}, leg1:{k:[20,88],f:[5,88]}, leg2:{k:[22,90],f:[7,90]}},
    {head:[85,72],s:[75,75],h:[45,82], arm1:{el:[92,62],ha:[104,52]}, arm2:{el:[92,66],ha:[104,58]}, leg1:{k:[20,78],f:[3,68]}, leg2:{k:[22,80],f:[5,70]}}
  ],
  steps:[
    'Lie face down, arms extended overhead, legs straight.',
    'Simultaneously lift your arms, chest, and legs off the floor.',
    'Squeeze your glutes and lower back at the top.',
    'Hold briefly, then lower with control.',
    'Keep the movement smooth — don\u2019t jerk upward.'
  ], tip:'This balances out all the forward-flexed sitting most people do during the day.'},
];

/* fix a small typo-safe access for dead bug pose 2 leg1 (uses f, not ha) */
STRENGTH.find(x=>x.id==='sx_deadbug').poses[1].leg1 = {k:[65,75], f:[85,78]};
