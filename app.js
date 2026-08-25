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

  // --- Dark Theme Default ---
  document.documentElement.setAttribute('data-theme', 'dark');

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
    });
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

  // Live input synchronization for URL & Text
  const urlInput = document.getElementById('urlInput');
  const textInput = document.getElementById('textInput');

  if (urlInput) {
    urlInput.addEventListener('input', () => {
      clearErrors();
      generateQR(false);
    });
  }

  if (textInput) {
    textInput.addEventListener('input', () => {
      clearErrors();
      generateQR(false);
    });
  }

  // --- Dynamic Data Extraction ---
  function getQRData() {
    clearErrors();
    let data = '';

    if (currentType === 'url') {
      const input = document.getElementById('urlInput');
      let val = input ? input.value.trim() : '';
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
      const val = input ? input.value.trim() : '';
      if (!val) {
        showError('textGroup', 'Please enter text to encode.');
        return null;
      }
      data = val;
    }

    return data;
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
    const urlInput = document.getElementById('urlInput');
    if (urlInput) urlInput.value = '';
    const textInput = document.getElementById('textInput');
    if (textInput) textInput.value = '';
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

      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';      // Dot color palette
      // Dark mode: soft luminous white dots
      // Light mode: sleek deep dark slate micro-dots
      const r = isDark ? 255 : 15;
      const g = isDark ? 255 : 23;
      const b = isDark ? 255 : 42;

      for (let ix = 0; ix < cols; ix++) {
        const baseX = (ix - 1) * spacing;

        for (let iy = 0; iy < rows; iy++) {
          const baseY = (iy - 1) * spacing;

          // Multi-harmonic sinusoidal wave equation
          const wave1 = Math.sin(ix * 0.22 + elapsed * 1.5);
          const wave2 = Math.cos(iy * 0.2 + elapsed * 1.1);
          const wave3 = Math.sin((ix * 0.15 + iy * 0.15) + elapsed * 1.8);
          
          const combinedWave = (wave1 * 0.5 + wave2 * 0.3 + wave3 * 0.2);

          // Wave displacement (gentle, fluid motion)
          const offsetY = combinedWave * 8;
          const offsetX = Math.cos(ix * 0.18 + elapsed * 0.9) * 2.5;

          // Mouse ripple interaction
          let mouseDistOffset = 0;
          let mouseAlphaBoost = 0;
          if (mouseX > -500) {
            const dx = (baseX + offsetX) - mouseX;
            const dy = (baseY + offsetY) - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 150;
            if (dist < maxDist) {
              const factor = (1 - dist / maxDist);
              mouseDistOffset = -Math.sin(factor * Math.PI) * 9;
              mouseAlphaBoost = factor * (isDark ? 0.35 : 0.25);
            }
          }

          const posX = baseX + offsetX;
          const posY = baseY + offsetY + mouseDistOffset;

          // Dynamic radius based on wave crests
          const baseRadius = isDark ? 1.35 : 1.15;
          const radius = Math.max(0.7, baseRadius + combinedWave * 0.45 + (mouseAlphaBoost > 0 ? 0.4 : 0));

          // Brighter, refined opacity for clear dot wave presence
          let alpha;
          if (isDark) {
            alpha = 0.12 + (combinedWave + 1) * 0.13 + mouseAlphaBoost;
          } else {
            alpha = 0.08 + (combinedWave + 1) * 0.085 + mouseAlphaBoost;
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
  }  // --- Zero-Gravity Draggable Floating Cards Engine (Collision-Aware & Smooth) ---
  function initZeroGravityCards() {
    const cardsState = new Map();
    let topZIndex = 10;
    let activeCard = null;
    let startPointerX = 0;
    let startPointerY = 0;
    let cardStartOffsetX = 0;
    let cardStartOffsetY = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let lastPointerTime = 0;
    let velX = 0;
    let velY = 0;

    // Card Motion Toggle State (stored in localStorage)
    let isMotionEnabled = localStorage.getItem('qrforge_card_motion') !== 'disabled';
    const cardMotionToggle = document.getElementById('cardMotionToggle');

    function syncMotionToggleUI() {
      if (cardMotionToggle) {
        cardMotionToggle.classList.toggle('active', isMotionEnabled);
        cardMotionToggle.setAttribute(
          'title',
          isMotionEnabled
            ? 'Cards Motion: ON (Click to lock cards in place)'
            : 'Cards Motion: OFF (Click to enable moving cards)'
        );
      }
      document.body.classList.toggle('cards-locked', !isMotionEnabled);
    }

    syncMotionToggleUI();

    if (cardMotionToggle) {
      cardMotionToggle.addEventListener('click', () => {
        isMotionEnabled = !isMotionEnabled;
        localStorage.setItem('qrforge_card_motion', isMotionEnabled ? 'enabled' : 'disabled');
        syncMotionToggleUI();

        if (!isMotionEnabled) {
          resetAllCardsToHome(false);
          showToast('Cards locked in fixed layout', 'lock');
        } else {
          showToast('Cards motion enabled (drag & float)', 'move');
        }
      });
    }

    function registerCard(cardEl) {
      if (!cardEl || cardsState.has(cardEl)) return;

      const rect = cardEl.getBoundingClientRect();
      const state = {
        el: cardEl,
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        renderX: 0,
        renderY: 0,
        vx: 0,
        vy: 0,
        rotation: 0,
        targetRot: 0,
        renderRot: 0,
        vRot: 0,
        seed: Math.random() * 100 + 1,
        isDragging: false,
        zIndex: topZIndex,
        baseLeft: rect.left + window.scrollX,
        baseTop: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height
      };

      cardsState.set(cardEl, state);

      cardEl.addEventListener('pointerdown', (e) => {
        if (!isMotionEnabled) return;
        if (e.button !== 0 && e.pointerType === 'mouse') return;

        // Prevent dragging when clicking interactive elements
        const isInteractive = e.target.closest(
          'input, textarea, select, button, a, label, .range-slider, .color-picker-input, .type-tab, .preset-chip, canvas, .history-btn, .checkbox-group'
        );
        if (isInteractive) return;

        // Refresh layout positions before drag
        updateCardMetrics();

        activeCard = state;
        state.isDragging = true;
        state.vx = 0;
        state.vy = 0;
        state.vRot = 0;

        topZIndex += 1;
        state.zIndex = topZIndex;
        cardEl.style.zIndex = topZIndex;
        cardEl.classList.add('is-floating-drag');

        startPointerX = e.clientX;
        startPointerY = e.clientY;
        cardStartOffsetX = state.x;
        cardStartOffsetY = state.y;
        state.targetX = state.x;
        state.targetY = state.y;
        state.targetRot = 0;

        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        lastPointerTime = performance.now();
        velX = 0;
        velY = 0;

        cardEl.setPointerCapture(e.pointerId);
      });

      cardEl.addEventListener('pointermove', (e) => {
        if (!isMotionEnabled || !state.isDragging || activeCard !== state) return;

        const now = performance.now();
        const dt = Math.max(1, now - lastPointerTime);

        // Smooth target assignment (prevents frame fighting and jitter)
        state.targetX = cardStartOffsetX + (e.clientX - startPointerX);
        state.targetY = cardStartOffsetY + (e.clientY - startPointerY);

        const moveDx = e.clientX - lastPointerX;
        const moveDy = e.clientY - lastPointerY;
        velX = (moveDx / dt) * 16.6;
        velY = (moveDy / dt) * 16.6;

        // Gentle tilt based on drag speed
        state.targetRot = Math.max(-8, Math.min(8, velX * 0.35));

        lastPointerX = e.clientX;
        lastPointerY = e.clientY;
        lastPointerTime = now;
      });

      const endDrag = (e) => {
        if (!state.isDragging || activeCard !== state) return;
        state.isDragging = false;
        activeCard = null;
        cardEl.classList.remove('is-floating-drag');

        // Apply release momentum with safe velocity caps
        state.vx = Math.max(-20, Math.min(20, velX));
        state.vy = Math.max(-20, Math.min(20, velY));
        state.vRot = Math.max(-1.2, Math.min(1.2, velX * 0.07));

        try {
          cardEl.releasePointerCapture(e.pointerId);
        } catch (err) {}
      };

      cardEl.addEventListener('pointerup', endDrag);
      cardEl.addEventListener('pointercancel', endDrag);

      // Smooth double-click to float card back to natural position
      cardEl.addEventListener('dblclick', (e) => {
        if (!isMotionEnabled) return;
        const isInteractive = e.target.closest('input, textarea, select, button, a, label');
        if (isInteractive) return;
        state.vx = 0;
        state.vy = 0;
        state.vRot = 0;
        state.targetX = 0;
        state.targetY = 0;
        state.targetRot = 0;
        state.isReturning = true;
      });
    }

    function updateCardMetrics() {
      cardsState.forEach((state) => {
        if (!state.el.isConnected) return;
        const prevTransform = state.el.style.transform;
        state.el.style.transform = 'none';
        const rect = state.el.getBoundingClientRect();
        state.baseLeft = rect.left + window.scrollX;
        state.baseTop = rect.top + window.scrollY;
        state.width = rect.width;
        state.height = rect.height;
        state.el.style.transform = prevTransform;
      });
    }

    // Initial Registration
    document.querySelectorAll('.card, .feature-card, .history-card, .empty-state').forEach(registerCard);
    setTimeout(updateCardMetrics, 100);
    window.addEventListener('resize', updateCardMetrics, { passive: true });

    // Dynamic Observer for dynamically added cards
    const observer = new MutationObserver(() => {
      document.querySelectorAll('.card, .feature-card, .history-card, .empty-state').forEach(registerCard);
      updateCardMetrics();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Non-overlapping collision detection & repulsion
    function resolveCollisions() {
      const cards = Array.from(cardsState.values()).filter(s => s.el.isConnected);
      const gap = 16; // Minimum padding between cards

      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          const a = cards[i];
          const b = cards[j];

          const ax = a.baseLeft + a.x + a.width / 2;
          const ay = a.baseTop + a.y + a.height / 2;
          const bx = b.baseLeft + b.x + b.width / 2;
          const by = b.baseTop + b.y + b.height / 2;

          const halfW = (a.width + b.width) / 2 + gap;
          const halfH = (a.height + b.height) / 2 + gap;

          const diffX = bx - ax;
          const diffY = by - ay;

          const overlapX = halfW - Math.abs(diffX);
          const overlapY = halfH - Math.abs(diffY);

          if (overlapX > 0 && overlapY > 0) {
            // Push along shallowest penetration axis
            if (overlapX < overlapY) {
              const sign = diffX >= 0 ? 1 : -1;
              if (a.isDragging && !b.isDragging) {
                b.x += sign * overlapX * 0.75;
                b.targetX = b.x;
                b.vx += sign * overlapX * 0.25;
              } else if (b.isDragging && !a.isDragging) {
                a.x -= sign * overlapX * 0.75;
                a.targetX = a.x;
                a.vx -= sign * overlapX * 0.25;
              } else {
                const push = overlapX * 0.5;
                a.x -= sign * push;
                b.x += sign * push;
                a.targetX = a.x;
                b.targetX = b.x;
                a.vx -= sign * push * 0.12;
                b.vx += sign * push * 0.12;
              }
            } else {
              const sign = diffY >= 0 ? 1 : -1;
              if (a.isDragging && !b.isDragging) {
                b.y += sign * overlapY * 0.75;
                b.targetY = b.y;
                b.vy += sign * overlapY * 0.25;
              } else if (b.isDragging && !a.isDragging) {
                a.y -= sign * overlapY * 0.75;
                a.targetY = a.y;
                a.vy -= sign * overlapY * 0.25;
              } else {
                const push = overlapY * 0.5;
                a.y -= sign * push;
                b.y += sign * push;
                a.targetX = a.x;
                b.targetX = b.y;
                a.vx -= sign * push * 0.12;
                b.vx += sign * push * 0.12;
              }
            }
          }
        }
      }
    }

    // 60 FPS Physics & Motion Loop
    function physicsTick(currentTime) {
      const time = currentTime * 0.001;

      if (!isMotionEnabled) {
        // When motion is locked, glide cards smoothly back to 0,0 and freeze drift
        cardsState.forEach((state) => {
          if (!state.el.isConnected) {
            cardsState.delete(state.el);
            return;
          }

          if (state.isReturning || Math.abs(state.renderX) > 0.01 || Math.abs(state.renderY) > 0.01 || Math.abs(state.renderRot) > 0.01) {
            state.x += (0 - state.x) * 0.08;
            state.y += (0 - state.y) * 0.08;
            state.rotation += (0 - state.rotation) * 0.08;
            state.renderX = state.x;
            state.renderY = state.y;
            state.renderRot = state.rotation;

            if (Math.abs(state.x) < 0.05 && Math.abs(state.y) < 0.05 && Math.abs(state.rotation) < 0.02) {
              state.x = 0;
              state.y = 0;
              state.rotation = 0;
              state.renderX = 0;
              state.renderY = 0;
              state.renderRot = 0;
              state.isReturning = false;
            }
          } else {
            state.x = 0;
            state.y = 0;
            state.rotation = 0;
            state.renderX = 0;
            state.renderY = 0;
            state.renderRot = 0;
          }
        });
      } else {
        cardsState.forEach((state) => {
          if (!state.el.isConnected) {
            cardsState.delete(state.el);
            return;
          }

          if (state.isDragging) {
            // Butter-smooth linear interpolation towards cursor (ZERO SHAKE)
            state.isReturning = false;
            state.x += (state.targetX - state.x) * 0.45;
            state.y += (state.targetY - state.y) * 0.45;
            state.rotation += (state.targetRot - state.rotation) * 0.25;
            state.renderX = state.x;
            state.renderY = state.y;
            state.renderRot = state.rotation;
          } else if (state.isReturning) {
            // Slow, graceful zero-gravity glide back to normal home position
            state.x += (0 - state.x) * 0.042;
            state.y += (0 - state.y) * 0.042;
            state.rotation += (0 - state.rotation) * 0.042;
            state.renderX = state.x;
            state.renderY = state.y;
            state.renderRot = state.rotation;

            if (Math.abs(state.x) < 0.1 && Math.abs(state.y) < 0.1 && Math.abs(state.rotation) < 0.05) {
              state.x = 0;
              state.y = 0;
              state.rotation = 0;
              state.renderX = 0;
              state.renderY = 0;
              state.renderRot = 0;
              state.isReturning = false;
            }
          } else {
            // Zero-gravity momentum drift
            state.x += state.vx;
            state.y += state.vy;
            state.rotation += state.vRot;

            // Space air damping (gentle decay)
            state.vx *= 0.94;
            state.vy *= 0.94;
            state.vRot *= 0.92;

            if (Math.abs(state.vx) < 0.005) state.vx = 0;
            if (Math.abs(state.vy) < 0.005) state.vy = 0;
            if (Math.abs(state.vRot) < 0.005) state.vRot = 0;

            // Soft boundary bounce to keep cards within view
            const rect = state.el.getBoundingClientRect();
            const pad = 20;
            if (rect.left < pad && state.vx < 0) {
              state.vx = -state.vx * 0.5;
            }
            if (rect.right > window.innerWidth - pad && state.vx > 0) {
              state.vx = -state.vx * 0.5;
            }
            if (rect.top < pad && state.vy < 0) {
              state.vy = -state.vy * 0.5;
            }
            if (rect.bottom > window.innerHeight - pad && state.vy > 0) {
              state.vy = -state.vy * 0.5;
            }

            // Gentle ambient float when resting
            if (Math.abs(state.vx) < 0.1 && Math.abs(state.vy) < 0.1) {
              const ambientY = Math.sin(time * 1.5 + state.seed) * 2.5;
              const ambientX = Math.cos(time * 1.1 + state.seed) * 1.8;
              const ambientRot = Math.sin(time * 0.8 + state.seed) * 0.4;
              state.renderX = state.x + ambientX;
              state.renderY = state.y + ambientY;
              state.renderRot = state.rotation + ambientRot;
            } else {
              state.renderX = state.x;
              state.renderY = state.y;
              state.renderRot = state.rotation;
            }
          }
        });

        // Resolve non-overlap collisions between all cards
        resolveCollisions();
      }

      // Apply sub-pixel smooth transforms
      cardsState.forEach((state) => {
        state.el.style.transform = `translate3d(${state.renderX.toFixed(2)}px, ${state.renderY.toFixed(2)}px, 0) rotate(${state.renderRot.toFixed(2)}deg)`;
      });

      requestAnimationFrame(physicsTick);
    }

    // Function to smoothly reset all cards to original layout
    function resetAllCardsToHome(showToastMsg = true) {
      cardsState.forEach((state) => {
        state.isDragging = false;
        state.vx = 0;
        state.vy = 0;
        state.vRot = 0;
        state.targetX = 0;
        state.targetY = 0;
        state.targetRot = 0;
        state.isReturning = true;
      });

      if (showToastMsg) {
        showToast('All cards smoothly restored to normal layout', 'grid');
      }
    }

    // Top Header Reset Button Listener
    const resetCardsBtn = document.getElementById('resetCardsBtn');
    if (resetCardsBtn) {
      resetCardsBtn.addEventListener('click', () => resetAllCardsToHome(true));
    }

    requestAnimationFrame(physicsTick);
  }

  // --- Slow & Smooth Scroll Reveal System ---
  function initScrollReveal() {
    const revealSelectors = [
      '.hero-section',
      '.workspace-grid',
      '.generator-card',
      '.preview-card',
      '.customization-card',
      '.section-divider',
      '.history-section',
      '.section-header',
      '.history-card',
      '.empty-state',
      '.about-section',
      '.about-intro',
      '.feature-card',
      '.site-footer'
    ];

    const elements = document.querySelectorAll(revealSelectors.join(', '));

    elements.forEach((el) => {
      el.classList.add('reveal-on-scroll');

      // Add stagger classes for feature cards
      if (el.classList.contains('feature-card')) {
        const parent = el.parentElement;
        if (parent) {
          const idx = Array.from(parent.children).indexOf(el);
          el.classList.add(`stagger-${(idx % 3) + 1}`);
        }
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.12
      }
    );

    elements.forEach((el) => observer.observe(el));

    // Dynamic Observer for dynamically added elements (like history items)
    const domObserver = new MutationObserver(() => {
      document.querySelectorAll('.history-card, .empty-state').forEach((el) => {
        if (!el.classList.contains('reveal-on-scroll')) {
          el.classList.add('reveal-on-scroll');
          observer.observe(el);
        }
      });
    });
    domObserver.observe(document.body, { childList: true, subtree: true });

    // Smooth Anchor Scrolling with Header Offset
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (!targetId || targetId === '#') return;
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          const headerHeight = 76;
          const targetPos = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
          window.scrollTo({
            top: targetPos,
            behavior: 'smooth'
          });
        }
      });
    });
  }

  // --- Interactive Hero Title Wave on Cursor Motion ---
  function initHeroWaveText() {
    const titleEl = document.querySelector('.hero-title');
    if (!titleEl) return;

    const originalText = titleEl.textContent.trim();
    const words = originalText.split(/\s+/);

    titleEl.innerHTML = '';
    const charElements = [];

    words.forEach((word, wIdx) => {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'wave-word';

      for (let i = 0; i < word.length; i++) {
        const charSpan = document.createElement('span');
        charSpan.className = 'wave-char';
        charSpan.textContent = word[i];
        wordSpan.appendChild(charSpan);
        charElements.push(charSpan);
      }

      titleEl.appendChild(wordSpan);

      if (wIdx < words.length - 1) {
        const space = document.createElement('span');
        space.className = 'wave-space';
        space.innerHTML = '&nbsp;';
        titleEl.appendChild(space);
      }
    });

    let mouseX = -1000;
    let mouseY = -1000;
    let isHovering = false;

    titleEl.addEventListener('mouseenter', () => {
      isHovering = true;
    });

    titleEl.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      isHovering = true;
    }, { passive: true });

    titleEl.addEventListener('mouseleave', () => {
      isHovering = false;
      mouseX = -1000;
      mouseY = -1000;
    });

    // Touch support for mobile devices
    titleEl.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
        isHovering = true;
      }
    }, { passive: true });

    titleEl.addEventListener('touchend', () => {
      isHovering = false;
      mouseX = -1000;
      mouseY = -1000;
    });

    const charsData = charElements.map((el, index) => ({
      el,
      index,
      targetY: 0,
      currentY: 0,
      targetRot: 0,
      currentRot: 0,
      targetScale: 1,
      currentScale: 1,
      glow: 0
    }));

    function updateWave() {
      const waveRadius = 110; // Influence radius around cursor

      charsData.forEach((char) => {
        const rect = char.el.getBoundingClientRect();
        const charCenterX = rect.left + rect.width / 2;
        const charCenterY = rect.top + rect.height / 2;

        if (isHovering && mouseX > -500) {
          const dx = charCenterX - mouseX;
          const dy = charCenterY - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < waveRadius) {
            const factor = 1 - dist / waveRadius;
            const waveIntensity = Math.sin(factor * Math.PI * 0.5);
            char.targetY = -waveIntensity * 20; // Upward crest lift
            char.targetRot = -(dx / waveRadius) * 16; // Wave tilt
            char.targetScale = 1 + waveIntensity * 0.22;
            char.glow = waveIntensity;
          } else {
            char.targetY = 0;
            char.targetRot = 0;
            char.targetScale = 1;
            char.glow = 0;
          }
        } else {
          char.targetY = 0;
          char.targetRot = 0;
          char.targetScale = 1;
          char.glow = 0;
        }

        // Smooth spring interpolation
        char.currentY += (char.targetY - char.currentY) * 0.20;
        char.currentRot += (char.targetRot - char.currentRot) * 0.20;
        char.currentScale += (char.targetScale - char.currentScale) * 0.20;

        if (
          Math.abs(char.currentY) > 0.05 ||
          Math.abs(char.currentRot) > 0.05 ||
          Math.abs(char.currentScale - 1) > 0.005
        ) {
          char.el.style.transform = `translate3d(0, ${char.currentY.toFixed(2)}px, 0) rotate(${char.currentRot.toFixed(2)}deg) scale(${char.currentScale.toFixed(3)})`;
          if (char.glow > 0.12) {
            char.el.classList.add('is-waving');
          } else {
            char.el.classList.remove('is-waving');
          }
        } else {
          char.el.style.transform = 'translate3d(0, 0, 0) rotate(0deg) scale(1)';
          char.el.classList.remove('is-waving');
        }
      });

      requestAnimationFrame(updateWave);
    }

    requestAnimationFrame(updateWave);
  }

  // Initial QR Code rendering, Background Wave, Zero-Gravity, Hero Wave & Scroll Reveal Init
  generateQR(false);
  renderHistory();
  initBackgroundWaveCanvas();
  initZeroGravityCards();
  initHeroWaveText();
  initScrollReveal();
});
