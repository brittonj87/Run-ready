/* ---------- Flat-design cartoon-figure renderer (static, 5-panel) ---------- */
const FIG_SKIN = '#EFB489';
const FIG_SHORTS = '#33415C';
const FIG_SHOE = '#20242E';
const FIG_INK = '#20242E';
const FIG_HAIR = '#3E2C22';

/* Draws a tapered limb as a filled quadrilateral between two points, with
   a thin outline for a clean flat-illustration edge. */
function taperedLimb(p1, p2, w1, w2, color, opacity){
  const dx = p2[0]-p1[0], dy = p2[1]-p1[1];
  const len = Math.sqrt(dx*dx+dy*dy) || 0.0001;
  const nx = -dy/len, ny = dx/len;
  const a = [p1[0]+nx*w1/2, p1[1]+ny*w1/2];
  const b = [p2[0]+nx*w2/2, p2[1]+ny*w2/2];
  const c = [p2[0]-nx*w2/2, p2[1]-ny*w2/2];
  const d = [p1[0]-nx*w1/2, p1[1]-ny*w1/2];
  const pts = [a,b,c,d].map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
  const op = opacity!==undefined ? ` opacity="${opacity}"` : '';
  return `<polygon points="${pts}" fill="${color}" stroke="rgba(20,24,34,0.16)" stroke-width="1"${op}/>`;
}
function jointCap(pt, r, color, opacity){
  const op = opacity!==undefined ? ` opacity="${opacity}"` : '';
  return `<circle cx="${pt[0].toFixed(1)}" cy="${pt[1].toFixed(1)}" r="${r}" fill="${color}" stroke="rgba(20,24,34,0.16)" stroke-width="1"${op}/>`;
}

/* Renders one still cartoon figure at a single pose (no animation). */
function renderStaticFigure(p, color){
  const BACK_OP = 0.82; // back limbs drawn slightly muted for a sense of depth
  let svg = `<line x1="4" y1="113" x2="96" y2="113" stroke="#000" stroke-width="1.5" opacity="0.08"/>`;

  // back leg (leg2)
  svg += taperedLimb(p.h, p.leg2.k, 11, 8, FIG_SHORTS, BACK_OP);
  svg += jointCap(p.leg2.k, 4, FIG_SKIN, BACK_OP);
  svg += taperedLimb(p.leg2.k, p.leg2.f, 7.4, 5.8, FIG_SKIN, BACK_OP);
  svg += jointCap(p.leg2.f, 4.2, FIG_SHOE, BACK_OP);

  // torso (tapered: broader shoulders, narrower waist)
  svg += taperedLimb(p.s, p.h, 16, 12.5, color);

  // back arm (arm2)
  svg += taperedLimb(p.s, p.arm2.el, 8.2, 6.8, color, BACK_OP);
  svg += jointCap(p.arm2.el, 3.5, FIG_SKIN, BACK_OP);
  svg += taperedLimb(p.arm2.el, p.arm2.ha, 6.3, 4.8, FIG_SKIN, BACK_OP);
  svg += jointCap(p.arm2.ha, 3.6, FIG_SKIN, BACK_OP);

  // front leg (leg1)
  svg += taperedLimb(p.h, p.leg1.k, 11.5, 8.6, FIG_SHORTS);
  svg += jointCap(p.leg1.k, 4.3, FIG_SKIN);
  svg += taperedLimb(p.leg1.k, p.leg1.f, 8, 6.2, FIG_SKIN);
  svg += jointCap(p.leg1.f, 4.5, FIG_SHOE);

  // front arm (arm1)
  svg += taperedLimb(p.s, p.arm1.el, 8.8, 7.2, color);
  svg += jointCap(p.arm1.el, 3.8, FIG_SKIN);
  svg += taperedLimb(p.arm1.el, p.arm1.ha, 6.6, 5, FIG_SKIN);
  svg += jointCap(p.arm1.ha, 3.9, FIG_SKIN);

  // neck, head, hair, face
  const h0 = p.head;
  svg += taperedLimb(p.s, h0, 7.5, 6.2, FIG_SKIN);
  svg += `<circle cx="${h0[0]}" cy="${h0[1]}" r="9.5" fill="${FIG_SKIN}" stroke="rgba(20,24,34,0.16)" stroke-width="1"/>`;
  svg += `<path d="M ${h0[0]-9.2} ${h0[1]-1.5}
                   Q ${h0[0]-10} ${h0[1]-14} ${h0[0]} ${h0[1]-13.5}
                   Q ${h0[0]+10} ${h0[1]-14} ${h0[0]+9.2} ${h0[1]-1.5}
                   Q ${h0[0]+7} ${h0[1]-9} ${h0[0]} ${h0[1]-9}
                   Q ${h0[0]-7} ${h0[1]-9} ${h0[0]-9.2} ${h0[1]-1.5} Z" fill="${FIG_HAIR}"/>`;
  svg += `<circle cx="${h0[0]+8.5}" cy="${h0[1]-2}" r="2.8" fill="${FIG_HAIR}"/>`;
  svg += `<circle cx="${h0[0]-3}" cy="${h0[1]-1}" r="1.3" fill="${FIG_INK}"/>`;
  svg += `<circle cx="${h0[0]+3}" cy="${h0[1]-1}" r="1.3" fill="${FIG_INK}"/>`;
  svg += `<path d="M ${h0[0]-3} ${h0[1]+3.4} Q ${h0[0]} ${h0[1]+6.4} ${h0[0]+3} ${h0[1]+3.4}" stroke="${FIG_INK}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;

  return `<svg viewBox="0 0 100 122" class="diagram" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`;
}

function lerpPose(a,b,t){
  const L = (p,q) => [p[0]+(q[0]-p[0])*t, p[1]+(q[1]-p[1])*t];
  return {
    head:L(a.head,b.head), s:L(a.s,b.s), h:L(a.h,b.h),
    arm1:{el:L(a.arm1.el,b.arm1.el), ha:L(a.arm1.ha,b.arm1.ha)},
    arm2:{el:L(a.arm2.el,b.arm2.el), ha:L(a.arm2.ha,b.arm2.ha)},
    leg1:{k:L(a.leg1.k,b.leg1.k), f:L(a.leg1.f,b.leg1.f)},
    leg2:{k:L(a.leg2.k,b.leg2.k), f:L(a.leg2.f,b.leg2.f)}
  };
}

/* 5 keyframes across the movement, matched to the 5 instruction steps.
   Hold-type moves (stretches, isometric strength) ease in and settle into
   the held position for the last few steps. Rep-type moves (squats, bridges,
   etc.) go start -> halfway -> full rep -> halfway -> back to start. */
function fivePanelFrames(poses, holdType){
  const [a,b] = poses;
  const ts = holdType ? [0, 0.35, 0.7, 0.9, 1] : [0, 0.5, 1, 0.5, 0];
  return ts.map(t=>lerpPose(a,b,t));
}

function stepPanels(obj, color, holdType){
  const frames = fivePanelFrames(obj.poses, holdType);
  return frames.map((f,i)=>({ svg: renderStaticFigure(f, color), text: obj.steps[i] || '' }));
}
function cardThumb(obj, color, holdType){
  const [a,b] = obj.poses;
  return renderStaticFigure(lerpPose(a,b, holdType ? 0.75 : 1), color);
}

function stretchStepPanels(s, color){ return stepPanels(s, color, true); }
function stretchCardThumb(s, color){ return cardThumb(s, color, true); }
function strengthStepPanels(s, color){ return stepPanels(s, color, !!s.isHold); }
function strengthCardThumb(s, color){ return cardThumb(s, color, !!s.isHold); }

const STRETCHES = [
{ id:'st_quad', name:'Standing Quad Stretch', target:'Quads', hold:'60s each side',
  image:'images/st_quad.png', imageThumb:'images/st_quad_thumb.png',
  poses:[
    {head:[47,16],s:[47,28],h:[47,58], arm1:{el:[39,38],ha:[33,47]}, arm2:{el:[55,38],ha:[61,47]}, leg1:{k:[45,85],f:[43,112]}, leg2:{k:[49,85],f:[47,112]}},
    {head:[50,14],s:[50,27],h:[47,58], arm1:{el:[58,42],ha:[64,66]}, arm2:{el:[36,32],ha:[26,26]}, leg1:{k:[45,86],f:[43,112]}, leg2:{k:[55,74],f:[62,66]}}
  ],
  steps:[
    'Stand tall, holding a wall or chair for balance if needed.',
    'Bend one knee, bringing your heel toward your glutes.',
    'Grab your ankle and gently pull it closer, keeping knees together.',
    'Keep your torso upright — don\u2019t lean forward.',
    'Hold, then switch sides.'
  ], tip:'Keep your standing knee soft, not locked, to protect the joint.'},

{ id:'st_hamstring', name:'Seated Hamstring Stretch', target:'Hamstrings', hold:'60s each side',
  image:'images/st_hamstring.png', imageThumb:'images/st_hamstring_thumb.png',
  poses:[
    {head:[38,32],s:[35,44],h:[35,72], arm1:{el:[40,56],ha:[44,70]}, arm2:{el:[32,56],ha:[28,70]}, leg1:{k:[60,73],f:[88,75]}, leg2:{k:[60,76],f:[88,79]}},
    {head:[58,46],s:[52,40],h:[35,72], arm1:{el:[60,56],ha:[72,68]}, arm2:{el:[56,58],ha:[68,71]}, leg1:{k:[60,73],f:[88,75]}, leg2:{k:[60,76],f:[88,79]}}
  ],
  steps:[
    'Sit on the floor with both legs extended straight in front of you.',
    'Flex your feet, toes pointing up.',
    'Hinge forward from the hips, reaching toward your toes.',
    'Keep your back long rather than rounding through the shoulders.',
    'Hold, breathing steadily.'
  ], tip:'It\u2019s fine if you can\u2019t reach your toes — bend knees slightly if hamstrings are very tight.'},

{ id:'st_calf', name:'Wall Calf Stretch', target:'Calves', hold:'60s each side',
  image:'images/st_calf.png', imageThumb:'images/st_calf_thumb.png',
  poses:[
    {head:[64,16],s:[62,28],h:[60,58], arm1:{el:[54,38],ha:[48,47]}, arm2:{el:[70,38],ha:[76,47]}, leg1:{k:[60,85],f:[58,112]}, leg2:{k:[63,85],f:[65,112]}},
    {head:[70,16],s:[68,28],h:[62,58], arm1:{el:[76,35],ha:[88,32]}, arm2:{el:[74,38],ha:[86,38]}, leg1:{k:[58,80],f:[52,112]}, leg2:{k:[70,90],f:[85,110]}}
  ],
  steps:[
    'Face a wall, hands pressed against it at shoulder height.',
    'Step one foot back, keeping the back leg straight and heel flat on the floor.',
    'Bend your front knee and lean into the wall until you feel a stretch in the back calf.',
    'Keep the back foot pointed straight ahead.',
    'Hold, then switch sides.'
  ], tip:'For a deeper stretch lower down the calf, bend the back knee slightly while keeping the heel down.'},

{ id:'st_hipflexor', name:'Kneeling Hip Flexor Stretch', target:'Hip flexors', hold:'60s each side',
  image:'images/st_hipflexor.png', imageThumb:'images/st_hipflexor_thumb.png',
  poses:[
    {head:[45,16],s:[45,28],h:[45,58], arm1:{el:[38,38],ha:[33,47]}, arm2:{el:[52,38],ha:[57,47]}, leg1:{k:[43,85],f:[41,112]}, leg2:{k:[47,85],f:[49,112]}},
    {head:[45,25],s:[45,36],h:[45,64], arm1:{el:[52,48],ha:[55,60]}, arm2:{el:[38,48],ha:[35,60]}, leg1:{k:[35,86],f:[30,110]}, leg2:{k:[60,105],f:[75,108]}}
  ],
  steps:[
    'Kneel on one knee (use a mat or towel for padding), other foot planted in front, knee bent 90°.',
    'Keep your torso tall and engage your glutes on the kneeling side.',
    'Gently shift your hips forward until you feel a stretch at the front of the back hip.',
    'Avoid letting your lower back arch — squeeze your abs slightly.',
    'Hold, then switch sides.'
  ], tip:'Tight hip flexors are common in runners and can pull on the lower back — this one\'s worth doing daily.'},

{ id:'st_glute', name:'Standing Figure-4 Glute Stretch', target:'Glutes / piriformis', hold:'60s each side',
  image:'images/st_glute.png', imageThumb:'images/st_glute_thumb.png',
  poses:[
    {head:[48,16],s:[48,28],h:[46,58], arm1:{el:[40,38],ha:[35,47]}, arm2:{el:[56,38],ha:[61,47]}, leg1:{k:[44,85],f:[42,112]}, leg2:{k:[48,85],f:[50,112]}},
    {head:[48,18],s:[48,30],h:[46,62], arm1:{el:[55,46],ha:[58,56]}, arm2:{el:[40,44],ha:[36,52]}, leg1:{k:[42,88],f:[40,112]}, leg2:{k:[58,74],f:[64,72]}}
  ],
  steps:[
    'Stand tall, holding onto a wall or chair for balance.',
    'Cross one ankle over the opposite knee, shin roughly parallel to the floor.',
    'Slowly bend your standing leg, sitting your hips back slightly.',
    'Keep your chest lifted and the crossed ankle flexed.',
    'Hold, then switch sides.'
  ], tip:'This one targets the glutes and piriformis, which can tighten up and cause hip or lower-back tightness in runners.'},

{ id:'st_itband', name:'Standing IT Band Stretch', target:'IT band / outer hip', hold:'60s each side',
  image:'images/st_itband.png', imageThumb:'images/st_itband_thumb.png',
  poses:[
    {head:[50,16],s:[50,28],h:[48,58], arm1:{el:[42,38],ha:[36,47]}, arm2:{el:[58,38],ha:[64,47]}, leg1:{k:[48,85],f:[46,112]}, leg2:{k:[52,85],f:[54,112]}},
    {head:[62,20],s:[58,30],h:[50,60], arm1:{el:[68,20],ha:[78,10]}, arm2:{el:[42,42],ha:[38,52]}, leg1:{k:[52,86],f:[60,112]}, leg2:{k:[46,88],f:[38,110]}}
  ],
  steps:[
    'Stand tall and cross one leg behind the other.',
    'Reach the same-side arm overhead and lean your torso away from that side.',
    'Push your hip out to the side to deepen the stretch along the outer thigh.',
    'Keep both feet flat and grounded.',
    'Hold, then switch sides.'
  ], tip:'A tight IT band is a common cause of outer-knee pain in runners — this stretch plus foam rolling can help.'},

{ id:'st_butterfly', name:'Butterfly Stretch', target:'Inner thighs / groin', hold:'60s',
  image:'images/st_butterfly.png', imageThumb:'images/st_butterfly_thumb.png',
  poses:[
    {head:[50,32],s:[48,28],h:[48,72], arm1:{el:[42,45],ha:[38,58]}, arm2:{el:[54,45],ha:[58,58]}, leg1:{k:[33,66],f:[40,90]}, leg2:{k:[63,66],f:[56,90]}},
    {head:[50,50],s:[48,42],h:[48,76], arm1:{el:[42,58],ha:[38,72]}, arm2:{el:[54,58],ha:[58,72]}, leg1:{k:[30,88],f:[46,90]}, leg2:{k:[66,88],f:[50,90]}}
  ],
  steps:[
    'Sit on the floor and bring the soles of your feet together.',
    'Let your knees fall open toward the ground.',
    'Hold your feet and gently hinge forward from the hips.',
    'Keep your spine long rather than rounding.',
    'Hold, breathing deeply.'
  ], tip:'Never bounce in a stretch — ease in gradually and let the muscle relax.'},

{ id:'st_downdog', name:'Downward Dog', target:'Calves / hamstrings / back', hold:'60s',
  image:'images/st_downdog.png', imageThumb:'images/st_downdog_thumb.png',
  poses:[
    {head:[62,58],s:[57,55],h:[38,56], arm1:{el:[63,66],ha:[68,86]}, arm2:{el:[60,68],ha:[65,87]}, leg1:{k:[24,58],f:[13,84]}, leg2:{k:[26,60],f:[15,86]}},
    {head:[55,55],s:[50,50],h:[35,40], arm1:{el:[65,65],ha:[78,90]}, arm2:{el:[63,68],ha:[76,92]}, leg1:{k:[25,70],f:[18,110]}, leg2:{k:[28,72],f:[22,110]}}
  ],
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
  image:'images/squat.png', imageThumb:'images/squat_thumb.png',
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
  image:'images/lunge.png', imageThumb:'images/lunge_thumb.png',
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
  image:'images/glutebridge.png', imageThumb:'images/glutebridge_thumb.png',
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

{ id:'sx_wallsit', cat:'leg', name:'Wall Sit', target:'Quads (isometric)', reps:'3 sets x 30-45s hold', isHold:true,
  image:'images/wallsit.png', imageThumb:'images/wallsit_thumb.png',
  poses:[
    {head:[75,16],s:[74,28],h:[70,58], arm1:{el:[65,38],ha:[58,47]}, arm2:{el:[83,38],ha:[90,47]}, leg1:{k:[71,85],f:[70,112]}, leg2:{k:[74,85],f:[75,112]}},
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
  image:'images/calfraise.png', imageThumb:'images/calfraise_thumb.png',
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
{ id:'sx_plank', cat:'core', name:'Forearm Plank', target:'Core (isometric)', reps:'3 sets x 30-45s hold', isHold:true,
  poses:[
    {head:[90,60],s:[78,60],h:[45,62], arm1:{el:[78,75],ha:[78,92]}, arm2:{el:[76,76],ha:[76,93]}, leg1:{k:[30,85],f:[15,90]}, leg2:{k:[28,86],f:[13,91]}},
    {head:[90,58],s:[78,58],h:[40,58], arm1:{el:[78,75],ha:[78,92]}, arm2:{el:[76,76],ha:[76,93]}, leg1:{k:[20,60],f:[7,90]}, leg2:{k:[18,62],f:[5,92]}}
  ],
  steps:[
    'Get into a forearm plank: elbows under shoulders, forearms flat on the floor.',
    'Extend your legs back, resting on your toes.',
    'Keep your body in one straight line from head to heels.',
    'Brace your abs and squeeze your glutes — don\u2019t let your hips sag or pike up.',
    'Hold, breathing steadily throughout.'
  ], tip:'Quality over duration — a strict 20s plank beats a sagging 60s one.'},

{ id:'sx_sideplank', cat:'core', name:'Side Plank', target:'Obliques / hips', reps:'3 sets x 20-30s each side', isHold:true,
  poses:[
    {head:[72,52],s:[62,52],h:[35,58], arm1:{el:[64,62],ha:[64,80]}, arm2:{el:[58,45],ha:[50,38]}, leg1:{k:[16,58],f:[4,60]}, leg2:{k:[17,56],f:[5,58]}},
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
    {head:[15,80],s:[28,80],h:[50,80], arm1:{el:[10,65],ha:[-4,50]}, arm2:{el:[32,60],ha:[32,42]}, leg1:{k:[65,75],f:[85,78]}, leg2:{k:[58,60],f:[70,60]}}
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
