// Keyboard and mouse input, read once a frame. Keys are tracked by code so
// layouts do not matter; the mouse position is kept in logical field
// coordinates, scaled from the canvas size. Actions (confirm, pause, dash,
// sunburst) are edge-triggered: takeActions() returns and clears them.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_SUNBURST = 8;
export const ACTION_MUTE = 16;
export const ACTION_PICK_1 = 32;
export const ACTION_PICK_2 = 64;
export const ACTION_PICK_3 = 128;

export function createInput(canvas) {
  const keys = new Set();
  const actions = { value: 0 };
  const mouse = { x: 640, y: 360, down: false, clicked: false, clickX: 0, clickY: 0 };
  let scale = 1;

  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 1280,
      y: ((clientY - rect.top) / rect.height) * 720,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') {
      actions.value |= ACTION_CONFIRM;
      event.preventDefault();
    }
    if (event.code === 'KeyP' || event.code === 'Escape') actions.value |= ACTION_PAUSE;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') actions.value |= ACTION_DASH;
    if (event.code === 'KeyQ' || event.code === 'KeyE') actions.value |= ACTION_SUNBURST;
    if (event.code === 'KeyM') actions.value |= ACTION_MUTE;
    if (event.code === 'Digit1') actions.value |= ACTION_PICK_1;
    if (event.code === 'Digit2') actions.value |= ACTION_PICK_2;
    if (event.code === 'Digit3') actions.value |= ACTION_PICK_3;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    const pos = toLogical(event.clientX, event.clientY);
    mouse.x = pos.x;
    mouse.y = pos.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const pos = toLogical(event.clientX, event.clientY);
    mouse.x = pos.x;
    mouse.y = pos.y;
    mouse.down = true;
    mouse.clicked = true;
    mouse.clickX = pos.x;
    mouse.clickY = pos.y;
    if (event.button === 0) actions.value |= ACTION_CONFIRM;
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
  });

  return {
    mouse,
    /** Normalised movement vector from WASD or the arrow keys. */
    direction() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.hypot(x, y);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    get firing() {
      return mouse.down;
    },
    /** Edge-triggered actions since the last call; also consumes the click. */
    takeActions() {
      const value = actions.value;
      actions.value = 0;
      return value;
    },
    /** The last click position, if one happened since the last call. */
    takeClick() {
      if (!mouse.clicked) return null;
      mouse.clicked = false;
      return { x: mouse.clickX, y: mouse.clickY };
    },
    set scale(value) {
      scale = value;
    },
    get scale() {
      return scale;
    },
  };
}
