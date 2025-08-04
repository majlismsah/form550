document.addEventListener('DOMContentLoaded', () => {
    // === Variabel Elemen DOM ===
    const registrationForm = document.getElementById('registrationForm');
    const fotoCoverInput = document.getElementById('fotoCover');
    const imageUploadArea = document.getElementById('imageUploadArea'); // Area drag-and-drop
    const imageCropperContainer = document.getElementById('imageCropperContainer'); // Container cropper
    const imageToCrop = document.getElementById('imageToCrop'); // Gambar yang akan di-crop
    const cropButton = document.getElementById('cropButton'); // Tombol potong
    const finalCroppedImage = document.getElementById('finalCroppedImage'); // Gambar hasil crop
    const croppedImagePreview = document.getElementById('croppedImagePreview'); // Area untuk menampilkan hasil crop akhir
    const changePhotoButton = document.getElementById('changePhotoButton'); // Tombol "Ubah Foto"

    const successPopup = document.getElementById('successPopup');
    const closePopupButton = successPopup.querySelector('.close-button');
    const okPopupButton = successPopup.querySelector('.ok-button');

    const namaLengkapInput = document.getElementById('namaLengkap');
    const namaSulthonInput = document.getElementById('namaSulthon');
    const noWhatsappInput = document.getElementById('noWhatsapp');
    const majlisWilayahSelect = document.getElementById('majlisWilayah');
    const submitButton = document.querySelector('.submit-button');

    let cropper; // Variabel untuk menyimpan instance Cropper.js
    let croppedBlob = null; // Menyimpan blob (data biner) foto yang sudah di-crop

    // --- PENTING: KONFIGURASI APLIKASI ---
    const CONFIG = {
        ADMIN_WHATSAPP_NUMBER: '6285213347126', // Nomor WhatsApp Admin Anda
        GOOGLE_SHEET_ID: '1B-nvTwNUe6-x6fab6-5xGzdqnM92C2HXuqGVNFkurBM', // ID Google Spreadsheet Anda
        GOOGLE_DRIVE_FOLDER_ID: '1pSvqc1y2P69U4Z0QrI0WLwmXUC1bZd7m', // ID Folder Google Drive Anda untuk Foto
        // Pastikan URL ini sudah diganti dengan URL Web App Anda yang sebenarnya
        GOOGLE_APPS_SCRIPT_WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbyUudhp-Bc1DOVfE969vF-U0mu7Nh_KIefTdx0KyKVy8tafOiZBAFdbrrj_EkQOylk4mw/exec'
    };
    // --- AKHIR KONFIGURASI ---


    // === Fungsionalitas Popup Konfirmasi ===
    function showSuccessPopup() {
        successPopup.style.display = 'flex'; // Tampilkan popup
    }

    function hideSuccessPopup() {
        successPopup.style.display = 'none'; // Sembunyikan popup
        registrationForm.reset(); // Reset seluruh formulir
        resetImageUploadArea(); // Reset area upload foto
        croppedBlob = null; // Hapus data foto yang di-crop dari memori
    }

    // Event listener untuk tombol close (X) dan tombol OK pada popup
    closePopupButton.onclick = hideSuccessPopup;
    okPopupButton.onclick = hideSuccessPopup; 
    // Klik di luar popup juga akan menutupnya
    window.onclick = (event) => {
        if (event.target === successPopup) { // Menggunakan '===' untuk perbandingan yang lebih ketat
            hideSuccessPopup();
        }
    };

    // Fungsi untuk mereset seluruh area upload foto ke kondisi awal
    function resetImageUploadArea() {
        console.log('resetImageUploadArea dipanggil'); // Log untuk debugging
        if (cropper) {
            cropper.destroy(); // Hancurkan instance cropper jika masih ada
            console.log('Cropper instance dihancurkan.');
        }
        imageCropperContainer.style.display = 'none'; // Sembunyikan container cropper
        
        finalCroppedImage.style.display = 'none'; // Sembunyikan gambar hasil crop
        finalCroppedImage.src = ''; // Hapus sumber gambar hasil crop
        croppedImagePreview.style.display = 'none'; // Sembunyikan container pratinjau hasil crop
        changePhotoButton.style.display = 'none'; // Sembunyikan tombol "Ubah Foto"
        
        imageUploadArea.style.display = 'flex'; // Tampilkan kembali area upload (drag & drop)
        imageUploadArea.classList.remove('dragover'); // Hapus class dragover jika ada
        fotoCoverInput.value = ''; // Reset input file asli
        console.log('Area upload foto direset ke kondisi awal.');
    }


    // === Fungsionalitas Upload dan Crop Foto (termasuk Drag & Drop) ===

    // Memicu klik pada input file tersembunyi ketika area upload diklik
    imageUploadArea.addEventListener('click', (e) => {
        // Tambahkan log untuk debugging event listener
        console.log('imageUploadArea diklik.');
        if (imageUploadArea.style.display !== 'none') {
            console.log('Memicu klik pada fotoCoverInput.');
            fotoCoverInput.click(); // Memicu klik pada input file yang tersembunyi
        } else {
            console.log('imageUploadArea tidak ditampilkan, klik tidak dipicu.');
        }
    });

    // Mencegah perilaku default browser untuk drag-and-drop (misal: membuka file di browser)
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        imageUploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Menangani efek visual saat file diseret ke area drag-and-drop
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

    // Menangani file yang dilepaskan di area drag-and-drop
    imageUploadArea.addEventListener('drop', (e) => {
        console.log('File didrop.');
        imageUploadArea.classList.remove('dragover');
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }, false);

    // Menangani file yang dipilih melalui input standar (klik "Pilih File")
    fotoCoverInput.addEventListener('change', (e) => {
        console.log('File dipilih melalui input standar.');
        handleFiles(e.target.files);
    });

    // Fungsi utama untuk memproses file gambar yang dipilih/di-drop
    function handleFiles(files) {
        if (files.length === 0) {
            console.warn('Tidak ada file yang dipilih.');
            return;
        }
        const file = files[0];
        console.log('File yang dipilih:', file.name, file.type, file.size);
        // Pastikan file adalah gambar JPEG atau PNG
        if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                console.log('FileReader selesai membaca file.');
                if (cropper) {
                    cropper.destroy(); // Hancurkan instance cropper sebelumnya jika ada
                    console.log('Cropper lama dihancurkan sebelum inisialisasi baru.');
                }
                
                imageToCrop.src = event.target.result; // Set sumber gambar untuk Cropper
                imageUploadArea.style.display = 'none'; // Sembunyikan area upload
                croppedImagePreview.style.display = 'none'; // Sembunyikan preview hasil crop
                changePhotoButton.style.display = 'none'; // Sembunyikan tombol "Ubah Foto"
                imageCropperContainer.style.display = 'block'; // Tampilkan container cropper
                console.log('Container cropper ditampilkan.');

                // Inisialisasi Cropper.js dengan rasio aspek 4:6
                cropper = new Cropper(imageToCrop, {
                    aspectRatio: 4 / 6, // Rasio aspek 4x6
                    viewMode: 1, // Membatasi crop box agar tidak keluar dari kanvas
                    autoCropArea: 0.8, // Area crop awal (80% dari gambar)
                    responsive: true, // Responsif terhadap ukuran container
                    background: false, // Sembunyikan latar belakang grid Cropper
                    ready() {
                        console.log('Cropper is ready.'); // Log ketika cropper siap
                    },
                    error(err) {
                        console.error('Cropper error:', err); // Log jika ada error di cropper
                    }
                });
            };
            reader.onerror = (error) => {
                console.error('FileReader error:', error);
                alert('Gagal membaca file gambar.');
            };
            reader.readAsDataURL(file); // Baca file sebagai Data URL
        } else {
            alert('Jenis file tidak didukung. Mohon unggah gambar JPEG atau PNG.');
            fotoCoverInput.value = ''; // Reset input file jika jenisnya salah
            console.warn('Jenis file tidak didukung:', file ? file.type : 'No file');
        }
    }

    // Event listener untuk tombol "Potong Foto"
    cropButton.addEventListener('click', () => {
        console.log('Tombol Potong Foto diklik.');
        if (cropper) {
            // Dapatkan canvas dari gambar yang dipotong dengan ukuran target
            const croppedCanvas = cropper.getCroppedCanvas({
                width: 400, // Lebar ideal untuk 4x6cm (misal 400px)
                height: 600, // Tinggi ideal untuk 4x6cm (misal 600px)
                imageSmoothingQuality: 'high', // Kualitas gambar lebih baik
            });

            // Tampilkan hasil crop di area preview
            finalCroppedImage.src = croppedCanvas.toDataURL('image/png'); // Simpan sebagai PNG
            finalCroppedImage.style.display = 'block'; // Tampilkan gambar hasil crop
            croppedImagePreview.style.display = 'flex'; // Tampilkan container pratinjau
            imageCropperContainer.style.display = 'none'; // Sembunyikan cropper
            changePhotoButton.style.display = 'block'; // Tampilkan tombol "Ubah Foto"
            console.log('Gambar berhasil di-crop dan ditampilkan pratinjau.');

            // Konversi canvas ke Blob (data biner) untuk diupload
            croppedCanvas.toBlob((blob) => {
                croppedBlob = blob;
                console.log('Cropped image converted to Blob. Size:', blob.size, 'bytes');
            }, 'image/png', 0.9); // Kualitas 0.9 untuk PNG

            cropper.destroy(); // Hancurkan instance cropper setelah selesai
            console.log('Cropper instance dihancurkan setelah cropping.');
        } else {
            console.warn('Cropper tidak aktif saat tombol potong diklik.');
            alert('Tidak ada gambar untuk dipotong.');
        }
    });

    // Event listener untuk tombol "Ubah Foto" (Ganti Foto)
    changePhotoButton.addEventListener('click', () => {
        console.log('Tombol Ubah Foto diklik.');
        resetImageUploadArea(); // Panggil fungsi reset untuk mengulang proses upload
    });

    // === Fungsionalitas Otomatisasi Input Formulir ===

    // Otomatisasi Nomor WhatsApp: Selalu diawali dengan '62'
    noWhatsappInput.addEventListener('input', function() {
        let value = this.value;
        // Jika input tidak kosong dan belum diawali '62'
        if (value.length > 0 && !value.startsWith('62')) {
            // Hapus '0' di awal jika ada, lalu tambahkan '62'
            this.value = '62' + value.replace(/^0+/, ''); 
        } else if (value.length === 0) {
            // Biarkan kosong jika pengguna menghapus semua karakter
            this.value = ''; 
        }
    });

    // Otomatisasi Nama Lengkap: Selalu dalam huruf besar
    namaLengkapInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });

    // Otomatisasi Nama Sulthon: Selalu dalam huruf besar
    namaSulthonInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });


    // === Penanganan Submit Formulir ===
    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Mencegah reload halaman default browser

        submitButton.disabled = true; // Nonaktifkan tombol submit selama proses
        submitButton.textContent = 'Memproses...'; // Ubah teks tombol
        console.log('Formulir disubmit. Tombol dinonaktifkan.');

        // Ambil nilai dari input (yang sudah otomatis diubah oleh JS)
        const namaLengkap = namaLengkapInput.value;
        const namaSulthon = namaSulthonInput.value;
        const noWhatsapp = noWhatsappInput.value;
        const majlisWilayah = majlisWilayahSelect.value;
        
        // Validasi: Pastikan foto sudah di-crop
        if (!croppedBlob) {
            alert('Mohon unggah dan potong foto terlebih dahulu.');
            console.warn('Submit dibatalkan: Foto belum di-crop.');
            submitButton.disabled = false; // Aktifkan kembali tombol
            submitButton.textContent = 'Daftar Sekarang';
            return;
        }

        // Validasi: Pastikan semua field wajib terisi
        if (!namaLengkap || !namaSulthon || !noWhatsapp || !majlisWilayah) {
            alert('Mohon lengkapi semua data formulir.');
            console.warn('Submit dibatalkan: Data formulir belum lengkap.');
            submitButton.disabled = false;
            submitButton.textContent = 'Daftar Sekarang';
            return;
        }

        // Buat objek FormData untuk mengirim data (termasuk file foto)
        const formData = new FormData();
        formData.append('namaLengkap', namaLengkap);
        formData.append('namaSulthon', namaSulthon);
        formData.append('noWhatsapp', noWhatsapp);
        formData.append('majlisWilayah', majlisWilayah);
        
        // Beri nama file foto sesuai Nama Sulthon + timestamp untuk keunikan
        const fileName = `${namaSulthon.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.png`;
        formData.append('fotoCover', croppedBlob, fileName);
        console.log('FormData disiapkan dengan file:', fileName);


        // --- INTEGRASI KE GOOGLE APPS SCRIPT (Web App) ---
        const GOOGLE_APPS_SCRIPT_WEB_APP_URL = CONFIG.GOOGLE_APPS_SCRIPT_WEB_APP_URL; 

        // Validasi URL Apps Script - Menggunakan logika yang lebih robust
        if (!GOOGLE_APPS_SCRIPT_WEB_APP_URL || GOOGLE_APPS_SCRIPT_WEB_APP_URL.trim() === '' || GOOGLE_APPS_SCRIPT_WEB_APP_URL.includes('YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
            alert('Error Konfigurasi: URL Google Apps Script Web App belum diatur atau masih placeholder di script.js. Mohon periksa kembali.');
            console.error('URL Apps Script tidak valid:', GOOGLE_APPS_SCRIPT_WEB_APP_URL);
            submitButton.disabled = false;
            submitButton.textContent = 'Daftar Sekarang';
            return;
        }
        console.log('Mengirim data ke URL Apps Script:', GOOGLE_APPS_SCRIPT_WEB_APP_URL);

        try {
            // Kirim data ke Google Apps Script Web App
            const response = await fetch(GOOGLE_APPS_SCRIPT_WEB_APP_URL, {
                method: 'POST',
                body: formData, // Mengirim FormData secara langsung
                // Penting: Jangan set Content-Type header secara manual untuk FormData, browser akan menanganinya.
            });

            if (!response.ok) { // Cek jika respons HTTP tidak OK (status 200-299)
                const errorText = await response.text(); // Baca respons sebagai teks untuk detail error
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const result = await response.json(); // Asumsi respons dari Apps Script adalah JSON
            console.log('Respons dari Apps Script:', result);

            if (result.status === 'SUCCESS') {
                showSuccessPopup(); // Tampilkan popup sukses
                console.log('Pendaftaran BERHASIL.');
                // Kirim notifikasi WhatsApp ke admin (akan membuka aplikasi WA)
                sendWhatsappNotification(namaLengkap, namaSulthon, noWhatsapp, majlisWilayah);
            } else {
                alert('Pendaftaran gagal: ' + (result.message || 'Terjadi kesalahan tidak dikenal.'));
                console.error('Apps Script GAGAL:', result.message || 'Respons tidak diketahui.');
            }
        } catch (error) {
            console.error('Error saat submit formulir:', error);
            alert('Terjadi kesalahan saat pendaftaran. Mohon coba lagi atau hubungi admin. Detail error di console.');
        } finally {
            submitButton.disabled = false; // Aktifkan kembali tombol submit
            submitButton.textContent = 'Daftar Sekarang'; // Kembalikan teks tombol
            console.log('Proses submit formulir selesai.');
        }
    });

    // === Fungsionalitas Kirim Notifikasi WhatsApp ke Admin ===
    function sendWhatsappNotification(namaLengkap, namaSulthon, noWhatsapp, majlisWilayah) {
        const adminNumber = CONFIG.ADMIN_WHATSAPP_NUMBER;
        // Buat pesan WhatsApp yang terstruktur dan mudah dibaca
        const message = `*Pendaftaran Baru Ashanf 550 Titik:*\n\n` +
                        `*Nama Lengkap:* ${namaLengkap}\n` +
                        `*Nama Sulthon:* ${namaSulthon}\n` +
                        `*No. WhatsApp Pendaftar:* ${noWhatsapp}\n` +
                        `*Majlis Wilayah:* ${majlisWilayah}\n\n` +
                        `Mohon segera ditindaklanjuti.`;

        // Buat link WhatsApp dan buka di tab baru
        const whatsappLink = `https://wa.me/${adminNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappLink, '_blank'); 
        console.log('Notifikasi WhatsApp dipicu untuk admin:', adminNumber);
    }

});
