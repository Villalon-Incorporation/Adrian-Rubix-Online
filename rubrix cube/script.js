const cubeContainer = document.getElementById('cube');
const playerNameInput = document.getElementById('playerName');
const saveGameButton = document.getElementById('saveGame');
const resetCubeButton = document.getElementById('resetCube');
const scrambleCubeButton = document.getElementById('scrambleCube');
const toggleGridButton = document.getElementById('toggleGrid');
const statusText = document.querySelector('.status');
const moveButtons = document.querySelectorAll('[data-move]');

const COLORS = {
  U: '#ffffff',
  D: '#90e1ff',
  F: '#d92d2d',
  B: '#ffd53d',
  L: '#2daf3b',
  R: '#2b69d6'
};
const FACE_KEYS = ['U', 'D', 'F', 'B', 'L', 'R'];
const ROTATION_MAPPINGS = {
  x: {
    1: { U: 'B', B: 'D', D: 'F', F: 'U', L: 'L', R: 'R' },
    '-1': { U: 'F', F: 'D', D: 'B', B: 'U', L: 'L', R: 'R' }
  },
  y: {
    1: { F: 'R', R: 'B', B: 'L', L: 'F', U: 'U', D: 'D' },
    '-1': { F: 'L', L: 'B', B: 'R', R: 'F', U: 'U', D: 'D' }
  },
  z: {
    1: { U: 'R', R: 'D', D: 'L', L: 'U', F: 'F', B: 'B' },
    '-1': { U: 'L', L: 'D', D: 'R', R: 'U', F: 'F', B: 'B' }
  }
};
const ROTATE_POINT = {
  x: {
    1: ({ x, y, z }) => ({ x, y: z, z: -y }),
    '-1': ({ x, y, z }) => ({ x, y: -z, z: y })
  },
  y: {
    1: ({ x, y, z }) => ({ x: z, y, z: -x }),
    '-1': ({ x, y, z }) => ({ x: -z, y, z: x })
  },
  z: {
    1: ({ x, y, z }) => ({ x: y, y: -x, z }),
    '-1': ({ x, y, z }) => ({ x: -y, y: x, z })
  }
};

let cubies = [];
let currentRotation = { x: -30, y: 40 };
let dragging = false;
let dragStart = { x: 0, y: 0 };
let viewStart = { x: currentRotation.x, y: currentRotation.y };
let currentZoom = 1;
let nameSticker = null;
let showGuide = false;

function init() {
  loadState();
  buildCube();
  renderCube();
  attachEvents();
  updateStatus('Drag the cube with your mouse. Use the action buttons to rotate faces.');
}

function buildCube() {
  cubeContainer.innerHTML = '';
  cubies = [];
  let id = 0;
  const size = 3;
  const half = 1;
  const cubieSize = 110;
  const spacing = cubieSize + 4;
  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j < size; j += 1) {
      for (let k = 0; k < size; k += 1) {
        const x = i - half;
        const y = half - j;
        const z = k - half;
        if (Math.abs(x) === half || Math.abs(y) === half || Math.abs(z) === half) {
          const cubie = createCubie(id++, x, y, z, cubieSize, spacing);
          cubies.push(cubie);
          cubeContainer.appendChild(cubie.element);
        }
      }
    }
  }
}

function createCubie(id, x, y, z, cubieSize, spacing) {
  const element = document.createElement('div');
  element.className = 'cubie';
  element.dataset.id = id;
  element.style.width = `${cubieSize}px`;
  element.style.height = `${cubieSize}px`;
  element.style.transformStyle = 'preserve-3d';
  const faces = {};
  FACE_KEYS.forEach((faceKey) => {
    const faceEl = document.createElement('div');
    faceEl.className = `face ${faceKey.toLowerCase()}`;
    faceEl.dataset.face = faceKey;
    faceEl.style.width = `${cubieSize - 8}px`;
    faceEl.style.height = `${cubieSize - 8}px`;
    faceEl.style.fontSize = `${Math.max(8, Math.round(cubieSize * 0.2))}px`;
    faceEl.style.borderRadius = `${Math.max(4, cubieSize * 0.12)}px`;
    element.appendChild(faceEl);
    faces[faceKey] = faceEl;
  });

  const maxCoord = 1;
  const stickers = {
    U: y === maxCoord ? COLORS.U : null,
    D: y === -maxCoord ? COLORS.D : null,
    F: z === maxCoord ? COLORS.F : null,
    B: z === -maxCoord ? COLORS.B : null,
    L: x === -maxCoord ? COLORS.L : null,
    R: x === maxCoord ? COLORS.R : null
  };

  return { id, x, y, z, stickers, faces, element, namedFace: null, cubieSize, spacing };
}

function renderCube() {
  cubeContainer.style.transform = `scale(${currentZoom}) rotateX(${currentRotation.x}deg) rotateY(${currentRotation.y}deg)`;
  cubies.forEach((cubie) => {
    const x = cubie.x * cubie.spacing;
    const y = -cubie.y * cubie.spacing;
    const z = cubie.z * cubie.spacing;
    cubie.element.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`;
    FACE_KEYS.forEach((faceKey) => {
      const faceEl = cubie.faces[faceKey];
      const color = cubie.stickers[faceKey];
      if (color) {
        faceEl.classList.remove('hidden');
        faceEl.style.background = color;
        faceEl.textContent = cubie.namedFace === faceKey ? playerNameInput.value.trim().slice(0, 12) : '';
        faceEl.classList.toggle('name-face', cubie.namedFace === faceKey);
      } else {
        faceEl.classList.add('hidden');
        faceEl.textContent = '';
      }
    });
  });
}

function attachEvents() {
  playerNameInput.addEventListener('input', handleNameChange);
  saveGameButton.addEventListener('click', saveState);
  resetCubeButton.addEventListener('click', resetCube);
  scrambleCubeButton.addEventListener('click', () => { scrambleCube(); renderCube(); saveState(); });
  toggleGridButton.addEventListener('click', toggleGuide);
  moveButtons.forEach((button) => button.addEventListener('click', () => handleMove(button.dataset.move)));

  const scene = document.querySelector('.scene');
  scene.addEventListener('pointerdown', (event) => {
    dragging = true;
    dragStart = { x: event.clientX, y: event.clientY };
    viewStart = { ...currentRotation };
    scene.setPointerCapture(event.pointerId);
  });
  scene.addEventListener('wheel', handleZoom, { passive: false });

  scene.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;
    currentRotation.y = viewStart.y + deltaX * 0.4;
    currentRotation.x = Math.min(80, Math.max(-80, viewStart.x - deltaY * 0.4));
    renderCube();
  });

  scene.addEventListener('pointerup', () => { dragging = false; });
  scene.addEventListener('pointerleave', () => { dragging = false; });
}

function handleNameChange() {
  const trimmed = playerNameInput.value.trim();
  if (!trimmed) {
    nameSticker = null;
    cubies.forEach((cubie) => (cubie.namedFace = null));
  } else {
    if (!nameSticker) {
      assignRandomNameSticker();
    }
  }
  renderCube();
  saveState();
}

function assignRandomNameSticker() {
  const outerCubies = cubies.filter((cubie) => FACE_KEYS.some((face) => cubie.stickers[face]));
  const randomCubie = outerCubies[Math.floor(Math.random() * outerCubies.length)];
  const availableFaces = FACE_KEYS.filter((face) => randomCubie.stickers[face]);
  const randomFace = availableFaces[Math.floor(Math.random() * availableFaces.length)];
  cubies.forEach((cubie) => (cubie.namedFace = null));
  randomCubie.namedFace = randomFace;
  nameSticker = { cubieId: randomCubie.id, face: randomFace };
}

function handleMove(move) {
  const direction = move.endsWith("'") ? -1 : 1;
  const face = move.replace("'", '');
  if (face === 'U') rotateLayer('y', 1, direction);
  if (face === 'D') rotateLayer('y', -1, -direction);
  if (face === 'F') rotateLayer('z', 1, direction);
  if (face === 'B') rotateLayer('z', -1, -direction);
  if (face === 'L') rotateLayer('x', -1, -direction);
  if (face === 'R') rotateLayer('x', 1, direction);
  renderCube();
  saveState();
  checkSolved();
}

function rotateLayer(axis, layerValue, direction) {
  const selected = cubies.filter((cubie) => cubie[axis] === layerValue);
  const mapping = ROTATION_MAPPINGS[axis][direction];
  const rotatePoint = ROTATE_POINT[axis][direction];
  const updated = selected.map((cubie) => {
    const newCoords = rotatePoint(cubie);
    const rotatedStickers = {};
    FACE_KEYS.forEach((faceKey) => {
      const newFaceKey = mapping[faceKey];
      rotatedStickers[newFaceKey] = cubie.stickers[faceKey];
    });
    const namedFace = cubie.namedFace ? mapping[cubie.namedFace] : null;
    return { ...cubie, x: newCoords.x, y: newCoords.y, z: newCoords.z, stickers: rotatedStickers, namedFace };
  });
  selected.forEach((cubie, index) => {
    const updatedCubie = updated[index];
    cubie.x = updatedCubie.x;
    cubie.y = updatedCubie.y;
    cubie.z = updatedCubie.z;
    cubie.stickers = updatedCubie.stickers;
    cubie.namedFace = updatedCubie.namedFace;
  });
}

function resetCube() {
  buildCube();
  nameSticker = null;
  playerNameInput.value = '';
  currentZoom = 1;
  renderCube();
  saveState();
  updateStatus('Cube reset. Enter your name and start solving.');
}

function scrambleCube() {
  const moves = ['U', "U'", 'D', "D'", 'L', "L'", 'R', "R'", 'F', "F'", 'B', "B'"];
  for (let i = 0; i < 18; i += 1) {
    const move = moves[Math.floor(Math.random() * moves.length)];
    handleMove(move);
  }
  updateStatus('Cube scrambled. Keep solving!');
}

function saveState() {
  const state = {
    cubies: cubies.map((cubie) => ({
      id: cubie.id,
      x: cubie.x,
      y: cubie.y,
      z: cubie.z,
      stickers: cubie.stickers,
      namedFace: cubie.namedFace
    })),
    rotation: currentRotation,
    zoom: currentZoom,
    name: playerNameInput.value.trim()
  };
  localStorage.setItem('rubixCubeSave', JSON.stringify(state));
  updateStatus('Game saved locally.');
}

function updateStatus(message) {
  if (statusText) {
    statusText.textContent = message;
  }
}

function loadState() {
  const saved = localStorage.getItem('rubixCubeSave');
  if (!saved) {
    updateStatus('No saved game found.');
    return;
  }
  try {
    const state = JSON.parse(saved);
    if (!state.cubies) {
      updateStatus('Saved data is invalid.');
      return;
    }
    cubies.forEach((cubie) => {
      const savedCubie = state.cubies.find((item) => item.id === cubie.id);
      if (savedCubie) {
        cubie.x = savedCubie.x;
        cubie.y = savedCubie.y;
        cubie.z = savedCubie.z;
        cubie.stickers = savedCubie.stickers;
        cubie.namedFace = savedCubie.namedFace;
      }
    });
    if (state.rotation) {
      currentRotation = state.rotation;
    }
    if (typeof state.zoom === 'number') {
      currentZoom = Math.min(2.5, Math.max(0.5, state.zoom));
    }
    playerNameInput.value = state.name || '';
    updateStatus('Game loaded from local storage.');
  } catch (error) {
    console.warn('Could not load saved game', error);
    updateStatus('Could not load saved game.');
  }
}

function toggleGuide() {
  showGuide = !showGuide;
  cubeContainer.classList.toggle('show-guide', showGuide);
  updateStatus(showGuide ? 'Guide enabled so the cube layout is easier to see.' : 'Guide disabled.');
}


function handleZoom(event) {
  event.preventDefault();
  currentZoom = Math.min(2.5, Math.max(0.5, currentZoom - event.deltaY * 0.0015));
  renderCube();
}

function checkSolved() {
  const sides = new Set(FACE_KEYS.map((face) => {
    const faceColors = cubies
      .filter((cubie) => cubie.stickers[face])
      .map((cubie) => cubie.stickers[face]);
    return faceColors.every((color) => color === faceColors[0]) && faceColors[0] ? faceColors[0] : null;
  }));
  if (sides.has(null)) {
    return;
  }
  updateStatus('Solved! Great job. Save your progress or scramble again.');
}

init();
