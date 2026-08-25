// QRForge — Main Application Logic

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Feather Icons
  if (typeof feather !== 'undefined') {
    feather.replace();
  }

  // --- State Variables ---
  let currentType = 'url';
  let activeQrText = 'https://example.com';
  let historyItems = JSON.parse(localStorage.getItem('qrforge_history') || '[]');

  // --- DOM Elements ---
  const typeTabs = document.querySelectorAll('.type-tab');
  const formContainers = document.querySelectorAll('.form-type-content');
  const generateBtn = document.getElementById('generateBtn');
  const clearBtn = document.getElementById('clearBtn');
  
  // Customization elements
  const sizeSelect = document.getElementById('sizeSelect');
  const fgColorPicker = document.getElementById('fgColorPicker');
  const fgColorText = document.getElementById('fgColorText');
  const bgColorPicker = document.getElementById('bgColorPicker');
  const bgColorText = document.getElementById('bgColorText');
  const marginSlider = document.getElementById('marginSlider');
  const marginValue = document.getElementById('marginValue');
  const ecSelect = document.getElementById('ecSelect');
  const presetChips = document.querySelectorAll('.preset-chip');

  // Preview elements
  const qrCanvas = document.getElementById('qrCanvas');
  const downloadPngBtn = document.getElementById('downloadPngBtn');
  const downloadSvgBtn = document.getElementById('downloadSvgBtn');
  const copyBtn = document.getElementById('copyBtn');

  // Theme & Navigation elements
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const navLinks = document.getElementById('navLinks');

  // History elements
  const historyGrid = document.getElementById('historyGrid');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');

  // Toast Container
  const toastContainer = document.getElementById('toastContainer');

  // --- Theme Toggle Logic ---
  const savedTheme = localStorage.getItem('qrforge_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  setTheme(savedTheme);

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
  });

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('qrforge_theme', theme);
    if (themeIcon) {
      themeIcon.setAttribute('data-feather', theme === 'dark' ? 'sun' : 'moon');
      if (typeof feather !== 'undefined') feather.replace();
    }
  }

  // --- Mobile Navigation Menu ---
  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // Close mobile nav on click link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
    });
  });

  // --- Type Tab Switching ---
  typeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      typeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      currentType = tab.getAttribute('data-type');

      // Hide all forms, show selected
      formContainers.forEach(form => {
        form.style.display = 'none';
      });

      const selectedForm = document.getElementById(`form-${currentType}`);
      if (selectedForm) {
        selectedForm.style.display = 'block';
      }

      clearErrors();
      generateQR(false); // Update preview live
    });
  });

  // --- Color Syncing ---
  fgColorPicker.addEventListener('input', (e) => {
    fgColorText.value = e.target.value.toUpperCase();
    generateQR(false);
  });

  fgColorText.addEventListener('input', (e) => {
    let val = e.target.value;
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      fgColorPicker.value = val;
      generateQR(false);
    }
  });

  bgColorPicker.addEventListener('input', (e) => {
    bgColorText.value = e.target.value.toUpperCase();
    generateQR(false);
  });

  bgColorText.addEventListener('input', (e) => {
    let val = e.target.value;
    if (!val.startsWith('#')) val = '#' + val;
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      bgColorPicker.value = val;
      generateQR(false);
    }
  });

  // Preset Chips
  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const fg = chip.getAttribute('data-fg');
      const bg = chip.getAttribute('data-bg');
      fgColorPicker.value = fg;
      fgColorText.value = fg.toUpperCase();
      bgColorPicker.value = bg;
      bgColorText.value = bg.toUpperCase();
      generateQR(false);
      showToast(`Applied ${chip.textContent} theme`, 'palette');
    });
  });

  // Margin Slider
  marginSlider.addEventListener('input', (e) => {
    marginValue.textContent = e.target.value;
    generateQR(false);
  });

  // Size & Error Correction dropdowns
  sizeSelect.addEventListener('change', () => generateQR(false));
  ecSelect.addEventListener('change', () => generateQR(false));

  // --- Dynamic Data Extraction ---
  function getQRData() {
    clearErrors();
    let data = '';
    let isValid = true;

    if (currentType === 'url') {
      const input = document.getElementById('urlInput');
      let val = input.value.trim();
      if (!val) {
        showError('urlGroup', 'Please enter a valid URL.');
        return null;
      }
      if (!val.match(/^https?:\/\//i)) {
        val = 'https://' + val;
      }
      data = val;
    } else if (currentType === 'text') {
      const input = document.getElementById('textInput');
      const val = input.value.trim();
      if (!val) {
        showError('textGroup', 'Please enter text to encode.');
        return null;
      }
      data = val;
    } else if (currentType === 'wifi') {
      const ssid = document.getElementById('wifiSsid').value.trim();
      const pass = document.getElementById('wifiPassword').value;
      const sec = document.getElementById('wifiSecurity').value;
      const hidden = document.getElementById('wifiHidden').checked;

      if (!ssid) {
        showError('wifiSsidGroup', 'Please enter network SSID.');
        return null;
      }
      // WIFI:S:ssid;T:WPA;P:password;H:true;;
      data = `WIFI:S:${escapeWifiStr(ssid)};T:${sec};P:${escapeWifiStr(pass)};H:${hidden ? 'true' : 'false'};;`;
    } else if (currentType === 'email') {
      const email = document.getElementById('emailAddress').value.trim();
      const subject = document.getElementById('emailSubject').value.trim();
      const body = document.getElementById('emailBody').value.trim();

      if (!email || !email.includes('@')) {
        showError('emailGroup', 'Please enter a valid email address.');
        return null;
      }
      let mailto = `mailto:${email}`;
      const params = [];
      if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
      if (body) params.push(`body=${encodeURIComponent(body)}`);
      if (params.length > 0) {
        mailto += '?' + params.join('&');
      }
      data = mailto;
    } else if (currentType === 'phone') {
      const phone = document.getElementById('phoneInput').value.trim();
      if (!phone) {
        showError('phoneGroup', 'Please enter a valid phone number.');
        return null;
      }
      data = `tel:${phone}`;
    }

    return data;
  }

  function escapeWifiStr(str) {
    return str.replace(/([\\;:,"])/g, '\\$1');
  }

  function showError(groupId, message) {
    const grp = document.getElementById(groupId);
    if (grp) {
      grp.classList.add('has-error');
      const errEl = grp.querySelector('.form-error');
      if (errEl && message) errEl.textContent = message;
    }
  }

  function clearErrors() {
    document.querySelectorAll('.form-group').forEach(grp => {
      grp.classList.remove('has-error');
    });
  }

  // --- Main Generate Function ---
  function generateQR(addToHistory = false) {
    const dataText = getQRData();
    if (!dataText) return;

    activeQrText = dataText;

    const options = {
      size: parseInt(sizeSelect.value, 10) || 256,
      bgColor: bgColorPicker.value,
      fgColor: fgColorPicker.value,
      margin: parseInt(marginSlider.value, 10) || 2,
      errorCorrectionLevel: ecSelect.value || 'M'
    };

    try {
      QRCodeLib.renderCanvas(qrCanvas, activeQrText, options);

      if (addToHistory) {
        saveToHistory(currentType, activeQrText);
        showToast('QR code generated successfully!', 'check');
      }
    } catch (err) {
      console.error('QR Generation failed:', err);
      showToast('Error generating QR Code. Text may be too long.', 'alert-triangle');
    }
  }

  // Action Buttons Listeners
  generateBtn.addEventListener('click', () => {
    generateQR(true);
  });

  clearBtn.addEventListener('click', () => {
    document.getElementById('urlInput').value = '';
    document.getElementById('textInput').value = '';
    document.getElementById('wifiSsid').value = '';
    document.getElementById('wifiPassword').value = '';
    document.getElementById('wifiSecurity').value = 'WPA';
    document.getElementById('wifiHidden').checked = false;
    document.getElementById('emailAddress').value = '';
    document.getElementById('emailSubject').value = '';
    document.getElementById('emailBody').value = '';
    document.getElementById('phoneInput').value = '';
    clearErrors();
    generateQR(false);
    showToast('Form cleared', 'rotate-ccw');
  });

  // Download PNG
  downloadPngBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `qr-code-${currentType}-${Date.now()}.png`;
    link.href = qrCanvas.toDataURL('image/png');
    link.click();
    showToast('Downloaded PNG file', 'download');
  });

  // Download SVG
  downloadSvgBtn.addEventListener('click', () => {
    const options = {
      size: parseInt(sizeSelect.value, 10) || 256,
      bgColor: bgColorPicker.value,
      fgColor: fgColorPicker.value,
      margin: parseInt(marginSlider.value, 10) || 2,
      errorCorrectionLevel: ecSelect.value || 'M'
    };
    const svgStr = QRCodeLib.renderSVGString(activeQrText, options);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `qr-code-${currentType}-${Date.now()}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded SVG Vector file', 'code');
  });

  // Copy Image / Content
  copyBtn.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        qrCanvas.toBlob(async (blob) => {
          if (blob) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            showToast('QR code image copied to clipboard!', 'copy');
          }
        });
      } else {
        await navigator.clipboard.writeText(activeQrText);
        showToast('QR text content copied to clipboard!', 'copy');
      }
    } catch (err) {
      // Fallback text copy
      try {
        await navigator.clipboard.writeText(activeQrText);
        showToast('QR text content copied to clipboard!', 'copy');
      } catch (e) {
        showToast('Could not copy automatically.', 'alert-circle');
      }
    }
  });

  // --- History Management ---
  function saveToHistory(type, content) {
    const newItem = {
      id: Date.now().toString(),
      type: type,
      content: content,
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })
    };

    // Avoid duplicate head item
    if (historyItems.length > 0 && historyItems[0].content === content) {
      return;
    }

    historyItems.unshift(newItem);
    if (historyItems.length > 20) historyItems.pop(); // Keep top 20
    localStorage.setItem('qrforge_history', JSON.stringify(historyItems));
    renderHistory();
  }

  function renderHistory() {
    if (!historyGrid) return;
    historyGrid.innerHTML = '';

    if (historyItems.length === 0) {
      historyGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <i data-feather="inbox"></i>
          </div>
          <h3 class="empty-title">No QR codes yet</h3>
          <p class="empty-desc">Generate your first QR code to see it here.</p>
        </div>
      `;
      if (typeof feather !== 'undefined') feather.replace();
      return;
    }

    historyItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-card';

      // Temporary canvas for thumbnail rendering
      const tempCanvas = document.createElement('canvas');
      QRCodeLib.renderCanvas(tempCanvas, item.content, { size: 100, margin: 1, fgColor: '#000000', bgColor: '#ffffff' });
      const thumbUrl = tempCanvas.toDataURL();

      const typeLabels = {
        url: 'Website',
        text: 'Text',
        wifi: 'Wi-Fi',
        email: 'Email',
        phone: 'Phone'
      };

      card.innerHTML = `
        <div class="history-thumb">
          <img src="${thumbUrl}" alt="QR Thumbnail">
        </div>
        <div class="history-info">
          <div class="history-type">${typeLabels[item.type] || item.type}</div>
          <div class="history-content" title="${escapeHtml(item.content)}">${escapeHtml(item.content)}</div>
          <div class="history-date">${item.date}</div>
        </div>
        <div class="history-actions">
          <button class="history-btn download" title="Download PNG" data-id="${item.id}">
            <i data-feather="download"></i>
          </button>
          <button class="history-btn delete" title="Delete" data-id="${item.id}">
            <i data-feather="trash-2"></i>
          </button>
        </div>
      `;

      // History item download listener
      card.querySelector('.history-btn.download').addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = `qr-${item.type}-${item.id}.png`;
        link.href = thumbUrl;
        link.click();
        showToast('Downloaded history QR code', 'download');
      });

      // History item delete listener
      card.querySelector('.history-btn.delete').addEventListener('click', () => {
        historyItems = historyItems.filter(h => h.id !== item.id);
        localStorage.setItem('qrforge_history', JSON.stringify(historyItems));
        renderHistory();
        showToast('Item deleted from history', 'trash-2');
      });

      historyGrid.appendChild(card);
    });

    if (typeof feather !== 'undefined') feather.replace();
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      if (historyItems.length === 0) return;
      if (confirm('Are you sure you want to clear all history?')) {
        historyItems = [];
        localStorage.setItem('qrforge_history', JSON.stringify(historyItems));
        renderHistory();
        showToast('History cleared', 'trash-2');
      }
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  // --- Toast Notification ---
  function showToast(message, iconName = 'check-circle') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <i data-feather="${iconName}"></i>
      <span>${message}</span>
    `;

    toastContainer.appendChild(toast);
    if (typeof feather !== 'undefined') feather.replace();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 200);
    }, 2800);
  }

  // --- Background Dot Particle Wave Canvas ---
  function initBackgroundWaveCanvas() {
    const canvas = document.getElementById('bgWaveCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let animationFrameId = null;

    // Grid spacing
    const spacing = 26;
    let cols = 0;
    let rows = 0;

    // Mouse tracking for interactive wave perturbation
    let mouseX = -1000;
    let mouseY = -1000;
    let targetMouseX = -1000;
    let targetMouseY = -1000;

    window.addEventListener('mousemove', (e) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
      targetMouseX = -1000;
      targetMouseY = -1000;
    });

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      cols = Math.ceil(width / spacing) + 3;
      rows = Math.ceil(height / spacing) + 3;
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });

    const startTime = performance.now();

    function render(currentTime) {
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const elapsed = (currentTime - startTime) * 0.001;

      // Smooth mouse interpolation
      mouseX += (targetMouseX - mouseX) * 0.08;
      mouseY += (targetMouseY - mouseY) * 0.08;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

      // Dot color palette
      // Dark mode: soft glowing luminous white dots
      // Light mode: distinct clean black dots
      const r = isDark ? 240 : 0;
      const g = isDark ? 245 : 0;
      const b = isDark ? 255 : 0;

      for (let ix = 0; ix < cols; ix++) {
        const baseX = (ix - 1) * spacing;

        for (let iy = 0; iy < rows; iy++) {
          const baseY = (iy - 1) * spacing;

          // Multi-harmonic sinusoidal wave equation
          const wave1 = Math.sin(ix * 0.22 + elapsed * 1.5);
          const wave2 = Math.cos(iy * 0.2 + elapsed * 1.1);
          const wave3 = Math.sin((ix * 0.15 + iy * 0.15) + elapsed * 1.8);
          
          const combinedWave = (wave1 * 0.5 + wave2 * 0.3 + wave3 * 0.2);

          // Wave displacement
          const offsetY = combinedWave * 9;
          const offsetX = Math.cos(ix * 0.18 + elapsed * 0.9) * 3;

          // Mouse ripple interaction
          let mouseDistOffset = 0;
          let mouseAlphaBoost = 0;
          if (mouseX > -500) {
            const dx = (baseX + offsetX) - mouseX;
            const dy = (baseY + offsetY) - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 160;
            if (dist < maxDist) {
              const factor = (1 - dist / maxDist);
              mouseDistOffset = -Math.sin(factor * Math.PI) * 10;
              mouseAlphaBoost = factor * (isDark ? 0.35 : 0.3);
            }
          }

          const posX = baseX + offsetX;
          const posY = baseY + offsetY + mouseDistOffset;

          // Dynamic radius & opacity based on wave crests
          const baseRadius = isDark ? 1.2 : 1.25;
          const radius = Math.max(0.7, baseRadius + combinedWave * 0.45 + (mouseAlphaBoost > 0 ? 0.4 : 0));

          let alpha;
          if (isDark) {
            alpha = 0.06 + (combinedWave + 1) * 0.08 + mouseAlphaBoost;
          } else {
            alpha = 0.08 + (combinedWave + 1) * 0.09 + mouseAlphaBoost;
          }

          ctx.beginPath();
          ctx.arc(posX, posY, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    }

    animationFrameId = requestAnimationFrame(render);
  }

  // Initial QR Code rendering & Background Wave Init
  generateQR(false);
  renderHistory();
  initBackgroundWaveCanvas();
});
