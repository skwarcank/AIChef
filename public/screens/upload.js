import { readFileAsDataURL, resizeImage } from '../utils.js';

export function render(state, ui) {
  return `
    <div class="screen upload-screen">
      <div class="logo">AI<span>Chef</span></div>
      <button class="camera-btn" id="camera-btn">
        <span class="camera-icon">📷</span>
        ${ui.upload.takePhoto}
      </button>
      <span class="upload-link-txt">${ui.upload.orLabel}</span>
      <button class="upload-link" id="upload-link">⬆ ${ui.upload.uploadPhoto}</button>
      <span class="upload-hint">${ui.upload.maxPhoto}</span>
      <input type="file" id="camera-input" accept="image/*" capture="environment" style="display:none">
      <input type="file" id="upload-input" accept="image/*" style="display:none">
    </div>
  `;
}

export function mount(container, actions) {
  const cameraInput = container.querySelector('#camera-input');
  const uploadInput = container.querySelector('#upload-input');

  container.querySelector('#camera-btn').addEventListener('click', () => cameraInput.click());

  container.querySelector('#upload-link').addEventListener('click', () => uploadInput.click());

  cameraInput.addEventListener('change', handleFile);
  uploadInput.addEventListener('change', handleFile);

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await readFileAsDataURL(file);
    const resized = await resizeImage(dataUrl);
    actions.onPhoto(resized);
    e.target.value = '';
  }
}
