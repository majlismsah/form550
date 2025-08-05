// Configuration
const CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzUiB3eVCJu554W4HxwjdqpsPRjBUXx6pCJCEnInCO8tpV9HF3or-zfT9FgOijmsTJ8/exec",
  ADMIN_WA_NUMBER: "6285213347126",
  MAX_FILE_SIZE: 5 * 1024 * 1024 // 10MB
};

// Initialize Cropper instances
let mobileCropper;

// DOM Elements
const elements = {
  mobile: {
    form: document.getElementById('preorderFormMobile'),
    fileInput: document.getElementById('mobileFileInput'),
    imagePreview: document.getElementById('mobileImagePreview'),
    uploadSection: document.getElementById('mobileUploadSection'),
    cropSection: document.getElementById('mobileCropSection'),
    resultSection: document.getElementById('mobileResultSection'),
    croppedResult: document.getElementById('mobileCroppedResult'),
    croppedImageData: document.getElementById('mobileCroppedImageData'),
    rotateLeft: document.getElementById('mobileRotateLeft'),
    rotateRight: document.getElementById('mobileRotateRight'),
    resetCrop: document.getElementById('mobileResetCrop'),
    cancelCrop: document.getElementById('mobileCancelCrop'),
    saveCrop: document.getElementById('mobileSaveCrop'),
    changePhoto: document.getElementById('mobileChangePhoto'),
  },
  sheet: document.getElementById('sheet'),
  sheetOverlay: document.getElementById('sheetOverlay'),
  loadingPopup: document.getElementById('loadingPopup'),
  successPopup: document.getElementById('successPopup'),
  whatsappButton: document.getElementById('whatsappButton')
};
function toggleSheet(show) {
  if (show) {
    elements.sheet.classList.remove('hidden');
    elements.sheet.classList.add('show');
    elements.sheetOverlay.classList.add('active');
  } else {
    elements.sheet.classList.remove('show');
    elements.sheetOverlay.classList.remove('active');
    setTimeout(() => elements.sheet.classList.add('hidden'), 300);
  }
}
function init() {
  setupCroppers();
  setupFormSubmissions();
  setupPhoneNumberFormatting();
}

// Cropper Functions
function setupCroppers() {
  initCropper('mobile');
}

function initCropper(prefix) {
  const el = elements[prefix];
  
  el.fileInput.addEventListener('change', function(e) {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      if (file.size > CONFIG.MAX_FILE_SIZE) {
        alert('Ukuran file terlalu besar. Maksimal 5MB');
        el.fileInput.value = '';
        return;
      }
      
      const reader = new FileReader();
      reader.onload = function(event) {
        el.imagePreview.src = event.target.result;
        el.uploadSection.classList.add('hidden');
        el.cropSection.classList.remove('hidden');
        
        const cropperOptions = {
          aspectRatio: 1,
          viewMode: 1,
          autoCropArea: 0.8,
          responsive: true,
          guides: false,
          background: false
        };
        
        if (prefix === 'mobile' && mobileCropper) mobileCropper.destroy();
        mobileCropper = new Cropper(el.imagePreview, cropperOptions);
      };
      reader.readAsDataURL(file);
    }
  });


  // Rotate buttons
  el.rotateLeft.addEventListener('click', function() {
    if (mobileCropper) mobileCropper.rotate(-90);
  });

  el.rotateRight.addEventListener('click', function() {
    if (mobileCropper) mobileCropper.rotate(90);
  });

  // Reset button
  el.resetCrop.addEventListener('click', function() {
    if (mobileCropper) mobileCropper.reset();
  });

  // Cancel button
  el.cancelCrop.addEventListener('click', function() {
    if (mobileCropper) mobileCropper.destroy();
    el.cropSection.classList.add('hidden');
    el.uploadSection.classList.remove('hidden');
    el.fileInput.value = '';
  });

  // Save button
  el.saveCrop.addEventListener('click', function() {
    if (!mobileCropper) return;
    
    const croppedCanvas = mobileCropper.getCroppedCanvas({
      width: 400,
      height: 400,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    });
    
    const croppedImage = document.createElement('img');
    croppedImage.src = croppedCanvas.toDataURL('image/jpeg', 0.9);
    croppedImage.classList.add('cropped-preview');
    
    el.croppedResult.innerHTML = '';
    el.croppedResult.appendChild(croppedImage);
    el.croppedImageData.value = croppedCanvas.toDataURL('image/jpeg', 0.9);
    
    el.cropSection.classList.add('hidden');
    el.resultSection.classList.remove('hidden');
  });

  // Change photo button
  el.changePhoto.addEventListener('click', function() {
    el.resultSection.classList.add('hidden');
    el.uploadSection.classList.remove('hidden');
    el.fileInput.value = '';
  });
}

// Form Handling
function handleFormSubmit(prefix, fieldIds) {
  const form = elements[prefix].form;
  const btn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
      nama_ktp: document.getElementById(fieldIds.nama_ktp).value,
      nama_sulthon: document.getElementById(fieldIds.nama_sulthon).value,
      no_wa: document.getElementById(fieldIds.no_wa).value,
      majlis: document.getElementById(fieldIds.majlis).value,
      fotoProfil: document.getElementById(fieldIds.fotoProfil).value
    };

    await submitFormData(formData, btn, prefix);
  });
}

function setupFormSubmissions() {
  handleFormSubmit('mobile', {
    nama_ktp: "namaKtpMobile",
    nama_sulthon: "namaSulthonMobile",
    no_wa: "waMobile",
    majlis: "majlisMobile",
    fotoProfil: "mobileCroppedImageData"
  });
}

async function submitFormData(formData, btn, prefix) {
  btn.disabled = true;
  const originalBtnText = btn.textContent;
  btn.textContent = 'Memproses...';

  // Tampilkan loading popup
  elements.loadingPopup.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  try {
    const payload = {
      nama_ktp: formData.nama_ktp,
      nama_sulthon: formData.nama_sulthon,
      no_wa: formData.no_wa.replace(/[^0-9]/g, ''),
      majlis: formData.majlis,
      foto_file: formData.fotoProfil.split(',')[1],
      foto_file_type: 'image/jpeg',
      foto_file_name: `profile_${Date.now()}.jpg`
    };

    const response = await fetch(CONFIG.SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(payload)
    });

    if (!response.ok) throw new Error(await response.text());

    // Sembunyikan loading popup
    elements.loadingPopup.style.display = 'none';
    
    // Buat pesan WhatsApp
    const waMessage = `Halo Admin, saya sudah registrasi pembukaan Ashnaf 550 Titik:\n\n*Nama KTP*: ${payload.nama_ktp}\n*Nama Sulthon*: ${payload.nama_sulthon}\n*No WA*: 62${payload.no_wa.replace(/^0/, '')}\n*Majlis*: ${payload.majlis}`;
    
    // Set tautan ke tombol konfirmasi di pop-up sukses
    elements.whatsappButton.href = `https://wa.me/${CONFIG.ADMIN_WA_NUMBER}?text=${encodeURIComponent(waMessage)}`;

    // Tampilkan pop-up sukses
    elements.successPopup.style.display = 'flex';

    // Reset form
    elements[prefix].form.reset();
    elements[prefix].resultSection.classList.add('hidden');
    elements[prefix].uploadSection.classList.remove('hidden');
    elements[prefix].fileInput.value = '';

    // Sembunyikan bottom sheet
    toggleSheet(false);

  } catch (error) {
    console.error('Error:', error);
    showError(error.message || 'Gagal mengirim data');
  } finally {
    // Selalu hapus loading dan enable tombol
    elements.loadingPopup.style.display = 'none';
    document.body.style.overflow = '';
    btn.disabled = false;
    btn.textContent = originalBtnText;
  }
}

// Helper Functions
function showError(errorMsg) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-[10000]';
  errorDiv.textContent = `❌ ${errorMsg}`;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 5000);
}

function setupPhoneNumberFormatting() {
  const phoneInputs = [document.getElementById('waMobile')];
  
  phoneInputs.forEach(input => {
    if (input) {
      input.addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9]/g, '');
      });
    }
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  init();
  // Close popup saat klik di luar area popup
  elements.successPopup.addEventListener('click', (e) => {
    if (e.target.id === 'successPopup') {
      elements.successPopup.style.display = 'none';
    }
  });
});
