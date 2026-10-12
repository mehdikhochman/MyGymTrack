// 3D demo data: each movement is two key poses that the mannequin loops between.
// Angles in degrees, all relative to standing upright:
//   torso: lean forward · hip: thigh forward (negative = behind) · knee/elbow: bend · ankle: heel up
//   shoulder: arm forward/up (180 = overhead) · armOut: arm out to the side · adduct: arm swings to the front
//   elbowOut: elbow bend sideways (forearm up, e.g. bar on the back)
//   body: tilt of the whole body. Suffix L/R targets one side only.
export type Pose = Record<string, number>;
export type Move = {
  base: 'stand' | 'seated' | 'supine' | 'prone';
  pin?: 'feet' | 'footL' | 'toes' | 'hands'; // point kept fixed while the rest moves
  y?: number; // pelvis height when nothing is pinned
  props?: ('barbell' | 'dumbbells' | 'bench' | 'seat' | 'pullbar' | 'dipbars')[];
  a: Pose;
  b: Pose;
};

const hinge = { torso: 70, hip: 8, knee: 18, shoulder: 70 }; // bent over, arms hanging

const MOVES: Record<string, Move> = {
  squat: { base: 'stand', pin: 'feet', props: ['barbell'], a: { shoulder: -15, armOut: 45, elbowOut: 110 }, b: { hip: 95, knee: 115, torso: 40, shoulder: -15, armOut: 45, elbowOut: 110 } },
  lunge: { base: 'stand', pin: 'footL', props: ['dumbbells'], a: { hipL: 25, hipR: -20, kneeL: 10, kneeR: 10 }, b: { hipL: 80, hipR: -15, kneeL: 90, kneeR: 95 } },
  legPress: { base: 'supine', y: 0.55, props: ['bench'], a: { body: 40, hip: 125, knee: 115 }, b: { body: 40, hip: 75, knee: 10 } },
  legExt: { base: 'seated', y: 0.55, props: ['seat'], a: { knee: 90 }, b: { knee: 5 } },
  legCurlSeated: { base: 'seated', y: 0.55, props: ['seat'], a: { knee: 5 }, b: { knee: 100 } },
  legCurlLying: { base: 'prone', y: 0.5, props: ['bench'], a: { knee: 0 }, b: { knee: 110 } },
  deadlift: { base: 'stand', pin: 'feet', props: ['barbell'], a: { torso: 55, hip: 60, knee: 95, shoulder: 55 }, b: {} },
  rdl: { base: 'stand', pin: 'feet', props: ['barbell'], a: {}, b: { torso: 75, hip: 10, knee: 18, shoulder: 75 } },
  bridge: { base: 'supine', pin: 'feet', a: { hip: 60, knee: 110 }, b: { body: 25, hip: 25, knee: 95 } },
  calf: { base: 'stand', pin: 'toes', props: ['dumbbells'], a: {}, b: { ankle: 45 } },
  calfSeated: { base: 'seated', pin: 'toes', props: ['seat'], a: {}, b: { ankle: 45 } },
  bench: { base: 'supine', y: 0.55, props: ['bench', 'barbell'], a: { shoulder: 25, armOut: 30, elbow: 110 }, b: { shoulder: 90, armOut: 15 } },
  incline: { base: 'supine', y: 0.55, props: ['bench', 'dumbbells'], a: { body: 35, hip: 50, knee: 70, shoulder: 25, armOut: 30, elbow: 110 }, b: { body: 35, hip: 50, knee: 70, shoulder: 90, armOut: 10 } },
  pushup: { base: 'prone', pin: 'hands', a: { body: -15, shoulder: 75, armOut: 15 }, b: { body: -5, shoulder: 35, armOut: 40, elbow: 95 } },
  dips: { base: 'stand', pin: 'hands', props: ['dipbars'], a: { hip: 30, knee: 95 }, b: { hip: 30, knee: 95, torso: 20, shoulder: -45, elbow: 95 } },
  fly: { base: 'seated', y: 0.55, props: ['seat'], a: { armOut: 85, elbow: 20 }, b: { armOut: 85, adduct: 85, elbow: 20 } },
  press: { base: 'stand', pin: 'feet', props: ['barbell'], a: { shoulder: 25, armOut: 20, elbow: 150 }, b: { shoulder: 175, armOut: 15 } },
  lateral: { base: 'stand', pin: 'feet', props: ['dumbbells'], a: { armOut: 12, elbow: 10 }, b: { armOut: 85, elbow: 10 } },
  rearFly: { base: 'stand', pin: 'feet', props: ['dumbbells'], a: { ...hinge }, b: { ...hinge, adduct: -80, armOut: 80, shoulder: 70 } },
  facePull: { base: 'stand', pin: 'feet', a: { armOut: 90, adduct: 85 }, b: { armOut: 90, adduct: 10, elbowOut: 90 } },
  row: { base: 'stand', pin: 'feet', props: ['barbell'], a: { torso: 50, hip: 10, knee: 20, shoulder: 50 }, b: { torso: 50, hip: 10, knee: 20, shoulder: -20, elbow: 70 } },
  seatedRow: { base: 'seated', y: 0.55, props: ['seat'], a: { torso: 15, shoulder: 90 }, b: { torso: -5, shoulder: 10, elbow: 110 } },
  pullup: { base: 'stand', pin: 'hands', props: ['pullbar'], a: { shoulder: 170, armOut: 25, knee: 30 }, b: { shoulder: 110, armOut: 35, elbow: 120, knee: 30 } },
  pulldown: { base: 'seated', y: 0.55, props: ['seat', 'barbell'], a: { shoulder: 165, armOut: 25 }, b: { shoulder: 95, armOut: 35, elbow: 120 } },
  curl: { base: 'stand', pin: 'feet', props: ['dumbbells'], a: { elbow: 10 }, b: { elbow: 140 } },
  preacher: { base: 'seated', y: 0.55, props: ['seat', 'barbell'], a: { shoulder: 40, elbow: 20 }, b: { shoulder: 40, elbow: 130 } },
  skull: { base: 'supine', y: 0.55, props: ['bench', 'barbell'], a: { shoulder: 100 }, b: { shoulder: 100, elbow: 115 } },
  pushdown: { base: 'stand', pin: 'feet', a: { torso: 10, shoulder: 10, elbow: 100 }, b: { torso: 10, shoulder: 10 } },
  overheadExt: { base: 'stand', pin: 'feet', props: ['dumbbells'], a: { shoulder: 170, elbow: 140 }, b: { shoulder: 170, elbow: 5 } },
  kickback: { base: 'stand', pin: 'feet', props: ['dumbbells'], a: { ...hinge, shoulder: -10, elbow: 90 }, b: { ...hinge, shoulder: -10 } },
  crunch: { base: 'supine', y: 0.12, a: { hip: 60, knee: 100, shoulder: 150, elbow: 140 }, b: { hip: 60, knee: 100, shoulder: 150, elbow: 140, torso: 30 } },
  legRaise: { base: 'stand', pin: 'hands', props: ['pullbar'], a: { shoulder: 170, armOut: 25 }, b: { shoulder: 170, armOut: 25, hip: 90, knee: 10 } },
  plank: { base: 'prone', y: 0.3, a: { shoulder: 90, elbow: 90 }, b: { shoulder: 90, elbow: 90, body: -4 } },
};

const BY_EXERCISE: Record<string, string> = {
  'Développé couché': 'bench', 'Développé incliné haltères': 'incline', Dips: 'dips', 'Écarté poulie': 'fly', 'Pec deck': 'fly', 'Pompes lestées': 'pushup',
  Tractions: 'pullup', 'Rowing barre': 'row', 'Tirage vertical': 'pulldown', 'Rowing haltère': 'row', 'Tirage horizontal': 'seatedRow', 'Soulevé de terre': 'deadlift',
  'Développé militaire': 'press', 'Développé haltères assis': 'press', 'Élévations latérales': 'lateral', Oiseau: 'rearFly', 'Face pull': 'facePull',
  'Curl barre': 'curl', 'Curl haltères': 'curl', 'Curl marteau': 'curl', 'Curl pupitre': 'preacher', 'Curl poulie': 'curl',
  'Barre au front': 'skull', 'Extension poulie': 'pushdown', 'Extension nuque haltère': 'overheadExt', 'Développé couché prise serrée': 'bench', Kickback: 'kickback',
  Squat: 'squat', 'Presse à cuisses': 'legPress', 'Hack squat': 'squat', 'Squat bulgare': 'lunge', Fentes: 'lunge', 'Leg extension': 'legExt',
  'Soulevé de terre roumain': 'rdl', 'Leg curl assis': 'legCurlSeated', 'Leg curl allongé': 'legCurlLying', 'Hip thrust': 'bridge', 'Good morning': 'rdl',
  'Mollets debout': 'calf', 'Mollets assis': 'calfSeated', 'Mollets à la presse': 'calf', 'Mollets unilatéral haltère': 'calf', 'Donkey calf raise': 'calf',
  Crunch: 'crunch', 'Relevé de jambes': 'legRaise', 'Crunch poulie': 'crunch', Gainage: 'plank', 'Roue abdominale': 'plank',
};

// Custom exercises get the typical movement of their muscle.
const BY_MUSCLE: Record<string, string> = {
  Pecs: 'bench', Dos: 'row', Épaules: 'press', Biceps: 'curl', Triceps: 'pushdown', Quadriceps: 'squat', Ischios: 'rdl', Mollets: 'calf', Abdos: 'crunch',
};

export const moveFor = (exercise: string, muscle: string) => MOVES[BY_EXERCISE[exercise] ?? BY_MUSCLE[muscle]];
