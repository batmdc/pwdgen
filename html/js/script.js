//'use strict';

// Cryptographic replacement for Math.random()
function randomNumberBetweenZeroAndOne() {
  var crypto = window.crypto || window.msCrypto;
  return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967295;
}

function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// New configurable generator
function randomChoice(arr){ return arr[Math.floor(randomNumberBetweenZeroAndOne()*arr.length)]; }

function buildConfigFromUI() {
  var cfg = {
    wordCount: parseInt(document.getElementById('opt_wordCount').value),
    shortWordsOnly: !!document.getElementById('opt_shortWordsOnly').checked,
    passphraseMode: !!document.getElementById('opt_passphraseMode').checked,
    numberTokenCount: parseInt(document.getElementById('opt_numberTokenCount').value),
    symbolCount: parseInt(document.getElementById('opt_symbolCount').value),
    theme: document.getElementById('opt_theme').value,
    randomMode: !!document.getElementById('opt_randomMode').checked
  };
  if (cfg.randomMode) {
    // Override with random selections; never choose passphrase
    cfg.wordCount = randomIntFromInterval(2,3);
    cfg.shortWordsOnly = Math.random() < 0.5;
    var themes = ['default','babble','dino','latin','pseudo','pseduogen','mi'];
    cfg.theme = randomChoice(themes);
    cfg.numberTokenCount = randomIntFromInterval(1,2);
    cfg.symbolCount = randomIntFromInterval(1,2);
    cfg.passphraseMode = false;
  }
  // If passphrase mode, enforce words-only
  if (cfg.passphraseMode) {
    cfg.theme = 'default';
    cfg.numberTokenCount = 0;
    cfg.symbolCount = 0;
  }
  return cfg;
}

function pickBaseWord(useShort) {
  if (useShort) {
    return wordlist4to5[Math.floor(randomNumberBetweenZeroAndOne()*wordlist4to5.length)];
  }
  return wordlist[Math.floor(randomNumberBetweenZeroAndOne()*wordlist.length)];
}

function makeBabbleWord() {
  var base = pickBaseWord(false); // babble uses normal wordlist regardless of short toggle (per spec)
  var segs = encodeBabble(base).split('-');
  // Strip potential sentinels by ignoring index 0 if it looks like it and last if empty
  var start = 1;
  var end = segs.length - 1;
  if (end < start) { return base; }
  // Randomize between (a) single segment and (b) two concatenated segments
  if (Math.random() < 0.5 || (end - start + 1) < 2) {
    return segs[randomIntFromInterval(start, end)];
  } else {
    var first = randomIntFromInterval(start, end);
    var second = randomIntFromInterval(start, end);
    while (second === first && end - start + 1 > 1) { second = randomIntFromInterval(start, end); }
    return segs[first] + segs[second].charAt(0).toUpperCase() + segs[second].slice(1);
  }
}

function makeDinoWord() {
  var useInfix = Math.random() < 0.5; // randomize two-part vs three-part
  var prefix = randomChoice(dinoPrefixes);
  var suffix = randomChoice(dinoSuffixes);
  if (useInfix && typeof dinoInfixes !== 'undefined' && dinoInfixes && dinoInfixes.length) {
    var infix = randomChoice(dinoInfixes);
    return prefix + infix + suffix;
  }
  return prefix + suffix;
}

function makePseudoWord() {
  // Choose 2–3 parts from multiple lists and concatenate
  var pools = [];
  if (typeof celticSounds !== 'undefined') pools.push(celticSounds);
  if (typeof sanskritSounds !== 'undefined') pools.push(sanskritSounds);
  if (typeof neutralSounds !== 'undefined') pools.push(neutralSounds);
  if (typeof harshSounds !== 'undefined') pools.push(harshSounds);
  if (typeof softSounds !== 'undefined') pools.push(softSounds);
  if (typeof genericPrefix !== 'undefined') pools.push(genericPrefix);
  if (typeof genericSuffix !== 'undefined') pools.push(genericSuffix);
  if (pools.length === 0) return pickBaseWord(false);
  var partsCount = randomIntFromInterval(2,3);
  var word = '';
  for (var i=0; i<partsCount; i++) {
    var pool = randomChoice(pools);
    word += String(randomChoice(pool)).toLowerCase();
  }
  return word;
}

function makePseduogenWord() {
  var pre = (typeof genericPrefix !== 'undefined' ? randomChoice(genericPrefix) : 'gen');
  var suf = (typeof genericSuffix !== 'undefined' ? randomChoice(genericSuffix) : 'er');
  return String(pre).toLowerCase() + String(suf).toLowerCase();
}

function makeThemedWord(theme, shortWordsOnly) {
  switch(theme) {
    case 'default':
      return pickBaseWord(!!shortWordsOnly);
    case 'babble':
      return makeBabbleWord();
    case 'dino':
      return makeDinoWord();
    case 'latin':
      return randomChoice(latinSounds);
    case 'pseudo':
      return makePseudoWord();
    case 'pseduogen':
      return makePseduogenWord();
    case 'mi':
      if (typeof wordlist_mi !== 'undefined' && wordlist_mi && wordlist_mi.length) {
        return randomChoice(wordlist_mi);
      }
      return pickBaseWord(!!shortWordsOnly);
    default:
      return pickBaseWord(!!shortWordsOnly);
  }
}

function randomNumberToken() {
  var len = randomIntFromInterval(2,3);
  var s = '';
  for (var i=0;i<len;i++){ s += String(Math.floor(randomNumberBetweenZeroAndOne()*10)); }
  return s;
}

function randomSymbol() {
  var set = '!@#$%^&*?';
  return set.charAt(Math.floor(randomNumberBetweenZeroAndOne()*set.length));
}

function capitalizeFirst(s){ if(!s) return s; return s.charAt(0).toUpperCase()+s.slice(1); }

function generateFromConfig(cfg) {
  // Build words
  var words = [];
  for (var i=0;i<cfg.wordCount;i++) {
    words.push(makeThemedWord(cfg.theme, cfg.shortWordsOnly).toLowerCase());
  }

  // Passphrase mode: words only, space separated, all lowercase
  if (cfg.passphraseMode) {
    return words.join(' ');
  }

  // Compute number placement slots: 0..wordCount (before first, between, after last)
  var totalSlots = cfg.wordCount + 1;
  var availableNumSlots = [];
  for (var s=0; s<totalSlots; s++) availableNumSlots.push(s);
  var numCount = Math.min(cfg.numberTokenCount, availableNumSlots.length);
  var chosenNumSlots = [];
  function takeRandomSlot(slots){ var idx = Math.floor(randomNumberBetweenZeroAndOne()*slots.length); return slots.splice(idx,1)[0]; }
  for (var n=0; n<numCount; n++) { chosenNumSlots.push(takeRandomSlot(availableNumSlots)); }
  var numbersBySlot = {};
  for (var k=0;k<chosenNumSlots.length;k++){ numbersBySlot[chosenNumSlots[k]] = randomNumberToken(); }

  // Symbol slots: after each number plus one end slot. If no numbers requested, only end slot allowed when symbolCount>0.
  var symbolPositions = [];
  if (chosenNumSlots.length > 0) {
    for (var cns=0;cns<chosenNumSlots.length;cns++){ symbolPositions.push({ type:'after-num', slot: chosenNumSlots[cns] }); }
    symbolPositions.push({ type:'end', slot: totalSlots });
  } else if (cfg.symbolCount > 0) {
    symbolPositions.push({ type:'end', slot: totalSlots });
  }
  var symCount = Math.min(cfg.symbolCount, symbolPositions.length);
  var chosenSymbolPositions = [];
  var symPosPool = symbolPositions.slice();
  for (var sc=0; sc<symCount; sc++) { chosenSymbolPositions.push(takeRandomSlot(symPosPool)); }
  var symbolAfterNum = {}; var endSymbol = false;
  for (var cs=0; cs<chosenSymbolPositions.length; cs++) {
    var pos = chosenSymbolPositions[cs];
    if (pos.type === 'after-num') { symbolAfterNum[pos.slot] = randomSymbol(); }
    else if (pos.type === 'end') { endSymbol = randomSymbol(); }
  }

  // Assemble tokens in order
  var tokens = [];
  for (var wi=0; wi<cfg.wordCount; wi++) {
    // before/between slot index equals wi
    if (numbersBySlot.hasOwnProperty(wi)) {
      tokens.push(numbersBySlot[wi]);
      if (symbolAfterNum[wi]) tokens.push(symbolAfterNum[wi]);
    }
    tokens.push(words[wi]);
  }
  // after last word: slot = totalSlots-1? We defined slots 0..wordCount; after last is slot wordCount
  if (numbersBySlot.hasOwnProperty(totalSlots-1+1)) { /* none by this key */ }
  if (numbersBySlot.hasOwnProperty(cfg.wordCount)) {
    tokens.push(numbersBySlot[cfg.wordCount]);
    if (symbolAfterNum[cfg.wordCount]) tokens.push(symbolAfterNum[cfg.wordCount]);
  }
  if (endSymbol) tokens.push(endSymbol);

  // New rule: If 2 or more words are adjacent, capitalize the first letter of the 2nd and subsequent words in that contiguous run.
  function isWordToken(tok){ return /^[a-z]/.test(tok); }
  var iRun = 0;
  while (iRun < tokens.length) {
    // find start of a word run
    if (!isWordToken(tokens[iRun])) { iRun++; continue; }
    var start = iRun;
    var end = start;
    while (end + 1 < tokens.length && isWordToken(tokens[end + 1])) { end++; }
    // capitalize from second in run
    if (end - start + 1 >= 2) {
      for (var j = start + 1; j <= end; j++) {
        tokens[j] = capitalizeFirst(tokens[j]);
      }
    }
    iRun = end + 1;
  }

  // Existing behavior: randomly capitalize at least one word, and maybe more
  var wordIndexes = [];
  for (var ti=0; ti<tokens.length; ti++) {
    if (/^[a-z]/.test(tokens[ti])) wordIndexes.push(ti);
  }
  if (wordIndexes.length > 0) {
    var must = wordIndexes[Math.floor(randomNumberBetweenZeroAndOne()*wordIndexes.length)];
    tokens[must] = capitalizeFirst(tokens[must]);
    for (var wi2=0; wi2<wordIndexes.length; wi2++) {
      var idx2 = wordIndexes[wi2];
      if (idx2 === must) continue;
      if (Math.random() < 0.5) tokens[idx2] = capitalizeFirst(tokens[idx2]);
    }
  }

  return tokens.join('');
}

function setStyleFromWordNumber(passwordField, numberOfWords) {
  var baseSize = 40;
  var newSize = (numberOfWords <= 4) ? 36 : (baseSize * (4/numberOfWords));
  passwordField.setAttribute('style', 'font-size: ' + newSize + 'px;');
}

// Literary styling function removed

function convertSecondsToReadable(seconds) {
  var numMilliseconds = seconds * 1000;
  var numSeconds = Math.floor(seconds);
  var numMinutes = Math.floor(numSeconds / 60);
  var numHours = Math.floor(numSeconds / 3600);
  var numDays = Math.floor(numSeconds / 86400);
  var numYears = Math.floor(numSeconds / (86400 * 365));
  var numCenturies = Math.floor(numSeconds / (86400 * 365 * 100));
  if (numMilliseconds < 1000) return numMilliseconds + ' milliseconds';
  if (numSeconds < 60) return numSeconds + ' seconds';
  if (numMinutes < 60) return numMinutes + ' minutes';
  if (numHours < 24) return numHours + ' hours';
  if (numDays < 365) return numDays + ' days';
  if (numYears < 100) return numYears + ' years';
  return numCenturies + ' centuries';
}

function encodeBabble(input) {
  if (!input) return 'xix';
  var V = ["a","e","i","o","u","y"]; // vowels
  var C = ["b","c","d","f","g","h","k","l","m","n","p","r","s","t","v","z","x"]; // consonants
  var out = 'x';
  var c = 1;
  for (var i = 0; i < input.length; i += 2) {
    var byte1 = input.charCodeAt(i);
  out += V[(((byte1 >> 6) & 3) + c) % 6];
    out += C[((byte1 >> 2) & 15)];
    out += V[(((byte1 & 3) + Math.floor(c / 6)) % 6)];
    if (i + 1 >= input.length) break;
    var byte2 = input.charCodeAt(i + 1);
    out += C[((byte2 >> 4) & 15)];
    out += '-';
    out += C[(byte2 & 15)];
    c = (c * 5 + byte1 * 7 + byte2) % 36;
  }
  out += 'x';
  return out;
}
// Literary feature removed

// Literary helper functions removed

function calculateAndSetCrackTime() {
  var timeToCrack = zxcvbn(passwordField.value);
  var readableCrackTime = convertSecondsToReadable(timeToCrack.crack_time);
  document.querySelector('.crack-time').innerHTML = readableCrackTime;
}

var passwordField = document.getElementById('passphrase');
var button = document.querySelector('.btn-generate');

// Initially run it upon load using new generator
passwordField.setAttribute('value', generateFromConfig({
  wordCount: 4,
  shortWordsOnly: false,
  passphraseMode: false,
  numberTokenCount: 1,
  symbolCount: 1,
  theme: 'default',
  randomMode: false
}));
calculateAndSetCrackTime();

// Listen for a button click
button.addEventListener('click', function() {
  var cfg = buildConfigFromUI();
  var pwd = generateFromConfig(cfg);
  passwordField.value = pwd;
  // Style sizing: if passphrase, use word count; else use heuristic of 3
  if (cfg.passphraseMode) {
    setStyleFromWordNumber(passwordField, cfg.wordCount);
  } else {
    setStyleFromWordNumber(passwordField, 3);
  }
  calculateAndSetCrackTime();
  var evt = new Event('input', { bubbles: true });
  passwordField.dispatchEvent(evt);
});

// Listen for password value change
passwordField.addEventListener('input', function (evt) {
  calculateAndSetCrackTime();
});
