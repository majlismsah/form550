document.addEventListener('DOMContentLoaded', () => {
    // === Variabel Elemen DOM ===
    const registrationForm = document.getElementById('registrationForm');
    const fotoCoverInput = document.getElementById('fotoCover');
    const imageUploadArea = document.getElementById('imageUploadArea');
    const imageCropperContainer = document.getElementById('imageCropperContainer');
    const imageToCrop = document.getElementById('imageToCrop');
    const cropButton = document.getElementById('cropButton');
    const finalCroppedImage = document.getElementById('finalCroppedImage');
    const croppedImagePreview = document.getElementById('croppedImagePreview');
    const changePhotoButton = document.getElementById('changePhotoButton');

    const successPopup = document.getElementById('successPopup');
    const closePopupButton = successPopup.querySelector('.close-button');
    const okPopupButton = successPopup.querySelector('.ok-button');
    const whatsappAdminButton = document.getElementById('whatsappAdminButton'); // Tombol WA di popup
    const popupTitle = successPopup.querySelector('h2'); // Judul popup
    const popupMessageElement = successPopup.querySelector('p'); // Pesan di popup

    const namaLengkapInput = document.getElementById('namaLengkap');
    const namaSulthonInput = document.getElementById('namaSulthon');
    const noWhatsappInput = document.getElementById('noWhatsapp');
    const majlisWilayahSelect = document.getElementById('majlisWilayah');
    const submitButton = document.querySelector('.submit-button');
    const loadingMessage = document.getElementById('loadingMessage'); // Elemen pesan loading baru

    let cropper;
    let croppedBlob = null;

    // --- PENTING: KONFIGURASI APLIKASI ---
    const CONFIG = {
        ADMIN_WHATSAPP_NUMBER: '6285213347126', // Nomor WhatsApp Admin Anda
        GOOGLE_SHEET_ID: '1B-nvTwNUe6-x6fab6-5xGzdqnM92C2HXuqGVNFkurBM', // ID Google Spreadsheet Anda
        GOOGLE_DRIVE_FOLDER_ID: '1pSvqc1y2P69U4Z0QrI0WLwmXUC1bZd7m', // ID Folder Google Drive Anda untuk Foto
        GOOGLE_APPS_SCRIPT_WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbyUudhp-Bc1DOVfE969vF-U0mu7Nh_KIefTdx0KyKVy8tafOiZBAFdbrrj_EkQOylk4mw/exec'
    };
    // --- AKHIR KONFIGURASI ---


    // === Fungsionalitas Popup Konfirmasi ===
    function showSuccessPopup(title, message, showWhatsappButton = false) {
        if (popupTitle) popupTitle.textContent = title;
        if (popupMessageElement) popupMessageElement.textContent = message;
        
        if (whatsappAdminButton) {
            if (showWhatsappButton) {
                whatsappAdminButton.style.display = 'block';
                whatsappAdminButton.onclick = () => {
                    const adminNumber = CONFIG.ADMIN_WHATSAPP_NUMBER;
                    const whatsappMessage = `*Pendaftaran Baru Ashanf 550 Titik:*\n\n` +
                                            `*Nama Lengkap:* ${namaLengkapInput.value}\n` +
                                            `*Nama Sulthon:* ${namaSulthonInput.value}\n` +
                                            `*No. WhatsApp Pendaftar:* ${noWhatsappInput.value}\n` +
                                            `*Majlis Wilayah:* ${majlisWilayahSelect.value}\n\n` +
                                            `Mohon segera ditindaklanjuti.`;
                    const whatsappLink = `https://wa.me/${adminNumber}?text=${encodeURIComponent(whatsappMessage)}`;
                    window.open(whatsappLink, '_blank');
                    console.log('Notifikasi WhatsApp dipicu untuk admin:', adminNumber);
                };
            } else {
                whatsappAdminButton.style.display = 'none';
            }
        }
        successPopup.style.display = 'flex';
    }

    function hideSuccessPopup() {
        successPopup.style.display = 'none';
        registrationForm.reset();
        resetImageUploadArea();
        croppedBlob = null;
        if (whatsappAdminButton) {
            whatsappAdminButton.style.display = 'none';
        }
        // Reset pesan dan judul popup ke default jika diperlukan
        if (popupTitle) popupTitle.textContent = 'Pendaftaran Berhasil!';
        if (popupMessageElement) popupMessageElement.textContent = 'Terima kasih atas pendaftaran Anda.';
    }

    closePopupButton.onclick = hideSuccessPopup;
    okPopupButton.onclick = hideSuccessPopup; 
    window.onclick = (event) => {
        if (event.target === successPopup) {
            hideSuccessPopup();
        }
    };

    // Fungsi untuk mereset seluruh area upload foto ke kondisi awal
    function resetImageUploadArea() {
        console.log('resetImageUploadArea dipanggil');
        if (cropper) {
            cropper.destroy();
            console.log('Cropper instance dihancurkan.');
        }
        imageCropperContainer.style.display = 'none';
        
        finalCroppedImage.style.display = 'none';
        finalCroppedImage.src = '';
        croppedImagePreview.style.display = 'none';
        changePhotoButton.style.display = 'none';
        
        imageUploadArea.style.display = 'flex';
        imageUploadArea.classList.remove('dragover');
        fotoCoverInput.value = '';
        console.log('Area upload foto direset ke kondisi awal.');
    }


    // === Fungsionalitas Upload dan Crop Foto (termasuk Drag & Drop) ===

    imageUploadArea.addEventListener('click', (e) => {
        console.log('imageUploadArea diklik.');
        if (imageUploadArea.style.display !== 'none') {
            console.log('Memicu klik pada fotoCoverInput.');
            fotoCoverInput.click();
        } else {
            console.log('imageUploadArea tidak ditampilkan, klik tidak dipicu.');
        }
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        imageUploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    imageUploadArea.addEventListener('dragenter', () => {
        imageUploadArea.classList.add('dragover');
        console.log('Drag Enter');
    }, false);
    imageUploadArea.addEventListener('dragleave', () => {
        imageUploadArea.classList.remove('dragover');
        console.log('Drag Leave');
    }, false);
    imageUploadArea.addEventListener('dragover', () => {
        imageUploadArea.classList.add('dragover');
        console.log('Drag Over');
    }, false);

    imageUploadArea.addEventListener('drop', (e) => {
        console.log('File didrop.');
        imageUploadArea.classList.remove('dragover');
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }, false);

    fotoCoverInput.addEventListener('change', (e) => {
        console.log('File dipilih melalui input standar.');
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        if (files.length === 0) {
            console.warn('Tidak ada file yang dipilih.');
            return;
        }
        const file = files[0];
        console.log('File yang dipilih:', file.name, file.type, file.size);
        if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                console.log('FileReader selesai membaca file.');
                if (cropper) {
                    cropper.destroy();
                    console.log('Cropper lama dihancurkan sebelum inisialisasi baru.');
                }
                
                imageToCrop.src = event.target.result;
                imageUploadArea.style.display = 'none';
                croppedImagePreview.style.display = 'none';
                changePhotoButton.style.display = 'none';
                imageCropperContainer.style.display = 'block';
                console.log('Container cropper ditampilkan.');

                cropper = new Cropper(imageToCrop, {
                    aspectRatio: 4 / 6,
                    viewMode: 1,
                    autoCropArea: 0.8,
                    responsive: true,
                    background: false,
                    ready() {
                        console.log('Cropper is ready.');
                    },
                    error(err) {
                        console.error('Cropper error:', err);
                    }
                });
            };
            reader.onerror = (error) => {
                console.error('FileReader error:', error);
                alert('Gagal membaca file gambar.');
            };
            reader.readAsDataURL(file);
        } else {
            alert('Jenis file tidak didukung. Mohon unggah gambar JPEG atau PNG.');
            fotoCoverInput.value = '';
            console.warn('Jenis file tidak didukung:', file ? file.type : 'No file');
        }
    }

    cropButton.addEventListener('click', () => {
        console.log('Tombol Potong Foto diklik.');
        if (cropper) {
            const croppedCanvas = cropper.getCroppedCanvas({
                width: 400,
                height: 600,
                imageSmoothingQuality: 'high',
            });

            finalCroppedImage.src = croppedCanvas.toDataURL('image/png');
            finalCroppedImage.style.display = 'block';
            croppedImagePreview.style.display = 'flex';
            imageCropperContainer.style.display = 'none';
            changePhotoButton.style.display = 'block';
            console.log('Gambar berhasil di-crop dan ditampilkan pratinjau.');

            croppedCanvas.toBlob((blob) => {
                croppedBlob = blob;
                console.log('Cropped image converted to Blob. Size:', blob.size, 'bytes');
            }, 'image/png', 0.9);

            cropper.destroy();
            console.log('Cropper instance dihancurkan setelah cropping.');
        } else {
            console.warn('Cropper tidak aktif saat tombol potong diklik.');
            alert('Tidak ada gambar untuk dipotong.');
        }
    });

    changePhotoButton.addEventListener('click', () => {
        console.log('Tombol Ubah Foto diklik.');
        resetImageUploadArea();
    });

    // === Fungsionalitas Otomatisasi Input Formulir ===
    noWhatsappInput.addEventListener('input', function() {
        let value = this.value;
        if (value.length > 0 && !value.startsWith('62')) {
            this.value = '62' + value.replace(/^0+/, ''); 
        } else if (value.length === 0) {
            this.value = ''; 
        }
    });

    namaLengkapInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });

    namaSulthonInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });


    // === Penanganan Submit Formulir ===
    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        submitButton.disabled = true;
        submitButton.textContent = 'Memproses...';
        loadingMessage.style.display = 'block'; // Tampilkan pesan loading
        console.log('Formulir disubmit. Tombol dinonaktifkan, pesan loading ditampilkan.');

        const namaLengkap = namaLengkapInput.value;
        const namaSulthon = namaSulthonInput.value;
        const noWhatsapp = noWhatsappInput.value;
        const majlisWilayah = majlisWilayahSelect.value;
        
        if (!croppedBlob) {
            alert('Mohon unggah dan potong foto terlebih dahulu.');
            console.warn('Submit dibatalkan: Foto belum di-crop.');
            submitButton.disabled = false;
            submitButton.textContent = 'Daftar Sekarang';
            loadingMessage.style.display = 'none'; // Sembunyikan pesan loading
            return;
        }

        if (!namaLengkap || !namaSulthon || !noWhatsapp || !majlisWilayah) {
            alert('Mohon lengkapi semua data formulir.');
            console.warn('Submit dibatalkan: Data formulir belum lengkap.');
            submitButton.disabled = false;
            submitButton.textContent = 'Daftar Sekarang';
            loadingMessage.style.display = 'none'; // Sembunyikan pesan loading
            return;
        }

        const formData = new FormData();
        formData.append('namaLengkap', namaLengkap);
        formData.append('namaSulthon', namaSulthon);
        formData.append('noWhatsapp', noWhatsapp);
        formData.append('majlisWilayah', majlisWilayah);
        
        const fileName = `${namaSulthon.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.png`;
        formData.append('fotoCover', croppedBlob, fileName);
        formData.append('fotoCoverFilename', fileName);
        console.log('FormData disiapkan dengan file:', fileName);


        const GOOGLE_APPS_SCRIPT_WEB_APP_URL = CONFIG.GOOGLE_APPS_SCRIPT_WEB_APP_URL; 

        if (!GOOGLE_APPS_SCRIPT_WEB_APP_URL || GOOGLE_APPS_SCRIPT_WEB_APP_URL.trim() === '' || GOOGLE_APPS_SCRIPT_WEB_APP_URL.includes('YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
            alert('Error Konfigurasi: URL Google Apps Script Web App belum diatur atau masih placeholder di script.js. Mohon periksa kembali.');
            console.error('URL Apps Script tidak valid:', GOOGLE_APPS_SCRIPT_WEB_APP_URL);
            submitButton.disabled = false;
            submitButton.textContent = 'Daftar Sekarang';
            loadingMessage.style.display = 'none'; // Sembunyikan pesan loading
            return;
        }
        console.log('Mengirim data ke URL Apps Script:', GOOGLE_APPS_SCRIPT_WEB_APP_URL);

        try {
            const response = await fetch(GOOGLE_APPS_SCRIPT_WEB_APP_URL, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const result = await response.json();
            console.log('Respons dari Apps Script:', result);

            if (result.status === 'SUCCESS') {
                showSuccessPopup('Registrasi Berhasil!', 'Data Anda telah berhasil disimpan.', true); // Tampilkan popup sukses dengan tombol WA
                console.log('Pendaftaran BERHASIL.');
            } else {
                showSuccessPopup('Registrasi Gagal!', result.message || 'Terjadi kesalahan tidak dikenal saat pendaftaran.', false); // Tampilkan popup gagal tanpa tombol WA
                console.error('Apps Script GAGAL:', result.message || 'Respons tidak diketahui.');
            }
        } catch (error) {
            console.error('Error saat submit formulir:', error);
            showSuccessPopup('Registrasi Gagal!', 'Terjadi kesalahan saat pendaftaran. Mohon coba lagi atau hubungi admin.', false); // Tampilkan popup gagal
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Daftar Sekarang';
            loadingMessage.style.display = 'none'; // Sembunyikan pesan loading
            console.log('Proses submit formulir selesai.');
        }
    });
});
