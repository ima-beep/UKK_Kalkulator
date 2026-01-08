// quick converter checks for development
const lengthUnits = {
  km: 1000,
  hm: 100,
  dam: 10,
  m: 1,
  dm: 0.1,
  cm: 0.01,
  mm: 0.001,
  in: 0.0254,
  ft: 0.3048
};

const weightUnits = {
  kg: 1,
  hg: 0.1,
  dag: 0.01,
  g: 0.001,
  dg: 0.0001,
  cg: 0.00001,
  mg: 0.000001,
  lb: 0.45359237,
  oz: 0.0283495231
};

function convertLength(val, fromUnit, toUnit) {
  const n = Number(val);
  if (Number.isNaN(n)) return 0;
  const meters = n * (lengthUnits[fromUnit] ?? 1);
  return meters / (lengthUnits[toUnit] ?? 1);
}

function convertWeight(val, fromUnit, toUnit) {
  const n = Number(val);
  if (Number.isNaN(n)) return 0;
  const kg = n * (weightUnits[fromUnit] ?? 1);
  return kg / (weightUnits[toUnit] ?? 1);
}

function toFahrenheit(c) { return Number(c) * 9/5 + 32; }
function toKelvin(c) { return Number(c) + 273.15; }
function toReamur(c) { return Number(c) * 0.8; }

function test(title, actual, expected) {
  const pass = Math.abs(actual - expected) < 1e-6;
  console.log(`${pass ? '✓' : '✗'} ${title}: got=${actual} expected=${expected}`);
}

console.log('Length tests');
test('1 km -> m', convertLength(1,'km','m'), 1000);
test('100 cm -> m', convertLength(100,'cm','m'), 1);
test('1 m -> cm', convertLength(1,'m','cm'), 100);
test('2 ft -> in', convertLength(2,'ft','in'), (2*0.3048)/0.0254);

console.log('\nWeight tests');
test('1000 g -> kg', convertWeight(1000,'g','kg'), 1);
test('1 kg -> g', convertWeight(1,'kg','g'), 1000);
test('1 lb -> g', convertWeight(1,'lb','g'), (1*0.45359237)/0.001);

console.log('\nTemperature tests');
test('0 C -> K', toKelvin(0), 273.15);
test('100 C -> F', toFahrenheit(100), 212);
test('20 C -> Reamur', toReamur(20), 16);

console.log('\nAll tests complete.');
