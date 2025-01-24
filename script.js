// ======================
// 1. INITIALIZATION
// ======================
const settings = {
  defaultImage: 'DESTROYED.jpg',
  ditherMethod: 'floydSteinberg'
};

const els = {
  titleText: document.getElementById('titleText'),
  canvasContainer: document.getElementById('canvasContainer'),
  canvasItem: document.getElementById('canvasItem'),
  ctx: document.getElementById('canvasItem').getContext('2d'),
  pixelSize: document.getElementById('pixelSize'),
  brightness: document.getElementById('brightness'),
  contrast: document.getElementById('contrast'),
  pixelSizeValue: document.getElementById('pixelSizeValue'),
  brightnessValue: document.getElementById('brightnessValue'),
  contrastValue: document.getElementById('contrastValue'),
  importImage: document.getElementById('importImage'),
  importButton: document.getElementById('importButton'),
  exportButton: document.getElementById('exportButton')
};

const state = {
  originalImage: new Image(),
  isProcessing: false
};

// ======================
// 2. CORE FUNCTIONALITY
// ======================
const ditherMethods = {
  floydSteinberg: imageData => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const buffer = new Float32Array(width * height);

    for (let i = 0; i < data.length; i += 4) {
      buffer[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const oldVal = buffer[idx];
        const newVal = oldVal < 128 ? 0 : 255;
        const err = oldVal - newVal;

        buffer[idx] = newVal;

        if (x + 1 < width) buffer[idx + 1] += err * 7 / 16;
        if (x > 0 && y + 1 < height) buffer[idx + width - 1] += err * 3 / 16;
        if (y + 1 < height) buffer[idx + width] += err * 5 / 16;
        if (x + 1 < width && y + 1 < height) buffer[idx + width + 1] += err * 1 / 16;
      }
    }

    for (let i = 0; i < data.length; i += 4) {
      data[i] = data[i + 1] = data[i + 2] = buffer[i / 4];
    }
  }
};

const processImage = () => {
  if (!state.originalImage.src) return;
  const downscaled = downscaleImage(state.originalImage);
  const adjusted = applyAdjustments(downscaled);
  drawFinalImage(applyDithering(adjusted));
};

const downscaleImage = img => {
  const pixelSize = parseInt(els.pixelSize.value);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = Math.floor(img.width / pixelSize);
  canvas.height = Math.floor(img.height / pixelSize);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return canvas;
};

const applyAdjustments = source => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = source.width;
  canvas.height = source.height;
  ctx.drawImage(source, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const brightness = els.brightness.value * 2.55;
  const contrast = parseInt(els.contrast.value);
  const contrastFactor = contrast === 0 ? 1 : (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] + brightness;
    let g = data[i + 1] + brightness;
    let b = data[i + 2] + brightness;

    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

const applyDithering = source => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = source.width;
  canvas.height = source.height;
  ctx.drawImage(source, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  ditherMethods[settings.ditherMethod](imageData);
  ctx.putImageData(imageData, 0, 0);

  return canvas;
};

const drawFinalImage = source => {
  els.ctx.imageSmoothingEnabled = false;
  els.ctx.clearRect(0, 0, els.canvasItem.width, els.canvasItem.height);
  els.ctx.drawImage(source, 0, 0, source.width, source.height,
    0, 0, els.canvasItem.width, els.canvasItem.height);
};

// ======================
// 3. HELPER FUNCTIONS
// ======================
const clamp = value => Math.min(255, Math.max(0, value));

const updateUI = (element, value) => {
  document.getElementById(element.id + 'Value').textContent = value;
};

const resetControls = () => {
  els.brightness.value = 0;
  els.contrast.value = 0;
  els.pixelSize.value = 8;
  [els.brightness, els.contrast, els.pixelSize].forEach(s => updateUI(s, s.value));
};

// ======================
// 4. EVENT HANDLERS
// ======================
const handleImageUpload = e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = event => {
    state.originalImage.onload = () => {
      els.titleText.style.display = "none";
      els.canvasItem.width = state.originalImage.width;
      els.canvasItem.height = state.originalImage.height;
      resetControls();
      processImage();
    };
    state.originalImage.src = event.target.result;
  };
  reader.readAsDataURL(file);
};

const handleDownload = () => {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = els.canvasItem.width;
  tempCanvas.height = els.canvasItem.height;
  const tempCtx = tempCanvas.getContext('2d');

  // Re-process at full quality without UI scaling
  const downscaled = downscaleImage(state.originalImage);
  const adjusted = applyAdjustments(downscaled);
  const dithered = applyDithering(adjusted);

  tempCtx.imageSmoothingEnabled = false;
  tempCtx.drawImage(dithered, 0, 0, tempCanvas.width, tempCanvas.height);

  // Create download link
  const link = document.createElement('a');
  link.download = `DESTROYED_${els.pixelSizeValue.textContent}X.png`;
  link.href = tempCanvas.toDataURL();
  link.click();
};

// ======================
// 5. INITIALIZATION
// ======================
[els.brightness, els.contrast, els.pixelSize].forEach(slider => {
  slider.addEventListener('input', e => {
    updateUI(e.target, e.target.value);
    processImage();
  });
  slider.dispatchEvent(new Event('input'));
});

els.importButton.addEventListener('click', () => els.importImage.click());
els.importImage.addEventListener('change', handleImageUpload);
els.exportButton.addEventListener('click', handleDownload);

state.originalImage.onload = () => {
  els.canvasItem.width = state.originalImage.width;
  els.canvasItem.height = state.originalImage.height;
  processImage();
};
state.originalImage.src = settings.defaultImage;
