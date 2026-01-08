"use client";

import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [display, setDisplay] = useState("0");
  const [acc, setAcc] = useState(null); // (no longer used for compute stack)
  const [operator, setOperator] = useState(null);
  const [waiting, setWaiting] = useState(false); // (kept for compatibility)
  const [degMode, setDegMode] = useState(true); // degrees by default for trig

  const setDisplayValue = (value) => {
    setDisplay(String(value));
    setWaiting(false);
  };

  function inputDigit(d) {
    setDisplay((prev) => {
      if (prev === '0' || waiting) {
        setWaiting(false);
        return String(d);
      }
      return prev + String(d);
    });
  }

  function inputDot() {
    setDisplay((prev) => {
      if (waiting) {
        setWaiting(false);
        return '0.';
      }
      // avoid multiple dots in the current number token
      const parts = prev.split(/[^0-9.]+/);
      const last = parts[parts.length - 1] || '';
      if (last.includes('.')) return prev;
      return prev + '.';
    });
  }

  function clearEntry() {
    setDisplay('0');
  }

  function clearAll() {
    setDisplay('0');
    setAcc(null);
    setOperator(null);
    setWaiting(false);
  }

  function backspace() {
    setDisplay((prev) => {
      if (prev.length <= 1) return '0';
      const next = prev.slice(0, -1);
      // if becomes empty or just '-', reset to 0
      if (next === '' || next === '-') return '0';
      return next;
    });
  }

  function toggleSign() {
    setDisplay((prev) => {
      // toggle sign of the last number token
      const m = prev.match(/(.*?)(-?\d+\.?\d*)$/);
      if (!m) return prev;
      const prefix = m[1] || '';
      const num = m[2] || '0';
      if (num.startsWith('-')) return prefix + num.slice(1);
      return prefix + '-' + num;
    });
  }

  function inputPercent() {
    // convert last number token to percent
    setDisplay((prev) => {
      const m = prev.match(/(.*?)(-?\d+\.?\d*)$/);
      if (!m) return prev;
      const prefix = m[1] || '';
      const num = parseFloat(m[2]) || 0;
      return prefix + String(num / 100);
    });
  }

  function performUnary(op) {
    // apply unary op to the last number token or entire expression
    setDisplay((prev) => {
      // attempt to apply to last numeric token
      const m = prev.match(/(.*?)(-?\d+\.?\d*)$/);
      let prefix = '';
      let numStr = prev;
      if (m) {
        prefix = m[1] || '';
        numStr = m[2] || '0';
      }
      const x = parseFloat(numStr);
      if (isNaN(x)) return prev;
      let res;
      switch (op) {
        case '1/x':
          if (x === 0) return 'Error';
          res = 1 / x;
          break;
        case 'x²':
          res = x * x;
          break;
        case '√x':
          if (x < 0) return 'Error';
          res = Math.sqrt(x);
          break;
        default:
          return prev;
      }
      return prefix + String(res);
    });
  }

  function appendOperator(op) {
    setDisplay((prev) => {
      if (prev === 'Error') return String(op);
      // avoid duplicate operators
      if (/[+\-*/×÷^]$/.test(prev)) {
        return prev.slice(0, -1) + op;
      }
      return prev + op;
    });
    setWaiting(false);
  }

  function compute(a, b, op) {
    if (a == null) return b;
    switch (op) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '×':
        return a * b;
      case '÷':
        if (b === 0) return 'Error';
        return a / b;
      default:
        return b;
    }
  }

  function evaluateExpression(expr) {
    try {
      if (!expr || expr.trim() === '') return '0';
      let e = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/\u2212/g, '-');
      // replace π with Math.PI
      e = e.replace(/π/g, 'Math.PI');
      // handle power ^ -> **
      e = e.replace(/\^/g, '**');
      // functions: ln -> Math.log, log -> Math.log10, sqrt -> Math.sqrt
      e = e.replace(/\blog\b/g, 'Math.log10').replace(/\bln\b/g, 'Math.log').replace(/\bsqrt\b/g, 'Math.sqrt');
      // trig: sin/cos/tan - if in degree mode wrap argument with deg()
      let prefix = '';
      if (degMode) {
        prefix = 'const deg = x=>x*Math.PI/180;';
        e = e.replace(/sin\(/g, 'Math.sin(deg(').replace(/cos\(/g, 'Math.cos(deg(').replace(/tan\(/g, 'Math.tan(deg(');
        // add closing paren for deg() after matching opening paren
        let openCount = 0;
        let result = '';
        for (let i = 0; i < e.length; i++) {
          result += e[i];
          if (e[i] === '(') openCount++;
          else if (e[i] === ')') {
            openCount--;
            // if we're closing a deg() call, add extra closing paren
            if (openCount >= 0 && (e.substring(Math.max(0, i-10), i).includes('deg(') || e.substring(Math.max(0, i-10), i).includes('Math.sin(deg(') || e.substring(Math.max(0, i-10), i).includes('Math.cos(deg(') || e.substring(Math.max(0, i-10), i).includes('Math.tan(deg('))) {
              // simplified: if previous chars contain deg(, we need closing paren
            }
          }
        }
        // simpler approach: count parentheses and add closing parens for deg()
        const degCount = (e.match(/Math\.sin\(deg\(|Math\.cos\(deg\(|Math\.tan\(deg\(/g) || []).length;
        for (let i = 0; i < degCount; i++) {
          e += ')';
        }
      } else {
        e = e.replace(/sin\(/g, 'Math.sin(').replace(/cos\(/g, 'Math.cos(').replace(/tan\(/g, 'Math.tan(');
      }

      // handle factorial n! by replacing occurrences with computed number
      const factPattern = /([0-9]+(?:\.[0-9]+)?)!/g;
      e = e.replace(factPattern, (m, g1) => {
        const n = Number(g1);
        if (!Number.isInteger(n) || n < 0) throw new Error('Invalid factorial');
        let f = 1;
        for (let i = 2; i <= n; i++) f *= i;
        return String(f);
      });

      // evaluate
  const fn = new Function(prefix + ' return (' + e + ')');
      const res = fn();
      if (res === Infinity || Number.isNaN(res)) return 'Error';
      return String(res);
    } catch (err) {
      return 'Error';
    }
  }

  function handleEqual() {
    const result = evaluateExpression(display);
    setDisplay(result);
    setWaiting(true);
  }

  // simple keyboard support
  function handleKey(e) {
    const key = e.key;
    if (/^[0-9]$/.test(key)) inputDigit(key);
    else if (key === '.') inputDot();
    else if (key === '+' || key === '-') appendOperator(key);
    else if (key === '*') appendOperator('*');
    else if (key === '/') appendOperator('/');
    else if (key === 'Enter' || key === '=') handleEqual();
    else if (key === 'Backspace') backspace();
  }

  // --- converters state ---
  const [tab, setTab] = useState('temperature');

  // temperature 
  const [tempC, setTempC] = useState('0');

  // length
  const [lenVal, setLenVal] = useState('1');
  const [lenUnit, setLenUnit] = useState('m');
  const [lenTarget, setLenTarget] = useState('cm');

  // weight
  const [weightVal, setWeightVal] = useState('1');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [weightTarget, setWeightTarget] = useState('g');

  // currency
  const [curVal, setCurVal] = useState('10000');
  const [curUnit, setCurUnit] = useState('IDR');
  const [idrPerUsd, setIdrPerUsd] = useState(15000); // default editable rate
  const [jpyPerUsd, setJpyPerUsd] = useState(150); // default editable rate
  const [krwPerUsd, setKrwPerUsd] = useState(1300); // default editable rate for KRW

  // temperature helpers
  const toFahrenheit = (c) => {
    const n = parseFloat(c) || 0;
    return (n * 9/5 + 32).toFixed(2);
  };
  const toKelvin = (c) => {
    const n = parseFloat(c) || 0;
    return (n + 273.15).toFixed(2);
  };
  const toReamur = (c) => {
    const n = parseFloat(c) || 0;
    return (n * 0.8).toFixed(2);
  };

  // length helpers - convert to base unit (meter) then to target
  // include metric prefixes from kilo -> milli plus common imperial units
  const lengthUnits = {
    km: 1000,   // kilometer
    hm: 100,    // hectometer
    dam: 10,    // decameter
    m: 1,       // meter
    dm: 0.1,    // decimeter
    cm: 0.01,   // centimeter
    mm: 0.001,  // millimeter
    in: 0.0254, // inch
    ft: 0.3048  // foot
  };

  // helper: format numeric output - trim trailing zeros and small/large detection
  const formatNumberSmart = (v, decimals = 6) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return '0';
    // convert to exponential for extremely small/large numbers for readability
    if (Math.abs(n) >= 1e9 || (Math.abs(n) > 0 && Math.abs(n) < 1e-6)) {
      return n.toExponential(6);
    }
    let s = n.toFixed(decimals);
    // remove trailing zeros
    s = s.replace(/(?:\.0+|(?<=\.[0-9]*?)0+)$/g, '');
    return s;
  };

  const convertLength = (val, fromUnit, toUnit) => {
    const n = parseFloat(val);
    if (Number.isNaN(n)) return '0';
    const meters = n * (lengthUnits[fromUnit] ?? 1);
    const result = meters / (lengthUnits[toUnit] ?? 1);
    return formatNumberSmart(result, 6);
  };

  const getAllLengthUnits = () => {
    const order = ['km', 'hm', 'dam', 'm', 'dm', 'cm', 'mm', 'in', 'ft'];
    const labels = {
      km: 'Kilometer (km)',
      hm: 'Hectometer (hm)',
      dam: 'Decameter (dam)',
      m: 'Meter (m)',
      dm: 'Decimeter (dm)',
      cm: 'Centimeter (cm)',
      mm: 'Millimeter (mm)',
      in: 'Inch (in)',
      ft: 'Feet (ft)'
    };
    return order.map(u => ({ value: u, label: labels[u] }));
  };

  // weight helpers - convert to base unit (kilogram) then to target
  const weightUnits = {
    kg: 1,
    hg: 0.1,
    dag: 0.01,
    g: 0.001,
    dg: 0.0001,
    cg: 0.00001,
    mg: 0.000001,
    lb: 0.45359237, // pound in kg
    oz: 0.0283495231 // ounce in kg
  };

  const convertWeight = (val, fromUnit, toUnit) => {
    const n = parseFloat(val);
    if (Number.isNaN(n)) return '0';
    const kg = n * (weightUnits[fromUnit] ?? 1);
    const result = kg / (weightUnits[toUnit] ?? 1);
    return formatNumberSmart(result, 6);
  };

  const getAllWeightUnits = () => {
    const order = ['kg', 'hg', 'dag', 'g', 'dg', 'cg', 'mg', 'lb', 'oz'];
    const labels = {
      kg: 'Kilogram (kg)',
      hg: 'Hectogram (hg)',
      dag: 'Decagram (dag)',
      g: 'Gram (g)',
      dg: 'Decigram (dg)',
      cg: 'Centigram (cg)',
      mg: 'Milligram (mg)',
      lb: 'Pound (lb)',
      oz: 'Ounce (oz)'
    };
    return order.map(u => ({ value: u, label: labels[u] }));
  };

  // currency helpers (use editable rates)
  const toCurrency = (target) => {
    const v = parseFloat(curVal) || 0;
    // convert source to USD
    let usd = 0;
    if (curUnit === 'USD') usd = v;
    else if (curUnit === 'IDR') usd = v / idrPerUsd;
    else if (curUnit === 'JPY') usd = v / jpyPerUsd;
    else if (curUnit === 'KRW') usd = v / krwPerUsd;

    if (target === 'USD') return usd.toFixed(2);
    if (target === 'IDR') return Math.round(usd * idrPerUsd).toString();
    if (target === 'JPY') return Math.round(usd * jpyPerUsd).toString();
    if (target === 'KRW') return Math.round(usd * krwPerUsd).toString();
    return '';
  };

  return (
  <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-[#181c2b] via-[#23243a] to-[#1a1a2e] font-sans" onKeyDown={handleKey} tabIndex={0}>
      <main className="w-[95%] max-w-[820px] rounded-2xl bg-[#23243a] p-5 shadow-2xl border border-[#23243a]/60">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-[#a3bffa] tracking-wide">Calculator</h2>
          <div className="flex items-center gap-3">
            <div className="text-sm text-[#6c7aaf] font-semibold">Standard</div>
            <button className="px-2 py-1 rounded bg-[#2a2f48] text-sm text-[#cbd7ff]" onClick={() => setDegMode(d => !d)}>{degMode ? 'Deg' : 'Rad'}</button>
          </div>
        </div>

        <div className="bg-[#181c2b] text-[#f8fafc] rounded-xl p-4 mb-5 flex flex-col items-end justify-end shadow-inner">
          <div className="text-base font-semibold text-[#a3bffa] min-h-6 mb-2 select-none" style={{opacity: acc !== null && operator ? 1 : 0.3}}>
            {acc !== null && operator ? `${acc} ${operator}` : '\u00A0'}
          </div>
          <div className="w-full overflow-x-auto" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
            <div className="text-4xl font-extrabold tracking-tight select-all whitespace-nowrap text-right inline-block min-w-full pr-4" style={{textShadow:'0 2px 8px #0008'}}>
              {display.length > 20 ? (parseFloat(display) > 999999 || parseFloat(display) < 0.0001) && !isNaN(display) ? parseFloat(display).toExponential(6) : display : display}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {/* Row 1: trig/log */}
          <button className="py-3 rounded-lg text-sm font-semibold text-[#f8fafc] bg-[#2d3250] hover:bg-[#3a3550] transition" onClick={() => setDisplay(prev => prev === '0' ? 'sin(' : prev + 'sin(')}>sin</button>
          <button className="py-3 rounded-lg text-sm font-semibold text-[#f8fafc] bg-[#2d3250] hover:bg-[#3a3550] transition" onClick={() => setDisplay(prev => prev === '0' ? 'cos(' : prev + 'cos(')}>cos</button>
          <button className="py-3 rounded-lg text-sm font-semibold text-[#f8fafc] bg-[#2d3250] hover:bg-[#3a3550] transition" onClick={() => setDisplay(prev => prev === '0' ? 'tan(' : prev + 'tan(')}>tan</button>
          <button className="py-3 rounded-lg text-sm font-semibold text-[#f8fafc] bg-[#2d3250] hover:bg-[#3a3550] transition" onClick={() => setDisplay(prev => prev === '0' ? 'log(' : prev + 'log(')}>log</button>

          {/* Row 2: C, CE, %, backspace */}
          <button className="py-3 rounded-lg text-base font-bold text-[#a3bffa] bg-[#23243a] hover:bg-[#2d3250] transition" onClick={() => clearAll()}>C</button>
          <button className="py-3 rounded-lg text-base font-bold text-[#a3bffa] bg-[#23243a] hover:bg-[#2d3250] transition" onClick={() => clearEntry()}>CE</button>
          <button className="py-3 rounded-lg text-base font-bold text-[#a3bffa] bg-[#23243a] hover:bg-[#2d3250] transition" onClick={() => inputPercent()}>%</button>
          <button className="py-3 rounded-lg text-base font-bold text-[#a3bffa] bg-[#23243a] hover:bg-[#2d3250] transition" onClick={() => backspace()}>⌫</button>

          {/* Row 3: parentheses, sqrt, factorial */}
          <button className="py-3 rounded-lg text-base font-bold text-[#a3bffa] bg-[#23243a] hover:bg-[#2d3250] transition" onClick={() => setDisplay(prev => prev === '0' ? '(' : prev + '(')}>(</button>
          <button className="py-3 rounded-lg text-base font-bold text-[#a3bffa] bg-[#23243a] hover:bg-[#2d3250] transition" onClick={() => setDisplay(prev => prev === '0' ? ')' : prev + ')')}>)</button>
          <button className="py-3 rounded-lg text-base font-bold text-[#a3bffa] bg-[#23243a] hover:bg-[#2d3250] transition" onClick={() => performUnary('√x')}>√</button>
          <button className="py-3 rounded-lg text-base font-bold text-[#a3bffa] bg-[#23243a] hover:bg-[#2d3250] transition" onClick={() => setDisplay(prev => (prev === '0' ? '!' : prev + '!'))}>!</button>

          {/* Row 4: 7, 8, 9, ÷ */}
          <button className="py-3 rounded-lg text-2xl font-extrabold text-[#f8fafc] bg-[#23243a] hover:bg-[#2d3250] transition" onClick={() => inputDigit('7')}>7</button>
          <button className="py-3 rounded-lg text-2xl font-extrabold text-[#f8fafc] bg-[#23243a] hover:bg-[#2d3250] transition" onClick={() => inputDigit('8')}>8</button>
          <button className="py-3 rounded-lg text-2xl font-extrabold text-[#f8fafc] bg-[#23243a] hover:bg-[#2d3250] transition" onClick={() => inputDigit('9')}>9</button>
          <button className="py-3 rounded-lg text-base font-bold text-[#f8fafc] bg-[#3a3f5a] hover:bg-[#4b4e6d] transition" onClick={() => appendOperator('÷')}>÷</button>

          {/* Row 5: 4, 5, 6, × */}
          <button className="py-3 rounded-lg text-2xl font-extrabold text-[#f8fafc] bg-[#23243a] hover:bg-[#2d3250] transition" onClick={() => inputDigit('4')}>4</button>
          <button className="py-3 rounded-lg text-2xl font-extrabold text-[#f8fafc] bg-[#23243a] hover:bg-[#2d3250] transition" onClick={() => inputDigit('5')}>5</button>
          <button className="py-3 rounded-lg text-2xl font-extrabold text-[#f8fafc] bg-[#23243a] hover:bg-[#2d3250] transition" onClick={() => inputDigit('6')}>6</button>
          <button className="py-3 rounded-lg text-base font-bold text-[#f8fafc] bg-[#3a3f5a] hover:bg-[#4b4e6d] transition" onClick={() => appendOperator('×')}>×</button>

          {/* Row 6: 1, 2, 3, − */}
          <button className="py-3 rounded-lg text-2xl font-extrabold text-[#f8fafc] bg-[#23243a] hover:bg-[#2d3250] transition" onClick={() => inputDigit('1')}>1</button>
          <button className="py-3 rounded-lg text-2xl font-extrabold text-[#f8fafc] bg-[#23243a] hover:bg-[#2d3250] transition" onClick={() => inputDigit('2')}>2</button>
          <button className="py-3 rounded-lg text-2xl font-extrabold text-[#f8fafc] bg-[#23243a] hover:bg-[#2d3250] transition" onClick={() => inputDigit('3')}>3</button>
          <button className="py-3 rounded-lg text-base font-bold text-[#f8fafc] bg-[#3a3f5a] hover:bg-[#4b4e6d] transition" onClick={() => appendOperator('-')}>−</button>

          {/* Row 7: 0, koma (.), + */}
          <button className="py-3 rounded-lg text-2xl font-extrabold text-[#f8fafc] bg-[#23243a] hover:bg-[#2d3250] transition col-span-2" onClick={() => inputDigit('0')}>0</button>
          <button className="py-3 rounded-lg text-2xl font-extrabold text-[#f8fafc] bg-[#23243a] hover:bg-[#2d3250] transition" onClick={() => inputDot()}>.</button>
          <button className="py-3 rounded-lg text-base font-bold text-[#f8fafc] bg-[#3a3f5a] hover:bg-[#4b4e6d] transition" onClick={() => appendOperator('+')}>+</button>

          {/* Row 8: = besar */}
          <button className="py-3 rounded-lg text-2xl font-extrabold text-[#f8fafc] bg-[#3a3f5a] hover:bg-[#4b4e6d] transition shadow-lg col-span-4" onClick={() => handleEqual()}>=</button>
        </div>
        {/* Converters section */}
        <div className="mt-6 bg-[#1e2130] rounded-xl p-4">
          <div className="flex gap-2 mb-3">
            <button className={`px-3 py-1 rounded text-sm font-semibold transition ${tab === 'temperature' ? 'bg-[#3a3f5a] text-[#a3bffa]' : 'bg-[#23243a] text-[#9fb0ff]'}`} onClick={() => setTab('temperature')}>Suhu</button>
            <button className={`px-3 py-1 rounded text-sm font-semibold transition ${tab === 'length' ? 'bg-[#3a3f5a] text-[#a3bffa]' : 'bg-[#23243a] text-[#9fb0ff]'}`} onClick={() => setTab('length')}>Panjang</button>
            <button className={`px-3 py-1 rounded text-sm font-semibold transition ${tab === 'weight' ? 'bg-[#3a3f5a] text-[#a3bffa]' : 'bg-[#23243a] text-[#9fb0ff]'}`} onClick={() => setTab('weight')}>Berat</button>
            <button className={`px-3 py-1 rounded text-sm font-semibold transition ${tab === 'currency' ? 'bg-[#3a3f5a] text-[#a3bffa]' : 'bg-[#23243a] text-[#9fb0ff]'}`} onClick={() => setTab('currency')}>Mata Uang</button>
          </div>
          <div className="text-sm text-[#cbd7ff] mb-2 font-medium">Converter</div>
          <div className="text-sm text-[#b6c3ff]">
            {/* Temperature */}
            {tab === 'temperature' && (
              <div className="grid gap-2">
                <label className="flex flex-col">
                  <span>Celsius</span>
                  <input type="number" value={tempC} onChange={(e)=>setTempC(e.target.value)} className="mt-1 rounded px-2 py-1 bg-[#232735] text-[#f8fafc]" />
                </label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="p-2 bg-[#232735] rounded">Fahrenheit<div className="font-semibold mt-1">{toFahrenheit(tempC)}</div></div>
                  <div className="p-2 bg-[#232735] rounded">Kelvin<div className="font-semibold mt-1">{toKelvin(tempC)}</div></div>
                  <div className="p-2 bg-[#232735] rounded">Reamur<div className="font-semibold mt-1">{toReamur(tempC)}</div></div>
                </div>
              </div>
            )}

            {/* Length */}
            {tab === 'length' && (
              <div className="grid gap-2">
                <label className="flex flex-col">
                  <span>Nilai</span>
                  <div className="flex gap-2 mt-1">
                    <input type="number" value={lenVal} onChange={(e)=>setLenVal(e.target.value)} className="rounded px-2 py-1 bg-[#232735] text-[#f8fafc]" />
                    <select value={lenUnit} onChange={(e)=>setLenUnit(e.target.value)} className="rounded px-2 py-1 bg-[#232735] text-[#f8fafc]">
                      {getAllLengthUnits().map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </div>
                </label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {getAllLengthUnits().map(u => (
                    <div key={u.value} className="p-2 bg-[#232735] rounded">
                      {u.label}
                      <div className="font-semibold mt-1">{convertLength(lenVal, lenUnit, u.value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weight */}
            {tab === 'weight' && (
              <div className="grid gap-2">
                <label className="flex flex-col">
                  <span>Nilai</span>
                  <div className="flex gap-2 mt-1">
                    <input type="number" value={weightVal} onChange={(e)=>setWeightVal(e.target.value)} className="rounded px-2 py-1 bg-[#232735] text-[#f8fafc]" />
                    <select value={weightUnit} onChange={(e)=>setWeightUnit(e.target.value)} className="rounded px-2 py-1 bg-[#232735] text-[#f8fafc]">
                      {getAllWeightUnits().map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </div>
                </label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {getAllWeightUnits().map(u => (
                    <div key={u.value} className="p-2 bg-[#232735] rounded">
                      {u.label}
                      <div className="font-semibold mt-1">{convertWeight(weightVal, weightUnit, u.value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Currency */}
            {tab === 'currency' && (
              <div className="grid gap-2">
                <label className="flex flex-col">
                  <span>Jumlah</span>
                  <div className="flex gap-2 mt-1">
                    <input type="number" value={curVal} onChange={(e)=>setCurVal(e.target.value)} className="rounded px-2 py-1 bg-[#232735] text-[#f8fafc]" />
                    <select value={curUnit} onChange={(e)=>setCurUnit(e.target.value)} className="rounded px-2 py-1 bg-[#232735] text-[#f8fafc]">
                      <option value="IDR">Rupiah (IDR)</option>
                      <option value="USD">Dollar (USD)</option>
                      <option value="JPY">Yen (JPY)</option>
                      <option value="KRW">Won (KRW)</option>
                    </select>
                  </div>
                </label>
                <div className="text-xs text-[#9fb0ff]">Rates (editable):</div>
                <div className="flex gap-2 mt-1">
                  <input type="number" value={idrPerUsd} onChange={(e)=>setIdrPerUsd(Number(e.target.value)||1)} className="rounded px-2 py-1 bg-[#232735] text-[#f8fafc]" />
                  <div className="text-sm text-[#b6c3ff] self-center">IDR per USD</div>
                </div>
                <div className="flex gap-2 mt-1">
                  <input type="number" value={jpyPerUsd} onChange={(e)=>setJpyPerUsd(Number(e.target.value)||1)} className="rounded px-2 py-1 bg-[#232735] text-[#f8fafc]" />
                  <div className="text-sm text-[#b6c3ff] self-center">JPY per USD</div>
                </div>
                <div className="flex gap-2 mt-1">
                  <input type="number" value={krwPerUsd} onChange={(e)=>setKrwPerUsd(Number(e.target.value)||1)} className="rounded px-2 py-1 bg-[#232735] text-[#f8fafc]" />
                  <div className="text-sm text-[#b6c3ff] self-center">KRW per USD</div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="p-2 bg-[#232735] rounded">IDR<div className="font-semibold mt-1">{toCurrency('IDR')}</div></div>
                  <div className="p-2 bg-[#232735] rounded">USD<div className="font-semibold mt-1">{toCurrency('USD')}</div></div>
                  <div className="p-2 bg-[#232735] rounded">JPY<div className="font-semibold mt-1">{toCurrency('JPY')}</div></div>
                  <div className="p-2 bg-[#232735] rounded">KRW<div className="font-semibold mt-1">{toCurrency('KRW')}</div></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// --- converter helper state and functions (placed after component to avoid clutter) ---
