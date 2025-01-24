// ======================
  // 1. SETTINGS & ELEMENTS
  // ======================
  const settings = {
    defaultImage: 'DESTROYED.jpg',
    ditherMethod: 'floydSteinberg'
  };

  // Get all HTML elements we need
  const elements = {
    titleText: document.getElementById('titleText'),
    canvasContainer: document.getElementById('canvasContainer'),
    canvasItem: document.getElementById('canvasItem'),
    ctx: document.getElementById('canvasItem').getContext('2d'),
    brightness: document.getElementById('sliderBrightness'),
    brightnessValue: document.getElementById('sliderBrightnessValue'),
    contrast: document.getElementById('sliderContrast'),
    contrastValue: document.getElementById('sliderContrastValue'),
    pixelSize: document.getElementById('sliderPixel'),
    pixelSizeValue: document.getElementById('sliderPixelValue'),
    imageInput: document.getElementById('importImage'),
    uploadBtn: document.getElementById('importButton'),
    destroyButton: document.getElementById('destroyButton'),
    downloadBtn: document.getElementById('exportButton')
  };

  // ======================
  // 2. APP STATE
  // ======================
  let currentState = {
    originalImage: new Image(),  // The uploaded/original image
    isProcessing: false          // Prevent multiple processing at once
  };

  // Set default styles for the button and canvas container
  elements.canvasContainer.style.backgroundColor = 'var(--blue6)'; // Default color
  elements.destroyButton.textContent = 'DESTROY'; // Default text
  elements.destroyButton.style.color = 'var(--grayc)'; // Default background color
  elements.destroyButton.style.backgroundColor = 'var(--blue6)'; // Default color
  elements.destroyButton.style.transition = 'background-color 0.3s ease'; // Smooth transition

  // ======================
  // 3. DITHERING ALGORITHMS
  // ======================
  const ditherMethods = {
    // Floyd-Steinberg dithering
    floydSteinberg: function (imageData) {
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;
      const buffer = new Float32Array(width * height);

      // Convert to grayscale
      for (let i = 0; i < data.length; i += 4) {
        buffer[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }

      // Apply error diffusion
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          const oldVal = buffer[idx];
          const newVal = oldVal < 128 ? 0 : 255;
          const err = oldVal - newVal;

          buffer[idx] = newVal;

          // Distribute error to neighboring pixels
          if (x + 1 < width) buffer[idx + 1] += err * 7 / 16;
          if (x > 0 && y + 1 < height) buffer[idx + width - 1] += err * 3 / 16;
          if (y + 1 < height) buffer[idx + width] += err * 5 / 16;
          if (x + 1 < width && y + 1 < height) buffer[idx + width + 1] += err * 1 / 16;
        }
      }

      // Update image data with dithered values
      for (let i = 0; i < data.length; i += 4) {
        const val = buffer[i / 4];
        data[i] = data[i + 1] = data[i + 2] = val;
      }
    }
    // Add new dither methods here!
  };

  // ======================
  // 4. CORE FUNCTIONS
  // ======================

  // Main processing function - runs the whole pipeline
  function processImage() {
    return new Promise((resolve, reject) => {
      // Processing steps:
      const downscaled = downscaleImage(currentState.originalImage);
      const adjusted = applyAdjustments(downscaled);
      const dithered = applyDithering(adjusted);
      drawFinalImage(dithered);
      resolve();
    });
  }

  // Step 1: Make image blocky by reducing resolution
  function downscaleImage(img) {
    const pixelSize = parseInt(elements.pixelSize.value);
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    // Calculate new size
    tempCanvas.width = Math.floor(img.width / pixelSize);
    tempCanvas.height = Math.floor(img.height / pixelSize);

    // Disable smoothing for crisp pixels
    tempCtx.imageSmoothingEnabled = false;
    tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);

    return tempCanvas;
  }

  // Step 2: Adjust brightness/contrast
  function applyAdjustments(sourceCanvas) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = sourceCanvas.width;
    tempCanvas.height = sourceCanvas.height;

    // Copy image to temp canvas
    tempCtx.drawImage(sourceCanvas, 0, 0);

    // Get pixel data
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;

    // Calculate adjustments
    const brightness = elements.brightness.value * 2.55; // Convert % to 0-255
    const contrastValue = parseInt(elements.contrast.value);
    const contrast = contrastValue === 0 ? 1 :
      (259 * (contrastValue + 255)) / (255 * (259 - contrastValue));

    // Apply to each pixel
    for (let i = 0; i < data.length; i += 4) {
      // Brightness
      let r = data[i] + brightness;
      let g = data[i + 1] + brightness;
      let b = data[i + 2] + brightness;

      // Contrast
      r = contrast * (r - 128) + 128;
      g = contrast * (g - 128) + 128;
      b = contrast * (b - 128) + 128;

      // Keep values between 0-255
      data[i] = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, b));
    }

    tempCtx.putImageData(imageData, 0, 0);
    return tempCanvas;
  }

  // Step 3: Apply dithering pattern
  function applyDithering(sourceCanvas) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = sourceCanvas.width;
    tempCanvas.height = sourceCanvas.height;

    // Copy image
    tempCtx.drawImage(sourceCanvas, 0, 0);

    // Get pixel data
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

    // Apply selected dither method
    if (ditherMethods[settings.ditherMethod]) {
      ditherMethods[settings.ditherMethod](imageData);
    }

    tempCtx.putImageData(imageData, 0, 0);
    return tempCanvas;
  }

  // Step 4: Draw final result to screen
  function drawFinalImage(sourceCanvas) {
    elements.ctx.imageSmoothingEnabled = false;
    elements.ctx.clearRect(0, 0, elements.canvasItem.width, elements.canvasItem.height);
    elements.ctx.drawImage(
      sourceCanvas,
      0, 0, sourceCanvas.width, sourceCanvas.height,
      0, 0, elements.canvasItem.width, elements.canvasItem.height
    );
  }

  // ======================
  // 5. EVENT HANDLERS
  // ======================

  function handleSliderUpdate(e) {
    const outputElement = document.getElementById(e.target.id + 'Value').textContent = e.target.value;
  }

  // Function to reset the destroyButton style
  function resetDestroyButton() {
    elements.canvasContainer.style.backgroundColor = 'var(--blue6)';
    elements.destroyButton.textContent = 'DESTROY';
    elements.destroyButton.style.color = 'var(--grayc)';
    elements.destroyButton.style.backgroundColor = 'var(--blue6)';
  }

  function handleDestroyClick() {
    if (currentState.isProcessing) return; // Prevent multiple clicks

    // Set processing state and update button appearance
    currentState.isProcessing = true;
    elements.canvasContainer.style.backgroundColor = 'var(--blue6)';
    elements.destroyButton.textContent = 'DESTROYING...';
    elements.destroyButton.style.color = 'var(--grayc)';
    elements.destroyButton.style.backgroundColor = 'var(--blue6)';

    processImage()
      .then(() => {
        // Reset processing state and update button appearance
        currentState.isProcessing = false;
        elements.canvasContainer.style.backgroundColor = 'var(--red6)';
        elements.destroyButton.textContent = 'DESTROYED';
        elements.destroyButton.style.color = 'var(--grayc)';
        elements.destroyButton.style.backgroundColor = 'var(--red6)';
        console.log('Processing finished');
      })
      .catch((error) => {
        // Handle errors and reset button appearance
        console.error('Error processing image:', error);
        currentState.isProcessing = false;
        elements.canvasContainer.style.backgroundColor = 'var(--blue6)';
        elements.destroyButton.textContent = 'DESTROY';
        elements.destroyButton.style.color = 'var(--grayc)';
        elements.destroyButton.style.backgroundColor = 'var(--blue6)';
      });
  }

  // When user uploads new image
  // When user uploads new image
  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      currentState.originalImage.onload = function () {
        elements.canvasContainer.style.zIndex = "1";
        elements.titleText.style.zIndex = "0";
        elements.titleText.style.display = "none";

        // Reset controls to default
        elements.brightness.value = 0;
        elements.brightnessValue.textContent = 0;
        elements.contrast.value = 0;
        elements.contrastValue.textContent = 0;
        elements.pixelSize.value = 8;
        elements.pixelSizeValue.textContent = 8;

        // Reset button state
        resetDestroyButton();

        // Set canvas to match image size
        elements.canvasItem.width = currentState.originalImage.width;
        elements.canvasItem.height = currentState.originalImage.height;

        // Draw original image directly without processing
        elements.ctx.drawImage(
          currentState.originalImage,
          0, 0, currentState.originalImage.width, currentState.originalImage.height
        );
      };
      currentState.originalImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  // When download button clicked
  function handleDownload() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = elements.canvasItem.width;
    tempCanvas.height = elements.canvasItem.height;
    const tempCtx = tempCanvas.getContext('2d');

    // Re-process at full quality
    const downscaled = downscaleImage(currentState.originalImage);
    const adjusted = applyAdjustments(downscaled);
    const dithered = applyDithering(adjusted);

    tempCtx.imageSmoothingEnabled = false;
    tempCtx.drawImage(dithered, 0, 0, tempCanvas.width, tempCanvas.height);

    // Create download link
    const link = document.createElement('a');
    link.download = `DESTROYED_${elements.pixelSizeValue.textContent}X.png`;
    link.href = tempCanvas.toDataURL();
    link.click();
  }

  // ======================
  // 6. START THE APP
  // ======================

  // Set up event listeners
  elements.uploadBtn.addEventListener('click', () => elements.imageInput.click());
  elements.imageInput.addEventListener('change', handleImageUpload);
  elements.downloadBtn.addEventListener('click', handleDownload);
  elements.destroyButton.addEventListener('click', handleDestroyClick);

  // Set up event listeners for sliders
  [elements.brightness, elements.contrast, elements.pixelSize].forEach(slider => {
    slider.addEventListener('input', (e) => {
      handleSliderUpdate(e); // Update the slider value display
      resetDestroyButton(); // Reset the destroyButton style
    });
  });

  // Trigger initial slider updates
  [elements.brightness, elements.contrast, elements.pixelSize].forEach(slider => {
    slider.dispatchEvent(new Event('input'));
  });

  // Load default image
  currentState.originalImage.onload = function () {
    elements.canvasItem.width = this.width;
    elements.canvasItem.height = this.height;

    // Process the image immediately after load
    processImage().then(() => {
    }).catch((error) => {
      console.error('Error processing default image:', error);
    });
  };

  currentState.originalImage.src = settings.defaultImage;